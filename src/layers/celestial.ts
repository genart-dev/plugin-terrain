import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { mulberry32 } from "../shared/prng.js";
import { parseHex, lerpColor } from "../shared/color-utils.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { CelestialPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const CELESTIAL_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Celestial Body",
    type: "select",
    default: "noon-sun",
    group: "preset",
    options: [
      { value: "noon-sun", label: "Noon Sun" },
      { value: "golden-hour-sun", label: "Golden Hour" },
      { value: "harvest-moon", label: "Harvest Moon" },
      { value: "crescent-moon", label: "Crescent Moon" },
      { value: "blood-moon", label: "Blood Moon" },
      { value: "polar-star", label: "Polar Star" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  {
    key: "bodyType",
    label: "Body Type",
    type: "select",
    default: "sun",
    group: "body",
    options: [
      { value: "sun", label: "Sun" },
      { value: "moon", label: "Moon" },
      { value: "star", label: "Star" },
    ],
  },
  { key: "elevation", label: "Elevation", type: "number", default: 0.85, min: 0.0, max: 1.0, step: 0.01, group: "position" },
  { key: "azimuth", label: "Azimuth", type: "number", default: 0.5, min: 0.0, max: 1.0, step: 0.01, group: "position" },
  { key: "size", label: "Size", type: "number", default: 0.04, min: 0.005, max: 0.15, step: 0.005, group: "body" },
  { key: "glowRadius", label: "Glow Radius", type: "number", default: 0.15, min: 0.0, max: 0.5, step: 0.01, group: "glow" },
  { key: "glowColor", label: "Glow Color", type: "color", default: "#FFFDE0", group: "glow" },
  { key: "bodyColor", label: "Body Color", type: "color", default: "#FFFFFF", group: "body" },
  { key: "moonPhase", label: "Moon Phase", type: "number", default: 1.0, min: 0.0, max: 1.0, step: 0.05, group: "body" },
  { key: "lightPathEnabled", label: "Light Path", type: "boolean", default: false, group: "light-path" },
  { key: "lightPathColor", label: "Light Path Color", type: "color", default: "#FFFFFF", group: "light-path" },
  createDepthLaneProperty("sky"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  bodyType: string;
  elevation: number;
  azimuth: number;
  size: number;
  glowRadius: number;
  glowColor: string;
  bodyColor: string;
  moonPhase: number;
  lightPathEnabled: boolean;
  lightPathColor: string;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const cp = preset?.category === "celestial" ? (preset as CelestialPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    bodyType: (properties.bodyType as string) ?? cp?.bodyType ?? "sun",
    elevation: (properties.elevation as number) ?? cp?.elevation ?? 0.85,
    azimuth: (properties.azimuth as number) ?? cp?.azimuth ?? 0.5,
    size: (properties.size as number) ?? cp?.size ?? 0.04,
    glowRadius: (properties.glowRadius as number) ?? cp?.glowRadius ?? 0.15,
    glowColor: (properties.glowColor as string) || cp?.glowColor || "#FFFDE0",
    bodyColor: (properties.bodyColor as string) || cp?.bodyColor || "#FFFFFF",
    moonPhase: (properties.moonPhase as number) ?? (cp as any)?.moonPhase ?? 1.0,
    lightPathEnabled: (properties.lightPathEnabled as boolean) ?? cp?.lightPathEnabled ?? false,
    lightPathColor: (properties.lightPathColor as string) || cp?.lightPathColor || "#FFFFFF",
    depthLane: (properties.depthLane as string) ?? "sky",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

export const celestialLayerType: LayerTypeDefinition = {
  typeId: "terrain:celestial",
  displayName: "Celestial Body",
  icon: "celestial",
  category: "draw",
  properties: CELESTIAL_PROPERTIES,
  propertyEditorId: "terrain:celestial-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(CELESTIAL_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const rng = mulberry32(p.seed);
    const w = bounds.width;
    const h = bounds.height;

    // Position: elevation 0=bottom, 1=top; azimuth 0=left, 1=right
    const cx = bounds.x + p.azimuth * w;
    const cy = bounds.y + (1 - p.elevation) * h;
    const bodyRadius = p.size * Math.min(w, h);
    const glowPx = p.glowRadius * Math.min(w, h);

    // Apply atmospheric depth to colors if enabled
    let glowColor = p.glowColor;
    let bodyColor = p.bodyColor;
    let lightPathColor = p.lightPathColor;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        glowColor = applyAtmosphericDepth(glowColor, laneConfig.depth, p.atmosphericMode);
        bodyColor = applyAtmosphericDepth(bodyColor, laneConfig.depth, p.atmosphericMode);
        lightPathColor = applyAtmosphericDepth(lightPathColor, laneConfig.depth, p.atmosphericMode);
      }
    }

    // Draw light path on water (vertical shimmer band below body)
    if (p.lightPathEnabled) {
      const pathWidth = bodyRadius * 3;
      const pathTop = cy + bodyRadius;
      const pathBottom = bounds.y + h;
      if (pathBottom > pathTop) {
        const pathH = pathBottom - pathTop;
        const segments = 20;
        for (let i = 0; i < segments; i++) {
          const t = i / segments;
          const segY = pathTop + t * pathH;
          const segH = pathH / segments + 1;
          // Shimmer widens toward bottom
          const spread = 1 + t * 2;
          const segW = pathWidth * spread;
          // Fade out toward bottom
          const alpha = 0.3 * (1 - t * 0.7);
          // Wobble for shimmer effect
          const wobble = (rng() - 0.5) * bodyRadius * 0.5 * (1 + t);

          const [r, g, b] = parseHex(lightPathColor);
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.fillRect(cx - segW / 2 + wobble, segY, segW, segH);
        }
      }
    }

    // Draw glow (radial gradient)
    if (glowPx > 0) {
      const gradient = ctx.createRadialGradient(cx, cy, bodyRadius * 0.5, cx, cy, glowPx);
      const [r, g, b] = parseHex(glowColor);
      gradient.addColorStop(0, `rgba(${r},${g},${b},0.6)`);
      gradient.addColorStop(0.4, `rgba(${r},${g},${b},0.2)`);
      gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, glowPx, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw body disk
    if (p.bodyType === "star") {
      // Star: small bright point with 4-spike cross
      ctx.fillStyle = bodyColor;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, bodyRadius, 0, Math.PI * 2);
      ctx.fill();

      // Cross spikes
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = bodyRadius * 0.3;
      ctx.globalAlpha = 0.7;
      const spikeLen = bodyRadius * 3;
      ctx.beginPath();
      ctx.moveTo(cx - spikeLen, cy);
      ctx.lineTo(cx + spikeLen, cy);
      ctx.moveTo(cx, cy - spikeLen);
      ctx.lineTo(cx, cy + spikeLen);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (p.bodyType === "moon") {
      // Moon: render to temp canvas for crescent masking
      const moonSize = Math.ceil(bodyRadius * 2.5);
      const moonCanvas = new OffscreenCanvas(moonSize * 2, moonSize * 2);
      const moonCtx = moonCanvas.getContext("2d")!;
      const mcx = moonSize;
      const mcy = moonSize;

      // Draw full moon disk
      moonCtx.fillStyle = bodyColor;
      moonCtx.beginPath();
      moonCtx.arc(mcx, mcy, bodyRadius, 0, Math.PI * 2);
      moonCtx.fill();

      // Subtle surface texture (craters)
      moonCtx.globalAlpha = 0.15;
      for (let i = 0; i < 5; i++) {
        const angle = rng() * Math.PI * 2;
        const dist = rng() * bodyRadius * 0.6;
        const craterR = bodyRadius * (0.05 + rng() * 0.12);
        const craterX = mcx + Math.cos(angle) * dist;
        const craterY = mcy + Math.sin(angle) * dist;
        const [r, g, b] = parseHex(bodyColor);
        moonCtx.fillStyle = `rgba(${Math.max(0, r - 40)},${Math.max(0, g - 40)},${Math.max(0, b - 40)},0.3)`;
        moonCtx.beginPath();
        moonCtx.arc(craterX, craterY, craterR, 0, Math.PI * 2);
        moonCtx.fill();
      }
      moonCtx.globalAlpha = 1;

      // Crescent masking: carve shadow for non-full phases
      if (p.moonPhase < 0.98) {
        moonCtx.globalCompositeOperation = "destination-out";
        moonCtx.fillStyle = "#000000";
        // Shadow circle offset: small offset = thin crescent, large = full moon
        // phase 0 = new moon (shadow centered, fully masked), 1 = full moon
        const shadowOffset = bodyRadius * 2 * p.moonPhase;
        moonCtx.beginPath();
        moonCtx.arc(mcx + shadowOffset, mcy, bodyRadius * 1.05, 0, Math.PI * 2);
        moonCtx.fill();
        moonCtx.globalCompositeOperation = "source-over";
      }

      // Composite moon onto main canvas
      ctx.drawImage(moonCanvas, cx - moonSize, cy - moonSize);
    } else {
      // Sun: bright disk
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(cx, cy, bodyRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown celestial preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
