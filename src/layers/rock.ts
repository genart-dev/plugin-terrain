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
import type { RockPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const ROCK_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Rock Type",
    type: "select",
    default: "granite-boulder",
    group: "preset",
    options: [
      { value: "granite-boulder", label: "Granite Boulder" },
      { value: "sandstone-outcrop", label: "Sandstone Outcrop" },
      { value: "shan-shui-rock", label: "Shan-Shui Rock" },
      { value: "mossy-rock", label: "Mossy Rock" },
      { value: "slate-shelf", label: "Slate Shelf" },
      { value: "volcanic-basalt", label: "Volcanic Basalt" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  {
    key: "rockType",
    label: "Form",
    type: "select",
    default: "boulder",
    group: "shape",
    options: [
      { value: "boulder", label: "Boulder" },
      { value: "outcrop", label: "Outcrop" },
      { value: "pinnacle", label: "Pinnacle" },
      { value: "shelf", label: "Shelf" },
    ],
  },
  {
    key: "textureMode",
    label: "Texture",
    type: "select",
    default: "speckled",
    group: "texture",
    options: [
      { value: "speckled", label: "Speckled" },
      { value: "striated", label: "Striated" },
      { value: "cun-fa", label: "Cun-Fa (Ink)" },
      { value: "cracked", label: "Cracked" },
    ],
  },
  { key: "color", label: "Rock Color", type: "color", default: "#8A8A8A", group: "colors" },
  { key: "shadowColor", label: "Shadow Color", type: "color", default: "#4A4A4A", group: "colors" },
  { key: "scale", label: "Scale", type: "number", default: 1.0, min: 0.3, max: 2.0, step: 0.1, group: "shape" },
  { key: "roughness", label: "Roughness", type: "number", default: 0.5, min: 0, max: 1, step: 0.05, group: "texture" },
  { key: "crackDensity", label: "Crack Density", type: "number", default: 0.3, min: 0, max: 1, step: 0.05, group: "texture" },
  createDepthLaneProperty("foreground"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  rockType: string;
  textureMode: string;
  color: string;
  shadowColor: string;
  scale: number;
  roughness: number;
  crackDensity: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const rp = preset?.category === "rock" ? (preset as RockPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    rockType: (properties.rockType as string) ?? rp?.rockType ?? "boulder",
    textureMode: (properties.textureMode as string) ?? rp?.textureMode ?? "speckled",
    color: (properties.color as string) || rp?.color || "#8A8A8A",
    shadowColor: (properties.shadowColor as string) || rp?.shadowColor || "#4A4A4A",
    scale: (properties.scale as number) ?? rp?.scale ?? 1.0,
    roughness: (properties.roughness as number) ?? rp?.roughness ?? 0.5,
    crackDensity: (properties.crackDensity as number) ?? rp?.crackDensity ?? 0.3,
    depthLane: (properties.depthLane as string) ?? "foreground",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

/** Generate a rock silhouette as an array of {x, y} points. */
function generateRockSilhouette(
  rng: () => number,
  cx: number,
  cy: number,
  w: number,
  h: number,
  rockType: string,
  roughness: number,
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const segments = 24;

  // Pre-generate per-segment jitter so first and last point match (closing the polygon
  // without a notch artifact at the seam on the right edge).
  const rxJitter: number[] = [];
  const ryJitter: number[] = [];
  for (let i = 0; i < segments; i++) {
    rxJitter.push(rng());
    ryJitter.push(rng());
  }

  for (let i = 0; i <= segments; i++) {
    const idx = i % segments; // wrap: last point reuses first point's jitter
    const t = i / segments;
    const angle = t * Math.PI * 2;

    let rx = w * 0.5;
    let ry = h * 0.5;

    // Shape variation based on rock type
    if (rockType === "boulder") {
      rx *= 0.9 + roughness * (rxJitter[idx]! - 0.5) * 0.4;
      ry *= 0.8 + roughness * (ryJitter[idx]! - 0.5) * 0.3;
    } else if (rockType === "outcrop") {
      // More angular, wider than tall
      rx *= 1.1 + roughness * (rxJitter[idx]! - 0.5) * 0.5;
      ry *= 0.7 + roughness * (ryJitter[idx]! - 0.5) * 0.4;
    } else if (rockType === "pinnacle") {
      // Tall and narrow, tapered top
      const taper = 1 - Math.abs(Math.sin(angle)) * 0.4;
      rx *= 0.6 * taper + roughness * (rxJitter[idx]! - 0.5) * 0.3;
      ry *= 1.3 + roughness * (ryJitter[idx]! - 0.5) * 0.3;
    } else if (rockType === "shelf") {
      // Flat and wide
      rx *= 1.3 + roughness * (rxJitter[idx]! - 0.5) * 0.3;
      ry *= 0.4 + roughness * (ryJitter[idx]! - 0.5) * 0.2;
    }

    points.push({
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
    });
  }

  return points;
}

export const rockLayerType: LayerTypeDefinition = {
  typeId: "terrain:rock",
  displayName: "Rock",
  icon: "rock",
  category: "draw",
  properties: ROCK_PROPERTIES,
  propertyEditorId: "terrain:rock-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(ROCK_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const rng = mulberry32(p.seed);
    const noise = createValueNoise(p.seed + 300);

    // Apply atmospheric depth to colors
    let color = p.color;
    let shadowColor = p.shadowColor;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        color = applyAtmosphericDepth(color, laneConfig.depth, p.atmosphericMode);
        shadowColor = applyAtmosphericDepth(shadowColor, laneConfig.depth, p.atmosphericMode);
      }
    }

    const cx = bounds.x + bounds.width * 0.5;
    const cy = bounds.y + bounds.height * 0.55; // slightly below center
    const w = bounds.width * 0.6 * p.scale;
    const h = bounds.height * 0.5 * p.scale;

    // Generate rock silhouette
    const silhouette = generateRockSilhouette(rng, cx, cy, w, h, p.rockType, p.roughness);

    // Draw shadow
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.moveTo(silhouette[0]!.x + 3, silhouette[0]!.y + 3);
    for (let i = 1; i < silhouette.length; i++) {
      ctx.lineTo(silhouette[i]!.x + 3, silhouette[i]!.y + 3);
    }
    ctx.closePath();
    ctx.globalAlpha = 0.4;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Draw rock body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(silhouette[0]!.x, silhouette[0]!.y);
    for (let i = 1; i < silhouette.length; i++) {
      ctx.lineTo(silhouette[i]!.x, silhouette[i]!.y);
    }
    ctx.closePath();
    ctx.fill();

    // Clip texture and highlights to the rock silhouette
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(silhouette[0]!.x, silhouette[0]!.y);
    for (let i = 1; i < silhouette.length; i++) {
      ctx.lineTo(silhouette[i]!.x, silhouette[i]!.y);
    }
    ctx.closePath();
    ctx.clip();

    // Apply texture
    if (p.textureMode === "speckled") {
      renderSpeckledTexture(ctx, rng, cx, cy, w, h, color, p.roughness);
    } else if (p.textureMode === "striated") {
      renderStriatedTexture(ctx, rng, cx, cy, w, h, shadowColor, p.roughness);
    } else if (p.textureMode === "cun-fa") {
      renderCunFaTexture(ctx, rng, cx, cy, w, h, shadowColor, p.roughness);
    } else if (p.textureMode === "cracked") {
      renderCrackedTexture(ctx, rng, cx, cy, w, h, shadowColor, p.crackDensity);
    }

    // Light highlight on top-left
    const highlightColor = lighten(color, 0.3);
    ctx.fillStyle = highlightColor;
    ctx.globalAlpha = 0.3;
    const hlCount = Math.round(20 * p.scale);
    for (let i = 0; i < hlCount; i++) {
      const hx = cx - w * 0.15 + rng() * w * 0.3;
      const hy = cy - h * 0.3 + rng() * h * 0.2;
      ctx.fillRect(hx, hy, 1 + rng() * 3, 1 + rng() * 2);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown rock preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};

// ---------------------------------------------------------------------------
// Texture renderers
// ---------------------------------------------------------------------------

function renderSpeckledTexture(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  cx: number, cy: number, w: number, h: number,
  color: string,
  roughness: number,
): void {
  const count = Math.round(roughness * 200);
  const darkSpeck = darken(color, 0.7);
  const lightSpeck = lighten(color, 0.2);

  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = rng() * 0.45;
    const sx = cx + Math.cos(angle) * w * dist;
    const sy = cy + Math.sin(angle) * h * dist;
    ctx.fillStyle = rng() > 0.5 ? darkSpeck : lightSpeck;
    ctx.globalAlpha = 0.2 + rng() * 0.3;
    ctx.fillRect(sx, sy, 1 + rng() * 2, 1 + rng() * 2);
  }
  ctx.globalAlpha = 1;
}

function renderStriatedTexture(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  cx: number, cy: number, w: number, h: number,
  shadowColor: string,
  roughness: number,
): void {
  const lineCount = Math.round(8 + roughness * 12);
  ctx.strokeStyle = shadowColor;

  for (let i = 0; i < lineCount; i++) {
    const ly = cy - h * 0.35 + (i / lineCount) * h * 0.7;
    const offset = (rng() - 0.5) * w * 0.1 * roughness;
    ctx.globalAlpha = 0.15 + rng() * 0.15;
    ctx.lineWidth = 0.5 + rng() * 1;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.35 + offset, ly);
    ctx.lineTo(cx + w * 0.35 + offset + (rng() - 0.5) * w * 0.1, ly + (rng() - 0.5) * 3);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function renderCunFaTexture(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  cx: number, cy: number, w: number, h: number,
  shadowColor: string,
  roughness: number,
): void {
  // Cun-fa: textural brush strokes used in Chinese landscape painting
  // Short, directional strokes that follow the rock's surface contour
  const strokeCount = Math.round(30 + roughness * 50);
  ctx.strokeStyle = shadowColor;

  for (let i = 0; i < strokeCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = rng() * 0.4;
    const sx = cx + Math.cos(angle) * w * dist;
    const sy = cy + Math.sin(angle) * h * dist;

    // Cun-fa strokes are short, slightly curved, with varying pressure
    const strokeLen = 3 + rng() * 8 * roughness;
    const strokeAngle = angle + Math.PI * 0.5 + (rng() - 0.5) * 0.8;
    const dx = Math.cos(strokeAngle) * strokeLen;
    const dy = Math.sin(strokeAngle) * strokeLen;

    ctx.globalAlpha = 0.2 + rng() * 0.4;
    ctx.lineWidth = 0.5 + rng() * 2.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    // Add slight curve for brush quality
    ctx.quadraticCurveTo(
      sx + dx * 0.5 + (rng() - 0.5) * 3,
      sy + dy * 0.5 + (rng() - 0.5) * 3,
      sx + dx,
      sy + dy,
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function renderCrackedTexture(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  cx: number, cy: number, w: number, h: number,
  shadowColor: string,
  crackDensity: number,
): void {
  const crackCount = Math.round(5 + crackDensity * 15);
  ctx.strokeStyle = shadowColor;

  for (let i = 0; i < crackCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = rng() * 0.35;
    let sx = cx + Math.cos(angle) * w * dist;
    let sy = cy + Math.sin(angle) * h * dist;

    ctx.globalAlpha = 0.3 + rng() * 0.3;
    ctx.lineWidth = 0.5 + rng() * 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);

    // Random walk crack
    const segments = 3 + Math.floor(rng() * 5);
    for (let j = 0; j < segments; j++) {
      sx += (rng() - 0.5) * w * 0.1;
      sy += (rng() - 0.5) * h * 0.1;
      ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
