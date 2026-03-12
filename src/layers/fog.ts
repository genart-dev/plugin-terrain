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
import type { FogPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const FOG_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Fog Type",
    type: "select",
    default: "morning-mist",
    group: "preset",
    options: [
      { value: "morning-mist", label: "Morning Mist" },
      { value: "mountain-veil", label: "Mountain Veil" },
      { value: "valley-fog", label: "Valley Fog" },
      { value: "shan-shui-cloud-band", label: "Shan-Shui Cloud Band" },
      { value: "coastal-haar", label: "Coastal Haar" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  {
    key: "fogType",
    label: "Fog Shape",
    type: "select",
    default: "ground",
    group: "fog",
    options: [
      { value: "band", label: "Band" },
      { value: "ground", label: "Ground" },
      { value: "mountain", label: "Mountain" },
      { value: "veil", label: "Veil" },
    ],
  },
  { key: "opacity", label: "Opacity", type: "number", default: 0.4, min: 0.05, max: 1.0, step: 0.05, group: "fog" },
  { key: "height", label: "Height", type: "number", default: 0.2, min: 0.02, max: 0.5, step: 0.01, group: "fog" },
  { key: "yPosition", label: "Y Position", type: "number", default: 0.7, min: 0.0, max: 1.0, step: 0.01, group: "position" },
  { key: "color", label: "Fog Color", type: "color", default: "#FFFFFF", group: "colors" },
  { key: "edgeSoftness", label: "Edge Softness", type: "number", default: 0.8, min: 0.0, max: 1.0, step: 0.05, group: "fog" },
  { key: "wispDensity", label: "Wisp Density", type: "number", default: 0.3, min: 0.0, max: 1.0, step: 0.05, group: "fog" },
  createDepthLaneProperty("midground"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  fogType: string;
  opacity: number;
  height: number;
  yPosition: number;
  color: string;
  edgeSoftness: number;
  wispDensity: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const fp = preset?.category === "fog" ? (preset as FogPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    fogType: (properties.fogType as string) ?? fp?.fogType ?? "ground",
    opacity: (properties.opacity as number) ?? fp?.opacity ?? 0.4,
    height: (properties.height as number) ?? fp?.height ?? 0.2,
    yPosition: (properties.yPosition as number) ?? fp?.yPosition ?? 0.7,
    color: (properties.color as string) || fp?.color || "#FFFFFF",
    edgeSoftness: (properties.edgeSoftness as number) ?? fp?.edgeSoftness ?? 0.8,
    wispDensity: (properties.wispDensity as number) ?? fp?.wispDensity ?? 0.3,
    depthLane: (properties.depthLane as string) ?? "midground",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

export const fogLayerType: LayerTypeDefinition = {
  typeId: "terrain:fog-layer",
  displayName: "Fog Layer",
  icon: "fog",
  category: "draw",
  properties: FOG_PROPERTIES,
  propertyEditorId: "terrain:fog-layer-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(FOG_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const rng = mulberry32(p.seed);
    const noise = createValueNoise(p.seed + 200);
    const w = bounds.width;
    const h = bounds.height;

    // Apply atmospheric depth to fog color if enabled
    let fogColor = p.color;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        fogColor = applyAtmosphericDepth(fogColor, laneConfig.depth, p.atmosphericMode);
      }
    }

    const [r, g, b] = parseHex(fogColor);

    // Fog band center and extent
    const centerY = bounds.y + p.yPosition * h;
    const bandH = p.height * h;
    const topY = centerY - bandH / 2;
    const bottomY = centerY + bandH / 2;

    // Edge softness determines how far the fade extends beyond the band
    const fadeExtent = p.edgeSoftness * bandH * 0.5;

    // Render horizontal fog band with noise-modulated edges
    const sliceCount = Math.ceil(w / 2);
    for (let i = 0; i < sliceCount; i++) {
      const x = bounds.x + (i / sliceCount) * w;
      const sliceW = w / sliceCount + 1;

      // Noise modulates the vertical position of edges
      const nx = i / sliceCount;
      const noiseVal = noise(nx * 4, p.seed * 0.01);
      const edgeOffset = (noiseVal - 0.5) * bandH * 0.3;

      const sliceTop = topY + edgeOffset;
      const sliceBottom = bottomY - edgeOffset * 0.5;
      const sliceH = sliceBottom - sliceTop;

      if (sliceH <= 0) continue;

      // Vertical gradient for soft edges
      const gradient = ctx.createLinearGradient(x, sliceTop - fadeExtent, x, sliceBottom + fadeExtent);
      gradient.addColorStop(0, `rgba(${r},${g},${b},0)`);
      gradient.addColorStop(fadeExtent > 0 ? fadeExtent / (sliceH + fadeExtent * 2) : 0, `rgba(${r},${g},${b},${p.opacity})`);
      gradient.addColorStop(fadeExtent > 0 ? 1 - fadeExtent / (sliceH + fadeExtent * 2) : 1, `rgba(${r},${g},${b},${p.opacity})`);
      gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(x, sliceTop - fadeExtent, sliceW, sliceH + fadeExtent * 2);
    }

    // Draw wisps (small tendrils extending from the main fog body)
    if (p.wispDensity > 0) {
      const wispCount = Math.round(p.wispDensity * 30);
      for (let i = 0; i < wispCount; i++) {
        const wx = bounds.x + rng() * w;
        // Wisps emerge from top or bottom edge
        const fromTop = rng() > 0.5;
        const wy = fromTop
          ? topY - rng() * bandH * 0.3
          : bottomY + rng() * bandH * 0.3;
        const wispW = (20 + rng() * 60) * (w / 800);
        const wispH = (5 + rng() * 15) * (h / 600);
        const wispAlpha = p.opacity * (0.2 + rng() * 0.3);

        ctx.fillStyle = `rgba(${r},${g},${b},${wispAlpha})`;
        ctx.beginPath();
        ctx.ellipse(wx, wy, wispW / 2, wispH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown fog preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
