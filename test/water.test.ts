import { describe, it, expect, vi } from "vitest";
import { waterLayerType } from "../src/layers/water.js";

function createMockCtx() {
  return {
    fillRect: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

const BOUNDS = { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1 };

describe("terrain:water", () => {
  it("has correct typeId", () => {
    expect(waterLayerType.typeId).toBe("terrain:water");
  });

  it("createDefault returns valid properties", () => {
    const defaults = waterLayerType.createDefault();
    expect(defaults.preset).toBe("still-lake");
    expect(defaults.waterColor).toBe("#2A4A6B");
    expect(defaults.shimmerIntensity).toBe(0.15);
  });

  it("render fills water zone and draws wave lines", () => {
    const ctx = createMockCtx();
    const props = waterLayerType.createDefault();
    waterLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.createLinearGradient).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled(); // wave lines
  });

  it("render with zero shimmer skips shimmer spots", () => {
    const ctx = createMockCtx();
    const props = { ...waterLayerType.createDefault(), shimmerIntensity: 0 };
    waterLayerType.render(props, ctx, BOUNDS, {} as any);

    // fillRect called only once for water fill (no shimmer rects)
    expect(ctx.fillRect).toHaveBeenCalledTimes(1);
  });

  it("validate passes for valid preset", () => {
    expect(waterLayerType.validate({ preset: "choppy-sea" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = waterLayerType.validate({ preset: "lava-flow" });
    expect(errors).toHaveLength(1);
  });

  it("renders with noise ripple mode", () => {
    const ctx = createMockCtx();
    const props = { ...waterLayerType.createDefault(), rippleMode: "noise" };
    waterLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.stroke).toHaveBeenCalled();
  });
});
