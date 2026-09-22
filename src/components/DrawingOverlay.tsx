import React, { useRef, useEffect, useState, useCallback } from 'react';
import { IChartApi, ISeriesApi, Time } from '@tradingview/lightweight-charts';
import { DrawingShape, DrawingPoint } from '../core/drawing-manager';
import { useStore } from '../store/useStore';

export interface DrawingOverlayProps {
  chart: IChartApi | null;
  series: ISeriesApi<'Candlestick'> | null;
  initialShapes?: DrawingShape[];
  onShapesChange?: (shapes: DrawingShape[]) => void;
}

export const DrawingOverlay: React.FC<DrawingOverlayProps> = ({
  chart,
  series,
  initialShapes,
  onShapesChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shapes, setShapes] = useState<DrawingShape[]>(initialShapes ?? []);
  const [currentPoints, setCurrentPoints] = useState<DrawingPoint[]>([]);
  const [mousePreview, setMousePreview] = useState<{ x: number; y: number } | null>(null);

  const activeTool = useStore((s) => s.activeDrawingTool);
  const setActiveTool = useStore((s) => s.setActiveDrawingTool);

  // Sync shapes state changes to optional parent callback
  const updateShapes = useCallback(
    (updater: (prev: DrawingShape[]) => DrawingShape[]) => {
      setShapes((prev) => {
        const next = updater(prev);
        if (onShapesChange) {
          onShapesChange(next);
        }
        return next;
      });
    },
    [onShapesChange]
  );

  // Redraw all shapes on the canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !chart || !series) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const timeScale = chart.timeScale();

    // 1. Draw completed shapes
    for (const shape of shapes) {
      const p1 = shape.points[0];
      const p2 = shape.points[1];
      if (!p1) continue;

      const x1 = timeScale.timeToCoordinate(p1.time as unknown as Time) ?? -100;
      const y1 = series.priceToCoordinate(p1.price) ?? -100;

      if (shape.type === 'horizontal_ray') {
        ctx.strokeStyle = shape.color || '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(canvas.width, y1);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (shape.type === 'trendline' && p2) {
        const x2 = timeScale.timeToCoordinate(p2.time as unknown as Time) ?? -100;
        const y2 = series.priceToCoordinate(p2.price) ?? -100;
        ctx.strokeStyle = shape.color || '#2962ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else if (shape.type === 'rectangle' && p2) {
        const x2 = timeScale.timeToCoordinate(p2.time as unknown as Time) ?? -100;
        const y2 = series.priceToCoordinate(p2.price) ?? -100;
        ctx.fillStyle = 'rgba(41, 98, 255, 0.15)';
        ctx.strokeStyle = shape.color || '#2962ff';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      } else if (shape.type === 'position' && p2) {
        const x2 = timeScale.timeToCoordinate(p2.time as unknown as Time) ?? -100;
        const y2 = series.priceToCoordinate(p2.price) ?? -100;
        const left = Math.min(x1, x2);
        const width = Math.abs(x2 - x1);

        // Profit target zone (green)
        const targetTop = Math.min(y1, y2);
        const targetHeight = Math.abs(y2 - y1);
        ctx.fillStyle = 'rgba(38, 166, 154, 0.2)';
        ctx.strokeStyle = '#26a69a';
        ctx.lineWidth = 1.5;
        ctx.fillRect(left, targetTop, width, targetHeight);
        ctx.strokeRect(left, targetTop, width, targetHeight);

        // Stop loss zone (red, symmetric 1:1 risk box)
        const isLong = p2.price >= p1.price;
        const stopY = isLong ? y1 : y1 - targetHeight;
        ctx.fillStyle = 'rgba(239, 83, 80, 0.2)';
        ctx.strokeStyle = '#ef5350';
        ctx.lineWidth = 1.5;
        ctx.fillRect(left, stopY, width, targetHeight);
        ctx.strokeRect(left, stopY, width, targetHeight);

        // Entry baseline
        ctx.strokeStyle = '#d1d4dc';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(left, y1);
        ctx.lineTo(left + width, y1);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (shape.type === 'fibonacci' && p2) {
        const x2 = timeScale.timeToCoordinate(p2.time as unknown as Time) ?? -100;
        const y2 = series.priceToCoordinate(p2.price) ?? -100;
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
        const dy = y2 - y1;

        levels.forEach((lvl) => {
          const y = y1 + dy * lvl;
          ctx.strokeStyle = shape.color || '#2962ff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(left, y);
          ctx.lineTo(right, y);
          ctx.stroke();
        });
      }
    }

    // 2. Draw in-progress anchor and preview
    if (currentPoints.length > 0 && activeTool && activeTool !== 'cursor') {
      const p1 = currentPoints[0];
      const x1 = timeScale.timeToCoordinate(p1.time as unknown as Time) ?? p1.x ?? -100;
      const y1 = series.priceToCoordinate(p1.price) ?? p1.y ?? -100;

      // Anchor point circle
      ctx.fillStyle = '#2962ff';
      ctx.beginPath();
      ctx.arc(x1, y1, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Live cursor preview line / rect
      if (mousePreview) {
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 1.5;

        if (activeTool === 'trendline') {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(mousePreview.x, mousePreview.y);
          ctx.stroke();
        } else if (activeTool === 'rectangle') {
          ctx.fillStyle = 'rgba(41, 98, 255, 0.1)';
          ctx.fillRect(x1, y1, mousePreview.x - x1, mousePreview.y - y1);
          ctx.strokeRect(x1, y1, mousePreview.x - x1, mousePreview.y - y1);
        } else if (activeTool === 'position') {
          const left = Math.min(x1, mousePreview.x);
          const width = Math.abs(mousePreview.x - x1);
          ctx.fillStyle = 'rgba(38, 166, 154, 0.15)';
          ctx.fillRect(left, Math.min(y1, mousePreview.y), width, Math.abs(mousePreview.y - y1));
          ctx.strokeRect(left, Math.min(y1, mousePreview.y), width, Math.abs(mousePreview.y - y1));
        }

        ctx.restore();
      }
    }
  }, [chart, series, shapes, currentPoints, activeTool, mousePreview]);

  // Subscribe to chart zoom, pan, and scroll range events
  useEffect(() => {
    if (!chart) return;
    const timeScale = chart.timeScale();

    timeScale.subscribeVisibleTimeRangeChange(redraw);
    timeScale.subscribeVisibleLogicalRangeChange(redraw);
    redraw();

    return () => {
      timeScale.unsubscribeVisibleTimeRangeChange(redraw);
      timeScale.unsubscribeVisibleLogicalRangeChange(redraw);
    };
  }, [chart, redraw]);

  // Adjust canvas pixel buffer resolution to match container sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800);
      const h = parent?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        redraw();
      }
    };

    updateSize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
      resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(canvas.parentElement);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateSize);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateSize);
      }
    };
  }, [redraw]);

  // Reset in-progress points when tool is switched to cursor or cancelled
  useEffect(() => {
    if (activeTool === 'cursor' || !activeTool) {
      setCurrentPoints([]);
      setMousePreview(null);
    }
  }, [activeTool]);

  // Handle escape key to cancel active drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCurrentPoints([]);
        setMousePreview(null);
        setActiveTool('cursor');
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [setActiveTool]);

  // Handle canvas mouse move for interactive preview
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeTool || activeTool === 'cursor' || currentPoints.length === 0) {
      if (mousePreview) setMousePreview(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePreview({ x, y });
  };

  // Handle clicks to place points or complete shapes
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
      updateShapes((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          type: 'horizontal_ray',
          points: [pt],
          color: '#f59e0b',
        },
      ]);
      setActiveTool('cursor');
    } else if (
      activeTool === 'trendline' ||
      activeTool === 'rectangle' ||
      activeTool === 'position' ||
      activeTool === 'fibonacci'
    ) {
      if (currentPoints.length === 0) {
        setCurrentPoints([pt]);
      } else {
        const color = activeTool === 'rectangle' ? '#2962ff' : '#2962ff';
        updateShapes((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            type: activeTool,
            points: [currentPoints[0], pt],
            color,
          },
        ]);
        setCurrentPoints([]);
        setMousePreview(null);
        setActiveTool('cursor');
      }
    }
  };

  const isInteractive = activeTool !== 'cursor' && activeTool !== null;

  return (
    <canvas
      ref={canvasRef}
      data-testid="drawing-overlay"
      width={typeof window !== 'undefined' ? window.innerWidth : 800}
      height={typeof window !== 'undefined' ? window.innerHeight : 600}
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      className={`absolute inset-0 z-10 ${
        isInteractive ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
      }`}
    />
  );
};
