/**
 * @genart-dev/plugin-terrain — Natural landscape element layers
 *
 * 4 layer types (sky, profile, clouds, water),
 * 21 presets, 8 MCP tools.
 */

import type { DesignPlugin, PluginContext } from "@genart-dev/core";
import { terrainMcpTools } from "./terrain-tools.js";
import {
  skyLayerType,
  profileLayerType,
  cloudsLayerType,
  waterLayerType,
} from "./layers/index.js";

const terrainPlugin: DesignPlugin = {
  id: "terrain",
  name: "Terrain",
  version: "0.1.0",
  description:
    "Natural landscape element layers: sky gradients, terrain profiles, cloud formations, " +
    "and water surfaces. 4 layer types, 21 presets, 8 MCP tools.",

  layerTypes: [
    skyLayerType,
    profileLayerType,
    cloudsLayerType,
    waterLayerType,
  ],
  tools: [],
  exportHandlers: [],
  mcpTools: terrainMcpTools,

  async initialize(_context: PluginContext): Promise<void> {},
  dispose(): void {},
};

export default terrainPlugin;

// Re-export layer types
export {
  skyLayerType,
  profileLayerType,
  cloudsLayerType,
  waterLayerType,
} from "./layers/index.js";

// Re-export presets
export { ALL_PRESETS, getPreset, filterPresets, searchPresets } from "./presets/index.js";
export type {
  TerrainPreset,
  SkyPreset,
  ProfilePreset,
  CloudPreset,
  WaterPreset,
  PresetCategory,
} from "./presets/types.js";

// Re-export tools
export { terrainMcpTools } from "./terrain-tools.js";

// Re-export shared utilities
export { mulberry32 } from "./shared/prng.js";
export { createValueNoise, createFractalNoise } from "./shared/noise.js";
export { parseHex, toHex, lerpColor, darken, lighten } from "./shared/color-utils.js";
export { applyDepthEasing } from "./shared/depth.js";
export type { DepthEasing } from "./shared/depth.js";
