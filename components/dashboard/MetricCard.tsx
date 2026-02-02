
import { DollarSign, Activity, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface MetricCardProps {
    label: string;
    value: string;
    subValue: string;
    color: 'indigo' | 'red' | 'emerald' | 'amber';
    icon: any;
}

export function MetricCard({ label, value, subValue, color, icon: Icon }: MetricCardProps) {
    const styles = {
        indigo: {
            wrap: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
            icon: "text-indigo-500",
            sub: "text-indigo-400",
            glow: "bg-indigo-500"
        },
        red: {
            wrap: "text-red-400 bg-red-500/10 border-red-500/20",
            icon: "text-red-500",
            sub: "text-red-400",
            glow: "bg-red-500"
        },
        emerald: {
            wrap: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
            icon: "text-emerald-500",
            sub: "text-emerald-400",
            glow: "bg-emerald-500"
        },
        amber: {
            wrap: "text-amber-400 bg-amber-500/10 border-amber-500/20",
            icon: "text-amber-500",
            sub: "text-amber-400",
            glow: "bg-amber-500"
        }
    };

    const theme = styles[color] || styles.indigo;

    return (
        <div className={cn("bg-zinc-900/50 border rounded-2xl p-5 relative overflow-hidden group", theme.wrap)}>
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</p>
                    {Icon && <Icon className={cn("w-4 h-4", theme.icon)} />}
                </div>
                <div className="min-h-[3rem] flex items-end">
                    <p className="text-2xl font-bold text-white tracking-tight break-all leading-none">{value}</p>
                </div>
                <div className={cn("text-[10px] font-mono mt-3 leading-relaxed opacity-80", theme.sub)}>
                    {subValue}
                </div>
            </div>
            <div className={cn("absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity", theme.glow)} />
        </div>
    );
}
