import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CandleBuffer } from '../src/core/candle-buffer';
import { ReplayClock } from '../src/core/replay-clock';
import { resampleCandles } from '../src/core/resampler';
import { PaperTradingEngine } from '../src/core/paper-trading';
import { Candle } from '../src/types/market';
import { createSimulationHandler } from '../src/workers/simulation.worker';
import { WorkerOutMessage } from '../src/workers/protocol';
import { App } from '../src/App';
import { useStore, initialStoreState } from '../src/store/useStore';
import { WorkerClient } from '../src/workers/worker-client';

// Mock useSyncExternalStore to invoke getSnapshot so components reflect live useStore state.
vi.spyOn(React, 'useSyncExternalStore').mockImplementation((_subscribe, getSnapshot) => {
  return getSnapshot();
});

describe('TradingView Replay Full Workflow Smoke Test', () => {
  beforeEach(() => {
    useStore.setState(initialStoreState);
  });

  it('loads 1m candles, steps clock forward, resamples to 5m, and executes paper orders', () => {
    const candles1m: Candle[] = Array.from({ length: 60 }, (_, i) => ({
      time: 1700000000 + i * 60,
      open: 100 + i * 0.5,
      high: 101 + i * 0.5,
      low: 99.5 + i * 0.5,
      close: 100.8 + i * 0.5,
      volume: 100,
    }));

    const buffer = CandleBuffer.fromCandles(candles1m);
    const clock = new ReplayClock(buffer, 0);
    const trading = new PaperTradingEngine({ initialBalance: 10000 });

    // Place buy limit order at 100
    trading.placeOrder({ type: 'LIMIT', side: 'BUY', size: 10, limitPrice: 100 });

    // Step clock forward 10 bars
    clock.step(10);
    expect(clock.getState().currentIndex).toBe(10);

    // Process replayed candles through paper trader
    for (let i = 0; i <= 10; i++) {
      trading.processCandle(buffer.getCandle(i)!);
    }

    const portfolio = trading.getPortfolio();
    expect(portfolio.positions).toHaveLength(1);
    expect(portfolio.positions[0].entryPrice).toBe(100);

    // Verify 5m aggregation of the 10 stepped bars
    const visible5m = resampleCandles(buffer.sliceCandles(0, 11), 300);
    expect(visible5m.length).toBeGreaterThanOrEqual(2);
  });

  it('coordinates full simulation worker message cycle: load data, timeframe change, orders, step, and close', () => {
    const messages: WorkerOutMessage[] = [];
    const post = (msg: WorkerOutMessage) => {
      messages.push(msg);
    };

    const handler = createSimulationHandler(post);

    const testCandles: Candle[] = Array.from({ length: 30 }, (_, i) => ({
      time: 1700000000 + i * 60,
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 102 + i,
      volume: 1000,
    }));

    // 1. Load Data
    handler({ type: 'LOAD_DATA', payload: { candles: testCandles } });
    expect(messages.some((m) => m.type === 'READY')).toBe(true);
    expect(messages.some((m) => m.type === 'SERIES_DATA')).toBe(true);

    // 2. Change Timeframe to 5m
    messages.length = 0;
    handler({ type: 'SET_TIMEFRAME', payload: { timeframe: '5m' } });
    const seriesMsg = messages.find((m) => m.type === 'SERIES_DATA') as any;
    expect(seriesMsg).toBeDefined();
    expect(seriesMsg.payload.timeframe).toBe('5m');

    // 3. Place Market Buy Order
    messages.length = 0;
    handler({
      type: 'PLACE_ORDER',
      payload: {
        order: { type: 'MARKET', side: 'BUY', size: 2 },
      },
    });
    const orderUpdate = messages.find((m) => m.type === 'PORTFOLIO_UPDATE') as any;
    expect(orderUpdate).toBeDefined();
    expect(orderUpdate.payload.pendingOrders.length).toBe(1);

    // 4. Step clock forward 1 bar (fills the market order)
    messages.length = 0;
    handler({ type: 'STEP', payload: { delta: 1 } });
    expect(messages.some((m) => m.type === 'CANDLE_UPDATE')).toBe(true);
    const stepPortfolio = messages.find((m) => m.type === 'PORTFOLIO_UPDATE') as any;
    expect(stepPortfolio).toBeDefined();
    expect(stepPortfolio.payload.positions.length).toBe(1);

    const positionId = stepPortfolio.payload.positions[0].id;

    // 5. Close Position
    messages.length = 0;
    handler({ type: 'CLOSE_POSITION', payload: { positionId } });
    const closePortfolio = messages.find((m) => m.type === 'PORTFOLIO_UPDATE') as any;
    expect(closePortfolio).toBeDefined();
    expect(closePortfolio.payload.positions.length).toBe(0);
    expect(closePortfolio.payload.closedTrades.length).toBe(1);
  });

  it('renders App component integrating TopBar, LeftToolbar, ChartContainer, DrawingOverlay, ReplayBar, and TradingPanel', () => {
    const mockWorkerClient = {
      send: vi.fn(),
      onMessage: vi.fn().mockReturnValue(() => {}),
      terminate: vi.fn(),
    } as unknown as WorkerClient;

    const html = renderToStaticMarkup(
      React.createElement(App as React.ComponentType<any>, {
        workerClient: mockWorkerClient,
        autoLoadData: false,
      })
    );

    // Verify all key system components are wired and present in the rendered markup
    expect(html).toContain('data-testid="app-root"');
    expect(html).toContain('data-testid="top-bar"');
    expect(html).toContain('data-testid="left-toolbar"');
    expect(html).toContain('data-testid="chart-container"');
    expect(html).toContain('data-testid="drawing-overlay"');
    expect(html).toContain('data-testid="replay-bar"');
    expect(html).toContain('data-testid="trading-panel"');
  });
});
