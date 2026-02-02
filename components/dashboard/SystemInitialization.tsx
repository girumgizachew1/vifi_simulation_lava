import React from 'react';
import { Activity } from 'lucide-react';
import { SimulationParams } from '@/lib/vifi-amm';

type PriceRecord = { date: string; price: number };

interface SystemInitializationProps {
    history: PriceRecord[];
    startYear: number;
    params: SimulationParams;
}

export function SystemInitialization({ history, startYear, params }: SystemInitializationProps) {
    if (history.length === 0) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-medium text-white mb-6">System Initialization (Day 0)</h3>
                <div className="flex items-center justify-center h-24">
                    <span className="text-zinc-500 text-sm">Loading Data...</span>
                </div>
            </div>
        );
    }

    // Calculate Init Values
    const targetDate = `${startYear}-01-01`;
    let sIdx = history.findIndex(p => p.date >= targetDate);
    if (sIdx === -1) sIdx = 0;
    const startPrice = history[sIdx]?.price || 0;
    const startOracleDate = history[sIdx]?.date;

    const Sr = params.initialLiquidityUSD;
    const Sf = Sr * startPrice;

    const premiumRate = startPrice * params.initialPremium;
    const Yf = Sr * premiumRate; // Fiat in Pool
    const Zf = Sf - Yf; // Fiat in Wallet

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-medium text-white mb-6">System Initialization (Day 0)</h3>

            <div className="space-y-6">
                {/* 1. Rates */}
                <div className="grid grid-cols-3 gap-4 border-b border-zinc-800 pb-6">
                    <div>
                        <div className="text-xs text-zinc-500 uppercase tracking-wider">Oracle Rate (OR)</div>
                        <div className="text-2xl font-mono text-white mt-1">{startPrice.toFixed(2)}</div>
                        <div className="text-[10px] text-zinc-600">{startOracleDate}</div>
                    </div>
                    <div>
                        <div className="text-xs text-zinc-500 uppercase tracking-wider">AMM Rate (AR)</div>
                        <div className="text-2xl font-mono text-indigo-400 mt-1">+{premiumRate.toFixed(2)}</div>
                        <div className="text-[10px] text-zinc-600">Premium</div>
                    </div>
                    <div>
                        <div className="text-xs text-zinc-500 uppercase tracking-wider">Total Rate (TR)</div>
                        <div className="text-2xl font-mono text-emerald-400 mt-1">{(startPrice + premiumRate).toFixed(2)}</div>
                        <div className="text-[10px] text-zinc-600">OR + AR</div>
                    </div>
                </div>

                {/* 2. Supply & AMM State */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                    <div>
                        <div className="text-xs text-zinc-500 mb-1">System Reserves (Sr)</div>
                        <div className="text-lg font-mono text-white">${Sr.toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-xs text-zinc-500 mb-1">Pool Fiat (Yf)</div>
                        <div className="text-lg font-mono text-amber-500">{Math.round(Yf).toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-xs text-zinc-500 mb-1">User Fiat (10%)</div>
                        <div className="text-lg font-mono text-blue-400">{Math.round((Sr * 0.10) * startPrice).toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-xs text-zinc-500 mb-1">Treasury (90% - Yf)</div>
                        <div className="text-lg font-mono text-purple-400">{Math.round(Sf - Yf - ((Sr * 0.10) * startPrice)).toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-xs text-zinc-500 mb-1">Invariant (k)</div>
                        <div className="text-lg font-mono text-zinc-400">{(Sr * Yf).toExponential(2)}</div>
                    </div>
                </div>

                {/* 4. VP-AMM Mechanics */}
                <div className="col-span-full bg-indigo-500/5 rounded-xl p-5 border border-indigo-500/10 mt-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">VP-AMM Internal State</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Reserve Balance (Xr)</span>
                            <div className="text-2xl font-mono text-emerald-400 font-bold">${Sr.toLocaleString()}</div>
                            <p className="text-[10px] text-zinc-600 mt-1">100% of System Reserves</p>
                        </div>
                        <div>
                            <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Fiat Balance (Yf)</span>
                            <div className="text-2xl font-mono text-amber-500 font-bold">{Math.round(Yf).toLocaleString()}</div>
                            <p className="text-[10px] text-zinc-600 mt-1">Premium Liquidity Only</p>
                        </div>
                        <div>
                            <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Invariant (k = Xr · Yf)</span>
                            <div className="text-2xl font-mono text-white font-bold opacity-80">{(Sr * Yf).toExponential(2)}</div>
                            <p className="text-[10px] text-zinc-600 mt-1">Constant Product</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
