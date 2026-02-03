// VARQ State Machine (matching Python implementation)
export enum VARQState {
    S0 = 's0',  // O_R == P_R and C_U == 0 (Equilibrium, no buffer)
    S1 = 's1',  // O_R > P_R (Positive flux, C_U may be 0 or >0)
    S2 = 's2',  // O_R == P_R and C_U > 0 (Equilibrium with buffer)
    S3 = 's3',  // O_R < P_R and C_U > 0 (Negative flux with buffer)
    S4 = 's4',  // O_R < P_R and C_U == 0 (Negative flux, no buffer)
}

export type SimulationParams = {
    initialLiquidityUSD: number;
    initialPremium: number;
    tradeProbForward: number;
    volatility: number;
    numDays: number;
    tradesPerDay: number;
    isSmartAgent: boolean;
    currency: 'NGN' | 'KES' | 'ETB' | 'Custom';
    feeRate: number;
    seed?: number;
};

// Trade Detail Log
export type TradeLog = {
    type: 'EXPANSION' | 'CONTRACTION';
    status: 'SUCCESS' | 'FAILED'; // New Field
    failureReason?: string;       // New Field
    // Solver Details
    solver_a?: number;
    solver_b?: number;
    solver_c?: number;
    solver_discriminant?: number;
    oraclePrice: number;
    effectiveRate: number;
    feeUSD?: number;
    inputUSD?: number;   // For Expansion
    totalOutput?: number; // Fiat Out
    mintedFiat?: number;
    mintedReserve?: number; // Ri
    excessFiat?: number; // Fs
    inputFiat?: number;  // For Contraction
    swapFiat?: number; // Fs (Contraction)
    redeemFiat?: number; // Fr (Contraction)
    totalOutputUSD?: number; // USD Out
    reservesAcquired?: number; // Rs
    preSwapX: number;
    preSwapY: number;
    postSwapX: number;
    postSwapY: number;
    contractionCap?: number; // Debugging for User
    lambda?: number;
    // Buffer Debug
    lambdaBufferDelta?: number;    // This trade's contribution
    cumulativeBufferUSD?: number;  // Total System Buffer
    // System State Deltas
    preSu?: number;
    postSu?: number;
    preSf?: number;
    postSf?: number;
    // Health Metrics
    Pr?: number;
    Omega?: number;
    Phi?: number;
    // Holdings
    preZf?: number;
    postZf?: number;
    preWf?: number;
    postWf?: number;
    // Valuation
    preLpTotalValue?: number;
    postLpTotalValue?: number;
    valExcessClaims?: number;
    valPool?: number;
    valLpHoldings?: number;
};

export type SimulationStep = {
    day: number;
    oraclePrice: number;
    ammPrice: number;
    reserveUSD: number;
    reserveFiat: number;
    treasuryFiat: number;
    walletFiat: number; // Wf
    lpExcessFiat: number; // Zf
    lpValuation: number;
    lpTotalValue?: number;
    lpAssetsValue?: number;
    valExcessClaims?: number;
    valPool?: number;
    valLpHoldings?: number;
    impermanentLoss: number;
    feesCollected: number;
    feesExpansion?: number;   // New Breakdown
    feesContraction?: number; // New Breakdown
    totalCollateralUSD: number; // Su (For Metrics)
    backingBufferUSD?: number;  // New Field
    tradeLog?: TradeLog;
    // Health Metrics
    Lambda?: number;
    Phi?: number;
    Omega?: number;
};

// The ViFi Hybrid AMM (Oracle + Premium AMM)
export class ViFiAMM {
    private reserveUSD: number;     // X_r (Reserve Tokens in AMM)
    private reserveFiat: number;    // Y_f (Fiat in AMM)
    private treasuryFiat: number;   // Farm Fiat
    private publicFiat: number;     // User Fiat (W_f)
    private lpExcessFiat: number;   // LP Excess (Z_f)
    private surplusUSD: number;     // Fees (Total)
    private feesExpansion: number = 0;
    private feesContraction: number = 0;
    public backingBufferUSD: number = 0; // New: Lambda Excess

    // Core Accounting
    private totalCollateralUSD: number; // S_u (Actual USD Collateral Backing)

    private k: number;              // Invariant
    private initialValuation: number;

    public lastTradeLog: TradeLog | null = null;
    private feeRate: number;

    constructor(initialUSD: number, oraclePrice: number, premium: number, feeRate: number = 0.001) {
        this.feeRate = feeRate;
        this.reserveUSD = 0;
        this.reserveFiat = 0;
        this.treasuryFiat = 0;
        this.publicFiat = 0;
        this.lpExcessFiat = 0;
        this.surplusUSD = 0;
        this.totalCollateralUSD = 0;
        this.k = 0;
        this.initialValuation = 0;

        this.initVFE(initialUSD, premium, oraclePrice);
    }

    private initVFE(liquidityUSD: number, premium: number, oraclePrice: number) {
        // Setup Reserves (Xi = Ri) - Full 1M as requested
        this.reserveUSD = liquidityUSD;
        // Initially Solvency = 1, so Collateral = Reserves
        this.totalCollateralUSD = liquidityUSD;

        // Setup Total Fiat Supply (Sf = Ui * Or)
        const totalFiat = liquidityUSD * oraclePrice;

        // Setup Pool Fiat (Yf = Xr * Ar)
        // User: "pool flat 1mil * ar"
        const ammRate = oraclePrice * premium;
        this.reserveFiat = this.reserveUSD * ammRate;

        // Setup Public Fiat (Zf = Sf - Yf)
        // Remainder goes to Circulation
        const remainder = totalFiat - this.reserveFiat;
        // User Fiat Allocation (match Python: 100k * (Or + Ar))
        // We assume 100k USDv "User Capital" entered at Full Rate
        const userCapital = 100000;
        const totalRate = oraclePrice + ammRate;

        this.publicFiat = userCapital * totalRate;
        this.lpExcessFiat = remainder - this.publicFiat;

        // Safety clamp
        if (this.lpExcessFiat < 0) {
            // Fallback if math goes weird due to params, usually shouldn't with standard params
            this.lpExcessFiat = 0;
            this.publicFiat = remainder;
        }

        // Treasury (Farm) separate or 0 for now
        this.treasuryFiat = 0;

        this.k = this.reserveUSD * this.reserveFiat;

        // Initial Valuation
        this.initialValuation = this.getValuation(totalRate, ammRate);
    }



    private getValuation(totalRate: number, ammRate: number): number {
        // U_val = (Su - Sr) + Fees + Yf/Tr + (Xr * Ar)/Tr + Farm/Tr + Zf/Tr
        // We use (totalCollateralUSD - reserveUSD) to count only EXTRA backing, avoiding double counting
        // since the reserveUSD is essentially accounting for the tokens Xr.
        // Formula A3: 1 vFiat = 1 / Tr. 1 vRQT = Ar / Tr.
        return (this.totalCollateralUSD - this.reserveUSD + this.surplusUSD) +
            (this.reserveFiat / totalRate) +
            ((this.reserveUSD * ammRate) / totalRate) +
            (this.lpExcessFiat / totalRate) +
            (this.treasuryFiat / totalRate);
    }

    private getDerivedState(oraclePrice: number) {
        const Sf = this.reserveFiat + this.publicFiat + this.lpExcessFiat + this.treasuryFiat;
        const Sr = this.reserveUSD; // Token Supply
        const Su = this.totalCollateralUSD; // Actual Collateral

        const Pr = (Sr > 0) ? Sf / Sr : 0;
        const Phi = (oraclePrice > 0) ? Pr / oraclePrice : 1;
        const Omega = (Sr > 0) ? Su / Sr : 1;

        // Calculate C_U (over-collateralization buffer)
        const C_U = Math.max(0, Su - Sr);

        // Detect VARQ state
        const state = this.detectVARQState(oraclePrice, Pr, C_U);

        // Calculate Lambda using state-aware funding rate
        const Lambda = this.calculateFundingRate(state, oraclePrice, Pr, Omega);

        return { Sf, Sr, Su, Pr, Phi, Omega, Lambda, C_U, state };
    }

    private detectVARQState(oracleRate: number, protocolRate: number, bufferUSD: number): VARQState {
        const epsilon = 0.0001; // Tolerance for equality checks
        const hasBuffer = bufferUSD > epsilon;

        const O_R = oracleRate;
        const P_R = protocolRate;

        // Check equilibrium (O_R ≈ P_R)
        const isEquilibrium = Math.abs(O_R - P_R) < epsilon;

        if (isEquilibrium && !hasBuffer) {
            return VARQState.S0; // Equilibrium, no buffer
        } else if (O_R > P_R) {
            return VARQState.S1; // Positive flux (oracle > protocol)
        } else if (isEquilibrium && hasBuffer) {
            return VARQState.S2; // Equilibrium with buffer
        } else if (O_R < P_R && hasBuffer) {
            return VARQState.S3; // Negative flux with buffer
        } else { // O_R < P_R && !hasBuffer
            return VARQState.S4; // Negative flux, no buffer (CRITICAL)
        }
    }

    private calculateFundingRate(
        state: VARQState,
        oracleRate: number,
        protocolRate: number,
        reserveRatio: number
    ): number {
        // Python Logic Alignment (from vfe.py):
        // FR (Flux Ratio) = P_R / O_R
        const FR = (oracleRate > 0) ? protocolRate / oracleRate : 10000;
        const RR = reserveRatio;
        const epsilon = 0.000001;

        // Logic from vfe.py: funding_rate()
        // If FR > 1 (Appreciation/Positive Flux in Python terms) AND RR ≈ 1 (No Buffer) -> Return 1
        if (FR > 1 && Math.abs(RR - 1) < epsilon) {
            return 1.0;
        }

        // Otherwise return FR
        // This means during Depreciation (FR < 1), we return FR (< 1), which builds buffer.
        return FR;
    }

    // Expansion: Forward Swap (Un -> Fe)
    public expansion(amountInUSD: number, oraclePrice: number): { success: boolean, amountOut: number, fee: number } {
        // Calculate PR for Logic Alignment
        const preState = this.getDerivedState(oraclePrice);
        const PR = preState.Pr;

        // Capture Pre-Valuation matching Python (using Pr)
        const preAmmRate = this.reserveFiat / this.reserveUSD;
        // Python Valuation uses Pr + AmmRate
        const preTotalRate = PR + preAmmRate;
        const preValuation = this.getValuation(preTotalRate, preAmmRate);

        const fee = amountInUSD * this.feeRate;
        this.surplusUSD += fee;
        this.feesExpansion += fee;
        const netUSDIn = amountInUSD - fee;

        // 0. Update Derived State
        const state = this.getDerivedState(oraclePrice);
        const preSu = this.totalCollateralUSD;
        // Calculate Pre-Sf correctly: ReserveFiat + PublicFiat + LpExcess + TreasuryFiat
        const preSf = this.reserveFiat + this.publicFiat + this.lpExcessFiat + this.treasuryFiat;
        const preZf = this.lpExcessFiat;
        const preWf = this.publicFiat;

        // 1. Minting Component (Fi)
        const Fi = netUSDIn * oraclePrice;


        // 2. Minting Reserves (Ri) with Lambda - Equilibrium-Aware Logic
        let Ri = 0;

        // Calculate equilibrium amount (where system returns to O_R = P_R)
        // U_eq = (S_F - (O_R * S_R)) / (O_R * (λ - 1))
        let U_eq = 0;
        if (Math.abs(state.Lambda - 1) > 0.000001) {
            const numerator = state.Sf - (oraclePrice * state.Sr);
            const denominator = oraclePrice * (state.Lambda - 1);
            U_eq = (Math.abs(denominator) > 0.000001) ? numerator / denominator : 0;
        }

        if (state.Lambda > 1) {
            // Edge Case: Lambda > 1 (Using Over-collateralization)
            const overCollat = Math.max(0, state.Su - state.Sr);

            // How much U can be minted at Lambda > 1 before exhausting C_U?
            // U_surplus * (L - 1) = C_U  => U_surplus = C_U / (L - 1)
            // Safety: Lambda is > 1.000001 usually, but check div 0
            const denom = state.Lambda - 1;
            const U_del_surplus = (denom > 0.000001) ? overCollat / denom : 0;

            // Check if equilibrium is hit BEFORE buffer exhaustion
            if (U_eq > 0 && U_eq < U_del_surplus) {
                // Equilibrium comes first (S1 -> S2 transition)
                if (netUSDIn > U_eq) {
                    // Split: Part at Lambda, part at 1:1 (equilibrium)
                    const Ri_eq = U_eq * state.Lambda;
                    const Ri_normal = (netUSDIn - U_eq) * 1.0;
                    Ri = Ri_eq + Ri_normal;
                } else {
                    // Full amount before equilibrium
                    Ri = netUSDIn * state.Lambda;
                }
            } else {
                // Buffer exhaustion comes first (or no equilibrium)
                if (netUSDIn > U_del_surplus) {
                    // SPLIT TRANSACTION
                    const U_del_normal = netUSDIn - U_del_surplus;

                    const Ri_surplus = U_del_surplus * state.Lambda;
                    const Ri_normal = U_del_normal * 1.0; // Fallback to 1:1

                    Ri = Ri_surplus + Ri_normal;
                } else {
                    // Full amount fits within over-collateralization buffer
                    Ri = netUSDIn * state.Lambda;
                }
            }
        } else if (state.Lambda < 1) {
            // Negative flux case (Lambda < 1)
            // Check if equilibrium is hit during this transaction
            if (U_eq > 0 && netUSDIn > U_eq) {
                // Split: Part at Lambda < 1, part at 1:1 (equilibrium)
                const Ri_eq = U_eq * state.Lambda;
                const Ri_normal = (netUSDIn - U_eq) * 1.0;
                Ri = Ri_eq + Ri_normal;
            } else {
                // Standard Case (Lambda < 1, no equilibrium hit)
                Ri = netUSDIn * state.Lambda;
            }
        } else {
            // Lambda = 1 (Equilibrium state)
            Ri = netUSDIn * 1.0;
        }


        // Capture the non-Lambda portion as System Surplus (Backing Buffer)
        const lambdaSurplus = netUSDIn - Ri;
        this.backingBufferUSD += lambdaSurplus;

        // 3. Safety Check: Don't push Omega < 1 if it wasn't already
        const newSu = state.Su + netUSDIn;
        const newSr = state.Sr + Ri;
        const newOmega = (newSr > 0) ? newSu / newSr : 1;

        if (state.Omega >= 1 && newOmega < 0.999999) {
            // Reject trade if it breaks solvency boundaries significantly
            return { success: false, amountOut: 0, fee: 0 };
        }

        // 4. AMM Component (Fs)
        const oldX = this.reserveUSD;
        const oldY = this.reserveFiat;

        const newReserveUSD = oldX + Ri; // Inject minted Reserves

        if (newReserveUSD <= 0) return { success: false, amountOut: 0, fee: 0 };

        const newReserveFiat = this.k / newReserveUSD;
        // Fs = Amount ejected
        const Fs = oldY - newReserveFiat;

        const totalOutFiat = Fi + Fs;

        // Update State
        this.reserveUSD = newReserveUSD; // Sr increases by Ri
        this.totalCollateralUSD += netUSDIn; // Su increases by Ui
        this.reserveFiat = newReserveFiat;
        this.publicFiat += totalOutFiat; // User Wallet Growth (Zf)

        // Calc Post-Values for Logging
        // Re-calculate PR based on new state
        const postState = this.getDerivedState(oraclePrice);
        const postPr = postState.Pr;

        const postAmmRate = this.reserveFiat / this.reserveUSD;
        // Python Valuation uses Pr + AmmRate
        const postTotalRate = postPr + postAmmRate;
        const postValExcess = this.totalCollateralUSD - this.reserveUSD;
        const postValPool = (this.reserveFiat / postTotalRate) + ((this.reserveUSD * postAmmRate) / postTotalRate);
        const postValHoldings = (this.lpExcessFiat / postTotalRate) + (this.treasuryFiat / postTotalRate);

        // Log
        this.lastTradeLog = {
            type: 'EXPANSION',
            oraclePrice,
            effectiveRate: amountInUSD > 0 ? totalOutFiat / amountInUSD : 0,
            feeUSD: fee,
            inputUSD: amountInUSD,
            totalOutput: totalOutFiat,
            mintedFiat: Fi,
            mintedReserve: Ri,
            excessFiat: Fs,
            preSwapX: oldX,
            preSwapY: oldY,
            postSwapX: this.reserveUSD,
            postSwapY: this.reserveFiat,
            lambda: state.Lambda,
            // Buffer Debug
            lambdaBufferDelta: lambdaSurplus,
            cumulativeBufferUSD: this.backingBufferUSD,
            status: 'SUCCESS',
            // System Deltas
            preSu: preSu,
            postSu: this.totalCollateralUSD,
            preSf: preSf,
            postSf: this.reserveFiat + this.publicFiat + this.lpExcessFiat + this.treasuryFiat,
            preZf: preZf,
            postZf: this.lpExcessFiat,
            preWf: preWf,
            postWf: this.publicFiat,
            // Valuation
            preLpTotalValue: preValuation,
            postLpTotalValue: postValExcess + this.surplusUSD + postValPool + postValHoldings,
            valExcessClaims: postValExcess,
            valPool: postValPool,
            valLpHoldings: postValHoldings,
            // Health
            Pr: state.Pr,
            Omega: state.Omega,
            Phi: state.Phi
        };

        return { success: true, amountOut: totalOutFiat, fee };
    }

    // Contraction: Reverse Swap (Fe -> Un)
    public contraction(amountInFiat: number, oraclePrice: number, debugCap?: number): { success: boolean, amountOut: number, fee: number } {
        // Calculate Protocol Rate (Pr) for Logic Alignment
        const state = this.getDerivedState(oraclePrice);
        const PR = state.Pr; // Use Protocol Rate, NOT Oracle Price

        // Capture Pre-Valuation matches Python (using Pr)
        const preAmmRate = this.reserveFiat / this.reserveUSD;
        // Python Valuation uses Pr + AmmRate
        // Note: This changes valuation basis from Oracle to Protocol!
        const preTotalRate = PR + preAmmRate;
        const preValuation = this.getValuation(preTotalRate, preAmmRate);

        const Fe = amountInFiat;
        const XR = this.reserveUSD;
        const YF = this.reserveFiat;
        // const PR = oraclePrice; // DELETED - We used real PR above
        const K = this.k;

        // Capture Pre-State
        const preSu = this.totalCollateralUSD;
        const preSf = this.reserveFiat + this.publicFiat + this.lpExcessFiat + this.treasuryFiat;
        const preZf = this.lpExcessFiat;
        const preWf = this.publicFiat;
        // Derived Pre-State for logging
        const preState = this.getDerivedState(oraclePrice);

        // Quadratic Coeffs
        const a = PR;
        const b = -((YF + Fe) + (PR * XR));
        const c = ((YF + Fe) * XR) - K;

        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) {
            this.lastTradeLog = {
                type: 'CONTRACTION',
                status: 'FAILED',
                failureReason: 'Liquidity Crisis (Discriminant < 0)',
                oraclePrice,
                effectiveRate: 0,
                inputFiat: amountInFiat,
                preSwapX: XR,
                preSwapY: YF,
                postSwapX: XR,
                postSwapY: YF,
                contractionCap: debugCap,
                solver_a: a,
                solver_b: b,
                solver_c: c,
                solver_discriminant: discriminant
            };
            return { success: false, amountOut: 0, fee: 0 };
        }

        // Solve for Rs
        const sqrtD = Math.sqrt(discriminant);
        const Rs1 = (-b + sqrtD) / (2 * a);
        const Rs2 = (-b - sqrtD) / (2 * a);

        let Rs = 0;
        if (Rs1 > 0 && Rs1 < XR) Rs = Rs1;
        else if (Rs2 > 0 && Rs2 < XR) Rs = Rs2;
        else Rs = Math.min(Rs1, Rs2);

        const grossUSDOut = Rs;
        const fee = grossUSDOut * this.feeRate;
        const netUSDOut = grossUSDOut - fee;

        // Update State
        const newReserveUSD = XR - Rs; // Sr decreases by Rs
        const newReserveFiat = K / newReserveUSD;

        const Fs = newReserveFiat - YF;
        const Fr = Fe - Fs;

        this.reserveUSD = newReserveUSD;
        this.totalCollateralUSD -= grossUSDOut; // S_u decreases by GROSS (Fee is moved to Q_u)

        this.reserveFiat = newReserveFiat;
        this.publicFiat -= amountInFiat;
        this.surplusUSD += fee;
        this.feesContraction += fee;

        // Calc Post-Values for Logging
        const postAmmRate = this.reserveFiat / this.reserveUSD;
        const postTotalRate = oraclePrice + postAmmRate;
        const postValExcess = this.totalCollateralUSD - this.reserveUSD;
        const postValPool = (this.reserveFiat / postTotalRate) + ((this.reserveUSD * postAmmRate) / postTotalRate);
        const postValHoldings = (this.lpExcessFiat / postTotalRate) + (this.treasuryFiat / postTotalRate);

        // Log
        this.lastTradeLog = {
            type: 'CONTRACTION',
            oraclePrice,
            effectiveRate: grossUSDOut > 0 ? amountInFiat / grossUSDOut : 0,
            feeUSD: fee,
            inputFiat: amountInFiat,
            totalOutputUSD: netUSDOut,
            reservesAcquired: Rs,
            swapFiat: Fs,
            redeemFiat: Fr,
            preSwapX: XR,
            preSwapY: YF,
            postSwapX: this.reserveUSD,
            postSwapY: this.reserveFiat,
            contractionCap: debugCap,
            status: 'SUCCESS',
            solver_a: a,
            solver_b: b,
            solver_c: c,
            solver_discriminant: discriminant,
            // System Deltas
            preSu: preSu,
            postSu: this.totalCollateralUSD,
            preSf: preSf,
            postSf: this.reserveFiat + this.publicFiat + this.lpExcessFiat + this.treasuryFiat,
            preZf: preZf,
            postZf: this.lpExcessFiat,
            preWf: preWf,
            postWf: this.publicFiat,
            // Valuation
            preLpTotalValue: preValuation,
            postLpTotalValue: postValExcess + this.surplusUSD + postValPool + postValHoldings,
            valExcessClaims: postValExcess,
            valPool: postValPool,
            valLpHoldings: postValHoldings,
            // Health
            Pr: preState.Pr,
            Omega: preState.Omega,
            Phi: preState.Phi
        };

        return { success: true, amountOut: netUSDOut, fee };
    }

    public getState(day: number, oraclePrice: number): SimulationStep {
        const state = this.getDerivedState(oraclePrice);
        const ammRate = this.reserveFiat / this.reserveUSD;
        const totalRate = oraclePrice + ammRate;

        const currentValuation = this.getValuation(totalRate, ammRate);

        // Calculate IL?
        const impermanentLoss = 0;

        const step: SimulationStep = {
            day,
            oraclePrice,
            ammPrice: totalRate,
            reserveUSD: this.reserveUSD,
            reserveFiat: this.reserveFiat,
            walletFiat: this.publicFiat,
            lpExcessFiat: this.lpExcessFiat,
            treasuryFiat: this.treasuryFiat,
            impermanentLoss: impermanentLoss,
            feesCollected: this.surplusUSD,
            feesExpansion: this.feesExpansion,
            feesContraction: this.feesContraction,
            backingBufferUSD: this.backingBufferUSD,
            totalCollateralUSD: this.totalCollateralUSD, // Added for Metrics
            // Health
            Lambda: state.Lambda,
            Phi: state.Phi,
            Omega: state.Omega,
            // Valuation Breakdown
            lpValuation: currentValuation,
            lpTotalValue: currentValuation,
            lpAssetsValue: currentValuation - this.surplusUSD,
            // Detailed Components
            valExcessClaims: (this.totalCollateralUSD - this.reserveUSD),
            valPool: (this.reserveFiat / totalRate) + ((this.reserveUSD * ammRate) / totalRate),
            valLpHoldings: (this.lpExcessFiat / totalRate) + (this.treasuryFiat / totalRate)
        };

        if (this.lastTradeLog) {
            step.tradeLog = this.lastTradeLog;
        }

        return step;
    }
}
