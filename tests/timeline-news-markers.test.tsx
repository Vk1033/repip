import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TimelineNewsMarkers } from '../src/components/TimelineNewsMarkers';

describe('TimelineNewsMarkers Component', () => {
  it('renders timeline news markers container and flag badges', () => {
    const html = renderToStaticMarkup(
      <TimelineNewsMarkers currentTimestamp={1729180000} />
    );

    expect(html).toContain('data-testid="timeline-news-markers"');
    expect(html).toContain('data-testid="news-marker-');
  });

  it('renders circular US flag badges with release event counts', () => {
    const html = renderToStaticMarkup(
      <TimelineNewsMarkers currentTimestamp={1729180000} />
    );

    // Should include badges with numbers like 10, 12, 15, 16
    expect(html).toMatch(/data-testid="news-marker-[^"]*"/);
    expect(html).toContain('12');
    expect(html).toContain('15');
  });
});
