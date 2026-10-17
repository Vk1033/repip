import { Candle } from '../types/market';

export interface IndicatorPoint {
  time: number;
  value?: number;
}

export interface MACDPoint {
  time: number;
  macd?: number;
  signal?: number;
  histogram?: number;
}

export interface BollingerBandsPoint {
  time: number;
  upper?: number;
  middle?: number;
  lower?: number;
}

export function calculateSMA(candles: Candle[], period: number): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  if (candles.length === 0) return result;
  if (period <= 0) return candles.map((c) => ({ time: c.time }));

  let sum = 0;

  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) {
      sum -= candles[i - period].close;
    }

    if (i >= period - 1) {
      result.push({ time: candles[i].time, value: sum / period });
    } else {
      result.push({ time: candles[i].time });
    }
  }

  return result;
}

export function calculateEMA(candles: Candle[], period: number): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  if (candles.length === 0) return result;
  if (period <= 0) return candles.map((c) => ({ time: c.time }));

  const alpha = 2 / (period + 1);
  let prevEMA: number | null = null;
  let sum = 0;

  for (let i = 0; i < candles.length; i++) {
    const close = candles[i].close;

    if (i < period - 1) {
      sum += close;
      result.push({ time: candles[i].time });
    } else if (i === period - 1) {
      sum += close;
      prevEMA = sum / period;
      result.push({ time: candles[i].time, value: prevEMA });
    } else {
      prevEMA = close * alpha + (prevEMA as number) * (1 - alpha);
      result.push({ time: candles[i].time, value: prevEMA });
    }
  }

  return result;
}

export function calculateRSI(candles: Candle[], period: number = 14): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  if (candles.length === 0) return result;
  if (period <= 0 || candles.length <= period) {
    return candles.map((c) => ({ time: c.time }));
  }

  let avgGain = 0;
  let avgLoss = 0;

  // First period
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }

  avgGain /= period;
  avgLoss /= period;

  for (let i = 0; i < period; i++) {
    result.push({ time: candles[i].time });
  }

  const computeRsi = (gain: number, loss: number): number => {
    if (loss === 0) {
      return gain === 0 ? 50 : 100;
    }
    const rs = gain / loss;
    return 100 - 100 / (1 + rs);
  };

  result.push({ time: candles[period].time, value: computeRsi(avgGain, avgLoss) });

  // Subsequent periods (Wilder's smoothing)
  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    result.push({ time: candles[i].time, value: computeRsi(avgGain, avgLoss) });
  }

  return result;
}

export function calculateBollingerBands(
  candles: Candle[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BollingerBandsPoint[] {
  const result: BollingerBandsPoint[] = [];
  if (candles.length === 0) return result;

  const smaPoints = calculateSMA(candles, period);

  for (let i = 0; i < candles.length; i++) {
    const sma = smaPoints[i].value;
    if (sma === undefined || i < period - 1) {
      result.push({ time: candles[i].time });
      continue;
    }

    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varianceSum += Math.pow(candles[j].close - sma, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);

    result.push({
      time: candles[i].time,
      middle: sma,
      upper: sma + stdDev * stdDevMultiplier,
      lower: sma - stdDev * stdDevMultiplier,
    });
  }

  return result;
}

export function calculateMACD(
  candles: Candle[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDPoint[] {
  const result: MACDPoint[] = [];
  if (candles.length === 0) return result;

  const fastEMA = calculateEMA(candles, fastPeriod);
  const slowEMA = calculateEMA(candles, slowPeriod);

  const macdCandles: Candle[] = [];

  for (let i = 0; i < candles.length; i++) {
    const fast = fastEMA[i]?.value;
    const slow = slowEMA[i]?.value;

    if (fast !== undefined && slow !== undefined) {
      const macdVal = fast - slow;
      macdCandles.push({
        time: candles[i].time,
        open: macdVal,
        high: macdVal,
        low: macdVal,
        close: macdVal,
        volume: 0,
      });
    }
  }

  const signalEMA = calculateEMA(macdCandles, signalPeriod);
  const signalMap = new Map<number, number>();
  for (let j = 0; j < macdCandles.length; j++) {
    const sigVal = signalEMA[j]?.value;
    if (sigVal !== undefined) {
      signalMap.set(macdCandles[j].time, sigVal);
    }
  }

  for (let i = 0; i < candles.length; i++) {
    const fast = fastEMA[i]?.value;
    const slow = slowEMA[i]?.value;

    if (fast !== undefined && slow !== undefined) {
      const macd = fast - slow;
      const signal = signalMap.get(candles[i].time);
      const histogram = signal !== undefined ? macd - signal : undefined;
      result.push({
        time: candles[i].time,
        macd,
        signal,
        histogram,
      });
    } else {
      result.push({
        time: candles[i].time,
      });
    }
  }

  return result;
}
