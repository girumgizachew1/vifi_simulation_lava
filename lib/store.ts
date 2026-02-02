
import { create } from 'zustand';
import { SimulationParams, SimulationStep } from './vifi-amm';
import { runSimulation, SimulationMetrics } from './simulation-runner';

type PriceRecord = { date: string; price: number };

interface SimulationState {
    // --- Configuration State ---
    vfe: 'NGNv' | 'KESv' | 'ETBv';
    startYear: number;
    params: SimulationParams;

    // --- Data State ---
    history: PriceRecord[];     // Raw Oracle Data
    loadingData: boolean;

    // --- Results State ---
    data: (SimulationStep & { date: string })[]; // Simulation Output
    metrics: SimulationMetrics | null;
    isRunning: boolean;

    // --- Actions ---
    setVfe: (vfe: 'NGNv' | 'KESv' | 'ETBv') => void;
    setStartYear: (year: number) => void;
    setParams: (updates: Partial<SimulationParams>) => void;

    loadHistoryData: () => Promise<void>;
    run: () => void;
    reset: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
    // Initial State
    vfe: 'NGNv',
    startYear: 2019,
    params: {
        initialLiquidityUSD: 1000000,
        initialPremium: 0.15,
        tradeProbForward: 0.5,
        volatility: 0.02,
        numDays: 365,
        tradesPerDay: 1,
        isSmartAgent: false,
        currency: 'NGN',
        feeRate: 0.001
    },
    history: [],
    loadingData: false,
    data: [],
    metrics: null,
    isRunning: false,

    // Actions
    setVfe: (vfe) => {
        set({ vfe });
        // Auto-update currency param when VFE changes
        const currency = vfe.replace('v', '') as any;
        set((state) => ({ params: { ...state.params, currency } }));
        // Trigger data reload
        get().loadHistoryData();
    },

    setStartYear: (startYear) => set({ startYear }),

    setParams: (updates) => set((state) => ({
        params: { ...state.params, ...updates }
    })),

    loadHistoryData: async () => {
        const { vfe } = get();
        set({ loadingData: true });

        try {
            // Clear old data first
            set({ history: [] });

            const curr = vfe.replace('v', '');
            const res = await fetch(`/data/${curr}.json`);

            if (!res.ok) throw new Error(`Failed to fetch ${curr} data`);

            const json = await res.json();
            let history: PriceRecord[] = [];

            if (Array.isArray(json)) {
                history = json;
            } else if (json.data && Array.isArray(json.data)) {
                history = json.data;
            }

            set({ history });
        } catch (e) {
            console.error("Data Load Error:", e);
        } finally {
            set({ loadingData: false });
        }
    },

    run: () => {
        const { history, startYear, params } = get();
        if (history.length === 0) return;

        set({ isRunning: true });

        // Logic moved from page.tsx
        // Use setTimeout to allow UI to update isRunning state before heavy calc
        setTimeout(() => {
            const targetDate = `${startYear}-01-01`;
            let sIdx = history.findIndex(p => p.date >= targetDate);
            if (sIdx === -1) sIdx = 0;

            const segment = history.slice(sIdx, sIdx + params.numDays);
            const slicedSegment = segment.length < params.numDays
                ? history.slice(sIdx)
                : segment;

            const priceArray = slicedSegment.map(p => p.price);

            // Run Engine
            const { steps, metrics } = runSimulation(params, priceArray);

            // Merge Dates
            const mergedResults = steps.map((step) => ({
                ...step,
                date: slicedSegment[step.day]?.date || `Day ${step.day}`
            }));

            set({
                data: mergedResults,
                metrics: metrics,
                isRunning: false
            });
        }, 3000);
    },

    reset: () => {
        set({ data: [], metrics: null });
    }
}));
