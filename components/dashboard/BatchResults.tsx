import React, { useState } from 'react';
import { BatchScenarioResult, TrialResult } from '@/lib/batch-runner';
import { cn } from '@/lib/utils';
import {
    ArrowUpRight, TrendingUp, Activity, BarChart3, AlertCircle,
    Calendar, Coins, ChevronRight, ChevronDown,
    Layers, ArrowLeftRight, DollarSign, History, SigmaSquare
} from 'lucide-react';

interface BatchResultsProps {
    results: BatchScenarioResult[];
    onClose: () => void;
    currency: string;
    startYear: number;
}

export function BatchResults({ results, onClose, currency, startYear }: BatchResultsProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    if (results.length === 0) return null;

    // Helper to format percentage
    const fmt = (n: number) => `${n.toFixed(2)}%`;
    // Helper to format USD
    const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
    const compactUsd = (n: number) => `$${(n / 1000).toFixed(0)}k`;

    const toggleRow = (id: string) => {
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedIds(newSet);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header / Summary Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <BarChart3 className="w-24 h-24 text-indigo-500" />
                </div>

                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-xl font-bold text-white">Monte Carlo Analysis Results</h2>
                            <div className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400 flex items-center gap-2 border border-zinc-700">
                                <Coins className="w-3 h-3 text-emerald-400" /> {currency}
                                <span className="text-zinc-600">|</span>
                                <Calendar className="w-3 h-3 text-blue-400" /> {startYear}
                            </div>
                        </div>
                        <p className="text-zinc-400 text-sm">Run complete: {results.length} scenarios × {results[0].trials} trials = {results.length * results[0].trials} total simulations.</p>
                    </div>
                    <button onClick={onClose} className="text-xs text-zinc-500 hover:text-white underline">Clear Results</button>
                </div>

                {/* Percentile Table */}
                {(results.some(r => r.trialsData && r.trialsData.length > 0)) && (
                    <div className="mt-8 border-t border-zinc-800 pt-6">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-zinc-500" />
                            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">APY Distribution (Percentiles)</h3>
                        </div>

                        <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-zinc-900/50 text-xs font-bold text-zinc-500 uppercase border-b border-zinc-800">
                                    <tr>
                                        <th className="px-6 py-3 w-32 border-r border-zinc-800 bg-zinc-900/80 text-center">Percentile</th>
                                        <th className="px-6 py-3">Dependent APY (With Collateral)</th>
                                        <th className="px-6 py-3">Independent APY (Excl Buffer)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-zinc-950/20 divide-y divide-zinc-800/50">
                                    {(() => {
                                        const allAPY = results.flatMap(r => r.trialsData || []).map(t => t.apy).sort((a, b) => a - b);
                                        const allAPYExcl = results.flatMap(r => r.trialsData || []).map(t => t.apyExclBuffer).sort((a, b) => a - b);

                                        const getP = (arr: number[], p: number) => {
                                            if (!arr.length) return 0;
                                            const idx = Math.min(Math.floor((p / 100) * (arr.length - 1)), arr.length - 1);
                                            return arr[idx];
                                        };

                                        return [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(p => (
                                            <tr key={p} className="hover:bg-zinc-900/30 transition-colors">
                                                <td className="px-6 py-2 font-mono font-bold text-zinc-500 border-r border-zinc-800 bg-zinc-900/20 text-center">{p}</td>
                                                <td className="px-6 py-2 font-mono text-zinc-300">
                                                    {getP(allAPY, p).toFixed(5)}
                                                </td>
                                                <td className="px-6 py-2 font-mono text-zinc-300">
                                                    {getP(allAPYExcl, p).toFixed(5)}
                                                </td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Detailed Table */}
            <div className="border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-900 text-xs uppercase font-medium text-zinc-500 border-b border-zinc-800 whitespace-nowrap">
                            <tr>
                                <th className="px-4 py-3 w-8"></th>
                                <th className="px-4 py-3">Scenario (Bias/Vol/Fee)</th>
                                <th className="px-4 py-3 text-right">Initial Cap</th>
                                <th className="px-4 py-3 text-right">Final Val (Total) / APY</th>
                                <th className="px-4 py-3 text-right">Final Val (Excl) / APY</th>
                                <th className="px-4 py-3 text-right">Net Flow</th>
                                <th className="px-4 py-3 text-right">Total Flow</th>
                                <th className="px-4 py-3 text-right">Activity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800 bg-zinc-950/50">
                            {results.map((res) => {
                                const isExpanded = expandedIds.has(res.id);

                                // Calculate Averages for the Row
                                const avgTotalVal = res.stats.avgFinalBuffer + res.stats.avgFinalPoolVal + res.stats.avgFinalHoldingsVal + res.stats.avgTotalFees;
                                const avgValExcl = avgTotalVal - res.stats.avgFinalBuffer;
                                const avgProfit = res.stats.avgProfit;

                                return (
                                    <React.Fragment key={res.id}>
                                        <tr
                                            onClick={() => toggleRow(res.id)}
                                            className={cn(
                                                "hover:bg-zinc-900/50 transition-colors cursor-pointer text-xs font-mono",
                                                isExpanded ? "bg-zinc-900" : ""
                                            )}
                                        >
                                            <td className="px-4 py-3 text-zinc-500">
                                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-zinc-300">
                                                <div>
                                                    <span className="text-zinc-500 mr-2">Bias:</span>{(res.params.tradeProbForward * 100).toFixed(0)}%
                                                    <span className="mx-2 text-zinc-700">|</span>
                                                    <span className="text-zinc-500 mr-2">Vol:</span>{res.params.tradesPerDay}
                                                    <span className="mx-2 text-zinc-700">|</span>
                                                    <span className="text-zinc-500 mr-2">Fee:</span>{(res.params.feeRate * 100).toFixed(2)}%
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-zinc-500">{compactUsd(res.stats.avgInitialVal)}</td>

                                            <td className="px-4 py-3 text-right">
                                                <div className={cn(res.stats.avgAPY >= 0 ? "text-emerald-400" : "text-red-400", "font-bold")}>
                                                    {usd(avgTotalVal)}
                                                </div>
                                                <div className={cn("text-[10px]", res.stats.avgAPY >= 0 ? "text-emerald-500/80" : "text-red-500/80")}>
                                                    {fmt(res.stats.avgAPY)}
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 text-right">
                                                <div className={cn(res.stats.avgAPYExclBuffer >= 0 ? "text-emerald-400/90" : "text-red-400/90")}>
                                                    {usd(avgValExcl)}
                                                </div>
                                                <div className={cn("text-[10px]", res.stats.avgAPYExclBuffer >= 0 ? "text-emerald-500/80" : "text-red-500/80")}>
                                                    {fmt(res.stats.avgAPYExclBuffer)}
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 text-right">
                                                <span className={res.stats.avgNetFlow >= 0 ? "text-emerald-500" : "text-red-500"}>
                                                    {res.stats.avgNetFlow > 0 ? "+" : ""}{compactUsd(res.stats.avgNetFlow)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-indigo-400">{compactUsd(res.stats.avgTotalFlow)}</td>
                                            <td className="px-4 py-3 text-right text-zinc-400">{res.stats.avgTxCount.toFixed(0)}</td>
                                        </tr>

                                        {isExpanded && (
                                            <tr className="bg-zinc-900/30">
                                                <td colSpan={8} className="p-4 border-b border-zinc-800">
                                                    <div className="grid grid-cols-4 gap-4 text-xs">
                                                        <div className="space-y-1">
                                                            <div className="text-zinc-500 uppercase text-[10px] font-bold">Buffer (Avg)</div>
                                                            <div className="font-mono text-zinc-300">{usd(res.stats.avgFinalBuffer)}</div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="text-zinc-500 uppercase text-[10px] font-bold">Pool Val (Avg)</div>
                                                            <div className="font-mono text-zinc-300">{usd(res.stats.avgFinalPoolVal)}</div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="text-zinc-500 uppercase text-[10px] font-bold">Holdings (Avg)</div>
                                                            <div className="font-mono text-zinc-300">{usd(res.stats.avgFinalHoldingsVal)}</div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="text-zinc-500 uppercase text-[10px] font-bold">Fees (Avg)</div>
                                                            <div className="font-mono text-amber-400">{usd(res.stats.avgTotalFees)}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
