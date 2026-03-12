import { describe, it, expect, vi } from "vitest";
import { hazeLayerType } from "../src/layers/haze.js";
import { HAZE_PRESETS } from "../src/presets/haze.js";

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

describe("terrain:haze", () => {
  it("has correct typeId", () => {
    expect(hazeLayerType.typeId).toBe("terrain:haze");
  });

  it("has correct displayName", () => {
    expect(hazeLayerType.displayName).toBe("Haze");
  });

  it("has correct category", () => {
    expect(hazeLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = hazeLayerType.createDefault();
    expect(defaults.preset).toBe("light-haze");
    expect(defaults.color).toBe("#E0E8F0");
    expect(defaults.opacity).toBe(0.2);
    expect(defaults.yPosition).toBe(0.5);
    expect(defaults.height).toBe(0.4);
    expect(defaults.gradientDirection).toBe("bottom-up");
    expect(defaults.noiseAmount).toBe(0.3);
  });

  it("createDefault includes depthLane property", () => {
    const defaults = hazeLayerType.createDefault();
    expect(defaults.depthLane).toBe("midground");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = hazeLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes gradientDirection select", () => {
    const prop = hazeLayerType.properties.find((p) => p.key === "gradientDirection");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("select");
  });

  it("properties schema includes noiseAmount number", () => {
    const prop = hazeLayerType.properties.find((p) => p.key === "noiseAmount");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("number");
  });

  it("properties schema includes depthLane select", () => {
    const depthProp = hazeLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthProp).toBeTruthy();
    expect(depthProp!.type).toBe("select");
    expect(depthProp!.default).toBe("midground");
  });

  it("render draws haze", () => {
    const ctx = createMockCtx();
    const props = hazeLayerType.createDefault();
    hazeLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.createLinearGradient).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("render works with all gradient directions", () => {
    const directions = ["bottom-up", "top-down", "center-out", "uniform"];
    for (const dir of directions) {
      const ctx = createMockCtx();
      const props = { ...hazeLayerType.createDefault(), gradientDirection: dir };
      expect(() => hazeLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render works with zero noise", () => {
    const ctx = createMockCtx();
    const props = { ...hazeLayerType.createDefault(), noiseAmount: 0 };
    expect(() => hazeLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with high noise", () => {
    const ctx = createMockCtx();
    const props = { ...hazeLayerType.createDefault(), noiseAmount: 1.0 };
    expect(() => hazeLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with low opacity", () => {
    const ctx = createMockCtx();
    const props = { ...hazeLayerType.createDefault(), opacity: 0.02 };
    expect(() => hazeLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with high opacity", () => {
    const ctx = createMockCtx();
    const props = { ...hazeLayerType.createDefault(), opacity: 0.6 };
    expect(() => hazeLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works at top of canvas", () => {
    const ctx = createMockCtx();
    const props = { ...hazeLayerType.createDefault(), yPosition: 0.0 };
    expect(() => hazeLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works at bottom of canvas", () => {
    const ctx = createMockCtx();
    const props = { ...hazeLayerType.createDefault(), yPosition: 1.0 };
    expect(() => hazeLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...hazeLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => hazeLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...hazeLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => hazeLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with all haze presets", () => {
    for (const preset of HAZE_PRESETS) {
      const ctx = createMockCtx();
      const props = { ...hazeLayerType.createDefault(), preset: preset.id };
      expect(() => hazeLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("validate passes for valid preset", () => {
    expect(hazeLayerType.validate({ preset: "golden-haze" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = hazeLayerType.validate({ preset: "toxic-fog" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("toxic-fog");
  });

  it("validate passes with no preset", () => {
    expect(hazeLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 4 haze presets", () => {
      expect(HAZE_PRESETS).toHaveLength(4);
    });

    it("all presets have category 'haze'", () => {
      for (const p of HAZE_PRESETS) {
        expect(p.category).toBe("haze");
      }
    });

    it("all presets have required fields", () => {
      for (const p of HAZE_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.opacity).toBeGreaterThan(0);
        expect(p.opacity).toBeLessThanOrEqual(1);
        expect(p.height).toBeGreaterThan(0);
        expect(["bottom-up", "top-down", "center-out", "uniform"]).toContain(p.gradientDirection);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = HAZE_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
