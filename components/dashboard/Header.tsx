import { Activity } from 'lucide-react';
import React from 'react';

export function Header() {
    return (
        <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="font-bold text-lg tracking-tight">ViFi <span className="text-zinc-500 font-medium">Simulation Environment v1.1</span></h1>
                </div>
                <div className="text-xs text-zinc-500 font-mono flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Real-Data Engine Active
                </div>
            </div>
        </header>
    );
}
