import { describe, it, expect, vi } from "vitest";
import { fieldLayerType } from "../src/layers/field.js";
import { FIELD_PRESETS } from "../src/presets/field.js";

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

describe("terrain:field", () => {
  it("has correct typeId", () => {
    expect(fieldLayerType.typeId).toBe("terrain:field");
  });

  it("has correct displayName", () => {
    expect(fieldLayerType.displayName).toBe("Field");
  });

  it("has correct category", () => {
    expect(fieldLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = fieldLayerType.createDefault();
    expect(defaults.preset).toBe("meadow-grass");
    expect(defaults.color).toBe("#5A8A3A");
    expect(defaults.secondaryColor).toBe("#7AAA5A");
    expect(defaults.density).toBe(0.6);
    expect(defaults.markLength).toBe(8);
    expect(defaults.windDirection).toBe(45);
    expect(defaults.windStrength).toBe(0.3);
    expect(defaults.vegetationType).toBe("grass");
    expect(defaults.seasonalTint).toBe("summer");
  });

  it("createDefault includes depthLane property", () => {
    const defaults = fieldLayerType.createDefault();
    expect(defaults.depthLane).toBe("midground");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = fieldLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes vegetationType select", () => {
    const vegProp = fieldLayerType.properties.find((p) => p.key === "vegetationType");
    expect(vegProp).toBeTruthy();
    expect(vegProp!.type).toBe("select");
  });

  it("properties schema includes seasonalTint select", () => {
    const seasonProp = fieldLayerType.properties.find((p) => p.key === "seasonalTint");
    expect(seasonProp).toBeTruthy();
    expect(seasonProp!.type).toBe("select");
  });

  it("properties schema includes depthLane select", () => {
    const depthProp = fieldLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthProp).toBeTruthy();
    expect(depthProp!.type).toBe("select");
    expect(depthProp!.default).toBe("midground");
  });

  it("render draws vegetation marks", () => {
    const ctx = createMockCtx();
    const props = fieldLayerType.createDefault();
    fieldLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("render works with all vegetation types", () => {
    const types = ["grass", "wheat", "wildflowers"];
    for (const veg of types) {
      const ctx = createMockCtx();
      const props = { ...fieldLayerType.createDefault(), vegetationType: veg };
      expect(() => fieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render works with all seasonal tints", () => {
    const seasons = ["spring", "summer", "autumn", "winter"];
    for (const season of seasons) {
      const ctx = createMockCtx();
      const props = { ...fieldLayerType.createDefault(), seasonalTint: season };
      expect(() => fieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render works with low density", () => {
    const ctx = createMockCtx();
    const props = { ...fieldLayerType.createDefault(), density: 0.1 };
    expect(() => fieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with high density", () => {
    const ctx = createMockCtx();
    const props = { ...fieldLayerType.createDefault(), density: 1.0 };
    expect(() => fieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with zero wind", () => {
    const ctx = createMockCtx();
    const props = { ...fieldLayerType.createDefault(), windStrength: 0 };
    expect(() => fieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with strong wind", () => {
    const ctx = createMockCtx();
    const props = { ...fieldLayerType.createDefault(), windStrength: 1.0, windDirection: 180 };
    expect(() => fieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...fieldLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => fieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...fieldLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => fieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with all field presets", () => {
    for (const preset of FIELD_PRESETS) {
      const ctx = createMockCtx();
      const props = { ...fieldLayerType.createDefault(), preset: preset.id };
      expect(() => fieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("validate passes for valid preset", () => {
    expect(fieldLayerType.validate({ preset: "wheat-field" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = fieldLayerType.validate({ preset: "corn-field" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("corn-field");
  });

  it("validate passes with no preset", () => {
    expect(fieldLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 8 field presets", () => {
      expect(FIELD_PRESETS).toHaveLength(8);
    });

    it("all presets have category 'field'", () => {
      for (const p of FIELD_PRESETS) {
        expect(p.category).toBe("field");
      }
    });

    it("all presets have required fields", () => {
      for (const p of FIELD_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.secondaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.density).toBeGreaterThan(0);
        expect(p.density).toBeLessThanOrEqual(1);
        expect(p.markLength).toBeGreaterThan(0);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = FIELD_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
