import { describe, it, expect } from "vitest";
import { ALL_PRESETS, getPreset, filterPresets, searchPresets } from "../src/presets/index.js";

describe("presets", () => {
  it("has 116 total presets", () => {
    expect(ALL_PRESETS.length).toBe(116);
  });

  it("has 5 sky presets", () => {
    expect(filterPresets({ category: "sky" })).toHaveLength(5);
  });

  it("has 6 profile presets", () => {
    expect(filterPresets({ category: "profile" })).toHaveLength(6);
  });

  it("has 5 cloud presets", () => {
    expect(filterPresets({ category: "clouds" })).toHaveLength(5);
  });

  it("has 5 water presets", () => {
    expect(filterPresets({ category: "water" })).toHaveLength(5);
  });

  it("has 8 river presets", () => {
    expect(filterPresets({ category: "river" })).toHaveLength(8);
  });

  it("has 8 path presets", () => {
    expect(filterPresets({ category: "path" })).toHaveLength(8);
  });

  it("has 6 shore presets", () => {
    expect(filterPresets({ category: "shore" })).toHaveLength(6);
  });

  it("has 8 field presets", () => {
    expect(filterPresets({ category: "field" })).toHaveLength(8);
  });

  it("has 6 rock presets", () => {
    expect(filterPresets({ category: "rock" })).toHaveLength(6);
  });

  it("has 6 treeline presets", () => {
    expect(filterPresets({ category: "treeline" })).toHaveLength(6);
  });

  it("has 6 celestial presets", () => {
    expect(filterPresets({ category: "celestial" })).toHaveLength(6);
  });

  it("has 5 fog presets", () => {
    expect(filterPresets({ category: "fog" })).toHaveLength(5);
  });

  it("has 5 starfield presets", () => {
    expect(filterPresets({ category: "starfield" })).toHaveLength(5);
  });

  it("has 5 cliff-face presets", () => {
    expect(filterPresets({ category: "cliff-face" })).toHaveLength(5);
  });

  it("has 4 snowfield presets", () => {
    expect(filterPresets({ category: "snowfield" })).toHaveLength(4);
  });

  it("has 6 building presets", () => {
    expect(filterPresets({ category: "building" })).toHaveLength(6);
  });

  it("has 4 bridge presets", () => {
    expect(filterPresets({ category: "bridge" })).toHaveLength(4);
  });

  it("has 4 reflection presets", () => {
    expect(filterPresets({ category: "reflection" })).toHaveLength(4);
  });

  it("has 5 vignette-foliage presets", () => {
    expect(filterPresets({ category: "vignette-foliage" })).toHaveLength(5);
  });

  it("has 5 forest-floor presets", () => {
    expect(filterPresets({ category: "forest-floor" })).toHaveLength(5);
  });

  it("has 4 haze presets", () => {
    expect(filterPresets({ category: "haze" })).toHaveLength(4);
  });

  it("all presets have unique IDs", () => {
    const ids = ALL_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all presets have required fields", () => {
    for (const p of ALL_PRESETS) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.tags.length).toBeGreaterThan(0);
      expect(["sky", "profile", "clouds", "water", "river", "path", "shore", "field", "rock", "treeline", "celestial", "fog", "starfield", "cliff-face", "snowfield", "building", "bridge", "reflection", "vignette-foliage", "forest-floor", "haze"]).toContain(p.category);
    }
  });

  it("getPreset returns correct preset", () => {
    const dawn = getPreset("dawn");
    expect(dawn).toBeDefined();
    expect(dawn!.name).toBe("Dawn");
    expect(dawn!.category).toBe("sky");
  });

  it("getPreset returns undefined for unknown ID", () => {
    expect(getPreset("nonexistent")).toBeUndefined();
  });

  it("filterPresets by category", () => {
    const skyPresets = filterPresets({ category: "sky" });
    expect(skyPresets.every((p) => p.category === "sky")).toBe(true);
  });

  it("filterPresets by tags", () => {
    const warmPresets = filterPresets({ tags: ["warm"] });
    expect(warmPresets.length).toBeGreaterThan(0);
    expect(warmPresets.every((p) => p.tags.includes("warm"))).toBe(true);
  });

  it("searchPresets by name", () => {
    const results = searchPresets("alpine");
    expect(results.length).toBe(1);
    expect(results[0]!.id).toBe("alpine-range");
  });

  it("searchPresets by description keyword", () => {
    const results = searchPresets("cumulus");
    expect(results.length).toBeGreaterThan(0);
  });

  it("searchPresets case-insensitive", () => {
    expect(searchPresets("DAWN")).toHaveLength(1);
  });
});
