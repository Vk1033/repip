import React, { useEffect, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  Time,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
} from '@tradingview/lightweight-charts';
import { Candle } from '../types/market';

import { useStore } from '../store/useStore';

export interface ChartThemeColors {
  background: string;
  textColor: string;
  gridColor: string;
  borderColor: string;
  upColor: string;
  downColor: string;
  wickUpColor: string;
  wickDownColor: string;
}

export function getChartThemeColors(theme: 'light' | 'dark'): ChartThemeColors {
  if (theme === 'light') {
    return {
      background: '#e5e8ec',
      textColor: '#334155',
      gridColor: '#d5dbe2',
      borderColor: '#cbd5e1',
      upColor: '#8ea4c8',
      downColor: '#334155',
      wickUpColor: '#64748b',
      wickDownColor: '#1e293b',
    };
  }
  return {
    background: '#131722',
    textColor: '#d1d4dc',
    gridColor: '#1e222d',
    borderColor: '#2a2e39',
    upColor: '#26a69a',
    downColor: '#ef5350',
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
  };
}

export interface ChartContainerProps {
  candles: Candle[];
  lastUpdate: { candle: Candle; isNewBar: boolean } | null;
  onChartReady?: (chart: IChartApi, series: ISeriesApi<'Candlestick'>) => void;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  candles,
  lastUpdate,
  onChartReady,
}) => {
  const theme = useStore((s) => s.theme);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const onChartReadyRef = useRef(onChartReady);
  onChartReadyRef.current = onChartReady;

  // Initialize Chart
  useEffect(() => {
    if (!containerRef.current) return;

    const colors = getChartThemeColors(theme);

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.textColor,
      },
      grid: {
        vertLines: { color: colors.gridColor },
        horzLines: { color: colors.gridColor },
      },
      crosshair: {
        mode: 1, // Magnet
      },
      timeScale: {
        borderColor: colors.borderColor,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: colors.borderColor,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderVisible: true,
      borderColor: colors.downColor,
      wickUpColor: colors.wickUpColor,
      wickDownColor: colors.wickDownColor,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '', // overlay pane
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    if (onChartReadyRef.current) {
      onChartReadyRef.current(chart, candleSeries);
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

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // React to theme changes dynamically
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;
    const colors = getChartThemeColors(theme);
    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.textColor,
      },
      grid: {
        vertLines: { color: colors.gridColor },
        horzLines: { color: colors.gridColor },
      },
      timeScale: { borderColor: colors.borderColor },
      rightPriceScale: { borderColor: colors.borderColor },
    });
    candleSeriesRef.current.applyOptions({
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderColor: colors.downColor,
      wickUpColor: colors.wickUpColor,
      wickDownColor: colors.wickDownColor,
    });
  }, [theme]);

  // Update Full Series Data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    const formattedCandles: CandlestickData<Time>[] = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const formattedVolume: HistogramData<Time>[] = candles.map((c) => ({
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

  return <div ref={containerRef} className="w-full h-full relative" data-testid="chart-container" />;
};
