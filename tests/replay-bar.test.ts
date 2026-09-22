import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReplayBar, SPEED_OPTIONS, ReplayBarProps } from '../src/components/ReplayBar';
import { useStore, initialStoreState } from '../src/store/useStore';
import { WorkerClient } from '../src/workers/worker-client';

// In server-side rendering, React's default useSyncExternalStore calls getServerSnapshot.
// In client/browser, it calls getSnapshot (api.getState).
// Mock useSyncExternalStore to invoke getSnapshot so the component reflects live useStore state.
vi.spyOn(React, 'useSyncExternalStore').mockImplementation((_subscribe, getSnapshot) => {
  return getSnapshot();
});

function renderReplayBar(props: ReplayBarProps) {
  let capturedTree: React.ReactElement<any> | null = null;
  function Harness() {
    capturedTree = (ReplayBar as any)(props);
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

describe('ReplayBar Component', () => {
  let mockWorkerClient: {
    send: ReturnType<typeof vi.fn>;
    onMessage: ReturnType<typeof vi.fn>;
    terminate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    useStore.setState(initialStoreState);
    mockWorkerClient = {
      send: vi.fn(),
      onMessage: vi.fn(),
      terminate: vi.fn(),
    };
  });

  describe('Conditional Rendering & Structure', () => {
    it('returns null and renders empty string when workerClient is null', () => {
      const { html, tree } = renderReplayBar({ workerClient: null });
      expect(tree).toBeNull();
      expect(html).toBe('');
    });

    it('renders floating HUD container with expected styling classes when workerClient is provided', () => {
      const { html, tree } = renderReplayBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      expect(tree).not.toBeNull();
      const root = tree as any;
      expect(root?.props['data-testid']).toBe('replay-bar');
      expect(root?.props.className).toContain('absolute bottom-6 left-1/2 -translate-x-1/2');
      expect(root?.props.className).toContain('bg-tv-surface/95 border border-tv-border backdrop-blur-md rounded-full');
      expect(html).toContain('data-testid="replay-bar"');
    });
  });

  describe('Jump Tool Action', () => {
    it('invokes onJumpClick callback when jump button is clicked', () => {
      const onJumpClick = vi.fn();
      const { tree } = renderReplayBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
        onJumpClick,
      });

      const jumpBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'jump-btn');
      expect(jumpBtn).not.toBeNull();
      expect(jumpBtn?.props?.title).toBe('Jump to Candle');
      expect(jumpBtn?.props?.['aria-label']).toBe('Jump to Candle');

      jumpBtn?.props?.onClick?.();
      expect(onJumpClick).toHaveBeenCalledTimes(1);
    });

    it('handles jump button click safely when onJumpClick prop is omitted', () => {
      const { tree } = renderReplayBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const jumpBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'jump-btn');
      expect(jumpBtn).not.toBeNull();
      expect(() => jumpBtn?.props?.onClick?.()).not.toThrow();
    });
  });

  describe('Playback Controls (Play / Pause)', () => {
    it('shows Play icon and sends PLAY message when clicked while stopped', () => {
      useStore.setState({
        replayState: {
          currentIndex: 0,
          isPlaying: false,
          speed: 1,
          currentCandle: null,
          totalCandles: 100,
        },
      });

      const { tree, html } = renderReplayBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const playPauseBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'play-pause-btn');
      expect(playPauseBtn).not.toBeNull();
      expect(playPauseBtn?.props?.title).toBe('Play');
      expect(playPauseBtn?.props?.['aria-label']).toBe('Play');
      expect(html).toContain('lucide-play');
      expect(html).not.toContain('lucide-pause');

      playPauseBtn?.props?.onClick?.();
      expect(mockWorkerClient.send).toHaveBeenCalledTimes(1);
      expect(mockWorkerClient.send).toHaveBeenCalledWith({ type: 'PLAY' });
    });

    it('shows Pause icon and sends PAUSE message when clicked while playing', () => {
      useStore.setState({
        replayState: {
          currentIndex: 15,
          isPlaying: true,
          speed: 1,
          currentCandle: null,
          totalCandles: 100,
        },
      });

      const { tree, html } = renderReplayBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const playPauseBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'play-pause-btn');
      expect(playPauseBtn).not.toBeNull();
      expect(playPauseBtn?.props?.title).toBe('Pause');
      expect(playPauseBtn?.props?.['aria-label']).toBe('Pause');
      expect(html).toContain('lucide-pause');
      expect(html).not.toContain('lucide-play');

      playPauseBtn?.props?.onClick?.();
      expect(mockWorkerClient.send).toHaveBeenCalledTimes(1);
      expect(mockWorkerClient.send).toHaveBeenCalledWith({ type: 'PAUSE' });
    });
  });

  describe('Step Controls', () => {
    it('sends STEP message with delta -1 when step backward button is clicked', () => {
      const { tree } = renderReplayBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const stepBackBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'step-back-btn');
      expect(stepBackBtn).not.toBeNull();
      expect(stepBackBtn?.props?.title).toBe('Step Back');
      expect(stepBackBtn?.props?.['aria-label']).toBe('Step Back');

      stepBackBtn?.props?.onClick?.();
      expect(mockWorkerClient.send).toHaveBeenCalledTimes(1);
      expect(mockWorkerClient.send).toHaveBeenCalledWith({
        type: 'STEP',
        payload: { delta: -1 },
      });
    });

    it('sends STEP message with delta +1 when step forward button is clicked', () => {
      const { tree } = renderReplayBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const stepForwardBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'step-forward-btn');
      expect(stepForwardBtn).not.toBeNull();
      expect(stepForwardBtn?.props?.title).toBe('Step Forward (1 bar)');
      expect(stepForwardBtn?.props?.['aria-label']).toBe('Step Forward (1 bar)');

      stepForwardBtn?.props?.onClick?.();
      expect(mockWorkerClient.send).toHaveBeenCalledTimes(1);
      expect(mockWorkerClient.send).toHaveBeenCalledWith({
        type: 'STEP',
        payload: { delta: 1 },
      });
    });
  });

  describe('Playback Speed Controls', () => {
    it('renders all speed option buttons [0.5, 1, 2, 5, 10]', () => {
      const { tree } = renderReplayBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      expect(SPEED_OPTIONS).toEqual([0.5, 1, 2, 5, 10]);

      for (const speed of SPEED_OPTIONS) {
        const btn = findElement(tree, (el) => el.props?.['data-testid'] === `speed-btn-${speed}`);
        expect(btn).not.toBeNull();
        const label = Array.isArray(btn?.props?.children)
          ? btn?.props?.children.join('')
          : btn?.props?.children;
        expect(label).toBe(`${speed}x`);
      }
    });

    it('sends SET_SPEED message when speed button is clicked', () => {
      for (const speed of SPEED_OPTIONS) {
        mockWorkerClient.send.mockClear();
        const { tree } = renderReplayBar({
          workerClient: mockWorkerClient as unknown as WorkerClient,
        });

        const speedBtn = findElement(tree, (el) => el.props?.['data-testid'] === `speed-btn-${speed}`);
        expect(speedBtn).not.toBeNull();
        speedBtn?.props?.onClick?.();

        expect(mockWorkerClient.send).toHaveBeenCalledTimes(1);
        expect(mockWorkerClient.send).toHaveBeenCalledWith({
          type: 'SET_SPEED',
          payload: { speed },
        });
      }
    });

    it('applies active styling to the currently selected speed and inactive styling to others', () => {
      useStore.setState({
        replayState: {
          currentIndex: 0,
          isPlaying: false,
          speed: 5,
          currentCandle: null,
          totalCandles: 100,
        },
      });

      const { tree } = renderReplayBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const activeBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'speed-btn-5');
      const inactiveBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'speed-btn-1');

      expect(activeBtn?.props?.className).toContain('bg-tv-border text-tv-text font-bold');
      expect(inactiveBtn?.props?.className).toContain('text-tv-muted hover:text-tv-text');
      expect(inactiveBtn?.props?.className).not.toContain('font-bold');
    });
  });

  describe('Candle Progress Bar Counter', () => {
    it('displays 1 / 100 when at the first candle (currentIndex = 0)', () => {
      useStore.setState({
        replayState: {
          currentIndex: 0,
          isPlaying: false,
          speed: 1,
          currentCandle: null,
          totalCandles: 100,
        },
      });

      const { html, tree } = renderReplayBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const counter = findElement(tree, (el) => el.props?.['data-testid'] === 'bar-counter');
      expect(counter).not.toBeNull();
      expect(html).toContain('1 / 100');
    });

    it('displays 42 / 500 when at currentIndex = 41 with 500 total candles', () => {
      useStore.setState({
        replayState: {
          currentIndex: 41,
          isPlaying: false,
          speed: 1,
          currentCandle: null,
          totalCandles: 500,
        },
      });

      const { html } = renderReplayBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      expect(html).toContain('42 / 500');
    });

    it('displays 100 / 100 at the terminal candle of the dataset', () => {
      useStore.setState({
        replayState: {
          currentIndex: 99,
          isPlaying: false,
          speed: 1,
          currentCandle: null,
          totalCandles: 100,
        },
      });

      const { html } = renderReplayBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      expect(html).toContain('100 / 100');
    });
  });
});
