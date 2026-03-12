import { describe, it, expect } from "vitest";
import {
  parseDepthLaneSub,
  resolveDepthLane,
  depthForLane,
  applyAtmosphericDepth,
  laneSubLevelAttenuation,
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  DEPTH_LANE_ORDER,
  DEPTH_LANE_OPTIONS,
} from "../src/shared/depth-lanes.js";
import type {
  DepthLane,
  DepthLaneSub,
  AtmosphericMode,
} from "../src/shared/depth-lanes.js";
import { parseHex } from "../src/shared/color-utils.js";

// ---------------------------------------------------------------------------
// parseDepthLaneSub
// ---------------------------------------------------------------------------

describe("parseDepthLaneSub", () => {
  it("parses plain lane name with default sub-level 2", () => {
    const result = parseDepthLaneSub("background");
    expect(result).toEqual({ lane: "background", subLevel: 2 });
  });

  it("parses all 7 plain lane names", () => {
    for (const lane of DEPTH_LANE_ORDER) {
      const result = parseDepthLaneSub(lane);
      expect(result).not.toBeNull();
      expect(result!.lane).toBe(lane);
      expect(result!.subLevel).toBe(2);
    }
  });

  it("parses lane with sub-level 1", () => {
    expect(parseDepthLaneSub("background-1")).toEqual({ lane: "background", subLevel: 1 });
  });

  it("parses lane with sub-level 3", () => {
    expect(parseDepthLaneSub("foreground-3")).toEqual({ lane: "foreground", subLevel: 3 });
  });

  it("parses hyphenated lane names with sub-level", () => {
    expect(parseDepthLaneSub("far-background-1")).toEqual({ lane: "far-background", subLevel: 1 });
    expect(parseDepthLaneSub("ground-plane-3")).toEqual({ lane: "ground-plane", subLevel: 3 });
  });

  it("returns null for invalid lane name", () => {
    expect(parseDepthLaneSub("invalid")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseDepthLaneSub("")).toBeNull();
  });

  it("returns null for invalid sub-level number", () => {
    expect(parseDepthLaneSub("background-4")).toBeNull();
    expect(parseDepthLaneSub("background-0")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveDepthLane
// ---------------------------------------------------------------------------

describe("resolveDepthLane", () => {
  it("resolves plain lane with correct depth range", () => {
    const config = resolveDepthLane("background");
    expect(config).not.toBeNull();
    expect(config!.lane).toBe("background");
    expect(config!.subLevel).toBe(2);
    expect(config!.depthMin).toBe(0.2);
    expect(config!.depthMax).toBe(0.4);
    // Sub-level 2 = middle → depth = 0.2 + 0.2 * 0.5 = 0.3
    expect(config!.depth).toBeCloseTo(0.3);
  });

  it("resolves sub-level 1 (back of lane)", () => {
    const config = resolveDepthLane("background-1");
    expect(config!.subLevel).toBe(1);
    // Sub-level 1 = back → depth = 0.2 + 0.2 * 0.0 = 0.2
    expect(config!.depth).toBeCloseTo(0.2);
  });

  it("resolves sub-level 3 (front of lane)", () => {
    const config = resolveDepthLane("background-3");
    expect(config!.subLevel).toBe(3);
    // Sub-level 3 = front → depth = 0.2 + 0.2 * 1.0 = 0.4
    expect(config!.depth).toBeCloseTo(0.4);
  });

  it("sky lane has depth 0", () => {
    const config = resolveDepthLane("sky");
    expect(config!.depthMin).toBe(0);
    expect(config!.depthMax).toBe(0);
    expect(config!.depth).toBe(0);
  });

  it("foreground lane has correct range", () => {
    const config = resolveDepthLane("foreground");
    expect(config!.depthMin).toBe(0.6);
    expect(config!.depthMax).toBe(0.85);
  });

  it("ground-plane lane has correct range", () => {
    const config = resolveDepthLane("ground-plane");
    expect(config!.depthMin).toBe(0.85);
    expect(config!.depthMax).toBe(1.0);
  });

  it("overlay lane spans full range", () => {
    const config = resolveDepthLane("overlay");
    expect(config!.depthMin).toBe(0);
    expect(config!.depthMax).toBe(1);
  });

  it("returns null for invalid input", () => {
    expect(resolveDepthLane("not-a-lane")).toBeNull();
  });

  it("depth increases from far-background to ground-plane", () => {
    const depths = ["far-background", "background", "midground", "foreground", "ground-plane"]
      .map((lane) => resolveDepthLane(lane)!.depth);
    for (let i = 1; i < depths.length; i++) {
      expect(depths[i]).toBeGreaterThan(depths[i - 1]!);
    }
  });
});

// ---------------------------------------------------------------------------
// depthForLane
// ---------------------------------------------------------------------------

describe("depthForLane", () => {
  it("returns correct depth for valid lane", () => {
    expect(depthForLane("midground")).toBeCloseTo(0.5);
  });

  it("returns 0.5 (midground default) for invalid lane", () => {
    expect(depthForLane("not-valid")).toBe(0.5);
  });

  it("returns 0 for sky", () => {
    expect(depthForLane("sky")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// laneSubLevelAttenuation
// ---------------------------------------------------------------------------

describe("laneSubLevelAttenuation", () => {
  it("sub-level 1 has smallest scale and lowest opacity", () => {
    const att = laneSubLevelAttenuation(1);
    expect(att.sizeScale).toBe(0.85);
    expect(att.opacity).toBe(0.7);
    expect(att.saturationShift).toBe(-15);
  });

  it("sub-level 2 has neutral values", () => {
    const att = laneSubLevelAttenuation(2);
    expect(att.sizeScale).toBe(1.0);
    expect(att.opacity).toBe(0.85);
    expect(att.saturationShift).toBe(0);
  });

  it("sub-level 3 has largest scale and full opacity", () => {
    const att = laneSubLevelAttenuation(3);
    expect(att.sizeScale).toBe(1.15);
    expect(att.opacity).toBe(1.0);
    expect(att.saturationShift).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// applyAtmosphericDepth
// ---------------------------------------------------------------------------

describe("applyAtmosphericDepth", () => {
  const green = "#3B5E3B";

  it("mode 'none' returns color unchanged", () => {
    expect(applyAtmosphericDepth(green, 0, "none")).toBe(green);
    expect(applyAtmosphericDepth(green, 0.5, "none")).toBe(green);
    expect(applyAtmosphericDepth(green, 1.0, "none")).toBe(green);
  });

  it("depth 1 (nearest) returns color nearly unchanged for western", () => {
    const result = applyAtmosphericDepth(green, 1.0, "western");
    // At depth=1, effect=0 so color should be unchanged
    const [r, g, b] = parseHex(result);
    const [or, og, ob] = parseHex(green);
    // Allow tiny rounding differences
    expect(Math.abs(r - or)).toBeLessThanOrEqual(1);
    expect(Math.abs(g - og)).toBeLessThanOrEqual(1);
    expect(Math.abs(b - ob)).toBeLessThanOrEqual(1);
  });

  it("depth 0 (farthest) shifts color toward haze for western", () => {
    const result = applyAtmosphericDepth(green, 0, "western");
    const [r, g, b] = parseHex(result);
    const [or, og, ob] = parseHex(green);
    // Should be lighter (higher values)
    expect(r + g + b).toBeGreaterThan(or + og + ob);
  });

  it("depth 0 (farthest) shifts color toward paper for ink-wash", () => {
    const result = applyAtmosphericDepth(green, 0, "ink-wash");
    const [r, g, b] = parseHex(result);
    const [or, og, ob] = parseHex(green);
    // Should be lighter
    expect(r + g + b).toBeGreaterThan(or + og + ob);
  });

  it("western mode desaturates at distance", () => {
    const saturated = "#FF0000"; // pure red
    const result = applyAtmosphericDepth(saturated, 0, "western");
    const [r, g, b] = parseHex(result);
    // Desaturated red should have g and b closer to r
    expect(g).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(0);
  });

  it("ink-wash mode desaturates more strongly than western", () => {
    const saturated = "#FF0000";
    const western = applyAtmosphericDepth(saturated, 0, "western");
    const inkWash = applyAtmosphericDepth(saturated, 0, "ink-wash");
    const [wr, wg, wb] = parseHex(western);
    const [ir, ig, ib] = parseHex(inkWash);
    // Ink-wash should desaturate more (g+b closer to r)
    const westernSpread = wr - (wg + wb) / 2;
    const inkWashSpread = ir - (ig + ib) / 2;
    expect(inkWashSpread).toBeLessThan(westernSpread);
  });

  it("custom haze color is used when provided", () => {
    const resultDefault = applyAtmosphericDepth(green, 0, "western");
    const resultCustom = applyAtmosphericDepth(green, 0, "western", "#FF0000");
    // Different haze colors should produce different results
    expect(resultDefault).not.toBe(resultCustom);
  });

  it("clamps depth to [0, 1]", () => {
    // Should not throw for out-of-range values
    const below = applyAtmosphericDepth(green, -0.5, "western");
    const above = applyAtmosphericDepth(green, 1.5, "western");
    expect(below).toBeTruthy();
    expect(above).toBeTruthy();
    // depth -0.5 clamped to 0 should match depth 0
    expect(below).toBe(applyAtmosphericDepth(green, 0, "western"));
    // depth 1.5 clamped to 1 should match depth 1
    expect(above).toBe(applyAtmosphericDepth(green, 1, "western"));
  });

  it("intermediate depth produces intermediate result", () => {
    const far = applyAtmosphericDepth(green, 0, "western");
    const mid = applyAtmosphericDepth(green, 0.5, "western");
    const near = applyAtmosphericDepth(green, 1.0, "western");
    const [fr, fg, fb] = parseHex(far);
    const [mr, mg, mb] = parseHex(mid);
    const [nr, ng, nb] = parseHex(near);
    const farBright = fr + fg + fb;
    const midBright = mr + mg + mb;
    const nearBright = nr + ng + nb;
    // Far should be brightest (most haze), near darkest (original)
    expect(farBright).toBeGreaterThan(midBright);
    expect(midBright).toBeGreaterThanOrEqual(nearBright);
  });
});

// ---------------------------------------------------------------------------
// createDepthLaneProperty / createAtmosphericModeProperty
// ---------------------------------------------------------------------------

describe("createDepthLaneProperty", () => {
  it("returns a select property with correct key", () => {
    const prop = createDepthLaneProperty("background");
    expect(prop.key).toBe("depthLane");
    expect(prop.type).toBe("select");
    expect(prop.default).toBe("background");
    expect(prop.group).toBe("depth");
  });

  it("includes all lane options", () => {
    const prop = createDepthLaneProperty("midground");
    expect(prop.options.length).toBe(DEPTH_LANE_OPTIONS.length);
    expect(prop.options.find((o) => o.value === "sky")).toBeTruthy();
    expect(prop.options.find((o) => o.value === "ground-plane-3")).toBeTruthy();
  });
});

describe("createAtmosphericModeProperty", () => {
  it("returns a select property with 3 options", () => {
    const prop = createAtmosphericModeProperty();
    expect(prop.key).toBe("atmosphericMode");
    expect(prop.type).toBe("select");
    expect(prop.default).toBe("none");
    expect(prop.options).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// DEPTH_LANE_ORDER
// ---------------------------------------------------------------------------

describe("DEPTH_LANE_ORDER", () => {
  it("has 7 lanes", () => {
    expect(DEPTH_LANE_ORDER).toHaveLength(7);
  });

  it("starts with sky and ends with overlay", () => {
    expect(DEPTH_LANE_ORDER[0]).toBe("sky");
    expect(DEPTH_LANE_ORDER[6]).toBe("overlay");
  });
});
