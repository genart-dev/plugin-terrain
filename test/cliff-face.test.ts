import { describe, it, expect, vi } from "vitest";
import { cliffFaceLayerType } from "../src/layers/cliff-face.js";
import { CLIFF_FACE_PRESETS } from "../src/presets/cliff-face.js";

function createMockCtx() {
  return {
    fillRect: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    save: vi.fn(),
    restore: vi.fn(),
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

describe("terrain:cliff-face", () => {
  it("has correct typeId", () => {
    expect(cliffFaceLayerType.typeId).toBe("terrain:cliff-face");
  });

  it("has correct displayName", () => {
    expect(cliffFaceLayerType.displayName).toBe("Cliff Face");
  });

  it("has correct category", () => {
    expect(cliffFaceLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = cliffFaceLayerType.createDefault();
    expect(defaults.preset).toBe("granite-cliff");
    expect(defaults.textureMode).toBe("sandstone");
    expect(defaults.color).toBe("#A08060");
    expect(defaults.shadowColor).toBe("#604830");
    expect(defaults.height).toBe(0.6);
    expect(defaults.xPosition).toBe(0.0);
    expect(defaults.width).toBe(0.3);
    expect(defaults.roughness).toBe(0.5);
    expect(defaults.ledgeCount).toBe(3);
  });

  it("createDefault includes depthLane property", () => {
    const defaults = cliffFaceLayerType.createDefault();
    expect(defaults.depthLane).toBe("background");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = cliffFaceLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes textureMode select", () => {
    const prop = cliffFaceLayerType.properties.find((p) => p.key === "textureMode");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("select");
  });

  it("properties schema includes ledgeCount number", () => {
    const prop = cliffFaceLayerType.properties.find((p) => p.key === "ledgeCount");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("number");
  });

  it("properties schema includes depthLane select", () => {
    const depthProp = cliffFaceLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthProp).toBeTruthy();
    expect(depthProp!.type).toBe("select");
    expect(depthProp!.default).toBe("background");
  });

  it("render draws cliff face", () => {
    const ctx = createMockCtx();
    const props = cliffFaceLayerType.createDefault();
    cliffFaceLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.closePath).toHaveBeenCalled();
  });

  it("render works with all texture modes", () => {
    const modes = ["sandstone", "granite", "basalt", "limestone"];
    for (const mode of modes) {
      const ctx = createMockCtx();
      const props = { ...cliffFaceLayerType.createDefault(), textureMode: mode };
      expect(() => cliffFaceLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render works with zero ledges", () => {
    const ctx = createMockCtx();
    const props = { ...cliffFaceLayerType.createDefault(), ledgeCount: 0 };
    expect(() => cliffFaceLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with many ledges", () => {
    const ctx = createMockCtx();
    const props = { ...cliffFaceLayerType.createDefault(), ledgeCount: 8 };
    expect(() => cliffFaceLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with low roughness", () => {
    const ctx = createMockCtx();
    const props = { ...cliffFaceLayerType.createDefault(), roughness: 0 };
    expect(() => cliffFaceLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with high roughness", () => {
    const ctx = createMockCtx();
    const props = { ...cliffFaceLayerType.createDefault(), roughness: 1.0 };
    expect(() => cliffFaceLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with wide cliff", () => {
    const ctx = createMockCtx();
    const props = { ...cliffFaceLayerType.createDefault(), width: 0.8 };
    expect(() => cliffFaceLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with narrow cliff", () => {
    const ctx = createMockCtx();
    const props = { ...cliffFaceLayerType.createDefault(), width: 0.1 };
    expect(() => cliffFaceLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...cliffFaceLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => cliffFaceLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...cliffFaceLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => cliffFaceLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with all cliff-face presets", () => {
    for (const preset of CLIFF_FACE_PRESETS) {
      const ctx = createMockCtx();
      const props = { ...cliffFaceLayerType.createDefault(), preset: preset.id };
      expect(() => cliffFaceLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("validate passes for valid preset", () => {
    expect(cliffFaceLayerType.validate({ preset: "basalt-columns" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = cliffFaceLayerType.validate({ preset: "marble-face" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("marble-face");
  });

  it("validate passes with no preset", () => {
    expect(cliffFaceLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 5 cliff-face presets", () => {
      expect(CLIFF_FACE_PRESETS).toHaveLength(5);
    });

    it("all presets have category 'cliff-face'", () => {
      for (const p of CLIFF_FACE_PRESETS) {
        expect(p.category).toBe("cliff-face");
      }
    });

    it("all presets have required fields", () => {
      for (const p of CLIFF_FACE_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.shadowColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.height).toBeGreaterThan(0);
        expect(p.width).toBeGreaterThan(0);
        expect(["sandstone", "granite", "basalt", "limestone"]).toContain(p.textureMode);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = CLIFF_FACE_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
