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
import type { StarfieldPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const STARFIELD_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Star Field",
    type: "select",
    default: "clear-night",
    group: "preset",
    options: [
      { value: "clear-night", label: "Clear Night" },
      { value: "dense-starfield", label: "Dense Starfield" },
      { value: "milky-way", label: "Milky Way" },
      { value: "sparse-stars", label: "Sparse Stars" },
      { value: "twilight-stars", label: "Twilight Stars" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  { key: "starCount", label: "Star Count", type: "number", default: 200, min: 20, max: 1000, step: 10, group: "stars" },
  { key: "brightnessRange", label: "Brightness Range", type: "number", default: 0.7, min: 0.1, max: 1.0, step: 0.05, group: "stars" },
  { key: "maxSize", label: "Max Star Size", type: "number", default: 3.0, min: 0.5, max: 6.0, step: 0.5, group: "stars" },
  { key: "starColor", label: "Star Color", type: "color", default: "#FFFFFF", group: "colors" },
  { key: "warmTint", label: "Warm Tint", type: "number", default: 0.1, min: 0, max: 1.0, step: 0.05, group: "colors" },
  { key: "milkyWayEnabled", label: "Milky Way Band", type: "boolean", default: false, group: "milky-way" },
  { key: "milkyWayAngle", label: "Milky Way Angle", type: "number", default: 30, min: -90, max: 90, step: 5, group: "milky-way" },
  { key: "milkyWayIntensity", label: "Milky Way Intensity", type: "number", default: 0.15, min: 0.05, max: 0.4, step: 0.05, group: "milky-way" },
  { key: "constellationHints", label: "Constellation Hints", type: "boolean", default: false, group: "stars" },
  createDepthLaneProperty("sky"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  starCount: number;
  brightnessRange: number;
  maxSize: number;
  starColor: string;
  warmTint: number;
  milkyWayEnabled: boolean;
  milkyWayAngle: number;
  milkyWayIntensity: number;
  constellationHints: boolean;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const sp = preset?.category === "starfield" ? (preset as StarfieldPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    starCount: (properties.starCount as number) ?? sp?.starCount ?? 200,
    brightnessRange: (properties.brightnessRange as number) ?? sp?.brightnessRange ?? 0.7,
    maxSize: (properties.maxSize as number) ?? sp?.maxSize ?? 3.0,
    starColor: (properties.starColor as string) || sp?.starColor || "#FFFFFF",
    warmTint: (properties.warmTint as number) ?? sp?.warmTint ?? 0.1,
    milkyWayEnabled: (properties.milkyWayEnabled as boolean) ?? sp?.milkyWayEnabled ?? false,
    milkyWayAngle: (properties.milkyWayAngle as number) ?? sp?.milkyWayAngle ?? 30,
    milkyWayIntensity: (properties.milkyWayIntensity as number) ?? sp?.milkyWayIntensity ?? 0.15,
    constellationHints: (properties.constellationHints as boolean) ?? sp?.constellationHints ?? false,
    depthLane: (properties.depthLane as string) ?? "sky",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

export const starfieldLayerType: LayerTypeDefinition = {
  typeId: "terrain:starfield",
  displayName: "Star Field",
  icon: "starfield",
  category: "draw",
  properties: STARFIELD_PROPERTIES,
  propertyEditorId: "terrain:starfield-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(STARFIELD_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const rng = mulberry32(p.seed);
    const noise = createValueNoise(p.seed + 500);
    const w = bounds.width;
    const h = bounds.height;

    // Apply atmospheric depth to star color
    let starColor = p.starColor;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        starColor = applyAtmosphericDepth(starColor, laneConfig.depth, p.atmosphericMode);
      }
    }

    const [sr, sg, sb] = parseHex(starColor);

    // Milky Way band (rendered as soft diffuse band via ImageData)
    if (p.milkyWayEnabled) {
      const angleRad = (p.milkyWayAngle * Math.PI) / 180;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);
      const bandWidth = h * 0.25;

      // Render milky way at half resolution for performance
      const mwScale = 0.5;
      const mwW = Math.max(1, Math.round(w * mwScale));
      const mwH = Math.max(1, Math.round(h * mwScale));
      const mwData = ctx.createImageData(mwW, mwH);
      const mwPx = mwData.data;

      for (let py = 0; py < mwH; py++) {
        for (let px = 0; px < mwW; px++) {
          // World position relative to center
          const wx = (px / mwW - 0.5) * w;
          const wy = (py / mwH - 0.5) * h;

          // Rotate to band-aligned coordinates
          const along = wx * cosA + wy * sinA;
          const perp = -wx * sinA + wy * cosA;

          // Perpendicular falloff (Gaussian-like)
          const perpT = perp / bandWidth;
          const falloff = Math.exp(-perpT * perpT * 3);
          if (falloff < 0.01) continue;

          // Noise for cloud-like structure
          const n1 = noise(along * 0.008 + p.seed * 0.1, perpT * 2);
          const n2 = noise(along * 0.02 + 50, perpT * 4 + 30);
          const cloudiness = n1 * 0.7 + n2 * 0.3;

          const alpha = p.milkyWayIntensity * falloff * cloudiness;
          if (alpha < 0.003) continue;

          const idx = (py * mwW + px) * 4;
          mwPx[idx] = sr;
          mwPx[idx + 1] = sg;
          mwPx[idx + 2] = sb;
          mwPx[idx + 3] = Math.round(Math.min(1, alpha) * 255);
        }
      }

      const mwCanvas = new OffscreenCanvas(mwW, mwH);
      const mwCtx = mwCanvas.getContext("2d")!;
      mwCtx.putImageData(mwData, 0, 0);
      ctx.drawImage(mwCanvas, bounds.x, bounds.y, w, h);
    }

    // Generate constellation hint points (connected bright stars)
    const constellationStars: Array<{ x: number; y: number }> = [];

    // Individual stars
    for (let i = 0; i < p.starCount; i++) {
      const x = bounds.x + rng() * w;
      const y = bounds.y + rng() * h;

      // Magnitude-based sizing: most stars are tiny, few are large
      const magnitude = rng();
      const size = p.maxSize * Math.pow(magnitude, 3); // cubic falloff = mostly tiny
      const brightness = (1 - p.brightnessRange) + p.brightnessRange * (0.3 + magnitude * 0.7);

      // Warm/cool tint variation
      let r = sr, g = sg, b = sb;
      if (p.warmTint > 0 && rng() < 0.3) {
        // Some stars get warm tint (yellow/orange)
        const tintAmount = rng() * p.warmTint;
        r = Math.min(255, sr + tintAmount * 80);
        g = Math.min(255, sg + tintAmount * 40);
        b = Math.max(0, sb - tintAmount * 60);
      } else if (rng() < 0.15) {
        // Some stars get cool tint (blue)
        r = Math.max(0, sr - 30);
        g = Math.max(0, sg - 10);
        b = Math.min(255, sb + 30);
      }

      // Twinkle: small glow around brighter stars (capped radius)
      if (size > p.maxSize * 0.6) {
        const glowRadius = Math.min(size * 1.5, 4);
        const glowAlpha = brightness * 0.12;
        ctx.fillStyle = `rgba(${r},${g},${b},${glowAlpha})`;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Collect for constellation hints
        if (p.constellationHints && constellationStars.length < 12) {
          constellationStars.push({ x, y });
        }
      }

      // Star dot
      ctx.fillStyle = `rgba(${r},${g},${b},${brightness})`;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.5, size), 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw constellation hint lines between nearby bright stars
    if (p.constellationHints && constellationStars.length >= 3) {
      ctx.strokeStyle = `rgba(${sr},${sg},${sb},0.12)`;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < constellationStars.length - 1; i++) {
        const a = constellationStars[i]!;
        const b = constellationStars[i + 1]!;
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        if (dist < w * 0.25) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown starfield preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
