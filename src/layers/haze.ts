import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { mulberry32 } from "../shared/prng.js";
import { parseHex } from "../shared/color-utils.js";
import { createValueNoise } from "../shared/noise.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { HazePreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const HAZE_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Haze Type",
    type: "select",
    default: "light-haze",
    group: "preset",
    options: [
      { value: "light-haze", label: "Light Haze" },
      { value: "golden-haze", label: "Golden Haze" },
      { value: "cool-mist", label: "Cool Mist" },
      { value: "heat-haze", label: "Heat Haze" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  { key: "color", label: "Haze Color", type: "color", default: "#E0E8F0", group: "colors" },
  { key: "opacity", label: "Opacity", type: "number", default: 0.2, min: 0.02, max: 0.6, step: 0.02, group: "haze" },
  { key: "yPosition", label: "Y Position", type: "number", default: 0.5, min: 0, max: 1, step: 0.05, group: "position" },
  { key: "height", label: "Height", type: "number", default: 0.4, min: 0.05, max: 1.0, step: 0.05, group: "haze" },
  { key: "gradientDirection", label: "Gradient", type: "select", default: "bottom-up", group: "haze", options: [
    { value: "bottom-up", label: "Bottom Up" },
    { value: "top-down", label: "Top Down" },
    { value: "center-out", label: "Center Out" },
    { value: "uniform", label: "Uniform" },
  ] },
  { key: "noiseAmount", label: "Noise Amount", type: "number", default: 0.3, min: 0, max: 1, step: 0.05, group: "haze" },
  createDepthLaneProperty("midground"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  color: string;
  opacity: number;
  yPosition: number;
  height: number;
  gradientDirection: string;
  noiseAmount: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const hp = preset?.category === "haze" ? (preset as HazePreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    color: (properties.color as string) || hp?.color || "#E0E8F0",
    opacity: (properties.opacity as number) ?? hp?.opacity ?? 0.2,
    yPosition: (properties.yPosition as number) ?? hp?.yPosition ?? 0.5,
    height: (properties.height as number) ?? hp?.height ?? 0.4,
    gradientDirection: (properties.gradientDirection as string) ?? hp?.gradientDirection ?? "bottom-up",
    noiseAmount: (properties.noiseAmount as number) ?? hp?.noiseAmount ?? 0.3,
    depthLane: (properties.depthLane as string) ?? "midground",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

export const hazeLayerType: LayerTypeDefinition = {
  typeId: "terrain:haze",
  displayName: "Haze",
  icon: "haze",
  category: "draw",
  properties: HAZE_PROPERTIES,
  propertyEditorId: "terrain:haze-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(HAZE_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const noise = createValueNoise(p.seed + 700);
    const w = bounds.width;
    const h = bounds.height;

    // Apply atmospheric depth
    let hazeColor = p.color;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        hazeColor = applyAtmosphericDepth(hazeColor, laneConfig.depth, p.atmosphericMode);
      }
    }

    const [r, g, b] = parseHex(hazeColor);

    // Haze coverage area
    const centerY = bounds.y + p.yPosition * h;
    const bandH = p.height * h;
    const topY = centerY - bandH / 2;
    const bottomY = centerY + bandH / 2;

    // Render haze as vertical slices with noise modulation
    const sliceCount = Math.ceil(w / 3);
    for (let i = 0; i < sliceCount; i++) {
      const nx = i / sliceCount;
      const x = bounds.x + nx * w;
      const sliceW = w / sliceCount + 1;

      // Noise modulation for edge variation
      const noiseVal = noise(nx * 5 + p.seed * 0.01, p.seed * 0.02);
      const noiseOffset = (noiseVal - 0.5) * bandH * p.noiseAmount;

      const sliceTop = topY + noiseOffset;
      const sliceBottom = bottomY - noiseOffset * 0.5;
      if (sliceBottom <= sliceTop) continue;

      const sliceH = sliceBottom - sliceTop;

      // Gradient based on direction
      let gradient: CanvasGradient;
      if (p.gradientDirection === "bottom-up") {
        gradient = ctx.createLinearGradient(x, sliceBottom, x, sliceTop);
        gradient.addColorStop(0, `rgba(${r},${g},${b},${p.opacity})`);
        gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
      } else if (p.gradientDirection === "top-down") {
        gradient = ctx.createLinearGradient(x, sliceTop, x, sliceBottom);
        gradient.addColorStop(0, `rgba(${r},${g},${b},${p.opacity})`);
        gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
      } else if (p.gradientDirection === "center-out") {
        gradient = ctx.createLinearGradient(x, sliceTop, x, sliceBottom);
        gradient.addColorStop(0, `rgba(${r},${g},${b},0)`);
        gradient.addColorStop(0.5, `rgba(${r},${g},${b},${p.opacity})`);
        gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
      } else {
        // uniform
        gradient = ctx.createLinearGradient(x, sliceTop, x, sliceBottom);
        gradient.addColorStop(0, `rgba(${r},${g},${b},${p.opacity * 0.7})`);
        gradient.addColorStop(0.1, `rgba(${r},${g},${b},${p.opacity})`);
        gradient.addColorStop(0.9, `rgba(${r},${g},${b},${p.opacity})`);
        gradient.addColorStop(1, `rgba(${r},${g},${b},${p.opacity * 0.7})`);
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x, sliceTop, sliceW, sliceH);
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown haze preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
