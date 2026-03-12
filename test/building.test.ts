import { describe, it, expect, vi } from "vitest";
import { buildingLayerType } from "../src/layers/building.js";
import { BUILDING_PRESETS } from "../src/presets/building.js";

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

describe("terrain:building", () => {
  it("has correct typeId", () => {
    expect(buildingLayerType.typeId).toBe("terrain:building");
  });

  it("has correct displayName", () => {
    expect(buildingLayerType.displayName).toBe("Building");
  });

  it("has correct category", () => {
    expect(buildingLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = buildingLayerType.createDefault();
    expect(defaults.preset).toBe("farmhouse");
    expect(defaults.buildingType).toBe("farmhouse");
    expect(defaults.color).toBe("#5A5050");
    expect(defaults.roofColor).toBe("#704030");
    expect(defaults.scale).toBe(1.0);
    expect(defaults.xPosition).toBe(0.5);
    expect(defaults.yPosition).toBe(0.6);
    expect(defaults.windowCount).toBe(2);
  });

  it("createDefault includes depthLane property", () => {
    const defaults = buildingLayerType.createDefault();
    expect(defaults.depthLane).toBe("midground");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = buildingLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes buildingType select", () => {
    const prop = buildingLayerType.properties.find((p) => p.key === "buildingType");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("select");
  });

  it("properties schema includes windowCount number", () => {
    const prop = buildingLayerType.properties.find((p) => p.key === "windowCount");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("number");
  });

  it("properties schema includes depthLane select", () => {
    const depthProp = buildingLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthProp).toBeTruthy();
    expect(depthProp!.type).toBe("select");
    expect(depthProp!.default).toBe("midground");
  });

  it("render draws building", () => {
    const ctx = createMockCtx();
    const props = buildingLayerType.createDefault();
    buildingLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("render works with all building types", () => {
    const types = ["farmhouse", "church", "tower", "village"];
    for (const bt of types) {
      const ctx = createMockCtx();
      const props = { ...buildingLayerType.createDefault(), buildingType: bt };
      expect(() => buildingLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render draws farmhouse with roof triangle", () => {
    const ctx = createMockCtx();
    const props = { ...buildingLayerType.createDefault(), buildingType: "farmhouse" };
    buildingLayerType.render(props, ctx, BOUNDS, {} as any);
    // Roof uses beginPath/closePath/fill
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.closePath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("render works with church steeple", () => {
    const ctx = createMockCtx();
    const props = { ...buildingLayerType.createDefault(), buildingType: "church" };
    expect(() => buildingLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with tower", () => {
    const ctx = createMockCtx();
    const props = { ...buildingLayerType.createDefault(), buildingType: "tower" };
    expect(() => buildingLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with village cluster", () => {
    const ctx = createMockCtx();
    const props = { ...buildingLayerType.createDefault(), buildingType: "village" };
    expect(() => buildingLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with zero windows", () => {
    const ctx = createMockCtx();
    const props = { ...buildingLayerType.createDefault(), windowCount: 0 };
    expect(() => buildingLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with many windows", () => {
    const ctx = createMockCtx();
    const props = { ...buildingLayerType.createDefault(), windowCount: 6 };
    expect(() => buildingLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with small scale", () => {
    const ctx = createMockCtx();
    const props = { ...buildingLayerType.createDefault(), scale: 0.3 };
    expect(() => buildingLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with large scale", () => {
    const ctx = createMockCtx();
    const props = { ...buildingLayerType.createDefault(), scale: 2.0 };
    expect(() => buildingLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...buildingLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => buildingLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...buildingLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => buildingLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with all building presets", () => {
    for (const preset of BUILDING_PRESETS) {
      const ctx = createMockCtx();
      const props = { ...buildingLayerType.createDefault(), preset: preset.id };
      expect(() => buildingLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("validate passes for valid preset", () => {
    expect(buildingLayerType.validate({ preset: "church-steeple" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = buildingLayerType.validate({ preset: "skyscraper" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("skyscraper");
  });

  it("validate passes with no preset", () => {
    expect(buildingLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 6 building presets", () => {
      expect(BUILDING_PRESETS).toHaveLength(6);
    });

    it("all presets have category 'building'", () => {
      for (const p of BUILDING_PRESETS) {
        expect(p.category).toBe("building");
      }
    });

    it("all presets have required fields", () => {
      for (const p of BUILDING_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.roofColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.scale).toBeGreaterThan(0);
        expect(["farmhouse", "church", "tower", "village"]).toContain(p.buildingType);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = BUILDING_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
