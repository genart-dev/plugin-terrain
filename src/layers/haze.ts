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

    // Render haze as per-pixel ImageData to avoid vertical banding
    const renderTop = Math.max(0, Math.round(topY - bandH * 0.3));
    const renderBottom = Math.min(Math.round(bounds.y + h), Math.round(bottomY + bandH * 0.3));
    const renderH = renderBottom - renderTop;
    if (renderH <= 0) return;

    const rw = Math.round(w);
    const imageData = ctx.createImageData(rw, renderH);
    const data = imageData.data;

    for (let py = 0; py < renderH; py++) {
      const worldY = (renderTop + py - topY) / bandH; // 0 at topY, 1 at bottomY
      for (let px = 0; px < rw; px++) {
        const worldX = px / rw;

        // Noise modulates edge positions
        const noiseVal = noise(worldX * 5 + p.seed * 0.01, worldY * 3 + p.seed * 0.02);
        const noiseOffset = (noiseVal - 0.5) * p.noiseAmount;

        // Adjusted position with noise
        const adjustedY = worldY - noiseOffset;

        // Gradient-based alpha
        let alpha: number;
        if (p.gradientDirection === "bottom-up") {
          alpha = Math.max(0, Math.min(1, 1 - adjustedY));
        } else if (p.gradientDirection === "top-down") {
          alpha = Math.max(0, Math.min(1, adjustedY));
        } else if (p.gradientDirection === "center-out") {
          const dist = Math.abs(adjustedY - 0.5) * 2;
          alpha = Math.max(0, 1 - dist);
        } else {
          // uniform
          alpha = (adjustedY >= 0 && adjustedY <= 1) ? 1 : 0;
        }

        // Smooth edges at band boundaries
        if (adjustedY < 0) alpha *= Math.max(0, 1 + adjustedY * 3);
        if (adjustedY > 1) alpha *= Math.max(0, 1 - (adjustedY - 1) * 3);

        alpha *= p.opacity;

        if (alpha > 0.002) {
          const idx = (py * rw + px) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = Math.round(alpha * 255);
        }
      }
    }

    const tempCanvas = new OffscreenCanvas(rw, renderH);
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(tempCanvas, bounds.x, renderTop, w, renderH);
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
