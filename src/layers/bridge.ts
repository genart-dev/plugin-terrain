import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { mulberry32 } from "../shared/prng.js";
import { parseHex, darken } from "../shared/color-utils.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { BridgePreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const BRIDGE_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Bridge Type",
    type: "select",
    default: "stone-arch",
    group: "preset",
    options: [
      { value: "stone-arch", label: "Stone Arch" },
      { value: "wooden-footbridge", label: "Wooden Footbridge" },
      { value: "suspension-bridge", label: "Suspension Bridge" },
      { value: "flat-crossing", label: "Flat Crossing" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  {
    key: "bridgeStyle",
    label: "Style",
    type: "select",
    default: "arch",
    group: "bridge",
    options: [
      { value: "arch", label: "Arch" },
      { value: "suspension", label: "Suspension" },
      { value: "footbridge", label: "Footbridge" },
      { value: "flat", label: "Flat" },
    ],
  },
  { key: "color", label: "Bridge Color", type: "color", default: "#6A6060", group: "colors" },
  { key: "deckColor", label: "Deck Color", type: "color", default: "#8A7A70", group: "colors" },
  { key: "span", label: "Span Width", type: "number", default: 0.4, min: 0.15, max: 0.8, step: 0.05, group: "layout" },
  { key: "xPosition", label: "X Position", type: "number", default: 0.5, min: 0.1, max: 0.9, step: 0.05, group: "layout" },
  { key: "yPosition", label: "Y Position", type: "number", default: 0.6, min: 0.2, max: 0.9, step: 0.05, group: "layout" },
  { key: "archHeight", label: "Arch Height", type: "number", default: 0.08, min: 0.02, max: 0.2, step: 0.01, group: "bridge" },
  { key: "railingHeight", label: "Railing Height", type: "number", default: 0.02, min: 0, max: 0.06, step: 0.005, group: "bridge" },
  createDepthLaneProperty("midground"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  bridgeStyle: string;
  color: string;
  deckColor: string;
  span: number;
  xPosition: number;
  yPosition: number;
  archHeight: number;
  railingHeight: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const bp = preset?.category === "bridge" ? (preset as BridgePreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    bridgeStyle: (properties.bridgeStyle as string) ?? bp?.bridgeStyle ?? "arch",
    color: (properties.color as string) || bp?.color || "#6A6060",
    deckColor: (properties.deckColor as string) || bp?.deckColor || "#8A7A70",
    span: (properties.span as number) ?? bp?.span ?? 0.4,
    xPosition: (properties.xPosition as number) ?? bp?.xPosition ?? 0.5,
    yPosition: (properties.yPosition as number) ?? bp?.yPosition ?? 0.6,
    archHeight: (properties.archHeight as number) ?? bp?.archHeight ?? 0.08,
    railingHeight: (properties.railingHeight as number) ?? bp?.railingHeight ?? 0.02,
    depthLane: (properties.depthLane as string) ?? "midground",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

let _warnedBridge = false;

/**
 * @deprecated Use `architecture:bridge` from `@genart-dev/plugin-architecture` instead.
 * This layer will be removed when plugin-architecture ships (Phase E).
 */
export const bridgeLayerType: LayerTypeDefinition = {
  typeId: "terrain:bridge",
  displayName: "Bridge",
  icon: "bridge",
  category: "draw",
  properties: BRIDGE_PROPERTIES,
  propertyEditorId: "terrain:bridge-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(BRIDGE_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    if (!_warnedBridge) {
      _warnedBridge = true;
      console.warn("[terrain] terrain:bridge is deprecated. Use architecture:bridge from @genart-dev/plugin-architecture.");
    }
    const p = resolveProps(properties);
    const rng = mulberry32(p.seed);
    const w = bounds.width;
    const h = bounds.height;

    // Apply atmospheric depth
    let color = p.color;
    let deckColor = p.deckColor;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        color = applyAtmosphericDepth(color, laneConfig.depth, p.atmosphericMode);
        deckColor = applyAtmosphericDepth(deckColor, laneConfig.depth, p.atmosphericMode);
      }
    }

    const cx = bounds.x + p.xPosition * w;
    const cy = bounds.y + p.yPosition * h;
    const spanPx = p.span * w;
    const archPx = p.archHeight * h;
    const railPx = p.railingHeight * h;
    const deckThickness = Math.max(2, h * 0.01);
    const leftX = cx - spanPx / 2;
    const rightX = cx + spanPx / 2;

    if (p.bridgeStyle === "arch") {
      // Stone arch bridge
      // Arch underside
      ctx.strokeStyle = color;
      ctx.lineWidth = deckThickness;
      ctx.beginPath();
      ctx.moveTo(leftX, cy);
      ctx.quadraticCurveTo(cx, cy + archPx, rightX, cy);
      ctx.stroke();

      // Fill arch
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(leftX, cy);
      ctx.quadraticCurveTo(cx, cy + archPx, rightX, cy);
      ctx.lineTo(rightX, cy + deckThickness);
      ctx.quadraticCurveTo(cx, cy + archPx + deckThickness, leftX, cy + deckThickness);
      ctx.closePath();
      ctx.fill();

      // Deck surface (flat on top)
      ctx.fillStyle = deckColor;
      ctx.fillRect(leftX, cy - deckThickness, spanPx, deckThickness);

      // Abutments (pillar supports at each end)
      const abutW = spanPx * 0.06;
      const abutH = archPx * 1.5;
      ctx.fillStyle = color;
      ctx.fillRect(leftX - abutW / 2, cy, abutW, abutH);
      ctx.fillRect(rightX - abutW / 2, cy, abutW, abutH);
    } else if (p.bridgeStyle === "suspension") {
      // Deck
      ctx.fillStyle = deckColor;
      ctx.fillRect(leftX, cy, spanPx, deckThickness);

      // Towers
      const towerW = spanPx * 0.03;
      const towerH = archPx * 2;
      ctx.fillStyle = color;
      const towerLeft = leftX + spanPx * 0.2;
      const towerRight = leftX + spanPx * 0.8;
      ctx.fillRect(towerLeft - towerW / 2, cy - towerH, towerW, towerH);
      ctx.fillRect(towerRight - towerW / 2, cy - towerH, towerW, towerH);

      // Main cables (catenary curves)
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;
      // Left span
      ctx.beginPath();
      ctx.moveTo(leftX, cy);
      ctx.quadraticCurveTo((leftX + towerLeft) / 2, cy - towerH * 0.3, towerLeft, cy - towerH);
      ctx.stroke();
      // Center span
      ctx.beginPath();
      ctx.moveTo(towerLeft, cy - towerH);
      ctx.quadraticCurveTo(cx, cy - towerH * 0.3, towerRight, cy - towerH);
      ctx.stroke();
      // Right span
      ctx.beginPath();
      ctx.moveTo(towerRight, cy - towerH);
      ctx.quadraticCurveTo((towerRight + rightX) / 2, cy - towerH * 0.3, rightX, cy);
      ctx.stroke();

      // Suspender cables
      const suspCount = 8;
      for (let i = 0; i < suspCount; i++) {
        const t = (i + 1) / (suspCount + 1);
        const sx = leftX + t * spanPx;
        // Approximate catenary Y
        const dist = Math.abs(sx - cx) / (spanPx / 2);
        const cableY = cy - towerH * (1 - dist * dist * 0.7);
        ctx.beginPath();
        ctx.moveTo(sx, cableY);
        ctx.lineTo(sx, cy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (p.bridgeStyle === "footbridge") {
      // Simple wooden footbridge with slight arc
      const arcOffset = archPx * 0.5;

      // Deck planks
      ctx.fillStyle = deckColor;
      const plankCount = 15;
      for (let i = 0; i <= plankCount; i++) {
        const t = i / plankCount;
        const px = leftX + t * spanPx;
        const py = cy - Math.sin(t * Math.PI) * arcOffset;
        const plankW = spanPx / plankCount + 1;
        ctx.fillRect(px, py, plankW, deckThickness);
      }

      // Railings
      if (railPx > 0) {
        ctx.strokeStyle = darken(deckColor, 0.6);
        ctx.lineWidth = 1;
        // Top rail
        ctx.beginPath();
        for (let i = 0; i <= 20; i++) {
          const t = i / 20;
          const px = leftX + t * spanPx;
          const py = cy - Math.sin(t * Math.PI) * arcOffset - railPx;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Vertical posts
        const postCount = 6;
        for (let i = 0; i <= postCount; i++) {
          const t = i / postCount;
          const px = leftX + t * spanPx;
          const py = cy - Math.sin(t * Math.PI) * arcOffset;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, py - railPx);
          ctx.stroke();
        }
      }
    } else {
      // Flat crossing: simple flat deck
      ctx.fillStyle = deckColor;
      ctx.fillRect(leftX, cy, spanPx, deckThickness * 1.5);

      // Support pillars
      const pillarCount = 2;
      const pillarW = spanPx * 0.04;
      const pillarH = archPx;
      ctx.fillStyle = color;
      for (let i = 0; i < pillarCount; i++) {
        const px = leftX + ((i + 1) / (pillarCount + 1)) * spanPx;
        ctx.fillRect(px - pillarW / 2, cy + deckThickness, pillarW, pillarH);
      }
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown bridge preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
