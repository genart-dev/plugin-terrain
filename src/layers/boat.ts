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
import type { BoatPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const BOAT_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Boat Type",
    type: "select",
    default: "sailboat",
    group: "preset",
    options: [
      { value: "sailboat", label: "Sailboat" },
      { value: "rowboat", label: "Rowboat" },
      { value: "fishing-boat", label: "Fishing Boat" },
      { value: "cargo-ship", label: "Cargo Ship" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  {
    key: "boatType",
    label: "Style",
    type: "select",
    default: "sailboat",
    group: "boat",
    options: [
      { value: "sailboat", label: "Sailboat" },
      { value: "rowboat", label: "Rowboat" },
      { value: "fishing", label: "Fishing" },
      { value: "ship", label: "Ship" },
    ],
  },
  { key: "color", label: "Hull Color", type: "color", default: "#4A3A30", group: "colors" },
  { key: "sailColor", label: "Sail/Cabin Color", type: "color", default: "#F0E8D8", group: "colors" },
  { key: "scale", label: "Scale", type: "number", default: 0.06, min: 0.02, max: 0.15, step: 0.01, group: "layout" },
  { key: "xPosition", label: "X Position", type: "number", default: 0.5, min: 0.05, max: 0.95, step: 0.05, group: "layout" },
  { key: "yPosition", label: "Y Position", type: "number", default: 0.55, min: 0.2, max: 0.9, step: 0.05, group: "layout" },
  { key: "tilt", label: "Tilt (Wave Rock)", type: "number", default: 0, min: -15, max: 15, step: 1, group: "boat" },
  createDepthLaneProperty("midground"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  boatType: string;
  color: string;
  sailColor: string;
  scale: number;
  xPosition: number;
  yPosition: number;
  tilt: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const bp = preset?.category === "boat" ? (preset as BoatPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    boatType: (properties.boatType as string) ?? bp?.boatType ?? "sailboat",
    color: (properties.color as string) || bp?.color || "#4A3A30",
    sailColor: (properties.sailColor as string) || bp?.sailColor || "#F0E8D8",
    scale: (properties.scale as number) ?? bp?.scale ?? 0.06,
    xPosition: (properties.xPosition as number) ?? bp?.xPosition ?? 0.5,
    yPosition: (properties.yPosition as number) ?? bp?.yPosition ?? 0.55,
    tilt: (properties.tilt as number) ?? bp?.tilt ?? 0,
    depthLane: (properties.depthLane as string) ?? "midground",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

let _warnedBoat = false;

/**
 * @deprecated Use `architecture:boat` from `@genart-dev/plugin-architecture` instead.
 * This layer will be removed when plugin-architecture ships (Phase E).
 */
export const boatLayerType: LayerTypeDefinition = {
  typeId: "terrain:boat",
  displayName: "Boat",
  icon: "boat",
  category: "draw",
  properties: BOAT_PROPERTIES,
  propertyEditorId: "terrain:boat-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(BOAT_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    if (!_warnedBoat) {
      _warnedBoat = true;
      console.warn("[terrain] terrain:boat is deprecated. Use architecture:boat from @genart-dev/plugin-architecture.");
    }
    const p = resolveProps(properties);
    const rng = mulberry32(p.seed);
    const w = bounds.width;
    const h = bounds.height;

    // Apply atmospheric depth
    let color = p.color;
    let sailColor = p.sailColor;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        color = applyAtmosphericDepth(color, laneConfig.depth, p.atmosphericMode);
        sailColor = applyAtmosphericDepth(sailColor, laneConfig.depth, p.atmosphericMode);
      }
    }

    const cx = bounds.x + p.xPosition * w;
    const cy = bounds.y + p.yPosition * h;
    const scalePx = p.scale * Math.min(w, h);

    // Apply tilt rotation
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((p.tilt * Math.PI) / 180);

    if (p.boatType === "sailboat") {
      // Hull
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-scalePx * 1.2, 0);
      ctx.quadraticCurveTo(-scalePx * 0.8, scalePx * 0.4, 0, scalePx * 0.3);
      ctx.quadraticCurveTo(scalePx * 0.8, scalePx * 0.2, scalePx * 1.0, 0);
      ctx.closePath();
      ctx.fill();

      // Mast
      ctx.fillStyle = color;
      ctx.fillRect(-scalePx * 0.05, -scalePx * 2, scalePx * 0.1, scalePx * 2);

      // Sail (triangle)
      ctx.fillStyle = sailColor;
      ctx.beginPath();
      ctx.moveTo(0, -scalePx * 1.8);
      ctx.lineTo(0, -scalePx * 0.2);
      ctx.lineTo(scalePx * 0.8, -scalePx * 0.3);
      ctx.closePath();
      ctx.fill();
    } else if (p.boatType === "rowboat") {
      // Hull arc
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-scalePx * 0.8, 0);
      ctx.quadraticCurveTo(-scalePx * 0.5, scalePx * 0.35, 0, scalePx * 0.3);
      ctx.quadraticCurveTo(scalePx * 0.5, scalePx * 0.25, scalePx * 0.8, 0);
      ctx.closePath();
      ctx.fill();

      // Thwart (seat)
      ctx.fillStyle = sailColor;
      ctx.fillRect(-scalePx * 0.3, -scalePx * 0.05, scalePx * 0.6, scalePx * 0.1);
    } else if (p.boatType === "fishing") {
      // Hull
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-scalePx * 1.0, 0);
      ctx.quadraticCurveTo(-scalePx * 0.6, scalePx * 0.4, 0, scalePx * 0.35);
      ctx.quadraticCurveTo(scalePx * 0.6, scalePx * 0.25, scalePx * 1.0, 0);
      ctx.closePath();
      ctx.fill();

      // Cabin
      ctx.fillStyle = sailColor;
      ctx.fillRect(-scalePx * 0.4, -scalePx * 0.5, scalePx * 0.5, scalePx * 0.5);

      // Mast
      ctx.fillStyle = color;
      ctx.fillRect(scalePx * 0.3, -scalePx * 1.2, scalePx * 0.08, scalePx * 1.2);
    } else {
      // Ship: large hull + superstructure + funnel
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-scalePx * 1.5, 0);
      ctx.quadraticCurveTo(-scalePx * 1.0, scalePx * 0.5, 0, scalePx * 0.4);
      ctx.quadraticCurveTo(scalePx * 1.0, scalePx * 0.3, scalePx * 1.5, 0);
      ctx.closePath();
      ctx.fill();

      // Superstructure
      ctx.fillStyle = sailColor;
      ctx.fillRect(-scalePx * 0.6, -scalePx * 0.6, scalePx * 0.8, scalePx * 0.6);

      // Funnel
      ctx.fillStyle = color;
      ctx.fillRect(-scalePx * 0.15, -scalePx * 1.0, scalePx * 0.3, scalePx * 0.4);
    }

    ctx.restore();
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown boat preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
