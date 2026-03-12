import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { createFractalNoise } from "../shared/noise.js";
import { lerpColor } from "../shared/color-utils.js";
import { applyDepthEasing } from "../shared/depth.js";
import type { DepthEasing } from "../shared/depth.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { ProfilePreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const PROFILE_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Terrain Type",
    type: "select",
    default: "rolling-hills",
    group: "preset",
    options: [
      { value: "alpine-range", label: "Alpine Range" },
      { value: "rolling-hills", label: "Rolling Hills" },
      { value: "mesa-plateau", label: "Mesa Plateau" },
      { value: "coastal-cliffs", label: "Coastal Cliffs" },
      { value: "sand-dunes", label: "Sand Dunes" },
      { value: "foothills", label: "Foothills" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  { key: "ridgeCount", label: "Ridge Count", type: "number", default: 3, min: 1, max: 8, step: 1, group: "shape" },
  { key: "roughness", label: "Roughness", type: "number", default: 0.35, min: 0, max: 1, step: 0.05, group: "shape" },
  { key: "elevationMin", label: "Elevation Min", type: "number", default: 0.4, min: 0, max: 1, step: 0.05, group: "shape" },
  { key: "elevationMax", label: "Elevation Max", type: "number", default: 0.7, min: 0, max: 1, step: 0.05, group: "shape" },
  { key: "noiseScale", label: "Noise Scale", type: "number", default: 2.0, min: 0.5, max: 8, step: 0.5, group: "shape" },
  { key: "jaggedness", label: "Jaggedness", type: "number", default: 0.3, min: 0, max: 1, step: 0.05, group: "shape" },
  { key: "foregroundColor", label: "Foreground Color", type: "color", default: "#3B5E3B", group: "colors" },
  { key: "backgroundRidgeColor", label: "Background Color", type: "color", default: "#7A9E8A", group: "colors" },
  { key: "depthValueShift", label: "Depth Value Shift", type: "number", default: 0.4, min: 0, max: 1, step: 0.05, group: "depth" },
  {
    key: "depthEasing",
    label: "Depth Easing",
    type: "select",
    default: "linear",
    group: "depth",
    options: [
      { value: "linear", label: "Linear" },
      { value: "quadratic", label: "Quadratic" },
      { value: "cubic", label: "Cubic" },
      { value: "exponential", label: "Exponential" },
    ],
  },
  createDepthLaneProperty("background"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  ridgeCount: number;
  roughness: number;
  elevationMin: number;
  elevationMax: number;
  noiseScale: number;
  jaggedness: number;
  foregroundColor: string;
  backgroundRidgeColor: string;
  depthValueShift: number;
  depthEasing: DepthEasing;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const pp = preset?.category === "profile" ? (preset as ProfilePreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    ridgeCount: (properties.ridgeCount as number) ?? pp?.ridgeCount ?? 3,
    roughness: (properties.roughness as number) ?? pp?.roughness ?? 0.35,
    elevationMin: (properties.elevationMin as number) ?? pp?.elevationMin ?? 0.4,
    elevationMax: (properties.elevationMax as number) ?? pp?.elevationMax ?? 0.7,
    noiseScale: (properties.noiseScale as number) ?? pp?.noiseScale ?? 2.0,
    jaggedness: (properties.jaggedness as number) ?? pp?.jaggedness ?? 0.3,
    foregroundColor: (properties.foregroundColor as string) || pp?.foregroundColor || "#3B5E3B",
    backgroundRidgeColor: (properties.backgroundRidgeColor as string) || pp?.backgroundRidgeColor || "#7A9E8A",
    depthValueShift: (properties.depthValueShift as number) ?? pp?.depthValueShift ?? 0.4,
    depthEasing: (properties.depthEasing as DepthEasing) ?? pp?.depthEasing ?? "linear",
    depthLane: (properties.depthLane as string) ?? "background",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

export const profileLayerType: LayerTypeDefinition = {
  typeId: "terrain:profile",
  displayName: "Terrain Profile",
  icon: "mountain",
  category: "draw",
  properties: PROFILE_PROPERTIES,
  propertyEditorId: "terrain:profile-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(PROFILE_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const { width, height, x: bx, y: by } = bounds;
    const ridgeCount = Math.max(1, Math.min(8, p.ridgeCount));

    // Octave count scales with roughness: 1 at 0, 6 at 1
    const octaves = Math.max(1, Math.round(1 + p.roughness * 5));

    for (let i = 0; i < ridgeCount; i++) {
      // t=0 for farthest ridge, t=1 for nearest
      const t = ridgeCount === 1 ? 1 : i / (ridgeCount - 1);
      const easedT = applyDepthEasing(t, p.depthEasing);

      // Per-ridge noise with unique seed offset
      const noise = createFractalNoise(p.seed + i * 7919, octaves, 2.0, 0.5);

      // Baseline Y interpolates elevationMax (far) → elevationMin (near) using depth easing
      const baselineNorm = p.elevationMax - (p.elevationMax - p.elevationMin) * easedT;
      const baselineY = by + height * baselineNorm;

      // Elevation range available above baseline
      const elevRange = baselineNorm * height * 0.4;

      // Determine colors for this ridge, with optional atmospheric depth
      let bgColor = p.backgroundRidgeColor;
      let fgColor = p.foregroundColor;

      if (p.atmosphericMode !== "none") {
        const laneConfig = resolveDepthLane(p.depthLane);
        if (laneConfig) {
          // Map ridge t (0=far, 1=near) to depth within the lane's range
          const ridgeDepth = laneConfig.depthMin + (laneConfig.depthMax - laneConfig.depthMin) * t;
          // Apply atmosphere to both endpoint colors, then lerp
          bgColor = applyAtmosphericDepth(bgColor, ridgeDepth, p.atmosphericMode);
          fgColor = applyAtmosphericDepth(fgColor, ridgeDepth, p.atmosphericMode);
        }
      }

      const ridgeColor = lerpColor(bgColor, fgColor, t);

      // Generate noise profile and draw filled path
      ctx.beginPath();

      const step = Math.max(1, Math.floor(width / 300));
      for (let px = 0; px <= width; px += step) {
        const nx = (px / width) * p.noiseScale;
        let noiseVal = noise(nx, i * 10);

        // Jaggedness: add high-frequency overlay
        if (p.jaggedness > 0.3) {
          const hfNoise = createFractalNoise(p.seed + i * 3571 + 999, 2, 4.0, 0.3);
          noiseVal += hfNoise(nx * 3, i * 10) * p.jaggedness * 0.3;
          noiseVal = Math.min(1, Math.max(0, noiseVal));
        }

        const profileY = baselineY - noiseVal * elevRange;

        if (px === 0) {
          ctx.moveTo(bx + px, profileY);
        } else {
          ctx.lineTo(bx + px, profileY);
        }
      }

      // Close path to bottom
      ctx.lineTo(bx + width, by + height);
      ctx.lineTo(bx, by + height);
      ctx.closePath();

      ctx.fillStyle = ridgeColor;
      ctx.fill();
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown profile preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
