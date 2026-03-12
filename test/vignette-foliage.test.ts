import { describe, it, expect, vi } from "vitest";
import { vignetteFoliageLayerType } from "../src/layers/vignette-foliage.js";
import { VIGNETTE_FOLIAGE_PRESETS } from "../src/presets/vignette-foliage.js";

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
    quadraticCurveTo: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

const BOUNDS = { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1 };

describe("terrain:vignette-foliage", () => {
  it("has correct typeId", () => {
    expect(vignetteFoliageLayerType.typeId).toBe("terrain:vignette-foliage");
  });

  it("has correct displayName", () => {
    expect(vignetteFoliageLayerType.displayName).toBe("Vignette Foliage");
  });

  it("has correct category", () => {
    expect(vignetteFoliageLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = vignetteFoliageLayerType.createDefault();
    expect(defaults.preset).toBe("overhanging-branches");
    expect(defaults.foliageStyle).toBe("branches");
    expect(defaults.color).toBe("#2A4A20");
    expect(defaults.secondaryColor).toBe("#4A6A30");
    expect(defaults.density).toBe(0.5);
    expect(defaults.depth).toBe(0.15);
    expect(defaults.edges).toBe("top");
  });

  it("createDefault includes depthLane property", () => {
    const defaults = vignetteFoliageLayerType.createDefault();
    expect(defaults.depthLane).toBe("overlay");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = vignetteFoliageLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes foliageStyle select", () => {
    const prop = vignetteFoliageLayerType.properties.find((p) => p.key === "foliageStyle");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("select");
  });

  it("properties schema includes edges select", () => {
    const prop = vignetteFoliageLayerType.properties.find((p) => p.key === "edges");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("select");
  });

  it("properties schema includes depthLane select", () => {
    const depthProp = vignetteFoliageLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthProp).toBeTruthy();
    expect(depthProp!.type).toBe("select");
    expect(depthProp!.default).toBe("overlay");
  });

  it("render draws foliage", () => {
    const ctx = createMockCtx();
    const props = vignetteFoliageLayerType.createDefault();
    vignetteFoliageLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.beginPath).toHaveBeenCalled();
  });

  it("render works with all foliage styles", () => {
    const styles = ["branches", "grass-blades", "leaves", "vines"];
    for (const style of styles) {
      const ctx = createMockCtx();
      const props = { ...vignetteFoliageLayerType.createDefault(), foliageStyle: style };
      expect(() => vignetteFoliageLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render works with all edge configurations", () => {
    const edges = ["top", "bottom", "sides", "top-sides", "all"];
    for (const edge of edges) {
      const ctx = createMockCtx();
      const props = { ...vignetteFoliageLayerType.createDefault(), edges: edge };
      expect(() => vignetteFoliageLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render works with all styles and all edge configs", () => {
    const styles = ["branches", "grass-blades", "leaves", "vines"];
    const edges = ["top", "bottom", "sides", "top-sides", "all"];
    for (const style of styles) {
      for (const edge of edges) {
        const ctx = createMockCtx();
        const props = { ...vignetteFoliageLayerType.createDefault(), foliageStyle: style, edges: edge };
        expect(() => vignetteFoliageLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
      }
    }
  });

  it("render works with low density", () => {
    const ctx = createMockCtx();
    const props = { ...vignetteFoliageLayerType.createDefault(), density: 0.1 };
    expect(() => vignetteFoliageLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with high density", () => {
    const ctx = createMockCtx();
    const props = { ...vignetteFoliageLayerType.createDefault(), density: 1.0 };
    expect(() => vignetteFoliageLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with small depth", () => {
    const ctx = createMockCtx();
    const props = { ...vignetteFoliageLayerType.createDefault(), depth: 0.02 };
    expect(() => vignetteFoliageLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with large depth", () => {
    const ctx = createMockCtx();
    const props = { ...vignetteFoliageLayerType.createDefault(), depth: 0.35 };
    expect(() => vignetteFoliageLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...vignetteFoliageLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => vignetteFoliageLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...vignetteFoliageLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => vignetteFoliageLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with all vignette-foliage presets", () => {
    for (const preset of VIGNETTE_FOLIAGE_PRESETS) {
      const ctx = createMockCtx();
      const props = { ...vignetteFoliageLayerType.createDefault(), preset: preset.id };
      expect(() => vignetteFoliageLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("validate passes for valid preset", () => {
    expect(vignetteFoliageLayerType.validate({ preset: "leaf-frame" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = vignetteFoliageLayerType.validate({ preset: "cactus-border" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("cactus-border");
  });

  it("validate passes with no preset", () => {
    expect(vignetteFoliageLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 5 vignette-foliage presets", () => {
      expect(VIGNETTE_FOLIAGE_PRESETS).toHaveLength(5);
    });

    it("all presets have category 'vignette-foliage'", () => {
      for (const p of VIGNETTE_FOLIAGE_PRESETS) {
        expect(p.category).toBe("vignette-foliage");
      }
    });

    it("all presets have required fields", () => {
      for (const p of VIGNETTE_FOLIAGE_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.secondaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.density).toBeGreaterThan(0);
        expect(p.density).toBeLessThanOrEqual(1);
        expect(p.depth).toBeGreaterThan(0);
        expect(["branches", "grass-blades", "leaves", "vines"]).toContain(p.foliageStyle);
        expect(["top", "bottom", "sides", "top-sides", "all"]).toContain(p.edges);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = VIGNETTE_FOLIAGE_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
