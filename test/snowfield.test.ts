import { describe, it, expect, vi } from "vitest";
import { snowfieldLayerType } from "../src/layers/snowfield.js";
import { SNOWFIELD_PRESETS } from "../src/presets/snowfield.js";

function createMockCtx() {
  return {
    fillRect: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    save: vi.fn(),
    restore: vi.fn(),
    clip: vi.fn(),
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

describe("terrain:snowfield", () => {
  it("has correct typeId", () => {
    expect(snowfieldLayerType.typeId).toBe("terrain:snowfield");
  });

  it("has correct displayName", () => {
    expect(snowfieldLayerType.displayName).toBe("Snow Field");
  });

  it("has correct category", () => {
    expect(snowfieldLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = snowfieldLayerType.createDefault();
    expect(defaults.preset).toBe("fresh-powder");
    expect(defaults.snowColor).toBe("#F0F4F8");
    expect(defaults.shadowColor).toBe("#A8B8D0");
    expect(defaults.driftIntensity).toBe(0.5);
    expect(defaults.sparkleIntensity).toBe(0.3);
    expect(defaults.coverageTop).toBe(0.5);
    expect(defaults.coverageBottom).toBe(1.0);
  });

  it("createDefault includes depthLane property", () => {
    const defaults = snowfieldLayerType.createDefault();
    expect(defaults.depthLane).toBe("ground-plane");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = snowfieldLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes driftIntensity number", () => {
    const prop = snowfieldLayerType.properties.find((p) => p.key === "driftIntensity");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("number");
  });

  it("properties schema includes sparkleIntensity number", () => {
    const prop = snowfieldLayerType.properties.find((p) => p.key === "sparkleIntensity");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("number");
  });

  it("properties schema includes depthLane select", () => {
    const depthProp = snowfieldLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthProp).toBeTruthy();
    expect(depthProp!.type).toBe("select");
    expect(depthProp!.default).toBe("ground-plane");
  });

  it("render draws snow field", () => {
    const ctx = createMockCtx();
    const props = snowfieldLayerType.createDefault();
    snowfieldLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("render works with zero sparkle", () => {
    const ctx = createMockCtx();
    const props = { ...snowfieldLayerType.createDefault(), sparkleIntensity: 0 };
    expect(() => snowfieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with high sparkle", () => {
    const ctx = createMockCtx();
    const props = { ...snowfieldLayerType.createDefault(), sparkleIntensity: 1.0 };
    expect(() => snowfieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with zero drift", () => {
    const ctx = createMockCtx();
    const props = { ...snowfieldLayerType.createDefault(), driftIntensity: 0 };
    expect(() => snowfieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with full drift", () => {
    const ctx = createMockCtx();
    const props = { ...snowfieldLayerType.createDefault(), driftIntensity: 1.0 };
    expect(() => snowfieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render handles coverageTop > coverageBottom gracefully", () => {
    const ctx = createMockCtx();
    const props = { ...snowfieldLayerType.createDefault(), coverageTop: 0.9, coverageBottom: 0.3 };
    expect(() => snowfieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with full coverage", () => {
    const ctx = createMockCtx();
    const props = { ...snowfieldLayerType.createDefault(), coverageTop: 0, coverageBottom: 1.0 };
    expect(() => snowfieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...snowfieldLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => snowfieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...snowfieldLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => snowfieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with all snowfield presets", () => {
    for (const preset of SNOWFIELD_PRESETS) {
      const ctx = createMockCtx();
      const props = { ...snowfieldLayerType.createDefault(), preset: preset.id };
      expect(() => snowfieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("validate passes for valid preset", () => {
    expect(snowfieldLayerType.validate({ preset: "wind-swept" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = snowfieldLayerType.validate({ preset: "ice-sheet" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("ice-sheet");
  });

  it("validate passes with no preset", () => {
    expect(snowfieldLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 4 snowfield presets", () => {
      expect(SNOWFIELD_PRESETS).toHaveLength(4);
    });

    it("all presets have category 'snowfield'", () => {
      for (const p of SNOWFIELD_PRESETS) {
        expect(p.category).toBe("snowfield");
      }
    });

    it("all presets have required fields", () => {
      for (const p of SNOWFIELD_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(p.snowColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.shadowColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.driftIntensity).toBeGreaterThanOrEqual(0);
        expect(p.driftIntensity).toBeLessThanOrEqual(1);
        expect(p.sparkleIntensity).toBeGreaterThanOrEqual(0);
        expect(p.sparkleIntensity).toBeLessThanOrEqual(1);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = SNOWFIELD_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
