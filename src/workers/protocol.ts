import { Candle, Timeframe } from '../types/market';
import { OrderRequest, PortfolioState } from '../core/paper-trading';
import { ReplayState } from '../core/replay-clock';

export type WorkerInMessage =
  | { type: 'LOAD_DATA'; payload: { candles: Candle[] } }
  | { type: 'SET_TIMEFRAME'; payload: { timeframe: Timeframe } }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SET_SPEED'; payload: { speed: number } }
  | { type: 'STEP'; payload: { delta: number } }
  | { type: 'JUMP_TO_TIMESTAMP'; payload: { timestamp: number } }
  | { type: 'PLACE_ORDER'; payload: { order: OrderRequest } }
  | { type: 'CANCEL_ORDER'; payload: { orderId: string } }
  | { type: 'CLOSE_POSITION'; payload: { positionId: string } };

export type WorkerOutMessage =
  | { type: 'READY'; payload: { totalCandles: number } }
  | { type: 'REPLAY_STATE'; payload: ReplayState }
  | { type: 'SERIES_DATA'; payload: { candles: Candle[]; timeframe: Timeframe } }
  | { type: 'CANDLE_UPDATE'; payload: { candle: Candle; isNewBar: boolean } }
  | { type: 'PORTFOLIO_UPDATE'; payload: PortfolioState };
