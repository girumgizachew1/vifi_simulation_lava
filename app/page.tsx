"use client";

import React, { useEffect } from 'react';
import { useSimulationStore } from '@/lib/store';
import { ChevronRight, ArrowRight, TrendingUp, TrendingDown, Activity, DollarSign, CornerDownRight, ArrowLeftRight, Layers, Loader2, FlaskConical } from 'lucide-react';
import { formatCompactNumber, cn } from '@/lib/utils';
import { Header } from '@/components/dashboard/Header';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { TransactionHistory } from '@/components/dashboard/TransactionHistory';
import { BatchResults } from '@/components/dashboard/BatchResults';

export default function SimulationDashboard() {
  const {
    data,
    metrics,
    params,
    loadHistoryData,
    vfe,
    isRunning,
    history,
    startYear,
    // Batch from Store
    batchResults,
    batchRunMetadata,
    isBatchRunning,
    batchProgress,
    clearBatch
  } = useSimulationStore();

  useEffect(() => {
    loadHistoryData();
  }, []);

  const finalState = data.length > 0 ? data[data.length - 1] : undefined;
  const allLogs = data.filter(d => d.tradeLog).map(d => ({ ...d.tradeLog, day: d.day } as any));

  const expansions = allLogs.filter((l: any) => l.type === 'EXPANSION');
  const contractions = allLogs.filter((l: any) => l.type === 'CONTRACTION');

  const expansionVolume = expansions.reduce((a: number, b: any) => a + (b.inputUSD || 0), 0);
  const contractionUSDVolume = contractions.reduce((a: number, b: any) => a + (b.totalOutputUSD || 0), 0);
  const totalVolumeUSD = expansionVolume + contractionUSDVolume;

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans selection:bg-indigo-500/30">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          <Sidebar />
        </div>

        {/* Right Column: Main Content */}
        <section className="lg:col-span-9 space-y-8">

          {/* Loading State */}
          {isRunning || isBatchRunning ? (
            <div className="flex flex-col items-center justify-center h-[500px] border border-white/5 rounded-2xl bg-zinc-900/30 space-y-6 animate-in fade-in duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
                <Loader2 className="w-16 h-16 text-indigo-400 animate-spin relative z-10" />
              </div>
              <div className="space-y-2 text-center">
                <h3 className="text-xl font-medium text-white">
                  {isBatchRunning ? "Running Batch Analysis" : "Simulating Market Dynamics"}
                </h3>
                <p className="text-sm text-zinc-500 font-mono">
                  {isBatchRunning
                    ? `Sweeping parameter space... (${batchProgress.toFixed(0)}%)`
                    : `Processing ${params.numDays} Days of ${vfe} Trading Data...`
                  }
                </p>
              </div>
              {isBatchRunning && (
                <div className="w-64 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${batchProgress}%` }} />
                </div>
              )}
            </div>
          ) : (
            <>
              {/* 1. Batch Results (If Available) */}
              {batchResults.length > 0 && (
                <BatchResults
                  results={batchResults}
                  onClose={clearBatch}
                  currency={batchRunMetadata?.vfe || vfe}
                  startYear={batchRunMetadata?.startYear || startYear}
                />
              )}

              {/* 2. Single Simulation Results (Conditional) */}
              {!batchResults.length && data.length > 0 && finalState && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                  {/* Top Card: LP Valuation */}
                  <LPTotalValuationCard
                    finalState={finalState}
                    metrics={metrics}
                    initialLiquidity={params.initialLiquidityUSD * 0.9}
                  />

                  {/* Metric Cards Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard
                      label="Net Flow (U Supply Change)"
                      value={(() => {
                        const net = expansionVolume - contractionUSDVolume;
                        const sign = net >= 0 ? '+' : '';
                        return `${sign}${formatCompactNumber(net, '$')}`;
                      })()}
                      subValue="Expansion - Contraction"
                      color={(expansionVolume - contractionUSDVolume) >= 0 ? "emerald" : "red"}
                      icon={ArrowLeftRight}
                    />
                    <MetricCard
                      label="Total Flow (Activity)"
                      value={formatCompactNumber(totalVolumeUSD, '$')}
                      subValue="Sum of |Absolute Changes|"
                      color="indigo"
                      icon={Activity}
                    />
                    <MetricCard
                      label="Transaction Activity"
                      value={allLogs.length.toString()}
                      subValue={`Exp: ${expansions.length} | Cont: ${contractions.length}`}
                      color="indigo"
                      icon={Layers}
                    />
                  </div>

                  {/* Transaction History */}
                  <TransactionHistory logs={allLogs} />
                </div>
              )}

              {/* 3. Empty State (Ready) */}
              {!batchResults.length && data.length === 0 && (
                <div className="flex flex-col items-center justify-center h-96 border border-zinc-800 rounded-2xl bg-zinc-900/20">
                  <div className="p-4 bg-zinc-800/50 rounded-full mb-4">
                    <Activity className="w-8 h-8 text-zinc-500" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Ready to Simulate</h3>
                  <p className="text-sm text-zinc-500 max-w-md text-center">
                    Initialize the environment via the sidebar to access simulation controls. Run a Single Simulation or explore strategies with Batch Analysis.
                  </p>
                </div>
              )}

            </>
          )}
        </section>
      </main>
    </div>
  );
}

// Reuse the style from BatchResults but for Single State
function LPTotalValuationCard({ finalState, metrics, initialLiquidity }: any) {
  const buffer = finalState.backingBufferUSD || 0;
  const pool = finalState.valPool || 0;
  const holdings = finalState.valLpHoldings || 0;
  const fees = finalState.feesCollected || 0;

  // Use Explicit Sum
  const totalVal = buffer + pool + holdings + fees;
  const profit = totalVal - initialLiquidity;

  // Formatting
  const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
  const compactUsd = (n: number) => `$${(n / 1000).toFixed(0)}k`;

  // Get Value Breakdown for Pool (Fiat vs Reserve)
  // Logic: reserveFiat amount / totalRate = Value in USD terms? 
  // Wait, Pool consists of Xr (USD) + Yf (Fiat).
  // Value of Xr = Xr (since it's USD).
  // Value of Yf = Yf / MarketPrice ? No, it's valued at Amm Price P?
  // Total Pool Val = Xr + (Yf * Price_USD).
  // finalState.valPool is already in USD.
  // We want to breakdown *components* of that Value.

  // reserveUSD is just USD.
  const valRes = finalState.reserveUSD;
  // valFiat must be the remainder.
  const valFiat = pool - valRes;

  const apy = metrics?.apy ? metrics.apy : 0;

  const profitExcl = profit - buffer;
  const apyExcl = metrics?.apyExclExtra || 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative overflow-hidden">

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-bold text-white mb-4">LP Total Valuation</h2>

          <div className="space-y-2 font-mono text-sm text-zinc-400">
            <div>
              Assets Breakdown: <span className="text-white font-bold">{usd(buffer + pool + holdings)}</span>
            </div>
            <div className="pl-4 text-xs text-zinc-500">
              = Buffer (<span className="text-emerald-400">{usd(buffer)}</span>) +
              Pool (<span className="text-zinc-300">{usd(pool)}</span>)
              <span className="text-zinc-600 ml-1">[F:{compactUsd(valFiat)}/R:{compactUsd(valRes)}]</span> +
              Holdings (<span className="text-zinc-300">{usd(holdings)}</span>)
            </div>
            <div className="pt-2">
              Accumulated Fees: <span className="text-amber-400 font-bold">{usd(fees)}</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-4xl font-mono font-bold text-emerald-400 mb-2">
            {usd(totalVal)}
          </div>
          <div className={cn("px-3 py-1 rounded text-xs font-mono inline-block mb-1", profit >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
            {profit >= 0 ? "+" : ""}{usd(profit)} (APY: {(apy * 100).toFixed(2)}%)
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            Excl. Buffer: <span className="text-zinc-300">{usd(profitExcl)}</span> (APY: {(apyExcl * 100).toFixed(2)}%)
          </div>
        </div>
      </div>
    </div>
  );
}
