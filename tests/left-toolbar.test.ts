import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LeftToolbar, LeftToolbarProps } from '../src/components/LeftToolbar';
import { useStore, initialStoreState } from '../src/store/useStore';

// Mock useSyncExternalStore to invoke getSnapshot so the component reflects live useStore state.
vi.spyOn(React, 'useSyncExternalStore').mockImplementation((_subscribe, getSnapshot) => {
  return getSnapshot();
});

function renderLeftToolbar(props: LeftToolbarProps = {}) {
  let capturedTree: React.ReactElement<any> | null = null;
  function Harness() {
    capturedTree = (LeftToolbar as any)(props);
    return capturedTree;
  }
  const html = renderToStaticMarkup(React.createElement(Harness));
  return { html, tree: capturedTree };
}

function findElement(
  node: any,
  predicate: (el: React.ReactElement<any>) => boolean
): React.ReactElement<any> | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findElement(item, predicate);
      if (found) return found;
    }
    return null;
  }
  if (React.isValidElement(node)) {
    if (predicate(node)) return node;
    const children = (node.props as any)?.children;
    return findElement(children, predicate);
  }
  return null;
}

describe('LeftToolbar Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(React, 'useSyncExternalStore').mockImplementation((_subscribe, getSnapshot) => {
      return getSnapshot();
    });
    useStore.setState(initialStoreState);
  });

  describe('Rendering & Structure', () => {
    it('renders left toolbar container with expected testid and styles', () => {
      const { html, tree } = renderLeftToolbar();

      expect(tree).not.toBeNull();
      expect(html).toContain('data-testid="left-toolbar"');
      expect((tree as any)?.props?.className).toContain('w-12 border-r border-tv-border bg-tv-surface');
    });

    it('renders all drawing tool buttons (cursor, trendline, horizontal_ray, rectangle, fibonacci)', () => {
      const { tree } = renderLeftToolbar();

      const tools = ['cursor', 'trendline', 'horizontal_ray', 'rectangle', 'fibonacci'];
      tools.forEach((toolId) => {
        const btn = findElement(tree, (el) => el.props?.['data-testid'] === `tool-${toolId}`);
        expect(btn).not.toBeNull();
      });
    });

    it('applies custom className when provided', () => {
      const { tree } = renderLeftToolbar({ className: 'custom-toolbar-class' });

      expect((tree as any)?.props?.className).toContain('custom-toolbar-class');
    });
  });

  describe('Active Tool Highlighting', () => {
    it('highlights cursor tool by default when activeDrawingTool is cursor', () => {
      useStore.setState({ activeDrawingTool: 'cursor' });
      const { tree } = renderLeftToolbar();

      const cursorBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'tool-cursor');
      const trendlineBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'tool-trendline');

      expect(cursorBtn?.props?.className).toContain('bg-tv-primary text-white');
      expect(trendlineBtn?.props?.className).not.toContain('bg-tv-primary text-white');
    });

    it('highlights trendline tool when activeDrawingTool is trendline', () => {
      useStore.setState({ activeDrawingTool: 'trendline' });
      const { tree } = renderLeftToolbar();

      const trendlineBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'tool-trendline');
      const cursorBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'tool-cursor');

      expect(trendlineBtn?.props?.className).toContain('bg-tv-primary text-white');
      expect(cursorBtn?.props?.className).not.toContain('bg-tv-primary text-white');
    });

    it('highlights horizontal_ray, rectangle, and fibonacci correctly', () => {
      ['horizontal_ray', 'rectangle', 'fibonacci'].forEach((tool) => {
        useStore.setState({ activeDrawingTool: tool as any });
        const { tree } = renderLeftToolbar();

        const btn = findElement(tree, (el) => el.props?.['data-testid'] === `tool-${tool}`);
        expect(btn?.props?.className).toContain('bg-tv-primary text-white');
      });
    });
  });

  describe('Tool Switching Actions', () => {
    it('sets active drawing tool to trendline on click', () => {
      const { tree } = renderLeftToolbar();

      const trendlineBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'tool-trendline');
      trendlineBtn?.props?.onClick?.();

      expect(useStore.getState().activeDrawingTool).toBe('trendline');
    });

    it('sets active drawing tool to horizontal_ray on click', () => {
      const { tree } = renderLeftToolbar();

      const rayBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'tool-horizontal_ray');
      rayBtn?.props?.onClick?.();

      expect(useStore.getState().activeDrawingTool).toBe('horizontal_ray');
    });

    it('sets active drawing tool to rectangle on click', () => {
      const { tree } = renderLeftToolbar();

      const rectBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'tool-rectangle');
      rectBtn?.props?.onClick?.();

      expect(useStore.getState().activeDrawingTool).toBe('rectangle');
    });

    it('sets active drawing tool back to cursor on click', () => {
      useStore.setState({ activeDrawingTool: 'trendline' });
      const { tree } = renderLeftToolbar();

      const cursorBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'tool-cursor');
      cursorBtn?.props?.onClick?.();

      expect(useStore.getState().activeDrawingTool).toBe('cursor');
    });
  });

  describe('Clear Drawings Action', () => {
    it('does not render clear drawings button when onClearDrawings is omitted', () => {
      const { tree } = renderLeftToolbar();

      const clearBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'tool-clear');
      expect(clearBtn).toBeNull();
    });

    it('renders clear drawings button and invokes callback on click', () => {
      const onClearDrawings = vi.fn();
      const { tree } = renderLeftToolbar({ onClearDrawings });

      const clearBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'tool-clear');
      expect(clearBtn).not.toBeNull();

      clearBtn?.props?.onClick?.();
      expect(onClearDrawings).toHaveBeenCalledTimes(1);
    });
  });
});
