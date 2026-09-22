import { describe, it, expect } from 'vitest';
import { resampleCandles, aggregateCandles, getBucketTimestamp } from '../src/core/resampler';
import { Candle, TIMEFRAME_SECONDS } from '../src/types/market';

describe('Resampler', () => {
  describe('getBucketTimestamp', () => {
    it('should floor timestamp to nearest interval boundary', () => {
      // 1700000125 with 300s interval -> 1700000100 is not necessarily a multiple, let's use exact math
      const interval = 300;
      const base = 1700000100 - (1700000100 % 300);
      expect(getBucketTimestamp(base + 0, interval)).toBe(base);
      expect(getBucketTimestamp(base + 125, interval)).toBe(base);
      expect(getBucketTimestamp(base + 299, interval)).toBe(base);
      expect(getBucketTimestamp(base + 300, interval)).toBe(base + 300);
    });

    it('should handle 1D interval boundaries', () => {
      const interval = TIMEFRAME_SECONDS['1D']; // 86400
      const ts = 1700000000;
      const expectedBucket = ts - (ts % 86400);
      expect(getBucketTimestamp(ts, interval)).toBe(expectedBucket);
    });
  });

  describe('aggregateCandles', () => {
    it('should correctly aggregate open, high, low, close, and sum volume', () => {
      const bucketTime = 1700000000;
      const candles: Candle[] = [
        { time: bucketTime + 0, open: 100, high: 105, low: 98, close: 102, volume: 10 },
        { time: bucketTime + 60, open: 102, high: 108, low: 101, close: 107, volume: 15 },
        { time: bucketTime + 120, open: 107, high: 110, low: 106, close: 109, volume: 20 },
        { time: bucketTime + 180, open: 109, high: 109, low: 95, close: 96, volume: 25 },
        { time: bucketTime + 240, open: 96, high: 101, low: 94, close: 99, volume: 30 },
      ];

      const aggregated = aggregateCandles(candles, bucketTime);
      expect(aggregated).toEqual({
        time: bucketTime,
        open: 100,
        high: 110,
        low: 94,
        close: 99,
        volume: 100,
      });
    });

    it('should throw an error when aggregating an empty candle array', () => {
      expect(() => aggregateCandles([], 1700000000)).toThrow('Cannot aggregate an empty list of candles');
    });

    it('should aggregate a single candle preserving its values with the given bucket time', () => {
      const bucketTime = 1700000000;
      const single: Candle = { time: bucketTime + 45, open: 50, high: 55, low: 48, close: 52, volume: 100 };
      const aggregated = aggregateCandles([single], bucketTime);
      expect(aggregated).toEqual({
        time: bucketTime,
        open: 50,
        high: 55,
        low: 48,
        close: 52,
        volume: 100,
      });
    });
  });

  describe('resampleCandles', () => {
    it('should correctly aggregate 5 1-minute candles into a 5-minute candle', () => {
      const baseTime = 1700000000 - (1700000000 % 300); // Aligned to 5m
      const candles1m: Candle[] = [
        { time: baseTime + 0, open: 100, high: 105, low: 98, close: 102, volume: 10 },
        { time: baseTime + 60, open: 102, high: 108, low: 101, close: 107, volume: 15 },
        { time: baseTime + 120, open: 107, high: 110, low: 106, close: 109, volume: 20 },
        { time: baseTime + 180, open: 109, high: 109, low: 95, close: 96, volume: 25 },
        { time: baseTime + 240, open: 96, high: 101, low: 94, close: 99, volume: 30 },
      ];

      const result = resampleCandles(candles1m, 300);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        time: baseTime,
        open: 100,
        high: 110,
        low: 94,
        close: 99,
        volume: 100,
      });
    });

    it('should return multiple buckets when candles span across timeframe boundaries', () => {
      const baseTime = 1700000000 - (1700000000 % 300);
      const candles: Candle[] = [
        { time: baseTime, open: 10, high: 12, low: 9, close: 11, volume: 5 },
        { time: baseTime + 300, open: 11, high: 15, low: 10, close: 14, volume: 8 },
      ];

      const result = resampleCandles(candles, 300);
      expect(result).toHaveLength(2);
      expect(result[0].time).toBe(baseTime);
      expect(result[1].time).toBe(baseTime + 300);
    });

    it('should return the original array untouched when target interval is 60s (1m)', () => {
      const baseTime = 1700000000;
      const candles: Candle[] = [
        { time: baseTime, open: 100, high: 105, low: 95, close: 102, volume: 10 },
        { time: baseTime + 60, open: 102, high: 107, low: 100, close: 104, volume: 15 },
      ];

      const result = resampleCandles(candles, 60);
      expect(result).toBe(candles);
    });

    it('should return empty array when input is empty', () => {
      const result = resampleCandles([], 300);
      expect(result).toEqual([]);
    });

    it('should handle gaps between candles and produce only buckets that contain data', () => {
      const baseTime = 1700000000 - (1700000000 % 300);
      // Bucket 0 has candle at baseTime + 0
      // Bucket 1 (baseTime + 300) has NO candles
      // Bucket 2 (baseTime + 600) has candle at baseTime + 660 (which is in Bucket 2)
      const candles: Candle[] = [
        { time: baseTime, open: 10, high: 15, low: 9, close: 12, volume: 50 },
        { time: baseTime + 660, open: 14, high: 18, low: 13, close: 17, volume: 70 },
      ];

      const result = resampleCandles(candles, 300);
      expect(result).toHaveLength(2);
      expect(result[0].time).toBe(baseTime);
      expect(result[0].open).toBe(10);
      expect(result[1].time).toBe(baseTime + 600);
      expect(result[1].open).toBe(14);
      expect(result[1].close).toBe(17);
    });

    it('should correctly aggregate into 1h (3600s) buckets with multiple 1m candles', () => {
      const baseTime = 1700000000 - (1700000000 % 3600);
      const candles1m: Candle[] = [];
      for (let i = 0; i < 60; i++) {
        candles1m.push({
          time: baseTime + i * 60,
          open: 100 + i,
          high: 100 + i + 2,
          low: 100 + i - 1,
          close: 100 + i + 1,
          volume: 10,
        });
      }

      const result = resampleCandles(candles1m, 3600);
      expect(result).toHaveLength(1);
      expect(result[0].time).toBe(baseTime);
      expect(result[0].open).toBe(100);
      expect(result[0].close).toBe(100 + 59 + 1); // 160
      expect(result[0].high).toBe(100 + 59 + 2); // 161
      expect(result[0].low).toBe(100 - 1); // 99
      expect(result[0].volume).toBe(600);
    });
  });
});
