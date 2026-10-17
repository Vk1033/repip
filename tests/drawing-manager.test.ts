import { describe, it, expect } from 'vitest';
import {
  DrawingPoint,
  DrawingShape,
  isPointNearLine,
  isPointNearRay,
  isPointInOrNearRect,
  DrawingManager,
} from '../src/core/drawing-manager';

describe('DrawingManager & Geometry Functions', () => {
  describe('isPointNearLine', () => {
    it('detects click proximity to trendline correctly', () => {
      const p1: DrawingPoint = { x: 0, y: 0, time: 100, price: 10 };
      const p2: DrawingPoint = { x: 100, y: 100, time: 200, price: 20 };
      const clickNear = { x: 50, y: 52 };
      const clickFar = { x: 50, y: 80 };

      expect(isPointNearLine(clickNear, p1, p2, 5)).toBe(true);
      expect(isPointNearLine(clickFar, p1, p2, 5)).toBe(false);
    });

    it('identifies points directly on line segment and at endpoints', () => {
      const p1 = { x: 10, y: 20 };
      const p2 = { x: 90, y: 80 };

      // Endpoints
      expect(isPointNearLine(p1, p1, p2, 1)).toBe(true);
      expect(isPointNearLine(p2, p1, p2, 1)).toBe(true);

      // Midpoint
      const mid = { x: 50, y: 50 };
      expect(isPointNearLine(mid, p1, p2, 1)).toBe(true);
    });

    it('handles points beyond line segment ends with projection clamping', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 100, y: 0 };

      // Point before p1 along the line extension
      expect(isPointNearLine({ x: -3, y: 0 }, p1, p2, 5)).toBe(true); // distance 3 <= 5
      expect(isPointNearLine({ x: -10, y: 0 }, p1, p2, 5)).toBe(false); // distance 10 > 5

      // Point after p2 along the line extension
      expect(isPointNearLine({ x: 103, y: 0 }, p1, p2, 5)).toBe(true); // distance 3 <= 5
      expect(isPointNearLine({ x: 115, y: 0 }, p1, p2, 5)).toBe(false); // distance 15 > 5
    });

    it('handles degenerate lines where p1 and p2 are identical', () => {
      const p1 = { x: 50, y: 50 };
      const p2 = { x: 50, y: 50 };

      expect(isPointNearLine({ x: 52, y: 52 }, p1, p2, 5)).toBe(true); // distance ~2.83 <= 5
      expect(isPointNearLine({ x: 60, y: 60 }, p1, p2, 5)).toBe(false); // distance ~14.14 > 5
    });

    it('handles perfectly vertical and horizontal lines', () => {
      // Vertical line
      const vertP1 = { x: 100, y: 0 };
      const vertP2 = { x: 100, y: 200 };
      expect(isPointNearLine({ x: 102, y: 100 }, vertP1, vertP2, 5)).toBe(true);
      expect(isPointNearLine({ x: 110, y: 100 }, vertP1, vertP2, 5)).toBe(false);

      // Horizontal line
      const horzP1 = { x: 0, y: 50 };
      const horzP2 = { x: 200, y: 50 };
      expect(isPointNearLine({ x: 100, y: 53 }, horzP1, horzP2, 5)).toBe(true);
      expect(isPointNearLine({ x: 100, y: 60 }, horzP1, horzP2, 5)).toBe(false);
    });

    it('uses default threshold of 6 when not explicitly provided', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 100, y: 0 };

      expect(isPointNearLine({ x: 50, y: 5 }, p1, p2)).toBe(true); // dist 5 <= 6
      expect(isPointNearLine({ x: 50, y: 7 }, p1, p2)).toBe(false); // dist 7 > 6
    });
  });

  describe('isPointNearRay', () => {
    it('detects proximity to a horizontal ray extending to canvas width', () => {
      const origin = { x: 100, y: 150 };
      const canvasWidth = 1000;

      // Along the ray to the right
      expect(isPointNearRay({ x: 300, y: 152 }, origin, canvasWidth, 5)).toBe(true);
      expect(isPointNearRay({ x: 950, y: 149 }, origin, canvasWidth, 5)).toBe(true);
      expect(isPointNearRay({ x: 500, y: 170 }, origin, canvasWidth, 5)).toBe(false);

      // Behind the origin to the left
      expect(isPointNearRay({ x: 98, y: 150 }, origin, canvasWidth, 5)).toBe(true); // within threshold 5
      expect(isPointNearRay({ x: 50, y: 150 }, origin, canvasWidth, 5)).toBe(false); // 50px behind origin
    });
  });

  describe('isPointInOrNearRect', () => {
    it('detects points inside or near the bounding box of a rectangle', () => {
      const p1 = { x: 100, y: 100 };
      const p2 = { x: 300, y: 200 };

      // Inside
      expect(isPointInOrNearRect({ x: 200, y: 150 }, p1, p2, 5)).toBe(true);
      // On boundary
      expect(isPointInOrNearRect({ x: 100, y: 150 }, p1, p2, 5)).toBe(true);
      // Just outside within threshold
      expect(isPointInOrNearRect({ x: 97, y: 150 }, p1, p2, 5)).toBe(true);
      // Far outside
      expect(isPointInOrNearRect({ x: 50, y: 150 }, p1, p2, 5)).toBe(false);
      expect(isPointInOrNearRect({ x: 200, y: 300 }, p1, p2, 5)).toBe(false);
    });

    it('works correctly when p1 and p2 coordinates are inverted', () => {
      const p1 = { x: 300, y: 200 };
      const p2 = { x: 100, y: 100 };

      expect(isPointInOrNearRect({ x: 150, y: 150 }, p1, p2, 5)).toBe(true);
      expect(isPointInOrNearRect({ x: 50, y: 50 }, p1, p2, 5)).toBe(false);
    });
  });

  describe('DrawingManager class', () => {
    it('manages shape collection lifecycle (add, remove, get, clear)', () => {
      const manager = new DrawingManager();
      expect(manager.getShapes()).toEqual([]);

      const shape1: DrawingShape = {
        id: 's1',
        type: 'trendline',
        points: [
          { time: 100, price: 10, x: 0, y: 0 },
          { time: 200, price: 20, x: 100, y: 100 },
        ],
        color: '#2962ff',
      };

      const shape2: DrawingShape = {
        id: 's2',
        type: 'horizontal_ray',
        points: [{ time: 150, price: 15, x: 50, y: 50 }],
        color: '#f59e0b',
      };

      manager.addShape(shape1);
      manager.addShape(shape2);

      expect(manager.getShapes()).toHaveLength(2);
      expect(manager.getShapeById('s1')).toEqual(shape1);
      expect(manager.getShapeById('s2')).toEqual(shape2);
      expect(manager.getShapeById('unknown')).toBeUndefined();

      const removed = manager.removeShape('s1');
      expect(removed).toBe(true);
      expect(manager.getShapes()).toHaveLength(1);
      expect(manager.getShapeById('s1')).toBeUndefined();

      const removedAgain = manager.removeShape('s1');
      expect(removedAgain).toBe(false);

      manager.clear();
      expect(manager.getShapes()).toEqual([]);
    });

    it('initializes with provided shapes', () => {
      const initial: DrawingShape[] = [
        {
          id: 'ray-1',
          type: 'horizontal_ray',
          points: [{ time: 100, price: 50, x: 20, y: 80 }],
          color: '#f59e0b',
        },
      ];
      const manager = new DrawingManager(initial);
      expect(manager.getShapes()).toHaveLength(1);
      expect(manager.getShapeById('ray-1')).toBeDefined();
    });

    it('performs hit testing to find shapes near a screen coordinate', () => {
      const manager = new DrawingManager();

      const trendline: DrawingShape = {
        id: 'trend-1',
        type: 'trendline',
        points: [
          { time: 100, price: 10, x: 10, y: 10 },
          { time: 200, price: 20, x: 100, y: 100 },
        ],
        color: '#2962ff',
      };

      const ray: DrawingShape = {
        id: 'ray-1',
        type: 'horizontal_ray',
        points: [{ time: 150, price: 50, x: 200, y: 300 }],
        color: '#f59e0b',
      };

      const rect: DrawingShape = {
        id: 'rect-1',
        type: 'rectangle',
        points: [
          { time: 120, price: 30, x: 400, y: 100 },
          { time: 180, price: 40, x: 500, y: 200 },
        ],
        color: '#2962ff',
      };

      manager.addShape(trendline);
      manager.addShape(ray);
      manager.addShape(rect);

      const canvasWidth = 1000;

      // Hit near trendline
      expect(manager.findShapeNearPoint({ x: 55, y: 55 }, canvasWidth, 5)?.id).toBe('trend-1');

      // Hit near ray
      expect(manager.findShapeNearPoint({ x: 350, y: 301 }, canvasWidth, 5)?.id).toBe('ray-1');

      // Hit inside rectangle
      expect(manager.findShapeNearPoint({ x: 450, y: 150 }, canvasWidth, 5)?.id).toBe('rect-1');

      // Miss all shapes
      expect(manager.findShapeNearPoint({ x: 800, y: 800 }, canvasWidth, 5)).toBeNull();
    });

    it('returns top-most shape (latest added) on overlapping hit test', () => {
      const manager = new DrawingManager();

      const shape1: DrawingShape = {
        id: 'first',
        type: 'trendline',
        points: [
          { time: 100, price: 10, x: 0, y: 50 },
          { time: 200, price: 20, x: 100, y: 50 },
        ],
        color: '#2962ff',
      };

      const shape2: DrawingShape = {
        id: 'second',
        type: 'trendline',
        points: [
          { time: 100, price: 10, x: 0, y: 50 },
          { time: 200, price: 20, x: 100, y: 50 },
        ],
        color: '#ef5350',
      };

      manager.addShape(shape1);
      manager.addShape(shape2);

      const hit = manager.findShapeNearPoint({ x: 50, y: 50 }, 500, 5);
      expect(hit?.id).toBe('second');
    });

    it('serializes to JSON and deserializes back faithfully', () => {
      const manager = new DrawingManager();
      const shapes: DrawingShape[] = [
        {
          id: 's1',
          type: 'trendline',
          points: [
            { time: 1000, price: 100, x: 10, y: 20 },
            { time: 2000, price: 200, x: 110, y: 120 },
          ],
          color: '#2962ff',
        },
        {
          id: 's2',
          type: 'rectangle',
          points: [
            { time: 1500, price: 150 },
            { time: 2500, price: 250 },
          ],
          color: '#f59e0b',
          params: { opacity: 0.2 },
        },
      ];

      shapes.forEach((s) => manager.addShape(s));

      const json = manager.serialize();
      expect(typeof json).toBe('string');

      const newManager = new DrawingManager();
      newManager.deserialize(json);

      expect(newManager.getShapes()).toEqual(shapes);
    });
  });
});
