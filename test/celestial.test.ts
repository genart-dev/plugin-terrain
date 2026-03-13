import { describe, it, expect, vi } from "vitest";
import { celestialLayerType } from "../src/layers/celestial.js";
import { CELESTIAL_PRESETS } from "../src/presets/celestial.js";

vi.stubGlobal("OffscreenCanvas", class {
  width: number;
  height: number;
  constructor(w: number, h: number) { this.width = w; this.height = h; }
  getContext() {
    return {
      putImageData: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillStyle: "",
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    };
  }
});

function createMockCtx() {
  return {
    fillRect: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
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

describe("terrain:celestial", () => {
  it("has correct typeId", () => {
    expect(celestialLayerType.typeId).toBe("terrain:celestial");
  });

  it("has correct displayName", () => {
    expect(celestialLayerType.displayName).toBe("Celestial Body");
  });

  it("has correct category", () => {
    expect(celestialLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = celestialLayerType.createDefault();
    expect(defaults.preset).toBe("noon-sun");
    expect(defaults.bodyType).toBe("sun");
    expect(defaults.elevation).toBe(0.85);
    expect(defaults.azimuth).toBe(0.5);
    expect(defaults.size).toBe(0.04);
    expect(defaults.glowRadius).toBe(0.15);
    expect(defaults.glowColor).toBe("#FFFDE0");
    expect(defaults.bodyColor).toBe("#FFFFFF");
    expect(defaults.lightPathEnabled).toBe(false);
  });

  it("createDefault includes depthLane property", () => {
    const defaults = celestialLayerType.createDefault();
    expect(defaults.depthLane).toBe("sky");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = celestialLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes bodyType select", () => {
    const bodyProp = celestialLayerType.properties.find((p) => p.key === "bodyType");
    expect(bodyProp).toBeTruthy();
    expect(bodyProp!.type).toBe("select");
  });

  it("properties schema includes lightPathEnabled boolean", () => {
    const lightProp = celestialLayerType.properties.find((p) => p.key === "lightPathEnabled");
    expect(lightProp).toBeTruthy();
    expect(lightProp!.type).toBe("boolean");
  });

  it("properties schema includes depthLane select", () => {
    const depthProp = celestialLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthProp).toBeTruthy();
    expect(depthProp!.type).toBe("select");
    expect(depthProp!.default).toBe("sky");
  });

  it("render draws sun body", () => {
    const ctx = createMockCtx();
    const props = celestialLayerType.createDefault();
    celestialLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.createRadialGradient).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("render works with all body types", () => {
    const types = ["sun", "moon", "star"];
    for (const bodyType of types) {
      const ctx = createMockCtx();
      const props = { ...celestialLayerType.createDefault(), bodyType };
      expect(() => celestialLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render works with light path enabled", () => {
    const ctx = createMockCtx();
    const props = { ...celestialLayerType.createDefault(), lightPathEnabled: true, elevation: 0.3 };
    expect(() => celestialLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("render works with light path disabled", () => {
    const ctx = createMockCtx();
    const props = { ...celestialLayerType.createDefault(), lightPathEnabled: false };
    expect(() => celestialLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with zero glow radius", () => {
    const ctx = createMockCtx();
    const props = { ...celestialLayerType.createDefault(), glowRadius: 0 };
    expect(() => celestialLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with large glow radius", () => {
    const ctx = createMockCtx();
    const props = { ...celestialLayerType.createDefault(), glowRadius: 0.5 };
    expect(() => celestialLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with low elevation (near bottom)", () => {
    const ctx = createMockCtx();
    const props = { ...celestialLayerType.createDefault(), elevation: 0.05 };
    expect(() => celestialLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...celestialLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => celestialLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...celestialLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => celestialLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with all celestial presets", () => {
    for (const preset of CELESTIAL_PRESETS) {
      const ctx = createMockCtx();
      const props = { ...celestialLayerType.createDefault(), preset: preset.id };
      expect(() => celestialLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("validate passes for valid preset", () => {
    expect(celestialLayerType.validate({ preset: "harvest-moon" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = celestialLayerType.validate({ preset: "supernova" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("supernova");
  });

  it("validate passes with no preset", () => {
    expect(celestialLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 6 celestial presets", () => {
      expect(CELESTIAL_PRESETS).toHaveLength(6);
    });

    it("all presets have category 'celestial'", () => {
      for (const p of CELESTIAL_PRESETS) {
        expect(p.category).toBe("celestial");
      }
    });

    it("all presets have required fields", () => {
      for (const p of CELESTIAL_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(p.glowColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.bodyColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.lightPathColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.size).toBeGreaterThan(0);
        expect(p.elevation).toBeGreaterThanOrEqual(0);
        expect(p.elevation).toBeLessThanOrEqual(1);
        expect(["sun", "moon", "star"]).toContain(p.bodyType);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = CELESTIAL_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
