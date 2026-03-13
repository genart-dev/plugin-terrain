import { describe, it, expect, vi } from "vitest";
import { cloudsLayerType } from "../src/layers/clouds.js";

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
    createImageData: vi.fn((w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    })),
    putImageData: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

const BOUNDS = { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1 };

describe("terrain:clouds", () => {
  it("has correct typeId", () => {
    expect(cloudsLayerType.typeId).toBe("terrain:clouds");
  });

  it("createDefault returns valid properties", () => {
    const defaults = cloudsLayerType.createDefault();
    expect(defaults.preset).toBe("fair-weather");
    expect(defaults.cloudType).toBe("cumulus");
    expect(defaults.coverage).toBe(0.3);
  });

  it("render creates imageData and draws it", () => {
    const ctx = createMockCtx();
    const props = cloudsLayerType.createDefault();

    // OffscreenCanvas may not exist in test env — skip render test if so
    if (typeof OffscreenCanvas === "undefined") {
      return; // Skip in non-browser environments
    }

    cloudsLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.createImageData).toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it("validate passes for valid preset", () => {
    expect(cloudsLayerType.validate({ preset: "overcast" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = cloudsLayerType.validate({ preset: "tornado" });
    expect(errors).toHaveLength(1);
  });

  it("properties include all expected schemas", () => {
    const keys = cloudsLayerType.properties.map((p) => p.key);
    expect(keys).toContain("coverage");
    expect(keys).toContain("cloudType");
    expect(keys).toContain("altitudeMin");
    expect(keys).toContain("cloudColor");
    expect(keys).toContain("softness");
  });

  it("createDefault includes depthLane property", () => {
    const defaults = cloudsLayerType.createDefault();
    expect(defaults.depthLane).toBe("overlay");
  });

  it("properties schema includes depthLane select", () => {
    const depthLaneProp = cloudsLayerType.properties.find((p) => p.key === "depthLane");
    expect(depthLaneProp).toBeTruthy();
    expect(depthLaneProp!.type).toBe("select");
    expect(depthLaneProp!.default).toBe("overlay");
  });
});
