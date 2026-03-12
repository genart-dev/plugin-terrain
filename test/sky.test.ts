import { describe, it, expect, vi, beforeEach } from "vitest";
import { skyLayerType } from "../src/layers/sky.js";

function createMockCtx() {
  const fillRect = vi.fn();
  const createLinearGradient = vi.fn(() => ({
    addColorStop: vi.fn(),
  }));

  return {
    fillRect,
    createLinearGradient,
    fillStyle: "",
  } as unknown as CanvasRenderingContext2D;
}

const BOUNDS = { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1 };

describe("terrain:sky", () => {
  it("has correct typeId", () => {
    expect(skyLayerType.typeId).toBe("terrain:sky");
  });

  it("has category draw", () => {
    expect(skyLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = skyLayerType.createDefault();
    expect(defaults.preset).toBe("noon");
    expect(defaults.zenithColor).toBe("#1E3A6E");
    expect(defaults.horizonColor).toBe("#87CEEB");
  });

  it("render creates gradient and fills", () => {
    const ctx = createMockCtx();
    const props = skyLayerType.createDefault();
    skyLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.createLinearGradient).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("render with haze creates two gradients", () => {
    const ctx = createMockCtx();
    const props = { ...skyLayerType.createDefault(), hazeIntensity: 0.5 };
    skyLayerType.render(props, ctx, BOUNDS, {} as any);

    // Main gradient + haze gradient
    expect(ctx.createLinearGradient).toHaveBeenCalledTimes(2);
  });

  it("render with zero haze skips haze band", () => {
    const ctx = createMockCtx();
    const props = { ...skyLayerType.createDefault(), hazeIntensity: 0 };
    skyLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.createLinearGradient).toHaveBeenCalledTimes(1);
  });

  it("validate passes for valid preset", () => {
    expect(skyLayerType.validate({ preset: "dawn" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = skyLayerType.validate({ preset: "unknown-sky" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.property).toBe("preset");
  });

  it("properties include all expected schemas", () => {
    const keys = skyLayerType.properties.map((p) => p.key);
    expect(keys).toContain("preset");
    expect(keys).toContain("zenithColor");
    expect(keys).toContain("horizonColor");
    expect(keys).toContain("hazeIntensity");
    expect(keys).toContain("horizonLine");
  });
});
