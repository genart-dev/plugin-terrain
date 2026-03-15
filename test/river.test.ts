import { describe, it, expect, vi } from "vitest";
import { riverLayerType } from "../src/layers/river.js";
import { RIVER_PRESETS } from "../src/presets/river.js";

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
  } as unknown as CanvasRenderingContext2D;
}

const BOUNDS = { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1 };

describe("terrain:river", () => {
  it("has correct typeId", () => {
    expect(riverLayerType.typeId).toBe("terrain:river");
  });

  it("has correct displayName", () => {
    expect(riverLayerType.displayName).toBe("River");
  });

  it("has correct category", () => {
    expect(riverLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = riverLayerType.createDefault();
    expect(defaults.preset).toBe("gentle-stream");
    expect(defaults.waterColor).toBe("#4A7A8A");
    expect(defaults.bankColor).toBe("#5C6B3A");
    expect(defaults.widthNear).toBe(140);
    expect(defaults.widthFar).toBe(8);
    expect(defaults.pathPreset).toBe("meandering");
  });

  it("createDefault includes depthLane property", () => {
    const defaults = riverLayerType.createDefault();
    expect(defaults.depthLane).toBe("midground");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = riverLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes depthLane select", () => {
    const depthLaneProp = riverLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthLaneProp).toBeTruthy();
    expect(depthLaneProp!.type).toBe("select");
    expect(depthLaneProp!.default).toBe("midground");
  });

  it("properties schema includes atmosphericMode select", () => {
    const atmoProp = riverLayerType.properties.find((p) => p.key === "atmosphericMode");
    expect(atmoProp).toBeTruthy();
    expect(atmoProp!.type).toBe("select");
  });

  it("properties schema includes pathPreset select", () => {
    const pathProp = riverLayerType.properties.find((p) => p.key === "pathPreset");
    expect(pathProp).toBeTruthy();
    expect(pathProp!.type).toBe("select");
  });

  it("properties schema includes bankStyle select", () => {
    const bankProp = riverLayerType.properties.find((p) => p.key === "bankStyle");
    expect(bankProp).toBeTruthy();
    expect(bankProp!.type).toBe("select");
  });

  it("render draws water ribbon and ripples", () => {
    const ctx = createMockCtx();
    const props = riverLayerType.createDefault();
    riverLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("render works with all path presets", () => {
    const pathPresets = ["straight", "meandering", "s-curve", "winding", "switchback", "fork"];
    for (const pp of pathPresets) {
      const ctx = createMockCtx();
      const props = { ...riverLayerType.createDefault(), pathPreset: pp };
      expect(() => riverLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render works with zero rippleIntensity", () => {
    const ctx = createMockCtx();
    const props = { ...riverLayerType.createDefault(), rippleIntensity: 0 };
    expect(() => riverLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with zero reflectionIntensity", () => {
    const ctx = createMockCtx();
    const props = { ...riverLayerType.createDefault(), reflectionIntensity: 0 };
    expect(() => riverLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with bank style 'none'", () => {
    const ctx = createMockCtx();
    const props = { ...riverLayerType.createDefault(), bankStyle: "none" };
    expect(() => riverLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...riverLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => riverLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...riverLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => riverLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("validate passes for valid preset", () => {
    expect(riverLayerType.validate({ preset: "wide-river" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = riverLayerType.validate({ preset: "lava-flow" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("lava-flow");
  });

  it("validate passes with no preset", () => {
    expect(riverLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 8 river presets", () => {
      expect(RIVER_PRESETS).toHaveLength(8);
    });

    it("all presets have category 'river'", () => {
      for (const p of RIVER_PRESETS) {
        expect(p.category).toBe("river");
      }
    });

    it("all presets have required fields", () => {
      for (const p of RIVER_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(p.widthNear).toBeGreaterThan(0);
        expect(p.widthFar).toBeGreaterThan(0);
        expect(p.waterColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.bankColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = RIVER_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
