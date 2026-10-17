import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FloatingToolbar } from '../src/components/FloatingToolbar';

describe('FloatingToolbar Component', () => {
  it('renders with floating container and drag handle', () => {
    const html = renderToStaticMarkup(
      <FloatingToolbar
        activeTool="cursor"
        onSelectTool={vi.fn()}
        onClearDrawings={vi.fn()}
      />
    );

    expect(html).toContain('data-testid="floating-toolbar"');
    expect(html).toContain('data-testid="drag-handle"');
  });

  it('renders favorite drawing tools with correct active state', () => {
    const html = renderToStaticMarkup(
      <FloatingToolbar
        activeTool="rectangle"
        onSelectTool={vi.fn()}
        onClearDrawings={vi.fn()}
      />
    );

    expect(html).toContain('data-testid="tool-cursor"');
    expect(html).toContain('data-testid="tool-trendline"');
    expect(html).toContain('data-testid="tool-horizontal_ray"');
    expect(html).toContain('data-testid="tool-rectangle"');
    expect(html).toContain('data-testid="tool-fibonacci"');
    expect(html).toContain('data-testid="tool-clear"');

    // The active tool should have active styling / class
    expect(html).toMatch(/data-testid="tool-rectangle"[^>]*class="[^"]*(bg-blue-600|text-blue-400|bg-fx-primary)/);
  });
});
