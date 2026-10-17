import { describe, it, expect } from 'vitest';
import { CandleBuffer } from '../src/core/candle-buffer';
import { Candle } from '../src/types/market';

describe('CandleBuffer', () => {
  const candles: Candle[] = [
    { time: 1000, open: 10, high: 15, low: 9, close: 12, volume: 100 },
    { time: 1060, open: 12, high: 16, low: 11, close: 14, volume: 150 },
    { time: 1120, open: 14, high: 18, low: 13, close: 17, volume: 200 },
  ];

  it('stores columnar typed arrays and reconstructs candles accurately', () => {
    const buffer = CandleBuffer.fromCandles(candles);
    expect(buffer.length).toBe(3);
    expect(buffer.getCandle(0)).toEqual(candles[0]);
    expect(buffer.getCandle(1)).toEqual(candles[1]);
    expect(buffer.getCandle(2)).toEqual(candles[2]);
  });

  it('returns null for out of bounds getCandle', () => {
    const buffer = CandleBuffer.fromCandles(candles);
    expect(buffer.getCandle(-1)).toBeNull();
    expect(buffer.getCandle(3)).toBeNull();
    expect(buffer.getCandle(100)).toBeNull();
  });

  it('performs binary search to find exact and closest preceding timestamp indices', () => {
    const buffer = CandleBuffer.fromCandles(candles);
    expect(buffer.findTimestampIndex(1000)).toBe(0);
    expect(buffer.findTimestampIndex(1060)).toBe(1);
    expect(buffer.findTimestampIndex(1120)).toBe(2);

    // Midpoint search (closest before)
    expect(buffer.findTimestampIndex(1090)).toBe(1);
    // Before first
    expect(buffer.findTimestampIndex(500)).toBe(0);
    // After last
    expect(buffer.findTimestampIndex(2000)).toBe(2);
  });

  it('handles binary search on empty buffer', () => {
    const emptyBuffer = CandleBuffer.fromCandles([]);
    expect(emptyBuffer.length).toBe(0);
    expect(emptyBuffer.findTimestampIndex(1000)).toBe(-1);
    expect(emptyBuffer.getCandle(0)).toBeNull();
    expect(emptyBuffer.sliceCandles(0, 5)).toEqual([]);
  });

  it('slices candles correctly within and beyond bounds', () => {
    const buffer = CandleBuffer.fromCandles(candles);
    expect(buffer.sliceCandles(0, 2)).toEqual([candles[0], candles[1]]);
    expect(buffer.sliceCandles(1, 3)).toEqual([candles[1], candles[2]]);
    // Clamping
    expect(buffer.sliceCandles(-2, 10)).toEqual(candles);
    expect(buffer.sliceCandles(2, 1)).toEqual([]);
  });

  it('throws an error if input arrays have mismatched lengths', () => {
    const valid = new Float64Array(3);
    const short = new Float64Array(2);
    expect(() => new CandleBuffer(valid, short, valid, valid, valid, valid)).toThrow(
      /CandleBuffer array length mismatch/
    );
    expect(() => new CandleBuffer(valid, valid, short, valid, valid, valid)).toThrow(
      /CandleBuffer array length mismatch/
    );
    expect(() => new CandleBuffer(valid, valid, valid, short, valid, valid)).toThrow(
      /CandleBuffer array length mismatch/
    );
    expect(() => new CandleBuffer(valid, valid, valid, valid, short, valid)).toThrow(
      /CandleBuffer array length mismatch/
    );
    expect(() => new CandleBuffer(valid, valid, valid, valid, valid, short)).toThrow(
      /CandleBuffer array length mismatch/
    );
  });
});
