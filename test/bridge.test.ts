import { describe, it, expect, vi } from "vitest";
import { bridgeLayerType } from "../src/layers/bridge.js";
import { BRIDGE_PRESETS } from "../src/presets/bridge.js";

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

describe("terrain:bridge", () => {
  it("has correct typeId", () => {
    expect(bridgeLayerType.typeId).toBe("terrain:bridge");
  });

  it("has correct displayName", () => {
    expect(bridgeLayerType.displayName).toBe("Bridge");
  });

  it("has correct category", () => {
    expect(bridgeLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = bridgeLayerType.createDefault();
    expect(defaults.preset).toBe("stone-arch");
    expect(defaults.bridgeStyle).toBe("arch");
    expect(defaults.color).toBe("#6A6060");
    expect(defaults.deckColor).toBe("#8A7A70");
    expect(defaults.span).toBe(0.4);
    expect(defaults.xPosition).toBe(0.5);
    expect(defaults.yPosition).toBe(0.6);
    expect(defaults.archHeight).toBe(0.08);
    expect(defaults.railingHeight).toBe(0.02);
  });

  it("createDefault includes depthLane property", () => {
    const defaults = bridgeLayerType.createDefault();
    expect(defaults.depthLane).toBe("midground");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = bridgeLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes bridgeStyle select", () => {
    const prop = bridgeLayerType.properties.find((p) => p.key === "bridgeStyle");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("select");
  });

  it("properties schema includes span number", () => {
    const prop = bridgeLayerType.properties.find((p) => p.key === "span");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("number");
  });

  it("properties schema includes depthLane select", () => {
    const depthProp = bridgeLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthProp).toBeTruthy();
    expect(depthProp!.type).toBe("select");
    expect(depthProp!.default).toBe("midground");
  });

  it("render draws bridge", () => {
    const ctx = createMockCtx();
    const props = bridgeLayerType.createDefault();
    bridgeLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("render works with all bridge styles", () => {
    const styles = ["arch", "suspension", "footbridge", "flat"];
    for (const style of styles) {
      const ctx = createMockCtx();
      const props = { ...bridgeLayerType.createDefault(), bridgeStyle: style };
      expect(() => bridgeLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render draws arch bridge with quadratic curve", () => {
    const ctx = createMockCtx();
    const props = { ...bridgeLayerType.createDefault(), bridgeStyle: "arch" };
    bridgeLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
  });

  it("render draws suspension bridge with cables", () => {
    const ctx = createMockCtx();
    const props = { ...bridgeLayerType.createDefault(), bridgeStyle: "suspension" };
    bridgeLayerType.render(props, ctx, BOUNDS, {} as any);
    // Cables use quadraticCurveTo
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("render draws footbridge with railings", () => {
    const ctx = createMockCtx();
    const props = { ...bridgeLayerType.createDefault(), bridgeStyle: "footbridge", railingHeight: 0.03 };
    bridgeLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("render works with footbridge without railings", () => {
    const ctx = createMockCtx();
    const props = { ...bridgeLayerType.createDefault(), bridgeStyle: "footbridge", railingHeight: 0 };
    expect(() => bridgeLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with wide span", () => {
    const ctx = createMockCtx();
    const props = { ...bridgeLayerType.createDefault(), span: 0.8 };
    expect(() => bridgeLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with narrow span", () => {
    const ctx = createMockCtx();
    const props = { ...bridgeLayerType.createDefault(), span: 0.15 };
    expect(() => bridgeLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with tall arch", () => {
    const ctx = createMockCtx();
    const props = { ...bridgeLayerType.createDefault(), archHeight: 0.2 };
    expect(() => bridgeLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...bridgeLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => bridgeLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...bridgeLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => bridgeLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with all bridge presets", () => {
    for (const preset of BRIDGE_PRESETS) {
      const ctx = createMockCtx();
      const props = { ...bridgeLayerType.createDefault(), preset: preset.id };
      expect(() => bridgeLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("validate passes for valid preset", () => {
    expect(bridgeLayerType.validate({ preset: "wooden-footbridge" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = bridgeLayerType.validate({ preset: "drawbridge" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("drawbridge");
  });

  it("validate passes with no preset", () => {
    expect(bridgeLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 4 bridge presets", () => {
      expect(BRIDGE_PRESETS).toHaveLength(4);
    });

    it("all presets have category 'bridge'", () => {
      for (const p of BRIDGE_PRESETS) {
        expect(p.category).toBe("bridge");
      }
    });

    it("all presets have required fields", () => {
      for (const p of BRIDGE_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.deckColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.span).toBeGreaterThan(0);
        expect(["arch", "suspension", "footbridge", "flat"]).toContain(p.bridgeStyle);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = BRIDGE_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
