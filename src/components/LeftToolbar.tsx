import type { FC } from 'react';
import { MousePointer, TrendingUp, Minus, Square, Layers, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';

export interface LeftToolbarProps {
  className?: string;
  onClearDrawings?: () => void;
}

export const LeftToolbar: FC<LeftToolbarProps> = ({ className, onClearDrawings }) => {
  const activeTool = useStore((s) => s.activeDrawingTool);
  const setActiveTool = useStore((s) => s.setActiveDrawingTool);

  const tools = [
    { id: 'cursor' as const, icon: MousePointer, title: 'Cursor / Magnet' },
    { id: 'trendline' as const, icon: TrendingUp, title: 'Trendline' },
    { id: 'horizontal_ray' as const, icon: Minus, title: 'Horizontal Ray' },
    { id: 'rectangle' as const, icon: Square, title: 'Rectangle (Order Block)' },
    { id: 'fibonacci' as const, icon: Layers, title: 'Fibonacci Retracement' },
  ];

  return (
    <div
      data-testid="left-toolbar"
      className={`w-12 border-r border-tv-border bg-tv-surface flex flex-col items-center py-2 gap-2 z-10 select-none ${
        className ?? ''
      }`}
    >
      {tools.map((t) => {
        const Icon = t.icon;
        const isActive = activeTool === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            title={t.title}
            aria-label={t.title}
            data-testid={`tool-${t.id}`}
            className={`p-2.5 rounded transition-colors ${
              isActive ? 'bg-tv-primary text-white' : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}

      {onClearDrawings && (
        <>
          <div className="w-6 h-px bg-tv-border my-1" />
          <button
            onClick={onClearDrawings}
            title="Clear All Drawings"
            aria-label="Clear All Drawings"
            data-testid="tool-clear"
            className="p-2.5 rounded text-tv-muted hover:text-tv-bear hover:bg-tv-hover transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};
