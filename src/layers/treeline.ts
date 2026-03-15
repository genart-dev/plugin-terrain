import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { mulberry32 } from "../shared/prng.js";
import { parseHex, darken, lighten, lerpColor } from "../shared/color-utils.js";
import { createValueNoise } from "../shared/noise.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { TreelinePreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const TREELINE_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Treeline Type",
    type: "select",
    default: "deciduous-canopy",
    group: "preset",
    options: [
      { value: "deciduous-canopy", label: "Deciduous Canopy" },
      { value: "conifer-ridge", label: "Conifer Ridge" },
      { value: "autumn-treeline", label: "Autumn Treeline" },
      { value: "misty-forest", label: "Misty Forest" },
      { value: "palm-fringe", label: "Palm Fringe" },
      { value: "winter-bare", label: "Winter Bare" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  {
    key: "canopyStyle",
    label: "Canopy Style",
    type: "select",
    default: "rounded",
    group: "shape",
    options: [
      { value: "rounded", label: "Rounded (Deciduous)" },
      { value: "pointed", label: "Pointed (Conifer)" },
      { value: "fan", label: "Fan (Palm)" },
      { value: "bare", label: "Bare (Winter)" },
    ],
  },
  { key: "color", label: "Foliage Color", type: "color", default: "#3A6A2A", group: "colors" },
  { key: "highlightColor", label: "Highlight Color", type: "color", default: "#5A8A4A", group: "colors" },
  { key: "shadowColor", label: "Shadow Color", type: "color", default: "#1A4A10", group: "colors" },
  { key: "density", label: "Density", type: "number", default: 0.8, min: 0.2, max: 1.0, step: 0.05, group: "shape" },
  { key: "height", label: "Height", type: "number", default: 0.15, min: 0.05, max: 0.4, step: 0.01, group: "shape" },
  { key: "irregularity", label: "Irregularity", type: "number", default: 0.4, min: 0, max: 1, step: 0.05, group: "shape" },
  createDepthLaneProperty("background"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  canopyStyle: string;
  color: string;
  highlightColor: string;
  shadowColor: string;
  density: number;
  height: number;
  irregularity: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const tp = preset?.category === "treeline" ? (preset as TreelinePreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    canopyStyle: (properties.canopyStyle as string) ?? tp?.canopyStyle ?? "rounded",
    color: (properties.color as string) || tp?.color || "#3A6A2A",
    highlightColor: (properties.highlightColor as string) || tp?.highlightColor || "#5A8A4A",
    shadowColor: (properties.shadowColor as string) || tp?.shadowColor || "#1A4A10",
    density: (properties.density as number) ?? tp?.density ?? 0.8,
    height: (properties.height as number) ?? tp?.height ?? 0.15,
    irregularity: (properties.irregularity as number) ?? tp?.irregularity ?? 0.4,
    depthLane: (properties.depthLane as string) ?? "background",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

export const treelineLayerType: LayerTypeDefinition = {
  typeId: "terrain:treeline",
  displayName: "Treeline",
  icon: "treeline",
  category: "draw",
  properties: TREELINE_PROPERTIES,
  propertyEditorId: "terrain:treeline-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(TREELINE_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const rng = mulberry32(p.seed);
    const noise = createValueNoise(p.seed + 700);

    // Apply atmospheric depth to colors
    let color = p.color;
    let highlightColor = p.highlightColor;
    let shadowColor = p.shadowColor;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        color = applyAtmosphericDepth(color, laneConfig.depth, p.atmosphericMode);
        highlightColor = applyAtmosphericDepth(highlightColor, laneConfig.depth, p.atmosphericMode);
        shadowColor = applyAtmosphericDepth(shadowColor, laneConfig.depth, p.atmosphericMode);
      }
    }

    const w = bounds.width;
    const h = bounds.height;
    const treeH = h * p.height;
    const baseY = bounds.y + h * 0.6; // Treeline sits at ~60% down

    // Generate canopy top edge profile using noise
    const profilePoints: Array<{ x: number; y: number }> = [];
    const steps = Math.round(w / 4);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = bounds.x + t * w;
      const nv = noise(t * 6, p.seed * 0.01);

      let topOffset = 0;

      if (p.canopyStyle === "rounded") {
        // Smooth bumps for deciduous crowns
        topOffset = nv * treeH * p.irregularity;
        // Add larger crown bumps
        const crownNoise = noise(t * 12, p.seed * 0.02);
        topOffset += crownNoise * treeH * 0.3 * p.irregularity;
      } else if (p.canopyStyle === "pointed") {
        // Sharp peaks for conifers — sawtooth phase must be monotonically increasing
        // (no noise phase perturbation, which causes inverted-spike artifacts at modulo wrap).
        const sawtoothPhase = (t * 15) % 1;
        const sawtooth = sawtoothPhase < 0.5 ? sawtoothPhase * 2 : 2 - sawtoothPhase * 2;
        topOffset = sawtooth * treeH * (0.5 + p.irregularity * 0.5);
        // Height variation between trees via noise amplitude (not phase)
        topOffset *= 0.6 + nv * 0.4;
      } else if (p.canopyStyle === "fan") {
        // Palm-like: sparse tall shapes — phase from t only (same fix as pointed)
        const palmSpacing = (t * 8) % 1;
        if (palmSpacing < p.density * 0.3) {
          topOffset = treeH * (0.8 + nv * 0.2);
        } else {
          topOffset = treeH * 0.1;
        }
      } else if (p.canopyStyle === "bare") {
        // Bare branches: thin vertical spikes
        const branchPhase = (t * 20 + nv * 3) % 1;
        if (branchPhase < 0.15) {
          topOffset = treeH * (0.5 + nv * 0.5) * p.irregularity;
        } else {
          topOffset = treeH * 0.05;
        }
      }

      // Density gaps
      if (rng() > p.density) {
        topOffset *= 0.2;
      }

      const y = baseY - topOffset;
      profilePoints.push({ x, y });
    }

    // Draw shadow layer (slightly offset)
    ctx.fillStyle = shadowColor;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(profilePoints[0]!.x, profilePoints[0]!.y + 2);
    for (let i = 1; i < profilePoints.length; i++) {
      ctx.lineTo(profilePoints[i]!.x, profilePoints[i]!.y + 2);
    }
    ctx.lineTo(bounds.x + w, baseY + treeH * 0.3);
    ctx.lineTo(bounds.x, baseY + treeH * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Draw main canopy mass
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(profilePoints[0]!.x, profilePoints[0]!.y);
    for (let i = 1; i < profilePoints.length; i++) {
      ctx.lineTo(profilePoints[i]!.x, profilePoints[i]!.y);
    }
    ctx.lineTo(bounds.x + w, baseY + treeH * 0.2);
    ctx.lineTo(bounds.x, baseY + treeH * 0.2);
    ctx.closePath();
    ctx.fill();

    // Highlight on top edges
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(profilePoints[0]!.x, profilePoints[0]!.y);
    for (let i = 1; i < profilePoints.length; i++) {
      // Only draw highlight where the profile goes up (lit side)
      if (profilePoints[i]!.y < profilePoints[i - 1]!.y) {
        ctx.lineTo(profilePoints[i]!.x, profilePoints[i]!.y);
      } else {
        ctx.moveTo(profilePoints[i]!.x, profilePoints[i]!.y);
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Add foliage texture marks for non-bare styles
    if (p.canopyStyle !== "bare") {
      const markCount = Math.round(p.density * 150);
      for (let i = 0; i < markCount; i++) {
        const mx = bounds.x + rng() * w;
        const mIdx = Math.min(profilePoints.length - 1, Math.floor((mx - bounds.x) / w * profilePoints.length));
        const topY = profilePoints[mIdx]?.y ?? baseY;
        const myRange = Math.max(0, baseY + treeH * 0.15 - topY);
        const my = topY + rng() * myRange;

        if (my > baseY + treeH * 0.2) continue;

        const isDark = rng() > 0.5;
        ctx.fillStyle = isDark ? shadowColor : highlightColor;
        ctx.globalAlpha = 0.15 + rng() * 0.2;
        ctx.fillRect(mx, my, 1 + rng() * 3, 1 + rng() * 2);
      }
      ctx.globalAlpha = 1;
    }

    // Bare style: draw trunk/branch lines
    if (p.canopyStyle === "bare") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      const trunkCount = Math.round(p.density * 20);
      for (let i = 0; i < trunkCount; i++) {
        const tx = bounds.x + rng() * w;
        const tIdx = Math.min(profilePoints.length - 1, Math.floor((tx - bounds.x) / w * profilePoints.length));
        const topY = profilePoints[tIdx]?.y ?? baseY;

        ctx.globalAlpha = 0.4 + rng() * 0.3;
        ctx.beginPath();
        ctx.moveTo(tx, baseY + treeH * 0.15);
        ctx.lineTo(tx + (rng() - 0.5) * 4, topY);
        ctx.stroke();

        // Small branch forks
        if (rng() < 0.6) {
          const branchY = topY + (baseY - topY) * (0.2 + rng() * 0.4);
          ctx.beginPath();
          ctx.moveTo(tx, branchY);
          ctx.lineTo(tx + (rng() - 0.5) * 15, branchY - rng() * 10);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown treeline preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
