import { Candle } from '../types/market';

export async function fetchBinance1mKlines(
  symbol: string = 'BTCUSDT',
  limitOrStart: number = 1000,
  endTimestamp?: number
): Promise<Candle[]> {
  const params = new URLSearchParams({
    symbol: symbol.toUpperCase(),
    interval: '1m',
  });

  if (limitOrStart > 10000) {
    const startMs = limitOrStart > 1e11 ? limitOrStart : limitOrStart * 1000;
    params.set('startTime', Math.floor(startMs).toString());
  } else {
    params.set('limit', limitOrStart.toString());
  }

  if (endTimestamp !== undefined && endTimestamp > 10000) {
    const endMs = endTimestamp > 1e11 ? endTimestamp : endTimestamp * 1000;
    params.set('endTime', Math.floor(endMs).toString());
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
