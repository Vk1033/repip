# TradingView Clone with 1-Minute Multi-Timeframe Replay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight, high-performance web-based TradingView clone with full-fledged replay functionality down to 1-minute and micro-tick resolution, dynamic higher timeframe aggregation, drawing tools, and simulated paper trading.

**Architecture:** A dedicated Web Worker executes the deterministic replay clock and columnar `Float64Array` data resampler, while the main thread renders an optimized `@tradingview/lightweight-charts` canvas with a custom layered drawing canvas and reactive HUD components via Zustand.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Zustand, `@tradingview/lightweight-charts` v5, Dexie.js (IndexedDB), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-22-tradingview-clone-replay-design.md`

## Global Constraints
- Target platform: Modern Web Browser (Vite SPA, no external server required).
- Base data resolution: Canonical 1-minute OHLCV candles (UTC timestamp in seconds).
- Replay performance: 60 FPS UI responsiveness up to 60x speed with 500k+ candles.
- Core chart engine: `@tradingview/lightweight-charts` v5.
- Persistence: IndexedDB via Dexie.js for caching historical market data and drawings.

---

### Task 1: Project Scaffolding & Setup

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/index.css`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `vitest.config.ts`

**Interfaces:**
- Consumes: None
- Produces: Runnable Vite development server and Vitest test runner

- [ ] **Step 1: Create package.json with dependencies**

```json
{
  "name": "repip-tradingview-clone",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@tradingview/lightweight-charts": "^5.0.3",
    "clsx": "^2.1.1",
    "dexie": "^4.0.11",
    "lucide-react": "^1.16.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^3.0.2",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@types/node": "^22.13.9",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.8.2",
    "vite": "^6.2.0",
    "vitest": "^3.0.7"
  }
}
```

- [ ] **Step 2: Create Vite and Vitest configuration**

`vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    format: 'es',
  },
});
```

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 3: Create TypeScript and Tailwind configuration**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
```

`tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tv: {
          bg: '#131722',
          surface: '#1e222d',
          border: '#2a2e39',
          bull: '#26a69a',
          bear: '#ef5350',
          text: '#d1d4dc',
          muted: '#787b86',
          primary: '#2962ff',
          hover: '#2a2e39'
        }
      }
    },
  },
  plugins: [],
};
```

`postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 4: Create HTML entry, CSS, and basic App component**

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TradingView Replay Clone</title>
  </head>
  <body class="bg-tv-bg text-tv-text select-none overflow-hidden m-0 p-0">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: #131722;
  color: #d1d4dc;
}
```

`src/App.tsx`:
```tsx
import React from 'react';

export function App() {
  return (
    <div className="h-screen w-screen flex flex-col bg-tv-bg text-tv-text">
      <header className="h-10 border-b border-tv-border flex items-center px-4">
        <span className="font-bold text-sm text-tv-text">TradingView Replay</span>
      </header>
      <main className="flex-1 relative flex items-center justify-center">
        <span className="text-tv-muted text-sm">Ready to load market data</span>
      </main>
    </div>
  );
}
```

`src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: Run npm install and verify compilation**

Run: `npm install`
Expected: Packages installed successfully.

- [ ] **Step 6: Commit scaffolding**

```bash
git add .
git commit -m "chore: scaffold Vite + React 19 + Tailwind + Vitest project"
```

---

### Task 2: Data Models & Timeframe Resampler

**Files:**
- Create: `src/types/market.ts`
- Create: `src/core/resampler.ts`
- Test: `tests/resampler.test.ts`

**Interfaces:**
- Consumes: None
- Produces: `Candle`, `Timeframe`, `resampleCandles(candles1m, targetTfSeconds)`, `aggregateCandle(candles)`

- [ ] **Step 1: Define market data types**

`src/types/market.ts`:
```typescript
export interface Candle {
  time: number; // Unix timestamp in seconds (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1D';

export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '2h': 7200,
  '4h': 14400,
  '1D': 86400,
};
```

- [ ] **Step 2: Write failing test for resampler**

`tests/resampler.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { resampleCandles, aggregateCandles } from '../src/core/resampler';
import { Candle } from '../src/types/market';

describe('Resampler', () => {
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
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test tests/resampler.test.ts`
Expected: FAIL with missing module `resampler`.

- [ ] **Step 4: Implement resampler logic**

`src/core/resampler.ts`:
```typescript
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
```

- [ ] **Step 5: Run tests and verify they pass**

Run: `npm test tests/resampler.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/market.ts src/core/resampler.ts tests/resampler.test.ts
git commit -m "feat: implement market types and high-performance candle resampler"
```

---

### Task 3: In-Memory Columnar Candle Buffer & Binary Search

**Files:**
- Create: `src/core/candle-buffer.ts`
- Test: `tests/candle-buffer.test.ts`

**Interfaces:**
- Consumes: `Candle` from `src/types/market.ts`
- Produces: `CandleBuffer` class with `fromCandles`, `getCandle(i)`, `findTimestampIndex(ts)`, `sliceCandles(start, end)`

- [ ] **Step 1: Write failing test for CandleBuffer**

`tests/candle-buffer.test.ts`:
```typescript
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
    expect(buffer.getCandle(1)).toEqual(candles[1]);
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/candle-buffer.test.ts`
Expected: FAIL with missing module `CandleBuffer`.

- [ ] **Step 3: Implement CandleBuffer using Float64Array**

`src/core/candle-buffer.ts`:
```typescript
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
    this.time = time;
    this.open = open;
    this.high = high;
    this.low = low;
    this.close = close;
    this.volume = volume;
    this.length = time.length;
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
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `npm test tests/candle-buffer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/candle-buffer.ts tests/candle-buffer.test.ts
git commit -m "feat: implement memory-efficient columnar CandleBuffer with binary search"
```

---

### Task 4: Replay Clock & Simulation Core

**Files:**
- Create: `src/core/replay-clock.ts`
- Test: `tests/replay-clock.test.ts`

**Interfaces:**
- Consumes: `CandleBuffer` from `src/core/candle-buffer.ts`
- Produces: `ReplayClock` with `play()`, `pause()`, `step(n)`, `jumpTo(index)`, `setSpeed(speed)`

- [ ] **Step 1: Write failing test for ReplayClock**

`tests/replay-clock.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
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
    const state = clock.getState();
    expect(state.currentIndex).toBe(10);
    expect(state.isPlaying).toBe(false);
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/replay-clock.test.ts`
Expected: FAIL with missing module `ReplayClock`.

- [ ] **Step 3: Implement ReplayClock**

`src/core/replay-clock.ts`:
```typescript
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
    this.currentIndex = Math.max(0, Math.min(initialIndex, Math.max(0, buffer.length - 1)));
  }

  setBuffer(buffer: CandleBuffer, initialIndex: number = 0) {
    this.pause();
    this.buffer = buffer;
    this.currentIndex = Math.max(0, Math.min(initialIndex, Math.max(0, buffer.length - 1)));
  }

  onTick(listener: TickCallback): () => void {
    this.onTickListeners.add(listener);
    return () => this.onTickListeners.delete(listener);
  }

  private notify() {
    const candle = this.buffer.getCandle(this.currentIndex);
    if (candle) {
      this.onTickListeners.forEach(fn => fn(candle, this.currentIndex));
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

  play() {
    if (this.isPlaying || this.buffer.length === 0) return;
    this.isPlaying = true;
    this.scheduleTimer();
  }

  pause() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  setSpeed(barsPerSecond: number) {
    this.speed = Math.max(0.1, Math.min(60, barsPerSecond));
    if (this.isPlaying) {
      this.scheduleTimer();
    }
  }

  step(delta: number): number {
    this.pause();
    const target = Math.max(0, Math.min(this.buffer.length - 1, this.currentIndex + delta));
    this.currentIndex = target;
    this.notify();
    return this.currentIndex;
  }

  jumpToIndex(index: number): number {
    this.pause();
    this.currentIndex = Math.max(0, Math.min(this.buffer.length - 1, index));
    this.notify();
    return this.currentIndex;
  }

  jumpToTimestamp(timestampSeconds: number): number {
    const index = this.buffer.findTimestampIndex(timestampSeconds);
    return this.jumpToIndex(index);
  }

  private scheduleTimer() {
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
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `npm test tests/replay-clock.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/replay-clock.ts tests/replay-clock.test.ts
git commit -m "feat: implement deterministic ReplayClock with speed controls"
```

---

### Task 5: Technical Indicators Engine

**Files:**
- Create: `src/core/indicators.ts`
- Test: `tests/indicators.test.ts`

**Interfaces:**
- Consumes: `Candle` from `src/types/market.ts`
- Produces: `calculateSMA`, `calculateEMA`, `calculateRSI`, `calculateMACD`, `calculateBollingerBands`

- [ ] **Step 1: Write failing test for indicators**

`tests/indicators.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateSMA, calculateEMA, calculateRSI } from '../src/core/indicators';
import { Candle } from '../src/types/market';

describe('Indicators', () => {
  const candles: Candle[] = [
    { time: 100, open: 10, high: 12, low: 9, close: 10, volume: 100 },
    { time: 160, open: 10, high: 13, low: 10, close: 12, volume: 100 },
    { time: 220, open: 12, high: 15, low: 11, close: 14, volume: 100 },
    { time: 280, open: 14, high: 16, low: 13, close: 16, volume: 100 },
    { time: 340, open: 16, high: 19, low: 15, close: 18, volume: 100 },
  ];

  it('calculates Simple Moving Average (SMA)', () => {
    const sma3 = calculateSMA(candles, 3);
    // index 0: null, index 1: null, index 2: (10+12+14)/3 = 12
    expect(sma3[0].value).toBeUndefined();
    expect(sma3[1].value).toBeUndefined();
    expect(sma3[2].value).toBeCloseTo(12, 4);
    expect(sma3[3].value).toBeCloseTo(14, 4);
    expect(sma3[4].value).toBeCloseTo(16, 4);
  });

  it('calculates Exponential Moving Average (EMA)', () => {
    const ema3 = calculateEMA(candles, 3);
    expect(ema3[2].value).toBeCloseTo(12, 4);
    expect(ema3[3].value).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/indicators.test.ts`
Expected: FAIL with missing module `indicators`.

- [ ] **Step 3: Implement vectorized indicator algorithms**

`src/core/indicators.ts`:
```typescript
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
  if (candles.length <= period) return candles.map(c => ({ time: c.time }));

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

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({ time: candles[period].time, value: 100 - 100 / (1 + rs) });

  // Subsequent periods (Wilder's smoothing)
  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({ time: candles[i].time, value: 100 - 100 / (1 + rs) });
  }

  return result;
}

export function calculateBollingerBands(
  candles: Candle[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BollingerBandsPoint[] {
  const result: BollingerBandsPoint[] = [];
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
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `npm test tests/indicators.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/indicators.ts tests/indicators.test.ts
git commit -m "feat: implement vectorized SMA, EMA, RSI, and Bollinger Bands indicators"
```

---

### Task 6: Paper Trading Matcher & Execution Engine

**Files:**
- Create: `src/core/paper-trading.ts`
- Test: `tests/paper-trading.test.ts`

**Interfaces:**
- Consumes: `Candle` from `src/types/market.ts`
- Produces: `PaperTradingEngine` with `placeOrder`, `cancelOrder`, `closePosition`, `processCandle`, `getPortfolio`

- [ ] **Step 1: Write failing test for PaperTradingEngine**

`tests/paper-trading.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { PaperTradingEngine } from '../src/core/paper-trading';
import { Candle } from '../src/types/market';

describe('PaperTradingEngine', () => {
  it('fills market orders at candle close price and updates portfolio', () => {
    const engine = new PaperTradingEngine({ initialBalance: 10000 });
    const candle1: Candle = { time: 1000, open: 100, high: 105, low: 98, close: 102, volume: 50 };

    engine.placeOrder({
      type: 'MARKET',
      side: 'BUY',
      size: 10,
    });

    const execution = engine.processCandle(candle1);
    expect(execution.filledOrders).toHaveLength(1);
    expect(execution.positions).toHaveLength(1);
    expect(execution.positions[0].entryPrice).toBe(102);
    expect(engine.getPortfolio().balance).toBe(10000 - 102 * 10);
  });

  it('triggers limit orders only when price breaches the limit level', () => {
    const engine = new PaperTradingEngine({ initialBalance: 10000 });
    engine.placeOrder({
      type: 'LIMIT',
      side: 'BUY',
      limitPrice: 95,
      size: 5,
    });

    // Candle does not reach 95 (low is 98)
    const candle1: Candle = { time: 1000, open: 100, high: 105, low: 98, close: 102, volume: 50 };
    let result = engine.processCandle(candle1);
    expect(result.filledOrders).toHaveLength(0);

    // Candle reaches 94
    const candle2: Candle = { time: 1060, open: 102, high: 103, low: 94, close: 97, volume: 50 };
    result = engine.processCandle(candle2);
    expect(result.filledOrders).toHaveLength(1);
    expect(result.positions[0].entryPrice).toBe(95);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/paper-trading.test.ts`
Expected: FAIL with missing module `PaperTradingEngine`.

- [ ] **Step 3: Implement PaperTradingEngine**

`src/core/paper-trading.ts`:
```typescript
import { Candle } from '../types/market';

export type OrderType = 'MARKET' | 'LIMIT';
export type OrderSide = 'BUY' | 'SELL';

export interface OrderRequest {
  type: OrderType;
  side: OrderSide;
  size: number;
  limitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface Order extends OrderRequest {
  id: string;
  createdAt: number;
}

export interface Position {
  id: string;
  side: OrderSide;
  size: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  unrealizedPnL: number;
  realizedPnL: number;
  openedAt: number;
}

export interface Trade {
  id: string;
  side: OrderSide;
  size: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  openedAt: number;
  closedAt: number;
}

export interface PortfolioState {
  balance: number;
  equity: number;
  realizedPnL: number;
  unrealizedPnL: number;
  positions: Position[];
  pendingOrders: Order[];
  closedTrades: Trade[];
}

export class PaperTradingEngine {
  private balance: number;
  private pendingOrders: Order[] = [];
  private positions: Position[] = [];
  private closedTrades: Trade[] = [];

  constructor({ initialBalance = 10000 }: { initialBalance?: number } = {}) {
    this.balance = initialBalance;
  }

  placeOrder(orderReq: OrderRequest): Order {
    const order: Order = {
      ...orderReq,
      id: 'ord_' + Math.random().toString(36).substring(2, 9),
      createdAt: Date.now(),
    };
    this.pendingOrders.push(order);
    return order;
  }

  cancelOrder(orderId: string): boolean {
    const idx = this.pendingOrders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      this.pendingOrders.splice(idx, 1);
      return true;
    }
    return false;
  }

  closePosition(positionId: string, exitPrice: number, time: number): Trade | null {
    const idx = this.positions.findIndex(p => p.id === positionId);
    if (idx === -1) return null;

    const pos = this.positions[idx];
    const multiplier = pos.side === 'BUY' ? 1 : -1;
    const pnl = (exitPrice - pos.entryPrice) * pos.size * multiplier;

    this.balance += pos.entryPrice * pos.size + pnl;
    this.positions.splice(idx, 1);

    const trade: Trade = {
      id: 'trd_' + Math.random().toString(36).substring(2, 9),
      side: pos.side,
      size: pos.size,
      entryPrice: pos.entryPrice,
      exitPrice,
      pnl,
      openedAt: pos.openedAt,
      closedAt: time,
    };
    this.closedTrades.push(trade);
    return trade;
  }

  processCandle(candle: Candle): {
    filledOrders: Order[];
    closedPositions: Trade[];
    positions: Position[];
  } {
    const filledOrders: Order[] = [];
    const closedPositions: Trade[] = [];
    const remainingOrders: Order[] = [];

    // Check pending orders
    for (const order of this.pendingOrders) {
      let filled = false;
      let fillPrice = candle.close;

      if (order.type === 'MARKET') {
        filled = true;
        fillPrice = candle.close;
      } else if (order.type === 'LIMIT' && order.limitPrice !== undefined) {
        if (order.side === 'BUY' && candle.low <= order.limitPrice) {
          filled = true;
          fillPrice = order.limitPrice;
        } else if (order.side === 'SELL' && candle.high >= order.limitPrice) {
          filled = true;
          fillPrice = order.limitPrice;
        }
      }

      if (filled) {
        this.balance -= fillPrice * order.size;
        const position: Position = {
          id: 'pos_' + Math.random().toString(36).substring(2, 9),
          side: order.side,
          size: order.size,
          entryPrice: fillPrice,
          stopLoss: order.stopLoss,
          takeProfit: order.takeProfit,
          unrealizedPnL: 0,
          realizedPnL: 0,
          openedAt: candle.time,
        };
        this.positions.push(position);
        filledOrders.push(order);
      } else {
        remainingOrders.push(order);
      }
    }
    this.pendingOrders = remainingOrders;

    // Check Stop-Loss / Take-Profit triggers on open positions
    for (let i = this.positions.length - 1; i >= 0; i--) {
      const pos = this.positions[i];
      let shouldClose = false;
      let exitPrice = candle.close;

      if (pos.side === 'BUY') {
        if (pos.stopLoss !== undefined && candle.low <= pos.stopLoss) {
          shouldClose = true;
          exitPrice = pos.stopLoss;
        } else if (pos.takeProfit !== undefined && candle.high >= pos.takeProfit) {
          shouldClose = true;
          exitPrice = pos.takeProfit;
        }
      } else {
        if (pos.stopLoss !== undefined && candle.high >= pos.stopLoss) {
          shouldClose = true;
          exitPrice = pos.stopLoss;
        } else if (pos.takeProfit !== undefined && candle.low <= pos.takeProfit) {
          shouldClose = true;
          exitPrice = pos.takeProfit;
        }
      }

      if (shouldClose) {
        const trade = this.closePosition(pos.id, exitPrice, candle.time);
        if (trade) closedPositions.push(trade);
      } else {
        // Update unrealized PnL
        const multiplier = pos.side === 'BUY' ? 1 : -1;
        pos.unrealizedPnL = (candle.close - pos.entryPrice) * pos.size * multiplier;
      }
    }

    return {
      filledOrders,
      closedPositions,
      positions: this.positions,
    };
  }

  getPortfolio(): PortfolioState {
    const unrealizedPnL = this.positions.reduce((acc, p) => acc + p.unrealizedPnL, 0);
    const realizedPnL = this.closedTrades.reduce((acc, t) => acc + t.pnl, 0);
    const positionsCost = this.positions.reduce((acc, p) => acc + p.entryPrice * p.size, 0);
    const equity = this.balance + positionsCost + unrealizedPnL;

    return {
      balance: this.balance,
      equity,
      realizedPnL,
      unrealizedPnL,
      positions: [...this.positions],
      pendingOrders: [...this.pendingOrders],
      closedTrades: [...this.closedTrades],
    };
  }
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `npm test tests/paper-trading.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/paper-trading.ts tests/paper-trading.test.ts
git commit -m "feat: implement simulated paper trading order matcher with SL/TP triggers"
```

---

### Task 7: Web Worker Simulation Wrapper & Message Protocol

**Files:**
- Create: `src/workers/simulation.worker.ts`
- Create: `src/workers/worker-client.ts`
- Test: `tests/worker-protocol.test.ts`

**Interfaces:**
- Consumes: `CandleBuffer`, `ReplayClock`, `PaperTradingEngine`, `resampleCandles`
- Produces: `WorkerClient` class managing communication with `simulation.worker.ts`

- [ ] **Step 1: Define worker message protocol types**

`src/workers/protocol.ts`:
```typescript
import { Candle, Timeframe } from '../types/market';
import { OrderRequest, PortfolioState } from '../core/paper-trading';
import { ReplayState } from '../core/replay-clock';

export type WorkerInMessage =
  | { type: 'LOAD_DATA'; payload: { candles: Candle[] } }
  | { type: 'SET_TIMEFRAME'; payload: { timeframe: Timeframe } }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SET_SPEED'; payload: { speed: number } }
  | { type: 'STEP'; payload: { delta: number } }
  | { type: 'JUMP_TO_TIMESTAMP'; payload: { timestamp: number } }
  | { type: 'PLACE_ORDER'; payload: { order: OrderRequest } }
  | { type: 'CANCEL_ORDER'; payload: { orderId: string } }
  | { type: 'CLOSE_POSITION'; payload: { positionId: string } };

export type WorkerOutMessage =
  | { type: 'READY'; payload: { totalCandles: number } }
  | { type: 'REPLAY_STATE'; payload: ReplayState }
  | { type: 'SERIES_DATA'; payload: { candles: Candle[]; timeframe: Timeframe } }
  | { type: 'CANDLE_UPDATE'; payload: { candle: Candle; isNewBar: boolean } }
  | { type: 'PORTFOLIO_UPDATE'; payload: PortfolioState };
```

- [ ] **Step 2: Write test for worker message protocol serialization**

`tests/worker-protocol.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { WorkerInMessage, WorkerOutMessage } from '../src/workers/protocol';

describe('Worker Protocol', () => {
  it('validates message schemas', () => {
    const inMsg: WorkerInMessage = {
      type: 'SET_SPEED',
      payload: { speed: 5 },
    };
    expect(inMsg.type).toBe('SET_SPEED');
    expect(inMsg.payload.speed).toBe(5);
  });
});
```

- [ ] **Step 3: Run test to verify passes**

Run: `npm test tests/worker-protocol.test.ts`
Expected: PASS

- [ ] **Step 4: Implement simulation.worker.ts**

`src/workers/simulation.worker.ts`:
```typescript
import { Candle, Timeframe, TIMEFRAME_SECONDS } from '../types/market';
import { CandleBuffer } from '../core/candle-buffer';
import { ReplayClock } from '../core/replay-clock';
import { resampleCandles, getBucketTimestamp, aggregateCandles } from '../core/resampler';
import { PaperTradingEngine } from '../core/paper-trading';
import { WorkerInMessage, WorkerOutMessage } from './protocol';

let buffer: CandleBuffer = CandleBuffer.fromCandles([]);
let clock: ReplayClock = new ReplayClock(buffer, 0);
let tradingEngine: PaperTradingEngine = new PaperTradingEngine();
let activeTimeframe: Timeframe = '1m';
let lastBucketTime: number = 0;

function post(msg: WorkerOutMessage) {
  self.postMessage(msg);
}

function broadcastSeriesData() {
  if (buffer.length === 0) return;
  const state = clock.getState();
  const rawSlice = buffer.sliceCandles(0, state.currentIndex + 1);
  const targetSeconds = TIMEFRAME_SECONDS[activeTimeframe];
  const aggregated = resampleCandles(rawSlice, targetSeconds);

  post({
    type: 'SERIES_DATA',
    payload: { candles: aggregated, timeframe: activeTimeframe },
  });

  if (aggregated.length > 0) {
    lastBucketTime = aggregated[aggregated.length - 1].time;
  }
}

clock.onTick((candle, index) => {
  // Update Paper Trading Engine
  tradingEngine.processCandle(candle);
  post({ type: 'PORTFOLIO_UPDATE', payload: tradingEngine.getPortfolio() });
  post({ type: 'REPLAY_STATE', payload: clock.getState() });

  // Update active candle in selected timeframe
  const targetSeconds = TIMEFRAME_SECONDS[activeTimeframe];
  const bucketTime = getBucketTimestamp(candle.time, targetSeconds);
  const isNewBar = bucketTime !== lastBucketTime;

  if (isNewBar) {
    lastBucketTime = bucketTime;
    post({
      type: 'CANDLE_UPDATE',
      payload: { candle: { ...candle, time: bucketTime }, isNewBar: true },
    });
  } else {
    // Incremental update to current forming bar
    const rawSlice = buffer.sliceCandles(Math.max(0, index - (targetSeconds / 60) + 1), index + 1);
    const inBucket = rawSlice.filter(c => getBucketTimestamp(c.time, targetSeconds) === bucketTime);
    if (inBucket.length > 0) {
      const activeBar = aggregateCandles(inBucket, bucketTime);
      post({
        type: 'CANDLE_UPDATE',
        payload: { candle: activeBar, isNewBar: false },
      });
    }
  }
});

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'LOAD_DATA': {
      buffer = CandleBuffer.fromCandles(msg.payload.candles);
      clock.setBuffer(buffer, 0);
      tradingEngine = new PaperTradingEngine();
      post({ type: 'READY', payload: { totalCandles: buffer.length } });
      post({ type: 'REPLAY_STATE', payload: clock.getState() });
      post({ type: 'PORTFOLIO_UPDATE', payload: tradingEngine.getPortfolio() });
      broadcastSeriesData();
      break;
    }
    case 'SET_TIMEFRAME': {
      activeTimeframe = msg.payload.timeframe;
      broadcastSeriesData();
      break;
    }
    case 'PLAY': {
      clock.play();
      post({ type: 'REPLAY_STATE', payload: clock.getState() });
      break;
    }
    case 'PAUSE': {
      clock.pause();
      post({ type: 'REPLAY_STATE', payload: clock.getState() });
      break;
    }
    case 'SET_SPEED': {
      clock.setSpeed(msg.payload.speed);
      post({ type: 'REPLAY_STATE', payload: clock.getState() });
      break;
    }
    case 'STEP': {
      clock.step(msg.payload.delta);
      broadcastSeriesData();
      break;
    }
    case 'JUMP_TO_TIMESTAMP': {
      clock.jumpToTimestamp(msg.payload.timestamp);
      broadcastSeriesData();
      break;
    }
    case 'PLACE_ORDER': {
      tradingEngine.placeOrder(msg.payload.order);
      post({ type: 'PORTFOLIO_UPDATE', payload: tradingEngine.getPortfolio() });
      break;
    }
    case 'CANCEL_ORDER': {
      tradingEngine.cancelOrder(msg.payload.orderId);
      post({ type: 'PORTFOLIO_UPDATE', payload: tradingEngine.getPortfolio() });
      break;
    }
    case 'CLOSE_POSITION': {
      const state = clock.getState();
      if (state.currentCandle) {
        tradingEngine.closePosition(msg.payload.positionId, state.currentCandle.close, state.currentCandle.time);
        post({ type: 'PORTFOLIO_UPDATE', payload: tradingEngine.getPortfolio() });
      }
      break;
    }
  }
};
```

- [ ] **Step 5: Implement WorkerClient class**

`src/workers/worker-client.ts`:
```typescript
import { WorkerInMessage, WorkerOutMessage } from './protocol';

export class WorkerClient {
  private worker: Worker;
  private listeners: Set<(msg: WorkerOutMessage) => void> = new Set();

  constructor() {
    this.worker = new Worker(
      new URL('./simulation.worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
      this.listeners.forEach(fn => fn(event.data));
    };
  }

  send(message: WorkerInMessage) {
    this.worker.postMessage(message);
  }

  onMessage(callback: (msg: WorkerOutMessage) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  terminate() {
    this.worker.terminate();
    this.listeners.clear();
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/workers/ tests/worker-protocol.test.ts
git commit -m "feat: implement Web Worker simulation core and typed message protocol"
```

---

### Task 8: Data Ingestion & Storage (Binance & CSV)

**Files:**
- Create: `src/data/db.ts`
- Create: `src/data/binance.ts`
- Create: `src/data/csv-parser.ts`
- Test: `tests/csv-parser.test.ts`

**Interfaces:**
- Consumes: `Candle` from `src/types/market.ts`
- Produces: `fetchBinance1mKlines(symbol, startTime, limit)`, `parseCandlesCSV(fileContent)`, `AppDB`

- [ ] **Step 1: Write failing test for CSV Parser**

`tests/csv-parser.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { parseCandlesCSV } from '../src/data/csv-parser';

describe('CSV Parser', () => {
  it('parses standard timestamp-based OHLCV CSVs accurately', () => {
    const csv = `timestamp,open,high,low,close,volume
1700000000,100.5,102.0,99.5,101.2,500
1700000060,101.2,103.5,100.8,102.7,450`;

    const result = parseCandlesCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      time: 1700000000,
      open: 100.5,
      high: 102.0,
      low: 99.5,
      close: 101.2,
      volume: 500,
    });
  });

  it('handles ISO date strings and automatically sorts ascending', () => {
    const csv = `Date,Open,High,Low,Close,Volume
2024-01-01T00:01:00Z,105,106,104,105.5,100
2024-01-01T00:00:00Z,100,105,99,104.5,200`;

    const result = parseCandlesCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0].open).toBe(100);
    expect(result[1].open).toBe(105);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/csv-parser.test.ts`
Expected: FAIL with missing module `csv-parser`.

- [ ] **Step 3: Implement CSV Parser**

`src/data/csv-parser.ts`:
```typescript
import { Candle } from '../types/market';

export function parseCandlesCSV(csvText: string): Candle[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headerLine = lines[0].toLowerCase();
  const delimiter = headerLine.includes(';') ? ';' : headerLine.includes('\t') ? '\t' : ',';
  const headers = headerLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));

  const timeIdx = headers.findIndex(h => h.includes('time') || h.includes('date'));
  const openIdx = headers.findIndex(h => h === 'open' || h === 'o');
  const highIdx = headers.findIndex(h => h === 'high' || h === 'h');
  const lowIdx = headers.findIndex(h => h === 'low' || h === 'l');
  const closeIdx = headers.findIndex(h => h === 'close' || h === 'c');
  const volIdx = headers.findIndex(h => h.includes('vol') || h === 'v');

  if (timeIdx === -1 || openIdx === -1 || highIdx === -1 || lowIdx === -1 || closeIdx === -1) {
    throw new Error('CSV missing required OHLC columns (time/date, open, high, low, close)');
  }

  const candles: Candle[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    const timeRaw = cols[timeIdx];
    let timeSec = 0;

    if (!isNaN(Number(timeRaw))) {
      timeSec = Number(timeRaw);
      if (timeSec > 1e11) timeSec = Math.floor(timeSec / 1000); // ms to sec
    } else {
      timeSec = Math.floor(new Date(timeRaw).getTime() / 1000);
    }

    if (isNaN(timeSec)) continue;

    const open = parseFloat(cols[openIdx]);
    const high = parseFloat(cols[highIdx]);
    const low = parseFloat(cols[lowIdx]);
    const close = parseFloat(cols[closeIdx]);
    const volume = volIdx !== -1 ? parseFloat(cols[volIdx]) || 0 : 0;

    if (!isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close)) {
      candles.push({ time: timeSec, open, high, low, close, volume });
    }
  }

  // Sort ascending by time
  candles.sort((a, b) => a.time - b.time);

  // Deduplicate identical timestamps
  const uniqueCandles: Candle[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0 || candles[i].time !== candles[i - 1].time) {
      uniqueCandles.push(candles[i]);
    }
  }

  return uniqueCandles;
}
```

- [ ] **Step 4: Implement Dexie.js Database & Binance API Fetcher**

`src/data/db.ts`:
```typescript
import Dexie, { type Table } from 'dexie';
import { Candle } from '../types/market';

export interface StoredDataset {
  id?: number;
  symbol: string;
  count: number;
  startTime: number;
  endTime: number;
  candles: Candle[];
}

export class AppDB extends Dexie {
  datasets!: Table<StoredDataset, number>;

  constructor() {
    super('TradingViewCloneDB');
    this.version(1).stores({
      datasets: '++id, symbol, startTime, endTime',
    });
  }
}

export const db = new AppDB();
```

`src/data/binance.ts`:
```typescript
import { Candle } from '../types/market';

export async function fetchBinance1mKlines(
  symbol: string = 'BTCUSDT',
  limit: number = 1000,
  endTime?: number
): Promise<Candle[]> {
  const params = new URLSearchParams({
    symbol: symbol.toUpperCase(),
    interval: '1m',
    limit: limit.toString(),
  });
  if (endTime) {
    params.append('endTime', (endTime * 1000).toString());
  }

  const response = await fetch(`https://api.binance.com/api/v3/klines?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.map((d: any[]): Candle => ({
    time: Math.floor(d[0] / 1000),
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
    volume: parseFloat(d[5]),
  }));
}
```

- [ ] **Step 5: Run tests and verify they pass**

Run: `npm test tests/csv-parser.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/data/ tests/csv-parser.test.ts
git commit -m "feat: implement CSV parser, Dexie IndexedDB cache, and Binance kline API client"
```

---

### Task 9: Lightweight Charts Canvas Integration

**Files:**
- Create: `src/components/ChartContainer.tsx`
- Create: `src/store/useStore.ts`

**Interfaces:**
- Consumes: `@tradingview/lightweight-charts`, `Candle`, `Timeframe`
- Produces: `ChartContainer` React component and centralized Zustand `useStore`

- [ ] **Step 1: Create centralized Zustand store**

`src/store/useStore.ts`:
```typescript
import { create } from 'zustand';
import { Candle, Timeframe } from '../types/market';
import { ReplayState } from '../core/replay-clock';
import { PortfolioState } from '../core/paper-trading';

interface AppStore {
  symbol: string;
  timeframe: Timeframe;
  replayState: ReplayState;
  portfolio: PortfolioState;
  activeDrawingTool: 'cursor' | 'trendline' | 'horizontal_ray' | 'rectangle' | 'fibonacci' | 'position' | null;
  indicators: {
    sma20: boolean;
    ema50: boolean;
    rsi14: boolean;
  };
  setSymbol: (symbol: string) => void;
  setTimeframe: (tf: Timeframe) => void;
  setReplayState: (state: ReplayState) => void;
  setPortfolio: (portfolio: PortfolioState) => void;
  setActiveDrawingTool: (tool: AppStore['activeDrawingTool']) => void;
  toggleIndicator: (indicator: keyof AppStore['indicators']) => void;
}

export const useStore = create<AppStore>((set) => ({
  symbol: 'BTCUSDT',
  timeframe: '1m',
  replayState: {
    currentIndex: 0,
    isPlaying: false,
    speed: 1,
    currentCandle: null,
    totalCandles: 0,
  },
  portfolio: {
    balance: 10000,
    equity: 10000,
    realizedPnL: 0,
    unrealizedPnL: 0,
    positions: [],
    pendingOrders: [],
    closedTrades: [],
  },
  activeDrawingTool: 'cursor',
  indicators: {
    sma20: false,
    ema50: false,
    rsi14: false,
  },
  setSymbol: (symbol) => set({ symbol }),
  setTimeframe: (timeframe) => set({ timeframe }),
  setReplayState: (replayState) => set({ replayState }),
  setPortfolio: (portfolio) => set({ portfolio }),
  setActiveDrawingTool: (tool) => set({ activeDrawingTool: tool }),
  toggleIndicator: (ind) => set((s) => ({
    indicators: { ...s.indicators, [ind]: !s.indicators[ind] }
  })),
}));
```

- [ ] **Step 2: Implement ChartContainer with TradingView Lightweight Charts v5**

`src/components/ChartContainer.tsx`:
```tsx
import React, { useEffect, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  Time,
  ColorType,
} from '@tradingview/lightweight-charts';
import { Candle } from '../types/market';

interface ChartContainerProps {
  candles: Candle[];
  lastUpdate: { candle: Candle; isNewBar: boolean } | null;
  onChartReady?: (chart: IChartApi, series: ISeriesApi<'Candlestick'>) => void;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  candles,
  lastUpdate,
  onChartReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Initialize Chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' },
      },
      crosshair: {
        mode: 1, // Magnet
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '', // overlay pane
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    if (onChartReady) {
      onChartReady(chart, candleSeries);
    }

    const handleResize = () => {
      if (containerRef.current && chart) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update Full Series Data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    const formattedCandles: CandlestickData<Time>[] = candles.map(c => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const formattedVolume: HistogramData<Time>[] = candles.map(c => ({
      time: c.time as Time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(38, 166, 154, 0.4)' : 'rgba(239, 83, 80, 0.4)',
    }));

    candleSeriesRef.current.setData(formattedCandles);
    volumeSeriesRef.current.setData(formattedVolume);
  }, [candles]);

  // Incremental Candle Updates during Replay
  useEffect(() => {
    if (!lastUpdate || !candleSeriesRef.current || !volumeSeriesRef.current) return;
    const c = lastUpdate.candle;

    candleSeriesRef.current.update({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    });

    volumeSeriesRef.current.update({
      time: c.time as Time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(38, 166, 154, 0.4)' : 'rgba(239, 83, 80, 0.4)',
    });
  }, [lastUpdate]);

  return <div ref={containerRef} className="w-full h-full relative" />;
};
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ChartContainer.tsx src/store/useStore.ts
git commit -m "feat: implement Lightweight Charts candlestick & volume container and Zustand store"
```

---

### Task 10: Interactive Canvas Drawing Layer

**Files:**
- Create: `src/components/DrawingOverlay.tsx`
- Create: `src/core/drawing-manager.ts`
- Test: `tests/drawing-manager.test.ts`

**Interfaces:**
- Consumes: `IChartApi`, `ISeriesApi`, `activeDrawingTool`
- Produces: `DrawingOverlay` component with Trendline, Horizontal Ray, Rectangle, and Long/Short Position tool

- [ ] **Step 1: Write unit test for drawing coordinate transform and point projection**

`tests/drawing-manager.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { DrawingPoint, isPointNearLine } from '../src/core/drawing-manager';

describe('DrawingManager', () => {
  it('detects click proximity to trendline correctly', () => {
    const p1: DrawingPoint = { x: 0, y: 0, time: 100, price: 10 };
    const p2: DrawingPoint = { x: 100, y: 100, time: 200, price: 20 };
    const clickNear = { x: 50, y: 52 };
    const clickFar = { x: 50, y: 80 };

    expect(isPointNearLine(clickNear, p1, p2, 5)).toBe(true);
    expect(isPointNearLine(clickFar, p1, p2, 5)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/drawing-manager.test.ts`
Expected: FAIL with missing module `drawing-manager`.

- [ ] **Step 3: Implement DrawingManager and DrawingOverlay**

`src/core/drawing-manager.ts`:
```typescript
export interface DrawingPoint {
  time: number;
  price: number;
  x?: number;
  y?: number;
}

export type DrawingType = 'trendline' | 'horizontal_ray' | 'rectangle' | 'fibonacci' | 'position';

export interface DrawingShape {
  id: string;
  type: DrawingType;
  points: DrawingPoint[];
  color: string;
  params?: Record<string, any>;
}

export function isPointNearLine(
  pt: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  threshold: number = 6
): boolean {
  const lineLenSq = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
  if (lineLenSq === 0) return Math.hypot(pt.x - p1.x, pt.y - p1.y) <= threshold;

  const t = Math.max(0, Math.min(1, ((pt.x - p1.x) * (p2.x - p1.x) + (pt.y - p1.y) * (p2.y - p1.y)) / lineLenSq));
  const projX = p1.x + t * (p2.x - p1.x);
  const projY = p1.y + t * (p2.y - p1.y);

  return Math.hypot(pt.x - projX, pt.y - projY) <= threshold;
}
```

`src/components/DrawingOverlay.tsx`:
```tsx
import React, { useRef, useEffect, useState } from 'react';
import { IChartApi, ISeriesApi } from '@tradingview/lightweight-charts';
import { DrawingShape, DrawingPoint } from '../core/drawing-manager';
import { useStore } from '../store/useStore';

interface DrawingOverlayProps {
  chart: IChartApi | null;
  series: ISeriesApi<'Candlestick'> | null;
}

export const DrawingOverlay: React.FC<DrawingOverlayProps> = ({ chart, series }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shapes, setShapes] = useState<DrawingShape[]>([]);
  const [currentPoints, setCurrentPoints] = useState<DrawingPoint[]>([]);
  const activeTool = useStore((s) => s.activeDrawingTool);
  const setActiveTool = useStore((s) => s.setActiveDrawingTool);

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !chart || !series) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw saved shapes
    for (const shape of shapes) {
      const p1 = shape.points[0];
      const p2 = shape.points[1];
      if (!p1) continue;

      const x1 = chart.timeScale().timeToCoordinate(p1.time as any) ?? -100;
      const y1 = series.priceToCoordinate(p1.price) ?? -100;

      if (shape.type === 'horizontal_ray') {
        ctx.strokeStyle = shape.color || '#2962ff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(canvas.width, y1);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (shape.type === 'trendline' && p2) {
        const x2 = chart.timeScale().timeToCoordinate(p2.time as any) ?? -100;
        const y2 = series.priceToCoordinate(p2.price) ?? -100;
        ctx.strokeStyle = shape.color || '#2962ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else if (shape.type === 'rectangle' && p2) {
        const x2 = chart.timeScale().timeToCoordinate(p2.time as any) ?? -100;
        const y2 = series.priceToCoordinate(p2.price) ?? -100;
        ctx.fillStyle = 'rgba(41, 98, 255, 0.15)';
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      }
    }
  };

  useEffect(() => {
    if (!chart) return;
    const timeScale = chart.timeScale();
    timeScale.subscribeVisibleTimeRangeChange(redraw);
    redraw();
    return () => {
      timeScale.unsubscribeVisibleTimeRangeChange(redraw);
    };
  }, [chart, series, shapes]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!chart || !series || activeTool === 'cursor' || !activeTool) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const time = chart.timeScale().coordinateToTime(x) as number | null;
    const price = series.coordinateToPrice(y);
    if (time === null || price === null) return;

    const pt: DrawingPoint = { time, price, x, y };

    if (activeTool === 'horizontal_ray') {
      setShapes((prev) => [
        ...prev,
        { id: Math.random().toString(), type: 'horizontal_ray', points: [pt], color: '#f59e0b' },
      ]);
      setActiveTool('cursor');
    } else if (activeTool === 'trendline' || activeTool === 'rectangle') {
      if (currentPoints.length === 0) {
        setCurrentPoints([pt]);
      } else {
        setShapes((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            type: activeTool,
            points: [currentPoints[0], pt],
            color: '#2962ff',
          },
        ]);
        setCurrentPoints([]);
        setActiveTool('cursor');
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
      onClick={handleCanvasClick}
      className={`absolute inset-0 z-10 pointer-events-${activeTool === 'cursor' ? 'none' : 'auto'}`}
    />
  );
};
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `npm test tests/drawing-manager.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/drawing-manager.ts src/components/DrawingOverlay.tsx tests/drawing-manager.test.ts
git commit -m "feat: implement interactive drawing overlay supporting trendlines, horizontal rays, and rectangles"
```

---

### Task 11: Replay Controls HUD & Time Scrubber

**Files:**
- Create: `src/components/ReplayBar.tsx`

**Interfaces:**
- Consumes: `useStore`, `WorkerClient`
- Produces: Floating bottom toolbar with Play/Pause, Step, Speed, Jump, and Bar Counter

- [ ] **Step 1: Implement ReplayBar component**

`src/components/ReplayBar.tsx`:
```tsx
import React from 'react';
import { Play, Pause, SkipBack, SkipForward, FastForward, Scissors } from 'lucide-react';
import { useStore } from '../store/useStore';
import { WorkerClient } from '../workers/worker-client';

interface ReplayBarProps {
  workerClient: WorkerClient | null;
  onJumpClick?: () => void;
}

export const ReplayBar: React.FC<ReplayBarProps> = ({ workerClient, onJumpClick }) => {
  const replayState = useStore((s) => s.replayState);

  if (!workerClient) return null;

  const handlePlayPause = () => {
    if (replayState.isPlaying) {
      workerClient.send({ type: 'PAUSE' });
    } else {
      workerClient.send({ type: 'PLAY' });
    }
  };

  const handleStep = (delta: number) => {
    workerClient.send({ type: 'STEP', payload: { delta } });
  };

  const handleSpeedChange = (speed: number) => {
    workerClient.send({ type: 'SET_SPEED', payload: { speed } });
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-tv-surface/95 border border-tv-border backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl">
      {/* Jump Tool */}
      <button
        onClick={onJumpClick}
        title="Jump to Candle"
        className="p-2 text-tv-muted hover:text-tv-text hover:bg-tv-hover rounded-full transition-colors"
      >
        <Scissors className="w-4 h-4" />
      </button>

      <div className="h-4 w-px bg-tv-border" />

      {/* Step Backward */}
      <button
        onClick={() => handleStep(-1)}
        title="Step Back"
        className="p-2 text-tv-text hover:bg-tv-hover rounded-full transition-colors"
      >
        <SkipBack className="w-4 h-4" />
      </button>

      {/* Play / Pause */}
      <button
        onClick={handlePlayPause}
        title={replayState.isPlaying ? 'Pause' : 'Play'}
        className="p-3 bg-tv-primary hover:bg-blue-600 text-white rounded-full transition-colors shadow-md"
      >
        {replayState.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>

      {/* Step Forward */}
      <button
        onClick={() => handleStep(1)}
        title="Step Forward (1 bar)"
        className="p-2 text-tv-text hover:bg-tv-hover rounded-full transition-colors"
      >
        <SkipForward className="w-4 h-4" />
      </button>

      <div className="h-4 w-px bg-tv-border" />

      {/* Playback Speed Picker */}
      <div className="flex items-center gap-1 text-xs">
        <FastForward className="w-3.5 h-3.5 text-tv-muted" />
        {[0.5, 1, 2, 5, 10].map((s) => (
          <button
            key={s}
            onClick={() => handleSpeedChange(s)}
            className={`px-2 py-1 rounded transition-colors ${
              replayState.speed === s ? 'bg-tv-border text-tv-text font-bold' : 'text-tv-muted hover:text-tv-text'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-tv-border" />

      {/* Bar Counter */}
      <span className="text-xs text-tv-muted font-mono whitespace-nowrap">
        {replayState.currentIndex + 1} / {replayState.totalCandles}
      </span>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ReplayBar.tsx
git commit -m "feat: implement floating ReplayBar HUD with play/pause, step, and speed controls"
```

---

### Task 12: Order Entry Ticket & Portfolio Panel

**Files:**
- Create: `src/components/TradingPanel.tsx`

**Interfaces:**
- Consumes: `useStore`, `WorkerClient`
- Produces: Collapsible side panel for order placement and active positions/trades

- [ ] **Step 1: Implement TradingPanel component**

`src/components/TradingPanel.tsx`:
```tsx
import React, { useState } from 'react';
import { WorkerClient } from '../workers/worker-client';
import { useStore } from '../store/useStore';
import { OrderType, OrderSide } from '../core/paper-trading';

interface TradingPanelProps {
  workerClient: WorkerClient | null;
}

export const TradingPanel: React.FC<TradingPanelProps> = ({ workerClient }) => {
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [size, setSize] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const portfolio = useStore((s) => s.portfolio);
  const replayState = useStore((s) => s.replayState);

  const handleOrder = (side: OrderSide) => {
    if (!workerClient) return;
    workerClient.send({
      type: 'PLACE_ORDER',
      payload: {
        order: {
          type: orderType,
          side,
          size,
          limitPrice: limitPrice ? parseFloat(limitPrice) : undefined,
          stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
          takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
        },
      },
    });
  };

  const handleClosePosition = (posId: string) => {
    if (!workerClient) return;
    workerClient.send({ type: 'CLOSE_POSITION', payload: { positionId: posId } });
  };

  return (
    <div className="w-80 border-l border-tv-border bg-tv-surface flex flex-col h-full text-xs">
      {/* Account Overview */}
      <div className="p-3 border-b border-tv-border bg-tv-bg/50">
        <div className="text-tv-muted font-semibold mb-1">Simulated Account</div>
        <div className="flex justify-between items-center text-sm font-bold">
          <span>Equity:</span>
          <span>${portfolio.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between items-center text-xs mt-1">
          <span className="text-tv-muted">Unrealized PnL:</span>
          <span className={portfolio.unrealizedPnL >= 0 ? 'text-tv-bull' : 'text-tv-bear'}>
            {portfolio.unrealizedPnL >= 0 ? '+' : ''}
            ${portfolio.unrealizedPnL.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Order Entry */}
      <div className="p-3 border-b border-tv-border space-y-3">
        <div className="flex bg-tv-bg rounded p-0.5">
          <button
            onClick={() => setOrderType('MARKET')}
            className={`flex-1 py-1 rounded font-medium ${orderType === 'MARKET' ? 'bg-tv-border text-tv-text' : 'text-tv-muted'}`}
          >
            Market
          </button>
          <button
            onClick={() => setOrderType('LIMIT')}
            className={`flex-1 py-1 rounded font-medium ${orderType === 'LIMIT' ? 'bg-tv-border text-tv-text' : 'text-tv-muted'}`}
          >
            Limit
          </button>
        </div>

        {orderType === 'LIMIT' && (
          <div>
            <label className="text-tv-muted block mb-1">Limit Price</label>
            <input
              type="number"
              placeholder={replayState.currentCandle?.close.toString()}
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="w-full bg-tv-bg border border-tv-border rounded px-2 py-1 text-tv-text"
            />
          </div>
        )}

        <div>
          <label className="text-tv-muted block mb-1">Quantity</label>
          <input
            type="number"
            min="0.01"
            step="0.1"
            value={size}
            onChange={(e) => setSize(parseFloat(e.target.value) || 0)}
            className="w-full bg-tv-bg border border-tv-border rounded px-2 py-1 text-tv-text"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-tv-muted block mb-1">Stop Loss</label>
            <input
              type="number"
              placeholder="Optional"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full bg-tv-bg border border-tv-border rounded px-2 py-1 text-tv-text"
            />
          </div>
          <div>
            <label className="text-tv-muted block mb-1">Take Profit</label>
            <input
              type="number"
              placeholder="Optional"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="w-full bg-tv-bg border border-tv-border rounded px-2 py-1 text-tv-text"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => handleOrder('BUY')}
            className="py-2 bg-tv-bull hover:opacity-90 font-bold text-white rounded transition-opacity"
          >
            BUY / LONG
          </button>
          <button
            onClick={() => handleOrder('SELL')}
            className="py-2 bg-tv-bear hover:opacity-90 font-bold text-white rounded transition-opacity"
          >
            SELL / SHORT
          </button>
        </div>
      </div>

      {/* Positions & Orders Tabs */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="font-semibold text-tv-muted mb-2">Open Positions ({portfolio.positions.length})</div>
        {portfolio.positions.length === 0 ? (
          <div className="text-tv-muted text-center py-4">No open positions</div>
        ) : (
          <div className="space-y-2">
            {portfolio.positions.map((p) => (
              <div key={p.id} className="p-2 bg-tv-bg rounded border border-tv-border flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-1 font-bold">
                    <span className={p.side === 'BUY' ? 'text-tv-bull' : 'text-tv-bear'}>{p.side}</span>
                    <span>{p.size} units</span>
                  </div>
                  <div className="text-tv-muted">Entry: ${p.entryPrice.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className={p.unrealizedPnL >= 0 ? 'text-tv-bull font-bold' : 'text-tv-bear font-bold'}>
                    ${p.unrealizedPnL.toFixed(2)}
                  </div>
                  <button
                    onClick={() => handleClosePosition(p.id)}
                    className="text-xs text-tv-muted hover:text-white underline mt-1"
                  >
                    Close
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TradingPanel.tsx
git commit -m "feat: implement TradingPanel order execution HUD with positions and PnL tracking"
```

---

### Task 13: Top Bar, Toolbars & Full System Integration

**Files:**
- Create: `src/components/TopBar.tsx`
- Create: `src/components/LeftToolbar.tsx`
- Modify: `src/App.tsx`
- Test: `tests/integration-smoke.test.ts`

**Interfaces:**
- Consumes: All preceding modules
- Produces: Complete, operational TradingView Clone application with Replay

- [ ] **Step 1: Write integration smoke test for full workflow**

`tests/integration-smoke.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { CandleBuffer } from '../src/core/candle-buffer';
import { ReplayClock } from '../src/core/replay-clock';
import { resampleCandles } from '../src/core/resampler';
import { PaperTradingEngine } from '../src/core/paper-trading';
import { Candle } from '../src/types/market';

describe('TradingView Replay Full Workflow Smoke Test', () => {
  it('loads 1m candles, steps clock forward, resamples to 5m, and executes paper orders', () => {
    const candles1m: Candle[] = Array.from({ length: 60 }, (_, i) => ({
      time: 1700000000 + i * 60,
      open: 100 + i * 0.5,
      high: 101 + i * 0.5,
      low: 99.5 + i * 0.5,
      close: 100.8 + i * 0.5,
      volume: 100,
    }));

    const buffer = CandleBuffer.fromCandles(candles1m);
    const clock = new ReplayClock(buffer, 0);
    const trading = new PaperTradingEngine({ initialBalance: 10000 });

    // Place buy limit order at 100
    trading.placeOrder({ type: 'LIMIT', side: 'BUY', size: 10, limitPrice: 100 });

    // Step clock forward 10 bars
    clock.step(10);
    expect(clock.getState().currentIndex).toBe(10);

    // Process replayed candles through paper trader
    for (let i = 0; i <= 10; i++) {
      trading.processCandle(buffer.getCandle(i)!);
    }

    const portfolio = trading.getPortfolio();
    expect(portfolio.positions).toHaveLength(1);
    expect(portfolio.positions[0].entryPrice).toBe(100);

    // Verify 5m aggregation of the 10 stepped bars
    const visible5m = resampleCandles(buffer.sliceCandles(0, 11), 300);
    expect(visible5m.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify passes**

Run: `npm test tests/integration-smoke.test.ts`
Expected: PASS

- [ ] **Step 3: Implement TopBar and LeftToolbar**

`src/components/TopBar.tsx`:
```tsx
import React, { useRef } from 'react';
import { useStore } from '../store/useStore';
import { Timeframe } from '../types/market';
import { Upload, Activity } from 'lucide-react';
import { parseCandlesCSV } from '../data/csv-parser';
import { fetchBinance1mKlines } from '../data/binance';
import { WorkerClient } from '../workers/worker-client';

interface TopBarProps {
  workerClient: WorkerClient | null;
}

const TIMEFRAMES: Timeframe[] = ['1m', '3m', '5m', '15m', '1h', '4h', '1D'];

export const TopBar: React.FC<TopBarProps> = ({ workerClient }) => {
  const symbol = useStore((s) => s.symbol);
  const timeframe = useStore((s) => s.timeframe);
  const setTimeframe = useStore((s) => s.setTimeframe);
  const setSymbol = useStore((s) => s.setSymbol);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf);
    if (workerClient) {
      workerClient.send({ type: 'SET_TIMEFRAME', payload: { timeframe: tf } });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workerClient) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = parseCandlesCSV(text);
        if (parsed.length === 0) {
          alert('No candles found in CSV');
          return;
        }
        setSymbol(file.name.replace(/\.[^/.]+$/, ''));
        workerClient.send({ type: 'LOAD_DATA', payload: { candles: parsed } });
      } catch (err: any) {
        alert('Failed to parse CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const loadPresetSymbol = async (sym: string) => {
    if (!workerClient) return;
    try {
      setSymbol(sym);
      const candles = await fetchBinance1mKlines(sym, 1000);
      workerClient.send({ type: 'LOAD_DATA', payload: { candles } });
    } catch (err: any) {
      alert('Error fetching symbol: ' + err.message);
    }
  };

  return (
    <header className="h-11 border-b border-tv-border bg-tv-surface flex items-center justify-between px-3 text-xs">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 font-bold text-sm text-tv-text mr-2">
          <Activity className="w-5 h-5 text-tv-primary" />
          <span>TradingView Replay</span>
        </div>

        {/* Symbol Selector */}
        <div className="flex items-center bg-tv-bg rounded border border-tv-border">
          {['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].map((sym) => (
            <button
              key={sym}
              onClick={() => loadPresetSymbol(sym)}
              className={`px-2.5 py-1 font-semibold rounded ${
                symbol === sym ? 'bg-tv-primary text-white' : 'text-tv-muted hover:text-tv-text'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-tv-border mx-1" />

        {/* Timeframe Selectors */}
        <div className="flex items-center bg-tv-bg rounded border border-tv-border">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => handleTimeframeChange(tf)}
              className={`px-2 py-1 font-semibold rounded ${
                timeframe === tf ? 'bg-tv-border text-tv-text' : 'text-tv-muted hover:text-tv-text'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1 bg-tv-bg hover:bg-tv-border text-tv-text rounded border border-tv-border font-medium transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Import CSV</span>
        </button>
      </div>
    </header>
  );
};
```

`src/components/LeftToolbar.tsx`:
```tsx
import React from 'react';
import { MousePointer, TrendingUp, Minus, Square, Layers, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';

export const LeftToolbar: React.FC = () => {
  const activeTool = useStore((s) => s.activeDrawingTool);
  const setActiveTool = useStore((s) => s.setActiveDrawingTool);

  const tools = [
    { id: 'cursor' as const, icon: MousePointer, title: 'Cursor / Magnet' },
    { id: 'trendline' as const, icon: TrendingUp, title: 'Trendline' },
    { id: 'horizontal_ray' as const, icon: Minus, title: 'Horizontal Ray' },
    { id: 'rectangle' as const, icon: Square, title: 'Rectangle (Order Block)' },
  ];

  return (
    <div className="w-12 border-r border-tv-border bg-tv-surface flex flex-col items-center py-2 gap-2 z-10">
      {tools.map((t) => {
        const Icon = t.icon;
        const isActive = activeTool === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            title={t.title}
            className={`p-2.5 rounded transition-colors ${
              isActive ? 'bg-tv-primary text-white' : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 4: Integrate everything into App.tsx**

`src/App.tsx`:
```tsx
import React, { useEffect, useState, useRef } from 'react';
import { WorkerClient } from './workers/worker-client';
import { ChartContainer } from './components/ChartContainer';
import { DrawingOverlay } from './components/DrawingOverlay';
import { TopBar } from './components/TopBar';
import { LeftToolbar } from './components/LeftToolbar';
import { ReplayBar } from './components/ReplayBar';
import { TradingPanel } from './components/TradingPanel';
import { useStore } from './store/useStore';
import { fetchBinance1mKlines } from './data/binance';
import { Candle } from './types/market';
import { IChartApi, ISeriesApi } from '@tradingview/lightweight-charts';

export function App() {
  const [workerClient, setWorkerClient] = useState<WorkerClient | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [lastUpdate, setLastUpdate] = useState<{ candle: Candle; isNewBar: boolean } | null>(null);
  const chartInstanceRef = useRef<{ chart: IChartApi; series: ISeriesApi<'Candlestick'> } | null>(null);
  const setReplayState = useStore((s) => s.setReplayState);
  const setPortfolio = useStore((s) => s.setPortfolio);

  useEffect(() => {
    const client = new WorkerClient();
    setWorkerClient(client);

    const unsubscribe = client.onMessage((msg) => {
      switch (msg.type) {
        case 'SERIES_DATA':
          setCandles(msg.payload.candles);
          break;
        case 'CANDLE_UPDATE':
          setLastUpdate(msg.payload);
          break;
        case 'REPLAY_STATE':
          setReplayState(msg.payload);
          break;
        case 'PORTFOLIO_UPDATE':
          setPortfolio(msg.payload);
          break;
      }
    });

    // Auto-load initial Binance data
    fetchBinance1mKlines('BTCUSDT', 1000).then((initCandles) => {
      client.send({ type: 'LOAD_DATA', payload: { candles: initCandles } });
    }).catch(console.error);

    return () => {
      unsubscribe();
      client.terminate();
    };
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-tv-bg text-tv-text select-none overflow-hidden">
      <TopBar workerClient={workerClient} />

      <div className="flex-1 flex relative overflow-hidden">
        <LeftToolbar />

        <div className="flex-1 relative">
          <ChartContainer
            candles={candles}
            lastUpdate={lastUpdate}
            onChartReady={(chart, series) => {
              chartInstanceRef.current = { chart, series };
            }}
          />
          <DrawingOverlay
            chart={chartInstanceRef.current?.chart ?? null}
            series={chartInstanceRef.current?.series ?? null}
          />
          <ReplayBar workerClient={workerClient} />
        </div>

        <TradingPanel workerClient={workerClient} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run full test suite and verify build**

Run: `npm test`
Expected: All tests pass.

Run: `npm run build`
Expected: Production bundle compiles cleanly with 0 TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/ tests/
git commit -m "feat: complete end-to-end TradingView clone with full replay ability and paper trading"
```
