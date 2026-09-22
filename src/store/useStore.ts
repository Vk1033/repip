import { create } from 'zustand';
import { Timeframe } from '../types/market';
import { ReplayState } from '../core/replay-clock';
import { PortfolioState } from '../core/paper-trading';

export interface AppStore {
  symbol: string;
  timeframe: Timeframe;
  replayState: ReplayState;
  portfolio: PortfolioState;
  activeDrawingTool: 'cursor' | 'trendline' | 'horizontal_ray' | 'rectangle' | 'fibonacci' | 'position' | null;
  indicators: {
    sma20: boolean;
    ema50: boolean;
    rsi14: boolean;
  };
  setSymbol: (symbol: string) => void;
  setTimeframe: (tf: Timeframe) => void;
  setReplayState: (state: ReplayState) => void;
  setPortfolio: (portfolio: PortfolioState) => void;
  setActiveDrawingTool: (tool: AppStore['activeDrawingTool']) => void;
  toggleIndicator: (indicator: keyof AppStore['indicators']) => void;
}

export const initialStoreState = {
  symbol: 'BTCUSDT',
  timeframe: '1m' as Timeframe,
  replayState: {
    currentIndex: 0,
    isPlaying: false,
    speed: 1,
    currentCandle: null,
    totalCandles: 0,
  },
  portfolio: {
    balance: 10000,
    equity: 10000,
    realizedPnL: 0,
    unrealizedPnL: 0,
    positions: [],
    pendingOrders: [],
    closedTrades: [],
  },
  activeDrawingTool: 'cursor' as const,
  indicators: {
    sma20: false,
    ema50: false,
    rsi14: false,
  },
};

export const useStore = create<AppStore>((set) => ({
  ...initialStoreState,
  setSymbol: (symbol) => set({ symbol }),
  setTimeframe: (timeframe) => set({ timeframe }),
  setReplayState: (replayState) => set({ replayState }),
  setPortfolio: (portfolio) => set({ portfolio }),
  setActiveDrawingTool: (tool) => set({ activeDrawingTool: tool }),
  toggleIndicator: (ind) => set((s) => ({
    indicators: { ...s.indicators, [ind]: !s.indicators[ind] },
  })),
}));
