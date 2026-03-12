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
  { key: "color", label: "Rock Color", type: "color", default: "#A08060", group: "colors" },
  { key: "shadowColor", label: "Shadow Color", type: "color", default: "#604830", group: "colors" },
  { key: "height", label: "Height", type: "number", default: 0.6, min: 0.2, max: 1.0, step: 0.05, group: "layout" },
  { key: "xPosition", label: "X Position", type: "number", default: 0.0, min: 0.0, max: 0.7, step: 0.05, group: "layout" },
  { key: "width", label: "Width", type: "number", default: 0.3, min: 0.1, max: 0.8, step: 0.05, group: "layout" },
  { key: "roughness", label: "Roughness", type: "number", default: 0.5, min: 0, max: 1, step: 0.05, group: "texture" },
  { key: "ledgeCount", label: "Ledge Count", type: "number", default: 3, min: 0, max: 8, step: 1, group: "texture" },
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
    color: (properties.color as string) || cp?.color || "#A08060",
    shadowColor: (properties.shadowColor as string) || cp?.shadowColor || "#604830",
    height: (properties.height as number) ?? cp?.height ?? 0.6,
    xPosition: (properties.xPosition as number) ?? cp?.xPosition ?? 0.0,
    width: (properties.width as number) ?? cp?.width ?? 0.3,
    roughness: (properties.roughness as number) ?? cp?.roughness ?? 0.5,
    ledgeCount: (properties.ledgeCount as number) ?? cp?.ledgeCount ?? 3,
    depthLane: (properties.depthLane as string) ?? "background",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
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
    const noise = createValueNoise(p.seed + 800);
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

    const cliffX = bounds.x + p.xPosition * w;
    const cliffW = p.width * w;
    const cliffTop = bounds.y + (1 - p.height) * h;
    const cliffBottom = bounds.y + h;
    const cliffH = cliffBottom - cliffTop;

    // Draw cliff face silhouette with rough edge
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cliffX, cliffBottom);

    // Left edge (rough vertical face)
    const segments = 30;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = cliffBottom - t * cliffH;
      const n = noise(t * 8, p.seed * 0.01);
      const edgeOffset = (n - 0.5) * cliffW * 0.15 * p.roughness;
      ctx.lineTo(cliffX + edgeOffset, y);
    }

    // Top edge (jagged cliff top)
    const topSegments = 20;
    for (let i = 0; i <= topSegments; i++) {
      const t = i / topSegments;
      const x = cliffX + t * cliffW;
      const n = noise(t * 6 + 100, p.seed * 0.01);
      const topOffset = (n - 0.5) * cliffH * 0.1 * p.roughness;
      ctx.lineTo(x, cliffTop + topOffset);
    }

    // Right edge
    for (let i = segments; i >= 0; i--) {
      const t = i / segments;
      const y = cliffBottom - t * cliffH;
      const n = noise(t * 8 + 50, p.seed * 0.01 + 10);
      const edgeOffset = (n - 0.5) * cliffW * 0.1 * p.roughness;
      ctx.lineTo(cliffX + cliffW + edgeOffset, y);
    }

    ctx.closePath();
    ctx.fill();

    // Texture based on mode
    if (p.textureMode === "sandstone") {
      // Horizontal strata lines
      const strataCount = 15 + Math.round(p.roughness * 15);
      ctx.strokeStyle = shadowColor;
      for (let i = 0; i < strataCount; i++) {
        const y = cliffTop + (i / strataCount) * cliffH;
        ctx.globalAlpha = 0.1 + rng() * 0.15;
        ctx.lineWidth = 0.5 + rng() * 1.5;
        ctx.beginPath();
        ctx.moveTo(cliffX, y + (rng() - 0.5) * 3);
        ctx.lineTo(cliffX + cliffW, y + (rng() - 0.5) * 3);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (p.textureMode === "granite") {
      // Speckled granite texture
      const speckCount = Math.round(200 * p.roughness * (cliffW * cliffH) / (w * h));
      const darkSpeck = darken(color, 0.7);
      const lightSpeck = lighten(color, 0.2);
      for (let i = 0; i < speckCount; i++) {
        const sx = cliffX + rng() * cliffW;
        const sy = cliffTop + rng() * cliffH;
        ctx.fillStyle = rng() > 0.5 ? darkSpeck : lightSpeck;
        ctx.globalAlpha = 0.15 + rng() * 0.2;
        ctx.fillRect(sx, sy, 1 + rng() * 2, 1 + rng() * 2);
      }
      ctx.globalAlpha = 1;
    } else if (p.textureMode === "basalt") {
      // Vertical columnar joints
      const columnCount = 8 + Math.round(p.roughness * 12);
      ctx.strokeStyle = shadowColor;
      for (let i = 0; i < columnCount; i++) {
        const x = cliffX + (i / columnCount) * cliffW + (rng() - 0.5) * cliffW * 0.05;
        ctx.globalAlpha = 0.15 + rng() * 0.2;
        ctx.lineWidth = 0.5 + rng() * 1;
        ctx.beginPath();
        ctx.moveTo(x, cliffTop + rng() * cliffH * 0.1);
        // Slightly irregular vertical line
        const midY = cliffTop + cliffH * 0.5;
        ctx.lineTo(x + (rng() - 0.5) * 4, midY);
        ctx.lineTo(x + (rng() - 0.5) * 3, cliffBottom);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else {
      // Limestone: mixed horizontal and irregular cracks
      const crackCount = 10 + Math.round(p.roughness * 10);
      ctx.strokeStyle = shadowColor;
      for (let i = 0; i < crackCount; i++) {
        ctx.globalAlpha = 0.1 + rng() * 0.15;
        ctx.lineWidth = 0.5 + rng() * 1;
        const isHorizontal = rng() > 0.4;
        ctx.beginPath();
        if (isHorizontal) {
          const y = cliffTop + rng() * cliffH;
          ctx.moveTo(cliffX + rng() * cliffW * 0.3, y);
          ctx.lineTo(cliffX + cliffW * (0.5 + rng() * 0.5), y + (rng() - 0.5) * 5);
        } else {
          const x = cliffX + rng() * cliffW;
          ctx.moveTo(x, cliffTop + rng() * cliffH * 0.5);
          ctx.lineTo(x + (rng() - 0.5) * 8, cliffTop + cliffH * (0.5 + rng() * 0.5));
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Ledge shadows
    for (let i = 0; i < p.ledgeCount; i++) {
      const ledgeY = cliffTop + ((i + 1) / (p.ledgeCount + 1)) * cliffH;
      const ledgeDepth = 3 + rng() * 6;
      const [sr, sg, sb] = parseHex(shadowColor);
      ctx.fillStyle = `rgba(${sr},${sg},${sb},0.25)`;
      ctx.fillRect(cliffX, ledgeY, cliffW, ledgeDepth);
      // Light edge above ledge
      const lightColor = lighten(color, 0.2);
      const [lr, lg, lb] = parseHex(lightColor);
      ctx.fillStyle = `rgba(${lr},${lg},${lb},0.2)`;
      ctx.fillRect(cliffX, ledgeY - 1, cliffW, 1);
    }
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
