import Dexie, { type Table } from 'dexie';
import { Candle } from '../types/market';

export interface StoredDataset {
  id?: number;
  symbol: string;
  count: number;
  startTime: number;
  endTime: number;
  candles: Candle[];
}

export class AppDB extends Dexie {
  datasets!: Table<StoredDataset, number>;

  constructor() {
    super('TradingViewCloneDB');
    this.version(1).stores({
      datasets: '++id, symbol, startTime, endTime',
    });
  }
}

export const db = new AppDB();
