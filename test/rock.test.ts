import { describe, it, expect, vi } from "vitest";
import { rockLayerType } from "../src/layers/rock.js";
import { ROCK_PRESETS } from "../src/presets/rock.js";

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
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    clip: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

const BOUNDS = { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1 };

describe("terrain:rock", () => {
  it("has correct typeId", () => {
    expect(rockLayerType.typeId).toBe("terrain:rock");
  });

  it("has correct displayName", () => {
    expect(rockLayerType.displayName).toBe("Rock");
  });

  it("has correct category", () => {
    expect(rockLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = rockLayerType.createDefault();
    expect(defaults.preset).toBe("granite-boulder");
    expect(defaults.color).toBe("#8A8A8A");
    expect(defaults.shadowColor).toBe("#4A4A4A");
    expect(defaults.rockType).toBe("boulder");
    expect(defaults.textureMode).toBe("speckled");
    expect(defaults.scale).toBe(1.0);
    expect(defaults.roughness).toBe(0.5);
    expect(defaults.crackDensity).toBe(0.3);
  });

  it("createDefault includes depthLane property", () => {
    const defaults = rockLayerType.createDefault();
    expect(defaults.depthLane).toBe("foreground");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = rockLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes rockType select", () => {
    const rockProp = rockLayerType.properties.find((p) => p.key === "rockType");
    expect(rockProp).toBeTruthy();
    expect(rockProp!.type).toBe("select");
  });

  it("properties schema includes textureMode select", () => {
    const texProp = rockLayerType.properties.find((p) => p.key === "textureMode");
    expect(texProp).toBeTruthy();
    expect(texProp!.type).toBe("select");
  });

  it("properties schema includes depthLane select", () => {
    const depthProp = rockLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthProp).toBeTruthy();
    expect(depthProp!.type).toBe("select");
    expect(depthProp!.default).toBe("foreground");
  });

  it("render draws rock body", () => {
    const ctx = createMockCtx();
    const props = rockLayerType.createDefault();
    rockLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.closePath).toHaveBeenCalled();
  });

  it("render works with all rock types", () => {
    const types = ["boulder", "outcrop", "pinnacle", "shelf"];
    for (const rt of types) {
      const ctx = createMockCtx();
      const props = { ...rockLayerType.createDefault(), rockType: rt };
      expect(() => rockLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render works with all texture modes", () => {
    const modes = ["speckled", "striated", "cun-fa", "cracked"];
    for (const mode of modes) {
      const ctx = createMockCtx();
      const props = { ...rockLayerType.createDefault(), textureMode: mode };
      expect(() => rockLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render works with cun-fa texture on pinnacle", () => {
    const ctx = createMockCtx();
    const props = { ...rockLayerType.createDefault(), textureMode: "cun-fa", rockType: "pinnacle" };
    expect(() => rockLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    // Cun-fa uses quadraticCurveTo for brush quality
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
  });

  it("render works with low roughness", () => {
    const ctx = createMockCtx();
    const props = { ...rockLayerType.createDefault(), roughness: 0 };
    expect(() => rockLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with high roughness", () => {
    const ctx = createMockCtx();
    const props = { ...rockLayerType.createDefault(), roughness: 1.0 };
    expect(() => rockLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with high crack density", () => {
    const ctx = createMockCtx();
    const props = { ...rockLayerType.createDefault(), crackDensity: 1.0, textureMode: "cracked" };
    expect(() => rockLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with small scale", () => {
    const ctx = createMockCtx();
    const props = { ...rockLayerType.createDefault(), scale: 0.3 };
    expect(() => rockLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with large scale", () => {
    const ctx = createMockCtx();
    const props = { ...rockLayerType.createDefault(), scale: 2.0 };
    expect(() => rockLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...rockLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => rockLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...rockLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => rockLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with all rock presets", () => {
    for (const preset of ROCK_PRESETS) {
      const ctx = createMockCtx();
      const props = { ...rockLayerType.createDefault(), preset: preset.id };
      expect(() => rockLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("validate passes for valid preset", () => {
    expect(rockLayerType.validate({ preset: "shan-shui-rock" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = rockLayerType.validate({ preset: "marble-statue" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("marble-statue");
  });

  it("validate passes with no preset", () => {
    expect(rockLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 6 rock presets", () => {
      expect(ROCK_PRESETS).toHaveLength(6);
    });

    it("all presets have category 'rock'", () => {
      for (const p of ROCK_PRESETS) {
        expect(p.category).toBe("rock");
      }
    });

    it("has shan-shui-rock with cun-fa texture", () => {
      const shanShui = ROCK_PRESETS.find((p) => p.id === "shan-shui-rock");
      expect(shanShui).toBeTruthy();
      expect(shanShui!.textureMode).toBe("cun-fa");
    });

    it("all presets have required fields", () => {
      for (const p of ROCK_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.shadowColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.scale).toBeGreaterThan(0);
        expect(p.roughness).toBeGreaterThanOrEqual(0);
        expect(p.roughness).toBeLessThanOrEqual(1);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = ROCK_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
