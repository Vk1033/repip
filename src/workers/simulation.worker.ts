import { Timeframe, TIMEFRAME_SECONDS } from '../types/market';
import { CandleBuffer } from '../core/candle-buffer';
import { ReplayClock } from '../core/replay-clock';
import { resampleCandles, getBucketTimestamp, aggregateCandles } from '../core/resampler';
import { PaperTradingEngine } from '../core/paper-trading';
import { WorkerInMessage, WorkerOutMessage } from './protocol';

export function createSimulationHandler(post: (msg: WorkerOutMessage) => void) {
  let buffer: CandleBuffer = CandleBuffer.fromCandles([]);
  let clock: ReplayClock = new ReplayClock(buffer, 0);
  let tradingEngine: PaperTradingEngine = new PaperTradingEngine();
  let activeTimeframe: Timeframe = '1m';
  let lastBucketTime: number = 0;

  function broadcastSeriesData() {
    if (buffer.length === 0) return;
    const state = clock.getState();
    const rawSlice = buffer.sliceCandles(0, state.currentIndex + 1);
    const targetSeconds = TIMEFRAME_SECONDS[activeTimeframe];
    const aggregated = resampleCandles(rawSlice, targetSeconds);

    post({
      type: 'SERIES_DATA',
      payload: { candles: aggregated, timeframe: activeTimeframe },
    });

    if (aggregated.length > 0) {
      lastBucketTime = aggregated[aggregated.length - 1].time;
    }
  }

  clock.onTick((candle, index) => {
    // Update Paper Trading Engine
    tradingEngine.processCandle(candle);
    post({ type: 'PORTFOLIO_UPDATE', payload: tradingEngine.getPortfolio() });
    post({ type: 'REPLAY_STATE', payload: clock.getState() });

    // Update active candle in selected timeframe
    const targetSeconds = TIMEFRAME_SECONDS[activeTimeframe];
    const bucketTime = getBucketTimestamp(candle.time, targetSeconds);
    const isNewBar = bucketTime !== lastBucketTime;

    if (isNewBar) {
      lastBucketTime = bucketTime;
      post({
        type: 'CANDLE_UPDATE',
        payload: { candle: { ...candle, time: bucketTime }, isNewBar: true },
      });
    } else {
      // Incremental update to current forming bar
      const rawSlice = buffer.sliceCandles(Math.max(0, index - (targetSeconds / 60) + 1), index + 1);
      const inBucket = rawSlice.filter(c => getBucketTimestamp(c.time, targetSeconds) === bucketTime);
      if (inBucket.length > 0) {
        const activeBar = aggregateCandles(inBucket, bucketTime);
        post({
          type: 'CANDLE_UPDATE',
          payload: { candle: activeBar, isNewBar: false },
        });
      }
    }
  });

  return (msg: WorkerInMessage) => {
    switch (msg.type) {
      case 'LOAD_DATA': {
        buffer = CandleBuffer.fromCandles(msg.payload.candles);
        clock.setBuffer(buffer, 0);
        tradingEngine = new PaperTradingEngine();
        post({ type: 'READY', payload: { totalCandles: buffer.length } });
        post({ type: 'REPLAY_STATE', payload: clock.getState() });
        post({ type: 'PORTFOLIO_UPDATE', payload: tradingEngine.getPortfolio() });
        broadcastSeriesData();
        break;
      }
      case 'SET_TIMEFRAME': {
        activeTimeframe = msg.payload.timeframe;
        broadcastSeriesData();
        break;
      }
      case 'PLAY': {
        clock.play();
        post({ type: 'REPLAY_STATE', payload: clock.getState() });
        break;
      }
      case 'PAUSE': {
        clock.pause();
        post({ type: 'REPLAY_STATE', payload: clock.getState() });
        break;
      }
      case 'SET_SPEED': {
        clock.setSpeed(msg.payload.speed);
        post({ type: 'REPLAY_STATE', payload: clock.getState() });
        break;
      }
      case 'STEP': {
        clock.step(msg.payload.delta);
        broadcastSeriesData();
        break;
      }
      case 'JUMP_TO_TIMESTAMP': {
        clock.jumpToTimestamp(msg.payload.timestamp);
        broadcastSeriesData();
        break;
      }
      case 'PLACE_ORDER': {
        tradingEngine.placeOrder(msg.payload.order);
        post({ type: 'PORTFOLIO_UPDATE', payload: tradingEngine.getPortfolio() });
        break;
      }
      case 'CANCEL_ORDER': {
        tradingEngine.cancelOrder(msg.payload.orderId);
        post({ type: 'PORTFOLIO_UPDATE', payload: tradingEngine.getPortfolio() });
        break;
      }
      case 'CLOSE_POSITION': {
        const state = clock.getState();
        if (state.currentCandle) {
          tradingEngine.closePosition(msg.payload.positionId, state.currentCandle.close, state.currentCandle.time);
          post({ type: 'PORTFOLIO_UPDATE', payload: tradingEngine.getPortfolio() });
        }
        break;
      }
    }
  };
}

if (typeof self !== 'undefined' && typeof (self as unknown as { postMessage?: unknown }).postMessage === 'function') {
  const post = (msg: WorkerOutMessage) => {
    (self as unknown as { postMessage: (msg: WorkerOutMessage) => void }).postMessage(msg);
  };
  const handleMessage = createSimulationHandler(post);
  self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
    handleMessage(e.data);
  };
}
