import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { mulberry32 } from "../shared/prng.js";
import { parseHex, darken } from "../shared/color-utils.js";
import { createValueNoise } from "../shared/noise.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { ReflectionPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const REFLECTION_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Reflection Type",
    type: "select",
    default: "calm-lake",
    group: "preset",
    options: [
      { value: "calm-lake", label: "Calm Lake" },
      { value: "rippled-reflection", label: "Rippled Reflection" },
      { value: "dark-water", label: "Dark Water" },
      { value: "golden-reflection", label: "Golden Reflection" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  { key: "skyColor", label: "Sky Color", type: "color", default: "#87CEEB", group: "colors" },
  { key: "terrainColor", label: "Terrain Color", type: "color", default: "#3A5A30", group: "colors" },
  { key: "darkening", label: "Darkening", type: "number", default: 0.3, min: 0, max: 0.7, step: 0.05, group: "reflection" },
  { key: "rippleFrequency", label: "Ripple Frequency", type: "number", default: 0.5, min: 0, max: 1, step: 0.05, group: "reflection" },
  { key: "rippleAmplitude", label: "Ripple Amplitude", type: "number", default: 0.3, min: 0, max: 1, step: 0.05, group: "reflection" },
  { key: "waterlinePosition", label: "Waterline Position", type: "number", default: 0.5, min: 0.2, max: 0.9, step: 0.05, group: "layout" },
  { key: "blurAmount", label: "Blur Amount", type: "number", default: 0.4, min: 0, max: 1, step: 0.05, group: "reflection" },
  createDepthLaneProperty("ground-plane"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  skyColor: string;
  terrainColor: string;
  darkening: number;
  rippleFrequency: number;
  rippleAmplitude: number;
  waterlinePosition: number;
  blurAmount: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const rp = preset?.category === "reflection" ? (preset as ReflectionPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    skyColor: (properties.skyColor as string) || rp?.skyColor || "#87CEEB",
    terrainColor: (properties.terrainColor as string) || rp?.terrainColor || "#3A5A30",
    darkening: (properties.darkening as number) ?? rp?.darkening ?? 0.3,
    rippleFrequency: (properties.rippleFrequency as number) ?? rp?.rippleFrequency ?? 0.5,
    rippleAmplitude: (properties.rippleAmplitude as number) ?? rp?.rippleAmplitude ?? 0.3,
    waterlinePosition: (properties.waterlinePosition as number) ?? rp?.waterlinePosition ?? 0.5,
    blurAmount: (properties.blurAmount as number) ?? rp?.blurAmount ?? 0.4,
    depthLane: (properties.depthLane as string) ?? "ground-plane",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

let _warnedReflection = false;

/**
 * @deprecated Use `water:reflection` from `@genart-dev/plugin-water` instead.
 * This layer will be removed when plugin-water ships (Phase D).
 */
export const reflectionLayerType: LayerTypeDefinition = {
  typeId: "terrain:reflection",
  displayName: "Reflection",
  icon: "reflection",
  category: "draw",
  properties: REFLECTION_PROPERTIES,
  propertyEditorId: "terrain:reflection-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(REFLECTION_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    if (!_warnedReflection) {
      _warnedReflection = true;
      console.warn("[terrain] terrain:reflection is deprecated. Use water:reflection from @genart-dev/plugin-water.");
    }
    const p = resolveProps(properties);
    const rng = mulberry32(p.seed);
    const noise = createValueNoise(p.seed + 1000);
    const w = bounds.width;
    const h = bounds.height;

    // Apply atmospheric depth
    let skyColor = p.skyColor;
    let terrainColor = p.terrainColor;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        skyColor = applyAtmosphericDepth(skyColor, laneConfig.depth, p.atmosphericMode);
        terrainColor = applyAtmosphericDepth(terrainColor, laneConfig.depth, p.atmosphericMode);
      }
    }

    // Darken reflected colors
    const reflectedSky = darken(skyColor, 1 - p.darkening);
    const reflectedTerrain = darken(terrainColor, 1 - p.darkening);

    const waterTop = bounds.y + p.waterlinePosition * h;
    const waterH = bounds.y + h - waterTop;
    if (waterH <= 0) return;

    const [skyR, skyG, skyB] = parseHex(reflectedSky);
    const [terR, terG, terB] = parseHex(reflectedTerrain);

    // Render mirrored color bands with ripple distortion
    // The reflection is a simplified vertical flip: terrain near waterline, sky at bottom
    const sliceCount = Math.ceil(w / 2);
    for (let i = 0; i < sliceCount; i++) {
      const nx = i / sliceCount;
      const x = bounds.x + nx * w;
      const sliceW = w / sliceCount + 1;

      for (let row = 0; row < 20; row++) {
        const rowT = row / 20;
        const y = waterTop + rowT * waterH;
        const rowH = waterH / 20 + 1;

        // Noise-based ripple distortion
        const rippleN = noise(nx * (4 + p.rippleFrequency * 8), rowT * (3 + p.rippleFrequency * 6));
        const rippleOffset = (rippleN - 0.5) * p.rippleAmplitude * 30;

        // Blend from terrain (top of reflection) to sky (bottom of reflection)
        const t = rowT;
        // Terrain reflection near waterline, fading to sky reflection
        const terrainAmount = Math.max(0, 1 - t * 2.5);

        // Blur effect: bands get wider/more overlapping near bottom
        const blurAlpha = 1 - p.blurAmount * rowT * 0.5;

        const r = Math.round(terR * terrainAmount + skyR * (1 - terrainAmount));
        const g = Math.round(terG * terrainAmount + skyG * (1 - terrainAmount));
        const b = Math.round(terB * terrainAmount + skyB * (1 - terrainAmount));

        ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0.1, blurAlpha)})`;
        ctx.fillRect(x, y + rippleOffset, sliceW, rowH);
      }
    }

    // Add subtle ripple lines
    if (p.rippleFrequency > 0) {
      const lineCount = Math.round(p.rippleFrequency * 15);
      for (let i = 0; i < lineCount; i++) {
        const ly = waterTop + rng() * waterH;
        const n = noise(i * 0.5, p.seed * 0.01);
        const alpha = 0.05 + n * 0.1;
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(bounds.x, ly);
        // Wavy line across width
        const waveSegments = 10;
        for (let j = 1; j <= waveSegments; j++) {
          const wt = j / waveSegments;
          const wx = bounds.x + wt * w;
          const wy = ly + Math.sin(wt * Math.PI * 4 + i) * p.rippleAmplitude * 3;
          ctx.lineTo(wx, wy);
        }
        ctx.stroke();
      }
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown reflection preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
