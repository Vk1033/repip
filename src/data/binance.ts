import { Candle } from '../types/market';

export async function fetchBinance1mKlines(
  symbol: string = 'BTCUSDT',
  limitOrStartTime: number = 1000,
  endTimeOrLimit?: number,
  startTime?: number
): Promise<Candle[]> {
  let limit = 1000;
  let end: number | undefined;
  let start: number | undefined;

  if (limitOrStartTime > 10000) {
    // Called as (symbol, startTime, limit)
    start = limitOrStartTime;
    if (endTimeOrLimit !== undefined && endTimeOrLimit <= 1000) {
      limit = endTimeOrLimit;
    }
  } else {
    // Called as (symbol, limit, endTime, startTime)
    limit = limitOrStartTime;
    end = endTimeOrLimit;
    start = startTime;
  }

  const params = new URLSearchParams({
    symbol: symbol.toUpperCase(),
    interval: '1m',
    limit: limit.toString(),
  });

  if (start !== undefined) {
    const ms = start > 1e11 ? start : start * 1000;
    params.append('startTime', ms.toString());
  }
  if (end !== undefined) {
    const ms = end > 1e11 ? end : end * 1000;
    params.append('endTime', ms.toString());
  }

  const response = await fetch(`https://api.binance.com/api/v3/klines?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Binance API returned invalid data format');
  }

  return data.map((d: any[]): Candle => ({
    time: Math.floor(d[0] / 1000),
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
    volume: parseFloat(d[5]),
  }));
}
