import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReplayClock, ReplayState } from '../src/core/replay-clock';
import { CandleBuffer } from '../src/core/candle-buffer';
import { Candle } from '../src/types/market';

describe('ReplayClock', () => {
  const candles: Candle[] = Array.from({ length: 100 }, (_, i) => ({
    time: 1700000000 + i * 60,
    open: 100 + i,
    high: 102 + i,
    low: 99 + i,
    close: 101 + i,
    volume: 50,
  }));
  const buffer = CandleBuffer.fromCandles(candles);

  it('initializes at the requested starting index in paused state', () => {
    const clock = new ReplayClock(buffer, 10);
    const state: ReplayState = clock.getState();
    expect(state.currentIndex).toBe(10);
    expect(state.isPlaying).toBe(false);
    expect(state.speed).toBe(1);
    expect(state.totalCandles).toBe(100);
    expect(state.currentCandle).toEqual(candles[10]);
  });

  it('clamps initial index within valid bounds', () => {
    const clockNegative = new ReplayClock(buffer, -5);
    expect(clockNegative.getState().currentIndex).toBe(0);

    const clockOverflow = new ReplayClock(buffer, 500);
    expect(clockOverflow.getState().currentIndex).toBe(99);
  });

  it('handles empty buffer gracefully', () => {
    const emptyBuffer = CandleBuffer.fromCandles([]);
    const clock = new ReplayClock(emptyBuffer, 0);
    const state = clock.getState();
    expect(state.currentIndex).toBe(0);
    expect(state.totalCandles).toBe(0);
    expect(state.currentCandle).toBeNull();
    expect(state.isPlaying).toBe(false);

    // Play should be a no-op on empty buffer
    clock.play();
    expect(clock.getState().isPlaying).toBe(false);
  });

  it('steps forward and backward within valid bounds', () => {
    const clock = new ReplayClock(buffer, 10);
    expect(clock.step(5)).toBe(15);
    expect(clock.step(-3)).toBe(12);
    expect(clock.step(-20)).toBe(0); // Clamped at 0
    expect(clock.step(200)).toBe(99); // Clamped at max length - 1
  });

  it('jumps to timestamp correctly', () => {
    const clock = new ReplayClock(buffer, 0);
    const targetTime = 1700000000 + 42 * 60;
    clock.jumpToTimestamp(targetTime);
    expect(clock.getState().currentIndex).toBe(42);
  });

  it('jumps to index correctly and clamps out-of-bounds targets', () => {
    const clock = new ReplayClock(buffer, 10);
    expect(clock.jumpToIndex(50)).toBe(50);
    expect(clock.getState().currentIndex).toBe(50);

    // jumpTo alias
    expect(clock.jumpTo(25)).toBe(25);
    expect(clock.getState().currentIndex).toBe(25);

    // Clamping
    expect(clock.jumpToIndex(-10)).toBe(0);
    expect(clock.jumpToIndex(1000)).toBe(99);
  });

  it('notifies onTick listeners when stepping and jumping', () => {
    const clock = new ReplayClock(buffer, 0);
    const received: Array<{ candle: Candle; index: number }> = [];

    const unsubscribe = clock.onTick((candle, index) => {
      received.push({ candle, index });
    });

    clock.step(2);
    expect(received).toHaveLength(1);
    expect(received[0].index).toBe(2);
    expect(received[0].candle).toEqual(candles[2]);

    clock.jumpToIndex(10);
    expect(received).toHaveLength(2);
    expect(received[1].index).toBe(10);
    expect(received[1].candle).toEqual(candles[10]);

    // Unsubscribe stops notifications
    unsubscribe();
    clock.step(1);
    expect(received).toHaveLength(2);
  });

  describe('Playback with fake timers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('plays forward at default 1 bar per second (1000ms interval)', () => {
      const clock = new ReplayClock(buffer, 0);
      const ticks: number[] = [];
      clock.onTick((_, index) => ticks.push(index));

      clock.play();
      expect(clock.getState().isPlaying).toBe(true);

      vi.advanceTimersByTime(1000);
      expect(clock.getState().currentIndex).toBe(1);
      expect(ticks).toEqual([1]);

      vi.advanceTimersByTime(2000);
      expect(clock.getState().currentIndex).toBe(3);
      expect(ticks).toEqual([1, 2, 3]);

      clock.pause();
      expect(clock.getState().isPlaying).toBe(false);

      vi.advanceTimersByTime(2000);
      expect(clock.getState().currentIndex).toBe(3);
      expect(ticks).toEqual([1, 2, 3]);
    });

    it('adjusts playback speed and reschedules active timer', () => {
      const clock = new ReplayClock(buffer, 0);
      clock.setSpeed(2); // 2 bars/sec -> 500ms per bar
      expect(clock.getState().speed).toBe(2);

      clock.play();

      vi.advanceTimersByTime(500);
      expect(clock.getState().currentIndex).toBe(1);

      // Change speed dynamically while playing to 4 bars/sec -> 250ms per bar
      clock.setSpeed(4);
      expect(clock.getState().speed).toBe(4);

      vi.advanceTimersByTime(250);
      expect(clock.getState().currentIndex).toBe(2);

      clock.pause();
    });

    it('clamps speed between 0.1 and 60', () => {
      const clock = new ReplayClock(buffer, 0);
      clock.setSpeed(0.01);
      expect(clock.getState().speed).toBe(0.1);

      clock.setSpeed(100);
      expect(clock.getState().speed).toBe(60);
    });

    it('pauses automatically when reaching end of candle buffer', () => {
      const clock = new ReplayClock(buffer, 98);
      clock.play();
      expect(clock.getState().isPlaying).toBe(true);

      // Advance one tick -> moves to index 99
      vi.advanceTimersByTime(1000);
      expect(clock.getState().currentIndex).toBe(99);

      // Advance next tick -> reaches end, pauses
      vi.advanceTimersByTime(1000);
      expect(clock.getState().currentIndex).toBe(99);
      expect(clock.getState().isPlaying).toBe(false);
    });

    it('step and jump pause active playback', () => {
      const clock = new ReplayClock(buffer, 10);
      clock.play();
      expect(clock.getState().isPlaying).toBe(true);

      clock.step(1);
      expect(clock.getState().isPlaying).toBe(false);

      clock.play();
      expect(clock.getState().isPlaying).toBe(true);

      clock.jumpToIndex(20);
      expect(clock.getState().isPlaying).toBe(false);
    });

    it('setBuffer pauses playback, replaces buffer, and resets index', () => {
      const clock = new ReplayClock(buffer, 10);
      clock.play();

      const newCandles = candles.slice(0, 20);
      const newBuffer = CandleBuffer.fromCandles(newCandles);

      clock.setBuffer(newBuffer, 5);
      const state = clock.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.currentIndex).toBe(5);
      expect(state.totalCandles).toBe(20);
      expect(state.currentCandle).toEqual(newCandles[5]);
    });
  });
});
