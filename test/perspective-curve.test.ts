import { describe, it, expect, vi } from "vitest";
import {
  evalBezier,
  evalBezierTangent,
  evalBezierNormal,
  getPathPresetCurve,
  samplePerspectiveCurve,
  drawPerspectiveRibbon,
  drawCrossLines,
} from "../src/shared/perspective-curve.js";
import type { BezierCurve, PathPresetType } from "../src/shared/perspective-curve.js";

const SIMPLE_CURVE: BezierCurve = {
  p0: { x: 0.5, y: 0.9 },
  p1: { x: 0.5, y: 0.7 },
  p2: { x: 0.5, y: 0.4 },
  p3: { x: 0.5, y: 0.1 },
};

const BOUNDS = { x: 0, y: 0, width: 800, height: 600 };

describe("perspective-curve", () => {
  describe("evalBezier", () => {
    it("returns start point at t=0", () => {
      const pt = evalBezier(SIMPLE_CURVE, 0);
      expect(pt.x).toBeCloseTo(0.5);
      expect(pt.y).toBeCloseTo(0.9);
    });

    it("returns end point at t=1", () => {
      const pt = evalBezier(SIMPLE_CURVE, 1);
      expect(pt.x).toBeCloseTo(0.5);
      expect(pt.y).toBeCloseTo(0.1);
    });

    it("returns midpoint at t=0.5", () => {
      const pt = evalBezier(SIMPLE_CURVE, 0.5);
      expect(pt.x).toBeCloseTo(0.5);
      expect(pt.y).toBeGreaterThan(0.1);
      expect(pt.y).toBeLessThan(0.9);
    });

    it("interpolates non-straight curves", () => {
      const curve: BezierCurve = {
        p0: { x: 0, y: 1 },
        p1: { x: 1, y: 1 },
        p2: { x: 0, y: 0 },
        p3: { x: 1, y: 0 },
      };
      const mid = evalBezier(curve, 0.5);
      expect(mid.x).toBeCloseTo(0.5);
    });
  });

  describe("evalBezierTangent", () => {
    it("returns non-zero tangent at midpoint", () => {
      const tan = evalBezierTangent(SIMPLE_CURVE, 0.5);
      expect(Math.abs(tan.x) + Math.abs(tan.y)).toBeGreaterThan(0);
    });

    it("tangent for vertical curve is mostly in y direction", () => {
      const tan = evalBezierTangent(SIMPLE_CURVE, 0.5);
      expect(Math.abs(tan.y)).toBeGreaterThan(Math.abs(tan.x));
    });
  });

  describe("evalBezierNormal", () => {
    it("returns unit-length normal", () => {
      const normal = evalBezierNormal(SIMPLE_CURVE, 0.5);
      const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
      expect(len).toBeCloseTo(1);
    });

    it("normal is perpendicular to tangent", () => {
      const tan = evalBezierTangent(SIMPLE_CURVE, 0.5);
      const normal = evalBezierNormal(SIMPLE_CURVE, 0.5);
      const dot = tan.x * normal.x + tan.y * normal.y;
      expect(dot).toBeCloseTo(0, 5);
    });
  });

  describe("getPathPresetCurve", () => {
    const presets: PathPresetType[] = ["straight", "meandering", "s-curve", "winding", "switchback", "fork"];

    for (const preset of presets) {
      it(`returns valid curve for "${preset}" preset`, () => {
        const curve = getPathPresetCurve(preset, 42);
        expect(curve.p0.x).toBeGreaterThanOrEqual(0);
        expect(curve.p0.x).toBeLessThanOrEqual(1);
        expect(curve.p0.y).toBeGreaterThanOrEqual(0);
        expect(curve.p0.y).toBeLessThanOrEqual(1);
        expect(curve.p3.y).toBeLessThan(curve.p0.y); // far end above near end
      });
    }

    it("same seed produces same curve", () => {
      const a = getPathPresetCurve("meandering", 123);
      const b = getPathPresetCurve("meandering", 123);
      expect(a.p0.x).toBe(b.p0.x);
      expect(a.p1.y).toBe(b.p1.y);
    });

    it("different seeds produce different curves", () => {
      const a = getPathPresetCurve("meandering", 123);
      const b = getPathPresetCurve("meandering", 456);
      // At least one control point should differ
      const diff = Math.abs(a.p1.x - b.p1.x) + Math.abs(a.p2.x - b.p2.x);
      expect(diff).toBeGreaterThan(0);
    });
  });

  describe("samplePerspectiveCurve", () => {
    it("returns correct number of samples", () => {
      const samples = samplePerspectiveCurve(SIMPLE_CURVE, BOUNDS, 100, 20, 50);
      expect(samples).toHaveLength(51); // 0..50 inclusive
    });

    it("first sample is near end (depth=1)", () => {
      const samples = samplePerspectiveCurve(SIMPLE_CURVE, BOUNDS, 100, 20, 50);
      expect(samples[0]!.depth).toBe(1);
      expect(samples[0]!.t).toBe(0);
    });

    it("last sample is far end (depth=0)", () => {
      const samples = samplePerspectiveCurve(SIMPLE_CURVE, BOUNDS, 100, 20, 50);
      const last = samples[samples.length - 1]!;
      expect(last.depth).toBe(0);
      expect(last.t).toBe(1);
    });

    it("width narrows from near to far", () => {
      const samples = samplePerspectiveCurve(SIMPLE_CURVE, BOUNDS, 100, 20, 50);
      expect(samples[0]!.width).toBe(100);
      expect(samples[samples.length - 1]!.width).toBe(20);
    });

    it("maps normalized coords to pixel space", () => {
      const samples = samplePerspectiveCurve(SIMPLE_CURVE, BOUNDS, 100, 20, 10);
      expect(samples[0]!.x).toBeCloseTo(400); // 0.5 * 800
      expect(samples[0]!.y).toBeCloseTo(540); // 0.9 * 600
    });

    it("respects bounds offset", () => {
      const offsetBounds = { x: 100, y: 50, width: 800, height: 600 };
      const samples = samplePerspectiveCurve(SIMPLE_CURVE, offsetBounds, 100, 20, 10);
      expect(samples[0]!.x).toBeCloseTo(500); // 100 + 0.5 * 800
      expect(samples[0]!.y).toBeCloseTo(590); // 50 + 0.9 * 600
    });
  });

  describe("drawPerspectiveRibbon", () => {
    it("draws filled path for valid samples", () => {
      const ctx = {
        fillStyle: "",
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      const samples = samplePerspectiveCurve(SIMPLE_CURVE, BOUNDS, 100, 20, 10);
      drawPerspectiveRibbon(ctx, SIMPLE_CURVE, samples, "#336699");

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.closePath).toHaveBeenCalled();
    });

    it("does nothing with fewer than 2 samples", () => {
      const ctx = {
        fill: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      drawPerspectiveRibbon(ctx, SIMPLE_CURVE, [], "#336699");
      expect(ctx.fill).not.toHaveBeenCalled();
    });
  });

  describe("drawCrossLines", () => {
    it("draws ripple/texture lines across curve width", () => {
      const ctx = {
        strokeStyle: "",
        globalAlpha: 1,
        lineWidth: 0,
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      const samples = samplePerspectiveCurve(SIMPLE_CURVE, BOUNDS, 100, 20, 40);
      drawCrossLines(ctx, SIMPLE_CURVE, samples, {
        lineCount: 10,
        color: "#fff",
        alphaFar: 0.05,
        alphaNear: 0.3,
      });

      expect(ctx.stroke).toHaveBeenCalled();
    });
  });
});
