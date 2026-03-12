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
import type { BuildingPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const BUILDING_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Building Type",
    type: "select",
    default: "farmhouse",
    group: "preset",
    options: [
      { value: "farmhouse", label: "Farmhouse" },
      { value: "church-steeple", label: "Church Steeple" },
      { value: "tower-ruin", label: "Tower Ruin" },
      { value: "village-cluster", label: "Village Cluster" },
      { value: "temple", label: "Temple" },
      { value: "lighthouse", label: "Lighthouse" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  {
    key: "buildingType",
    label: "Form",
    type: "select",
    default: "farmhouse",
    group: "building",
    options: [
      { value: "farmhouse", label: "Farmhouse" },
      { value: "church", label: "Church" },
      { value: "tower", label: "Tower" },
      { value: "village", label: "Village Cluster" },
    ],
  },
  { key: "color", label: "Building Color", type: "color", default: "#5A5050", group: "colors" },
  { key: "roofColor", label: "Roof Color", type: "color", default: "#704030", group: "colors" },
  { key: "scale", label: "Scale", type: "number", default: 1.0, min: 0.3, max: 2.0, step: 0.1, group: "layout" },
  { key: "xPosition", label: "X Position", type: "number", default: 0.5, min: 0.0, max: 1.0, step: 0.05, group: "layout" },
  { key: "yPosition", label: "Y Position", type: "number", default: 0.6, min: 0.2, max: 0.95, step: 0.05, group: "layout" },
  { key: "windowCount", label: "Window Count", type: "number", default: 2, min: 0, max: 6, step: 1, group: "details" },
  createDepthLaneProperty("midground"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  buildingType: string;
  color: string;
  roofColor: string;
  scale: number;
  xPosition: number;
  yPosition: number;
  windowCount: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const bp = preset?.category === "building" ? (preset as BuildingPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    buildingType: (properties.buildingType as string) ?? bp?.buildingType ?? "farmhouse",
    color: (properties.color as string) || bp?.color || "#5A5050",
    roofColor: (properties.roofColor as string) || bp?.roofColor || "#704030",
    scale: (properties.scale as number) ?? bp?.scale ?? 1.0,
    xPosition: (properties.xPosition as number) ?? bp?.xPosition ?? 0.5,
    yPosition: (properties.yPosition as number) ?? bp?.yPosition ?? 0.6,
    windowCount: (properties.windowCount as number) ?? bp?.windowCount ?? 2,
    depthLane: (properties.depthLane as string) ?? "midground",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

function drawSimpleBuilding(
  ctx: CanvasRenderingContext2D,
  cx: number, baseY: number,
  bodyW: number, bodyH: number, roofH: number,
  bodyColor: string, roofColor: string,
  windowCount: number, rng: () => number,
): void {
  const left = cx - bodyW / 2;
  const bodyTop = baseY - bodyH;

  // Building body
  ctx.fillStyle = bodyColor;
  ctx.fillRect(left, bodyTop, bodyW, bodyH);

  // Roof (triangle)
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(left - bodyW * 0.1, bodyTop);
  ctx.lineTo(cx, bodyTop - roofH);
  ctx.lineTo(left + bodyW + bodyW * 0.1, bodyTop);
  ctx.closePath();
  ctx.fill();

  // Windows (small dark rectangles)
  if (windowCount > 0) {
    const windowColor = darken(bodyColor, 0.4);
    ctx.fillStyle = windowColor;
    const winW = bodyW * 0.12;
    const winH = bodyH * 0.15;
    const winY = bodyTop + bodyH * 0.3;
    const spacing = bodyW / (windowCount + 1);
    for (let i = 0; i < windowCount; i++) {
      const winX = left + spacing * (i + 1) - winW / 2;
      ctx.fillRect(winX, winY, winW, winH);
    }
  }

  // Door
  const doorW = bodyW * 0.15;
  const doorH = bodyH * 0.35;
  ctx.fillStyle = darken(bodyColor, 0.5);
  ctx.fillRect(cx - doorW / 2, baseY - doorH, doorW, doorH);
}

export const buildingLayerType: LayerTypeDefinition = {
  typeId: "terrain:building",
  displayName: "Building",
  icon: "building",
  category: "draw",
  properties: BUILDING_PROPERTIES,
  propertyEditorId: "terrain:building-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(BUILDING_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const rng = mulberry32(p.seed);
    const w = bounds.width;
    const h = bounds.height;

    // Apply atmospheric depth
    let color = p.color;
    let roofColor = p.roofColor;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        color = applyAtmosphericDepth(color, laneConfig.depth, p.atmosphericMode);
        roofColor = applyAtmosphericDepth(roofColor, laneConfig.depth, p.atmosphericMode);
      }
    }

    const cx = bounds.x + p.xPosition * w;
    const baseY = bounds.y + p.yPosition * h;
    const baseSize = Math.min(w, h) * 0.08 * p.scale;

    if (p.buildingType === "farmhouse") {
      drawSimpleBuilding(ctx, cx, baseY, baseSize * 1.2, baseSize, baseSize * 0.5, color, roofColor, p.windowCount, rng);
    } else if (p.buildingType === "church") {
      // Main building
      drawSimpleBuilding(ctx, cx, baseY, baseSize * 1.0, baseSize * 0.8, baseSize * 0.4, color, roofColor, p.windowCount, rng);
      // Steeple
      const steepleW = baseSize * 0.25;
      const steepleH = baseSize * 0.6;
      const steepleTop = baseY - baseSize * 0.8 - baseSize * 0.4;
      ctx.fillStyle = color;
      ctx.fillRect(cx - steepleW / 2, steepleTop - steepleH, steepleW, steepleH);
      // Spire
      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.moveTo(cx - steepleW * 0.6, steepleTop - steepleH);
      ctx.lineTo(cx, steepleTop - steepleH - baseSize * 0.4);
      ctx.lineTo(cx + steepleW * 0.6, steepleTop - steepleH);
      ctx.closePath();
      ctx.fill();
    } else if (p.buildingType === "tower") {
      // Tall narrow tower
      const towerW = baseSize * 0.4;
      const towerH = baseSize * 1.8;
      const towerTop = baseY - towerH;
      ctx.fillStyle = color;
      ctx.fillRect(cx - towerW / 2, towerTop, towerW, towerH);
      // Crenellations
      const crenW = towerW * 0.25;
      const crenH = towerW * 0.3;
      ctx.fillRect(cx - towerW / 2 - crenW * 0.3, towerTop - crenH, crenW, crenH);
      ctx.fillRect(cx + towerW / 2 - crenW * 0.7, towerTop - crenH, crenW, crenH);
      // Window slit
      ctx.fillStyle = darken(color, 0.4);
      ctx.fillRect(cx - towerW * 0.06, towerTop + towerH * 0.3, towerW * 0.12, towerH * 0.1);
    } else {
      // Village cluster: 3-5 small buildings
      const count = 3 + Math.floor(rng() * 3);
      for (let i = 0; i < count; i++) {
        const offsetX = (i - (count - 1) / 2) * baseSize * 0.8;
        const offsetY = (rng() - 0.5) * baseSize * 0.2;
        const bw = baseSize * (0.5 + rng() * 0.4);
        const bh = baseSize * (0.4 + rng() * 0.3);
        const rh = bh * (0.3 + rng() * 0.3);
        drawSimpleBuilding(ctx, cx + offsetX, baseY + offsetY, bw, bh, rh, color, roofColor, Math.min(p.windowCount, 2), rng);
      }
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown building preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
