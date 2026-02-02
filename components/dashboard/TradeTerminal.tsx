
"use client";

import React, { useState } from 'react';
import { Terminal, ArrowRight, CornerDownRight, ChevronRight, ChevronDown, Activity, Layers, ArrowLeftRight, CheckCircle2, Flame, Split, DollarSign } from 'lucide-react';
import { TradeLog } from '@/lib/vifi-amm';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface TradeTerminalProps {
    tradeLog: TradeLog | undefined;
}

export function TradeTerminal({ tradeLog }: TradeTerminalProps) {
    if (!tradeLog) return null;

    const isExpansion = tradeLog.type === 'EXPANSION';

    return (
        <div className="bg-black border border-zinc-800 rounded-xl font-mono text-sm overflow-hidden shadow-2xl relative mt-8">
            <div className="absolute top-0 right-0 p-4 opacity-50"><Terminal className="w-6 h-6 text-zinc-700" /></div>

            {/* Terminal Header */}
            <div className={cn(
                "px-6 py-4 border-b border-zinc-800 flex items-center justify-between",
                tradeLog.status === 'FAILED' ? "bg-red-950/30 border-red-900/50" : "bg-zinc-900/50"
            )}>
                <span className={cn(
                    "flex items-center gap-2 text-xs uppercase tracking-widest",
                    tradeLog.status === 'FAILED' ? "text-red-500" : "text-zinc-400"
                )}>
                    <div className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        tradeLog.status === 'FAILED' ? "bg-red-500" : "bg-emerald-500"
                    )} />
                    Transaction Log: 0x9A...F
                </span>
                <div className="flex items-center gap-4">
                    <span className="text-zinc-500 text-xs">Block #1</span>
                    <span className={cn(
                        "font-bold uppercase tracking-widest text-xs px-2 py-1 rounded border",
                        tradeLog.status === 'FAILED'
                            ? "text-red-500 border-red-500/20 bg-red-500/5"
                            : isExpansion
                                ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                                : "text-amber-500 border-amber-500/20 bg-amber-500/5"
                    )}>
                        {tradeLog.status === 'FAILED' ? 'FAILED' : tradeLog.type}
                    </span>
                </div>
            </div>

            {/* ERROR STATE */}
            {tradeLog.status === 'FAILED' && (
                <div className="p-8 text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                        <Activity className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-red-400 font-bold mb-1">Transaction Rejected</h3>
                        <p className="text-zinc-500 text-xs font-mono">{tradeLog.failureReason || 'Unknown Error'}</p>
                    </div>
                    <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800 text-left text-xs font-mono space-y-2 max-w-md mx-auto">
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Attempted Type:</span>
                            <span className="text-zinc-300">{tradeLog.type}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Input Amount:</span>
                            <span className="text-zinc-300">{Math.round(tradeLog.inputFiat || tradeLog.inputUSD || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Pool Reserves (X):</span>
                            <span className="text-red-400">{Math.round(tradeLog.preSwapX).toLocaleString()} (CRITICAL)</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Steps Container (Only if SUCCESS) */}
            {tradeLog.status !== 'FAILED' && (
                <div className="divide-y divide-zinc-800/50">

                    {/* ---------------- EXPANSION LOGIC ---------------- */}
                    {isExpansion && (
                        <>
                            {/* Step 1: Input */}
                            <StepRow
                                step="01"
                                title="User Input"
                                summary={`${Math.round(tradeLog.inputUSD || 0).toLocaleString()} USDV`}
                                icon={Layers}
                                isOpenDefault={true}
                            >
                                <div className="text-xs text-zinc-400 space-y-2">
                                    <div className="p-3 bg-zinc-900/50 rounded border border-zinc-800/50 font-mono text-emerald-400">
                                        <div className="flex justify-between items-center text-white font-bold">
                                            <span>&gt; Incoming Transfer:</span>
                                            <span>{Math.round(tradeLog.inputUSD || 0).toLocaleString()} USDV</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-1 font-normal">
                                            <span>Trading Fee (γ):</span>
                                            <span>-${tradeLog.feeUSD?.toFixed(2)} USD</span>
                                        </div>
                                    </div>
                                </div>
                            </StepRow>

                            {/* Step 2: VARQ Mint */}
                            <StepRow
                                step="02"
                                title="VARQ Protocol Mint"
                                summary={`+${Math.round(tradeLog.mintedFiat || 0).toLocaleString()} F  /  +${Math.round(tradeLog.mintedReserve || 0).toLocaleString()} R`}
                                icon={Activity}
                            >
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center px-2 pb-2 border-b border-white/5 mb-2">
                                        <span className="text-zinc-500">Lambda Factor (λ):</span>
                                        <span className="text-zinc-300 font-mono">{tradeLog.lambda?.toFixed(4) || '1.000'}</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-indigo-500/5 border border-indigo-500/10 rounded">
                                        <span className="text-indigo-400">Mint Fiat (F)</span>
                                        <span className="text-white font-bold">+{Math.round(tradeLog.mintedFiat || 0).toLocaleString()} F</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-emerald-500/5 border border-emerald-500/10 rounded">
                                        <span className="text-emerald-400">Mint Reserves (R)</span>
                                        <span className="text-white font-bold">+{Math.round(tradeLog.mintedReserve || 0).toLocaleString()} R</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-zinc-900/50 p-2 rounded mt-2">
                                        <div className="text-left">
                                            <p className="text-[10px] text-zinc-500 uppercase">Buffer Delta (Δ)</p>
                                            <p className="text-zinc-300 font-mono text-xs">{tradeLog.lambdaBufferDelta ? (tradeLog.lambdaBufferDelta > 0 ? '+' : '') + Math.round(tradeLog.lambdaBufferDelta).toLocaleString() : '0'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-zinc-500 uppercase">System Buffer (∑)</p>
                                            <p className="text-indigo-400 font-mono text-xs font-bold">${Math.round(tradeLog.cumulativeBufferUSD || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </StepRow>

                            {/* Step 3: VP-AMM */}
                            <StepRow
                                step="03"
                                title="VP-AMM Execution"
                                summary={`Found ${Math.round(tradeLog.excessFiat || 0).toLocaleString()} F Excess`}
                                icon={ArrowLeftRight}
                            >
                                <div className="space-y-4 text-xs">
                                    {/* AMM Logic Breakdown */}
                                    <div className="p-3 bg-zinc-900 rounded border border-zinc-800">
                                        <div className="text-[10px] text-zinc-500 font-mono mb-2 uppercase tracking-wider">AMM Constant Product Logic</div>
                                        <div className="space-y-2 font-mono text-zinc-300">
                                            <div className="flex justify-between">
                                                <span>Spot Price (Ar):</span>
                                                <span className="text-zinc-500">{Math.round(tradeLog.preSwapY).toLocaleString()} / {Math.round(tradeLog.preSwapX).toLocaleString()} ≈ {(tradeLog.preSwapY / tradeLog.preSwapX).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Invariant (k):</span>
                                                <span className="text-zinc-500">{(tradeLog.preSwapX * tradeLog.preSwapY).toExponential(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>X_new (Reserves):</span>
                                                <span>{Math.round(tradeLog.preSwapX).toLocaleString()} + <span className="text-emerald-400">{Math.round(tradeLog.mintedReserve || 0).toLocaleString()}</span> = {Math.round(tradeLog.postSwapX).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Y_new (Fiat):</span>
                                                <span>k / X_new = {Math.round(tradeLog.postSwapY).toLocaleString()}</span>
                                            </div>
                                            <div className="pt-2 mt-2 border-t border-zinc-800 flex justify-between font-bold text-amber-400">
                                                <span>Excess Fiat Ejected:</span>
                                                <span>{Math.round(tradeLog.preSwapY).toLocaleString()} - {Math.round(tradeLog.postSwapY).toLocaleString()} = {Math.round(tradeLog.excessFiat || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </StepRow>

                            {/* Step 4: Final */}
                            <StepRow
                                step="04"
                                title="Final Settlement"
                                summary={`${Math.round(tradeLog.totalOutput || 0).toLocaleString()} F (Rate: ${tradeLog.effectiveRate.toFixed(2)})`}
                                icon={CheckCircle2}
                                isOpenDefault={true}
                            >
                                <div className="pt-2 space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-zinc-500 uppercase">Total Output</span>
                                        <span className="text-2xl font-bold text-white">{Math.round(tradeLog.totalOutput || 0).toLocaleString()} F</span>
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        Eff. Rate: <span className="text-emerald-400">{tradeLog.effectiveRate.toFixed(2)}</span>
                                    </div>
                                </div>
                            </StepRow>

                            {/* Step 5: Global Update */}
                            <StepRow
                                step="05"
                                title="System State Update"
                                summary={`Su: ${Math.round(tradeLog.postSu || tradeLog.postSwapX).toLocaleString()}`}
                                icon={Activity}
                                isOpenDefault={false}
                            >
                                <div className="space-y-4 text-xs">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-zinc-900/30 p-2 rounded">
                                            <p className="text-[10px] text-zinc-500 mb-1 uppercase">Collateral (Su)</p>
                                            <div className="text-zinc-300 font-mono text-[10px]">
                                                {Math.round(tradeLog.preSu || 0).toLocaleString()} &rarr; <span className="text-indigo-400 font-bold">{Math.round(tradeLog.postSu || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="bg-zinc-900/30 p-2 rounded">
                                            <p className="text-[10px] text-zinc-500 mb-1 uppercase">Reserves (Sr)</p>
                                            <div className="text-zinc-300 font-mono text-[10px]">
                                                {Math.round(tradeLog.preSwapX).toLocaleString()} &rarr; <span className="text-emerald-400 font-bold">{Math.round(tradeLog.postSwapX).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="bg-zinc-900/30 p-2 rounded">
                                            <p className="text-[10px] text-zinc-500 mb-1 uppercase">Fiat Supply (Sf)</p>
                                            <div className="text-zinc-300 font-mono text-[10px]">
                                                {Math.round(tradeLog.preSf || 0).toLocaleString()} &rarr; <span className="text-white font-bold">{Math.round(tradeLog.postSf || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="bg-zinc-900/30 p-2 rounded">
                                            <p className="text-[10px] text-zinc-500 mb-1 uppercase">Pool Fiat (Y)</p>
                                            <div className="text-zinc-300 font-mono text-[10px]">
                                                {Math.round(tradeLog.preSwapY).toLocaleString()} &rarr; <span className="text-zinc-400 font-bold">{Math.round(tradeLog.postSwapY).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="bg-zinc-900/30 p-2 rounded">
                                            <p className="text-[10px] text-zinc-500 mb-1 uppercase">User Wallet (Wf)</p>
                                            <div className="text-zinc-300 font-mono text-[10px]">
                                                {Math.round(tradeLog.preWf || 0).toLocaleString()} &rarr; <span className="text-blue-400 font-bold">{Math.round(tradeLog.postWf || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="bg-zinc-900/30 p-2 rounded">
                                            <p className="text-[10px] text-zinc-500 mb-1 uppercase">LP Excess (Zf)</p>
                                            <div className="text-zinc-300 font-mono text-[10px]">
                                                {Math.round(tradeLog.preZf || 0).toLocaleString()} &rarr; <span className="text-amber-400 font-bold">{Math.round(tradeLog.postZf || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-2 pt-2 border-t border-zinc-800/50">
                                        <div className="text-[10px] text-zinc-500 font-mono mb-2 uppercase tracking-wider">Protocol Health State</div>
                                        <div className="grid grid-cols-5 gap-2 text-[10px] font-mono text-zinc-400 text-center">
                                            <div className="bg-black/20 p-1 rounded border border-zinc-800">
                                                <div className="text-zinc-600 mb-0.5">Or</div>
                                                <div className="text-white">{(tradeLog.oraclePrice || 0).toFixed(2)}</div>
                                            </div>
                                            <div className="bg-black/20 p-1 rounded border border-zinc-800">
                                                <div className="text-zinc-600 mb-0.5">Pr</div>
                                                <div className="text-white">{(tradeLog.Pr || 0).toFixed(2)}</div>
                                            </div>
                                            <div className="bg-black/20 p-1 rounded border border-zinc-800">
                                                <div className="text-zinc-600 mb-0.5">Φ (Phi)</div>
                                                <div className={((tradeLog.Phi || 1) < 1) ? "text-amber-400" : "text-emerald-400"}>{(tradeLog.Phi || 0).toFixed(4)}</div>
                                            </div>
                                            <div className="bg-black/20 p-1 rounded border border-zinc-800">
                                                <div className="text-zinc-600 mb-0.5">Ω (Omega)</div>
                                                <div className="text-white">{(tradeLog.Omega || 0).toFixed(4)}</div>
                                            </div>
                                            <div className="bg-black/20 p-1 rounded border border-zinc-800">
                                                <div className="text-zinc-600 mb-0.5">λ (Lambda)</div>
                                                <div className="text-white">{(tradeLog.lambda || 1).toFixed(4)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </StepRow>

                            {/* Step 6: Valuation Update */}
                            <StepRow
                                step="06"
                                title="Appraised Value (LP)"
                                summary={(() => {
                                    const diff = (tradeLog.postLpTotalValue || 0) - (tradeLog.preLpTotalValue || 0);
                                    const sign = diff >= 0 ? "+" : "";
                                    return `$${Math.round(tradeLog.postLpTotalValue || 0).toLocaleString()} (${sign}$${Math.round(diff).toLocaleString()})`;
                                })()}
                                icon={DollarSign}
                                isOpenDefault={false}
                            >
                                <div className="p-3 bg-zinc-900/30 rounded border border-zinc-800/50">
                                    <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-2">
                                        <span>Total Valuation (NAV)</span>
                                        <span className={((tradeLog.postLpTotalValue || 0) - (tradeLog.preLpTotalValue || 0) >= 0) ? "text-emerald-400" : "text-red-400"}>
                                            {(tradeLog.postLpTotalValue || 0) > (tradeLog.preLpTotalValue || 0) ? "Increased" : "Decreased"}
                                        </span>
                                    </div>
                                    <div className="text-sm font-mono text-zinc-300 flex justify-between items-center">
                                        <span>${Math.round(tradeLog.preLpTotalValue || 0).toLocaleString()}</span>
                                        <ArrowRight className="w-3 h-3 text-zinc-600" />
                                        <span className="text-white font-bold">${Math.round(tradeLog.postLpTotalValue || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-zinc-800/50 text-[10px] text-zinc-500 font-mono flex flex-col gap-1">
                                        <div>= Buffer (${Math.round(tradeLog.valExcessClaims || 0).toLocaleString()}) + Pool (${Math.round(tradeLog.valPool || 0).toLocaleString()}) + Holdings (${Math.round(tradeLog.valLpHoldings || 0).toLocaleString()})</div>
                                        <div className="text-zinc-600 pl-2 opacity-70">
                                            [+ Fees: ${Math.round((tradeLog.postLpTotalValue || 0) - ((tradeLog.valExcessClaims || 0) + (tradeLog.valPool || 0) + (tradeLog.valLpHoldings || 0))).toLocaleString()}]
                                        </div>
                                    </div>
                                </div>
                            </StepRow>
                        </>
                    )}

                    {/* ---------------- CONTRACTION LOGIC ---------------- */}
                    {!isExpansion && (
                        <>
                            {/* Step 1: Input */}
                            <StepRow
                                step="01"
                                title="Hybrid Exit Request"
                                summary={`${Math.round(tradeLog.inputFiat || 0).toLocaleString()} F (Sale)`}
                                icon={Layers}
                                isOpenDefault={true}
                            >
                                <div className="text-xs text-zinc-400">
                                    <div className="p-3 bg-zinc-900/50 rounded border border-zinc-800/50 font-mono text-amber-400 text-center">
                                        Selling <span className="text-white font-bold">{Math.round(tradeLog.inputFiat || 0).toLocaleString()} F</span>
                                    </div>
                                    {tradeLog.contractionCap && (
                                        <div className="flex justify-between items-center mt-2 px-2 text-[10px] text-zinc-500">
                                            <span>Volatility Cap (Theoretical 10%):</span>
                                            <span className="text-zinc-300 font-mono">{Math.round(tradeLog.contractionCap).toLocaleString()} F</span>
                                        </div>
                                    )}
                                </div>
                            </StepRow>

                            {/* Step 2: Solver */}
                            <StepRow
                                step="02"
                                title="Quadratic Solver"
                                summary={`Split: ${Math.round(tradeLog.swapFiat || 0)} F (Swap) / ${Math.round(tradeLog.redeemFiat || 0)} F (Redeem)`}
                                icon={Split}
                                isOpenDefault={true}
                            >
                                <div className="text-xs space-y-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-2 border border-blue-500/20 bg-blue-500/5 rounded">
                                            <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">AMM Portion (Fs)</p>
                                            <p className="text-white font-bold">{Math.round(tradeLog.swapFiat || 0).toLocaleString()}</p>
                                            <p className="text-[10px] text-zinc-500">Used to buy Reserves</p>
                                        </div>
                                        <div className="p-2 border border-purple-500/20 bg-purple-500/5 rounded">
                                            <p className="text-[10px] text-purple-400 font-bold uppercase mb-1">Direct Redeem (Fr)</p>
                                            <p className="text-white font-bold">{Math.round(tradeLog.redeemFiat || 0).toLocaleString()}</p>
                                            <p className="text-[10px] text-zinc-500">Burned directly</p>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-zinc-600 font-mono">
                                        Solver: ax² + bx + c = 0 &rarr; Optimized for minimal slippage.
                                    </div>
                                </div>
                            </StepRow>

                            {/* Step 3: Execution */}
                            <StepRow
                                step="03"
                                title="Execution & Burning"
                                summary={`Burned ${Math.round(tradeLog.inputFiat || 0).toLocaleString()} F Total`}
                                icon={Flame}
                            >
                                <div className="text-xs space-y-4">
                                    {/* AMM Logic Breakdown */}
                                    <div className="p-3 bg-zinc-900 rounded border border-zinc-800">
                                        <div className="text-[10px] text-zinc-500 font-mono mb-2 uppercase tracking-wider">AMM Constant Product Logic</div>
                                        <div className="space-y-2 font-mono text-zinc-300">
                                            <div className="flex justify-between">
                                                <span>Invariant (k):</span>
                                                <span className="text-zinc-500">{(tradeLog.preSwapX * tradeLog.preSwapY).toExponential(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Y_new (Fiat):</span>
                                                <span>{Math.round(tradeLog.preSwapY).toLocaleString()} + <span className="text-blue-400">{Math.round(tradeLog.swapFiat || 0).toLocaleString()}</span> = {Math.round(tradeLog.postSwapY).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>X_new (Reserves):</span>
                                                <span>k / Y_new = {Math.round(tradeLog.postSwapX).toLocaleString()}</span>
                                            </div>
                                            <div className="pt-2 mt-2 border-t border-zinc-800 flex justify-between font-bold text-emerald-400">
                                                <span>Reserves Extracted (Rs):</span>
                                                <span>{Math.round(tradeLog.preSwapX).toLocaleString()} - {Math.round(tradeLog.postSwapX).toLocaleString()} = {Math.round(tradeLog.reservesAcquired || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between text-zinc-400 border-t border-zinc-800/50 pt-2">
                                        <span>Protocol Rule:</span>
                                        <span>Burn {Math.round(tradeLog.reservesAcquired || 0)} Rs + {Math.round(tradeLog.redeemFiat || 0)} F</span>
                                    </div>
                                </div>
                            </StepRow>

                            {/* Step 4: Output */}
                            <StepRow
                                step="04"
                                title="Final Settlement"
                                summary={`${Math.round(tradeLog.totalOutputUSD || 0).toLocaleString()} USDV`}
                                icon={CheckCircle2}
                                isOpenDefault={true}
                            >
                                <div className="pt-2 space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-zinc-500 uppercase">Received (Net)</span>
                                        <span className="text-2xl font-bold text-white">{Math.round(tradeLog.totalOutputUSD || 0).toLocaleString()} USDV</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-zinc-500">
                                        <span>Fee Deducted:</span>
                                        <span className="text-zinc-400">${tradeLog.feeUSD?.toFixed(2)}</span>
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        Exit Rate: <span className="text-amber-400">{tradeLog.effectiveRate.toFixed(2)}</span>
                                    </div>
                                </div>
                            </StepRow>

                            {/* Step 5: Global Update */}
                            <StepRow
                                step="05"
                                title="System State Update"
                                summary={`Su: ${Math.round(tradeLog.postSu || tradeLog.postSwapX).toLocaleString()}`}
                                icon={Activity}
                                isOpenDefault={false}
                            >
                                <div className="space-y-4 text-xs">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-zinc-900/30 p-2 rounded">
                                            <p className="text-[10px] text-zinc-500 mb-1 uppercase">Collateral (Su)</p>
                                            <div className="text-zinc-300 font-mono text-[10px]">
                                                {Math.round(tradeLog.preSu || 0).toLocaleString()} &rarr; <span className="text-indigo-400 font-bold">{Math.round(tradeLog.postSu || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="bg-zinc-900/30 p-2 rounded">
                                            <p className="text-[10px] text-zinc-500 mb-1 uppercase">Reserves (Sr)</p>
                                            <div className="text-zinc-300 font-mono text-[10px]">
                                                {Math.round(tradeLog.preSwapX).toLocaleString()} &rarr; <span className="text-emerald-400 font-bold">{Math.round(tradeLog.postSwapX).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="bg-zinc-900/30 p-2 rounded">
                                            <p className="text-[10px] text-zinc-500 mb-1 uppercase">Fiat Supply (Sf)</p>
                                            <div className="text-zinc-300 font-mono text-[10px]">
                                                {Math.round(tradeLog.preSf || 0).toLocaleString()} &rarr; <span className="text-white font-bold">{Math.round(tradeLog.postSf || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="bg-zinc-900/30 p-2 rounded">
                                            <p className="text-[10px] text-zinc-500 mb-1 uppercase">Pool Fiat (Y)</p>
                                            <div className="text-zinc-300 font-mono text-[10px]">
                                                {Math.round(tradeLog.preSwapY).toLocaleString()} &rarr; <span className="text-zinc-400 font-bold">{Math.round(tradeLog.postSwapY).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="bg-zinc-900/30 p-2 rounded">
                                            <p className="text-[10px] text-zinc-500 mb-1 uppercase">User Wallet (Wf)</p>
                                            <div className="text-zinc-300 font-mono text-[10px]">
                                                {Math.round(tradeLog.preWf || 0).toLocaleString()} &rarr; <span className="text-blue-400 font-bold">{Math.round(tradeLog.postWf || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="bg-zinc-900/30 p-2 rounded">
                                            <p className="text-[10px] text-zinc-500 mb-1 uppercase">LP Excess (Zf)</p>
                                            <div className="text-zinc-300 font-mono text-[10px]">
                                                {Math.round(tradeLog.preZf || 0).toLocaleString()} &rarr; <span className="text-amber-400 font-bold">{Math.round(tradeLog.postZf || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-2 pt-2 border-t border-zinc-800/50">
                                        <div className="text-[10px] text-zinc-500 font-mono mb-2 uppercase tracking-wider">Protocol Health State</div>
                                        <div className="grid grid-cols-5 gap-2 text-[10px] font-mono text-zinc-400 text-center">
                                            <div className="bg-black/20 p-1 rounded border border-zinc-800">
                                                <div className="text-zinc-600 mb-0.5">Or</div>
                                                <div className="text-white">{(tradeLog.oraclePrice || 0).toFixed(2)}</div>
                                            </div>
                                            <div className="bg-black/20 p-1 rounded border border-zinc-800">
                                                <div className="text-zinc-600 mb-0.5">Pr</div>
                                                <div className="text-white">{(tradeLog.Pr || 0).toFixed(2)}</div>
                                            </div>
                                            <div className="bg-black/20 p-1 rounded border border-zinc-800">
                                                <div className="text-zinc-600 mb-0.5">Φ (Phi)</div>
                                                <div className={((tradeLog.Phi || 1) < 1) ? "text-amber-400" : "text-emerald-400"}>{(tradeLog.Phi || 0).toFixed(4)}</div>
                                            </div>
                                            <div className="bg-black/20 p-1 rounded border border-zinc-800">
                                                <div className="text-zinc-600 mb-0.5">Ω (Omega)</div>
                                                <div className="text-white">{(tradeLog.Omega || 0).toFixed(4)}</div>
                                            </div>
                                            <div className="bg-black/20 p-1 rounded border border-zinc-800">
                                                <div className="text-zinc-600 mb-0.5">λ (Lambda)</div>
                                                <div className="text-white">{(tradeLog.lambda || 1).toFixed(4)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </StepRow>

                            {/* Step 6: Valuation Update (Contraction) */}
                            <StepRow
                                step="06"
                                title="Appraised Value (LP)"
                                summary={(() => {
                                    const diff = (tradeLog.postLpTotalValue || 0) - (tradeLog.preLpTotalValue || 0);
                                    const sign = diff >= 0 ? "+" : "";
                                    return `$${Math.round(tradeLog.postLpTotalValue || 0).toLocaleString()} (${sign}$${Math.round(diff).toLocaleString()})`;
                                })()}
                                icon={DollarSign}
                                isOpenDefault={false}
                            >
                                <div className="p-3 bg-zinc-900/30 rounded border border-zinc-800/50">
                                    <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-2">
                                        <span>Total Valuation (NAV)</span>
                                        <span className={((tradeLog.postLpTotalValue || 0) - (tradeLog.preLpTotalValue || 0) >= 0) ? "text-emerald-400" : "text-red-400"}>
                                            {(tradeLog.postLpTotalValue || 0) > (tradeLog.preLpTotalValue || 0) ? "Increased" : "Decreased"}
                                        </span>
                                    </div>
                                    <div className="text-sm font-mono text-zinc-300 flex justify-between items-center">
                                        <span>${Math.round(tradeLog.preLpTotalValue || 0).toLocaleString()}</span>
                                        <ArrowRight className="w-3 h-3 text-zinc-600" />
                                        <span className="text-white font-bold">${Math.round(tradeLog.postLpTotalValue || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-zinc-800/50 text-[10px] text-zinc-500 font-mono flex flex-col gap-1">
                                        <div>= Buffer (${Math.round(tradeLog.valExcessClaims || 0).toLocaleString()}) + Pool (${Math.round(tradeLog.valPool || 0).toLocaleString()}) + Holdings (${Math.round(tradeLog.valLpHoldings || 0).toLocaleString()})</div>
                                        <div className="text-zinc-600 pl-2 opacity-70">
                                            [+ Fees: ${Math.round((tradeLog.postLpTotalValue || 0) - ((tradeLog.valExcessClaims || 0) + (tradeLog.valPool || 0) + (tradeLog.valLpHoldings || 0))).toLocaleString()}]
                                        </div>
                                    </div>
                                </div>
                            </StepRow>
                        </>
                    )}

                </div>
            )}

        </div>
    );
}

// Collapsible Row Component (Unchanged)
function StepRow({ step, title, summary, children, icon: Icon, isOpenDefault = false }: any) {
    const [isOpen, setIsOpen] = useState(isOpenDefault);

    return (
        <div className="group">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full px-6 py-4 flex items-center justify-between transition-all hover:bg-zinc-900/30",
                    isOpen ? "bg-zinc-900/20" : ""
                )}
            >
                <div className="flex items-center gap-4">
                    <span className="font-mono text-zinc-600 text-xs font-bold">{step}</span>
                    <div className="flex items-center gap-3">
                        <div className={cn("p-1.5 rounded transition-colors", isOpen ? "bg-zinc-800 text-white" : "bg-zinc-900 text-zinc-500 group-hover:text-zinc-300")}>
                            <Icon className="w-4 h-4" />
                        </div>
                        <span className={cn("font-medium transition-colors", isOpen ? "text-emerald-400" : "text-zinc-300")}>
                            {title}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {!isOpen && (
                        <span className="text-zinc-500 font-mono text-xs hidden sm:block">
                            {summary}
                        </span>
                    )}
                    {isOpen ? <ChevronDown className="w-4 h-4 text-zinc-600" /> : <ChevronRight className="w-4 h-4 text-zinc-700" />}
                </div>
            </button>

            {isOpen && (
                <div className="px-6 pb-6 pt-2 pl-16 animate-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    )
}
