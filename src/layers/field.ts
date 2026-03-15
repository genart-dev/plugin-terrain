import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { mulberry32 } from "../shared/prng.js";
import { parseHex, lerpColor, darken, lighten } from "../shared/color-utils.js";
import { createValueNoise } from "../shared/noise.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { FieldPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const FIELD_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Field Type",
    type: "select",
    default: "meadow-grass",
    group: "preset",
    options: [
      { value: "meadow-grass", label: "Meadow Grass" },
      { value: "wheat-field", label: "Wheat Field" },
      { value: "wildflower-meadow", label: "Wildflower Meadow" },
      { value: "lavender-rows", label: "Lavender Rows" },
      { value: "dry-savanna", label: "Dry Savanna" },
      { value: "rice-paddy", label: "Rice Paddy" },
      { value: "autumn-stubble", label: "Autumn Stubble" },
      { value: "snow-covered", label: "Snow-Covered Field" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  {
    key: "vegetationType",
    label: "Vegetation",
    type: "select",
    default: "grass",
    group: "vegetation",
    options: [
      { value: "grass", label: "Grass" },
      { value: "wheat", label: "Wheat" },
      { value: "wildflowers", label: "Wildflowers" },
    ],
  },
  { key: "color", label: "Primary Color", type: "color", default: "#5A8A3A", group: "colors" },
  { key: "secondaryColor", label: "Secondary Color", type: "color", default: "#7AAA5A", group: "colors" },
  { key: "density", label: "Density", type: "number", default: 0.6, min: 0.1, max: 1.0, step: 0.05, group: "vegetation" },
  { key: "markLength", label: "Mark Length", type: "number", default: 8, min: 2, max: 20, step: 1, group: "vegetation" },
  { key: "windDirection", label: "Wind Direction", type: "number", default: 45, min: 0, max: 360, step: 5, group: "wind" },
  { key: "windStrength", label: "Wind Strength", type: "number", default: 0.3, min: 0, max: 1, step: 0.05, group: "wind" },
  {
    key: "seasonalTint",
    label: "Season",
    type: "select",
    default: "summer",
    group: "colors",
    options: [
      { value: "spring", label: "Spring" },
      { value: "summer", label: "Summer" },
      { value: "autumn", label: "Autumn" },
      { value: "winter", label: "Winter" },
    ],
  },
  createDepthLaneProperty("midground"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  vegetationType: string;
  color: string;
  secondaryColor: string;
  density: number;
  markLength: number;
  windDirection: number;
  windStrength: number;
  seasonalTint: string;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const fp = preset?.category === "field" ? (preset as FieldPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    vegetationType: (properties.vegetationType as string) ?? fp?.vegetationType ?? "grass",
    color: (properties.color as string) || fp?.color || "#5A8A3A",
    secondaryColor: (properties.secondaryColor as string) || fp?.secondaryColor || "#7AAA5A",
    density: (properties.density as number) ?? fp?.density ?? 0.6,
    markLength: (properties.markLength as number) ?? fp?.markLength ?? 8,
    windDirection: (properties.windDirection as number) ?? fp?.windDirection ?? 45,
    windStrength: (properties.windStrength as number) ?? fp?.windStrength ?? 0.3,
    seasonalTint: (properties.seasonalTint as string) ?? fp?.seasonalTint ?? "summer",
    depthLane: (properties.depthLane as string) ?? "midground",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

export const fieldLayerType: LayerTypeDefinition = {
  typeId: "terrain:field",
  displayName: "Field",
  icon: "field",
  category: "draw",
  properties: FIELD_PROPERTIES,
  propertyEditorId: "terrain:field-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(FIELD_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const rng = mulberry32(p.seed);
    const noise = createValueNoise(p.seed + 500);
    const windRad = (p.windDirection * Math.PI) / 180;
    const windDx = Math.cos(windRad) * p.windStrength;
    const windDy = Math.sin(windRad) * p.windStrength;

    // Resolve depth lane to constrain vertical extent
    const laneConfig = resolveDepthLane(p.depthLane);
    const depthMin = laneConfig?.depthMin ?? 0;
    const depthMax = laneConfig?.depthMax ?? 1;
    const yStart = bounds.y + bounds.height * depthMin;
    const yEnd = bounds.y + bounds.height * depthMax;
    const laneHeight = yEnd - yStart;

    // Apply atmospheric depth to colors if enabled
    let color = p.color;
    let secondaryColor = p.secondaryColor;
    if (p.atmosphericMode !== "none" && laneConfig) {
      color = applyAtmosphericDepth(color, laneConfig.depth, p.atmosphericMode);
      secondaryColor = applyAtmosphericDepth(secondaryColor, laneConfig.depth, p.atmosphericMode);
    }

    // Fill ground plane within depth lane band only
    const groundColor = darken(color, 0.85);
    ctx.fillStyle = groundColor;
    ctx.fillRect(bounds.x, yStart, bounds.width, laneHeight);

    // Draw vegetation marks receding with depth, constrained to depth lane
    const markCount = Math.round(p.density * 2000);
    const w = bounds.width;

    for (let i = 0; i < markCount; i++) {
      const nx = rng();
      const ny = rng();
      const x = bounds.x + nx * w;
      const y = yStart + ny * laneHeight;

      // Depth factor within the lane: 0=top of lane (far), 1=bottom of lane (near)
      const depth = depthMin + ny * (depthMax - depthMin);
      const scale = 0.3 + depth * 0.7;
      const len = p.markLength * scale;

      // Noise-based variation
      const nv = noise(nx * 8, ny * 8);
      if (nv < 1 - p.density) continue;

      // Color variation
      const colorT = rng() * 0.3 + nv * 0.3;
      ctx.strokeStyle = lerpColor(color, secondaryColor, colorT);
      ctx.globalAlpha = 0.4 + depth * 0.5;
      ctx.lineWidth = 0.5 + scale * 1.5;

      // Draw mark with wind influence
      const angle = windRad + (rng() - 0.5) * 0.6;
      const dx = Math.cos(angle) * len;
      const dy = Math.sin(angle) * len * 0.5;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx, y + dy);
      ctx.stroke();

      // Wildflower dots
      if (p.vegetationType === "wildflowers" && rng() < 0.15) {
        ctx.fillStyle = secondaryColor;
        ctx.globalAlpha = 0.6 + depth * 0.3;
        ctx.beginPath();
        ctx.arc(x, y, 1 + scale * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Wheat tops
      if (p.vegetationType === "wheat" && rng() < 0.2) {
        ctx.fillStyle = secondaryColor;
        ctx.globalAlpha = 0.5 + depth * 0.4;
        ctx.fillRect(x + dx - 1, y + dy - 2, 2 + scale, 3 + scale);
      }
    }

    ctx.globalAlpha = 1;
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown field preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
