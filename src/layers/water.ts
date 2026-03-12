import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { parseHex, darken } from "../shared/color-utils.js";
import { mulberry32 } from "../shared/prng.js";
import { createValueNoise } from "../shared/noise.js";
import { createDepthLaneProperty } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { WaterPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const WATER_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Water Type",
    type: "select",
    default: "still-lake",
    group: "preset",
    options: [
      { value: "still-lake", label: "Still Lake" },
      { value: "choppy-sea", label: "Choppy Sea" },
      { value: "mountain-stream", label: "Mountain Stream" },
      { value: "river", label: "River" },
      { value: "pond", label: "Pond" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  { key: "waterlinePosition", label: "Waterline Position", type: "number", default: 0.6, min: 0.1, max: 0.95, step: 0.05, group: "layout" },
  { key: "rippleFrequency", label: "Ripple Frequency", type: "number", default: 8, min: 1, max: 40, step: 1, group: "waves" },
  { key: "rippleAmplitude", label: "Ripple Amplitude", type: "number", default: 0.5, min: 0, max: 5, step: 0.1, group: "waves" },
  {
    key: "rippleMode",
    label: "Ripple Mode",
    type: "select",
    default: "sine",
    group: "waves",
    options: [
      { value: "sine", label: "Sine" },
      { value: "noise", label: "Noise" },
    ],
  },
  { key: "waterColor", label: "Water Color", type: "color", default: "#2A4A6B", group: "colors" },
  { key: "depthDarkening", label: "Depth Darkening", type: "number", default: 0.4, min: 0, max: 1, step: 0.05, group: "style" },
  { key: "shimmerIntensity", label: "Shimmer Intensity", type: "number", default: 0.15, min: 0, max: 1, step: 0.05, group: "style" },
  createDepthLaneProperty("midground"),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  waterlinePosition: number;
  rippleFrequency: number;
  rippleAmplitude: number;
  rippleMode: "sine" | "noise";
  waterColor: string;
  depthDarkening: number;
  shimmerIntensity: number;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const wp = preset?.category === "water" ? (preset as WaterPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    waterlinePosition: (properties.waterlinePosition as number) ?? wp?.waterlinePosition ?? 0.6,
    rippleFrequency: (properties.rippleFrequency as number) ?? wp?.rippleFrequency ?? 8,
    rippleAmplitude: (properties.rippleAmplitude as number) ?? wp?.rippleAmplitude ?? 0.5,
    rippleMode: (properties.rippleMode as "sine" | "noise") ?? wp?.rippleMode ?? "sine",
    waterColor: (properties.waterColor as string) || wp?.waterColor || "#2A4A6B",
    depthDarkening: (properties.depthDarkening as number) ?? wp?.depthDarkening ?? 0.4,
    shimmerIntensity: (properties.shimmerIntensity as number) ?? wp?.shimmerIntensity ?? 0.15,
  };
}

export const waterLayerType: LayerTypeDefinition = {
  typeId: "terrain:water",
  displayName: "Water",
  icon: "water",
  category: "draw",
  properties: WATER_PROPERTIES,
  propertyEditorId: "terrain:water-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(WATER_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const { width, height, x: bx, y: by } = bounds;

    const waterTop = by + height * p.waterlinePosition;
    const waterHeight = height - height * p.waterlinePosition;

    if (waterHeight <= 0) return;

    // Fill water zone with vertical gradient (darkens toward bottom)
    const [wr, wg, wb] = parseHex(p.waterColor);
    const darkened = darken(p.waterColor, 1 - p.depthDarkening);
    const [dr, dg, db] = parseHex(darkened);

    const waterGrad = ctx.createLinearGradient(bx, waterTop, bx, by + height);
    waterGrad.addColorStop(0, `rgb(${wr},${wg},${wb})`);
    waterGrad.addColorStop(1, `rgb(${dr},${dg},${db})`);

    ctx.fillStyle = waterGrad;
    ctx.fillRect(bx, waterTop, width, waterHeight);

    // Draw wave lines
    const rng = mulberry32(p.seed);
    const noise = p.rippleMode === "noise" ? createValueNoise(p.seed) : null;
    const lineCount = Math.max(3, Math.round(p.rippleFrequency * 1.5));

    ctx.strokeStyle = `rgba(255,255,255,0.15)`;
    ctx.lineWidth = 0.5;

    for (let i = 0; i < lineCount; i++) {
      const t = (i + 0.5) / lineCount; // 0 = top of water, 1 = bottom
      const lineY = waterTop + t * waterHeight;
      const alpha = Math.max(0.03, 0.2 * (1 - t));

      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = Math.max(0.3, 1 - t * 0.5);

      ctx.beginPath();
      const step = Math.max(2, Math.round(width / 200));
      for (let px = 0; px <= width; px += step) {
        let offset: number;
        if (noise) {
          offset = (noise(px * 0.01, i * 5) - 0.5) * p.rippleAmplitude * 4;
        } else {
          const freq = p.rippleFrequency * 0.05;
          offset = Math.sin(px * freq + i * 2 + rng() * 0.5) * p.rippleAmplitude;
        }

        if (px === 0) {
          ctx.moveTo(bx + px, lineY + offset);
        } else {
          ctx.lineTo(bx + px, lineY + offset);
        }
      }
      ctx.stroke();
    }

    // Shimmer highlights
    if (p.shimmerIntensity > 0) {
      const shimmerCount = Math.round(p.shimmerIntensity * 80);
      ctx.fillStyle = "rgba(255,255,255,0.4)";

      for (let i = 0; i < shimmerCount; i++) {
        const sx = bx + rng() * width;
        const depthT = rng() * 0.4; // shimmer concentrates near surface
        const sy = waterTop + depthT * waterHeight;
        const sw = 1 + rng() * 3;
        const sh = 0.5 + rng() * 1;
        const shimAlpha = (1 - depthT) * p.shimmerIntensity * 0.6;

        ctx.globalAlpha = shimAlpha;
        ctx.fillRect(sx, sy, sw, sh);
      }
      ctx.globalAlpha = 1;
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown water preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
