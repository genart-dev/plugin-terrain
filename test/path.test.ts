import { describe, it, expect, vi } from "vitest";
import { pathLayerType } from "../src/layers/path.js";
import { PATH_PRESETS } from "../src/presets/path.js";

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
    strokeRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

const BOUNDS = { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1 };

describe("terrain:path", () => {
  it("has correct typeId", () => {
    expect(pathLayerType.typeId).toBe("terrain:path");
  });

  it("has correct displayName", () => {
    expect(pathLayerType.displayName).toBe("Path");
  });

  it("has correct category", () => {
    expect(pathLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = pathLayerType.createDefault();
    expect(defaults.preset).toBe("dirt-trail");
    expect(defaults.surfaceColor).toBe("#8B7355");
    expect(defaults.surfaceStyle).toBe("dirt");
    expect(defaults.edgeTreatment).toBe("grass-encroach");
    expect(defaults.wear).toBe(0.5);
    expect(defaults.widthNear).toBe(120);
    expect(defaults.widthFar).toBe(6);
  });

  it("createDefault includes depthLane property", () => {
    const defaults = pathLayerType.createDefault();
    expect(defaults.depthLane).toBe("midground");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = pathLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes surfaceStyle select", () => {
    const styleProp = pathLayerType.properties.find((p) => p.key === "surfaceStyle");
    expect(styleProp).toBeTruthy();
    expect(styleProp!.type).toBe("select");
  });

  it("properties schema includes edgeTreatment select", () => {
    const edgeProp = pathLayerType.properties.find((p) => p.key === "edgeTreatment");
    expect(edgeProp).toBeTruthy();
    expect(edgeProp!.type).toBe("select");
  });

  it("render draws path surface", () => {
    const ctx = createMockCtx();
    const props = pathLayerType.createDefault();
    pathLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("render works with all surface styles", () => {
    const styles = ["dirt", "cobblestone", "gravel", "sand", "worn-grass", "flagstone"];
    for (const style of styles) {
      const ctx = createMockCtx();
      const props = { ...pathLayerType.createDefault(), surfaceStyle: style };
      expect(() => pathLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render works with all edge treatments", () => {
    const edges = ["sharp", "grass-encroach", "scattered-stones", "overgrown"];
    for (const edge of edges) {
      const ctx = createMockCtx();
      const props = { ...pathLayerType.createDefault(), edgeTreatment: edge };
      expect(() => pathLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render works with all path presets", () => {
    const presets = ["straight", "meandering", "winding", "switchback", "fork"];
    for (const pp of presets) {
      const ctx = createMockCtx();
      const props = { ...pathLayerType.createDefault(), pathPreset: pp };
      expect(() => pathLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render works with high wear", () => {
    const ctx = createMockCtx();
    const props = { ...pathLayerType.createDefault(), wear: 1.0 };
    expect(() => pathLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with zero wear", () => {
    const ctx = createMockCtx();
    const props = { ...pathLayerType.createDefault(), wear: 0 };
    expect(() => pathLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...pathLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => pathLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("validate passes for valid preset", () => {
    expect(pathLayerType.validate({ preset: "cobblestone-road" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = pathLayerType.validate({ preset: "highway" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("highway");
  });

  it("validate passes with no preset", () => {
    expect(pathLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 8 path presets", () => {
      expect(PATH_PRESETS).toHaveLength(8);
    });

    it("all presets have category 'path'", () => {
      for (const p of PATH_PRESETS) {
        expect(p.category).toBe("path");
      }
    });

    it("all presets have required fields", () => {
      for (const p of PATH_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(p.widthNear).toBeGreaterThan(0);
        expect(p.widthFar).toBeGreaterThan(0);
        expect(p.surfaceColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.wear).toBeGreaterThanOrEqual(0);
        expect(p.wear).toBeLessThanOrEqual(1);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = PATH_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
