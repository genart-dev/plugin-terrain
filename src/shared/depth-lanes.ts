/**
 * Depth Lane System — convention-based depth slots for cross-plugin coordination.
 *
 * 7 named lanes from sky (farthest) to overlay (composited last), each with
 * sub-levels 1-3 for fine control. No format change required — depth lanes
 * are just layer properties.
 *
 * This module is copied into both plugin-terrain and plugin-particles
 * (same pattern as prng/noise).
 */

import { parseHex, toHex } from "./color-utils.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Named depth lanes from farthest to nearest. */
export type DepthLane =
  | "sky"
  | "far-background"
  | "background"
  | "midground"
  | "foreground"
  | "ground-plane"
  | "overlay";

/** Sub-level within a lane (1=back, 2=middle, 3=front). */
export type DepthSubLevel = 1 | 2 | 3;

/** Lane with optional sub-level suffix, e.g. "background-2". */
export type DepthLaneSub =
  | DepthLane
  | `${DepthLane}-1`
  | `${DepthLane}-2`
  | `${DepthLane}-3`;

/** Resolved depth lane configuration. */
export interface DepthLaneConfig {
  lane: DepthLane;
  subLevel: DepthSubLevel;
  /** Depth value at the back of this lane (0=farthest). */
  depthMin: number;
  /** Depth value at the front of this lane (1=nearest). */
  depthMax: number;
  /** Interpolated depth for this specific sub-level. */
  depth: number;
}

/** Atmospheric depth mode. */
export type AtmosphericMode = "western" | "ink-wash" | "none";

/** Sub-level attenuation values. */
export interface SubLevelAttenuation {
  sizeScale: number;
  opacity: number;
  saturationShift: number;
}

// ---------------------------------------------------------------------------
// Lane depth ranges
// ---------------------------------------------------------------------------

/** Ordered lane definitions with depth ranges. */
const LANE_RANGES: Record<DepthLane, { min: number; max: number }> = {
  "sky":             { min: 0.00, max: 0.00 },
  "far-background":  { min: 0.00, max: 0.20 },
  "background":      { min: 0.20, max: 0.40 },
  "midground":       { min: 0.40, max: 0.60 },
  "foreground":      { min: 0.60, max: 0.85 },
  "ground-plane":    { min: 0.85, max: 1.00 },
  "overlay":         { min: 0.00, max: 1.00 },
};

/** All valid lane names, ordered far to near. */
export const DEPTH_LANE_ORDER: DepthLane[] = [
  "sky",
  "far-background",
  "background",
  "midground",
  "foreground",
  "ground-plane",
  "overlay",
];

// ---------------------------------------------------------------------------
// Parsing & Resolution
// ---------------------------------------------------------------------------

/**
 * Parse a DepthLaneSub string into lane name and sub-level.
 * "background" → { lane: "background", subLevel: 2 }
 * "background-1" → { lane: "background", subLevel: 1 }
 */
export function parseDepthLaneSub(laneSub: string): { lane: DepthLane; subLevel: DepthSubLevel } | null {
  // Try matching with sub-level suffix first (e.g. "far-background-3")
  const subMatch = laneSub.match(/^(.+)-([123])$/);
  if (subMatch) {
    const lane = subMatch[1] as DepthLane;
    const sub = parseInt(subMatch[2]!, 10) as DepthSubLevel;
    if (LANE_RANGES[lane] !== undefined) {
      return { lane, subLevel: sub };
    }
  }

  // Try as plain lane name
  if (LANE_RANGES[laneSub as DepthLane] !== undefined) {
    return { lane: laneSub as DepthLane, subLevel: 2 };
  }

  return null;
}

/**
 * Resolve a DepthLaneSub string to a full DepthLaneConfig.
 * Returns null for invalid input.
 */
export function resolveDepthLane(laneSub: string): DepthLaneConfig | null {
  const parsed = parseDepthLaneSub(laneSub);
  if (!parsed) return null;

  const range = LANE_RANGES[parsed.lane]!;
  const span = range.max - range.min;

  // Sub-level interpolation within lane: 1=back (0.0), 2=middle (0.5), 3=front (1.0)
  const subT = (parsed.subLevel - 1) / 2;
  const depth = range.min + span * subT;

  return {
    lane: parsed.lane,
    subLevel: parsed.subLevel,
    depthMin: range.min,
    depthMax: range.max,
    depth,
  };
}

/**
 * Get the interpolated depth value (0=far, 1=near) for a lane+sub-level.
 * Returns 0.5 (midground default) for invalid input.
 */
export function depthForLane(laneSub: string): number {
  const config = resolveDepthLane(laneSub);
  return config?.depth ?? 0.5;
}

// ---------------------------------------------------------------------------
// Sub-Level Attenuation
// ---------------------------------------------------------------------------

/**
 * Get sub-level visual attenuation values.
 * Sub-1 (back): smaller, more transparent, less saturated.
 * Sub-3 (front): larger, fully opaque, slightly more saturated.
 */
export function laneSubLevelAttenuation(subLevel: DepthSubLevel): SubLevelAttenuation {
  switch (subLevel) {
    case 1: return { sizeScale: 0.85, opacity: 0.7, saturationShift: -15 };
    case 2: return { sizeScale: 1.0,  opacity: 0.85, saturationShift: 0 };
    case 3: return { sizeScale: 1.15, opacity: 1.0, saturationShift: 5 };
  }
}

// ---------------------------------------------------------------------------
// Color utilities for atmospheric depth
// ---------------------------------------------------------------------------

/** Convert RGB to HSL. Returns [h (0-360), s (0-100), l (0-100)]. */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l * 100];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return [h * 360, s * 100, l * 100];
}

/** Convert HSL to RGB. h in [0,360], s in [0,100], l in [0,100]. Returns [r,g,b] in [0,255]. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

// ---------------------------------------------------------------------------
// Atmospheric Depth
// ---------------------------------------------------------------------------

/** Default haze colors per mode. */
const DEFAULT_HAZE: Record<AtmosphericMode, string> = {
  "western":  "#B8C8D8",  // Cool blue-grey
  "ink-wash": "#E8DDD0",  // Warm paper tone
  "none":     "#FFFFFF",
};

/**
 * Apply atmospheric depth adjustment to a color.
 *
 * - depth 0 = farthest (maximum atmosphere effect)
 * - depth 1 = nearest (no effect)
 *
 * @param color - Hex color string (#RGB or #RRGGBB)
 * @param depth - Depth value 0..1 (0=far, 1=near)
 * @param mode - Atmospheric mode
 * @param hazeColor - Custom haze color (hex), or uses default per mode
 * @returns Adjusted hex color string
 */
export function applyAtmosphericDepth(
  color: string,
  depth: number,
  mode: AtmosphericMode,
  hazeColor?: string,
): string {
  if (mode === "none") return color;

  // Clamp depth
  const d = Math.max(0, Math.min(1, depth));
  // Effect strength: stronger when far (depth=0), zero when near (depth=1)
  const effect = 1 - d;

  const [r, g, b] = parseHex(color);
  const [h, s, l] = rgbToHsl(r, g, b);

  const haze = hazeColor ?? DEFAULT_HAZE[mode];
  const [hr, hg, hb] = parseHex(haze);

  if (mode === "western") {
    // Western atmospheric perspective:
    // 1. Desaturate toward distance
    const newS = Math.max(0, s - effect * 40);
    // 2. Lighten toward haze
    const newL = Math.min(100, l + effect * 25);
    // 3. Shift hue slightly toward blue (hue 220)
    const blueShift = effect * 15;
    const newH = h + (220 - h) * (blueShift / 100);

    const [adjR, adjG, adjB] = hslToRgb(newH, newS, newL);
    // Blend with haze color
    const mix = effect * 0.3;
    return toHex(
      Math.round(adjR * (1 - mix) + hr * mix),
      Math.round(adjG * (1 - mix) + hg * mix),
      Math.round(adjB * (1 - mix) + hb * mix),
    );
  }

  // ink-wash mode:
  // 1. Reduce saturation dramatically
  const newS = Math.max(0, s - effect * 60);
  // 2. Lighten toward paper tone
  const newL = Math.min(100, l + effect * 30);
  // 3. No hue shift — ink wash uses warm neutral

  const [adjR, adjG, adjB] = hslToRgb(h, newS, newL);
  // Stronger blend with paper tone
  const mix = effect * 0.4;
  return toHex(
    Math.round(adjR * (1 - mix) + hr * mix),
    Math.round(adjG * (1 - mix) + hg * mix),
    Math.round(adjB * (1 - mix) + hb * mix),
  );
}

// ---------------------------------------------------------------------------
// Depth Lane Property Schema
// ---------------------------------------------------------------------------

/** All valid depthLane select options for layer property schemas. */
export const DEPTH_LANE_OPTIONS = [
  { value: "sky", label: "Sky" },
  { value: "far-background", label: "Far Background" },
  { value: "far-background-1", label: "Far Background (back)" },
  { value: "far-background-2", label: "Far Background (mid)" },
  { value: "far-background-3", label: "Far Background (front)" },
  { value: "background", label: "Background" },
  { value: "background-1", label: "Background (back)" },
  { value: "background-2", label: "Background (mid)" },
  { value: "background-3", label: "Background (front)" },
  { value: "midground", label: "Midground" },
  { value: "midground-1", label: "Midground (back)" },
  { value: "midground-2", label: "Midground (mid)" },
  { value: "midground-3", label: "Midground (front)" },
  { value: "foreground", label: "Foreground" },
  { value: "foreground-1", label: "Foreground (back)" },
  { value: "foreground-2", label: "Foreground (mid)" },
  { value: "foreground-3", label: "Foreground (front)" },
  { value: "ground-plane", label: "Ground Plane" },
  { value: "ground-plane-1", label: "Ground Plane (back)" },
  { value: "ground-plane-2", label: "Ground Plane (mid)" },
  { value: "ground-plane-3", label: "Ground Plane (front)" },
  { value: "overlay", label: "Overlay" },
];

/**
 * Create a depthLane property schema with a default lane value.
 * Use this to add the depthLane property to any layer type.
 */
export function createDepthLaneProperty(defaultLane: DepthLaneSub): {
  key: string;
  label: string;
  type: "select";
  default: string;
  group: string;
  options: Array<{ value: string; label: string }>;
} {
  return {
    key: "depthLane",
    label: "Depth Lane",
    type: "select" as const,
    default: defaultLane,
    group: "depth",
    options: DEPTH_LANE_OPTIONS,
  };
}

/**
 * Create an atmosphericMode property schema.
 */
export function createAtmosphericModeProperty(): {
  key: string;
  label: string;
  type: "select";
  default: string;
  group: string;
  options: Array<{ value: string; label: string }>;
} {
  return {
    key: "atmosphericMode",
    label: "Atmospheric Mode",
    type: "select" as const,
    default: "none",
    group: "depth",
    options: [
      { value: "none", label: "None" },
      { value: "western", label: "Western (blue shift)" },
      { value: "ink-wash", label: "Ink Wash (paper tone)" },
    ],
  };
}
