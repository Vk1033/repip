import { CandleBuffer } from './candle-buffer';
import { Candle } from '../types/market';

export interface ReplayState {
  currentIndex: number;
  isPlaying: boolean;
  speed: number; // bars per second (0.5 to 60)
  currentCandle: Candle | null;
  totalCandles: number;
}

export type TickCallback = (candle: Candle, index: number) => void;

export class ReplayClock {
  private buffer: CandleBuffer;
  private currentIndex: number;
  private isPlaying: boolean = false;
  private speed: number = 1; // 1 bar per second default
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private onTickListeners: Set<TickCallback> = new Set();
  private lastTickTime: number = 0;
  private nextTickTarget: number = 0;

  constructor(buffer: CandleBuffer, initialIndex: number = 0) {
    this.buffer = buffer;
    this.currentIndex = buffer.length > 0
      ? Math.max(0, Math.min(initialIndex, buffer.length - 1))
      : 0;
  }

  setBuffer(buffer: CandleBuffer, initialIndex: number = 0): void {
    this.pause();
    this.buffer = buffer;
    this.currentIndex = buffer.length > 0
      ? Math.max(0, Math.min(initialIndex, buffer.length - 1))
      : 0;
  }

  onTick(listener: TickCallback): () => void {
    this.onTickListeners.add(listener);
    return () => {
      this.onTickListeners.delete(listener);
    };
  }

  private notify(): void {
    const candle = this.buffer.getCandle(this.currentIndex);
    if (candle) {
      Array.from(this.onTickListeners).forEach(fn => fn(candle, this.currentIndex));
    }
  }

  getState(): ReplayState {
    return {
      currentIndex: this.currentIndex,
      isPlaying: this.isPlaying,
      speed: this.speed,
      currentCandle: this.buffer.getCandle(this.currentIndex),
      totalCandles: this.buffer.length,
    };
  }

  getLastTickTime(): number {
    return this.lastTickTime;
  }

  play(): void {
    if (this.isPlaying || this.buffer.length === 0 || this.currentIndex >= this.buffer.length - 1) {
      return;
    }
    this.isPlaying = true;
    const now = performance.now();
    this.lastTickTime = now;
    const interval = 1000 / this.speed;
    this.nextTickTarget = now + interval;
    this.scheduleTimer(interval);
  }

  pause(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  dispose(): void {
    this.pause();
    this.onTickListeners.clear();
  }

  setSpeed(barsPerSecond: number): void {
    const validSpeed = Number.isFinite(barsPerSecond) ? barsPerSecond : 1;
    this.speed = Math.max(0.1, Math.min(60, validSpeed));
    if (this.isPlaying) {
      if (this.timerId !== null) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
      const now = performance.now();
      this.lastTickTime = now;
      const interval = 1000 / this.speed;
      this.nextTickTarget = now + interval;
      this.scheduleTimer(interval);
    }
  }

  step(delta: number): number {
    this.pause();
    if (this.buffer.length === 0) {
      return 0;
    }
    const target = Math.max(0, Math.min(this.buffer.length - 1, this.currentIndex + delta));
    this.currentIndex = target;
    this.notify();
    return this.currentIndex;
  }

  jumpToIndex(index: number): number {
    this.pause();
    if (this.buffer.length === 0) {
      return 0;
    }
    this.currentIndex = Math.max(0, Math.min(this.buffer.length - 1, index));
    this.notify();
    return this.currentIndex;
  }

  jumpTo(index: number): number {
    return this.jumpToIndex(index);
  }

  jumpToTimestamp(timestampSeconds: number): number {
    const index = this.buffer.findTimestampIndex(timestampSeconds);
    if (index === -1) {
      return 0;
    }
    return this.jumpToIndex(index);
  }

  private scheduleTimer(delay: number): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.timerId = setTimeout(() => {
      this.tick();
    }, Math.max(0, Math.round(delay)));
  }

  private tick(): void {
    this.timerId = null;
    if (!this.isPlaying) return;

    const now = performance.now();
    this.lastTickTime = now;

    if (this.currentIndex >= this.buffer.length - 1) {
      this.pause();
      return;
    }

    this.currentIndex++;
    this.notify();

    if (this.currentIndex >= this.buffer.length - 1) {
      this.pause();
      return;
    }

    const interval = 1000 / this.speed;
    this.nextTickTarget += interval;

    // Guard against massive background freeze
    if (this.nextTickTarget < now - interval * 4) {
      this.nextTickTarget = now + interval;
    }

    const nextDelay = Math.max(0, this.nextTickTarget - performance.now());
    this.scheduleTimer(nextDelay);
  }
}
