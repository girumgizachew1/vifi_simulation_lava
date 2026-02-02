
"use client";




import React, { useEffect } from 'react';
import { useSimulationStore } from '@/lib/store';
import { ChevronRight, ArrowRight, TrendingUp, TrendingDown, Activity, DollarSign, CornerDownRight, ArrowLeftRight, Layers, Loader2 } from 'lucide-react';
import { formatCompactNumber } from '@/lib/utils';
import { Header } from '@/components/dashboard/Header';
import { FarmReserveBanner } from '@/components/dashboard/FarmReserveBanner';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { TransactionHistory } from '@/components/dashboard/TransactionHistory';

export default function SimulationDashboard() {
  const {
    data,
    metrics,
    params,
    loadHistoryData,
    vfe,
    isRunning
  } = useSimulationStore();

  // Initial Data Load
  useEffect(() => {
    loadHistoryData();
  }, []); // Only on mount, store handles subsequent updates via setVfe

  // --- Derived State ---
  const finalState = data.length > 0 ? data[data.length - 1] : undefined;
  const allLogs = data.filter(d => d.tradeLog).map(d => ({ ...d.tradeLog, day: d.day } as any));

  // --- Statistics Calculation ---
  const expansions = allLogs.filter((l: any) => l.type === 'EXPANSION');
  const contractions = allLogs.filter((l: any) => l.type === 'CONTRACTION');

  const expansionUSD = expansions.map((l: any) => l.inputUSD || 0);
  const contractionFiat = contractions.map((l: any) => l.inputFiat || 0);

  const avgExp = calculateMean(expansionUSD);
  const medExp = calculateMedian(expansionUSD);
  const avgCont = calculateMean(contractionFiat);
  const medCont = calculateMedian(contractionFiat);

  const expansionCount = expansions.length;
  const contractionCount = contractions.length;
  const expansionVolume = expansionUSD.reduce((a: number, b: number) => a + b, 0);
  const contractionVolume = contractionFiat.reduce((a: number, b: number) => a + b, 0);
  // Total Volume in "USD Equivalent" roughly? Or just sum of raw numbers is confusing.
  // Let's stick to showing them separately or user defined "Total Volume".
  // Assuming Contraction Volume needs to be converted to USD to be summed with Expansion USD?
  // For now, let's display raw sums as requested "volume of both". 

  // Actually, usually Volume is in USD. 
  // Let's use the `inputUSD` for Expansion and `totalOutputUSD` (or derive USD value) for Contraction?
  // The user asked for "volume of both". Contraction input is Fiat. output is USD.
  // Let's use Output USD for Contraction Volume in USD terms? 
  // Or just display the specific currency volume. 
  // "Volume" usually implies the Input amount sum.

  // Let's create a derived "Total Volume (USD)"
  const contractionUSDVolume = contractions.reduce((acc: number, val: any) => acc + (val.totalOutputUSD || 0), 0);
  const totalVolumeUSD = expansionVolume + contractionUSDVolume;

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans selection:bg-indigo-500/30">

      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

        <FarmReserveBanner finalState={finalState} initialLiquidityUSD={params.initialLiquidityUSD} />

        <Sidebar />

        <section className="lg:col-span-9 space-y-6">

          {isRunning ? (
            <div className="flex flex-col items-center justify-center h-[500px] border border-white/5 rounded-2xl bg-zinc-900/30 space-y-6 animate-in fade-in duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
                <Loader2 className="w-16 h-16 text-indigo-400 animate-spin relative z-10" />
              </div>
              <div className="space-y-2 text-center">
                <h3 className="text-xl font-medium text-white">Simulating Market Dynamics</h3>
                <p className="text-sm text-zinc-500 font-mono">Processing {params.numDays} Days of {vfe} Trading Data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Core System State */}
              {/* Core System State - Focused View */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 
                  <MetricCard
                    label="Total USDV Collateral (Su)"
                    value={`$${finalState ? Math.round(finalState.totalCollateralUSD || 0).toLocaleString() : '---'}`}
                    subValue="Initial + Deposits - Redemptions"
                    color="indigo"
                    icon={Activity}
                  />
                  <MetricCard
                    label="System Reserves (Sr)"
                    value={`$${finalState ? Math.round(finalState.reserveUSD).toLocaleString() : '---'}`}
                    subValue="Current Liquidity"
                    color="emerald"
                    icon={DollarSign}
                  /> 
                  */}

                {/* 
                  <MetricCard
                    label="Total Fees Collected"
                    value={`$${finalState ? Math.round(finalState.feesCollected).toLocaleString() : '---'}`}
                    subValue={finalState ? `Exp: $${Math.round(finalState.feesExpansion || 0).toLocaleString()} | Cont: $${Math.round(finalState.feesContraction || 0).toLocaleString()}` : 'System Revenue (γ)'}
                    color="amber"
                    icon={DollarSign}
                  />
                  <MetricCard
                    label="Lambda Buffer (Excess)"
                    value={`$${finalState ? Math.round(finalState.backingBufferUSD || 0).toLocaleString() : '---'}`}
                    subValue="Captured by λ < 1"
                    color="indigo"
                    icon={Activity}
                  />
                  */}

                {/* Main Stats Grid */}
              </div>

              {data.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 w-full">
                  {/* 1. Net Flow (Growth) */}
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

                  {/* 2. Total Flow (Activity) */}
                  <MetricCard
                    label="Total Flow (Activity)"
                    value={formatCompactNumber(totalVolumeUSD, '$')}
                    subValue="Sum of |Absolute Changes|"
                    color="indigo"
                    icon={Activity}
                  />

                  {/* 3. Transaction Count */}
                  <MetricCard
                    label="Transaction Activity"
                    value={allLogs.length.toString()}
                    subValue={`Exp: ${expansions.length} | Cont: ${contractions.length}`}
                    color="indigo"
                    icon={Layers}
                  />
                </div>
              )}


              {/* Transaction History List */}
              <TransactionHistory logs={allLogs} />

              {/* Empty State */}
              {data.length === 0 && (
                <div className="flex items-center justify-center h-64 border border-zinc-800 rounded-xl bg-zinc-900/50">
                  <div className="text-zinc-500 text-sm">Ready to Simulate</div>
                </div>
              )}
            </>
          )}

        </section>
      </main>
    </div>
  );
}

function calculateMean(nums: number[]) {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function calculateMedian(nums: number[]) {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function StatSimple({ label, value, sub }: { label: string, value: string, sub?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-zinc-500 text-xs uppercase tracking-wider mb-1">{label}</span>
      <span className="text-white font-mono font-bold text-lg">{value}</span>
      {sub && <span className="text-zinc-600 text-[10px]">{sub}</span>}
    </div>
  );
}
