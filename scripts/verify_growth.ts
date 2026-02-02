
import { ViFiAMM } from '../lib/vifi-amm';

// Simple script to verify the Growth Mechanism (Wallet State Persistence)
async function verifyGrowth() {
    console.log("--- STARTING GROWTH MECHANISM VERIFICATION ---\n");

    const initialLiquidity = 1000000; // $1M
    const oraclePrice = 150; // 150 F/USD
    const premium = 0.15; // 15%

    // 1. Initialize
    console.log("1. Initializing AMM...");
    const amm = new ViFiAMM(initialLiquidity, oraclePrice, premium);

    let state = amm.getState(0, oraclePrice);
    console.log(`[Day 0] User Wallet (Zf): ${state.walletFiat.toLocaleString()} F`);
    const initialZf = state.walletFiat;

    // 2. Perform Expansion (User Buys Fiat with $10,000)
    console.log("\n2. Executing EXPANSION (User Input $10,000)...");
    const expResult = amm.expansion(10000, oraclePrice);
    console.log(`   -> Output: +${expResult.amountOut.toLocaleString()} F`);

    state = amm.getState(0, oraclePrice);
    console.log(`   [State Check] User Wallet (Zf): ${state.walletFiat.toLocaleString()} F`);

    // VERIFICATION 1
    const expectedZf = initialZf + expResult.amountOut;
    if (Math.abs(state.walletFiat - expectedZf) < 1) {
        console.log("   ✅ SUCCESS: Wallet INCREASED by exact output amount.");
    } else {
        console.log("   ❌ FAIL: Wallet did not update correctly.");
    }

    // 3. Perform Contraction (User Sells 50,000 Fiat)
    console.log("\n3. Executing CONTRACTION (User Sells 50,000 F)...");
    const contResult = amm.contraction(50000, oraclePrice);
    console.log(`   -> Output: $${contResult.amountOut.toLocaleString()} USD`);

    state = amm.getState(0, oraclePrice);
    console.log(`   [State Check] User Wallet (Zf): ${state.walletFiat.toLocaleString()} F`);

    // VERIFICATION 2
    const expectedZf2 = expectedZf - 50000;
    if (Math.abs(state.walletFiat - expectedZf2) < 1) {
        console.log("   ✅ SUCCESS: Wallet DECREASED by exact input amount.");
    } else {
        console.log("   ❌ FAIL: Wallet did not update correctly.");
    }

    console.log("\n--- VERIFICATION COMPLETE ---");
}

verifyGrowth();
