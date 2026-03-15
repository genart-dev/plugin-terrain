/**
 * Shared perspective curve renderer for river, path, and shore layers.
 *
 * A perspective curve is defined by a cubic bezier centerline that flows
 * from a far point (background) toward a near point (foreground). Width
 * narrows toward the horizon using perspective foreshortening.
 */

import { mulberry32 } from "./prng.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A 2D point (0..1 normalized). */
export interface Point2 {
  x: number;
  y: number;
}

/** Cubic bezier definition — 4 control points in normalized [0,1] space. */
export interface BezierCurve {
  p0: Point2; // start (near / foreground)
  p1: Point2; // control 1
  p2: Point2; // control 2
  p3: Point2; // end (far / background)
}

/** Path preset identifier. */
export type PathPresetType =
  | "straight"
  | "meandering"
  | "s-curve"
  | "winding"
  | "switchback"
  | "fork";

/** A sampled point along the perspective curve. */
export interface CurveSample {
  /** Position in pixel space. */
  x: number;
  y: number;
  /** t along the curve (0=near, 1=far). */
  t: number;
  /** Width at this point (pixels). */
  width: number;
  /** Depth value (0=far, 1=near). */
  depth: number;
}

// ---------------------------------------------------------------------------
// Bezier evaluation
// ---------------------------------------------------------------------------

/** Evaluate cubic bezier at parameter t. */
export function evalBezier(curve: BezierCurve, t: number): Point2 {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;

  return {
    x: mt3 * curve.p0.x + 3 * mt2 * t * curve.p1.x + 3 * mt * t2 * curve.p2.x + t3 * curve.p3.x,
    y: mt3 * curve.p0.y + 3 * mt2 * t * curve.p1.y + 3 * mt * t2 * curve.p2.y + t3 * curve.p3.y,
  };
}

/** Get the tangent direction (unnormalized) at parameter t. */
export function evalBezierTangent(curve: BezierCurve, t: number): Point2 {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x: 3 * mt2 * (curve.p1.x - curve.p0.x) + 6 * mt * t * (curve.p2.x - curve.p1.x) + 3 * t2 * (curve.p3.x - curve.p2.x),
    y: 3 * mt2 * (curve.p1.y - curve.p0.y) + 6 * mt * t * (curve.p2.y - curve.p1.y) + 3 * t2 * (curve.p3.y - curve.p2.y),
  };
}

/** Get the perpendicular (normal) direction at parameter t. Returns unit-length. */
export function evalBezierNormal(curve: BezierCurve, t: number): Point2 {
  const tan = evalBezierTangent(curve, t);
  const len = Math.sqrt(tan.x * tan.x + tan.y * tan.y);
  if (len === 0) return { x: 0, y: -1 };
  return { x: -tan.y / len, y: tan.x / len };
}

// ---------------------------------------------------------------------------
// Path presets
// ---------------------------------------------------------------------------

/**
 * Generate a bezier curve for a named path preset.
 * Curves go from near (bottom) to far (top) in normalized [0,1] space.
 * The seed adds deterministic variation.
 */
export function getPathPresetCurve(preset: PathPresetType, seed: number): BezierCurve {
  const rng = mulberry32(seed);
  const jitter = () => (rng() - 0.5) * 0.08;

  // p0.y = 1.0: rivers/paths start at the bottom canvas edge (wide, close).
  // p3.y ~ 0.25: far endpoints reach toward the horizon so the path
  // spans the full canvas depth, not just a short stub mid-field.
  switch (preset) {
    case "straight":
      return {
        p0: { x: 0.5 + jitter(), y: 1.0 },
        p1: { x: 0.5 + jitter(), y: 0.70 },
        p2: { x: 0.5 + jitter(), y: 0.45 },
        p3: { x: 0.5 + jitter(), y: 0.25 },
      };
    case "meandering":
      return {
        p0: { x: 0.45 + jitter(), y: 1.0 },
        p1: { x: 0.7 + jitter(), y: 0.70 },
        p2: { x: 0.3 + jitter(), y: 0.45 },
        p3: { x: 0.5 + jitter(), y: 0.25 },
      };
    case "s-curve":
      return {
        p0: { x: 0.35 + jitter(), y: 1.0 },
        p1: { x: 0.75 + jitter(), y: 0.72 },
        p2: { x: 0.25 + jitter(), y: 0.45 },
        p3: { x: 0.55 + jitter(), y: 0.25 },
      };
    case "winding":
      return {
        p0: { x: 0.5 + jitter(), y: 1.0 },
        p1: { x: 0.8 + jitter(), y: 0.70 },
        p2: { x: 0.2 + jitter(), y: 0.45 },
        p3: { x: 0.6 + jitter(), y: 0.25 },
      };
    case "switchback":
      return {
        p0: { x: 0.3 + jitter(), y: 1.0 },
        p1: { x: 0.85 + jitter(), y: 0.75 },
        p2: { x: 0.15 + jitter(), y: 0.45 },
        p3: { x: 0.5 + jitter(), y: 0.25 },
      };
    case "fork":
      // Fork uses a single main branch — fork rendering handled by layer
      return {
        p0: { x: 0.5 + jitter(), y: 1.0 },
        p1: { x: 0.55 + jitter(), y: 0.70 },
        p2: { x: 0.45 + jitter(), y: 0.45 },
        p3: { x: 0.5 + jitter(), y: 0.25 },
      };
  }
}

// ---------------------------------------------------------------------------
// Perspective curve sampling
// ---------------------------------------------------------------------------

/**
 * Sample a perspective curve at evenly-spaced t values.
 *
 * @param curve   - Bezier centerline in normalized [0,1] space
 * @param bounds  - Canvas bounds { x, y, width, height }
 * @param widthNear  - Width in pixels at the near end (t=0, bottom)
 * @param widthFar   - Width in pixels at the far end (t=1, top)
 * @param samples    - Number of samples (higher = smoother)
 */
export function samplePerspectiveCurve(
  curve: BezierCurve,
  bounds: { x: number; y: number; width: number; height: number },
  widthNear: number,
  widthFar: number,
  samples: number = 80,
): CurveSample[] {
  const result: CurveSample[] = [];

  for (let i = 0; i <= samples; i++) {
    const t = i / samples; // 0 = near end (p0), 1 = far end (p3)
    const pt = evalBezier(curve, t);

    // Map normalized to pixel space
    const x = bounds.x + pt.x * bounds.width;
    const y = bounds.y + pt.y * bounds.height;

    // Width narrows linearly from near to far
    const width = widthNear + (widthFar - widthNear) * t;

    // Depth: 1 at near (t=0), 0 at far (t=1)
    const depth = 1 - t;

    result.push({ x, y, t, width, depth });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

/**
 * Draw a filled ribbon along perspective curve samples.
 * For each consecutive pair of samples, draws a quadrilateral
 * using the width and normal direction.
 */
export function drawPerspectiveRibbon(
  ctx: CanvasRenderingContext2D,
  curve: BezierCurve,
  samples: CurveSample[],
  fillStyle: string | CanvasGradient,
): void {
  if (samples.length < 2) return;

  ctx.fillStyle = fillStyle;
  ctx.beginPath();

  // Left edge (near → far)
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    const normal = evalBezierNormal(curve, s.t);
    const lx = s.x + normal.x * s.width * 0.5;
    const ly = s.y + normal.y * s.width * 0.5;
    if (i === 0) ctx.moveTo(lx, ly);
    else ctx.lineTo(lx, ly);
  }

  // Right edge (far → near)
  for (let i = samples.length - 1; i >= 0; i--) {
    const s = samples[i]!;
    const normal = evalBezierNormal(curve, s.t);
    const rx = s.x - normal.x * s.width * 0.5;
    const ry = s.y - normal.y * s.width * 0.5;
    ctx.lineTo(rx, ry);
  }

  ctx.closePath();
  ctx.fill();
}

/**
 * Draw lines along the perspective curve (e.g. ripples, surface texture).
 * Draws across the width at each sample position.
 */
export function drawCrossLines(
  ctx: CanvasRenderingContext2D,
  curve: BezierCurve,
  samples: CurveSample[],
  options: {
    lineCount: number;
    color: string;
    alphaFar: number;
    alphaNear: number;
    widthScale?: number;
  },
): void {
  const { lineCount, color, alphaFar, alphaNear, widthScale = 1 } = options;
  const step = Math.max(1, Math.floor(samples.length / lineCount));

  for (let i = step; i < samples.length - 1; i += step) {
    const s = samples[i]!;
    const normal = evalBezierNormal(curve, s.t);
    const halfW = s.width * 0.5 * widthScale;

    const alpha = alphaNear + (alphaFar - alphaNear) * s.t;
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(0.3, (1 - s.t) * 1.2);

    ctx.beginPath();
    ctx.moveTo(s.x + normal.x * halfW, s.y + normal.y * halfW);
    ctx.lineTo(s.x - normal.x * halfW, s.y - normal.y * halfW);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}
