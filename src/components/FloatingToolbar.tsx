import React, { useState, useRef, useEffect, FC } from 'react';
import {
  GripVertical,
  MousePointer,
  TrendingUp,
  Minus,
  Square,
  AlignJustify,
  ArrowUpDown,
  Type,
  Paintbrush,
  Ruler,
  Trash2,
} from 'lucide-react';
import { AppStore } from '../store/useStore';

export type DrawingTool = AppStore['activeDrawingTool'];

export interface FloatingToolbarProps {
  activeTool: DrawingTool;
  onSelectTool: (tool: DrawingTool) => void;
  onClearDrawings: () => void;
  initialPosition?: { x: number; y: number };
}

export const FloatingToolbar: FC<FloatingToolbarProps> = ({
  activeTool,
  onSelectTool,
  onClearDrawings,
  initialPosition = { x: 80, y: 24 },
}) => {
  const [position, setPosition] = useState(initialPosition);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: initialPosition.x,
    posY: initialPosition.y,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvent.clientX - dragStartRef.current.startX;
      const dy = moveEvent.clientY - dragStartRef.current.startY;
      setPosition({
        x: Math.max(10, dragStartRef.current.posX + dx),
        y: Math.max(10, dragStartRef.current.posY + dy),
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const tools: Array<{ id: NonNullable<DrawingTool>; icon: React.ReactNode; label: string }> = [
    { id: 'cursor', icon: <MousePointer className="w-3.5 h-3.5" />, label: 'Cursor' },
    { id: 'trendline', icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Trendline' },
    { id: 'horizontal_ray', icon: <Minus className="w-3.5 h-3.5" />, label: 'Horizontal Ray' },
    { id: 'rectangle', icon: <Square className="w-3.5 h-3.5" />, label: 'Rectangle / Box' },
    { id: 'fibonacci', icon: <AlignJustify className="w-3.5 h-3.5" />, label: 'Fibonacci' },
    { id: 'position', icon: <ArrowUpDown className="w-3.5 h-3.5" />, label: 'Long/Short Position' },
    { id: 'text', icon: <Type className="w-3.5 h-3.5" />, label: 'Text Note' },
    { id: 'brush', icon: <Paintbrush className="w-3.5 h-3.5" />, label: 'Brush' },
    { id: 'ruler', icon: <Ruler className="w-3.5 h-3.5" />, label: 'Measure' },
  ];

  return (
    <div
      data-testid="floating-toolbar"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="absolute z-20 flex items-center bg-[#1e222d]/95 text-white/80 border border-[#333a47] shadow-xl backdrop-blur-md rounded-lg p-1 gap-0.5 select-none transition-shadow hover:shadow-2xl"
    >
      {/* Drag handle */}
      <div
        data-testid="drag-handle"
        onMouseDown={handleMouseDown}
        title="Drag toolbar"
        className="cursor-grab active:cursor-grabbing p-1 text-white/40 hover:text-white/80"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      <div className="w-px h-4 bg-[#333a47] mx-0.5" />

      {/* Tools */}
      {tools.map((t) => {
        const isActive = activeTool === t.id;
        return (
          <button
            key={t.id}
            data-testid={`tool-${t.id}`}
            title={t.label}
            onClick={() => onSelectTool(t.id)}
            className={`p-1.5 rounded transition-colors ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'hover:bg-white/10 hover:text-white'
            }`}
          >
            {t.icon}
          </button>
        );
      })}

      <div className="w-px h-4 bg-[#333a47] mx-0.5" />

      {/* Clear Drawings */}
      <button
        data-testid="tool-clear"
        title="Clear All Drawings"
        onClick={onClearDrawings}
        className="p-1.5 rounded text-white/60 hover:text-red-400 hover:bg-white/10 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
