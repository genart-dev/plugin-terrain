/**
 * @genart-dev/plugin-terrain — Natural landscape element layers
 *
 * 21 layer types (sky, profile, clouds, water, river, path, shore, field, rock, treeline, celestial, fog,
 * starfield, cliff-face, snowfield, building, bridge, reflection, haze, fence, boat),
 * 38 MCP tools.
 */

import type { DesignPlugin, PluginContext } from "@genart-dev/core";
import { terrainMcpTools } from "./terrain-tools.js";
import {
  skyLayerType,
  profileLayerType,
  cloudsLayerType,
  waterLayerType,
  riverLayerType,
  pathLayerType,
  shoreLayerType,
  fieldLayerType,
  rockLayerType,
  treelineLayerType,
  celestialLayerType,
  fogLayerType,
  starfieldLayerType,
  cliffFaceLayerType,
  snowfieldLayerType,
  buildingLayerType,
  bridgeLayerType,
  reflectionLayerType,
  hazeLayerType,
  fenceLayerType,
  boatLayerType,
} from "./layers/index.js";

const terrainPlugin: DesignPlugin = {
  id: "terrain",
  name: "Terrain",
  version: "0.5.0",
  description:
    "Natural landscape element layers: sky gradients, terrain profiles, cloud formations, " +
    "water surfaces, perspective rivers, paths/trails, shore transitions, vegetation fields, " +
    "natural rock forms, treeline silhouettes, celestial bodies, occluding fog bands, " +
    "star fields, cliff faces, snow fields, building silhouettes, bridges, water reflections, " +
    "atmospheric haze, fences/walls, and boats/ships. " +
    "12 scene recipe tools for composing complete landscapes. " +
    "Depth lane system for cross-plugin depth coordination. " +
    "21 layer types, 38 MCP tools.",

  layerTypes: [
    skyLayerType,
    profileLayerType,
    cloudsLayerType,
    waterLayerType,
    riverLayerType,
    pathLayerType,
    shoreLayerType,
    fieldLayerType,
    rockLayerType,
    treelineLayerType,
    celestialLayerType,
    fogLayerType,
    starfieldLayerType,
    cliffFaceLayerType,
    snowfieldLayerType,
    buildingLayerType,
    bridgeLayerType,
    reflectionLayerType,
    hazeLayerType,
    fenceLayerType,
    boatLayerType,
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
  riverLayerType,
  pathLayerType,
  shoreLayerType,
  fieldLayerType,
  rockLayerType,
  treelineLayerType,
  celestialLayerType,
  fogLayerType,
  starfieldLayerType,
  cliffFaceLayerType,
  snowfieldLayerType,
  buildingLayerType,
  bridgeLayerType,
  reflectionLayerType,
  hazeLayerType,
  fenceLayerType,
  boatLayerType,
} from "./layers/index.js";

// Re-export presets
export { ALL_PRESETS, getPreset, filterPresets, searchPresets } from "./presets/index.js";
export type {
  TerrainPreset,
  SkyPreset,
  ProfilePreset,
  CloudPreset,
  WaterPreset,
  RiverPreset,
  PathPreset,
  ShorePreset,
  FieldPreset,
  RockPreset,
  TreelinePreset,
  CelestialPreset,
  FogPreset,
  StarfieldPreset,
  CliffFacePreset,
  SnowfieldPreset,
  BuildingPreset,
  BridgePreset,
  ReflectionPreset,
  HazePreset,
  FencePreset,
  BoatPreset,
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

// Re-export perspective curve system
export {
  evalBezier,
  evalBezierTangent,
  evalBezierNormal,
  getPathPresetCurve,
  samplePerspectiveCurve,
  drawPerspectiveRibbon,
  drawCrossLines,
} from "./shared/perspective-curve.js";
export type {
  Point2,
  BezierCurve,
  PathPresetType,
  CurveSample,
} from "./shared/perspective-curve.js";

// Re-export depth lane system
export {
  resolveDepthLane,
  depthForLane,
  parseDepthLaneSub,
  applyAtmosphericDepth,
  laneSubLevelAttenuation,
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  DEPTH_LANE_ORDER,
  DEPTH_LANE_OPTIONS,
} from "./shared/depth-lanes.js";
export type {
  DepthLane,
  DepthSubLevel,
  DepthLaneSub,
  DepthLaneConfig,
  AtmosphericMode,
  SubLevelAttenuation,
} from "./shared/depth-lanes.js";
