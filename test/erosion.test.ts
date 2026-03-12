import { describe, it, expect, vi } from "vitest";
import { erosionLayerType } from "../src/layers/erosion.js";
import { EROSION_PRESETS } from "../src/presets/erosion.js";

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
    quadraticCurveTo: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

const BOUNDS = { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1 };

describe("terrain:erosion", () => {
  it("has correct typeId", () => {
    expect(erosionLayerType.typeId).toBe("terrain:erosion");
  });

  it("has correct displayName", () => {
    expect(erosionLayerType.displayName).toBe("Erosion");
  });

  it("has correct category", () => {
    expect(erosionLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = erosionLayerType.createDefault();
    expect(defaults.preset).toBe("rain-streaks");
    expect(defaults.erosionType).toBe("rain-wash");
    expect(defaults.intensity).toBe(0.5);
    expect(defaults.coverageTop).toBe(0.3);
    expect(defaults.coverageBottom).toBe(0.8);
    expect(defaults.noiseScale).toBe(0.5);
  });

  it("createDefault includes depthLane property", () => {
    const defaults = erosionLayerType.createDefault();
    expect(defaults.depthLane).toBe("foreground");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = erosionLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes erosionType select", () => {
    const prop = erosionLayerType.properties.find((p) => p.key === "erosionType");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("select");
  });

  it("properties schema includes intensity number", () => {
    const prop = erosionLayerType.properties.find((p) => p.key === "intensity");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("number");
  });

  it("properties schema includes depthLane select", () => {
    const depthProp = erosionLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthProp).toBeTruthy();
    expect(depthProp!.type).toBe("select");
    expect(depthProp!.default).toBe("foreground");
  });

  it("render draws erosion marks", () => {
    const ctx = createMockCtx();
    const props = erosionLayerType.createDefault();
    erosionLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("render works with all erosion types", () => {
    const types = ["rain-wash", "wind-scour", "frost-crack", "lichen"];
    for (const type of types) {
      const ctx = createMockCtx();
      const props = { ...erosionLayerType.createDefault(), erosionType: type };
      expect(() => erosionLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render draws rain-wash with vertical streaks", () => {
    const ctx = createMockCtx();
    const props = { ...erosionLayerType.createDefault(), erosionType: "rain-wash" };
    erosionLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("render draws wind-scour with horizontal lines", () => {
    const ctx = createMockCtx();
    const props = { ...erosionLayerType.createDefault(), erosionType: "wind-scour" };
    erosionLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("render draws frost-crack with branching network", () => {
    const ctx = createMockCtx();
    const props = { ...erosionLayerType.createDefault(), erosionType: "frost-crack" };
    erosionLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("render draws lichen with arc patches", () => {
    const ctx = createMockCtx();
    const props = { ...erosionLayerType.createDefault(), erosionType: "lichen" };
    erosionLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("render works with high intensity", () => {
    const ctx = createMockCtx();
    const props = { ...erosionLayerType.createDefault(), intensity: 1.0 };
    expect(() => erosionLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with zero intensity", () => {
    const ctx = createMockCtx();
    const props = { ...erosionLayerType.createDefault(), intensity: 0 };
    expect(() => erosionLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...erosionLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => erosionLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...erosionLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => erosionLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with all erosion presets", () => {
    for (const preset of EROSION_PRESETS) {
      const ctx = createMockCtx();
      const props = { ...erosionLayerType.createDefault(), preset: preset.id };
      expect(() => erosionLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("validate passes for valid preset", () => {
    expect(erosionLayerType.validate({ preset: "frost-cracks" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = erosionLayerType.validate({ preset: "acid-rain" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("acid-rain");
  });

  it("validate passes with no preset", () => {
    expect(erosionLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 4 erosion presets", () => {
      expect(EROSION_PRESETS).toHaveLength(4);
    });

    it("all presets have category 'erosion'", () => {
      for (const p of EROSION_PRESETS) {
        expect(p.category).toBe("erosion");
      }
    });

    it("all presets have required fields", () => {
      for (const p of EROSION_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(["rain-wash", "wind-scour", "frost-crack", "lichen"]).toContain(p.erosionType);
        expect(p.intensity).toBeGreaterThanOrEqual(0);
        expect(p.intensity).toBeLessThanOrEqual(1);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = EROSION_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
