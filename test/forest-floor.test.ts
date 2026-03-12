import { describe, it, expect, vi } from "vitest";
import { forestFloorLayerType } from "../src/layers/forest-floor.js";
import { FOREST_FLOOR_PRESETS } from "../src/presets/forest-floor.js";

function createMockCtx() {
  return {
    fillRect: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
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

describe("terrain:forest-floor", () => {
  it("has correct typeId", () => {
    expect(forestFloorLayerType.typeId).toBe("terrain:forest-floor");
  });

  it("has correct displayName", () => {
    expect(forestFloorLayerType.displayName).toBe("Forest Floor");
  });

  it("has correct category", () => {
    expect(forestFloorLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = forestFloorLayerType.createDefault();
    expect(defaults.preset).toBe("fern-carpet");
    expect(defaults.coverType).toBe("ferns");
    expect(defaults.color).toBe("#3A5A30");
    expect(defaults.secondaryColor).toBe("#5A7A40");
    expect(defaults.groundColor).toBe("#4A3A28");
    expect(defaults.density).toBe(0.6);
    expect(defaults.coverageTop).toBe(0.7);
    expect(defaults.coverageBottom).toBe(1.0);
  });

  it("createDefault includes depthLane property", () => {
    const defaults = forestFloorLayerType.createDefault();
    expect(defaults.depthLane).toBe("ground-plane");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = forestFloorLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes coverType select", () => {
    const prop = forestFloorLayerType.properties.find((p) => p.key === "coverType");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("select");
  });

  it("properties schema includes density number", () => {
    const prop = forestFloorLayerType.properties.find((p) => p.key === "density");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("number");
  });

  it("properties schema includes depthLane select", () => {
    const depthProp = forestFloorLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthProp).toBeTruthy();
    expect(depthProp!.type).toBe("select");
    expect(depthProp!.default).toBe("ground-plane");
  });

  it("render draws forest floor", () => {
    const ctx = createMockCtx();
    const props = forestFloorLayerType.createDefault();
    forestFloorLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("render works with all cover types", () => {
    const types = ["ferns", "moss", "fallen-logs", "mushrooms"];
    for (const ct of types) {
      const ctx = createMockCtx();
      const props = { ...forestFloorLayerType.createDefault(), coverType: ct };
      expect(() => forestFloorLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render works with ferns cover type", () => {
    const ctx = createMockCtx();
    const props = { ...forestFloorLayerType.createDefault(), coverType: "ferns" };
    forestFloorLayerType.render(props, ctx, BOUNDS, {} as any);
    // Ferns use stroke for spine and leaflets
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("render works with moss cover type", () => {
    const ctx = createMockCtx();
    const props = { ...forestFloorLayerType.createDefault(), coverType: "moss" };
    forestFloorLayerType.render(props, ctx, BOUNDS, {} as any);
    // Moss uses ellipse for patches
    expect(ctx.ellipse).toHaveBeenCalled();
  });

  it("render works with mushrooms cover type", () => {
    const ctx = createMockCtx();
    const props = { ...forestFloorLayerType.createDefault(), coverType: "mushrooms" };
    forestFloorLayerType.render(props, ctx, BOUNDS, {} as any);
    // Mushrooms use ellipse for caps
    expect(ctx.ellipse).toHaveBeenCalled();
  });

  it("render works with low density", () => {
    const ctx = createMockCtx();
    const props = { ...forestFloorLayerType.createDefault(), density: 0.1 };
    expect(() => forestFloorLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with high density", () => {
    const ctx = createMockCtx();
    const props = { ...forestFloorLayerType.createDefault(), density: 1.0 };
    expect(() => forestFloorLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render handles coverageTop > coverageBottom gracefully", () => {
    const ctx = createMockCtx();
    const props = { ...forestFloorLayerType.createDefault(), coverageTop: 1.0, coverageBottom: 0.5 };
    expect(() => forestFloorLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...forestFloorLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => forestFloorLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...forestFloorLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => forestFloorLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with all forest-floor presets", () => {
    for (const preset of FOREST_FLOOR_PRESETS) {
      const ctx = createMockCtx();
      const props = { ...forestFloorLayerType.createDefault(), preset: preset.id };
      expect(() => forestFloorLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("validate passes for valid preset", () => {
    expect(forestFloorLayerType.validate({ preset: "mossy-ground" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = forestFloorLayerType.validate({ preset: "desert-sand" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("desert-sand");
  });

  it("validate passes with no preset", () => {
    expect(forestFloorLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 5 forest-floor presets", () => {
      expect(FOREST_FLOOR_PRESETS).toHaveLength(5);
    });

    it("all presets have category 'forest-floor'", () => {
      for (const p of FOREST_FLOOR_PRESETS) {
        expect(p.category).toBe("forest-floor");
      }
    });

    it("all presets have required fields", () => {
      for (const p of FOREST_FLOOR_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.secondaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.groundColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.density).toBeGreaterThan(0);
        expect(p.density).toBeLessThanOrEqual(1);
        expect(["ferns", "moss", "fallen-logs", "mushrooms"]).toContain(p.coverType);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = FOREST_FLOOR_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
