
import { create } from 'zustand';
import { SimulationParams, SimulationStep } from './vifi-amm';
import { runSimulation, SimulationMetrics } from './simulation-runner';
import { runBatchMonteCarlo, BatchScenarioResult } from './batch-runner';

type PriceRecord = { date: string; price: number };

interface SimulationState {
    // --- Configuration State ---
    vfe: 'NGNv' | 'KESv' | 'ETBv';
    startYear: number;
    params: SimulationParams;

    // --- Data State ---
    history: PriceRecord[];     // Raw Oracle Data
    loadingData: boolean;
    isInitialized: boolean;     // Gatekeeper for running sims

    // --- Results State ---
    data: (SimulationStep & { date: string })[]; // Simulation Output
    metrics: SimulationMetrics | null;
    isRunning: boolean;

    // --- Batch State ---
    batchResults: BatchScenarioResult[];
    batchRunMetadata: { vfe: string; startYear: number } | null;
    isBatchRunning: boolean;
    batchProgress: number;

    // --- Actions ---
    setVfe: (vfe: 'NGNv' | 'KESv' | 'ETBv') => void;
    setStartYear: (year: number) => void;
    setParams: (updates: Partial<SimulationParams>) => void;

    loadHistoryData: () => Promise<void>;
    initialize: () => void; // Unlocks the simulator
    run: () => void;
    runBatch: (mode: 'full' | 'conservative') => Promise<void>;
    reset: () => void;
    clearBatch: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
    // Initial State
    vfe: 'NGNv',
    startYear: 2023, // Default to recent
    params: {
        initialLiquidityUSD: 1000000,
        initialPremium: 0.15,
        tradeProbForward: 0.5,
        volatility: 0.02,
        numDays: 365,
        tradesPerDay: 30,
        isSmartAgent: false,
        currency: 'NGN',
        feeRate: 0.001
    },
    history: [],
    loadingData: false,
    isInitialized: false,

    data: [],
    metrics: null,
    isRunning: false,

    batchResults: [],
    batchRunMetadata: null, // New
    isBatchRunning: false,
    batchProgress: 0,

    // Actions
    setVfe: (vfe) => {
        set({ vfe, isInitialized: false });
        const currency = vfe.replace('v', '') as any;
        set((state) => ({ params: { ...state.params, currency } }));
        get().loadHistoryData();
    },

    setStartYear: (startYear) => {
        set({ startYear, isInitialized: false });
        get().reset();
    },

    setParams: (updates) => set((state) => ({
        params: { ...state.params, ...updates }
    })),

    loadHistoryData: async () => {
        const { vfe } = get();
        set({ loadingData: true });

        try {
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

    initialize: () => {
        const { history } = get();
        if (history.length > 0) {
            set({ isInitialized: true });
        }
    },

    run: () => {
        const { history, startYear, params, isInitialized } = get();
        if (history.length === 0 || !isInitialized) return;

        set({ isRunning: true });

        setTimeout(() => {
            const targetDate = `${startYear}-01-01`;
            let sIdx = history.findIndex(p => p.date >= targetDate);
            if (sIdx === -1) sIdx = 0;

            const segment = history.slice(sIdx, sIdx + params.numDays);
            const slicedSegment = segment.length < params.numDays
                ? history.slice(sIdx)
                : segment;

            const priceArray = slicedSegment.map(p => p.price);

            const { steps, metrics } = runSimulation(params, priceArray);

            const mergedResults = steps.map((step) => ({
                ...step,
                date: slicedSegment[step.day]?.date || `Day ${step.day}`
            }));

            set({
                data: mergedResults,
                metrics: metrics,
                isRunning: false
            });
        }, 100);
    },

    runBatch: async (mode) => {
        const { history, startYear, params, isInitialized, vfe } = get();
        if (history.length === 0 || !isInitialized) return;

        set({ isBatchRunning: true, batchResults: [], batchProgress: 0, batchRunMetadata: null });

        const targetDate = `${startYear}-01-01`;
        let sIdx = history.findIndex(p => p.date >= targetDate);
        if (sIdx === -1) sIdx = 0;

        const segment = history.slice(sIdx, sIdx + params.numDays);
        const priceData = segment.map(h => h.price);

        // Wait a tick 
        await new Promise(r => setTimeout(r, 100));

        const biases = mode === 'conservative' ? [0.2, 0.4] : [0.2, 0.4, 0.6, 0.8];

        const results = await runBatchMonteCarlo(
            params,
            priceData,
            (prog) => set({ batchProgress: prog }),
            biases
        );

        set({
            batchResults: results,
            batchRunMetadata: { vfe, startYear }, // Snapshot metadata
            isBatchRunning: false
        });
    },

    reset: () => {
        set({ data: [], metrics: null });
    },

    clearBatch: () => {
        set({ batchResults: [], batchRunMetadata: null });
    }
}));
