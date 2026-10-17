import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../src/store/useStore';
import { getChartThemeColors } from '../src/components/ChartContainer';

describe('Theme Engine & Visual Tokens', () => {
  beforeEach(() => {
    useStore.getState().resetStore();
  });

  it('defaults to light theme matching FX Replay', () => {
    expect(useStore.getState().theme).toBe('light');
  });

  it('allows toggling between light and dark themes', () => {
    useStore.getState().setTheme('dark');
    expect(useStore.getState().theme).toBe('dark');

    useStore.getState().setTheme('light');
    expect(useStore.getState().theme).toBe('light');
  });

  it('provides correct FX Replay slate color palette for light mode', () => {
    const lightColors = getChartThemeColors('light');
    expect(lightColors.background).toBe('#e5e8ec');
    expect(lightColors.textColor).toBe('#334155');
    expect(lightColors.gridColor).toBe('#d5dbe2');
    expect(lightColors.upColor).toBe('#8ea4c8'); // Slate-blue bull candle
    expect(lightColors.downColor).toBe('#334155'); // Dark charcoal bear candle
  });

  it('provides correct color palette for dark mode', () => {
    const darkColors = getChartThemeColors('dark');
    expect(darkColors.background).toBe('#131722');
    expect(darkColors.textColor).toBe('#d1d4dc');
    expect(darkColors.upColor).toBe('#26a69a');
    expect(darkColors.downColor).toBe('#ef5350');
  });
});
