import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { mulberry32 } from "../shared/prng.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { ErosionPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const EROSION_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Erosion Type",
    type: "select",
    default: "rain-streaks",
    group: "preset",
    options: [
      { value: "rain-streaks", label: "Rain Streaks" },
      { value: "wind-erosion", label: "Wind Erosion" },
      { value: "frost-cracks", label: "Frost Cracks" },
      { value: "lichen-growth", label: "Lichen Growth" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  {
    key: "erosionType",
    label: "Style",
    type: "select",
    default: "rain-wash",
    group: "erosion",
    options: [
      { value: "rain-wash", label: "Rain Wash" },
      { value: "wind-scour", label: "Wind Scour" },
      { value: "frost-crack", label: "Frost Crack" },
      { value: "lichen", label: "Lichen" },
    ],
  },
  { key: "color", label: "Color", type: "color", default: "rgba(80,70,60,0.3)", group: "colors" },
  { key: "intensity", label: "Intensity", type: "number", default: 0.5, min: 0, max: 1, step: 0.05, group: "erosion" },
  { key: "coverageTop", label: "Coverage Top", type: "number", default: 0.3, min: 0, max: 1, step: 0.05, group: "layout" },
  { key: "coverageBottom", label: "Coverage Bottom", type: "number", default: 0.8, min: 0, max: 1, step: 0.05, group: "layout" },
  { key: "noiseScale", label: "Noise Scale", type: "number", default: 0.5, min: 0.1, max: 2, step: 0.1, group: "erosion" },
  createDepthLaneProperty("foreground"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  erosionType: string;
  color: string;
  intensity: number;
  coverageTop: number;
  coverageBottom: number;
  noiseScale: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const ep = preset?.category === "erosion" ? (preset as ErosionPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    erosionType: (properties.erosionType as string) ?? ep?.erosionType ?? "rain-wash",
    color: (properties.color as string) || ep?.color || "rgba(80,70,60,0.3)",
    intensity: (properties.intensity as number) ?? ep?.intensity ?? 0.5,
    coverageTop: (properties.coverageTop as number) ?? ep?.coverageTop ?? 0.3,
    coverageBottom: (properties.coverageBottom as number) ?? ep?.coverageBottom ?? 0.8,
    noiseScale: (properties.noiseScale as number) ?? ep?.noiseScale ?? 0.5,
    depthLane: (properties.depthLane as string) ?? "foreground",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

export const erosionLayerType: LayerTypeDefinition = {
  typeId: "terrain:erosion",
  displayName: "Erosion",
  icon: "erosion",
  category: "draw",
  properties: EROSION_PROPERTIES,
  propertyEditorId: "terrain:erosion-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(EROSION_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const rng = mulberry32(p.seed);
    const w = bounds.width;
    const h = bounds.height;

    // Apply atmospheric depth
    let color = p.color;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        color = applyAtmosphericDepth(color, laneConfig.depth, p.atmosphericMode);
      }
    }

    const top = bounds.y + p.coverageTop * h;
    const bottom = bounds.y + p.coverageBottom * h;
    const regionH = bottom - top;
    const markCount = Math.floor(p.intensity * 120 * p.noiseScale);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    if (p.erosionType === "rain-wash") {
      // Vertical streaks
      ctx.lineWidth = 1;
      for (let i = 0; i < markCount; i++) {
        const x = bounds.x + rng() * w;
        const y = top + rng() * regionH;
        const len = (10 + rng() * 30) * p.intensity;
        ctx.globalAlpha = 0.2 + rng() * 0.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rng() - 0.5) * 3, y + len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (p.erosionType === "wind-scour") {
      // Horizontal scratch lines
      ctx.lineWidth = 0.5;
      for (let i = 0; i < markCount; i++) {
        const x = bounds.x + rng() * w;
        const y = top + rng() * regionH;
        const len = (15 + rng() * 40) * p.intensity;
        ctx.globalAlpha = 0.15 + rng() * 0.3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, y + (rng() - 0.5) * 4);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (p.erosionType === "frost-crack") {
      // Branching crack network
      const crackCount = Math.floor(markCount * 0.3);
      ctx.lineWidth = 1;
      for (let i = 0; i < crackCount; i++) {
        let cx = bounds.x + rng() * w;
        let cy = top + rng() * regionH;
        const branches = 2 + Math.floor(rng() * 4);
        ctx.globalAlpha = 0.3 + rng() * 0.4;
        for (let b = 0; b < branches; b++) {
          const angle = rng() * Math.PI * 2;
          const segLen = (5 + rng() * 15) * p.intensity;
          const nx = cx + Math.cos(angle) * segLen;
          const ny = cy + Math.sin(angle) * segLen;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(nx, ny);
          ctx.stroke();
          cx = nx;
          cy = ny;
        }
      }
      ctx.globalAlpha = 1;
    } else {
      // Lichen: scattered colored patches
      const patchCount = Math.floor(markCount * 0.5);
      for (let i = 0; i < patchCount; i++) {
        const x = bounds.x + rng() * w;
        const y = top + rng() * regionH;
        const radius = (2 + rng() * 6) * p.intensity;
        ctx.globalAlpha = 0.2 + rng() * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown erosion preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
