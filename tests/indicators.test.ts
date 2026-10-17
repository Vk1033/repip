import { describe, it, expect } from 'vitest';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateBollingerBands,
  calculateMACD,
} from '../src/core/indicators';
import { Candle } from '../src/types/market';

describe('Indicators', () => {
  const candles: Candle[] = [
    { time: 100, open: 10, high: 12, low: 9, close: 10, volume: 100 },
    { time: 160, open: 10, high: 13, low: 10, close: 12, volume: 100 },
    { time: 220, open: 12, high: 15, low: 11, close: 14, volume: 100 },
    { time: 280, open: 14, high: 16, low: 13, close: 16, volume: 100 },
    { time: 340, open: 16, high: 19, low: 15, close: 18, volume: 100 },
  ];

  describe('calculateSMA', () => {
    it('calculates Simple Moving Average (SMA)', () => {
      const sma3 = calculateSMA(candles, 3);
      expect(sma3).toHaveLength(5);
      // index 0: null, index 1: null, index 2: (10+12+14)/3 = 12
      expect(sma3[0].time).toBe(100);
      expect(sma3[0].value).toBeUndefined();
      expect(sma3[1].time).toBe(160);
      expect(sma3[1].value).toBeUndefined();
      expect(sma3[2].time).toBe(220);
      expect(sma3[2].value).toBeCloseTo(12, 4);
      expect(sma3[3].time).toBe(280);
      expect(sma3[3].value).toBeCloseTo(14, 4);
      expect(sma3[4].time).toBe(340);
      expect(sma3[4].value).toBeCloseTo(16, 4);
    });

    it('handles period = 1 correctly', () => {
      const sma1 = calculateSMA(candles, 1);
      expect(sma1).toHaveLength(5);
      expect(sma1[0].value).toBe(10);
      expect(sma1[1].value).toBe(12);
      expect(sma1[2].value).toBe(14);
      expect(sma1[3].value).toBe(16);
      expect(sma1[4].value).toBe(18);
    });

    it('returns undefined values when period exceeds candle count', () => {
      const sma10 = calculateSMA(candles, 10);
      expect(sma10).toHaveLength(5);
      sma10.forEach((pt, idx) => {
        expect(pt.time).toBe(candles[idx].time);
        expect(pt.value).toBeUndefined();
      });
    });

    it('handles empty candles array', () => {
      const result = calculateSMA([], 3);
      expect(result).toEqual([]);
    });

    it('handles invalid period <= 0', () => {
      const result = calculateSMA(candles, 0);
      expect(result).toHaveLength(5);
      expect(result[0].value).toBeUndefined();
    });
  });

  describe('calculateEMA', () => {
    it('calculates Exponential Moving Average (EMA)', () => {
      const ema3 = calculateEMA(candles, 3);
      expect(ema3).toHaveLength(5);
      expect(ema3[0].value).toBeUndefined();
      expect(ema3[1].value).toBeUndefined();
      // Period 3 seed is SMA of first 3: (10+12+14)/3 = 12
      expect(ema3[2].value).toBeCloseTo(12, 4);
      // alpha = 2 / (3 + 1) = 0.5
      // ema[3] = 16 * 0.5 + 12 * 0.5 = 14
      expect(ema3[3].value).toBeCloseTo(14, 4);
      // ema[4] = 18 * 0.5 + 14 * 0.5 = 16
      expect(ema3[4].value).toBeCloseTo(16, 4);
    });

    it('handles period = 1 correctly', () => {
      const ema1 = calculateEMA(candles, 1);
      expect(ema1).toHaveLength(5);
      expect(ema1[0].value).toBe(10);
      expect(ema1[1].value).toBe(12);
      expect(ema1[4].value).toBe(18);
    });

    it('returns undefined values when period exceeds candle count', () => {
      const ema10 = calculateEMA(candles, 10);
      expect(ema10).toHaveLength(5);
      ema10.forEach((pt) => {
        expect(pt.value).toBeUndefined();
      });
    });

    it('handles empty candles array', () => {
      const result = calculateEMA([], 3);
      expect(result).toEqual([]);
    });
  });

  describe('calculateRSI', () => {
    it('calculates RSI using Wilder smoothing technique', () => {
      const rsiCandles: Candle[] = [
        { time: 100, open: 10, high: 10, low: 10, close: 10, volume: 100 },
        { time: 160, open: 12, high: 12, low: 12, close: 12, volume: 100 }, // +2
        { time: 220, open: 11, high: 11, low: 11, close: 11, volume: 100 }, // -1
        { time: 280, open: 14, high: 14, low: 14, close: 14, volume: 100 }, // +3
        { time: 340, open: 13, high: 13, low: 13, close: 13, volume: 100 }, // -1
      ];

      // Period = 3
      // First 3 changes: +2, -1, +3 -> avgGain = (2+0+3)/3 = 5/3, avgLoss = (0+1+0)/3 = 1/3
      // RS = 5, RSI = 100 - 100/(1+5) = 83.3333 at index 3
      // Next change: -1 -> gain = 0, loss = 1
      // smoothed avgGain = (5/3 * 2 + 0)/3 = 10/9
      // smoothed avgLoss = (1/3 * 2 + 1)/3 = 5/9
      // RS = 2, RSI = 100 - 100/(1+2) = 66.6667 at index 4
      const rsi3 = calculateRSI(rsiCandles, 3);
      expect(rsi3).toHaveLength(5);
      expect(rsi3[0].value).toBeUndefined();
      expect(rsi3[1].value).toBeUndefined();
      expect(rsi3[2].value).toBeUndefined();
      expect(rsi3[3].value).toBeCloseTo(83.3333, 3);
      expect(rsi3[4].value).toBeCloseTo(66.6667, 3);
    });

    it('returns 100 when all price movements are gains (zero loss)', () => {
      const upCandles: Candle[] = [
        { time: 100, open: 10, high: 10, low: 10, close: 10, volume: 100 },
        { time: 160, open: 11, high: 11, low: 11, close: 11, volume: 100 },
        { time: 220, open: 12, high: 12, low: 12, close: 12, volume: 100 },
        { time: 280, open: 13, high: 13, low: 13, close: 13, volume: 100 },
        { time: 340, open: 14, high: 14, low: 14, close: 14, volume: 100 },
      ];
      const rsi3 = calculateRSI(upCandles, 3);
      expect(rsi3[3].value).toBe(100);
      expect(rsi3[4].value).toBe(100);
    });

    it('returns 0 when all price movements are losses (zero gain)', () => {
      const downCandles: Candle[] = [
        { time: 100, open: 20, high: 20, low: 20, close: 20, volume: 100 },
        { time: 160, open: 18, high: 18, low: 18, close: 18, volume: 100 },
        { time: 220, open: 16, high: 16, low: 16, close: 16, volume: 100 },
        { time: 280, open: 14, high: 14, low: 14, close: 14, volume: 100 },
        { time: 340, open: 12, high: 12, low: 12, close: 12, volume: 100 },
      ];
      const rsi3 = calculateRSI(downCandles, 3);
      expect(rsi3[3].value).toBe(0);
      expect(rsi3[4].value).toBe(0);
    });

    it('handles flat prices (zero gain and zero loss)', () => {
      const flatCandles: Candle[] = [
        { time: 100, open: 10, high: 10, low: 10, close: 10, volume: 100 },
        { time: 160, open: 10, high: 10, low: 10, close: 10, volume: 100 },
        { time: 220, open: 10, high: 10, low: 10, close: 10, volume: 100 },
        { time: 280, open: 10, high: 10, low: 10, close: 10, volume: 100 },
      ];
      const rsi3 = calculateRSI(flatCandles, 3);
      expect(rsi3[3].value).toBe(50);
    });

    it('returns undefined when candles count <= period', () => {
      const rsi14 = calculateRSI(candles, 14);
      expect(rsi14).toHaveLength(5);
      rsi14.forEach((pt) => {
        expect(pt.value).toBeUndefined();
      });
    });

    it('handles empty candles array', () => {
      const result = calculateRSI([], 14);
      expect(result).toEqual([]);
    });
  });

  describe('calculateBollingerBands', () => {
    it('calculates middle, upper, and lower Bollinger Bands', () => {
      // candles close: [10, 12, 14, 16, 18], period = 3, stdDevMultiplier = 2
      // for index 2: mean = 12, variance = ((10-12)^2 + 0 + (14-12)^2)/3 = 8/3 = 2.6667
      // stdDev = sqrt(8/3) ≈ 1.63299
      // middle = 12, upper ≈ 15.2660, lower ≈ 8.7340
      const bb3 = calculateBollingerBands(candles, 3, 2);
      expect(bb3).toHaveLength(5);
      expect(bb3[0].middle).toBeUndefined();
      expect(bb3[0].upper).toBeUndefined();
      expect(bb3[0].lower).toBeUndefined();
      expect(bb3[1].middle).toBeUndefined();

      expect(bb3[2].middle).toBeCloseTo(12, 4);
      expect(bb3[2].upper).toBeCloseTo(12 + 2 * Math.sqrt(8 / 3), 4);
      expect(bb3[2].lower).toBeCloseTo(12 - 2 * Math.sqrt(8 / 3), 4);

      expect(bb3[3].middle).toBeCloseTo(14, 4);
      expect(bb3[3].upper).toBeCloseTo(14 + 2 * Math.sqrt(8 / 3), 4);
      expect(bb3[3].lower).toBeCloseTo(14 - 2 * Math.sqrt(8 / 3), 4);

      expect(bb3[4].middle).toBeCloseTo(16, 4);
      expect(bb3[4].upper).toBeCloseTo(16 + 2 * Math.sqrt(8 / 3), 4);
      expect(bb3[4].lower).toBeCloseTo(16 - 2 * Math.sqrt(8 / 3), 4);
    });

    it('returns undefined band values when candle count is insufficient', () => {
      const bb20 = calculateBollingerBands(candles, 20, 2);
      expect(bb20).toHaveLength(5);
      bb20.forEach((pt) => {
        expect(pt.middle).toBeUndefined();
        expect(pt.upper).toBeUndefined();
        expect(pt.lower).toBeUndefined();
      });
    });

    it('handles empty candles array', () => {
      const result = calculateBollingerBands([], 20, 2);
      expect(result).toEqual([]);
    });
  });

  describe('calculateMACD', () => {
    it('calculates MACD line, signal line, and histogram', () => {
      // 10 candles with distinct trend
      const testCandles: Candle[] = Array.from({ length: 10 }, (_, i) => ({
        time: 1000 + i * 60,
        open: 100 + i * 2,
        high: 102 + i * 2,
        low: 99 + i * 2,
        close: 100 + i * 2,
        volume: 100,
      }));

      // fast=3, slow=5, signal=3
      const macd = calculateMACD(testCandles, 3, 5, 3);
      expect(macd).toHaveLength(10);
      // First 4 candles (0..3) have undefined macd because slow period is 5
      expect(macd[0].macd).toBeUndefined();
      expect(macd[3].macd).toBeUndefined();
      // Candle 4 (5th candle) has first macd value
      expect(macd[4].macd).toBeDefined();
      // Signal requires 3 macd values: candles 4, 5, 6
      expect(macd[4].signal).toBeUndefined();
      expect(macd[5].signal).toBeUndefined();
      expect(macd[6].signal).toBeDefined();
      expect(macd[6].histogram).toBeCloseTo(macd[6].macd! - macd[6].signal!, 4);
    });

    it('handles empty candles array', () => {
      const result = calculateMACD([]);
      expect(result).toEqual([]);
    });
  });
});
