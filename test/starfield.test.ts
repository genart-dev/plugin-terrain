import { describe, it, expect, vi } from "vitest";
import { starfieldLayerType } from "../src/layers/starfield.js";
import { STARFIELD_PRESETS } from "../src/presets/starfield.js";

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
    ellipse: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

const BOUNDS = { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1 };

describe("terrain:starfield", () => {
  it("has correct typeId", () => {
    expect(starfieldLayerType.typeId).toBe("terrain:starfield");
  });

  it("has correct displayName", () => {
    expect(starfieldLayerType.displayName).toBe("Star Field");
  });

  it("has correct category", () => {
    expect(starfieldLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = starfieldLayerType.createDefault();
    expect(defaults.preset).toBe("clear-night");
    expect(defaults.starCount).toBe(200);
    expect(defaults.brightnessRange).toBe(0.7);
    expect(defaults.maxSize).toBe(3.0);
    expect(defaults.starColor).toBe("#FFFFFF");
    expect(defaults.warmTint).toBe(0.1);
    expect(defaults.milkyWayEnabled).toBe(false);
    expect(defaults.constellationHints).toBe(false);
  });

  it("createDefault includes depthLane property", () => {
    const defaults = starfieldLayerType.createDefault();
    expect(defaults.depthLane).toBe("sky");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = starfieldLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes starCount number", () => {
    const prop = starfieldLayerType.properties.find((p) => p.key === "starCount");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("number");
  });

  it("properties schema includes milkyWayEnabled boolean", () => {
    const prop = starfieldLayerType.properties.find((p) => p.key === "milkyWayEnabled");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("boolean");
  });

  it("properties schema includes depthLane select", () => {
    const depthProp = starfieldLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthProp).toBeTruthy();
    expect(depthProp!.type).toBe("select");
    expect(depthProp!.default).toBe("sky");
  });

  it("render draws stars", () => {
    const ctx = createMockCtx();
    const props = starfieldLayerType.createDefault();
    starfieldLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("render works with milky way enabled", () => {
    const ctx = createMockCtx();
    const props = { ...starfieldLayerType.createDefault(), milkyWayEnabled: true };
    expect(() => starfieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with constellation hints", () => {
    const ctx = createMockCtx();
    const props = { ...starfieldLayerType.createDefault(), constellationHints: true, starCount: 500 };
    expect(() => starfieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with high star count", () => {
    const ctx = createMockCtx();
    const props = { ...starfieldLayerType.createDefault(), starCount: 1000 };
    expect(() => starfieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with low star count", () => {
    const ctx = createMockCtx();
    const props = { ...starfieldLayerType.createDefault(), starCount: 20 };
    expect(() => starfieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with high warm tint", () => {
    const ctx = createMockCtx();
    const props = { ...starfieldLayerType.createDefault(), warmTint: 1.0 };
    expect(() => starfieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...starfieldLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => starfieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...starfieldLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => starfieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with all starfield presets", () => {
    for (const preset of STARFIELD_PRESETS) {
      const ctx = createMockCtx();
      const props = { ...starfieldLayerType.createDefault(), preset: preset.id };
      expect(() => starfieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("validate passes for valid preset", () => {
    expect(starfieldLayerType.validate({ preset: "milky-way" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = starfieldLayerType.validate({ preset: "supernova" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("supernova");
  });

  it("validate passes with no preset", () => {
    expect(starfieldLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 5 starfield presets", () => {
      expect(STARFIELD_PRESETS).toHaveLength(5);
    });

    it("all presets have category 'starfield'", () => {
      for (const p of STARFIELD_PRESETS) {
        expect(p.category).toBe("starfield");
      }
    });

    it("has milky-way preset with milkyWayEnabled", () => {
      const mw = STARFIELD_PRESETS.find((p) => p.id === "milky-way");
      expect(mw).toBeTruthy();
      expect(mw!.milkyWayEnabled).toBe(true);
    });

    it("all presets have required fields", () => {
      for (const p of STARFIELD_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(p.starColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.starCount).toBeGreaterThan(0);
        expect(p.brightnessRange).toBeGreaterThan(0);
        expect(p.brightnessRange).toBeLessThanOrEqual(1);
        expect(p.maxSize).toBeGreaterThan(0);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = STARFIELD_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
