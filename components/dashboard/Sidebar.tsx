import React from 'react';
import { Play, RotateCcw, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSimulationStore } from '@/lib/store';

export function Sidebar() {
    const {
        vfe, setVfe,
        params, setParams,
        startYear, setStartYear,
        run: handleRun,
        reset: handleReset,
        isRunning,
        loadingData,
        history
    } = useSimulationStore();

    // Calculate Initial Price for Preview
    const targetDate = `${startYear}-01-01`;
    const sIdx = history.findIndex(p => p.date >= targetDate);
    const initialOraclePrice = (sIdx !== -1 && history[sIdx]) ? history[sIdx].price : undefined;

    return (
        <aside className="lg:col-span-3 space-y-6">
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 space-y-6">

                {/* VFE Selector */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-indigo-400" /> Active VFE Environment
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {['NGNv', 'KESv', 'ETBv'].map((c) => (
                            <button
                                key={c}
                                onClick={() => setVfe(c as any)}
                                className={cn(
                                    "px-3 py-2 rounded-lg text-xs font-bold transition-all",
                                    vfe === c
                                        ? "bg-white text-black shadow-lg"
                                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                )}
                            >
                                {c}
                            </button>
                        ))}

                    </div>
                </div>

                {/* Parameter: Initial Premium */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                    <label className="text-sm font-medium text-zinc-300 flex justify-between">
                        <span>Initial Premium</span>
                        <span className="text-emerald-400 font-mono">{(params.initialPremium * 100).toFixed(0)}%</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="50"
                        step="1"
                        value={params.initialPremium * 100}
                        onChange={(e) => setParams({ initialPremium: parseInt(e.target.value) / 100 })}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />

                    {/* Start Year Buttons */}
                    <div className="grid grid-cols-4 gap-1.5 mt-3">
                        {[2019, 2020, 2021, 2022, 2023, 2024, 2025].map((year) => (
                            <button
                                key={year}
                                onClick={() => setStartYear(year)}
                                className={cn(
                                    "py-1.5 rounded text-[10px] font-bold transition-all border border-transparent",
                                    startYear === year
                                        ? "bg-white text-black border-white/50 shadow-sm"
                                        : "bg-zinc-900 border-white/5 text-zinc-400 hover:bg-zinc-800"
                                )}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Market Overview / System Init (Minimalist) */}
                {initialOraclePrice !== undefined && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-4">

                        {/* Header: Rate */}
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-medium mb-1">Total Rate</div>
                                <div className="text-2xl font-light text-white tracking-tight">
                                    {(initialOraclePrice * (1 + params.initialPremium)).toFixed(2)}
                                </div>
                            </div>
                            <div className="text-right space-y-0.5">
                                <div className="text-[9px] font-mono text-zinc-600">
                                    OR: <span className="text-zinc-500">{initialOraclePrice.toFixed(0)}</span>
                                </div>
                                <div className="text-[9px] font-mono text-zinc-600">
                                    AR: <span className="text-zinc-500">+{(initialOraclePrice * params.initialPremium).toFixed(0)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-white/5" />

                        {/* List Breakdown */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-500">Total Reserves (USD)</span>
                                <span className="font-mono text-zinc-300">${(params.initialLiquidityUSD / 1_000_000).toFixed(1)}M</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-500">Pool Reserves (Xr)</span>
                                <span className="font-mono text-emerald-400">
                                    {(params.initialLiquidityUSD / 1_000_000).toFixed(1)}M
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-500">Total Fiat (Sf)</span>
                                <span className="font-mono text-zinc-300">
                                    {(Math.round(params.initialLiquidityUSD * initialOraclePrice) / 1_000_000).toFixed(1)}M
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-500">Pool Fiat (Yf)</span>
                                <span className="font-mono text-zinc-300">
                                    {(Math.round(params.initialLiquidityUSD * (initialOraclePrice * params.initialPremium)) / 1_000_000).toFixed(1)}M
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-500">Circulation (Zf)</span>
                                <span className="font-mono text-zinc-300">
                                    {(Math.round((params.initialLiquidityUSD * initialOraclePrice) - (params.initialLiquidityUSD * (initialOraclePrice * params.initialPremium))) / 1_000_000).toFixed(1)}M
                                </span>
                            </div>
                        </div>

                        {/* Footer: k */}
                        <div className="pt-2">
                            <div className="text-[9px] font-mono text-zinc-700 text-right">
                                k = {(params.initialLiquidityUSD * (params.initialLiquidityUSD * (initialOraclePrice * params.initialPremium))).toExponential(2)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Parameter: Trade Bias */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                    <label className="text-sm font-medium text-zinc-300 flex justify-between">
                        <span>Market Bias</span>
                        <span className="text-indigo-400 font-mono">{(params.tradeProbForward * 100).toFixed(0)}%</span>
                    </label>
                    <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                        <span>Expansion (Buy Fiat)</span>
                        <span>Contraction (Buy USD)</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={params.tradeProbForward * 100}
                        onChange={(e) => setParams({ tradeProbForward: parseInt(e.target.value) / 100 })}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <p className="text-xs text-zinc-500 italic">
                        {params.tradeProbForward <= 0.4
                            ? "⚠ Realistic: High demand for USD"
                            : "✨ Fantasy: High demand for Fiat"}
                    </p>
                </div>

                {/* Parameter: Trades Per Day */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                    <label className="text-sm font-medium text-zinc-300 flex justify-between">
                        <span>Trades / Day</span>
                        <span className="text-blue-400 font-mono">{params.tradesPerDay}</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={params.tradesPerDay}
                        onChange={(e) => setParams({ tradesPerDay: parseInt(e.target.value) })}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <p className="text-[10px] text-zinc-600">Simulate daily volume (0-100 tx)</p>
                </div>

                {/* Parameter: Fee Rate */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                    <label className="text-sm font-medium text-zinc-300">Trading Fee (γ)</label>
                    <div className="grid grid-cols-2 gap-2">
                        {[0.0005, 0.001].map((f) => (
                            <button
                                key={f}
                                onClick={() => setParams({ feeRate: f })}
                                className={cn(
                                    "px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                                    params.feeRate === f
                                        ? "bg-amber-500/10 border-amber-500/50 text-amber-400"
                                        : "bg-zinc-800 border-transparent text-zinc-400"
                                )}
                            >
                                {(f * 100).toFixed(2)}%
                            </button>
                        ))}
                    </div>
                </div>





                {/* Action Buttons */}
                <div className="pt-6">
                    <button
                        onClick={handleRun}
                        disabled={isRunning || loadingData}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-medium text-sm tracking-wide uppercase transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/20"
                    >
                        {isRunning ? (
                            <span className="animate-pulse">Simulating...</span>
                        ) : (
                            <>
                                <Play className="w-4 h-4 fill-current" /> Run Simulation
                            </>
                        )}
                    </button>
                </div>

            </div>
        </aside>
    );
}
