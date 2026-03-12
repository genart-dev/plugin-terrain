import { describe, it, expect, vi } from "vitest";
import { shoreLayerType } from "../src/layers/shore.js";
import { SHORE_PRESETS } from "../src/presets/shore.js";

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

describe("terrain:shore", () => {
  it("has correct typeId", () => {
    expect(shoreLayerType.typeId).toBe("terrain:shore");
  });

  it("has correct displayName", () => {
    expect(shoreLayerType.displayName).toBe("Shore");
  });

  it("has correct category", () => {
    expect(shoreLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = shoreLayerType.createDefault();
    expect(defaults.preset).toBe("sandy-beach");
    expect(defaults.color).toBe("#D4C4A0");
    expect(defaults.wetColor).toBe("#B0A080");
    expect(defaults.waterlinePosition).toBe(0.6);
    expect(defaults.width).toBe(0.08);
    expect(defaults.foamIntensity).toBe(0.5);
  });

  it("createDefault includes depthLane property", () => {
    const defaults = shoreLayerType.createDefault();
    expect(defaults.depthLane).toBe("ground-plane");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = shoreLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes debrisType select", () => {
    const debrisProp = shoreLayerType.properties.find((p) => p.key === "debrisType");
    expect(debrisProp).toBeTruthy();
    expect(debrisProp!.type).toBe("select");
  });

  it("properties schema includes foamLine select", () => {
    const foamProp = shoreLayerType.properties.find((p) => p.key === "foamLine");
    expect(foamProp).toBeTruthy();
  });

  it("render draws shore gradient and features", () => {
    const ctx = createMockCtx();
    const props = shoreLayerType.createDefault();
    shoreLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.createLinearGradient).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("render works with all debris types", () => {
    const debrisTypes = ["none", "seaweed", "driftwood", "shells", "pebbles"];
    for (const debris of debrisTypes) {
      const ctx = createMockCtx();
      const props = { ...shoreLayerType.createDefault(), debrisType: debris };
      expect(() => shoreLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render works without foam line", () => {
    const ctx = createMockCtx();
    const props = { ...shoreLayerType.createDefault(), foamLine: "false", foamIntensity: 0 };
    expect(() => shoreLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with maximum foam", () => {
    const ctx = createMockCtx();
    const props = { ...shoreLayerType.createDefault(), foamIntensity: 1.0 };
    expect(() => shoreLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with narrow shore width", () => {
    const ctx = createMockCtx();
    const props = { ...shoreLayerType.createDefault(), width: 0.02 };
    expect(() => shoreLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with wide shore width", () => {
    const ctx = createMockCtx();
    const props = { ...shoreLayerType.createDefault(), width: 0.2 };
    expect(() => shoreLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...shoreLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => shoreLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...shoreLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => shoreLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with different waterline positions", () => {
    for (const pos of [0.2, 0.5, 0.8]) {
      const ctx = createMockCtx();
      const props = { ...shoreLayerType.createDefault(), waterlinePosition: pos };
      expect(() => shoreLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("validate passes for valid preset", () => {
    expect(shoreLayerType.validate({ preset: "rocky-shore" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = shoreLayerType.validate({ preset: "lava-coast" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("lava-coast");
  });

  it("validate passes with no preset", () => {
    expect(shoreLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 6 shore presets", () => {
      expect(SHORE_PRESETS).toHaveLength(6);
    });

    it("all presets have category 'shore'", () => {
      for (const p of SHORE_PRESETS) {
        expect(p.category).toBe("shore");
      }
    });

    it("all presets have required fields", () => {
      for (const p of SHORE_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(p.width).toBeGreaterThan(0);
        expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.wetColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = SHORE_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
