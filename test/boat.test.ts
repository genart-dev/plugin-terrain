import { describe, it, expect, vi } from "vitest";
import { boatLayerType } from "../src/layers/boat.js";
import { BOAT_PRESETS } from "../src/presets/boat.js";

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
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

const BOUNDS = { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1 };

describe("terrain:boat", () => {
  it("has correct typeId", () => {
    expect(boatLayerType.typeId).toBe("terrain:boat");
  });

  it("has correct displayName", () => {
    expect(boatLayerType.displayName).toBe("Boat");
  });

  it("has correct category", () => {
    expect(boatLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = boatLayerType.createDefault();
    expect(defaults.preset).toBe("sailboat");
    expect(defaults.boatType).toBe("sailboat");
    expect(defaults.color).toBe("#4A3A30");
    expect(defaults.sailColor).toBe("#F0E8D8");
    expect(defaults.scale).toBe(0.06);
    expect(defaults.xPosition).toBe(0.5);
    expect(defaults.yPosition).toBe(0.55);
    expect(defaults.tilt).toBe(0);
  });

  it("createDefault includes depthLane property", () => {
    const defaults = boatLayerType.createDefault();
    expect(defaults.depthLane).toBe("midground");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = boatLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes boatType select", () => {
    const prop = boatLayerType.properties.find((p) => p.key === "boatType");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("select");
  });

  it("properties schema includes scale number", () => {
    const prop = boatLayerType.properties.find((p) => p.key === "scale");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("number");
  });

  it("properties schema includes depthLane select", () => {
    const depthProp = boatLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthProp).toBeTruthy();
    expect(depthProp!.type).toBe("select");
    expect(depthProp!.default).toBe("midground");
  });

  it("render draws boat", () => {
    const ctx = createMockCtx();
    const props = boatLayerType.createDefault();
    boatLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.fill).toHaveBeenCalled();
  });

  it("render works with all boat types", () => {
    const types = ["sailboat", "rowboat", "fishing", "ship"];
    for (const type of types) {
      const ctx = createMockCtx();
      const props = { ...boatLayerType.createDefault(), boatType: type };
      expect(() => boatLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render draws sailboat with sail", () => {
    const ctx = createMockCtx();
    const props = { ...boatLayerType.createDefault(), boatType: "sailboat" };
    boatLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
  });

  it("render draws rowboat with thwart", () => {
    const ctx = createMockCtx();
    const props = { ...boatLayerType.createDefault(), boatType: "rowboat" };
    boatLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("render draws fishing boat with cabin", () => {
    const ctx = createMockCtx();
    const props = { ...boatLayerType.createDefault(), boatType: "fishing" };
    boatLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("render draws ship with superstructure", () => {
    const ctx = createMockCtx();
    const props = { ...boatLayerType.createDefault(), boatType: "ship" };
    boatLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("render applies tilt rotation", () => {
    const ctx = createMockCtx();
    const props = { ...boatLayerType.createDefault(), tilt: 10 };
    boatLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.rotate).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it("render works with large scale", () => {
    const ctx = createMockCtx();
    const props = { ...boatLayerType.createDefault(), scale: 0.15 };
    expect(() => boatLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with small scale", () => {
    const ctx = createMockCtx();
    const props = { ...boatLayerType.createDefault(), scale: 0.02 };
    expect(() => boatLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...boatLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => boatLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...boatLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => boatLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with all boat presets", () => {
    for (const preset of BOAT_PRESETS) {
      const ctx = createMockCtx();
      const props = { ...boatLayerType.createDefault(), preset: preset.id };
      expect(() => boatLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("validate passes for valid preset", () => {
    expect(boatLayerType.validate({ preset: "rowboat" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = boatLayerType.validate({ preset: "submarine" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("submarine");
  });

  it("validate passes with no preset", () => {
    expect(boatLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 4 boat presets", () => {
      expect(BOAT_PRESETS).toHaveLength(4);
    });

    it("all presets have category 'boat'", () => {
      for (const p of BOAT_PRESETS) {
        expect(p.category).toBe("boat");
      }
    });

    it("all presets have required fields", () => {
      for (const p of BOAT_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.sailColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(["sailboat", "rowboat", "fishing", "ship"]).toContain(p.boatType);
        expect(p.scale).toBeGreaterThan(0);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = BOAT_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
