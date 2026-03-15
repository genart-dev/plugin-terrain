import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { mulberry32 } from "../shared/prng.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { FencePreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const FENCE_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Fence Type",
    type: "select",
    default: "white-picket",
    group: "preset",
    options: [
      { value: "white-picket", label: "White Picket" },
      { value: "stone-wall", label: "Stone Wall" },
      { value: "ranch-rail", label: "Ranch Rail" },
      { value: "wire-fence", label: "Wire Fence" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  {
    key: "fenceStyle",
    label: "Style",
    type: "select",
    default: "picket",
    group: "fence",
    options: [
      { value: "picket", label: "Picket" },
      { value: "stone-wall", label: "Stone Wall" },
      { value: "rail", label: "Rail" },
      { value: "wire", label: "Wire" },
    ],
  },
  { key: "color", label: "Fence Color", type: "color", default: "#FFFFFF", group: "colors" },
  { key: "postColor", label: "Post Color", type: "color", default: "#E0E0E0", group: "colors" },
  { key: "height", label: "Height", type: "number", default: 0.06, min: 0.02, max: 0.15, step: 0.01, group: "layout" },
  { key: "yPosition", label: "Y Position", type: "number", default: 0.7, min: 0.2, max: 0.95, step: 0.05, group: "layout" },
  { key: "spacing", label: "Post Spacing", type: "number", default: 0.03, min: 0.01, max: 0.1, step: 0.005, group: "fence" },
  { key: "sag", label: "Wire/Rail Sag", type: "number", default: 0.3, min: 0, max: 1, step: 0.1, group: "fence" },
  createDepthLaneProperty("foreground"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  fenceStyle: string;
  color: string;
  postColor: string;
  height: number;
  yPosition: number;
  spacing: number;
  sag: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const fp = preset?.category === "fence" ? (preset as FencePreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    fenceStyle: (properties.fenceStyle as string) ?? fp?.fenceStyle ?? "picket",
    color: (properties.color as string) || fp?.color || "#FFFFFF",
    postColor: (properties.postColor as string) || fp?.postColor || "#E0E0E0",
    height: (properties.height as number) ?? fp?.height ?? 0.06,
    yPosition: (properties.yPosition as number) ?? fp?.yPosition ?? 0.7,
    spacing: (properties.spacing as number) ?? fp?.spacing ?? 0.03,
    sag: (properties.sag as number) ?? fp?.sag ?? 0.3,
    depthLane: (properties.depthLane as string) ?? "foreground",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

let _warnedFence = false;

/**
 * @deprecated Use `architecture:fence` from `@genart-dev/plugin-architecture` instead.
 * This layer will be removed when plugin-architecture ships (Phase E).
 */
export const fenceLayerType: LayerTypeDefinition = {
  typeId: "terrain:fence",
  displayName: "Fence",
  icon: "fence",
  category: "draw",
  properties: FENCE_PROPERTIES,
  propertyEditorId: "terrain:fence-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(FENCE_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    if (!_warnedFence) {
      _warnedFence = true;
      console.warn("[terrain] terrain:fence is deprecated. Use architecture:fence from @genart-dev/plugin-architecture.");
    }
    const p = resolveProps(properties);
    const rng = mulberry32(p.seed);
    const w = bounds.width;
    const h = bounds.height;

    // Apply atmospheric depth
    let color = p.color;
    let postColor = p.postColor;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        color = applyAtmosphericDepth(color, laneConfig.depth, p.atmosphericMode);
        postColor = applyAtmosphericDepth(postColor, laneConfig.depth, p.atmosphericMode);
      }
    }

    const baseY = bounds.y + p.yPosition * h;
    const fenceH = p.height * h;
    const spacingPx = p.spacing * w;
    const postW = Math.max(2, spacingPx * 0.15);
    const postCount = Math.floor(w / spacingPx) + 1;

    if (p.fenceStyle === "picket") {
      // Picket fence: posts with shorter pickets between
      for (let i = 0; i < postCount; i++) {
        const px = bounds.x + i * spacingPx + (rng() - 0.5) * 2;

        // Post
        ctx.fillStyle = postColor;
        ctx.fillRect(px - postW / 2, baseY - fenceH, postW, fenceH);

        // Pointed top
        ctx.fillStyle = postColor;
        ctx.beginPath();
        ctx.moveTo(px - postW / 2, baseY - fenceH);
        ctx.lineTo(px, baseY - fenceH - postW);
        ctx.lineTo(px + postW / 2, baseY - fenceH);
        ctx.closePath();
        ctx.fill();

        // Pickets between posts
        const picketCount = 3;
        const picketH = fenceH * 0.75;
        for (let j = 1; j <= picketCount; j++) {
          const picketX = px + (j / (picketCount + 1)) * spacingPx;
          if (picketX > bounds.x + w) break;
          ctx.fillStyle = color;
          ctx.fillRect(picketX - postW * 0.4, baseY - picketH, postW * 0.8, picketH);
        }
      }

      // Horizontal rails
      ctx.fillStyle = color;
      ctx.fillRect(bounds.x, baseY - fenceH * 0.3, w, Math.max(1, fenceH * 0.04));
      ctx.fillRect(bounds.x, baseY - fenceH * 0.7, w, Math.max(1, fenceH * 0.04));
    } else if (p.fenceStyle === "stone-wall") {
      // Stone wall: filled rectangle with texture
      ctx.fillStyle = color;
      ctx.fillRect(bounds.x, baseY - fenceH, w, fenceH);

      // Stone texture: random horizontal and vertical lines
      ctx.strokeStyle = postColor;
      ctx.lineWidth = 1;
      const stoneRows = Math.max(2, Math.floor(fenceH / 8));
      for (let row = 0; row < stoneRows; row++) {
        const ry = baseY - fenceH + (row + 0.5) * (fenceH / stoneRows);
        // Horizontal mortar line
        ctx.beginPath();
        ctx.moveTo(bounds.x, ry);
        ctx.lineTo(bounds.x + w, ry);
        ctx.stroke();

        // Vertical mortar lines (staggered)
        const stoneCount = Math.floor(w / (spacingPx * 2));
        const offset = row % 2 === 0 ? 0 : spacingPx;
        for (let s = 0; s < stoneCount; s++) {
          const sx = bounds.x + offset + s * spacingPx * 2;
          ctx.beginPath();
          ctx.moveTo(sx, ry - fenceH / stoneRows / 2);
          ctx.lineTo(sx, ry + fenceH / stoneRows / 2);
          ctx.stroke();
        }
      }
    } else if (p.fenceStyle === "rail") {
      // Ranch rail fence: posts with horizontal rails between
      for (let i = 0; i < postCount; i++) {
        const px = bounds.x + i * spacingPx;
        ctx.fillStyle = postColor;
        ctx.fillRect(px - postW, baseY - fenceH, postW * 2, fenceH);
      }

      // Horizontal rails with slight sag
      const railCount = 3;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, fenceH * 0.08);
      for (let r = 0; r < railCount; r++) {
        const railY = baseY - fenceH * ((r + 1) / (railCount + 1));
        ctx.beginPath();
        for (let i = 0; i < postCount - 1; i++) {
          const x1 = bounds.x + i * spacingPx;
          const x2 = bounds.x + (i + 1) * spacingPx;
          const midX = (x1 + x2) / 2;
          const sagPx = p.sag * fenceH * 0.1;
          if (i === 0) ctx.moveTo(x1, railY);
          ctx.quadraticCurveTo(midX, railY + sagPx, x2, railY);
        }
        ctx.stroke();
      }
    } else {
      // Wire fence: posts with catenary wire between
      for (let i = 0; i < postCount; i++) {
        const px = bounds.x + i * spacingPx;
        ctx.fillStyle = postColor;
        ctx.fillRect(px - postW / 2, baseY - fenceH, postW, fenceH);
      }

      // Wire strands
      const wireCount = 4;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      for (let wr = 0; wr < wireCount; wr++) {
        const wireY = baseY - fenceH * ((wr + 1) / (wireCount + 1));
        ctx.beginPath();
        for (let i = 0; i < postCount - 1; i++) {
          const x1 = bounds.x + i * spacingPx;
          const x2 = bounds.x + (i + 1) * spacingPx;
          const midX = (x1 + x2) / 2;
          const sagPx = p.sag * fenceH * 0.15;
          if (i === 0) ctx.moveTo(x1, wireY);
          ctx.quadraticCurveTo(midX, wireY + sagPx, x2, wireY);
        }
        ctx.stroke();
      }
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown fence preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
