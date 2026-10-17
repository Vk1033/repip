import { Candle } from '../types/market';

export function getBucketTimestamp(timestamp: number, intervalSeconds: number): number {
  return timestamp - (timestamp % intervalSeconds);
}

export function aggregateCandles(candles: Candle[], bucketTime: number): Candle {
  if (candles.length === 0) {
    throw new Error('Cannot aggregate an empty list of candles');
  }

  const open = candles[0].open;
  const close = candles[candles.length - 1].close;
  let high = -Infinity;
  let low = Infinity;
  let volume = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (c.high > high) high = c.high;
    if (c.low < low) low = c.low;
    volume += c.volume;
  }

  return {
    time: bucketTime,
    open,
    high,
    low,
    close,
    volume,
  };
}

export function resampleCandles(candles1m: Candle[], targetIntervalSeconds: number): Candle[] {
  if (targetIntervalSeconds === 60 || candles1m.length === 0) {
    return candles1m;
  }

  const resampled: Candle[] = [];
  let currentBucketTime = getBucketTimestamp(candles1m[0].time, targetIntervalSeconds);
  let currentBucket: Candle[] = [];

  for (let i = 0; i < candles1m.length; i++) {
    const c = candles1m[i];
    const bucketTime = getBucketTimestamp(c.time, targetIntervalSeconds);

    if (bucketTime !== currentBucketTime) {
      if (currentBucket.length > 0) {
        resampled.push(aggregateCandles(currentBucket, currentBucketTime));
      }
      currentBucketTime = bucketTime;
      currentBucket = [c];
    } else {
      currentBucket.push(c);
    }
  }

  if (currentBucket.length > 0) {
    resampled.push(aggregateCandles(currentBucket, currentBucketTime));
  }

  return resampled;
}
