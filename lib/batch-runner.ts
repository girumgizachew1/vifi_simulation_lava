import { runSimulation, SimulationResult } from './simulation-runner';
import { SimulationParams } from './vifi-amm';

export type TrialResult = {
    id: number;
    // Valuation
    apy: number;
    profit: number; // Net Change
    initialVal: number;
    finalVal: number; // Total LP Value

    // Breakdown
    finalBuffer: number;
    finalPoolVal: number;
    finalPoolValFiat: number;
    finalPoolValRes: number;
    finalHoldingsVal: number;
    totalFees: number;

    // Excl Buffer Metrics
    profitExclBuffer: number; // Profit - Buffer
    apyExclBuffer: number;

    // Flows & Activity
    daysRun: number;
    netFlow: number;
    totalFlow: number;
    txCount: number;
    expCount: number;
    contCount: number;
    startPrice: number;
    endPrice: number;
};

export type BatchScenarioResult = {
    id: string;
    params: {
        tradeProbForward: number; // Market Bias
        tradesPerDay: number;
        feeRate: number;
    };
    trials: number;

    stats: {
        avgAPY: number;
        medianAPY: number;
        minAPY: number;
        maxAPY: number;
        stdDevAPY: number;
        avgAPYExclBuffer: number;
        avgProfit: number;
        winRate: number;
        avgDaysRun: number;
        avgInitialVal: number;

        // Detailed Breakdown
        avgFinalBuffer: number;
        avgFinalPoolVal: number;
        avgFinalPoolValFiat: number;
        avgFinalPoolValRes: number;
        avgFinalHoldingsVal: number;
        avgTotalFees: number;
        avgNetFlow: number;
        avgTotalFlow: number;
        avgTxCount: number;
        avgExpCount: number;
        avgContCount: number;
    };

    trialsData: TrialResult[];
    rawAPYs: number[];
};

const BIAS_OPTS = [0.2, 0.4, 0.6, 0.8];
const VOL_OPTS = [30, 60];
const FEE_OPTS = [0.0005, 0.0010];
const TRIALS = 30;

export async function runBatchMonteCarlo(
    baseParams: SimulationParams,
    priceData: number[],
    onProgress: (percent: number, currentScenario: string) => void,
    biasOptions: number[] = BIAS_OPTS
): Promise<BatchScenarioResult[]> {
    const results: BatchScenarioResult[] = [];

    const combinations = [];
    for (const bias of biasOptions) {
        for (const vol of VOL_OPTS) {
            for (const fee of FEE_OPTS) {
                combinations.push({ bias, vol, fee });
            }
        }
    }

    const totalRuns = combinations.length * TRIALS;
    let completedRuns = 0;

    for (const combo of combinations) {
        const scenarioResults: SimulationResult[] = [];
        const scenarioId = `Bias:${(combo.bias * 100).toFixed(0)}% Vol:${combo.vol} Fee:${(combo.fee * 100).toFixed(2)}%`;

        for (let i = 0; i < TRIALS; i++) {
            const params: SimulationParams = {
                ...baseParams,
                tradeProbForward: combo.bias,
                tradesPerDay: combo.vol,
                feeRate: combo.fee,
                seed: i + (combinations.indexOf(combo) * TRIALS)
            };

            const result = runSimulation(params, priceData);
            scenarioResults.push(result);

            completedRuns++;

            if (completedRuns % 5 === 0) {
                onProgress(Math.round((completedRuns / totalRuns) * 100), scenarioId);
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        // --- Build Per-Trial Data ---
        const trialsData: TrialResult[] = scenarioResults.map((r, idx) => {
            const lastStep = r.steps[r.steps.length - 1];

            // Pool Breakdown
            const valFiat = (lastStep.ammPrice > 0) ? (lastStep.reserveFiat / lastStep.ammPrice) : 0;
            const valRes = (lastStep.valPool || 0) - valFiat;

            // Excl Buffer
            const profit = r.metrics.netChangeValuation;
            const buffer = lastStep.backingBufferUSD || 0;
            const profitExclBuffer = profit - buffer; // Assuming buffer accumulation is part of profit

            // Recalc APY Excl Buffer
            // Use lastStep.day which represents the actual simulation day (0-indexed)
            const durationDays = Math.max(1, lastStep.day);
            const years = durationDays / 365;

            const apyExcl = (profitExclBuffer / r.metrics.initialValuation) / years;

            const txs = r.steps.filter(s => s.tradeLog);

            return {
                id: idx + 1,
                apy: r.metrics.apy,
                profit: profit,
                initialVal: r.metrics.initialValuation,
                finalVal: r.metrics.initialValuation + profit,

                finalBuffer: buffer,
                finalPoolVal: lastStep.valPool || 0,
                finalPoolValFiat: valFiat,
                finalPoolValRes: valRes,
                finalHoldingsVal: lastStep.valLpHoldings || 0,
                totalFees: lastStep.feesCollected || 0,

                profitExclBuffer,
                apyExclBuffer: apyExcl,

                daysRun: durationDays, // Use Actual Days
                netFlow: r.metrics.netFlow,
                totalFlow: r.metrics.totalFlow,
                txCount: txs.length,
                expCount: txs.filter(s => s.tradeLog?.type === 'EXPANSION').length,
                contCount: txs.filter(s => s.tradeLog?.type === 'CONTRACTION').length,

                // Debug Market Data
                startPrice: r.steps[0]?.oraclePrice || 0,
                endPrice: lastStep.oraclePrice
            };
        });

        // --- Aggregation Stats ---
        // (Reusing logic, but cleaner to map from trialsData now!)
        const apys = trialsData.map(t => t.apy * 100); // simulation-runner returns decimal APY
        const profits = trialsData.map(t => t.profit);
        const daysRuns = trialsData.map(t => t.daysRun);
        apys.sort((a, b) => a - b);

        const sumAPY = apys.reduce((a, b) => a + b, 0);
        const avgAPY = sumAPY / apys.length;
        const medianAPY = apys[Math.floor(apys.length / 2)];
        const minAPY = apys[0];
        const maxAPY = apys[apys.length - 1];

        const sqDiffs = apys.map(v => Math.pow(v - avgAPY, 2));
        const avgSqDiff = sqDiffs.reduce((a, b) => a + b, 0) / apys.length;
        const stdDevAPY = Math.sqrt(avgSqDiff);

        // Averages
        const avgProfit = trialsData.reduce((a, b) => a + b.profit, 0) / TRIALS;
        const winRate = (trialsData.filter(t => t.profit > 0).length / TRIALS) * 100;
        const avgDaysRun = trialsData.reduce((a, b) => a + b.daysRun, 0) / TRIALS;
        const avgInitialVal = trialsData.reduce((a, b) => a + b.initialVal, 0) / TRIALS;

        const avgFinalBuffer = trialsData.reduce((a, b) => a + b.finalBuffer, 0) / TRIALS;
        const avgFinalPoolVal = trialsData.reduce((a, b) => a + b.finalPoolVal, 0) / TRIALS;
        const avgFinalPoolValFiat = trialsData.reduce((a, b) => a + b.finalPoolValFiat, 0) / TRIALS;
        const avgFinalPoolValRes = trialsData.reduce((a, b) => a + b.finalPoolValRes, 0) / TRIALS;
        const avgFinalHoldingsVal = trialsData.reduce((a, b) => a + b.finalHoldingsVal, 0) / TRIALS;
        const avgTotalFees = trialsData.reduce((a, b) => a + b.totalFees, 0) / TRIALS;
        const avgAPYExcl = (trialsData.reduce((a, b) => a + (b.apyExclBuffer || 0), 0) / TRIALS) * 100;

        const avgNetFlow = trialsData.reduce((a, b) => a + b.netFlow, 0) / TRIALS;
        const avgTotalFlow = trialsData.reduce((a, b) => a + b.totalFlow, 0) / TRIALS;

        const avgTxCount = trialsData.reduce((a, b) => a + b.txCount, 0) / TRIALS;
        const avgExpCount = trialsData.reduce((a, b) => a + b.expCount, 0) / TRIALS;
        const avgContCount = trialsData.reduce((a, b) => a + b.contCount, 0) / TRIALS;

        results.push({
            id: scenarioId,
            params: {
                tradeProbForward: combo.bias,
                tradesPerDay: combo.vol,
                feeRate: combo.fee
            },
            trials: TRIALS,
            stats: {
                avgAPY, medianAPY, minAPY, maxAPY, stdDevAPY,
                avgAPYExclBuffer: avgAPYExcl,
                avgProfit, winRate, avgDaysRun, avgInitialVal,
                avgFinalBuffer, avgFinalPoolVal, avgFinalPoolValFiat, avgFinalPoolValRes, avgFinalHoldingsVal,
                avgTotalFees, avgNetFlow, avgTotalFlow, avgTxCount, avgExpCount, avgContCount
            },
            trialsData,
            rawAPYs: apys
        });
    }

    onProgress(100, "Complete");
    return results;
}
