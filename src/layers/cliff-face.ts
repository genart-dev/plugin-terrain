import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { mulberry32 } from "../shared/prng.js";
import { parseHex, darken, lighten } from "../shared/color-utils.js";
import { createFractalNoise } from "../shared/noise.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { CliffFacePreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const CLIFF_FACE_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Cliff Type",
    type: "select",
    default: "granite-cliff",
    group: "preset",
    options: [
      { value: "granite-cliff", label: "Granite Cliff" },
      { value: "sandstone-wall", label: "Sandstone Wall" },
      { value: "basalt-columns", label: "Basalt Columns" },
      { value: "limestone-face", label: "Limestone Face" },
      { value: "shale-cliff", label: "Shale Cliff" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  {
    key: "textureMode",
    label: "Texture",
    type: "select",
    default: "sandstone",
    group: "texture",
    options: [
      { value: "sandstone", label: "Sandstone" },
      { value: "granite", label: "Granite" },
      { value: "basalt", label: "Basalt" },
      { value: "limestone", label: "Limestone" },
    ],
  },
  { key: "color", label: "Rock Color", type: "color", default: "#C4A070", group: "colors" },
  { key: "shadowColor", label: "Shadow Color", type: "color", default: "#7B4028", group: "colors" },
  { key: "height", label: "Height", type: "number", default: 0.6, min: 0.2, max: 1.0, step: 0.05, group: "layout" },
  { key: "xPosition", label: "X Position", type: "number", default: 0.0, min: 0.0, max: 0.7, step: 0.05, group: "layout" },
  { key: "width", label: "Width", type: "number", default: 0.4, min: 0.1, max: 0.9, step: 0.05, group: "layout" },
  { key: "roughness", label: "Roughness", type: "number", default: 0.5, min: 0, max: 1, step: 0.05, group: "texture" },
  { key: "ledgeCount", label: "Strata Count", type: "number", default: 5, min: 0, max: 12, step: 1, group: "texture" },
  createDepthLaneProperty("background"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  textureMode: string;
  color: string;
  shadowColor: string;
  height: number;
  xPosition: number;
  width: number;
  roughness: number;
  ledgeCount: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const cp = preset?.category === "cliff-face" ? (preset as CliffFacePreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    textureMode: (properties.textureMode as string) ?? cp?.textureMode ?? "sandstone",
    color: (properties.color as string) || cp?.color || "#C4A070",
    shadowColor: (properties.shadowColor as string) || cp?.shadowColor || "#7B4028",
    height: (properties.height as number) ?? cp?.height ?? 0.6,
    xPosition: (properties.xPosition as number) ?? cp?.xPosition ?? 0.0,
    width: (properties.width as number) ?? cp?.width ?? 0.4,
    roughness: (properties.roughness as number) ?? cp?.roughness ?? 0.5,
    ledgeCount: (properties.ledgeCount as number) ?? cp?.ledgeCount ?? 5,
    depthLane: (properties.depthLane as string) ?? "background",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

// Build the cliff top silhouette profile (STEPS+1 y-values, left to right)
function buildTopProfile(
  textureMode: string,
  roughness: number,
  cliffTopBase: number,
  cliffH: number,
  seed: number,
  rng: () => number,
): number[] {
  const STEPS = 80;
  const octaves = Math.max(2, Math.round(2 + roughness * 3));
  const noise = createFractalNoise(seed + 800, octaves);
  const profile: number[] = [];

  if (textureMode === "sandstone" || textureMode === "limestone") {
    // Near-flat cap with collapse notches (sandstone: 3-8%, limestone: slightly rougher)
    const ampFraction = textureMode === "limestone" ? 0.08 : 0.05;
    const baseTop = cliffTopBase + cliffH * 0.03;
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const nv = noise(t * 3.0 + 10, 0.2);
      profile.push(baseTop - (nv - 0.5) * cliffH * ampFraction * (0.5 + roughness));
    }
    // Add 1-3 collapse notches that drop 10-25% of cliff height
    const notchCount = 1 + Math.floor(rng() * 3);
    for (let n = 0; n < notchCount; n++) {
      const notchCenter = 0.1 + rng() * 0.8;
      const notchHalfWidth = 0.03 + rng() * 0.07;
      const notchDepth = cliffH * (0.10 + rng() * 0.15);
      for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS;
        const dist = Math.abs(t - notchCenter) / notchHalfWidth;
        if (dist < 1.0) {
          profile[i]! += notchDepth * (1 - dist * dist);
        }
      }
    }
    // Limestone: extra high-frequency roughness on edge
    if (textureMode === "limestone") {
      const roughNoise = createFractalNoise(seed + 1600, 4);
      for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS;
        profile[i]! += (roughNoise(t * 14 + 50, 1.0) - 0.5) * cliffH * 0.06 * roughness;
      }
    }
  } else if (textureMode === "basalt") {
    // Stepped profile: broken column tops (5-13 columns across the width)
    const columnCount = 5 + Math.floor(rng() * 9);
    const colHeights: number[] = [];
    for (let c = 0; c <= columnCount; c++) {
      colHeights.push(cliffTopBase + (rng() - 0.35) * cliffH * 0.12 * (0.4 + roughness));
    }
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const colIdx = Math.min(columnCount - 1, Math.floor(t * columnCount));
      profile.push(colHeights[colIdx]!);
    }
  } else {
    // Granite: angular fractal noise (10-20% amplitude per references)
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const nv = noise(t * (2.0 + roughness * 4.0) + 5, 0.0);
      profile.push(cliffTopBase - (nv - 0.3) * cliffH * (0.10 + roughness * 0.12));
    }
  }

  return profile;
}

// Trace the cliff silhouette path (does not call fill/stroke)
function traceSilhouette(
  ctx: CanvasRenderingContext2D,
  cliffLeft: number,
  cliffW: number,
  cliffBottom: number,
  topProfile: number[],
): void {
  const STEPS = topProfile.length - 1;
  ctx.moveTo(cliffLeft, cliffBottom);
  for (let i = 0; i <= STEPS; i++) {
    ctx.lineTo(cliffLeft + (i / STEPS) * cliffW, topProfile[i]!);
  }
  ctx.lineTo(cliffLeft + cliffW, cliffBottom);
  ctx.closePath();
}

// Sandstone: horizontal strata bands + dark desert varnish streaks
function renderSandstoneTexture(
  ctx: CanvasRenderingContext2D,
  cliffLeft: number,
  cliffW: number,
  cliffTop: number,
  cliffBottom: number,
  cliffH: number,
  ledgeCount: number,
  roughness: number,
  color: string,
  shadowColor: string,
  rng: () => number,
  noise: (x: number, y: number) => number,
): void {
  const [sr, sg, sb] = parseHex(shadowColor);
  const darkColor = darken(color, 0.6);
  const [dr, dg, db] = parseHex(darkColor);

  // Strata bands: non-uniform thickness, slight horizontal tilt
  const strataCount = Math.max(3, ledgeCount);
  let y = cliffTop;
  for (let i = 0; i < strataCount && y < cliffBottom; i++) {
    // Non-uniform thickness: 2-15% of cliff height
    const thickness = cliffH * (0.03 + rng() * 0.10 * (0.3 + roughness));
    const nextY = Math.min(cliffBottom, y + thickness);
    // Slight tilt: right edge offset by ±2% of cliff height
    const tiltOffset = (rng() - 0.5) * cliffH * 0.04;
    // Alternate between darker and slightly lighter bands
    const bandAlpha = 0.08 + rng() * 0.14;
    // Every few bands, draw a slightly darker "marker" band
    const isDark = rng() > 0.6;
    if (isDark) {
      ctx.fillStyle = `rgba(${sr},${sg},${sb},${bandAlpha + 0.08})`;
    } else {
      ctx.fillStyle = `rgba(${dr},${dg},${db},${bandAlpha * 0.5})`;
    }
    ctx.beginPath();
    ctx.moveTo(cliffLeft, y);
    ctx.lineTo(cliffLeft + cliffW, y + tiltOffset);
    ctx.lineTo(cliffLeft + cliffW, nextY + tiltOffset);
    ctx.lineTo(cliffLeft, nextY);
    ctx.closePath();
    ctx.fill();
    y = nextY + cliffH * (0.005 + rng() * 0.008); // small gap between bands
  }

  // Desert varnish streaks: dark vertical lines descending from top
  const streakCount = Math.round(3 + roughness * 8);
  for (let i = 0; i < streakCount; i++) {
    const sx = cliffLeft + rng() * cliffW;
    const streakAlpha = 0.15 + rng() * 0.20;
    const streakWidth = 0.5 + rng() * 2.0;
    // Streaks have a slight wobble as they descend
    const wobble = (rng() - 0.5) * cliffW * 0.03;
    ctx.strokeStyle = `rgba(${sr},${sg},${sb},${streakAlpha})`;
    ctx.lineWidth = streakWidth;
    ctx.beginPath();
    ctx.moveTo(sx, cliffTop);
    ctx.bezierCurveTo(
      sx + wobble, cliffTop + cliffH * 0.33,
      sx - wobble * 0.5, cliffTop + cliffH * 0.66,
      sx + wobble * 0.3, cliffBottom,
    );
    ctx.stroke();
  }
}

// Granite: vertical master joints + crosscutting joints + exfoliation sheets
// References: master joints 5-15% cliff width apart, near-vertical with slight splay;
// crosscutting joints at 20-50° different angle; exfoliation sheets broad horizontal curves.
function renderGraniteTexture(
  ctx: CanvasRenderingContext2D,
  cliffLeft: number,
  cliffW: number,
  cliffTop: number,
  cliffBottom: number,
  cliffH: number,
  ledgeCount: number,
  roughness: number,
  shadowColor: string,
  rng: () => number,
): void {
  const [sr, sg, sb] = parseHex(shadowColor);

  // Master vertical joints: 4-8 total, irregularly spaced 8-20% of cliff width
  const masterCount = 4 + Math.round(roughness * 4);
  let x = cliffLeft + cliffW * (0.05 + rng() * 0.08);
  for (let j = 0; j < masterCount && x < cliffLeft + cliffW * 0.95; j++) {
    const jAlpha = 0.12 + rng() * 0.16; // more visible than before
    const jWidth = 0.5 + rng() * 1.2;
    const jLenFraction = 0.55 + rng() * 0.45;
    const jStartY = cliffTop + rng() * cliffH * 0.15;
    const jEndY = Math.min(cliffBottom, jStartY + cliffH * jLenFraction);
    const splay = (rng() - 0.5) * cliffW * 0.04; // slight tilt ±2% of cliff width

    ctx.strokeStyle = `rgba(${sr},${sg},${sb},${jAlpha})`;
    ctx.lineWidth = jWidth;
    ctx.beginPath();
    ctx.moveTo(x, jStartY);
    // Slight bezier waviness — rock joints aren't perfectly straight
    const cpx = x + (rng() - 0.5) * cliffW * 0.015;
    ctx.quadraticCurveTo(cpx, jStartY + (jEndY - jStartY) * 0.5, x + splay, jEndY);
    ctx.stroke();

    // Advance by an irregular gap (8-20% of cliff width)
    x += cliffW * (0.08 + rng() * 0.12);
  }

  // Crosscutting joints: 2-4 joints at significantly different angle (20-45°)
  const crossCount = 2 + Math.round(roughness * 2);
  const crossAngle = 0.35 + rng() * 0.45; // 20-45° from vertical
  for (let j = 0; j < crossCount; j++) {
    const cx = cliffLeft + (0.1 + rng() * 0.8) * cliffW;
    const cy = cliffTop + rng() * cliffH * 0.5;
    const crossLen = cliffH * (0.25 + rng() * 0.35);
    const cAlpha = 0.07 + rng() * 0.09;

    ctx.strokeStyle = `rgba(${sr},${sg},${sb},${cAlpha})`;
    ctx.lineWidth = 0.4 + rng() * 0.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.sin(crossAngle) * crossLen,
      Math.min(cliffBottom, cy + Math.cos(crossAngle) * crossLen),
    );
    ctx.stroke();
  }

  // Broad exfoliation sheets: 2-4 large, slightly curved horizontal sweeps
  const sheetCount = Math.max(2, Math.round(2 + roughness * 2));
  for (let i = 0; i < sheetCount; i++) {
    const sy = cliffTop + (i + 0.5) / sheetCount * cliffH * 0.85;
    const alpha = 0.12 + rng() * 0.10;
    const arcBow = (rng() - 0.5) * cliffH * 0.04; // slight bow in the sheet
    ctx.strokeStyle = `rgba(${sr},${sg},${sb},${alpha})`;
    ctx.lineWidth = 1.0 + rng() * 2.0;
    ctx.beginPath();
    ctx.moveTo(cliffLeft + cliffW * 0.05, sy + (rng() - 0.5) * 6);
    ctx.quadraticCurveTo(
      cliffLeft + cliffW * 0.5, sy + arcBow,
      cliffLeft + cliffW * 0.95, sy + (rng() - 0.5) * 6,
    );
    ctx.stroke();
  }
}

// Basalt: vertical column joints
function renderBasaltTexture(
  ctx: CanvasRenderingContext2D,
  cliffLeft: number,
  cliffW: number,
  topProfile: number[],
  cliffTop: number,
  cliffBottom: number,
  cliffH: number,
  roughness: number,
  shadowColor: string,
  rng: () => number,
): void {
  const [sr, sg, sb] = parseHex(shadowColor);
  const STEPS = topProfile.length - 1;

  // Column joints descend from top profile
  const columnCount = 6 + Math.round(rng() * 10 * (0.5 + roughness));
  for (let c = 0; c < columnCount; c++) {
    const t = c / columnCount;
    const cx = cliffLeft + t * cliffW;
    // Find the top profile y at this x
    const colIdx = Math.min(STEPS, Math.round(t * STEPS));
    const colTopY = topProfile[colIdx] ?? cliffTop;
    const colAlpha = 0.20 + rng() * 0.20;
    const colWidth = 0.5 + rng() * 1.0;
    // Column joint descends to bottom with slight horizontal wobble
    const wobble = (rng() - 0.5) * cliffW * 0.02;

    ctx.strokeStyle = `rgba(${sr},${sg},${sb},${colAlpha})`;
    ctx.lineWidth = colWidth;
    ctx.beginPath();
    ctx.moveTo(cx, colTopY);
    ctx.bezierCurveTo(cx + wobble * 0.3, colTopY + cliffH * 0.33, cx - wobble * 0.5, colTopY + cliffH * 0.66, cx + wobble, cliffBottom);
    ctx.stroke();
  }

  // Entablature zone (irregular jointing in upper 20-35%): add cross-hatching
  const entablatureH = cliffH * (0.20 + roughness * 0.15);
  const entablatureBottom = cliffTop + entablatureH;
  const crackCount = 4 + Math.round(roughness * 8);
  for (let i = 0; i < crackCount; i++) {
    const cx = cliffLeft + rng() * cliffW;
    const cy = cliffTop + rng() * entablatureH;
    const angle = (rng() - 0.5) * Math.PI * 0.6;
    const len = cliffW * 0.05 + rng() * cliffW * 0.12;
    ctx.strokeStyle = `rgba(${sr},${sg},${sb},${0.15 + rng() * 0.15})`;
    ctx.lineWidth = 0.4 + rng() * 0.8;
    ctx.beginPath();
    ctx.moveTo(cx, Math.min(entablatureBottom, cy));
    ctx.lineTo(cx + Math.cos(angle) * len, Math.min(entablatureBottom, cy + Math.sin(angle) * len));
    ctx.stroke();
  }
}

// Limestone: mixed horizontal and irregular crack system
function renderLimestoneTexture(
  ctx: CanvasRenderingContext2D,
  cliffLeft: number,
  cliffW: number,
  cliffTop: number,
  cliffBottom: number,
  cliffH: number,
  ledgeCount: number,
  roughness: number,
  shadowColor: string,
  rng: () => number,
): void {
  const [sr, sg, sb] = parseHex(shadowColor);
  const totalCracks = ledgeCount + Math.round(roughness * 8);

  for (let i = 0; i < totalCracks; i++) {
    const isHorizontal = rng() > 0.35;
    const alpha = 0.08 + rng() * 0.14;
    ctx.strokeStyle = `rgba(${sr},${sg},${sb},${alpha})`;
    ctx.lineWidth = 0.4 + rng() * 1.0;
    ctx.beginPath();
    if (isHorizontal) {
      const y = cliffTop + rng() * cliffH;
      const x0 = cliffLeft + rng() * cliffW * 0.4;
      const x1 = cliffLeft + cliffW * (0.4 + rng() * 0.6);
      const midY = y + (rng() - 0.5) * cliffH * 0.05;
      ctx.moveTo(x0, y + (rng() - 0.5) * 4);
      ctx.quadraticCurveTo(x0 + (x1 - x0) * 0.5, midY, x1, y + (rng() - 0.5) * 4);
    } else {
      const x = cliffLeft + rng() * cliffW;
      const y0 = cliffTop + rng() * cliffH * 0.5;
      const y1 = y0 + cliffH * (0.1 + rng() * 0.5);
      ctx.moveTo(x, y0);
      ctx.lineTo(x + (rng() - 0.5) * cliffW * 0.1, Math.min(cliffBottom, y1));
    }
    ctx.stroke();
  }
}

export const cliffFaceLayerType: LayerTypeDefinition = {
  typeId: "terrain:cliff-face",
  displayName: "Cliff Face",
  icon: "cliff",
  category: "draw",
  properties: CLIFF_FACE_PROPERTIES,
  propertyEditorId: "terrain:cliff-face-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(CLIFF_FACE_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const rng = mulberry32(p.seed);
    const w = bounds.width;
    const h = bounds.height;

    // Apply atmospheric depth
    let color = p.color;
    let shadowColor = p.shadowColor;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        color = applyAtmosphericDepth(color, laneConfig.depth, p.atmosphericMode);
        shadowColor = applyAtmosphericDepth(shadowColor, laneConfig.depth, p.atmosphericMode);
      }
    }

    const cliffLeft = bounds.x + p.xPosition * w;
    const cliffW = p.width * w;
    const cliffBottom = bounds.y + h;
    const cliffH = p.height * h;
    const cliffTopBase = cliffBottom - cliffH;

    if (cliffW <= 0 || cliffH <= 0) return;

    // Generate top silhouette profile
    const topProfile = buildTopProfile(p.textureMode, p.roughness, cliffTopBase, cliffH, p.seed, rng);

    // Find actual min top y (highest point of silhouette) for texture bounds
    const minTopY = Math.min(...topProfile);

    // --- Fill cliff silhouette with base color ---
    ctx.fillStyle = color;
    ctx.beginPath();
    traceSilhouette(ctx, cliffLeft, cliffW, cliffBottom, topProfile);
    ctx.fill();

    // --- Clip and apply face shading + texture ---
    ctx.save();
    ctx.beginPath();
    traceSilhouette(ctx, cliffLeft, cliffW, cliffBottom, topProfile);
    ctx.clip();

    // Horizontal face gradient: lit (upper-left) → shadowed (right)
    // Shadow depth per rock type from references:
    // granite: 35-40% darker, sandstone: 40-50%, basalt: 45-55%
    const shadowAlpha =
      p.textureMode === "granite" ? 0.42 :
      p.textureMode === "sandstone" ? 0.52 :
      p.textureMode === "basalt" ? 0.60 :
      0.48; // limestone
    const [sr, sg, sb] = parseHex(shadowColor);
    const faceGrad = ctx.createLinearGradient(cliffLeft, 0, cliffLeft + cliffW, 0);
    faceGrad.addColorStop(0.0, `rgba(255,255,255,0.14)`); // lit highlight on left
    faceGrad.addColorStop(0.25, `rgba(${sr},${sg},${sb},0)`); // transparent mid-left
    faceGrad.addColorStop(1.0, `rgba(${sr},${sg},${sb},${shadowAlpha})`); // shadow right
    ctx.fillStyle = faceGrad;
    ctx.fillRect(cliffLeft, bounds.y, cliffW, h);

    // Texture pass (all clipped to silhouette)
    const octaves = Math.max(2, Math.round(2 + p.roughness * 3));
    const noise = createFractalNoise(p.seed + 1200, octaves);

    if (p.textureMode === "sandstone") {
      renderSandstoneTexture(
        ctx, cliffLeft, cliffW, minTopY, cliffBottom, cliffH,
        p.ledgeCount, p.roughness, color, shadowColor, rng, noise,
      );
    } else if (p.textureMode === "granite") {
      renderGraniteTexture(
        ctx, cliffLeft, cliffW, minTopY, cliffBottom, cliffH,
        p.ledgeCount, p.roughness, shadowColor, rng,
      );
    } else if (p.textureMode === "basalt") {
      renderBasaltTexture(
        ctx, cliffLeft, cliffW, topProfile, minTopY, cliffBottom, cliffH,
        p.roughness, shadowColor, rng,
      );
    } else {
      // limestone
      renderLimestoneTexture(
        ctx, cliffLeft, cliffW, minTopY, cliffBottom, cliffH,
        p.ledgeCount, p.roughness, shadowColor, rng,
      );
    }

    ctx.restore();
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown cliff-face preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
