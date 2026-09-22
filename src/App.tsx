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
