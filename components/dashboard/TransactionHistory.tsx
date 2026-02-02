
"use client";

import React, { useState, useEffect } from 'react';
import { TradeLog } from '@/lib/vifi-amm';
import { TradeTerminal } from './TradeTerminal';
import { ChevronRight, ChevronDown, ArrowRight, ChevronLeft } from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface TransactionHistoryProps {
    logs: (TradeLog & { day: number })[];
}

export function TransactionHistory({ logs }: TransactionHistoryProps) {
    const [page, setPage] = useState(0);
    const pageSize = 50;

    // Reset page when logs change
    useEffect(() => {
        setPage(0);
    }, [logs]);

    if (logs.length === 0) return null;

    const totalPages = Math.ceil(logs.length / pageSize);
    const visibleLogs = logs.slice(page * pageSize, (page + 1) * pageSize);

    return (
        <div className="space-y-4">
            <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider flex items-center justify-between">
                <span>Transaction History</span>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">{logs.length} Total Tx</span>
                    <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">Page {page + 1} / {totalPages}</span>
                </div>
            </h3>

            <div className="bg-zinc-900/20 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800/50">
                {visibleLogs.map((log, i) => (
                    <TransactionRow key={i} log={log} index={(page * pageSize) + i} />
                ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 py-2">
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="p-2 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <ChevronLeft className="w-4 h-4 text-zinc-400" />
                    </button>
                    <span className="text-xs text-zinc-500 font-mono">
                        {page + 1} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="p-2 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </button>
                </div>
            )}
        </div>
    );
}

function TransactionRow({ log, index }: { log: TradeLog & { day: number }, index: number }) {
    const [expanded, setExpanded] = useState(false);

    // Auto-expand first item if it's the only one? No, keep consistent.

    const isExpansion = log.type === 'EXPANSION';
    const colorClass = isExpansion ? "text-emerald-500" : "text-amber-500";
    const bgClass = isExpansion ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20";
    const badgeText = isExpansion ? "EXPANSION" : "CONTRACTION";
    const borderColor = isExpansion ? "border-l-emerald-500" : "border-l-amber-500";

    // Summary Helpers
    const inputStr = isExpansion
        ? `${Math.round(log.inputUSD || 0).toLocaleString()} USDV`
        : `${Math.round(log.inputFiat || 0).toLocaleString()} F`;

    const outputStr = isExpansion
        ? `${Math.round(log.totalOutput || 0).toLocaleString()} F`
        : `${Math.round(log.totalOutputUSD || 0).toLocaleString()} USDV`;

    return (
        <div className={cn("group bg-black/50 hover:bg-zinc-900 transition-colors border-l-2", borderColor)}>
            {/* Summary Row */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-4 py-3 flex items-center gap-4 text-sm font-mono"
            >
                <div className="flex items-center gap-3 w-16 text-zinc-600 text-xs">
                    {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span>#{index + 1}</span>
                </div>

                <div className={cn("px-2 py-1 rounded text-[10px] font-bold border w-28 text-center", colorClass, bgClass)}>
                    {badgeText}
                </div>

                <div className="flex-1 flex items-center justify-between px-4">
                    <div className="flex items-center gap-3 text-zinc-300 min-w-[200px]">
                        <span className="text-zinc-400 text-xs uppercase w-12 text-right">In:</span>
                        <span>{inputStr}</span>
                    </div>

                    <ArrowRight className="w-3 h-3 text-zinc-600 hidden md:block" />

                    <div className="flex items-center gap-3 text-zinc-300 min-w-[200px] justify-end">
                        <span className="text-zinc-400 text-xs uppercase w-12 text-right">Out:</span>
                        <span className="font-bold text-white">{outputStr}</span>
                    </div>

                    <div className="hidden lg:flex items-center gap-4 text-xs text-zinc-500 ml-8 border-l border-zinc-800 pl-8">
                        <span>Rate: <span className={colorClass}>{log.effectiveRate.toFixed(2)}</span></span>
                        <span>Fee: <span className="text-zinc-400">${log.feeUSD?.toFixed(2)}</span></span>
                        <span>Day {log.day}</span>
                    </div>
                </div>
            </button>

            {/* Expanded Detail */}
            {expanded && (
                <div className="px-4 pb-4 border-t border-zinc-800/50 bg-zinc-950/30">
                    <TradeTerminal tradeLog={log} />
                </div>
            )}
        </div>
    )
}
