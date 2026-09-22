export interface DrawingPoint {
  time: number;
  price: number;
  x?: number;
  y?: number;
}

export type DrawingType = 'trendline' | 'horizontal_ray' | 'rectangle' | 'fibonacci' | 'position';

export interface DrawingShape {
  id: string;
  type: DrawingType;
  points: DrawingPoint[];
  color: string;
  params?: Record<string, any>;
}

/**
 * Calculates whether a 2D screen coordinate is within `threshold` pixels of a line segment between p1 and p2.
 */
export function isPointNearLine(
  pt: { x: number; y: number },
  p1: { x?: number; y?: number },
  p2: { x?: number; y?: number },
  threshold: number = 6
): boolean {
  if (p1.x === undefined || p1.y === undefined || p2.x === undefined || p2.y === undefined) {
    return false;
  }
  const lineLenSq = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
  if (lineLenSq === 0) return Math.hypot(pt.x - p1.x, pt.y - p1.y) <= threshold;

  const t = Math.max(0, Math.min(1, ((pt.x - p1.x) * (p2.x - p1.x) + (pt.y - p1.y) * (p2.y - p1.y)) / lineLenSq));
  const projX = p1.x + t * (p2.x - p1.x);
  const projY = p1.y + t * (p2.y - p1.y);

  return Math.hypot(pt.x - projX, pt.y - projY) <= threshold;
}

/**
 * Calculates whether a point is near a horizontal ray extending from p1 rightward to canvasWidth.
 */
export function isPointNearRay(
  pt: { x: number; y: number },
  p1: { x?: number; y?: number },
  canvasWidth: number,
  threshold: number = 6
): boolean {
  if (p1.x === undefined || p1.y === undefined) return false;
  const endX = Math.max(p1.x, canvasWidth);
  return isPointNearLine(pt, p1, { x: endX, y: p1.y }, threshold);
}

/**
 * Calculates whether a point is inside or within `threshold` of the bounding rectangle formed by p1 and p2.
 */
export function isPointInOrNearRect(
  pt: { x: number; y: number },
  p1: { x?: number; y?: number },
  p2: { x?: number; y?: number },
  threshold: number = 6
): boolean {
  if (p1.x === undefined || p1.y === undefined || p2.x === undefined || p2.y === undefined) {
    return false;
  }
  const minX = Math.min(p1.x, p2.x) - threshold;
  const maxX = Math.max(p1.x, p2.x) + threshold;
  const minY = Math.min(p1.y, p2.y) - threshold;
  const maxY = Math.max(p1.y, p2.y) + threshold;

  return pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY;
}

/**
 * Manages drawings, hit-testing against screen coordinates, and serialization.
 */
export class DrawingManager {
  private shapes: DrawingShape[] = [];

  constructor(initialShapes: DrawingShape[] = []) {
    this.shapes = [...initialShapes];
  }

  getShapes(): DrawingShape[] {
    return [...this.shapes];
  }

  getShapeById(id: string): DrawingShape | undefined {
    return this.shapes.find((s) => s.id === id);
  }

  addShape(shape: DrawingShape): void {
    this.shapes.push(shape);
  }

  removeShape(id: string): boolean {
    const index = this.shapes.findIndex((s) => s.id === id);
    if (index !== -1) {
      this.shapes.splice(index, 1);
      return true;
    }
    return false;
  }

  clear(): void {
    this.shapes = [];
  }

  /**
   * Searches top-to-bottom for the highest-layered shape near the given screen coordinate.
   */
  findShapeNearPoint(
    pt: { x: number; y: number },
    canvasWidth: number,
    threshold: number = 6
  ): DrawingShape | null {
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const shape = this.shapes[i];
      const p1 = shape.points[0];
      const p2 = shape.points[1];

      if (!p1 || p1.x === undefined || p1.y === undefined) continue;

      if (shape.type === 'trendline') {
        if (p2 && p2.x !== undefined && p2.y !== undefined) {
          if (isPointNearLine(pt, { x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }, threshold)) {
            return shape;
          }
        }
      } else if (shape.type === 'horizontal_ray') {
        if (isPointNearRay(pt, { x: p1.x, y: p1.y }, canvasWidth, threshold)) {
          return shape;
        }
      } else if (shape.type === 'rectangle' || shape.type === 'position' || shape.type === 'fibonacci') {
        if (p2 && p2.x !== undefined && p2.y !== undefined) {
          if (isPointInOrNearRect(pt, { x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }, threshold)) {
            return shape;
          }
        }
      }
    }

    return null;
  }

  serialize(): string {
    return JSON.stringify(this.shapes);
  }

  deserialize(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        this.shapes = parsed;
      }
    } catch (e) {
      console.error('Failed to deserialize drawing shapes:', e);
    }
  }
}
