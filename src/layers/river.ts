import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { mulberry32 } from "../shared/prng.js";
import { parseHex, lerpColor, darken } from "../shared/color-utils.js";
import { createValueNoise } from "../shared/noise.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import {
  getPathPresetCurve,
  samplePerspectiveCurve,
  drawPerspectiveRibbon,
  drawCrossLines,
  evalBezierNormal,
} from "../shared/perspective-curve.js";
import type { PathPresetType } from "../shared/perspective-curve.js";
import { getPreset } from "../presets/index.js";
import type { RiverPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const RIVER_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "River Type",
    type: "select",
    default: "gentle-stream",
    group: "preset",
    options: [
      { value: "gentle-stream", label: "Gentle Stream" },
      { value: "wide-river", label: "Wide River" },
      { value: "mountain-creek", label: "Mountain Creek" },
      { value: "lazy-oxbow", label: "Lazy Oxbow" },
      { value: "forest-brook", label: "Forest Brook" },
      { value: "delta-channels", label: "Delta Channels" },
      { value: "waterfall-stream", label: "Waterfall Stream" },
      { value: "tidal-estuary", label: "Tidal Estuary" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  {
    key: "pathPreset",
    label: "Path Shape",
    type: "select",
    default: "meandering",
    group: "shape",
    options: [
      { value: "straight", label: "Straight" },
      { value: "meandering", label: "Meandering" },
      { value: "s-curve", label: "S-Curve" },
      { value: "winding", label: "Winding" },
      { value: "switchback", label: "Switchback" },
      { value: "fork", label: "Fork / Delta" },
    ],
  },
  { key: "widthNear", label: "Width (Near)", type: "number", default: 80, min: 10, max: 400, step: 5, group: "shape" },
  { key: "widthFar", label: "Width (Far)", type: "number", default: 15, min: 2, max: 100, step: 1, group: "shape" },
  { key: "waterColor", label: "Water Color", type: "color", default: "#4A7A8A", group: "colors" },
  { key: "bankColor", label: "Bank Color", type: "color", default: "#5C6B3A", group: "colors" },
  { key: "rippleScale", label: "Ripple Scale", type: "number", default: 0.3, min: 0, max: 1, step: 0.05, group: "water" },
  { key: "rippleIntensity", label: "Ripple Intensity", type: "number", default: 0.2, min: 0, max: 1, step: 0.05, group: "water" },
  { key: "reflectionIntensity", label: "Reflection", type: "number", default: 0.3, min: 0, max: 1, step: 0.05, group: "water" },
  {
    key: "bankStyle",
    label: "Bank Style",
    type: "select",
    default: "soft-grass",
    group: "banks",
    options: [
      { value: "none", label: "None" },
      { value: "soft-grass", label: "Soft Grass" },
      { value: "rocky", label: "Rocky" },
      { value: "sandy", label: "Sandy" },
      { value: "muddy", label: "Muddy" },
    ],
  },
  createDepthLaneProperty("midground"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  pathPreset: PathPresetType;
  widthNear: number;
  widthFar: number;
  waterColor: string;
  bankColor: string;
  rippleScale: number;
  rippleIntensity: number;
  reflectionIntensity: number;
  bankStyle: string;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const rp = preset?.category === "river" ? (preset as RiverPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    pathPreset: (properties.pathPreset as PathPresetType) ?? rp?.pathPreset ?? "meandering",
    widthNear: (properties.widthNear as number) ?? rp?.widthNear ?? 80,
    widthFar: (properties.widthFar as number) ?? rp?.widthFar ?? 15,
    waterColor: (properties.waterColor as string) || rp?.waterColor || "#4A7A8A",
    bankColor: (properties.bankColor as string) || rp?.bankColor || "#5C6B3A",
    rippleScale: (properties.rippleScale as number) ?? rp?.rippleScale ?? 0.3,
    rippleIntensity: (properties.rippleIntensity as number) ?? rp?.rippleIntensity ?? 0.2,
    reflectionIntensity: (properties.reflectionIntensity as number) ?? rp?.reflectionIntensity ?? 0.3,
    bankStyle: (properties.bankStyle as string) ?? rp?.bankStyle ?? "soft-grass",
    depthLane: (properties.depthLane as string) ?? "midground",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

export const riverLayerType: LayerTypeDefinition = {
  typeId: "terrain:river",
  displayName: "River",
  icon: "river",
  category: "draw",
  properties: RIVER_PROPERTIES,
  propertyEditorId: "terrain:river-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(RIVER_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const curve = getPathPresetCurve(p.pathPreset, p.seed);
    const samples = samplePerspectiveCurve(curve, bounds, p.widthNear, p.widthFar, 100);

    // Apply atmospheric depth to colors if enabled
    let waterColor = p.waterColor;
    let bankColor = p.bankColor;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        waterColor = applyAtmosphericDepth(waterColor, laneConfig.depth, p.atmosphericMode);
        bankColor = applyAtmosphericDepth(bankColor, laneConfig.depth, p.atmosphericMode);
      }
    }

    // Draw bank shadow/edge (slightly wider than water)
    if (p.bankStyle !== "none") {
      const bankSamples = samplePerspectiveCurve(curve, bounds, p.widthNear * 1.2, p.widthFar * 1.2, 100);
      const darkBank = darken(bankColor, 0.7);
      drawPerspectiveRibbon(ctx, curve, bankSamples, darkBank);
    }

    // Draw water fill
    const deepColor = darken(waterColor, 0.6);
    drawPerspectiveRibbon(ctx, curve, samples, waterColor);

    // Draw depth darkening gradient along the length
    const rng = mulberry32(p.seed + 100);
    for (let i = 1; i < samples.length; i++) {
      const s = samples[i]!;
      const prev = samples[i - 1]!;
      const normal = evalBezierNormal(curve, s.t);
      const halfW = s.width * 0.5;

      // Darken center of river slightly
      const centerAlpha = 0.15 * (1 - s.t);
      if (centerAlpha > 0.01) {
        ctx.globalAlpha = centerAlpha;
        ctx.fillStyle = deepColor;
        ctx.fillRect(
          Math.min(s.x, prev.x) - halfW * 0.3,
          Math.min(s.y, prev.y),
          halfW * 0.6,
          Math.abs(s.y - prev.y) + 1,
        );
      }
    }
    ctx.globalAlpha = 1;

    // Draw ripple lines across the river
    if (p.rippleIntensity > 0) {
      const rippleCount = Math.round(p.rippleScale * 30 + 5);
      drawCrossLines(ctx, curve, samples, {
        lineCount: rippleCount,
        color: `rgba(255,255,255,1)`,
        alphaFar: 0.05,
        alphaNear: p.rippleIntensity * 0.3,
        widthScale: 0.85,
      });
    }

    // Shimmer / reflection highlights near surface
    if (p.reflectionIntensity > 0) {
      const shimmerCount = Math.round(p.reflectionIntensity * 40);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      for (let i = 0; i < shimmerCount; i++) {
        const sIdx = Math.floor(rng() * samples.length);
        const s = samples[sIdx]!;
        const normal = evalBezierNormal(curve, s.t);
        const offset = (rng() - 0.5) * s.width * 0.6;
        const sx = s.x + normal.x * offset;
        const sy = s.y + normal.y * offset;
        const sw = 1 + rng() * 3 * (1 - s.t);
        const sh = 0.3 + rng() * 0.7;
        ctx.globalAlpha = p.reflectionIntensity * (1 - s.t) * 0.4;
        ctx.fillRect(sx, sy, sw, sh);
      }
      ctx.globalAlpha = 1;
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown river preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
