import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { mulberry32 } from "../shared/prng.js";
import { parseHex, darken, lighten } from "../shared/color-utils.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { VignetteFoliagePreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const VIGNETTE_FOLIAGE_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Foliage Style",
    type: "select",
    default: "overhanging-branches",
    group: "preset",
    options: [
      { value: "overhanging-branches", label: "Overhanging Branches" },
      { value: "grass-border", label: "Grass Border" },
      { value: "leaf-frame", label: "Leaf Frame" },
      { value: "pine-canopy", label: "Pine Canopy" },
      { value: "vine-border", label: "Vine Border" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  {
    key: "foliageStyle",
    label: "Style",
    type: "select",
    default: "branches",
    group: "foliage",
    options: [
      { value: "branches", label: "Branches" },
      { value: "grass-blades", label: "Grass Blades" },
      { value: "leaves", label: "Leaves" },
      { value: "vines", label: "Vines" },
    ],
  },
  { key: "color", label: "Foliage Color", type: "color", default: "#2A4A20", group: "colors" },
  { key: "secondaryColor", label: "Secondary Color", type: "color", default: "#4A6A30", group: "colors" },
  { key: "density", label: "Density", type: "number", default: 0.5, min: 0.1, max: 1.0, step: 0.05, group: "foliage" },
  { key: "depth", label: "Border Depth", type: "number", default: 0.15, min: 0.02, max: 0.35, step: 0.01, group: "layout" },
  {
    key: "edges",
    label: "Edges",
    type: "select",
    default: "top",
    group: "layout",
    options: [
      { value: "top", label: "Top" },
      { value: "bottom", label: "Bottom" },
      { value: "sides", label: "Sides" },
      { value: "top-sides", label: "Top + Sides" },
      { value: "all", label: "All Edges" },
    ],
  },
  createDepthLaneProperty("overlay"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  foliageStyle: string;
  color: string;
  secondaryColor: string;
  density: number;
  depth: number;
  edges: string;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const vp = preset?.category === "vignette-foliage" ? (preset as VignetteFoliagePreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    foliageStyle: (properties.foliageStyle as string) ?? vp?.foliageStyle ?? "branches",
    color: (properties.color as string) || vp?.color || "#2A4A20",
    secondaryColor: (properties.secondaryColor as string) || vp?.secondaryColor || "#4A6A30",
    density: (properties.density as number) ?? vp?.density ?? 0.5,
    depth: (properties.depth as number) ?? vp?.depth ?? 0.15,
    edges: (properties.edges as string) ?? vp?.edges ?? "top",
    depthLane: (properties.depthLane as string) ?? "overlay",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

/** Render foliage elements from a given edge inward. */
function renderEdge(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  style: string,
  color: string,
  secondaryColor: string,
  density: number,
  edge: "top" | "bottom" | "left" | "right",
  bounds: { x: number; y: number; width: number; height: number },
  borderDepth: number,
): void {
  const w = bounds.width;
  const h = bounds.height;
  const depthPx = borderDepth * Math.min(w, h);
  const elementCount = Math.round(density * 40 * (edge === "top" || edge === "bottom" ? w / 800 : h / 600));

  const darkColor = darken(color, 0.6);

  for (let i = 0; i < elementCount; i++) {
    const useSecondary = rng() > 0.5;
    const elemColor = useSecondary ? secondaryColor : color;

    let x: number, y: number, inwardAngle: number;

    if (edge === "top") {
      x = bounds.x + rng() * w;
      y = bounds.y + rng() * depthPx * 0.3;
      inwardAngle = Math.PI / 2 + (rng() - 0.5) * 0.6;
    } else if (edge === "bottom") {
      x = bounds.x + rng() * w;
      y = bounds.y + h - rng() * depthPx * 0.3;
      inwardAngle = -Math.PI / 2 + (rng() - 0.5) * 0.6;
    } else if (edge === "left") {
      x = bounds.x + rng() * depthPx * 0.3;
      y = bounds.y + rng() * h;
      inwardAngle = (rng() - 0.5) * 0.6;
    } else {
      x = bounds.x + w - rng() * depthPx * 0.3;
      y = bounds.y + rng() * h;
      inwardAngle = Math.PI + (rng() - 0.5) * 0.6;
    }

    const len = depthPx * (0.4 + rng() * 0.6);

    if (style === "branches") {
      // Branch with sub-branches
      const tipX = x + Math.cos(inwardAngle) * len;
      const tipY = y + Math.sin(inwardAngle) * len;
      ctx.strokeStyle = darkColor;
      ctx.lineWidth = 1 + rng() * 2;
      ctx.globalAlpha = 0.7 + rng() * 0.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        (x + tipX) / 2 + (rng() - 0.5) * len * 0.3,
        (y + tipY) / 2 + (rng() - 0.5) * len * 0.3,
        tipX, tipY,
      );
      ctx.stroke();

      // Leaf clusters along branch
      const leafCount = 3 + Math.floor(rng() * 5);
      for (let j = 0; j < leafCount; j++) {
        const lt = (j + 1) / (leafCount + 1);
        const lx = x + (tipX - x) * lt + (rng() - 0.5) * 10;
        const ly = y + (tipY - y) * lt + (rng() - 0.5) * 10;
        const leafSize = 4 + rng() * 8;
        const [lr, lg, lb] = parseHex(elemColor);
        ctx.fillStyle = `rgba(${lr},${lg},${lb},${0.5 + rng() * 0.4})`;
        ctx.beginPath();
        ctx.ellipse(lx, ly, leafSize, leafSize * 0.6, rng() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (style === "grass-blades") {
      // Tall grass blades
      ctx.strokeStyle = elemColor;
      ctx.lineWidth = 1 + rng() * 1.5;
      ctx.globalAlpha = 0.5 + rng() * 0.4;
      const tipX = x + Math.cos(inwardAngle) * len;
      const tipY = y + Math.sin(inwardAngle) * len;
      const curve = (rng() - 0.5) * len * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        (x + tipX) / 2 + curve,
        (y + tipY) / 2 + curve,
        tipX, tipY,
      );
      ctx.stroke();
    } else if (style === "leaves") {
      // Individual leaf shapes
      const [lr, lg, lb] = parseHex(elemColor);
      ctx.fillStyle = `rgba(${lr},${lg},${lb},${0.5 + rng() * 0.4})`;
      const leafSize = 6 + rng() * 14;
      ctx.beginPath();
      ctx.ellipse(
        x + Math.cos(inwardAngle) * len * 0.3,
        y + Math.sin(inwardAngle) * len * 0.3,
        leafSize, leafSize * 0.5,
        inwardAngle + (rng() - 0.5) * 0.5,
        0, Math.PI * 2,
      );
      ctx.fill();
    } else {
      // Vines: curvy lines with small leaf dots
      ctx.strokeStyle = darkColor;
      ctx.lineWidth = 0.8 + rng() * 1.2;
      ctx.globalAlpha = 0.6 + rng() * 0.3;

      const segments = 3 + Math.floor(rng() * 3);
      ctx.beginPath();
      ctx.moveTo(x, y);
      let cx = x, cy = y;
      for (let j = 0; j < segments; j++) {
        const t = (j + 1) / segments;
        const nx = x + Math.cos(inwardAngle) * len * t;
        const ny = y + Math.sin(inwardAngle) * len * t;
        const cpx = (cx + nx) / 2 + (rng() - 0.5) * 20;
        const cpy = (cy + ny) / 2 + (rng() - 0.5) * 20;
        ctx.quadraticCurveTo(cpx, cpy, nx, ny);
        cx = nx;
        cy = ny;
      }
      ctx.stroke();

      // Small leaf dots
      const dotCount = 2 + Math.floor(rng() * 3);
      const [lr, lg, lb] = parseHex(elemColor);
      for (let j = 0; j < dotCount; j++) {
        const dt = rng();
        const dx = x + Math.cos(inwardAngle) * len * dt + (rng() - 0.5) * 8;
        const dy = y + Math.sin(inwardAngle) * len * dt + (rng() - 0.5) * 8;
        ctx.fillStyle = `rgba(${lr},${lg},${lb},${0.4 + rng() * 0.3})`;
        ctx.beginPath();
        ctx.arc(dx, dy, 2 + rng() * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

export const vignetteFoliageLayerType: LayerTypeDefinition = {
  typeId: "terrain:vignette-foliage",
  displayName: "Vignette Foliage",
  icon: "vignette-foliage",
  category: "draw",
  properties: VIGNETTE_FOLIAGE_PROPERTIES,
  propertyEditorId: "terrain:vignette-foliage-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(VIGNETTE_FOLIAGE_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const rng = mulberry32(p.seed);

    // Apply atmospheric depth
    let color = p.color;
    let secondaryColor = p.secondaryColor;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        color = applyAtmosphericDepth(color, laneConfig.depth, p.atmosphericMode);
        secondaryColor = applyAtmosphericDepth(secondaryColor, laneConfig.depth, p.atmosphericMode);
      }
    }

    const rectBounds = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };

    if (p.edges === "top" || p.edges === "top-sides" || p.edges === "all") {
      renderEdge(ctx, rng, p.foliageStyle, color, secondaryColor, p.density, "top", rectBounds, p.depth);
    }
    if (p.edges === "bottom" || p.edges === "all") {
      renderEdge(ctx, rng, p.foliageStyle, color, secondaryColor, p.density, "bottom", rectBounds, p.depth);
    }
    if (p.edges === "sides" || p.edges === "top-sides" || p.edges === "all") {
      renderEdge(ctx, rng, p.foliageStyle, color, secondaryColor, p.density, "left", rectBounds, p.depth);
      renderEdge(ctx, rng, p.foliageStyle, color, secondaryColor, p.density, "right", rectBounds, p.depth);
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown vignette-foliage preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
