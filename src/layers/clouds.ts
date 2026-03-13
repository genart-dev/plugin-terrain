import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { createFractalNoise } from "../shared/noise.js";
import { parseHex } from "../shared/color-utils.js";
import { createDepthLaneProperty } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { CloudPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const CLOUD_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Cloud Type",
    type: "select",
    default: "fair-weather",
    group: "preset",
    options: [
      { value: "fair-weather", label: "Fair Weather" },
      { value: "overcast", label: "Overcast" },
      { value: "wispy-high", label: "Wispy High" },
      { value: "storm-clouds", label: "Storm Clouds" },
      { value: "scattered", label: "Scattered" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  { key: "coverage", label: "Coverage", type: "number", default: 0.3, min: 0, max: 1, step: 0.05, group: "shape" },
  { key: "altitudeMin", label: "Altitude Min", type: "number", default: 0.1, min: 0, max: 1, step: 0.05, group: "shape" },
  { key: "altitudeMax", label: "Altitude Max", type: "number", default: 0.4, min: 0, max: 1, step: 0.05, group: "shape" },
  {
    key: "cloudType",
    label: "Formation",
    type: "select",
    default: "cumulus",
    group: "shape",
    options: [
      { value: "cumulus", label: "Cumulus" },
      { value: "stratus", label: "Stratus" },
      { value: "cirrus", label: "Cirrus" },
    ],
  },
  { key: "scale", label: "Scale", type: "number", default: 4.0, min: 1, max: 10, step: 0.5, group: "shape" },
  { key: "windDirection", label: "Wind Direction", type: "number", default: 0, min: -45, max: 45, step: 5, group: "shape" },
  { key: "cloudColor", label: "Cloud Color", type: "color", default: "#FFFFFF", group: "colors" },
  { key: "shadowColor", label: "Shadow Color", type: "color", default: "#A0A8B0", group: "colors" },
  { key: "softness", label: "Softness", type: "number", default: 0.5, min: 0.1, max: 1.0, step: 0.05, group: "style" },
  createDepthLaneProperty("overlay"),
];

type CloudType = "cumulus" | "stratus" | "cirrus";

function getNoiseParams(cloudType: CloudType): { octaves: number; lacunarity: number; gain: number; xScale: number; yScale: number; threshold: number } {
  switch (cloudType) {
    case "cumulus":
      return { octaves: 4, lacunarity: 2.0, gain: 0.5, xScale: 1, yScale: 1, threshold: 0.05 };
    case "stratus":
      return { octaves: 2, lacunarity: 2.0, gain: 0.5, xScale: 0.3, yScale: 1.5, threshold: 0.0 };
    case "cirrus":
      return { octaves: 5, lacunarity: 2.0, gain: 0.5, xScale: 0.5, yScale: 2.0, threshold: 0.25 };
  }
}

function resolveProps(properties: LayerProperties): {
  seed: number;
  coverage: number;
  altitudeMin: number;
  altitudeMax: number;
  cloudType: CloudType;
  scale: number;
  windDirection: number;
  cloudColor: string;
  shadowColor: string;
  softness: number;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const cp = preset?.category === "clouds" ? (preset as CloudPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    coverage: (properties.coverage as number) ?? cp?.coverage ?? 0.3,
    altitudeMin: (properties.altitudeMin as number) ?? cp?.altitudeMin ?? 0.1,
    altitudeMax: (properties.altitudeMax as number) ?? cp?.altitudeMax ?? 0.4,
    cloudType: (properties.cloudType as CloudType) ?? cp?.cloudType ?? "cumulus",
    scale: (properties.scale as number) ?? cp?.scale ?? 4.0,
    windDirection: (properties.windDirection as number) ?? cp?.windDirection ?? 0,
    cloudColor: (properties.cloudColor as string) || cp?.cloudColor || "#FFFFFF",
    shadowColor: (properties.shadowColor as string) || cp?.shadowColor || "#A0A8B0",
    softness: (properties.softness as number) ?? cp?.softness ?? 0.5,
  };
}

export const cloudsLayerType: LayerTypeDefinition = {
  typeId: "terrain:clouds",
  displayName: "Clouds",
  icon: "cloud",
  category: "draw",
  properties: CLOUD_PROPERTIES,
  propertyEditorId: "terrain:clouds-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(CLOUD_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const { width, height, x: bx, y: by } = bounds;

    const noiseParams = getNoiseParams(p.cloudType);
    const noise = createFractalNoise(p.seed, noiseParams.octaves, noiseParams.lacunarity, noiseParams.gain);
    const shadowNoise = createFractalNoise(p.seed + 5333, 2, 2.0, 0.5);

    const bandTop = Math.round(by + height * p.altitudeMin);
    const bandBottom = Math.round(by + height * p.altitudeMax);
    const bandHeight = bandBottom - bandTop;

    if (bandHeight <= 0) return;

    // Cloud threshold from coverage: lower threshold = more clouds
    // Formula tuned so coverage=0.2 cirrus still produces visible clouds
    const threshold = 0.3 + (1 - p.coverage) * 0.4 + noiseParams.threshold * 0.15;

    const [cr, cg, cb] = parseHex(p.cloudColor);
    const [sr, sg, sb] = parseHex(p.shadowColor);

    // Wind shear offset
    const windRad = (p.windDirection * Math.PI) / 180;
    const windShearX = Math.sin(windRad) * 0.3;

    // Render at half resolution for performance, then scale up
    const renderScale = 0.5;
    const rw = Math.max(1, Math.round(width * renderScale));
    const rh = Math.max(1, Math.round(bandHeight * renderScale));

    const imageData = ctx.createImageData(rw, rh);
    const data = imageData.data;

    for (let ry = 0; ry < rh; ry++) {
      const worldY = ry / rh;
      for (let rx = 0; rx < rw; rx++) {
        const worldX = rx / rw;

        const nx = (worldX + windShearX * worldY) * p.scale * noiseParams.xScale;
        const ny = worldY * p.scale * noiseParams.yScale;

        const n = noise(nx, ny);

        if (n > threshold) {
          // Distance above threshold determines opacity
          const aboveThreshold = (n - threshold) / Math.max(0.01, 1 - threshold);
          const alpha = Math.min(1, aboveThreshold / Math.max(0.15, p.softness * 0.6));

          // Shadow on cloud undersides (lower portion of cloud form)
          const shadowVal = shadowNoise(nx + 0.5, ny + 0.3);
          const isShadow = worldY > 0.5 && shadowVal > 0.5;
          const shadowMix = isShadow ? (shadowVal - 0.5) * 0.6 : 0;

          const r = Math.round(cr * (1 - shadowMix) + sr * shadowMix);
          const g = Math.round(cg * (1 - shadowMix) + sg * shadowMix);
          const b = Math.round(cb * (1 - shadowMix) + sb * shadowMix);

          const idx = (ry * rw + rx) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = Math.round(alpha * 255);
        }
      }
    }

    // Draw at half resolution then stretch
    const tempCanvas = new OffscreenCanvas(rw, rh);
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.putImageData(imageData, 0, 0);

    ctx.drawImage(tempCanvas, bx, bandTop, width, bandHeight);
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown cloud preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
