import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore, initialStoreState, createInitialStoreState, type AppStore } from '../src/store/useStore';
import { ReplayState } from '../src/core/replay-clock';
import { PortfolioState } from '../src/core/paper-trading';
import { Candle, Timeframe } from '../src/types/market';

describe('Zustand App Store (useStore)', () => {
  beforeEach(() => {
    useStore.setState(createInitialStoreState());
  });

  describe('Initial State', () => {
    it('initializes with default market parameters', () => {
      const state = useStore.getState();
      expect(state.symbol).toBe('BTCUSDT');
      expect(state.timeframe).toBe('1m');
    });

    it('initializes with default replay state', () => {
      const state = useStore.getState();
      expect(state.replayState).toEqual({
        currentIndex: 0,
        isPlaying: false,
        speed: 1,
        currentCandle: null,
        totalCandles: 0,
      });
    });

    it('initializes with default portfolio state', () => {
      const state = useStore.getState();
      expect(state.portfolio).toEqual({
        balance: 10000,
        equity: 10000,
        realizedPnL: 0,
        unrealizedPnL: 0,
        positions: [],
        pendingOrders: [],
        closedTrades: [],
      });
    });

    it('initializes with default active drawing tool as cursor', () => {
      const state = useStore.getState();
      expect(state.activeDrawingTool).toBe('cursor');
    });

    it('initializes with all indicators disabled', () => {
      const state = useStore.getState();
      expect(state.indicators).toEqual({
        sma20: false,
        ema50: false,
        rsi14: false,
      });
    });

    it('uses a factory function returning fresh array references to avoid state pollution', () => {
      const state1 = createInitialStoreState();
      const state2 = createInitialStoreState();
      expect(state1.portfolio.positions).not.toBe(state2.portfolio.positions);
      expect(state1.portfolio.pendingOrders).not.toBe(state2.portfolio.pendingOrders);
      expect(state1.portfolio.closedTrades).not.toBe(state2.portfolio.closedTrades);
      expect(initialStoreState.symbol).toBe('BTCUSDT');
      expect(state1.portfolio.positions).not.toBe(initialStoreState.portfolio.positions);
    });
  });

  describe('Actions', () => {
    it('updates symbol via setSymbol', () => {
      useStore.getState().setSymbol('ETHUSDT');
      expect(useStore.getState().symbol).toBe('ETHUSDT');

      useStore.getState().setSymbol('SOLUSDT');
      expect(useStore.getState().symbol).toBe('SOLUSDT');
    });

    it('updates timeframe via setTimeframe', () => {
      const timeframes: Timeframe[] = ['3m', '5m', '15m', '30m', '1h', '2h', '4h', '1D'];
      for (const tf of timeframes) {
        useStore.getState().setTimeframe(tf);
        expect(useStore.getState().timeframe).toBe(tf);
      }
    });

    it('updates replayState via setReplayState', () => {
      const sampleCandle: Candle = {
        time: 1700000060,
        open: 50000,
        high: 50100,
        low: 49900,
        close: 50050,
        volume: 120,
      };

      const newReplayState: ReplayState = {
        currentIndex: 42,
        isPlaying: true,
        speed: 5,
        currentCandle: sampleCandle,
        totalCandles: 1000,
      };

      useStore.getState().setReplayState(newReplayState);
      expect(useStore.getState().replayState).toEqual(newReplayState);
      expect(useStore.getState().replayState.isPlaying).toBe(true);
      expect(useStore.getState().replayState.speed).toBe(5);
      expect(useStore.getState().replayState.currentIndex).toBe(42);
      expect(useStore.getState().replayState.currentCandle).toEqual(sampleCandle);
    });

    it('updates portfolio via setPortfolio', () => {
      const newPortfolio: PortfolioState = {
        balance: 9500,
        equity: 10200,
        realizedPnL: 150,
        unrealizedPnL: 200,
        positions: [
          {
            id: 'pos-1',
            side: 'BUY',
            size: 1,
            entryPrice: 50000,
            stopLoss: 49000,
            takeProfit: 52000,
            unrealizedPnL: 200,
            realizedPnL: 0,
            openedAt: 1700000000,
          },
        ],
        pendingOrders: [
          {
            id: 'ord-1',
            type: 'LIMIT',
            side: 'SELL',
            size: 0.5,
            limitPrice: 53000,
            createdAt: 1700000050,
          },
        ],
        closedTrades: [
          {
            id: 'trade-1',
            side: 'BUY',
            size: 0.5,
            entryPrice: 48000,
            exitPrice: 48300,
            pnl: 150,
            openedAt: 1699990000,
            closedAt: 1699991000,
          },
        ],
      };

      useStore.getState().setPortfolio(newPortfolio);
      expect(useStore.getState().portfolio).toEqual(newPortfolio);
      expect(useStore.getState().portfolio.balance).toBe(9500);
      expect(useStore.getState().portfolio.positions).toHaveLength(1);
      expect(useStore.getState().portfolio.pendingOrders).toHaveLength(1);
      expect(useStore.getState().portfolio.closedTrades).toHaveLength(1);
    });

    it('updates activeDrawingTool via setActiveDrawingTool', () => {
      const tools: AppStore['activeDrawingTool'][] = [
        'trendline',
        'horizontal_ray',
        'rectangle',
        'fibonacci',
        'position',
        null,
        'cursor',
      ];

      for (const tool of tools) {
        useStore.getState().setActiveDrawingTool(tool);
        expect(useStore.getState().activeDrawingTool).toBe(tool);
      }
    });

    it('toggles indicators independently via toggleIndicator', () => {
      // Toggle sma20
      useStore.getState().toggleIndicator('sma20');
      expect(useStore.getState().indicators).toEqual({
        sma20: true,
        ema50: false,
        rsi14: false,
      });

      // Toggle ema50
      useStore.getState().toggleIndicator('ema50');
      expect(useStore.getState().indicators).toEqual({
        sma20: true,
        ema50: true,
        rsi14: false,
      });

      // Toggle rsi14
      useStore.getState().toggleIndicator('rsi14');
      expect(useStore.getState().indicators).toEqual({
        sma20: true,
        ema50: true,
        rsi14: true,
      });

      // Toggle sma20 back off
      useStore.getState().toggleIndicator('sma20');
      expect(useStore.getState().indicators).toEqual({
        sma20: false,
        ema50: true,
        rsi14: true,
      });

      // Toggle ema50 and rsi14 back off
      useStore.getState().toggleIndicator('ema50');
      useStore.getState().toggleIndicator('rsi14');
      expect(useStore.getState().indicators).toEqual({
        sma20: false,
        ema50: false,
        rsi14: false,
      });
    });

    it('notifies subscribers on store updates', () => {
      const listener = vi.fn();
      const unsubscribe = useStore.subscribe(listener);

      useStore.getState().setSymbol('AVAXUSDT');
      expect(listener).toHaveBeenCalled();

      unsubscribe();
    });
  });
});
