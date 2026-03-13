import { describe, it, expect, vi } from "vitest";
import { fogLayerType } from "../src/layers/fog.js";
import { FOG_PRESETS } from "../src/presets/fog.js";

vi.stubGlobal("OffscreenCanvas", class {
  width: number;
  height: number;
  constructor(w: number, h: number) { this.width = w; this.height = h; }
  getContext() {
    return { putImageData: vi.fn() };
  }
});

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
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createImageData: vi.fn((w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    })),
    putImageData: vi.fn(),
    drawImage: vi.fn(),
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

describe("terrain:fog-layer", () => {
  it("has correct typeId", () => {
    expect(fogLayerType.typeId).toBe("terrain:fog-layer");
  });

  it("has correct displayName", () => {
    expect(fogLayerType.displayName).toBe("Fog Layer");
  });

  it("has correct category", () => {
    expect(fogLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = fogLayerType.createDefault();
    expect(defaults.preset).toBe("morning-mist");
    expect(defaults.fogType).toBe("ground");
    expect(defaults.opacity).toBe(0.4);
    expect(defaults.height).toBe(0.2);
    expect(defaults.yPosition).toBe(0.7);
    expect(defaults.color).toBe("#FFFFFF");
    expect(defaults.edgeSoftness).toBe(0.8);
    expect(defaults.wispDensity).toBe(0.3);
  });

  it("createDefault includes depthLane property", () => {
    const defaults = fogLayerType.createDefault();
    expect(defaults.depthLane).toBe("midground");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = fogLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes fogType select", () => {
    const fogProp = fogLayerType.properties.find((p) => p.key === "fogType");
    expect(fogProp).toBeTruthy();
    expect(fogProp!.type).toBe("select");
  });

  it("properties schema includes edgeSoftness number", () => {
    const edgeProp = fogLayerType.properties.find((p) => p.key === "edgeSoftness");
    expect(edgeProp).toBeTruthy();
    expect(edgeProp!.type).toBe("number");
  });

  it("properties schema includes depthLane select", () => {
    const depthProp = fogLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthProp).toBeTruthy();
    expect(depthProp!.type).toBe("select");
    expect(depthProp!.default).toBe("midground");
  });

  it("render draws fog band", () => {
    const ctx = createMockCtx();
    const props = fogLayerType.createDefault();
    fogLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.createImageData).toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it("render works with all fog types", () => {
    const types = ["band", "ground", "mountain", "veil"];
    for (const fogType of types) {
      const ctx = createMockCtx();
      const props = { ...fogLayerType.createDefault(), fogType };
      expect(() => fogLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render draws wisps when wispDensity > 0", () => {
    const ctx = createMockCtx();
    const props = { ...fogLayerType.createDefault(), wispDensity: 0.8 };
    fogLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.ellipse).toHaveBeenCalled();
  });

  it("render works with zero wisp density", () => {
    const ctx = createMockCtx();
    const props = { ...fogLayerType.createDefault(), wispDensity: 0 };
    expect(() => fogLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with full opacity", () => {
    const ctx = createMockCtx();
    const props = { ...fogLayerType.createDefault(), opacity: 1.0 };
    expect(() => fogLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with low opacity", () => {
    const ctx = createMockCtx();
    const props = { ...fogLayerType.createDefault(), opacity: 0.05 };
    expect(() => fogLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with zero edge softness", () => {
    const ctx = createMockCtx();
    const props = { ...fogLayerType.createDefault(), edgeSoftness: 0 };
    expect(() => fogLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with full edge softness", () => {
    const ctx = createMockCtx();
    const props = { ...fogLayerType.createDefault(), edgeSoftness: 1.0 };
    expect(() => fogLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works at top of canvas", () => {
    const ctx = createMockCtx();
    const props = { ...fogLayerType.createDefault(), yPosition: 0.0 };
    expect(() => fogLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works at bottom of canvas", () => {
    const ctx = createMockCtx();
    const props = { ...fogLayerType.createDefault(), yPosition: 1.0 };
    expect(() => fogLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...fogLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => fogLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...fogLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => fogLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with all fog presets", () => {
    for (const preset of FOG_PRESETS) {
      const ctx = createMockCtx();
      const props = { ...fogLayerType.createDefault(), preset: preset.id };
      expect(() => fogLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("validate passes for valid preset", () => {
    expect(fogLayerType.validate({ preset: "valley-fog" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = fogLayerType.validate({ preset: "toxic-smog" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("toxic-smog");
  });

  it("validate passes with no preset", () => {
    expect(fogLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 5 fog presets", () => {
      expect(FOG_PRESETS).toHaveLength(5);
    });

    it("all presets have category 'fog'", () => {
      for (const p of FOG_PRESETS) {
        expect(p.category).toBe("fog");
      }
    });

    it("all presets have required fields", () => {
      for (const p of FOG_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.opacity).toBeGreaterThan(0);
        expect(p.opacity).toBeLessThanOrEqual(1);
        expect(p.height).toBeGreaterThan(0);
        expect(["band", "ground", "mountain", "veil"]).toContain(p.fogType);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = FOG_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
