# FX Replay UI & Subsystems Architecture Specification

- **Date:** 2026-10-17
- **Project:** repip (FX Replay Clone)
- **Status:** Approved
- **Scope:** Phase 1 — Complete Visual & Interaction Remake of FX Replay (`app.fxreplay.com`)

---

## 1. Executive Summary

This specification defines the architectural design to transform `repip` into a 1:1 fidelity recreation of the **FX Replay** platform (`app.fxreplay.com`) as captured in user session reference data.

The system encompasses:
1. **FX Replay Signature Theming & Lightweight Charts Customization**: Soft slate/grey background, slate-blue bull / dark-charcoal bear candlesticks, crisp gridlines, active quote legend, and light/dark mode toggling.
2. **Top Navigation Ribbon (`FXTopBar`)**: Symbol picker with NQ1! default, complete quick-timeframe ribbon (`30s`, `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `1D`, `1W`, `1M`), indicators trigger, order flow badge, theme toggle, and session code info.
3. **Floating Drawing Toolbar (`FloatingToolbar`)**: Draggable favorite tool pill rendered directly over the canvas with active tool selection, drag handle, and quick actions.
4. **Anchored Execution & Replay Dock (`FXBottomBar`)**:
   - Left: 1-click `Buy` (Blue) and `Sell` (Red) market buttons, lot/quantity selector (`1`), presets menu.
   - Center: Replay playback bar (Jump, Step back, Play/Pause, Step forward, Speed scrubber, Resolution selector).
   - Right: Real-time Account Balance/Equity display (`$101,265.00`), Timezone indicator (`09:29:59 UTC-5`), ETH/RTH session toggle, and `%` / `log` / `auto` chart scaling buttons.
5. **Interactive Right Dock (`RightDock`)**: Vertical tab dock with slide-out interactive drawers:
   - `+ Order`: Full limit/market/stop order ticket with SL/TP calculation and open positions.
   - `Object Tree`: Layer hierarchy of user drawings on the chart with visibility toggling, locking, and deletion.
   - `Watchlist`: Asset watchlist (NQ1!, ES1!, EURUSD, GBPUSD, BTCUSDT) with live prices and click-to-load.
   - `Journal`: Session trade log, win rate, profit factor, net PnL, and notes.
   - `News`: Economic release calendar.
6. **Timeline Economic News Markers (`TimelineNewsMarkers`)**: Synchronized flag badges on the bottom timeline displaying release counts with hoverable detail cards for CPI, FOMC, NFP, etc.

---

## 2. Architecture & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ FXTopBar                                                                               │
│ [Session] [NQ1! +] [30s 1m 3m 5m 15m 30m 1h 2h 4h 1D 1W 1M ▼] [Indicators] [Theme ☀/🌙]│
├────┬───────────────────────────────────────────────────────────────┬──────────────────┤
│ L  │ Main Canvas Container                                         │ RightDock        │
│ e  │ ┌───────────────────────────────────────────────┐             │ ┌──────────────┐ │
│ f  │ │ FloatingToolbar (Draggable Favorites)         │             │ │ Vertical Bar │ │
│ t  │ └───────────────────────────────────────────────┘             │ │ • + Order    │ │
│ T  │                                                               │ │ • Object Tree│ │
│ o  │ ChartContainer (Lightweight Charts + FX Palette)              │ │ • Watchlist  │ │
│ o  │                                                               │ │ • Journal    │ │
│ l  │ ┌───────────────────────────────────────────────────────────┐ │ │ • News       │ │
│ b  │ │ TimelineNewsMarkers (US Flag badges on time scale)        │ │ └──────────────┘ │
│ a  │ └───────────────────────────────────────────────────────────┘ │ [Slide-out     │ │
│ r  │                                                               │  Active Drawer]│ │
├────┴───────────────────────────────────────────────────────────────┴──────────────────┤
│ FXBottomBar                                                                            │
│ [BUY $21,293.25] [SELL $21,293.00] [Qty: 1] │ [⏮ ◀ ▶ ⏭ 1x] │ $101,265.00 UTC-5 ETH/RTH │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Specifications

### 3.1 Theming & Visual Palette

The application supports both FX Replay's signature light slate aesthetic and dark mode, toggled via `useStore`:

| Element | Light Mode (FX Replay Signature) | Dark Mode |
|---|---|---|
| Workspace Background | `#e5e8ec` (soft slate grey) | `#131722` (charcoal dark) |
| Panel / Surface | `#ffffff` / `#f8fafc` | `#1e222d` |
| Borders | `#cbd5e1` / `#e2e8f0` | `#2a2e39` |
| Text Color | `#1e293b` (slate-900) | `#d1d4dc` |
| Up (Bullish) Candle Body | `#94a3b8` / `#8ea4c8` (slate blue) | `#26a69a` (teal green) |
| Up Candle Wick & Border | `#64748b` | `#26a69a` |
| Down (Bearish) Candle Body | `#334155` (dark charcoal) | `#ef5350` (coral red) |
| Down Candle Wick & Border | `#1e293b` | `#ef5350` |
| Buy Button | `#2563eb` (primary blue) | `#2563eb` |
| Sell Button | `#ef4444` (coral red) | `#ef4444` |
| Active Tool Highlight | `#2563eb` with glow | `#2962ff` |

### 3.2 Floating Drawing Toolbar (`FloatingToolbar.tsx`)
- Draggable floating rounded pill with semi-transparent dark backdrop: `bg-[#1e222d]/95 backdrop-blur-md text-white border border-[#333a47] rounded-lg shadow-2xl`.
- Quick-access tools:
  - Drag handle (grip vertical)
  - Crosshair
  - Trendline
  - Horizontal Ray / Level
  - Rectangle / Zone box
  - Text Annotation
  - Fibonacci Retracement
  - Measure / Ruler
  - Brush
  - Clear / Delete active drawings
- Integrated bidirectionally with `DrawingOverlay` and `drawing-manager.ts`.

### 3.3 Anchored FX Bottom Bar (`FXBottomBar.tsx`)
- Positioned across the entire bottom edge (`h-12 w-full bg-white/95 dark:bg-[#1e222d]/95 border-t border-[#cbd5e1] dark:border-[#2a2e39] flex items-center justify-between px-3 z-30`).
- **Left Section (Instant Execution Dock)**:
  - `Buy` button: Blue badge showing `"Buy"`, quantity, and current ask quote.
  - `Sell` button: Red badge showing `"Sell"`, quantity, and current bid quote.
  - `Quantity` input: numeric stepper default `1`.
  - `Presets` dropdown: Quick 0.5%, 1%, 2% risk or 1, 5, 10 lots.
  - Dispatches immediate market orders through `workerClient.send({ type: 'PLACE_ORDER', ... })`.
- **Center Section (Replay Controls)**:
  - Jump button (opens timestamp jump modal)
  - Step backward (`delta: -1`)
  - Play / Pause toggle
  - Step forward (`delta: 1`)
  - Speed selector slider / dropdown (0.5x, 1x, 2x, 5x, 10x, 30x, 60x)
  - Timeframe resolution badge (`1m`, `5m`, etc.)
- **Right Section (Account & Scale Metrics)**:
  - Real-time Account Equity/Balance (e.g. `$101,265.00` formatted from `portfolio.equity`)
  - Session time: `09:29:59 UTC-5` formatted from current replay candle timestamp
  - `ETH` / `RTH` toggle
  - Scale buttons: `%` (percentage scale), `log` (logarithmic), `auto` (auto-fit scale)

### 3.4 Right Dock & Slide-out Panels (`RightDock.tsx`)
- Vertical icon dock fixed on the right margin with tooltips:
  - `+ Order`: Opens the Trading Order Ticket (market/limit/stop, pip risk calculator, open positions list with close button).
  - `Object tree`: Displays all created shapes from `DrawingOverlay`. Users can rename, toggle visibility, lock, or delete individual shapes.
  - `Watchlist`: Displays quotes for `NQ1!`, `ES1!`, `EURUSD`, `GBPUSD`, `BTCUSDT`. Clicking loads the respective dataset into the simulation worker.
  - `Journal`: Records all completed trades in the session, calculating Win Rate %, Profit Factor, and Net PnL, with a text area to save notes per session.
  - `News`: Lists economic releases for the day/week with impact badges.
- Clicking an active tab slides out an adjacent panel (`w-80 h-full border-l border-border bg-surface`). Clicking again or clicking the close button collapses it.

### 3.5 Timeline Economic News Badges (`TimelineNewsMarkers.tsx`)
- Rendered on the chart time axis overlay.
- Displays circular country flag badges (e.g., US flag circle with event count badge `10`, `12`, `15`).
- Syncs to replay timestamps: As replay advances, upcoming badges are highlighted.
- Hovering/clicking a badge displays an interactive card with:
  - Release Title (e.g. "US Core CPI MoM", "FOMC Statement", "Nonfarm Payrolls")
  - Impact level badge (High / Medium / Low)
  - Actual, Forecast, Previous values

---

## 4. State Management & Worker Protocol Extensions

### 4.1 Zustand Store Extensions (`useStore.ts`)
```ts
interface FXUIState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  activeRightPanel: 'order' | 'objectTree' | 'watchlist' | 'journal' | 'news' | null;
  setActiveRightPanel: (panel: 'order' | 'objectTree' | 'watchlist' | 'journal' | 'news' | null) => void;
  rthMode: 'ETH' | 'RTH';
  setRthMode: (mode: 'ETH' | 'RTH') => void;
  scaleMode: 'normal' | 'percent' | 'log';
  setScaleMode: (mode: 'normal' | 'percent' | 'log') => void;
  journalEntries: JournalEntry[];
  addJournalEntry: (entry: JournalEntry) => void;
}
```

### 4.2 Drawing Overlay Sync with Object Tree
`DrawingShape` state in `App.tsx` is exposed to `RightDock`'s Object Tree view to allow toggling `hidden`, `locked`, and deletion.

---

## 5. Verification & Testing Strategy
1. **Unit Tests**:
   - `tests/fx-bottom-bar.test.tsx`: Tests instant Buy/Sell dispatches, lot size inputs, and replay controls.
   - `tests/right-dock.test.tsx`: Tests panel toggling between Order, Object Tree, Watchlist, Journal, and News.
   - `tests/floating-toolbar.test.tsx`: Tests tool selection and drag state.
   - `tests/theme-engine.test.ts`: Tests theme switching and chart color application.
2. **Integration Verification**:
   - Verify full end-to-end replay with chart candles in FX Replay signature light theme.
   - Verify placing Buy/Sell trades from the bottom dock updates account balance in real-time.
   - Run `npm test` and `npm run build` to ensure type-checking and tests pass with 0 regressions.
