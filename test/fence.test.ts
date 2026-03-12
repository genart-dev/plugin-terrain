import { describe, it, expect, vi } from "vitest";
import { fenceLayerType } from "../src/layers/fence.js";
import { FENCE_PRESETS } from "../src/presets/fence.js";

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

describe("terrain:fence", () => {
  it("has correct typeId", () => {
    expect(fenceLayerType.typeId).toBe("terrain:fence");
  });

  it("has correct displayName", () => {
    expect(fenceLayerType.displayName).toBe("Fence");
  });

  it("has correct category", () => {
    expect(fenceLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = fenceLayerType.createDefault();
    expect(defaults.preset).toBe("white-picket");
    expect(defaults.fenceStyle).toBe("picket");
    expect(defaults.color).toBe("#FFFFFF");
    expect(defaults.postColor).toBe("#E0E0E0");
    expect(defaults.height).toBe(0.06);
    expect(defaults.yPosition).toBe(0.7);
    expect(defaults.spacing).toBe(0.03);
    expect(defaults.sag).toBe(0.3);
  });

  it("createDefault includes depthLane property", () => {
    const defaults = fenceLayerType.createDefault();
    expect(defaults.depthLane).toBe("foreground");
  });

  it("createDefault includes atmosphericMode property", () => {
    const defaults = fenceLayerType.createDefault();
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("properties schema includes fenceStyle select", () => {
    const prop = fenceLayerType.properties.find((p) => p.key === "fenceStyle");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("select");
  });

  it("properties schema includes height number", () => {
    const prop = fenceLayerType.properties.find((p) => p.key === "height");
    expect(prop).toBeTruthy();
    expect(prop!.type).toBe("number");
  });

  it("properties schema includes depthLane select", () => {
    const depthProp = fenceLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthProp).toBeTruthy();
    expect(depthProp!.type).toBe("select");
    expect(depthProp!.default).toBe("foreground");
  });

  it("render draws fence", () => {
    const ctx = createMockCtx();
    const props = fenceLayerType.createDefault();
    fenceLayerType.render(props, ctx, BOUNDS, {} as any);

    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("render works with all fence styles", () => {
    const styles = ["picket", "stone-wall", "rail", "wire"];
    for (const style of styles) {
      const ctx = createMockCtx();
      const props = { ...fenceLayerType.createDefault(), fenceStyle: style };
      expect(() => fenceLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("render draws picket fence with pointed tops", () => {
    const ctx = createMockCtx();
    const props = { ...fenceLayerType.createDefault(), fenceStyle: "picket" };
    fenceLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("render draws stone wall with mortar lines", () => {
    const ctx = createMockCtx();
    const props = { ...fenceLayerType.createDefault(), fenceStyle: "stone-wall" };
    fenceLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("render draws rail fence with sagging rails", () => {
    const ctx = createMockCtx();
    const props = { ...fenceLayerType.createDefault(), fenceStyle: "rail", sag: 0.5 };
    fenceLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
  });

  it("render draws wire fence with catenary wires", () => {
    const ctx = createMockCtx();
    const props = { ...fenceLayerType.createDefault(), fenceStyle: "wire", sag: 0.5 };
    fenceLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
  });

  it("render works with tall fence", () => {
    const ctx = createMockCtx();
    const props = { ...fenceLayerType.createDefault(), height: 0.15 };
    expect(() => fenceLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with short fence", () => {
    const ctx = createMockCtx();
    const props = { ...fenceLayerType.createDefault(), height: 0.02 };
    expect(() => fenceLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'western'", () => {
    const ctx = createMockCtx();
    const props = { ...fenceLayerType.createDefault(), atmosphericMode: "western" };
    expect(() => fenceLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with atmospheric mode 'ink-wash'", () => {
    const ctx = createMockCtx();
    const props = { ...fenceLayerType.createDefault(), atmosphericMode: "ink-wash" };
    expect(() => fenceLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render works with all fence presets", () => {
    for (const preset of FENCE_PRESETS) {
      const ctx = createMockCtx();
      const props = { ...fenceLayerType.createDefault(), preset: preset.id };
      expect(() => fenceLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
    }
  });

  it("validate passes for valid preset", () => {
    expect(fenceLayerType.validate({ preset: "ranch-rail" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = fenceLayerType.validate({ preset: "barbed-wire" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.message).toContain("barbed-wire");
  });

  it("validate passes with no preset", () => {
    expect(fenceLayerType.validate({})).toBeNull();
  });

  describe("presets", () => {
    it("has 4 fence presets", () => {
      expect(FENCE_PRESETS).toHaveLength(4);
    });

    it("all presets have category 'fence'", () => {
      for (const p of FENCE_PRESETS) {
        expect(p.category).toBe("fence");
      }
    });

    it("all presets have required fields", () => {
      for (const p of FENCE_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.tags.length).toBeGreaterThan(0);
        expect(["picket", "stone-wall", "rail", "wire"]).toContain(p.fenceStyle);
        expect(p.height).toBeGreaterThan(0);
        expect(p.spacing).toBeGreaterThan(0);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = FENCE_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
