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
import type { ForestFloorPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const FOREST_FLOOR_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Ground Cover",
    type: "select",
    default: "fern-carpet",
    group: "preset",
    options: [
      { value: "fern-carpet", label: "Fern Carpet" },
      { value: "mossy-ground", label: "Mossy Ground" },
      { value: "fallen-leaves", label: "Fallen Leaves" },
      { value: "pine-needles", label: "Pine Needles" },
      { value: "mushroom-patch", label: "Mushroom Patch" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  {
    key: "coverType",
    label: "Cover Type",
    type: "select",
    default: "ferns",
    group: "cover",
    options: [
      { value: "ferns", label: "Ferns" },
      { value: "moss", label: "Moss" },
      { value: "fallen-logs", label: "Fallen Logs" },
      { value: "mushrooms", label: "Mushrooms" },
    ],
  },
  { key: "color", label: "Color", type: "color", default: "#3A5A30", group: "colors" },
  { key: "secondaryColor", label: "Secondary Color", type: "color", default: "#5A7A40", group: "colors" },
  { key: "groundColor", label: "Ground Color", type: "color", default: "#4A3A28", group: "colors" },
  { key: "density", label: "Density", type: "number", default: 0.6, min: 0.1, max: 1.0, step: 0.05, group: "cover" },
  { key: "coverageTop", label: "Coverage Top", type: "number", default: 0.7, min: 0.0, max: 1.0, step: 0.05, group: "layout" },
  { key: "coverageBottom", label: "Coverage Bottom", type: "number", default: 1.0, min: 0.0, max: 1.0, step: 0.05, group: "layout" },
  createDepthLaneProperty("ground-plane"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  coverType: string;
  color: string;
  secondaryColor: string;
  groundColor: string;
  density: number;
  coverageTop: number;
  coverageBottom: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const fp = preset?.category === "forest-floor" ? (preset as ForestFloorPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    coverType: (properties.coverType as string) ?? fp?.coverType ?? "ferns",
    color: (properties.color as string) || fp?.color || "#3A5A30",
    secondaryColor: (properties.secondaryColor as string) || fp?.secondaryColor || "#5A7A40",
    groundColor: (properties.groundColor as string) || fp?.groundColor || "#4A3A28",
    density: (properties.density as number) ?? fp?.density ?? 0.6,
    coverageTop: (properties.coverageTop as number) ?? fp?.coverageTop ?? 0.7,
    coverageBottom: (properties.coverageBottom as number) ?? fp?.coverageBottom ?? 1.0,
    depthLane: (properties.depthLane as string) ?? "ground-plane",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

export const forestFloorLayerType: LayerTypeDefinition = {
  typeId: "terrain:forest-floor",
  displayName: "Forest Floor",
  icon: "forest-floor",
  category: "draw",
  properties: FOREST_FLOOR_PROPERTIES,
  propertyEditorId: "terrain:forest-floor-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(FOREST_FLOOR_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const rng = mulberry32(p.seed);
    const noise = createValueNoise(p.seed + 900);
    const w = bounds.width;
    const h = bounds.height;

    // Apply atmospheric depth
    let color = p.color;
    let secondaryColor = p.secondaryColor;
    let groundColor = p.groundColor;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        color = applyAtmosphericDepth(color, laneConfig.depth, p.atmosphericMode);
        secondaryColor = applyAtmosphericDepth(secondaryColor, laneConfig.depth, p.atmosphericMode);
        groundColor = applyAtmosphericDepth(groundColor, laneConfig.depth, p.atmosphericMode);
      }
    }

    const top = bounds.y + p.coverageTop * h;
    const bottom = bounds.y + p.coverageBottom * h;
    const coverH = bottom - top;
    if (coverH <= 0) return;

    // Ground base
    ctx.fillStyle = groundColor;
    ctx.fillRect(bounds.x, top, w, coverH);

    // Ground texture (noise-modulated darker patches)
    const [gr, gg, gb] = parseHex(groundColor);
    const sliceCount = Math.ceil(w / 4);
    for (let i = 0; i < sliceCount; i++) {
      const nx = i / sliceCount;
      for (let row = 0; row < 6; row++) {
        const ny = row / 6;
        const n = noise(nx * 5, ny * 5 + 50);
        if (n < 0.4) {
          const x = bounds.x + nx * w;
          const y = top + ny * coverH;
          const alpha = (0.4 - n) * 0.4;
          ctx.fillStyle = `rgba(${Math.max(0, gr - 30)},${Math.max(0, gg - 30)},${Math.max(0, gb - 30)},${alpha})`;
          ctx.fillRect(x, y, w / sliceCount + 1, coverH / 6 + 1);
        }
      }
    }

    // Cover elements
    const elementCount = Math.round(p.density * 80 * (w / 800));

    if (p.coverType === "ferns") {
      for (let i = 0; i < elementCount; i++) {
        const fx = bounds.x + rng() * w;
        const fy = top + rng() * coverH;
        const fernSize = (8 + rng() * 16) * (w / 800);
        const useSecondary = rng() > 0.5;
        const fernColor = useSecondary ? secondaryColor : color;

        // Simple fern frond: central spine with angled marks
        ctx.strokeStyle = fernColor;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.5 + rng() * 0.4;

        const angle = -Math.PI / 2 + (rng() - 0.5) * 0.5;
        const tipX = fx + Math.cos(angle) * fernSize;
        const tipY = fy + Math.sin(angle) * fernSize;

        // Spine
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        // Leaflets
        const leafCount = 4 + Math.floor(rng() * 4);
        for (let j = 0; j < leafCount; j++) {
          const lt = (j + 1) / (leafCount + 1);
          const lx = fx + (tipX - fx) * lt;
          const ly = fy + (tipY - fy) * lt;
          const leafLen = fernSize * 0.3 * (1 - lt);
          const side = j % 2 === 0 ? 1 : -1;
          const perpAngle = angle + (Math.PI / 2) * side;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx + Math.cos(perpAngle) * leafLen, ly + Math.sin(perpAngle) * leafLen);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    } else if (p.coverType === "moss") {
      // Moss patches: soft colored blobs
      for (let i = 0; i < elementCount; i++) {
        const mx = bounds.x + rng() * w;
        const my = top + rng() * coverH;
        const mossSize = (6 + rng() * 20) * (w / 800);
        const useSecondary = rng() > 0.5;
        const mossColor = useSecondary ? secondaryColor : color;
        const [mr, mg, mb] = parseHex(mossColor);

        ctx.fillStyle = `rgba(${mr},${mg},${mb},${0.3 + rng() * 0.3})`;
        ctx.beginPath();
        ctx.ellipse(mx, my, mossSize, mossSize * 0.6, rng() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (p.coverType === "fallen-logs") {
      // Fallen logs: horizontal elongated shapes
      const logCount = Math.round(p.density * 8);
      const logColor = darken(groundColor, 0.7);
      const logHighlight = lighten(groundColor, 0.1);
      for (let i = 0; i < logCount; i++) {
        const lx = bounds.x + rng() * w * 0.8;
        const ly = top + rng() * coverH;
        const logLen = (40 + rng() * 80) * (w / 800);
        const logH = (4 + rng() * 6) * (w / 800);
        const logAngle = (rng() - 0.5) * 0.3;

        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(logAngle);

        // Log body
        ctx.fillStyle = logColor;
        ctx.fillRect(0, 0, logLen, logH);

        // Light edge
        const [lr, lg, lb] = parseHex(logHighlight);
        ctx.fillStyle = `rgba(${lr},${lg},${lb},0.3)`;
        ctx.fillRect(0, 0, logLen, logH * 0.3);

        ctx.restore();
      }

      // Scattered small ground cover elements too
      for (let i = 0; i < elementCount * 0.5; i++) {
        const sx = bounds.x + rng() * w;
        const sy = top + rng() * coverH;
        const [cr, cg, cb] = parseHex(color);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.2 + rng() * 0.3})`;
        ctx.fillRect(sx, sy, 2 + rng() * 4, 1 + rng() * 2);
      }
    } else {
      // Mushrooms: small caps on stems
      const mushroomCount = Math.round(p.density * 30);
      for (let i = 0; i < mushroomCount; i++) {
        const mx = bounds.x + rng() * w;
        const my = top + rng() * coverH;
        const size = (3 + rng() * 6) * (w / 800);
        const useSecondary = rng() > 0.5;
        const capColor = useSecondary ? secondaryColor : color;

        // Stem
        const stemColor = lighten(groundColor, 0.3);
        ctx.fillStyle = stemColor;
        ctx.fillRect(mx - size * 0.15, my, size * 0.3, size * 0.8);

        // Cap
        ctx.fillStyle = capColor;
        ctx.beginPath();
        ctx.ellipse(mx, my, size * 0.5, size * 0.3, 0, Math.PI, 0);
        ctx.fill();
      }
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown forest-floor preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
