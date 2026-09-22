import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkerInMessage, WorkerOutMessage } from '../src/workers/protocol';
import { WorkerClient } from '../src/workers/worker-client';
import { Candle } from '../src/types/market';
import { createSimulationHandler } from '../src/workers/simulation.worker';

function createSampleCandles(count: number, startTime = 1700000000): Candle[] {
  const candles: Candle[] = [];
  for (let i = 0; i < count; i++) {
    const time = startTime + i * 60; // 1m candles
    const base = 100 + i;
    candles.push({
      time,
      open: base,
      high: base + 2,
      low: base - 1,
      close: base + 1,
      volume: 1000 + i * 10,
    });
  }
  return candles;
}

describe('Worker Protocol', () => {
  it('validates message schemas', () => {
    const inMsg: WorkerInMessage = {
      type: 'SET_SPEED',
      payload: { speed: 5 },
    };
    expect(inMsg.type).toBe('SET_SPEED');
    expect(inMsg.payload.speed).toBe(5);
  });
});

describe('Worker Protocol Types & Serialization', () => {
  it('validates incoming message schemas', () => {
    const candles = createSampleCandles(2);

    const inMessages: WorkerInMessage[] = [
      { type: 'LOAD_DATA', payload: { candles } },
      { type: 'SET_TIMEFRAME', payload: { timeframe: '5m' } },
      { type: 'PLAY' },
      { type: 'PAUSE' },
      { type: 'SET_SPEED', payload: { speed: 5 } },
      { type: 'STEP', payload: { delta: 1 } },
      { type: 'JUMP_TO_TIMESTAMP', payload: { timestamp: 1700000060 } },
      {
        type: 'PLACE_ORDER',
        payload: { order: { type: 'LIMIT', side: 'BUY', size: 1, limitPrice: 99 } },
      },
      { type: 'CANCEL_ORDER', payload: { orderId: 'ord_123' } },
      { type: 'CLOSE_POSITION', payload: { positionId: 'pos_123' } },
    ];

    for (const msg of inMessages) {
      const serialized = JSON.stringify(msg);
      const deserialized: WorkerInMessage = JSON.parse(serialized);
      expect(deserialized.type).toBe(msg.type);
      if ('payload' in msg) {
        expect(deserialized).toEqual(msg);
      }
    }
  });

  it('validates outgoing message schemas', () => {
    const candles = createSampleCandles(2);

    const outMessages: WorkerOutMessage[] = [
      { type: 'READY', payload: { totalCandles: 100 } },
      {
        type: 'REPLAY_STATE',
        payload: {
          currentIndex: 5,
          isPlaying: false,
          speed: 2,
          currentCandle: candles[0],
          totalCandles: 100,
        },
      },
      {
        type: 'SERIES_DATA',
        payload: { candles, timeframe: '1m' },
      },
      {
        type: 'CANDLE_UPDATE',
        payload: { candle: candles[1], isNewBar: false },
      },
      {
        type: 'PORTFOLIO_UPDATE',
        payload: {
          balance: 10000,
          equity: 10000,
          realizedPnL: 0,
          unrealizedPnL: 0,
          positions: [],
          pendingOrders: [],
          closedTrades: [],
        },
      },
    ];

    for (const msg of outMessages) {
      const serialized = JSON.stringify(msg);
      const deserialized: WorkerOutMessage = JSON.parse(serialized);
      expect(deserialized.type).toBe(msg.type);
      expect(deserialized).toEqual(msg);
    }
  });
});

describe('WorkerClient', () => {
  let mockWorker: {
    postMessage: ReturnType<typeof vi.fn>;
    terminate: ReturnType<typeof vi.fn>;
    onmessage: ((event: MessageEvent<WorkerOutMessage>) => void) | null;
  };

  beforeEach(() => {
    mockWorker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
    };
  });

  it('sends messages to worker via postMessage', () => {
    const client = new WorkerClient(mockWorker as unknown as Worker);
    const msg: WorkerInMessage = { type: 'PLAY' };

    client.send(msg);
    expect(mockWorker.postMessage).toHaveBeenCalledWith(msg);
  });

  it('dispatches incoming worker messages to registered callbacks', () => {
    const client = new WorkerClient(mockWorker as unknown as Worker);
    const listener = vi.fn();
    client.onMessage(listener);

    const outMsg: WorkerOutMessage = {
      type: 'READY',
      payload: { totalCandles: 50 },
    };

    mockWorker.onmessage?.({ data: outMsg } as MessageEvent<WorkerOutMessage>);
    expect(listener).toHaveBeenCalledWith(outMsg);
  });

  it('supports multiple listeners and unregistering', () => {
    const client = new WorkerClient(mockWorker as unknown as Worker);
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const unsubscribe1 = client.onMessage(listener1);
    client.onMessage(listener2);

    const msg1: WorkerOutMessage = { type: 'REPLAY_STATE', payload: { currentIndex: 0, isPlaying: true, speed: 1, currentCandle: null, totalCandles: 0 } };
    mockWorker.onmessage?.({ data: msg1 } as MessageEvent<WorkerOutMessage>);

    expect(listener1).toHaveBeenCalledWith(msg1);
    expect(listener2).toHaveBeenCalledWith(msg1);

    unsubscribe1();

    const msg2: WorkerOutMessage = { type: 'READY', payload: { totalCandles: 10 } };
    mockWorker.onmessage?.({ data: msg2 } as MessageEvent<WorkerOutMessage>);

    expect(listener1).toHaveBeenCalledTimes(1); // not called again
    expect(listener2).toHaveBeenCalledWith(msg2);
  });

  it('terminates worker and clears listeners', () => {
    const client = new WorkerClient(mockWorker as unknown as Worker);
    const listener = vi.fn();
    client.onMessage(listener);

    client.terminate();
    expect(mockWorker.terminate).toHaveBeenCalled();

    // After termination, message dispatch to old listeners should not fire
    mockWorker.onmessage?.({ data: { type: 'READY', payload: { totalCandles: 5 } } } as MessageEvent<WorkerOutMessage>);
    expect(listener).not.toHaveBeenCalled();
  });

  it('uses default worker instantiation when none is provided', () => {
    const originalWorker = globalThis.Worker;
    const workerConstructorSpy = vi.fn();

    // Mock global Worker
    class MockGlobalWorker {
      postMessage = vi.fn();
      terminate = vi.fn();
      onmessage: ((event: MessageEvent<WorkerOutMessage>) => void) | null = null;
      constructor(url: any, opts: any) {
        workerConstructorSpy(url, opts);
      }
    }
    (globalThis as any).Worker = MockGlobalWorker;

    try {
      const client = new WorkerClient();
      expect(workerConstructorSpy).toHaveBeenCalledWith(
        expect.any(URL),
        { type: 'module' }
      );
      client.terminate();
    } finally {
      globalThis.Worker = originalWorker;
    }
  });
});

describe('Simulation Worker Logic', () => {
  it('handles LOAD_DATA and broadcasts READY, REPLAY_STATE, PORTFOLIO_UPDATE, and SERIES_DATA', () => {
    const messages: WorkerOutMessage[] = [];
    const handler = createSimulationHandler((msg) => messages.push(msg));

    const candles = createSampleCandles(10);
    handler({ type: 'LOAD_DATA', payload: { candles } });

    const types = messages.map(m => m.type);
    expect(types).toContain('READY');
    expect(types).toContain('REPLAY_STATE');
    expect(types).toContain('PORTFOLIO_UPDATE');
    expect(types).toContain('SERIES_DATA');

    const readyMsg = messages.find(m => m.type === 'READY');
    expect(readyMsg?.payload).toEqual({ totalCandles: 10 });

    const seriesMsg = messages.find(m => m.type === 'SERIES_DATA');
    expect(seriesMsg?.payload.candles.length).toBe(1); // at index 0, 1 candle
    expect(seriesMsg?.payload.timeframe).toBe('1m');
  });

  it('handles SET_TIMEFRAME and resamples series data', () => {
    const messages: WorkerOutMessage[] = [];
    const handler = createSimulationHandler((msg) => messages.push(msg));

    // Align to 5m boundary (300s)
    const candles = createSampleCandles(10, 1700000100 - (1700000100 % 300));
    handler({ type: 'LOAD_DATA', payload: { candles } });
    messages.length = 0;

    // Step ahead 6 candles so we have 6 minutes of data
    handler({ type: 'STEP', payload: { delta: 6 } });
    messages.length = 0;

    handler({ type: 'SET_TIMEFRAME', payload: { timeframe: '5m' } });

    const seriesMsg = messages.find(m => m.type === 'SERIES_DATA');
    expect(seriesMsg).toBeDefined();
    expect(seriesMsg?.payload.timeframe).toBe('5m');
    // 7 candles total (index 0..6) spanning 2 5-minute buckets (5 + 2)
    expect(seriesMsg?.payload.candles.length).toBe(2);
  });

  it('handles PLAY and PAUSE messages', () => {
    const messages: WorkerOutMessage[] = [];
    const handler = createSimulationHandler((msg) => messages.push(msg));

    const candles = createSampleCandles(5);
    handler({ type: 'LOAD_DATA', payload: { candles } });
    messages.length = 0;

    handler({ type: 'PLAY' });
    const playState = messages.find(m => m.type === 'REPLAY_STATE');
    expect(playState?.payload.isPlaying).toBe(true);

    messages.length = 0;
    handler({ type: 'PAUSE' });
    const pauseState = messages.find(m => m.type === 'REPLAY_STATE');
    expect(pauseState?.payload.isPlaying).toBe(false);
  });

  it('handles SET_SPEED message', () => {
    const messages: WorkerOutMessage[] = [];
    const handler = createSimulationHandler((msg) => messages.push(msg));

    const candles = createSampleCandles(5);
    handler({ type: 'LOAD_DATA', payload: { candles } });
    messages.length = 0;

    handler({ type: 'SET_SPEED', payload: { speed: 10 } });
    const stateMsg = messages.find(m => m.type === 'REPLAY_STATE');
    expect(stateMsg?.payload.speed).toBe(10);
  });

  it('handles STEP and broadcasts SERIES_DATA and CANDLE_UPDATE', () => {
    const messages: WorkerOutMessage[] = [];
    const handler = createSimulationHandler((msg) => messages.push(msg));

    const candles = createSampleCandles(5);
    handler({ type: 'LOAD_DATA', payload: { candles } });
    messages.length = 0;

    handler({ type: 'STEP', payload: { delta: 2 } });

    const stepSeries = messages.find(m => m.type === 'SERIES_DATA');
    expect(stepSeries).toBeDefined();
    expect(stepSeries?.payload.candles.length).toBe(3); // indices 0, 1, 2
  });

  it('handles JUMP_TO_TIMESTAMP', () => {
    const messages: WorkerOutMessage[] = [];
    const handler = createSimulationHandler((msg) => messages.push(msg));

    const candles = createSampleCandles(10, 1700000000);
    handler({ type: 'LOAD_DATA', payload: { candles } });
    messages.length = 0;

    handler({ type: 'JUMP_TO_TIMESTAMP', payload: { timestamp: 1700000240 } }); // index 4

    const jumpSeries = messages.find(m => m.type === 'SERIES_DATA');
    expect(jumpSeries).toBeDefined();
    expect(jumpSeries?.payload.candles.length).toBe(5); // indices 0..4
  });

  it('handles PLACE_ORDER and CANCEL_ORDER', () => {
    const messages: WorkerOutMessage[] = [];
    const handler = createSimulationHandler((msg) => messages.push(msg));

    const candles = createSampleCandles(5);
    handler({ type: 'LOAD_DATA', payload: { candles } });
    messages.length = 0;

    handler({
      type: 'PLACE_ORDER',
      payload: {
        order: { type: 'LIMIT', side: 'BUY', size: 1, limitPrice: 90 },
      },
    });

    const portfolioMsg = messages.find(m => m.type === 'PORTFOLIO_UPDATE');
    expect(portfolioMsg).toBeDefined();
    expect(portfolioMsg?.payload.pendingOrders.length).toBe(1);
    const orderId = portfolioMsg?.payload.pendingOrders[0].id!;

    messages.length = 0;
    handler({ type: 'CANCEL_ORDER', payload: { orderId } });

    const updateMsg = messages.find(m => m.type === 'PORTFOLIO_UPDATE');
    expect(updateMsg?.payload.pendingOrders.length).toBe(0);
  });

  it('handles CLOSE_POSITION', () => {
    const messages: WorkerOutMessage[] = [];
    const handler = createSimulationHandler((msg) => messages.push(msg));

    const candles = createSampleCandles(5);
    handler({ type: 'LOAD_DATA', payload: { candles } });

    // Place a market buy order
    handler({
      type: 'PLACE_ORDER',
      payload: {
        order: { type: 'MARKET', side: 'BUY', size: 1 },
      },
    });

    // Step 1 bar to execute market order
    handler({ type: 'STEP', payload: { delta: 1 } });

    const lastPortfolio = [...messages].reverse().find(m => m.type === 'PORTFOLIO_UPDATE');
    expect(lastPortfolio?.payload.positions.length).toBe(1);
    const posId = lastPortfolio?.payload.positions[0].id!;

    messages.length = 0;
    handler({ type: 'CLOSE_POSITION', payload: { positionId: posId } });

    const closedPortfolio = messages.find(m => m.type === 'PORTFOLIO_UPDATE');
    expect(closedPortfolio?.payload.positions.length).toBe(0);
    expect(closedPortfolio?.payload.closedTrades.length).toBe(1);
  });

  it('produces isNewBar: false on intra-bucket updates for higher timeframes', () => {
    const messages: WorkerOutMessage[] = [];
    const handler = createSimulationHandler((msg) => messages.push(msg));

    // Align start to 5m (300s) boundary
    const baseTime = 1700000000 - (1700000000 % 300);
    const candles = createSampleCandles(10, baseTime);

    handler({ type: 'LOAD_DATA', payload: { candles } });
    handler({ type: 'SET_TIMEFRAME', payload: { timeframe: '5m' } });
    messages.length = 0;

    // Step 1 candle (this candle is 60s later, so still in same 5m bucket)
    handler({ type: 'STEP', payload: { delta: 1 } });

    const candleUpdates = messages.filter(m => m.type === 'CANDLE_UPDATE');
    expect(candleUpdates.length).toBeGreaterThan(0);
    const lastUpdate = candleUpdates[candleUpdates.length - 1];
    expect(lastUpdate.payload.isNewBar).toBe(false);
    expect(lastUpdate.payload.candle.time).toBe(baseTime);
  });
});
