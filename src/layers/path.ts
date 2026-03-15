import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { mulberry32 } from "../shared/prng.js";
import { darken, lighten } from "../shared/color-utils.js";
import { createValueNoise } from "../shared/noise.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import {
  getPathPresetCurve,
  samplePerspectiveCurve,
  drawPerspectiveRibbon,
  evalBezierNormal,
} from "../shared/perspective-curve.js";
import type { PathPresetType } from "../shared/perspective-curve.js";
import { getPreset } from "../presets/index.js";
import type { PathPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

type SurfaceStyle = "dirt" | "cobblestone" | "gravel" | "sand" | "worn-grass" | "flagstone";
type EdgeTreatment = "sharp" | "grass-encroach" | "scattered-stones" | "overgrown";

const PATH_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Path Type",
    type: "select",
    default: "dirt-trail",
    group: "preset",
    options: [
      { value: "dirt-trail", label: "Dirt Trail" },
      { value: "cobblestone-road", label: "Cobblestone Road" },
      { value: "gravel-path", label: "Gravel Path" },
      { value: "forest-path", label: "Forest Path" },
      { value: "mountain-switchback", label: "Mountain Switchback" },
      { value: "garden-walk", label: "Garden Walk" },
      { value: "sand-track", label: "Sand Track" },
      { value: "country-lane", label: "Country Lane" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  {
    key: "pathPreset",
    label: "Path Shape",
    type: "select",
    default: "winding",
    group: "shape",
    options: [
      { value: "straight", label: "Straight" },
      { value: "meandering", label: "Meandering" },
      { value: "winding", label: "Winding" },
      { value: "switchback", label: "Switchback" },
      { value: "fork", label: "Fork" },
    ],
  },
  { key: "widthNear", label: "Width (Near)", type: "number", default: 120, min: 10, max: 400, step: 5, group: "shape" },
  { key: "widthFar", label: "Width (Far)", type: "number", default: 6, min: 2, max: 80, step: 1, group: "shape" },
  { key: "surfaceColor", label: "Surface Color", type: "color", default: "#8B7355", group: "colors" },
  {
    key: "surfaceStyle",
    label: "Surface Style",
    type: "select",
    default: "dirt",
    group: "surface",
    options: [
      { value: "dirt", label: "Dirt" },
      { value: "cobblestone", label: "Cobblestone" },
      { value: "gravel", label: "Gravel" },
      { value: "sand", label: "Sand" },
      { value: "worn-grass", label: "Worn Grass" },
      { value: "flagstone", label: "Flagstone" },
    ],
  },
  {
    key: "edgeTreatment",
    label: "Edge Treatment",
    type: "select",
    default: "grass-encroach",
    group: "surface",
    options: [
      { value: "sharp", label: "Sharp" },
      { value: "grass-encroach", label: "Grass Encroach" },
      { value: "scattered-stones", label: "Scattered Stones" },
      { value: "overgrown", label: "Overgrown" },
    ],
  },
  { key: "wear", label: "Wear", type: "number", default: 0.5, min: 0, max: 1, step: 0.05, group: "surface" },
  createDepthLaneProperty("midground"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  pathPreset: PathPresetType;
  widthNear: number;
  widthFar: number;
  surfaceColor: string;
  surfaceStyle: SurfaceStyle;
  edgeTreatment: EdgeTreatment;
  wear: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const pp = preset?.category === "path" ? (preset as PathPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    pathPreset: (properties.pathPreset as PathPresetType) ?? pp?.pathPreset ?? "winding",
    widthNear: (properties.widthNear as number) ?? pp?.widthNear ?? 60,
    widthFar: (properties.widthFar as number) ?? pp?.widthFar ?? 10,
    surfaceColor: (properties.surfaceColor as string) || pp?.surfaceColor || "#8B7355",
    surfaceStyle: (properties.surfaceStyle as SurfaceStyle) ?? pp?.surfaceStyle ?? "dirt",
    edgeTreatment: (properties.edgeTreatment as EdgeTreatment) ?? pp?.edgeTreatment ?? "grass-encroach",
    wear: (properties.wear as number) ?? pp?.wear ?? 0.5,
    depthLane: (properties.depthLane as string) ?? "midground",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

/** Draw surface texture marks (dots, lines, or shapes) along the path. */
function drawSurfaceTexture(
  ctx: CanvasRenderingContext2D,
  samples: { x: number; y: number; t: number; width: number }[],
  style: SurfaceStyle,
  color: string,
  seed: number,
  wear: number,
): void {
  const rng = mulberry32(seed + 200);
  const noise = createValueNoise(seed + 300);

  for (let i = 2; i < samples.length - 2; i += 2) {
    const s = samples[i]!;
    const density = (1 - s.t) * 0.8; // More detail near viewer
    if (rng() > density) continue;

    const halfW = s.width * 0.4;

    switch (style) {
      case "cobblestone": {
        // Small rectangles arranged in rows
        const count = Math.max(1, Math.round(halfW / 6));
        for (let j = 0; j < count; j++) {
          const offset = (rng() - 0.5) * halfW * 2;
          const sz = 2 + rng() * 3 * (1 - s.t);
          ctx.globalAlpha = 0.15 + rng() * 0.15;
          ctx.fillStyle = rng() > 0.5 ? darken(color, 0.85) : lighten(color, 0.1);
          ctx.fillRect(s.x + offset - sz / 2, s.y - sz / 2, sz, sz * 0.8);
        }
        break;
      }
      case "gravel": {
        // Scattered small dots
        const count = Math.max(1, Math.round(halfW / 4));
        for (let j = 0; j < count; j++) {
          const offset = (rng() - 0.5) * halfW * 2;
          const sz = 0.5 + rng() * 2 * (1 - s.t);
          ctx.globalAlpha = 0.1 + rng() * 0.2;
          ctx.fillStyle = rng() > 0.5 ? darken(color, 0.8) : lighten(color, 0.15);
          ctx.fillRect(s.x + offset, s.y, sz, sz);
        }
        break;
      }
      case "sand": {
        // Fine noise-like dots
        const count = Math.max(1, Math.round(halfW / 3));
        for (let j = 0; j < count; j++) {
          const offset = (rng() - 0.5) * halfW * 2;
          const n = noise(s.x * 0.02 + offset * 0.01, s.y * 0.02);
          ctx.globalAlpha = n * 0.08;
          ctx.fillStyle = darken(color, 0.9 + n * 0.1);
          ctx.fillRect(s.x + offset, s.y, 1, 1);
        }
        break;
      }
      case "worn-grass": {
        // Short vertical strokes where grass pokes through
        const grassDensity = 1 - wear; // Less grass = more worn
        const count = Math.max(1, Math.round(halfW / 5 * grassDensity));
        for (let j = 0; j < count; j++) {
          const offset = (rng() - 0.5) * halfW * 2;
          const h = 2 + rng() * 4 * (1 - s.t);
          ctx.globalAlpha = 0.15 + rng() * 0.15;
          ctx.strokeStyle = "#4A6A30";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(s.x + offset, s.y);
          ctx.lineTo(s.x + offset + (rng() - 0.5) * 2, s.y - h);
          ctx.stroke();
        }
        break;
      }
      case "flagstone": {
        // Larger rectangular slabs with visible joints
        const count = Math.max(1, Math.round(halfW / 10));
        for (let j = 0; j < count; j++) {
          const offset = (rng() - 0.5) * halfW * 2;
          const sw = 6 + rng() * 8 * (1 - s.t);
          const sh = 4 + rng() * 6 * (1 - s.t);
          ctx.globalAlpha = 0.08 + rng() * 0.08;
          ctx.strokeStyle = darken(color, 0.7);
          ctx.lineWidth = 0.5;
          ctx.strokeRect(s.x + offset - sw / 2, s.y - sh / 2, sw, sh);
        }
        break;
      }
      case "dirt":
      default: {
        // Subtle tonal variation — small scattered marks instead of axis-aligned rects
        const count = Math.max(1, Math.round(halfW / 6));
        for (let j = 0; j < count; j++) {
          const n = noise((s.x + j * 3) * 0.01, s.y * 0.01);
          if (n > 0.55) {
            const offset = (rng() - 0.5) * halfW * 2;
            ctx.globalAlpha = (n - 0.55) * 0.3;
            ctx.fillStyle = darken(color, 0.85);
            ctx.fillRect(s.x + offset, s.y, 2 + rng() * 2, 1);
          }
        }
        break;
      }
    }
  }

  ctx.globalAlpha = 1;
}

/** Draw edge treatment along path borders. */
function drawEdgeTreatment(
  ctx: CanvasRenderingContext2D,
  curve: any,
  samples: { x: number; y: number; t: number; width: number }[],
  treatment: EdgeTreatment,
  color: string,
  seed: number,
): void {
  if (treatment === "sharp") return;

  const rng = mulberry32(seed + 400);

  for (let i = 3; i < samples.length - 3; i += 3) {
    const s = samples[i]!;
    const normal = evalBezierNormal(curve, s.t);
    const halfW = s.width * 0.5;
    const density = (1 - s.t) * 0.7;
    if (rng() > density) continue;

    for (const side of [-1, 1]) {
      const edgeX = s.x + normal.x * halfW * side;
      const edgeY = s.y + normal.y * halfW * side;

      switch (treatment) {
        case "grass-encroach": {
          const count = 2 + Math.round(rng() * 3);
          for (let j = 0; j < count; j++) {
            const ox = (rng() - 0.5) * 6 * side;
            const h = 2 + rng() * 5 * (1 - s.t);
            ctx.globalAlpha = 0.2 + rng() * 0.2;
            ctx.strokeStyle = "#4A7A30";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(edgeX + ox, edgeY);
            ctx.lineTo(edgeX + ox + (rng() - 0.5) * 3, edgeY - h);
            ctx.stroke();
          }
          break;
        }
        case "scattered-stones": {
          if (rng() > 0.4) continue;
          const sz = 1 + rng() * 3 * (1 - s.t);
          ctx.globalAlpha = 0.2 + rng() * 0.15;
          ctx.fillStyle = darken(color, 0.75);
          ctx.fillRect(edgeX + (rng() - 0.5) * 8, edgeY - sz / 2, sz, sz * 0.7);
          break;
        }
        case "overgrown": {
          const count = 3 + Math.round(rng() * 4);
          for (let j = 0; j < count; j++) {
            const ox = rng() * 10 * side;
            const h = 3 + rng() * 7 * (1 - s.t);
            ctx.globalAlpha = 0.15 + rng() * 0.2;
            ctx.strokeStyle = rng() > 0.3 ? "#3A6A25" : "#5A8A40";
            ctx.lineWidth = 0.5 + rng() * 0.5;
            ctx.beginPath();
            ctx.moveTo(edgeX + ox, edgeY);
            ctx.lineTo(edgeX + ox + (rng() - 0.5) * 4, edgeY - h);
            ctx.stroke();
          }
          break;
        }
      }
    }
  }

  ctx.globalAlpha = 1;
}

let _warnedPath = false;

/**
 * @deprecated Use `architecture:path` from `@genart-dev/plugin-architecture` instead.
 * This layer will be removed when plugin-architecture ships (Phase E).
 */
export const pathLayerType: LayerTypeDefinition = {
  typeId: "terrain:path",
  displayName: "Path",
  icon: "path",
  category: "draw",
  properties: PATH_PROPERTIES,
  propertyEditorId: "terrain:path-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(PATH_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    if (!_warnedPath) {
      _warnedPath = true;
      console.warn("[terrain] terrain:path is deprecated. Use architecture:path from @genart-dev/plugin-architecture.");
    }
    const p = resolveProps(properties);
    const curve = getPathPresetCurve(p.pathPreset, p.seed);
    const samples = samplePerspectiveCurve(curve, bounds, p.widthNear, p.widthFar, 100);

    // Apply atmospheric depth
    let surfaceColor = p.surfaceColor;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        surfaceColor = applyAtmosphericDepth(surfaceColor, laneConfig.depth, p.atmosphericMode);
      }
    }

    // Draw main path surface
    drawPerspectiveRibbon(ctx, curve, samples, surfaceColor);

    // Draw surface texture
    drawSurfaceTexture(ctx, samples, p.surfaceStyle, surfaceColor, p.seed, p.wear);

    // Draw edge treatment
    drawEdgeTreatment(ctx, curve, samples, p.edgeTreatment, surfaceColor, p.seed);

    // Wear marks — darker ruts/tracks down the center, drawn as path-following lines
    if (p.wear > 0.3) {
      const wornColor = darken(surfaceColor, 0.8);
      ctx.strokeStyle = wornColor;

      // Draw two track lines (left rut and right rut) along the curve
      for (const trackOffset of [-0.2, 0.2]) {
        ctx.beginPath();
        let started = false;
        for (let i = 2; i < samples.length - 2; i++) {
          const s = samples[i]!;
          const normal = evalBezierNormal(curve, s.t);
          const offset = s.width * trackOffset;
          const tx = s.x + normal.x * offset;
          const ty = s.y + normal.y * offset;
          if (!started) { ctx.moveTo(tx, ty); started = true; }
          else ctx.lineTo(tx, ty);
        }
        ctx.globalAlpha = p.wear * 0.12;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown path preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
