import { describe, it, expect, vi } from "vitest";
import { profileLayerType } from "../src/layers/profile.js";

function createMockCtx() {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillStyle: "",
  } as unknown as CanvasRenderingContext2D;
}

const BOUNDS = { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1 };

describe("terrain:profile", () => {
  it("has correct typeId", () => {
    expect(profileLayerType.typeId).toBe("terrain:profile");
  });

  it("has category draw", () => {
    expect(profileLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = profileLayerType.createDefault();
    expect(defaults.preset).toBe("rolling-hills");
    expect(defaults.seed).toBe(42);
    expect(defaults.ridgeCount).toBe(3);
  });

  it("render draws filled paths for each ridge", () => {
    const ctx = createMockCtx();
    const props = { ...profileLayerType.createDefault(), ridgeCount: 3 };
    profileLayerType.render(props, ctx, BOUNDS, {} as any);

    // 3 ridges = 3 beginPath + 3 closePath + 3 fill calls
    expect(ctx.beginPath).toHaveBeenCalledTimes(3);
    expect(ctx.fill).toHaveBeenCalledTimes(3);
    expect(ctx.closePath).toHaveBeenCalledTimes(3);
  });

  it("render with 1 ridge draws single path", () => {
    const ctx = createMockCtx();
    const props = { ...profileLayerType.createDefault(), ridgeCount: 1 };
    profileLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.fill).toHaveBeenCalledTimes(1);
  });

  it("render clamps ridge count to 1-8", () => {
    const ctx = createMockCtx();
    const props = { ...profileLayerType.createDefault(), ridgeCount: 0 };
    profileLayerType.render(props, ctx, BOUNDS, {} as any);
    // Clamped to 1
    expect(ctx.fill).toHaveBeenCalledTimes(1);
  });

  it("different seeds produce different noise profiles", () => {
    const ctx1 = createMockCtx();
    const ctx2 = createMockCtx();
    const props1 = { ...profileLayerType.createDefault(), ridgeCount: 1, seed: 1 };
    const props2 = { ...profileLayerType.createDefault(), ridgeCount: 1, seed: 9999 };

    profileLayerType.render(props1, ctx1, BOUNDS, {} as any);
    profileLayerType.render(props2, ctx2, BOUNDS, {} as any);

    // Different seeds should produce different lineTo Y values
    const calls1 = ctx1.lineTo.mock.calls;
    const calls2 = ctx2.lineTo.mock.calls;
    // Compare a mid-point lineTo call (not the closing path lines)
    const mid = Math.floor(calls1.length / 3);
    expect(calls1[mid]![1]).not.toEqual(calls2[mid]![1]);
  });

  it("validate passes for valid preset", () => {
    expect(profileLayerType.validate({ preset: "alpine-range" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = profileLayerType.validate({ preset: "martian-craters" });
    expect(errors).toHaveLength(1);
  });
});
