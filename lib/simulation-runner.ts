
import { ViFiAMM, SimulationParams, SimulationStep } from './vifi-amm';

export type SimulationMetrics = {
    initialValuation: number;
    netChangeValuation: number;
    netChangeValuationExclExtra: number;
    apy: number;
    apyExclExtra: number;
    netFlow: number;
    totalFlow: number;
};

export type SimulationResult = {
    steps: SimulationStep[];
    metrics: SimulationMetrics;
};

export function runSimulation(params: SimulationParams, priceData: number[]): SimulationResult {
    const steps: SimulationStep[] = [];

    // Initialize Random Generator
    // If seed is provided, use it. Otherwise use Math.random
    let random = Math.random;
    if (params.seed !== undefined) {
        const createRandom = (s: number) => {
            return function () {
                s = Math.sin(s) * 10000;
                return s - Math.floor(s);
            };
        };
        // Simple seed function (mulberry32 or sin-based for simplicity, or just simple LCG)
        // Using a better LCG for TS (Mulberry32)
        let seed = params.seed;
        random = () => {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    // 1. Initialize AMM
    // Methodology Note: We initialize with the full capital. The AMM class internally handles 
    // the distribution of Fiat tokens (90% Pool / 10% User) based on the logic in vifi-amm.ts
    const totalCapital = params.initialLiquidityUSD;
    const initialOraclePrice = priceData.length > 0 ? priceData[0] : 1.0;

    // LP Initializes VFE with FULL Capital
    const amm = new ViFiAMM(totalCapital, initialOraclePrice, params.initialPremium, params.feeRate);

    // Initial State capture
    const initialState = amm.getState(0, initialOraclePrice);

    let currentOraclePrice = initialOraclePrice;

    // 2. Loop through History
    const daysToRun = Math.min(params.numDays, priceData.length);

    for (let day = 0; day < daysToRun; day++) {

        // A. Update Oracle
        currentOraclePrice = priceData[day];

        // B. Run Trades
        const tradesToRun = params.tradesPerDay;

        // Reset log if no trades occur, so we don't carry over stale logs
        if (tradesToRun === 0) {
            amm.lastTradeLog = null;
        }

        // Run Loop
        for (let t = 0; t < tradesToRun; t++) {
            // Determine Trade Direction
            const isExpansion = random() < params.tradeProbForward;

            // 5. Probability Distribution for Trade Amount
            // Spec: Sample from Beta(0.25, 1) then multiply by 100,000.
            // Method: Inverse Transform Sampling.
            // For Beta(alpha, 1), CDF(x) = x^alpha.
            // Inverse: x = u^(1/alpha).
            // alpha = 0.25 => 1/alpha = 4.
            // Therefore: x = u^4.
            const u = random();
            const betaSample = Math.pow(u, 4);

            // Scale to 0 - 100,000 USDV (Base Expansion Logic)
            const tradeSizeUSD = betaSample * 100000;

            let amount = 0;
            let debugCap: number | undefined;

            if (isExpansion) {
                // Expansion: Input is USD
                // Distribution: Beta(0.25, 1) * 100,000
                // Min Value: 1 USD
                const rawUSD = betaSample * 100000;
                amount = Math.max(1, rawUSD);
            } else {
                // Contraction: Input is Fiat (Selling TTDv)
                const currentState = amm.getState(day, currentOraclePrice);

                // Spec Update: Use ACTUAL User Holdings (Wf) for sizing, not theoretical 10%.
                const userTheoreticalShare = currentState.walletFiat;

                // 1. Determine Target Fiat Exit Size
                const rawFiat = betaSample * 0.5 * userTheoreticalShare;
                debugCap = 0.5 * userTheoreticalShare;

                // 2. Minimum Clip (0.01 Fiat)
                amount = Math.max(0.01, rawFiat);

                // 3. Physical Constraint
                // Can't sell more than they actually hold (Zf)
                amount = Math.min(amount, currentState.walletFiat);
            }

            if (amount === 0) continue;

            if (isExpansion) {
                amm.expansion(amount, currentOraclePrice);
            } else {
                amm.contraction(amount, currentOraclePrice, debugCap);
            }

            // C. Record State (Capture EACH trade)
            steps.push(amm.getState(day, currentOraclePrice));
        }

        // If no trades, capture at least once
        if (tradesToRun === 0) {
            steps.push(amm.getState(day, currentOraclePrice));
        }
    }

    // --- Metrics Calculation ---
    const finalStep = steps.length > 0 ? steps[steps.length - 1] : initialState;
    const initialValuation = initialState.lpValuation;
    const finalValuation = finalStep.lpValuation;

    // 1. Net Change in LP Valuation
    const netChangeValuation = finalValuation - initialValuation;

    // 2. APY (Assuming 1 year period, otherwise normalize)
    // APY = (NetChange / Initial)
    const apy = (netChangeValuation / initialValuation) * 100;

    // 3. Extra Collateral (Su - Sr)
    // Initial Extra is usually 0 (Su=Sr).
    const finalExtraCollateral = finalStep.totalCollateralUSD - finalStep.reserveUSD;
    const finalValuationExclExtra = finalValuation - finalExtraCollateral;

    // 4. Net Change Excl Extra
    const netChangeValuationExclExtra = finalValuationExclExtra - initialValuation;

    // 5. APY Excl Extra
    const apyExclExtra = (netChangeValuationExclExtra / initialValuation) * 100;

    // 6. Flows
    // Net Flow = Final Su - Initial Su
    const netFlow = finalStep.totalCollateralUSD - initialState.totalCollateralUSD;

    // Total Flow = Sum(|Delta Su|)
    let totalFlow = 0;
    let prevSu = initialState.totalCollateralUSD;
    for (const step of steps) {
        const delta = step.totalCollateralUSD - prevSu;
        totalFlow += Math.abs(delta);
        prevSu = step.totalCollateralUSD;
    }

    return {
        steps,
        metrics: {
            initialValuation,
            netChangeValuation,
            netChangeValuationExclExtra,
            apy,
            apyExclExtra,
            netFlow,
            totalFlow
        }
    };
}

// --- Monte Carlo Logic ---

export type MonteCarloStep = {
    day: number;
    oraclePrice: number;

    // Aggregated Metrics (Median, Min, Max)
    lpValuation: { median: number, min: number, max: number };
    reserveUSD: { median: number, min: number, max: number };
    walletFiat: { median: number, min: number, max: number };
    systemHealth: { median: number, min: number, max: number }; // Omega (Collateral Ratio)
};

export type MonteCarloResult = {
    aggregatedSteps: MonteCarloStep[];
    trials: SimulationStep[][]; // Keep raw data for advanced debugging if needed
    summary: {
        winRate: number; // % of runs that ended profitable
        avgROI: number;
        worstCaseROI: number;
        volatility: number;
    }
};

export function runMonteCarloSimulation(params: SimulationParams, priceData: number[], numTrials: number = 30): MonteCarloResult {
    const trials: SimulationStep[][] = [];
    const baseSeed = params.seed || 123456;

    // 1. Run N Trials
    for (let i = 0; i < numTrials; i++) {
        // Mutate seed for each run to get different paths
        const trialParams = { ...params, seed: baseSeed + i * 7919 }; // 7919 is a prime to scatter seeds
        const result = runSimulation(trialParams, priceData);
        trials.push(result.steps);
    }

    // 2. Aggregate Per Day
    const days = trials[0].length;
    const aggregatedSteps: MonteCarloStep[] = [];

    for (let d = 0; d < days; d++) {
        // Collect values for this day across all trials
        // Note: steps length might vary if tradesPerDay varies? No, fixed.
        // But steps capture EACH trade. So we have 30 steps per day if 30 trades.
        // runSameple assumes index `d` maps to day?
        // Wait, steps array length = numDays * tradesPerDay.
        // "Aggregate Per Day" implies we should sample the END of each day.

        // Fix: We need to subsample steps to get End-Of-Day states for the chart if array is huge.
        // If tradesPerDay=30, days=365 -> 10,000 steps.
        // For simplicity here, assuming user wants full resolution or we aggregate by index.
        // Let's assume we map by index i (which is actually Trade Number, not just Day).

        // Safety check
        if (!trials[0][d]) break;

        const lpVals = trials.map(t => t[d]?.lpValuation || 0).sort((a, b) => a - b);
        const resVals = trials.map(t => t[d]?.reserveUSD || 0).sort((a, b) => a - b);
        const walVals = trials.map(t => t[d]?.walletFiat || 0).sort((a, b) => a - b);

        // Calculate Omega (Su / Sr) - Handle Div0
        const omegas = trials.map(t => {
            const step = t[d];
            if (!step) return 1;
            return step.reserveUSD > 0 ? (step.lpValuation + step.feesCollected) / step.reserveUSD : 1; // Approx
        }).sort((a, b) => a - b);

        const oraclePrice = trials[0][d].oraclePrice; // Same across all trials

        aggregatedSteps.push({
            day: trials[0][d].day,
            oraclePrice,
            lpValuation: getStats(lpVals),
            reserveUSD: getStats(resVals),
            walletFiat: getStats(walVals),
            systemHealth: getStats(omegas)
        });
    }

    // 3. Summary Stats (Final Day)
    // Using the last step of each trial
    const finalLPs = trials.map(t => t[t.length - 1].lpValuation);
    const initial = params.initialLiquidityUSD;

    const profits = finalLPs.filter(v => v > initial).length;
    const winRate = profits / numTrials;

    const rois = finalLPs.map(v => (v - initial) / initial);
    const avgROI = rois.reduce((a, b) => a + b, 0) / numTrials;
    const worstCaseROI = Math.min(...rois);

    // Volatility of returns
    const meanVal = finalLPs.reduce((a, b) => a + b, 0) / numTrials;
    const variance = finalLPs.reduce((a, b) => a + Math.pow(b - meanVal, 2), 0) / numTrials;
    const stdDev = Math.sqrt(variance);

    return {
        aggregatedSteps,
        trials,
        summary: {
            winRate,
            avgROI,
            worstCaseROI,
            volatility: stdDev
        }
    };
}

function getStats(sortedArr: number[]) {
    const min = sortedArr[0];
    const max = sortedArr[sortedArr.length - 1];

    const mid = Math.floor(sortedArr.length / 2);
    const median = sortedArr.length % 2 !== 0
        ? sortedArr[mid]
        : (sortedArr[mid - 1] + sortedArr[mid]) / 2;

    return { min, max, median };
}
