import React from 'react';
import { Play, RotateCcw, Globe, RefreshCw, FlaskConical, BarChart3, Settings2, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSimulationStore } from '@/lib/store';

export function Sidebar() {
    const {
        vfe, setVfe,
        params, setParams,
        startYear, setStartYear,
        run: handleRun,
        runBatch,
        initialize,
        reset: handleReset,
        isInitialized,
        isRunning,
        isBatchRunning,
        batchProgress,
        loadingData,
        history
    } = useSimulationStore();

    // Calculate Initial Price for Preview (Only used if Initialized)
    const targetDate = `${startYear}-01-01`;
    const sIdx = history.findIndex(p => p.date >= targetDate);
    const initialOraclePrice = (sIdx !== -1 && history[sIdx]) ? history[sIdx].price : undefined;

    return (
        <aside className="lg:col-span-3 space-y-6">
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 space-y-6">

                {/* 1. Environment Config */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm font-bold text-zinc-200">Environment Setup</span>
                    </div>

                    {/* VFE Selector */}
                    <div className="bg-zinc-950 p-1 rounded-lg grid grid-cols-3 gap-1">
                        {['NGNv', 'KESv', 'ETBv'].map((c) => (
                            <button
                                key={c}
                                onClick={() => setVfe(c as any)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                                    vfe === c
                                        ? "bg-zinc-800 text-white shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                {c}
                            </button>
                        ))}
                    </div>

                    {/* Initial Premium */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-zinc-400">
                            <span>Initial Premium</span>
                            <span className="text-emerald-400 font-mono">{(params.initialPremium * 100).toFixed(0)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="50"
                            step="1"
                            value={params.initialPremium * 100}
                            onChange={(e) => setParams({ initialPremium: parseInt(e.target.value) / 100 })}
                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                    </div>

                    {/* Year Selector */}
                    <div className="grid grid-cols-4 gap-1.5">
                        {[2019, 2020, 2021, 2022, 2023, 2024, 2025].map((year) => (
                            <button
                                key={year}
                                onClick={() => setStartYear(year)}
                                className={cn(
                                    "py-1 rounded text-[10px] font-bold transition-all border border-transparent",
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

                {/* 2. Initialize Button */}
                <div className="pt-2">
                    <button
                        onClick={initialize}
                        disabled={loadingData || history.length === 0 || isInitialized}
                        className={cn(
                            "w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2",
                            isInitialized
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default"
                                : "bg-zinc-100 hover:bg-white text-black shadow-lg shadow-white/10 active:scale-95",
                            (loadingData || history.length === 0) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isInitialized ? (
                            <>
                                <Power className="w-4 h-4" /> Ready to Run
                            </>
                        ) : (
                            <>
                                <RefreshCw className={cn("w-4 h-4", loadingData ? "animate-spin" : "")} />
                                {loadingData ? "Loading Data..." : "Initialize Environment"}
                            </>
                        )}
                    </button>
                </div>

                {/* 3. Market Overview (Only if Initialized) */}
                {isInitialized && initialOraclePrice !== undefined && (
                    <div className="bg-zinc-900/80 rounded-lg p-3 border border-white/5 space-y-2 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase tracking-wider">
                            <span>Initial Rate ({params.currency})</span>
                            <span className="font-mono text-white text-sm">{(initialOraclePrice * (1 + params.initialPremium)).toFixed(1)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="bg-white/5 p-1.5 rounded">
                                <div className="text-zinc-500">Pool (Fiat)</div>
                                <div className="font-mono text-zinc-300">
                                    ${(Math.round(params.initialLiquidityUSD * (initialOraclePrice * params.initialPremium)) / 1_000_000).toFixed(1)}M
                                </div>
                            </div>
                            <div className="bg-white/5 p-1.5 rounded">
                                <div className="text-zinc-500">Reserves (USD)</div>
                                <div className="font-mono text-zinc-300">
                                    ${(params.initialLiquidityUSD / 1_000_000).toFixed(1)}M
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="border-t border-white/5 my-2" />

                {/* 4. Batch Analysis Section */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-bold text-zinc-200">Batch Analysis</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        <button
                            onClick={() => runBatch('full')}
                            disabled={!isInitialized || isBatchRunning || isRunning}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-lg text-xs font-medium border border-white/5 transition-all active:scale-95 disabled:opacity-50 flex justify-between px-4 items-center"
                        >
                            <span>Best Case (Full Sweep)</span>
                            {isBatchRunning && <span className="text-[10px] text-zinc-500">{batchProgress.toFixed(0)}%</span>}
                        </button>

                        <button
                            onClick={() => runBatch('conservative')}
                            disabled={!isInitialized || isBatchRunning || isRunning}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-lg text-xs font-medium border border-white/5 transition-all active:scale-95 disabled:opacity-50 flex justify-between px-4 items-center"
                        >
                            <span>Average Case (20/40% Only)</span>
                        </button>
                    </div>
                </div>

                <div className="border-t border-white/5 my-2" />

                {/* 5. Single Simulation Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-bold text-zinc-200">Single Simulation</span>
                    </div>

                    {/* Parameter: Trade Bias */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-zinc-400">
                            <span>Market Bias</span>
                            <span className="text-indigo-400 font-mono">{(params.tradeProbForward * 100).toFixed(0)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={params.tradeProbForward * 100}
                            onChange={(e) => setParams({ tradeProbForward: parseInt(e.target.value) / 100 })}
                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>

                    {/* Parameter: Trades Per Day */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-zinc-400">
                            <span>Trades / Day</span>
                            <span className="text-blue-400 font-mono">{params.tradesPerDay}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={params.tradesPerDay}
                            onChange={(e) => setParams({ tradesPerDay: parseInt(e.target.value) })}
                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>

                    {/* Parameter: Fee Rate */}
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-400">Fee Rate</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[0.0005, 0.001].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setParams({ feeRate: f })}
                                    className={cn(
                                        "px-2 py-1.5 rounded text-[10px] font-medium border transition-colors",
                                        params.feeRate === f
                                            ? "bg-amber-500/10 border-amber-500/50 text-amber-400"
                                            : "bg-zinc-800 border-transparent text-zinc-500"
                                    )}
                                >
                                    {(f * 100).toFixed(2)}%
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleRun}
                        disabled={!isInitialized || isRunning || isBatchRunning}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wide transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                    >
                        {isRunning ? "Simulating..." : (
                            <>
                                <Play className="w-3 h-3 fill-current" /> Run Single
                            </>
                        )}
                    </button>

                </div>

            </div>
        </aside>
    );
}
