# FX Replay UI & Subsystems Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul `repip` into a 1:1 visual and functional recreation of the FX Replay platform (`app.fxreplay.com`), featuring the signature light-slate chart theme, draggable floating drawing toolbar, bottom execution & replay dock, right slide-out tool drawers (Order, Object Tree, Watchlist, Journal, News), and timeline economic news badges.

**Architecture:** Decompose the application into modular UI and control components integrated with Zustand store and the existing Web Worker simulation engine. Lightweight Charts is themed dynamically for FX Replay's slate palette. Interactive drawers on the right dock communicate with chart drawings and paper trading state.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, `@tradingview/lightweight-charts`, Lucide React, Zustand, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-17-fxreplay-ui-design.md`

## Global Constraints
- Light mode is the default matching FX Replay screenshot reference.
- Preserve existing paper trading, resampler, candle buffer, and Web Worker protocols.
- Ensure 100% passing tests with no regressions on existing test suites.
- Strict TDD: Write failing tests before writing implementations.

---

### Task 1: Theme Engine & FX Replay Visual Tokens

**Files:**
- Modify: `src/store/useStore.ts`
- Modify: `tailwind.config.js`
- Modify: `src/components/ChartContainer.tsx`
- Test: `tests/theme-engine.test.ts`

**Interfaces:**
- Produces: `theme: 'light' | 'dark'`, `setTheme: (theme: 'light' | 'dark') => void` in `useStore`.
- Produces: `getChartThemeColors(theme: 'light' | 'dark')` in `ChartContainer.tsx`.

- [ ] **Step 1: Write failing test for theme state and chart colors**
Create `tests/theme-engine.test.ts` testing `useStore` theme default `'light'`, toggle to `'dark'`, and color token mapping.
- [ ] **Step 2: Run test to confirm failure**
Run `npx vitest run tests/theme-engine.test.ts`.
- [ ] **Step 3: Implement theme state and chart color mapping**
Update `src/store/useStore.ts` with `theme` state and `setTheme`.
Update `tailwind.config.js` with FX Replay colors (`fx-canvas`, `fx-surface`, `fx-bull`, `fx-bear`, `fx-border`).
Update `src/components/ChartContainer.tsx` to apply the palette to Lightweight Charts.
- [ ] **Step 4: Run test to confirm passing**
Run `npx vitest run tests/theme-engine.test.ts`.
- [ ] **Step 5: Commit**
`git commit -am "feat: implement FX Replay theme engine and chart styling"`

---

### Task 2: Floating Favorite Drawing Toolbar (`FloatingToolbar.tsx`)

**Files:**
- Create: `src/components/FloatingToolbar.tsx`
- Modify: `src/components/DrawingOverlay.tsx`
- Test: `tests/floating-toolbar.test.tsx`

**Interfaces:**
- Consumes: `activeTool: DrawingTool`, `onSelectTool: (tool: DrawingTool) => void`, `onClearDrawings: () => void`.
- Produces: `<FloatingToolbar activeTool={tool} onSelectTool={setTool} onClearDrawings={clear} />`.

- [ ] **Step 1: Write failing test for FloatingToolbar component**
Create `tests/floating-toolbar.test.tsx` testing render of favorite tools, active selection highlighting, clear callback, and drag handle presence.
- [ ] **Step 2: Run test to confirm failure**
Run `npx vitest run tests/floating-toolbar.test.tsx`.
- [ ] **Step 3: Implement FloatingToolbar**
Create `src/components/FloatingToolbar.tsx` with draggable pill layout, icons (Crosshair, Trendline, Ray, Rectangle, Text, Fib, Ruler, Brush, Trash), and active tool highlighting.
- [ ] **Step 4: Run test to confirm passing**
Run `npx vitest run tests/floating-toolbar.test.tsx`.
- [ ] **Step 5: Commit**
`git commit -am "feat: implement draggable FloatingToolbar for favorite drawing tools"`

---

### Task 3: Anchored FX Bottom Bar (`FXBottomBar.tsx`)

**Files:**
- Create: `src/components/FXBottomBar.tsx`
- Test: `tests/fx-bottom-bar.test.tsx`

**Interfaces:**
- Consumes: `workerClient: WorkerClient | null`, `onJumpClick?: () => void`, `lastPrice?: number`.
- Produces: `<FXBottomBar workerClient={client} onJumpClick={jump} lastPrice={price} />`.

- [ ] **Step 1: Write failing test for FXBottomBar**
Create `tests/fx-bottom-bar.test.tsx` verifying:
- 1-click Buy dispatches `PLACE_ORDER` with `side: 'BUY'`.
- 1-click Sell dispatches `PLACE_ORDER` with `side: 'SELL'`.
- Lot quantity input changes.
- Replay controls (Play, Pause, Step forward/back, Speed change) dispatch appropriate worker messages.
- Account equity formatted display (`$101,265.00`).
- Timezone and scale toggle buttons render.
- [ ] **Step 2: Run test to confirm failure**
Run `npx vitest run tests/fx-bottom-bar.test.tsx`.
- [ ] **Step 3: Implement FXBottomBar**
Build `src/components/FXBottomBar.tsx` matching the FX Replay screenshot layout.
- [ ] **Step 4: Run test to confirm passing**
Run `npx vitest run tests/fx-bottom-bar.test.tsx`.
- [ ] **Step 5: Commit**
`git commit -am "feat: implement FXBottomBar execution and replay dock"`

---

### Task 4: Right Dock & Slide-out Panels (`RightDock.tsx`)

**Files:**
- Create: `src/components/RightDock.tsx`
- Test: `tests/right-dock.test.tsx`

**Interfaces:**
- Consumes: `workerClient: WorkerClient | null`, `shapes: DrawingShape[]`, `onShapesChange: (shapes: DrawingShape[]) => void`.
- Produces: `<RightDock workerClient={client} shapes={shapes} onShapesChange={setShapes} />`.

- [ ] **Step 1: Write failing test for RightDock**
Create `tests/right-dock.test.tsx` testing tab selection (+ Order, Object tree, Watchlist, Journal, News), slide-out drawer rendering, Object Tree shape deletion/locking, and Watchlist symbol selection.
- [ ] **Step 2: Run test to confirm failure**
Run `npx vitest run tests/right-dock.test.tsx`.
- [ ] **Step 3: Implement RightDock and panels**
Create `src/components/RightDock.tsx` with vertical tabs and slide-out panels for Order Ticket, Object Tree, Watchlist, Journal, and News.
- [ ] **Step 4: Run test to confirm passing**
Run `npx vitest run tests/right-dock.test.tsx`.
- [ ] **Step 5: Commit**
`git commit -am "feat: implement RightDock with Order, Object Tree, Watchlist, Journal, and News drawers"`

---

### Task 5: Timeline Economic News Badges (`TimelineNewsMarkers.tsx`)

**Files:**
- Create: `src/components/TimelineNewsMarkers.tsx`
- Test: `tests/timeline-news-markers.test.tsx`

**Interfaces:**
- Consumes: `currentTimestamp: number`.
- Produces: `<TimelineNewsMarkers currentTimestamp={ts} />`.

- [ ] **Step 1: Write failing test for TimelineNewsMarkers**
Create `tests/timeline-news-markers.test.tsx` verifying news badge rendering along the time axis, event count badges, and popup release details card on hover/click.
- [ ] **Step 2: Run test to confirm failure**
Run `npx vitest run tests/timeline-news-markers.test.tsx`.
- [ ] **Step 3: Implement TimelineNewsMarkers**
Create `src/components/TimelineNewsMarkers.tsx` with flag badges and interactive popover cards (CPI, FOMC, NFP, PMI).
- [ ] **Step 4: Run test to confirm passing**
Run `npx vitest run tests/timeline-news-markers.test.tsx`.
- [ ] **Step 5: Commit**
`git commit -am "feat: implement TimelineNewsMarkers with release details card"`

---

### Task 6: FXTopBar & Full Assembly in `App.tsx`

**Files:**
- Create/Modify: `src/components/FXTopBar.tsx`
- Modify: `src/App.tsx`
- Test: `tests/fx-assembly.test.tsx`

**Interfaces:**
- Assembles `FXTopBar`, `LeftToolbar`, `ChartContainer`, `FloatingToolbar`, `TimelineNewsMarkers`, `FXBottomBar`, and `RightDock`.

- [ ] **Step 1: Write failing test for FXTopBar and App assembly**
Create `tests/fx-assembly.test.tsx` testing the integrated page rendering, topbar symbol ribbon, and component presence.
- [ ] **Step 2: Run test to confirm failure**
Run `npx vitest run tests/fx-assembly.test.tsx`.
- [ ] **Step 3: Implement FXTopBar and update App.tsx**
Create `FXTopBar.tsx` with complete timeframe ribbon (`30s`, `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `1D`, `1W`, `1M`), indicators trigger, order flow badge, theme toggle, and session code. Wire all components together in `App.tsx`.
- [ ] **Step 4: Run test to confirm passing**
Run `npx vitest run tests/fx-assembly.test.tsx`.
- [ ] **Step 5: Run full test suite & build check**
Run `npm test` and `npm run build`.
- [ ] **Step 6: Commit**
`git commit -am "feat: assemble complete FX Replay platform with top ribbon and integrated subsystems"`
