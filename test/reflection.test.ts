import { describe, it, expect, vi } from "vitest";
import { reflectionLayerType } from "../src/layers/reflection.js";
import { REFLECTION_PRESETS } from "../src/presets/reflection.js";

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
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

const BOUNDS = { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1 };

describe("terrain:reflection", () => {
  it("has correct typeId", () => {
    expect(reflectionLayerType.typeId).toBe("terrain:reflection");
  });

  it("has correct displayName", () => {
    expect(reflectionLayerType.displayName).toBe("Reflection");
  });

  it("has correct category", () => {
    expect(reflectionLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = reflectionLayerType.createDefault();
    expect(defaults.preset).toBe("calm-lake");
    expect(defaults.skyColor).toBe("#87CEEB");
    expect(defaults.terrainColor).toBe("#3A5A30");
    expect(defaults.darkening).toBe(0.3);
    expect(defaults.rippleFrequency).toBe(0.5);
    expect(defaults.rippleAmplitude).toBe(0.3);
    expect(defaults.waterlinePosition).toBe(0.5);
    expect(defaults.blurAmount).toBe(0.4);
  });

  it("createDefault includes depthLane property", () => {
    const defaults = reflectionLayerType.createDefault();
    expect(defaults.depthLane).toBe("ground-plane");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = reflectionLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes darkening number", () => {
    const prop = reflectionLayerType.properties.find((p) => p.key === "darkening");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("number");
  });

  it("properties schema includes rippleFrequency number", () => {
    const prop = reflectionLayerType.properties.find((p) => p.key === "rippleFrequency");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("number");
  });

  it("properties schema includes depthLane select", () => {
    const depthProp = reflectionLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthProp).toBeTruthy();
    expect(depthProp!.type).toBe("select");
    expect(depthProp!.default).toBe("ground-plane");
  });

  it("render draws reflection", () => {
    const ctx = createMockCtx();
    const props = reflectionLayerType.createDefault();
    reflectionLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("render works with zero ripple", () => {
    const ctx = createMockCtx();
    const props = { ...reflectionLayerType.createDefault(), rippleFrequency: 0, rippleAmplitude: 0 };
    expect(() => reflectionLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with high ripple", () => {
    const ctx = createMockCtx();
    const props = { ...reflectionLayerType.createDefault(), rippleFrequency: 1.0, rippleAmplitude: 1.0 };
    expect(() => reflectionLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render draws ripple lines when frequency > 0", () => {
    const ctx = createMockCtx();
    const props = { ...reflectionLayerType.createDefault(), rippleFrequency: 0.5 };
    reflectionLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("render works with zero darkening", () => {
    const ctx = createMockCtx();
    const props = { ...reflectionLayerType.createDefault(), darkening: 0 };
    expect(() => reflectionLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with strong darkening", () => {
    const ctx = createMockCtx();
    const props = { ...reflectionLayerType.createDefault(), darkening: 0.7 };
    expect(() => reflectionLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with zero blur", () => {
    const ctx = createMockCtx();
    const props = { ...reflectionLayerType.createDefault(), blurAmount: 0 };
    expect(() => reflectionLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with full blur", () => {
    const ctx = createMockCtx();
    const props = { ...reflectionLayerType.createDefault(), blurAmount: 1.0 };
    expect(() => reflectionLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with waterline near top", () => {
    const ctx = createMockCtx();
    const props = { ...reflectionLayerType.createDefault(), waterlinePosition: 0.2 };
    expect(() => reflectionLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with waterline near bottom", () => {
    const ctx = createMockCtx();
    const props = { ...reflectionLayerType.createDefault(), waterlinePosition: 0.9 };
    expect(() => reflectionLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...reflectionLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => reflectionLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...reflectionLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => reflectionLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with all reflection presets", () => {
    for (const preset of REFLECTION_PRESETS) {
      const ctx = createMockCtx();
      const props = { ...reflectionLayerType.createDefault(), preset: preset.id };
      expect(() => reflectionLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("validate passes for valid preset", () => {
    expect(reflectionLayerType.validate({ preset: "dark-water" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = reflectionLayerType.validate({ preset: "mercury-pool" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("mercury-pool");
  });

  it("validate passes with no preset", () => {
    expect(reflectionLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 4 reflection presets", () => {
      expect(REFLECTION_PRESETS).toHaveLength(4);
    });

    it("all presets have category 'reflection'", () => {
      for (const p of REFLECTION_PRESETS) {
        expect(p.category).toBe("reflection");
      }
    });

    it("all presets have required fields", () => {
      for (const p of REFLECTION_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(p.skyColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.terrainColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.darkening).toBeGreaterThanOrEqual(0);
        expect(p.darkening).toBeLessThanOrEqual(1);
        expect(p.rippleFrequency).toBeGreaterThanOrEqual(0);
        expect(p.rippleAmplitude).toBeGreaterThanOrEqual(0);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = REFLECTION_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
