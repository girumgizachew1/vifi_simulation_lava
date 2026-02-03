import { SimulationStep } from '@/lib/vifi-amm';
import React from 'react';

interface FarmReserveBannerProps {
    finalState: SimulationStep | undefined;
    initialLiquidityUSD: number;
}

export function FarmReserveBanner({ finalState, initialLiquidityUSD }: FarmReserveBannerProps) {
    // LP gets ~90% of total liquidity (10% goes to initial user allocation)
    const lpInitialValue = initialLiquidityUSD * 0.9;

    const totalVal = finalState?.lpTotalValue ?? finalState?.lpValuation ?? lpInitialValue;
    const assetsVal = finalState?.lpAssetsValue ?? totalVal; // Fallback if not tracked
    const feesVal = finalState?.feesCollected ?? 0;

    return (
        <div className="lg:col-span-12 bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between">
            <div>
                <h2 className="text-lg font-medium text-white">LP Total Valuation</h2>
                <div className="text-sm text-zinc-500 mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-zinc-400">Assets Breakdown:</span>
                        <span className="text-zinc-300 font-mono">${assetsVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="text-xs text-zinc-600 font-mono pl-4">
                        = Buffer (${(finalState?.valExcessClaims || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })})
                        + Pool (${(finalState?.valPool || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })})
                        <span className="text-zinc-600 ml-1 opacity-70">
                            [{(() => {
                                if (!finalState) return '';
                                // Derive components
                                const Tr = finalState.ammPrice;
                                const Or = finalState.oraclePrice;
                                const Ar = Tr - Or;
                                const valYf = finalState.reserveFiat / Tr;
                                const valXr = (finalState.reserveUSD * Ar) / Tr;
                                return `F:$${Math.round(valYf / 1000)}k/R:$${Math.round(valXr / 1000)}k`;
                            })()}]
                        </span>
                        + Holdings (${(finalState?.valLpHoldings || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })})
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/50">
                        <span className="text-zinc-400">Accumulated Fees:</span>
                        <span className="text-amber-400 font-mono">${feesVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-end">
                <div className="text-4xl font-mono text-emerald-400 tracking-tight">
                    ${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {finalState && (() => {
                    const profit = totalVal - lpInitialValue;
                    const roi = profit / lpInitialValue;
                    const duration = finalState.day || 1;
                    const annualizationFactor = 365 / duration;
                    const apy = roi * annualizationFactor;

                    const safeVal = totalVal - (finalState.valExcessClaims || 0);
                    const safeProfit = safeVal - lpInitialValue;
                    const safeRoi = safeProfit / lpInitialValue;
                    const safeApy = safeRoi * annualizationFactor;

                    return (
                        <>
                            <div className={`text-sm font-mono mt-1 px-2 py-0.5 rounded ${profit >= 0 ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10"
                                }`}>
                                {profit >= 0 ? "+" : ""}${profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                <span className="text-xs ml-2 opacity-70">
                                    ({profit >= 0 ? "+" : ""}{(roi * 100).toFixed(2)}%)
                                </span>
                                <span className="text-xs ml-2 opacity-70">
                                    (APY: {(apy * 100).toFixed(2)}%)
                                </span>
                            </div>
                            <div className="text-xs font-mono mt-1 px-2 py-0.5 rounded text-amber-400 bg-amber-400/10">
                                <span className="opacity-70">Excl. Buffer:</span>
                                <span className="ml-2">
                                    ${safeVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                                <span className="ml-2 opacity-70">
                                    (APY: {(safeApy * 100).toFixed(2)}%)
                                </span>
                            </div>
                        </>
                    );
                })()}
            </div>
        </div>
    );
}

