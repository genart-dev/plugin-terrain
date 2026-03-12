import { describe, it, expect, vi } from "vitest";
import { treelineLayerType } from "../src/layers/treeline.js";
import { TREELINE_PRESETS } from "../src/presets/treeline.js";

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

describe("terrain:treeline", () => {
  it("has correct typeId", () => {
    expect(treelineLayerType.typeId).toBe("terrain:treeline");
  });

  it("has correct displayName", () => {
    expect(treelineLayerType.displayName).toBe("Treeline");
  });

  it("has correct category", () => {
    expect(treelineLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = treelineLayerType.createDefault();
    expect(defaults.preset).toBe("deciduous-canopy");
    expect(defaults.color).toBe("#3A6A2A");
    expect(defaults.highlightColor).toBe("#5A8A4A");
    expect(defaults.shadowColor).toBe("#1A4A10");
    expect(defaults.canopyStyle).toBe("rounded");
    expect(defaults.density).toBe(0.8);
    expect(defaults.height).toBe(0.15);
    expect(defaults.irregularity).toBe(0.4);
  });

  it("createDefault includes depthLane property", () => {
    const defaults = treelineLayerType.createDefault();
    expect(defaults.depthLane).toBe("background");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = treelineLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes canopyStyle select", () => {
    const canopyProp = treelineLayerType.properties.find((p) => p.key === "canopyStyle");
    expect(canopyProp).toBeTruthy();
    expect(canopyProp!.type).toBe("select");
  });

  it("properties schema includes depthLane select", () => {
    const depthProp = treelineLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthProp).toBeTruthy();
    expect(depthProp!.type).toBe("select");
    expect(depthProp!.default).toBe("background");
  });

  it("render draws canopy mass", () => {
    const ctx = createMockCtx();
    const props = treelineLayerType.createDefault();
    treelineLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.closePath).toHaveBeenCalled();
  });

  it("render works with all canopy styles", () => {
    const styles = ["rounded", "pointed", "fan", "bare"];
    for (const style of styles) {
      const ctx = createMockCtx();
      const props = { ...treelineLayerType.createDefault(), canopyStyle: style };
      expect(() => treelineLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render works with low density", () => {
    const ctx = createMockCtx();
    const props = { ...treelineLayerType.createDefault(), density: 0.2 };
    expect(() => treelineLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with high density", () => {
    const ctx = createMockCtx();
    const props = { ...treelineLayerType.createDefault(), density: 1.0 };
    expect(() => treelineLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with short height", () => {
    const ctx = createMockCtx();
    const props = { ...treelineLayerType.createDefault(), height: 0.05 };
    expect(() => treelineLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with tall height", () => {
    const ctx = createMockCtx();
    const props = { ...treelineLayerType.createDefault(), height: 0.4 };
    expect(() => treelineLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with low irregularity", () => {
    const ctx = createMockCtx();
    const props = { ...treelineLayerType.createDefault(), irregularity: 0 };
    expect(() => treelineLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with high irregularity", () => {
    const ctx = createMockCtx();
    const props = { ...treelineLayerType.createDefault(), irregularity: 1.0 };
    expect(() => treelineLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...treelineLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => treelineLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...treelineLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => treelineLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("bare style draws trunk lines", () => {
    const ctx = createMockCtx();
    const props = { ...treelineLayerType.createDefault(), canopyStyle: "bare" };
    treelineLayerType.render(props, ctx, BOUNDS, {} as any);
    // Bare style draws stroked trunk/branch lines
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("render works with all treeline presets", () => {
    for (const preset of TREELINE_PRESETS) {
      const ctx = createMockCtx();
      const props = { ...treelineLayerType.createDefault(), preset: preset.id };
      expect(() => treelineLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("validate passes for valid preset", () => {
    expect(treelineLayerType.validate({ preset: "conifer-ridge" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = treelineLayerType.validate({ preset: "bamboo-grove" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("bamboo-grove");
  });

  it("validate passes with no preset", () => {
    expect(treelineLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 6 treeline presets", () => {
      expect(TREELINE_PRESETS).toHaveLength(6);
    });

    it("all presets have category 'treeline'", () => {
      for (const p of TREELINE_PRESETS) {
        expect(p.category).toBe("treeline");
      }
    });

    it("all presets have required fields", () => {
      for (const p of TREELINE_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.highlightColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.shadowColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.density).toBeGreaterThan(0);
        expect(p.density).toBeLessThanOrEqual(1);
        expect(p.height).toBeGreaterThan(0);
        expect(p.irregularity).toBeGreaterThanOrEqual(0);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = TREELINE_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
