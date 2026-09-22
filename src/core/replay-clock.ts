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
  private timerId: ReturnType<typeof setInterval> | null = null;
  private onTickListeners: Set<TickCallback> = new Set();

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

  play(): void {
    if (this.isPlaying || this.buffer.length === 0 || this.currentIndex >= this.buffer.length - 1) {
      return;
    }
    this.isPlaying = true;
    this.scheduleTimer();
  }

  pause(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  setSpeed(barsPerSecond: number): void {
    const validSpeed = Number.isFinite(barsPerSecond) ? barsPerSecond : 1;
    this.speed = Math.max(0.1, Math.min(60, validSpeed));
    if (this.isPlaying) {
      this.scheduleTimer();
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

  private scheduleTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
    }

    const intervalMs = Math.max(16, Math.floor(1000 / this.speed));
    this.timerId = setInterval(() => {
      if (this.currentIndex >= this.buffer.length - 1) {
        this.pause();
        return;
      }
      this.currentIndex++;
      this.notify();
    }, intervalMs);
  }
}
