import { Candle } from '../types/market';

export class CandleBuffer {
  readonly time: Float64Array;
  readonly open: Float64Array;
  readonly high: Float64Array;
  readonly low: Float64Array;
  readonly close: Float64Array;
  readonly volume: Float64Array;
  readonly length: number;

  constructor(
    time: Float64Array,
    open: Float64Array,
    high: Float64Array,
    low: Float64Array,
    close: Float64Array,
    volume: Float64Array
  ) {
    const len = time.length;
    if (
      open.length !== len ||
      high.length !== len ||
      low.length !== len ||
      close.length !== len ||
      volume.length !== len
    ) {
      throw new Error(
        `CandleBuffer array length mismatch: time(${len}), open(${open.length}), high(${high.length}), low(${low.length}), close(${close.length}), volume(${volume.length})`
      );
    }
    this.time = time;
    this.open = open;
    this.high = high;
    this.low = low;
    this.close = close;
    this.volume = volume;
    this.length = len;
  }

  static fromCandles(candles: Candle[]): CandleBuffer {
    const len = candles.length;
    const time = new Float64Array(len);
    const open = new Float64Array(len);
    const high = new Float64Array(len);
    const low = new Float64Array(len);
    const close = new Float64Array(len);
    const volume = new Float64Array(len);

    for (let i = 0; i < len; i++) {
      const c = candles[i];
      time[i] = c.time;
      open[i] = c.open;
      high[i] = c.high;
      low[i] = c.low;
      close[i] = c.close;
      volume[i] = c.volume;
    }

    return new CandleBuffer(time, open, high, low, close, volume);
  }

  getCandle(index: number): Candle | null {
    if (index < 0 || index >= this.length) return null;
    return {
      time: this.time[index],
      open: this.open[index],
      high: this.high[index],
      low: this.low[index],
      close: this.close[index],
      volume: this.volume[index],
    };
  }

  findTimestampIndex(targetTime: number): number {
    if (this.length === 0) return -1;
    if (targetTime <= this.time[0]) return 0;
    if (targetTime >= this.time[this.length - 1]) return this.length - 1;

    let left = 0;
    let right = this.length - 1;
    let best = 0;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midTime = this.time[mid];

      if (midTime === targetTime) {
        return mid;
      } else if (midTime < targetTime) {
        best = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return best;
  }

  sliceCandles(startIndex: number, endIndex: number): Candle[] {
    const start = Math.max(0, startIndex);
    const end = Math.min(this.length, endIndex);
    const result: Candle[] = [];

    for (let i = start; i < end; i++) {
      result.push({
        time: this.time[i],
        open: this.open[i],
        high: this.high[i],
        low: this.low[i],
        close: this.close[i],
        volume: this.volume[i],
      });
    }

    return result;
  }
}
