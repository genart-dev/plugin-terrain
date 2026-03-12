import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { mulberry32 } from "../shared/prng.js";
import { parseHex, darken, lighten } from "../shared/color-utils.js";
import { createValueNoise } from "../shared/noise.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { SnowfieldPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const SNOWFIELD_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Snow Type",
    type: "select",
    default: "fresh-powder",
    group: "preset",
    options: [
      { value: "fresh-powder", label: "Fresh Powder" },
      { value: "wind-swept", label: "Wind Swept" },
      { value: "sun-crust", label: "Sun Crust" },
      { value: "deep-snow", label: "Deep Snow" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  { key: "snowColor", label: "Snow Color", type: "color", default: "#F0F4F8", group: "colors" },
  { key: "shadowColor", label: "Shadow Color", type: "color", default: "#B0C0D8", group: "colors" },
  { key: "driftIntensity", label: "Drift Intensity", type: "number", default: 0.4, min: 0, max: 1, step: 0.05, group: "snow" },
  { key: "sparkleIntensity", label: "Sparkle", type: "number", default: 0.3, min: 0, max: 1, step: 0.05, group: "snow" },
  { key: "coverageTop", label: "Coverage Top", type: "number", default: 0.5, min: 0, max: 1, step: 0.05, group: "layout" },
  { key: "coverageBottom", label: "Coverage Bottom", type: "number", default: 1.0, min: 0, max: 1, step: 0.05, group: "layout" },
  createDepthLaneProperty("ground-plane"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  snowColor: string;
  shadowColor: string;
  driftIntensity: number;
  sparkleIntensity: number;
  coverageTop: number;
  coverageBottom: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const sp = preset?.category === "snowfield" ? (preset as SnowfieldPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    snowColor: (properties.snowColor as string) || sp?.snowColor || "#F0F4F8",
    shadowColor: (properties.shadowColor as string) || sp?.shadowColor || "#B0C0D8",
    driftIntensity: (properties.driftIntensity as number) ?? sp?.driftIntensity ?? 0.4,
    sparkleIntensity: (properties.sparkleIntensity as number) ?? sp?.sparkleIntensity ?? 0.3,
    coverageTop: (properties.coverageTop as number) ?? sp?.coverageTop ?? 0.5,
    coverageBottom: (properties.coverageBottom as number) ?? sp?.coverageBottom ?? 1.0,
    depthLane: (properties.depthLane as string) ?? "ground-plane",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

export const snowfieldLayerType: LayerTypeDefinition = {
  typeId: "terrain:snowfield",
  displayName: "Snow Field",
  icon: "snowfield",
  category: "draw",
  properties: SNOWFIELD_PROPERTIES,
  propertyEditorId: "terrain:snowfield-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(SNOWFIELD_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const rng = mulberry32(p.seed);
    const noise = createValueNoise(p.seed + 600);
    const w = bounds.width;
    const h = bounds.height;

    // Apply atmospheric depth
    let snowColor = p.snowColor;
    let shadowColor = p.shadowColor;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        snowColor = applyAtmosphericDepth(snowColor, laneConfig.depth, p.atmosphericMode);
        shadowColor = applyAtmosphericDepth(shadowColor, laneConfig.depth, p.atmosphericMode);
      }
    }

    const [snR, snG, snB] = parseHex(snowColor);
    const [shR, shG, shB] = parseHex(shadowColor);
    const top = bounds.y + p.coverageTop * h;
    const bottom = bounds.y + p.coverageBottom * h;
    const coverH = bottom - top;

    if (coverH <= 0) return;

    // Base snow fill
    ctx.fillStyle = snowColor;
    ctx.fillRect(bounds.x, top, w, coverH);

    // Snow drift undulations (noise-modulated shadow bands)
    const sliceCount = Math.ceil(w / 3);
    for (let i = 0; i < sliceCount; i++) {
      const nx = i / sliceCount;
      const sliceX = bounds.x + nx * w;

      for (let row = 0; row < 8; row++) {
        const ny = row / 8;
        const n = noise(nx * 6 + p.seed * 0.01, ny * 4);
        const driftN = noise(nx * 3, ny * 2 + 100);

        // Shadow in drift valleys
        const shadowAmount = Math.max(0, (n - 0.5) * 2) * p.driftIntensity;
        if (shadowAmount > 0.05) {
          const sy = top + ny * coverH;
          const alpha = shadowAmount * 0.3;
          ctx.fillStyle = `rgba(${shR},${shG},${shB},${alpha})`;
          ctx.fillRect(sliceX, sy, w / sliceCount + 1, coverH / 8 + 1);
        }

        // Drift highlights on crests
        const highlightAmount = Math.max(0, (0.5 - n) * 2) * p.driftIntensity;
        if (highlightAmount > 0.1 && driftN > 0.5) {
          const sy = top + ny * coverH;
          const lightColor = lighten(snowColor, 0.1);
          const [lr, lg, lb] = parseHex(lightColor);
          ctx.fillStyle = `rgba(${lr},${lg},${lb},${highlightAmount * 0.2})`;
          ctx.fillRect(sliceX, sy, w / sliceCount + 1, coverH / 16);
        }
      }
    }

    // Sparkle highlights (small bright dots scattered on snow surface)
    if (p.sparkleIntensity > 0) {
      const sparkleCount = Math.round(p.sparkleIntensity * 150 * (w / 800));
      for (let i = 0; i < sparkleCount; i++) {
        const sx = bounds.x + rng() * w;
        const sy = top + rng() * coverH;
        const sparkleAlpha = 0.4 + rng() * 0.6;
        const sparkleSize = 0.5 + rng() * 1.5;

        ctx.fillStyle = `rgba(255,255,255,${sparkleAlpha * p.sparkleIntensity})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sparkleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown snowfield preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
