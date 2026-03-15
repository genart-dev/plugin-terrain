/**
 * MCP tool definitions for plugin-terrain.
 *
 * 38 tools: add_sky, add_terrain_profile, add_clouds, add_water_surface,
 * add_river, add_path, add_shore, add_field, add_rock, add_treeline,
 * add_celestial, add_fog_layer, add_starfield, add_cliff_face, add_snowfield,
 * add_building, add_bridge, add_reflection,
 * add_haze, add_fence, add_boat,
 * create_landscape, create_mountain_valley, create_river_scene, create_coastal_moonlight,
 * create_park_riverside, create_shan_shui, create_pastoral, create_forest_clearing,
 * create_alpine_lake, create_japanese_garden, create_desert_expanse, create_winter_woodland,
 * create_tropical_coast,
 * set_time_of_day, list_terrain_presets, set_terrain_depth, set_depth_lane.
 */

import type {
  McpToolDefinition,
  McpToolContext,
  McpToolResult,
  DesignLayer,
  LayerTransform,
  LayerProperties,
} from "@genart-dev/core";
import { ALL_PRESETS, getPreset, filterPresets } from "./presets/index.js";
import type { TerrainPreset, PresetCategory, SkyPreset } from "./presets/types.js";
import { parseDepthLaneSub, DEPTH_LANE_ORDER } from "./shared/depth-lanes.js";
import type { AtmosphericMode } from "./shared/depth-lanes.js";

function textResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }] };
}

function errorResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

function generateLayerId(): string {
  return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function fullCanvasTransform(ctx: McpToolContext): LayerTransform {
  return {
    x: 0,
    y: 0,
    width: ctx.canvasWidth,
    height: ctx.canvasHeight,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    anchorX: 0,
    anchorY: 0,
  };
}

function createLayer(
  typeId: string,
  name: string,
  ctx: McpToolContext,
  properties: Record<string, unknown>,
): DesignLayer {
  return {
    id: generateLayerId(),
    type: typeId,
    name,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    transform: fullCanvasTransform(ctx),
    properties: properties as Record<string, string | number | boolean | null>,
  };
}

// ---------------------------------------------------------------------------
// add_sky
// ---------------------------------------------------------------------------

const addSkyTool: McpToolDefinition = {
  name: "add_sky",
  description:
    "Add a sky gradient layer to the sketch. Choose a time-of-day preset (dawn, noon, golden-hour, dusk, night) " +
    "or set custom zenith/horizon/haze colors. Sky layers should be at the bottom of the layer stack.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: ["dawn", "noon", "golden-hour", "dusk", "night"],
        description: "Time-of-day preset. Defaults to 'noon'.",
      },
      zenithColor: { type: "string", description: "Override zenith (top) color as hex." },
      horizonColor: { type: "string", description: "Override horizon (bottom) color as hex." },
      hazeIntensity: { type: "number", description: "Haze band intensity 0-1." },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "noon";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown sky preset "${presetId}". Options: dawn, noon, golden-hour, dusk, night.`);
    }

    const properties: Record<string, unknown> = { preset: presetId };
    if (input.zenithColor) properties.zenithColor = input.zenithColor;
    if (input.horizonColor) properties.horizonColor = input.horizonColor;
    if (input.hazeIntensity !== undefined) properties.hazeIntensity = input.hazeIntensity;

    const layerName = (input.name as string) ?? `Sky (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:sky", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added sky layer "${layerName}" with ${presetId} preset.\n` +
      `Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_terrain_profile
// ---------------------------------------------------------------------------

const addTerrainProfileTool: McpToolDefinition = {
  name: "add_terrain_profile",
  description:
    "Add terrain ridgeline silhouettes to the sketch. Choose from presets: alpine-range, rolling-hills, " +
    "mesa-plateau, coastal-cliffs, sand-dunes, foothills. Renders back-to-front layered noise ridges with depth-aware coloring.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: ["alpine-range", "rolling-hills", "mesa-plateau", "coastal-cliffs", "sand-dunes", "foothills"],
        description: "Terrain profile preset. Defaults to 'rolling-hills'.",
      },
      seed: { type: "number", description: "Random seed for terrain variation." },
      ridgeCount: { type: "number", description: "Number of ridges (1-8)." },
      foregroundColor: { type: "string", description: "Override foreground color as hex." },
      backgroundRidgeColor: { type: "string", description: "Override background ridge color as hex." },
      depthLane: {
        type: "string",
        description: "Depth lane placement (e.g. 'background', 'far-background-1', 'foreground-3'). Defaults to 'background'.",
      },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode. 'western' adds blue-shift + desaturation toward distance, 'ink-wash' fades to warm paper tone. Defaults to 'none'.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "rolling-hills";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown profile preset "${presetId}". Use list_terrain_presets to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.ridgeCount !== undefined) properties.ridgeCount = input.ridgeCount;
    if (input.foregroundColor) properties.foregroundColor = input.foregroundColor;
    if (input.backgroundRidgeColor) properties.backgroundRidgeColor = input.backgroundRidgeColor;
    if (input.depthLane) {
      if (!parseDepthLaneSub(input.depthLane as string)) {
        return errorResult(`Invalid depth lane "${input.depthLane}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`);
      }
      properties.depthLane = input.depthLane;
    }
    if (input.atmosphericMode) properties.atmosphericMode = input.atmosphericMode;

    const layerName = (input.name as string) ?? `Terrain (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:profile", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added terrain profile "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_clouds
// ---------------------------------------------------------------------------

const addCloudsTool: McpToolDefinition = {
  name: "add_clouds",
  description:
    "Add a cloud layer to the sketch. Choose from presets: fair-weather, overcast, wispy-high, " +
    "storm-clouds, scattered. Renders noise-driven cloud formations via ImageData buffer.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: ["fair-weather", "overcast", "wispy-high", "storm-clouds", "scattered"],
        description: "Cloud preset. Defaults to 'fair-weather'.",
      },
      seed: { type: "number", description: "Random seed for cloud variation." },
      coverage: { type: "number", description: "Cloud coverage 0-1." },
      cloudType: {
        type: "string",
        enum: ["cumulus", "stratus", "cirrus"],
        description: "Cloud formation type.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "fair-weather";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown cloud preset "${presetId}". Use list_terrain_presets to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.coverage !== undefined) properties.coverage = input.coverage;
    if (input.cloudType) properties.cloudType = input.cloudType;

    const layerName = (input.name as string) ?? `Clouds (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:clouds", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added cloud layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_water_surface
// ---------------------------------------------------------------------------

const addWaterSurfaceTool: McpToolDefinition = {
  name: "add_water_surface",
  description:
    "Add a water surface layer to the sketch. Choose from presets: still-lake, choppy-sea, " +
    "mountain-stream, river, pond. Renders gradient fill with wave lines and shimmer highlights.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: ["still-lake", "choppy-sea", "mountain-stream", "river", "pond"],
        description: "Water preset. Defaults to 'still-lake'.",
      },
      seed: { type: "number", description: "Random seed for water variation." },
      waterlinePosition: { type: "number", description: "Waterline position 0-1 (0 = top, 1 = bottom)." },
      waterColor: { type: "string", description: "Override water color as hex." },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "still-lake";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown water preset "${presetId}". Use list_terrain_presets to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.waterlinePosition !== undefined) properties.waterlinePosition = input.waterlinePosition;
    if (input.waterColor) properties.waterColor = input.waterColor;

    const layerName = (input.name as string) ?? `Water (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:water", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added water layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// create_landscape
// ---------------------------------------------------------------------------

const createLandscapeTool: McpToolDefinition = {
  name: "create_landscape",
  description:
    "Create a complete landscape scene by adding sky + terrain profile + optional clouds + optional water " +
    "in correct layer order. Each layer is auto-assigned an appropriate depth lane. " +
    "Set atmosphericMode to 'western' or 'ink-wash' for automatic atmospheric perspective on terrain ridges. " +
    "Returns all created layer IDs.",
  inputSchema: {
    type: "object",
    properties: {
      skyPreset: {
        type: "string",
        enum: ["dawn", "noon", "golden-hour", "dusk", "night"],
        description: "Sky time-of-day. Defaults to 'noon'.",
      },
      terrainPreset: {
        type: "string",
        enum: ["alpine-range", "rolling-hills", "mesa-plateau", "coastal-cliffs", "sand-dunes", "foothills"],
        description: "Terrain profile. Defaults to 'rolling-hills'.",
      },
      cloudPreset: {
        type: "string",
        enum: ["fair-weather", "overcast", "wispy-high", "storm-clouds", "scattered"],
        description: "Cloud type. Omit for no clouds.",
      },
      waterPreset: {
        type: "string",
        enum: ["still-lake", "choppy-sea", "mountain-stream", "river", "pond"],
        description: "Water type. Omit for no water.",
      },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode for terrain ridges. Defaults to 'none'.",
      },
      seed: { type: "number", description: "Base seed for all layers." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const atmoMode = (input.atmosphericMode as string) ?? "none";
    const layerIds: string[] = [];
    const summary: string[] = [];

    // Sky (bottom of stack) — depth lane: sky
    const skyPresetId = (input.skyPreset as string) ?? "noon";
    const skyLayer = createLayer("terrain:sky", `Sky (${skyPresetId})`, ctx, {
      preset: skyPresetId,
      depthLane: "sky",
    });
    ctx.layers.add(skyLayer);
    layerIds.push(skyLayer.id);
    summary.push(`Sky: ${skyPresetId} [sky]`);

    // Terrain profile — depth lane: background (spans far-background to foreground via ridges)
    const terrainPresetId = (input.terrainPreset as string) ?? "rolling-hills";
    const terrainLayer = createLayer("terrain:profile", `Terrain (${terrainPresetId})`, ctx, {
      preset: terrainPresetId,
      seed,
      depthLane: "background",
      atmosphericMode: atmoMode,
    });
    ctx.layers.add(terrainLayer);
    layerIds.push(terrainLayer.id);
    summary.push(`Terrain: ${terrainPresetId} [background] (seed ${seed}${atmoMode !== "none" ? `, ${atmoMode} atmosphere` : ""})`);

    // Water (optional) — depth lane: midground
    if (input.waterPreset) {
      const waterPresetId = input.waterPreset as string;
      const waterLayer = createLayer("terrain:water", `Water (${waterPresetId})`, ctx, {
        preset: waterPresetId,
        seed: seed + 1,
        depthLane: "midground",
      });
      ctx.layers.add(waterLayer);
      layerIds.push(waterLayer.id);
      summary.push(`Water: ${waterPresetId} [midground]`);
    }

    // Clouds (optional, on top) — depth lane: overlay
    if (input.cloudPreset) {
      const cloudPresetId = input.cloudPreset as string;
      const cloudLayer = createLayer("terrain:clouds", `Clouds (${cloudPresetId})`, ctx, {
        preset: cloudPresetId,
        seed: seed + 2,
        depthLane: "overlay",
      });
      ctx.layers.add(cloudLayer);
      layerIds.push(cloudLayer.id);
      summary.push(`Clouds: ${cloudPresetId} [overlay]`);
    }

    ctx.emitChange("layer-added");

    return textResult(
      `Landscape created (${layerIds.length} layers):\n` +
      summary.map((s) => `  ${s}`).join("\n") +
      `\nLayer IDs: ${layerIds.join(", ")}`,
    );
  },
};

// ---------------------------------------------------------------------------
// set_time_of_day
// ---------------------------------------------------------------------------

const setTimeOfDayTool: McpToolDefinition = {
  name: "set_time_of_day",
  description:
    "Update an existing sky layer to a time-of-day preset, changing zenith, horizon, and haze colors.",
  inputSchema: {
    type: "object",
    required: ["layerId", "timeOfDay"],
    properties: {
      layerId: { type: "string", description: "Target sky layer ID." },
      timeOfDay: {
        type: "string",
        enum: ["dawn", "noon", "golden-hour", "dusk", "night"],
        description: "Time-of-day preset to apply.",
      },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const layer = ctx.layers.get(layerId);
    if (!layer) return errorResult(`Layer "${layerId}" not found.`);
    if (layer.type !== "terrain:sky") {
      return errorResult(`Layer "${layerId}" is type "${layer.type}", not terrain:sky.`);
    }

    const timeOfDay = input.timeOfDay as string;
    const preset = getPreset(timeOfDay) as SkyPreset | undefined;
    if (!preset || preset.category !== "sky") {
      return errorResult(`Unknown time-of-day "${timeOfDay}".`);
    }

    ctx.layers.updateProperties(layerId, {
      preset: timeOfDay,
      zenithColor: preset.zenithColor,
      horizonColor: preset.horizonColor,
      hazeColor: preset.hazeColor,
      hazeIntensity: preset.hazeIntensity,
      hazePosition: preset.hazePosition,
      hazeWidth: preset.hazeWidth,
    });
    ctx.emitChange("layer-updated");

    return textResult(
      `Updated "${layer.name}" to ${preset.name}:\n` +
      `  Zenith: ${preset.zenithColor}\n` +
      `  Horizon: ${preset.horizonColor}\n` +
      `  Haze: ${preset.hazeColor} (${preset.hazeIntensity})`,
    );
  },
};

// ---------------------------------------------------------------------------
// list_terrain_presets
// ---------------------------------------------------------------------------

const listTerrainPresetsTool: McpToolDefinition = {
  name: "list_terrain_presets",
  description:
    `List all ${ALL_PRESETS.length} terrain presets, optionally filtered by category (sky, profile, clouds, water, river, path, shore, field, rock, treeline, celestial, fog, starfield, cliff-face, snowfield, building, bridge, reflection, haze, fence, boat).`,
  inputSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["sky", "profile", "clouds", "water", "river", "path", "shore", "field", "rock", "treeline", "celestial", "fog", "starfield", "cliff-face", "snowfield", "building", "bridge", "reflection", "haze", "fence", "boat"],
        description: "Filter by category.",
      },
    },
  },
  async handler(input: Record<string, unknown>): Promise<McpToolResult> {
    const results = input.category
      ? filterPresets({ category: input.category as PresetCategory })
      : ALL_PRESETS;

    if (results.length === 0) {
      return textResult("No presets match the given filter.");
    }

    const lines = results.map((p) =>
      `  ${p.id} — ${p.name} [${p.category}] ${p.description}`,
    );

    return textResult(
      `${results.length} preset${results.length === 1 ? "" : "s"}:\n${lines.join("\n")}`,
    );
  },
};

// ---------------------------------------------------------------------------
// set_terrain_depth
// ---------------------------------------------------------------------------

const setTerrainDepthTool: McpToolDefinition = {
  name: "set_terrain_depth",
  description:
    "Adjust depth properties on a terrain profile layer: ridge count, depth easing, elevation range, and color shift.",
  inputSchema: {
    type: "object",
    required: ["layerId"],
    properties: {
      layerId: { type: "string", description: "Target terrain profile layer ID." },
      ridgeCount: { type: "number", description: "Number of ridges (1-8)." },
      depthEasing: {
        type: "string",
        enum: ["linear", "quadratic", "cubic", "exponential"],
        description: "Depth easing curve.",
      },
      elevationMin: { type: "number", description: "Minimum elevation (0-1, near ridges)." },
      elevationMax: { type: "number", description: "Maximum elevation (0-1, far ridges)." },
      depthValueShift: { type: "number", description: "Value shift between far and near ridges (0-1)." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const layer = ctx.layers.get(layerId);
    if (!layer) return errorResult(`Layer "${layerId}" not found.`);
    if (layer.type !== "terrain:profile") {
      return errorResult(`Layer "${layerId}" is type "${layer.type}", not terrain:profile.`);
    }

    const changes: string[] = [];
    const propUpdates: Partial<LayerProperties> = {};

    if (input.ridgeCount !== undefined) {
      const rc = Math.max(1, Math.min(8, input.ridgeCount as number));
      propUpdates.ridgeCount = rc;
      changes.push(`ridgeCount → ${rc}`);
    }
    if (input.depthEasing !== undefined) {
      propUpdates.depthEasing = input.depthEasing as string;
      changes.push(`depthEasing → ${input.depthEasing}`);
    }
    if (input.elevationMin !== undefined) {
      propUpdates.elevationMin = input.elevationMin as number;
      changes.push(`elevationMin → ${input.elevationMin}`);
    }
    if (input.elevationMax !== undefined) {
      propUpdates.elevationMax = input.elevationMax as number;
      changes.push(`elevationMax → ${input.elevationMax}`);
    }
    if (input.depthValueShift !== undefined) {
      propUpdates.depthValueShift = input.depthValueShift as number;
      changes.push(`depthValueShift → ${input.depthValueShift}`);
    }

    if (changes.length === 0) return errorResult("No depth changes specified.");

    ctx.layers.updateProperties(layerId, propUpdates);
    ctx.emitChange("layer-updated");

    return textResult(`Updated depth on "${layer.name}":\n${changes.join("\n")}`);
  },
};

// ---------------------------------------------------------------------------
// set_depth_lane
// ---------------------------------------------------------------------------

const TERRAIN_TYPE_IDS = ["terrain:sky", "terrain:profile", "terrain:clouds", "terrain:water", "terrain:river", "terrain:path", "terrain:shore", "terrain:field", "terrain:rock", "terrain:treeline", "terrain:celestial", "terrain:fog-layer", "terrain:starfield", "terrain:cliff-face", "terrain:snowfield", "terrain:building", "terrain:bridge", "terrain:reflection", "terrain:haze", "terrain:fence", "terrain:boat"];

const setDepthLaneTool: McpToolDefinition = {
  name: "set_depth_lane",
  description:
    "Set the depth lane on any terrain layer. Depth lanes define named depth slots that all plugins understand: " +
    "sky, far-background, background, midground, foreground, ground-plane, overlay. " +
    "Append -1 (back), -2 (mid), or -3 (front) for sub-level control within a lane (e.g. 'background-1'). " +
    "Optionally set the atmospheric depth mode on terrain:profile layers.",
  inputSchema: {
    type: "object",
    required: ["layerId", "depthLane"],
    properties: {
      layerId: { type: "string", description: "Target layer ID." },
      depthLane: {
        type: "string",
        description: "Depth lane (e.g. 'background', 'foreground-3', 'midground-1').",
      },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode (terrain:profile only). 'western' = blue-shift, 'ink-wash' = paper-tone fade.",
      },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const layer = ctx.layers.get(layerId);
    if (!layer) return errorResult(`Layer "${layerId}" not found.`);
    if (!TERRAIN_TYPE_IDS.includes(layer.type)) {
      return errorResult(`Layer "${layerId}" is type "${layer.type}", not a terrain layer.`);
    }

    const laneSub = input.depthLane as string;
    const parsed = parseDepthLaneSub(laneSub);
    if (!parsed) {
      return errorResult(
        `Invalid depth lane "${laneSub}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`,
      );
    }

    const propUpdates: Partial<LayerProperties> = { depthLane: laneSub };
    const changes: string[] = [`depthLane → ${laneSub} (${parsed.lane}, sub-level ${parsed.subLevel})`];

    if (input.atmosphericMode !== undefined) {
      if (layer.type !== "terrain:profile") {
        return errorResult(`atmosphericMode is only supported on terrain:profile layers, not ${layer.type}.`);
      }
      const mode = input.atmosphericMode as AtmosphericMode;
      propUpdates.atmosphericMode = mode;
      changes.push(`atmosphericMode → ${mode}`);
    }

    ctx.layers.updateProperties(layerId, propUpdates);
    ctx.emitChange("layer-updated");

    return textResult(`Updated "${layer.name}":\n${changes.join("\n")}`);
  },
};

// ---------------------------------------------------------------------------
// add_river
// ---------------------------------------------------------------------------

const RIVER_PRESETS_LIST = [
  "gentle-stream", "wide-river", "mountain-creek", "lazy-oxbow",
  "forest-brook", "delta-channels", "waterfall-stream", "tidal-estuary",
] as const;

const addRiverTool: McpToolDefinition = {
  name: "add_river",
  description:
    "Add a perspective river/stream layer. The river flows from background toward foreground with width " +
    "narrowing toward the horizon. Choose a preset or customize path shape, bank style, and ripple intensity. " +
    "Presets: gentle-stream, wide-river, mountain-creek, lazy-oxbow, forest-brook, delta-channels, waterfall-stream, tidal-estuary.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: [...RIVER_PRESETS_LIST],
        description: "River preset. Defaults to 'gentle-stream'.",
      },
      seed: { type: "number", description: "Random seed for river variation." },
      pathPreset: {
        type: "string",
        enum: ["straight", "meandering", "s-curve", "winding", "switchback", "fork"],
        description: "Override path curve shape.",
      },
      widthNear: { type: "number", description: "Width in pixels at the near (foreground) end." },
      widthFar: { type: "number", description: "Width in pixels at the far (background) end." },
      waterColor: { type: "string", description: "Water color as hex." },
      bankColor: { type: "string", description: "Bank/shore color as hex." },
      bankStyle: {
        type: "string",
        enum: ["none", "soft-grass", "rocky", "sandy", "muddy"],
        description: "Bank edge treatment style.",
      },
      depthLane: {
        type: "string",
        description: "Depth lane placement. Defaults to 'midground'.",
      },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "gentle-stream";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown river preset "${presetId}". Use list_terrain_presets category=river to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.pathPreset) properties.pathPreset = input.pathPreset;
    if (input.widthNear !== undefined) properties.widthNear = input.widthNear;
    if (input.widthFar !== undefined) properties.widthFar = input.widthFar;
    if (input.waterColor) properties.waterColor = input.waterColor;
    if (input.bankColor) properties.bankColor = input.bankColor;
    if (input.bankStyle) properties.bankStyle = input.bankStyle;
    if (input.depthLane) {
      if (!parseDepthLaneSub(input.depthLane as string)) {
        return errorResult(`Invalid depth lane "${input.depthLane}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`);
      }
      properties.depthLane = input.depthLane;
    }
    if (input.atmosphericMode) properties.atmosphericMode = input.atmosphericMode;

    const layerName = (input.name as string) ?? `River (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:river", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added river layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_path
// ---------------------------------------------------------------------------

const PATH_PRESETS_LIST = [
  "dirt-trail", "cobblestone-road", "gravel-path", "forest-path",
  "mountain-switchback", "garden-walk", "sand-track", "country-lane",
] as const;

const addPathTool: McpToolDefinition = {
  name: "add_path",
  description:
    "Add a perspective path/trail layer. The path recedes from foreground into background with width narrowing " +
    "toward the horizon. Supports surface textures (dirt, cobblestone, gravel, sand, worn-grass, flagstone) and " +
    "edge treatments (sharp, grass-encroach, scattered-stones, overgrown). " +
    "Presets: dirt-trail, cobblestone-road, gravel-path, forest-path, mountain-switchback, garden-walk, sand-track, country-lane.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: [...PATH_PRESETS_LIST],
        description: "Path preset. Defaults to 'dirt-trail'.",
      },
      seed: { type: "number", description: "Random seed for path variation." },
      pathPreset: {
        type: "string",
        enum: ["straight", "meandering", "winding", "switchback", "fork"],
        description: "Override path curve shape.",
      },
      widthNear: { type: "number", description: "Width in pixels at the near end." },
      widthFar: { type: "number", description: "Width in pixels at the far end." },
      surfaceColor: { type: "string", description: "Surface color as hex." },
      surfaceStyle: {
        type: "string",
        enum: ["dirt", "cobblestone", "gravel", "sand", "worn-grass", "flagstone"],
        description: "Surface texture style.",
      },
      edgeTreatment: {
        type: "string",
        enum: ["sharp", "grass-encroach", "scattered-stones", "overgrown"],
        description: "Edge treatment at path borders.",
      },
      wear: { type: "number", description: "Wear level 0-1 (0=pristine, 1=heavily worn)." },
      depthLane: {
        type: "string",
        description: "Depth lane placement. Defaults to 'midground'.",
      },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "dirt-trail";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown path preset "${presetId}". Use list_terrain_presets category=path to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.pathPreset) properties.pathPreset = input.pathPreset;
    if (input.widthNear !== undefined) properties.widthNear = input.widthNear;
    if (input.widthFar !== undefined) properties.widthFar = input.widthFar;
    if (input.surfaceColor) properties.surfaceColor = input.surfaceColor;
    if (input.surfaceStyle) properties.surfaceStyle = input.surfaceStyle;
    if (input.edgeTreatment) properties.edgeTreatment = input.edgeTreatment;
    if (input.wear !== undefined) properties.wear = input.wear;
    if (input.depthLane) {
      if (!parseDepthLaneSub(input.depthLane as string)) {
        return errorResult(`Invalid depth lane "${input.depthLane}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`);
      }
      properties.depthLane = input.depthLane;
    }
    if (input.atmosphericMode) properties.atmosphericMode = input.atmosphericMode;

    const layerName = (input.name as string) ?? `Path (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:path", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added path layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_shore
// ---------------------------------------------------------------------------

const SHORE_PRESETS_LIST = [
  "sandy-beach", "rocky-shore", "muddy-riverbank", "grassy-bank", "tidal-flat", "cliff-base",
] as const;

const addShoreTool: McpToolDefinition = {
  name: "add_shore",
  description:
    "Add a shore/coastline transition layer between water and land. Renders the strip where water meets " +
    "ground with foam lines, debris, and wet/dry gradients. Position it at the same waterline as your water layer. " +
    "Presets: sandy-beach, rocky-shore, muddy-riverbank, grassy-bank, tidal-flat, cliff-base.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: [...SHORE_PRESETS_LIST],
        description: "Shore preset. Defaults to 'sandy-beach'.",
      },
      seed: { type: "number", description: "Random seed for shore variation." },
      waterlinePosition: { type: "number", description: "Waterline position 0-1 (0=top, 1=bottom). Match this to your water layer." },
      width: { type: "number", description: "Shore strip width as fraction of canvas height (0.01-0.25)." },
      color: { type: "string", description: "Dry shore color as hex." },
      wetColor: { type: "string", description: "Wet shore color as hex." },
      foamIntensity: { type: "number", description: "Foam line intensity 0-1." },
      debrisType: {
        type: "string",
        enum: ["none", "seaweed", "driftwood", "shells", "pebbles"],
        description: "Type of debris scattered along the shore.",
      },
      depthLane: {
        type: "string",
        description: "Depth lane placement. Defaults to 'ground-plane'.",
      },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "sandy-beach";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown shore preset "${presetId}". Use list_terrain_presets category=shore to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.waterlinePosition !== undefined) properties.waterlinePosition = input.waterlinePosition;
    if (input.width !== undefined) properties.width = input.width;
    if (input.color) properties.color = input.color;
    if (input.wetColor) properties.wetColor = input.wetColor;
    if (input.foamIntensity !== undefined) properties.foamIntensity = input.foamIntensity;
    if (input.debrisType) properties.debrisType = input.debrisType;
    if (input.depthLane) {
      if (!parseDepthLaneSub(input.depthLane as string)) {
        return errorResult(`Invalid depth lane "${input.depthLane}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`);
      }
      properties.depthLane = input.depthLane;
    }
    if (input.atmosphericMode) properties.atmosphericMode = input.atmosphericMode;

    const layerName = (input.name as string) ?? `Shore (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:shore", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added shore layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_field
// ---------------------------------------------------------------------------

const FIELD_PRESETS_LIST = [
  "meadow-grass", "wheat-field", "wildflower-meadow", "lavender-rows",
  "dry-savanna", "rice-paddy", "autumn-stubble", "snow-covered",
] as const;

const addFieldTool: McpToolDefinition = {
  name: "add_field",
  description:
    "Add a vegetation field layer with depth-receding marks. Renders grass, wheat, or wildflower marks that " +
    "diminish in size toward the horizon. Supports wind direction and seasonal tinting. " +
    "Presets: meadow-grass, wheat-field, wildflower-meadow, lavender-rows, dry-savanna, rice-paddy, autumn-stubble, snow-covered.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: [...FIELD_PRESETS_LIST],
        description: "Field preset. Defaults to 'meadow-grass'.",
      },
      seed: { type: "number", description: "Random seed for field variation." },
      vegetationType: {
        type: "string",
        enum: ["grass", "wheat", "wildflowers"],
        description: "Vegetation type.",
      },
      color: { type: "string", description: "Primary vegetation color as hex." },
      secondaryColor: { type: "string", description: "Secondary/accent color as hex." },
      density: { type: "number", description: "Mark density 0.1-1.0." },
      windDirection: { type: "number", description: "Wind direction in degrees (0-360)." },
      windStrength: { type: "number", description: "Wind strength 0-1." },
      seasonalTint: {
        type: "string",
        enum: ["spring", "summer", "autumn", "winter"],
        description: "Seasonal color tinting.",
      },
      depthLane: {
        type: "string",
        description: "Depth lane placement. Defaults to 'midground'.",
      },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "meadow-grass";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown field preset "${presetId}". Use list_terrain_presets category=field to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.vegetationType) properties.vegetationType = input.vegetationType;
    if (input.color) properties.color = input.color;
    if (input.secondaryColor) properties.secondaryColor = input.secondaryColor;
    if (input.density !== undefined) properties.density = input.density;
    if (input.windDirection !== undefined) properties.windDirection = input.windDirection;
    if (input.windStrength !== undefined) properties.windStrength = input.windStrength;
    if (input.seasonalTint) properties.seasonalTint = input.seasonalTint;
    if (input.depthLane) {
      if (!parseDepthLaneSub(input.depthLane as string)) {
        return errorResult(`Invalid depth lane "${input.depthLane}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`);
      }
      properties.depthLane = input.depthLane;
    }
    if (input.atmosphericMode) properties.atmosphericMode = input.atmosphericMode;

    const layerName = (input.name as string) ?? `Field (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:field", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added field layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_rock
// ---------------------------------------------------------------------------

const ROCK_PRESETS_LIST = [
  "granite-boulder", "sandstone-outcrop", "shan-shui-rock", "mossy-rock",
  "slate-shelf", "volcanic-basalt",
] as const;

const addRockTool: McpToolDefinition = {
  name: "add_rock",
  description:
    "Add a natural rock form layer. Renders a depth-aware rock with silhouette, shadow, and texture. " +
    "Supports 4 rock types (boulder, outcrop, pinnacle, shelf) and 4 texture modes " +
    "(speckled, striated, cun-fa for Chinese ink style, cracked). " +
    "Presets: granite-boulder, sandstone-outcrop, shan-shui-rock, mossy-rock, slate-shelf, volcanic-basalt.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: [...ROCK_PRESETS_LIST],
        description: "Rock preset. Defaults to 'granite-boulder'.",
      },
      seed: { type: "number", description: "Random seed for rock variation." },
      rockType: {
        type: "string",
        enum: ["boulder", "outcrop", "pinnacle", "shelf"],
        description: "Rock form type.",
      },
      textureMode: {
        type: "string",
        enum: ["speckled", "striated", "cun-fa", "cracked"],
        description: "Surface texture mode. 'cun-fa' renders traditional Chinese ink brush strokes.",
      },
      color: { type: "string", description: "Rock body color as hex." },
      shadowColor: { type: "string", description: "Shadow color as hex." },
      scale: { type: "number", description: "Scale factor 0.3-2.0." },
      roughness: { type: "number", description: "Surface roughness 0-1." },
      crackDensity: { type: "number", description: "Crack/crevice density 0-1." },
      depthLane: {
        type: "string",
        description: "Depth lane placement. Defaults to 'foreground'.",
      },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "granite-boulder";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown rock preset "${presetId}". Use list_terrain_presets category=rock to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.rockType) properties.rockType = input.rockType;
    if (input.textureMode) properties.textureMode = input.textureMode;
    if (input.color) properties.color = input.color;
    if (input.shadowColor) properties.shadowColor = input.shadowColor;
    if (input.scale !== undefined) properties.scale = input.scale;
    if (input.roughness !== undefined) properties.roughness = input.roughness;
    if (input.crackDensity !== undefined) properties.crackDensity = input.crackDensity;
    if (input.depthLane) {
      if (!parseDepthLaneSub(input.depthLane as string)) {
        return errorResult(`Invalid depth lane "${input.depthLane}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`);
      }
      properties.depthLane = input.depthLane;
    }
    if (input.atmosphericMode) properties.atmosphericMode = input.atmosphericMode;

    const layerName = (input.name as string) ?? `Rock (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:rock", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added rock layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_treeline
// ---------------------------------------------------------------------------

const TREELINE_PRESETS_LIST = [
  "deciduous-canopy", "conifer-ridge", "autumn-treeline", "misty-forest",
  "palm-fringe", "winter-bare",
] as const;

const addTreelineTool: McpToolDefinition = {
  name: "add_treeline",
  description:
    "Add a treeline silhouette band layer. Renders a dense canopy mass (not individual trees) with an " +
    "irregular top edge profile. Treelines are visual impressions of forest edges, distinct from plugin-plants " +
    "which renders individual specimens. Supports deciduous, conifer, palm, and bare winter styles. " +
    "Presets: deciduous-canopy, conifer-ridge, autumn-treeline, misty-forest, palm-fringe, winter-bare.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: [...TREELINE_PRESETS_LIST],
        description: "Treeline preset. Defaults to 'deciduous-canopy'.",
      },
      seed: { type: "number", description: "Random seed for treeline variation." },
      canopyStyle: {
        type: "string",
        enum: ["rounded", "pointed", "fan", "bare"],
        description: "Canopy silhouette style.",
      },
      color: { type: "string", description: "Foliage color as hex." },
      highlightColor: { type: "string", description: "Highlight color as hex." },
      shadowColor: { type: "string", description: "Shadow color as hex." },
      density: { type: "number", description: "Canopy density 0.2-1.0." },
      height: { type: "number", description: "Treeline height as fraction of canvas (0.05-0.4)." },
      irregularity: { type: "number", description: "Top edge irregularity 0-1." },
      depthLane: {
        type: "string",
        description: "Depth lane placement. Defaults to 'background'.",
      },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "deciduous-canopy";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown treeline preset "${presetId}". Use list_terrain_presets category=treeline to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.canopyStyle) properties.canopyStyle = input.canopyStyle;
    if (input.color) properties.color = input.color;
    if (input.highlightColor) properties.highlightColor = input.highlightColor;
    if (input.shadowColor) properties.shadowColor = input.shadowColor;
    if (input.density !== undefined) properties.density = input.density;
    if (input.height !== undefined) properties.height = input.height;
    if (input.irregularity !== undefined) properties.irregularity = input.irregularity;
    if (input.depthLane) {
      if (!parseDepthLaneSub(input.depthLane as string)) {
        return errorResult(`Invalid depth lane "${input.depthLane}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`);
      }
      properties.depthLane = input.depthLane;
    }
    if (input.atmosphericMode) properties.atmosphericMode = input.atmosphericMode;

    const layerName = (input.name as string) ?? `Treeline (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:treeline", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added treeline layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_celestial
// ---------------------------------------------------------------------------

const CELESTIAL_PRESETS_LIST = [
  "noon-sun", "golden-hour-sun", "harvest-moon", "crescent-moon",
  "blood-moon", "polar-star",
] as const;

const addCelestialTool: McpToolDefinition = {
  name: "add_celestial",
  description:
    "Add a celestial body layer (sun, moon, or star) with glow and optional light path on water. " +
    "Renders a radial gradient glow, a body disk, and an optional vertical shimmer band below. " +
    "Presets: noon-sun, golden-hour-sun, harvest-moon, crescent-moon, blood-moon, polar-star.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: [...CELESTIAL_PRESETS_LIST],
        description: "Celestial preset. Defaults to 'noon-sun'.",
      },
      seed: { type: "number", description: "Random seed for variation." },
      bodyType: {
        type: "string",
        enum: ["sun", "moon", "star"],
        description: "Body type.",
      },
      elevation: { type: "number", description: "Vertical position 0 (bottom) to 1 (top)." },
      azimuth: { type: "number", description: "Horizontal position 0 (left) to 1 (right)." },
      size: { type: "number", description: "Body size as fraction of canvas (0.005-0.15)." },
      glowRadius: { type: "number", description: "Glow radius as fraction of canvas (0-0.5)." },
      glowColor: { type: "string", description: "Glow color as hex." },
      bodyColor: { type: "string", description: "Body disk color as hex." },
      lightPathEnabled: { type: "boolean", description: "Enable vertical light path on water below." },
      lightPathColor: { type: "string", description: "Light path color as hex." },
      depthLane: {
        type: "string",
        description: "Depth lane placement. Defaults to 'sky'.",
      },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "noon-sun";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown celestial preset "${presetId}". Use list_terrain_presets category=celestial to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.bodyType) properties.bodyType = input.bodyType;
    if (input.elevation !== undefined) properties.elevation = input.elevation;
    if (input.azimuth !== undefined) properties.azimuth = input.azimuth;
    if (input.size !== undefined) properties.size = input.size;
    if (input.glowRadius !== undefined) properties.glowRadius = input.glowRadius;
    if (input.glowColor) properties.glowColor = input.glowColor;
    if (input.bodyColor) properties.bodyColor = input.bodyColor;
    if (input.lightPathEnabled !== undefined) properties.lightPathEnabled = input.lightPathEnabled;
    if (input.lightPathColor) properties.lightPathColor = input.lightPathColor;
    if (input.depthLane) {
      if (!parseDepthLaneSub(input.depthLane as string)) {
        return errorResult(`Invalid depth lane "${input.depthLane}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`);
      }
      properties.depthLane = input.depthLane;
    }
    if (input.atmosphericMode) properties.atmosphericMode = input.atmosphericMode;

    const layerName = (input.name as string) ?? `Celestial (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:celestial", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added celestial layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_fog_layer
// ---------------------------------------------------------------------------

const FOG_PRESETS_LIST = [
  "morning-mist", "mountain-veil", "valley-fog", "shan-shui-cloud-band",
  "coastal-haar",
] as const;

const addFogLayerTool: McpToolDefinition = {
  name: "add_fog_layer",
  description:
    "Add an occluding fog layer for depth separation (shan-shui 'three distances' effect). " +
    "Fog layers cover elements behind them, unlike mist particles which are additive. " +
    "Renders a noise-modulated horizontal band with soft edges and wisps. " +
    "Presets: morning-mist, mountain-veil, valley-fog, shan-shui-cloud-band, coastal-haar.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: [...FOG_PRESETS_LIST],
        description: "Fog preset. Defaults to 'morning-mist'.",
      },
      seed: { type: "number", description: "Random seed for fog variation." },
      fogType: {
        type: "string",
        enum: ["band", "ground", "mountain", "veil"],
        description: "Fog shape type.",
      },
      opacity: { type: "number", description: "Fog opacity 0.05-1.0." },
      height: { type: "number", description: "Fog band height as fraction of canvas (0.02-0.5)." },
      yPosition: { type: "number", description: "Vertical center position 0 (top) to 1 (bottom)." },
      color: { type: "string", description: "Fog color as hex." },
      edgeSoftness: { type: "number", description: "Edge fade softness 0-1." },
      wispDensity: { type: "number", description: "Wisp tendril density 0-1." },
      depthLane: {
        type: "string",
        description: "Depth lane placement. Defaults to 'midground'.",
      },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "morning-mist";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown fog preset "${presetId}". Use list_terrain_presets category=fog to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.fogType) properties.fogType = input.fogType;
    if (input.opacity !== undefined) properties.opacity = input.opacity;
    if (input.height !== undefined) properties.height = input.height;
    if (input.yPosition !== undefined) properties.yPosition = input.yPosition;
    if (input.color) properties.color = input.color;
    if (input.edgeSoftness !== undefined) properties.edgeSoftness = input.edgeSoftness;
    if (input.wispDensity !== undefined) properties.wispDensity = input.wispDensity;
    if (input.depthLane) {
      if (!parseDepthLaneSub(input.depthLane as string)) {
        return errorResult(`Invalid depth lane "${input.depthLane}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`);
      }
      properties.depthLane = input.depthLane;
    }
    if (input.atmosphericMode) properties.atmosphericMode = input.atmosphericMode;

    const layerName = (input.name as string) ?? `Fog (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:fog-layer", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added fog layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_starfield
// ---------------------------------------------------------------------------

const STARFIELD_PRESETS_LIST = [
  "clear-night", "dense-starfield", "milky-way", "sparse-stars", "twilight-stars",
] as const;

const addStarfieldTool: McpToolDefinition = {
  name: "add_starfield",
  description:
    "Add a star field layer for night sky scenes. Renders magnitude-based stars with optional Milky Way band " +
    "and constellation hint lines. Stars vary in size, brightness, and color temperature. " +
    "Presets: clear-night, dense-starfield, milky-way, sparse-stars, twilight-stars.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: [...STARFIELD_PRESETS_LIST],
        description: "Starfield preset. Defaults to 'clear-night'.",
      },
      seed: { type: "number", description: "Random seed for star placement." },
      starCount: { type: "number", description: "Number of stars (20-1000)." },
      milkyWayEnabled: { type: "boolean", description: "Enable Milky Way band." },
      milkyWayAngle: { type: "number", description: "Milky Way angle in degrees (-90 to 90)." },
      constellationHints: { type: "boolean", description: "Show constellation hint lines." },
      starColor: { type: "string", description: "Base star color as hex." },
      depthLane: { type: "string", description: "Depth lane placement. Defaults to 'sky'." },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "clear-night";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown starfield preset "${presetId}". Use list_terrain_presets category=starfield to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.starCount !== undefined) properties.starCount = input.starCount;
    if (input.milkyWayEnabled !== undefined) properties.milkyWayEnabled = input.milkyWayEnabled;
    if (input.milkyWayAngle !== undefined) properties.milkyWayAngle = input.milkyWayAngle;
    if (input.constellationHints !== undefined) properties.constellationHints = input.constellationHints;
    if (input.starColor) properties.starColor = input.starColor;
    if (input.depthLane) {
      if (!parseDepthLaneSub(input.depthLane as string)) {
        return errorResult(`Invalid depth lane "${input.depthLane}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`);
      }
      properties.depthLane = input.depthLane;
    }
    if (input.atmosphericMode) properties.atmosphericMode = input.atmosphericMode;

    const layerName = (input.name as string) ?? `Stars (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:starfield", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added starfield layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_cliff_face
// ---------------------------------------------------------------------------

const CLIFF_FACE_PRESETS_LIST = [
  "granite-cliff", "sandstone-wall", "basalt-columns", "limestone-face", "shale-cliff",
] as const;

const addCliffFaceTool: McpToolDefinition = {
  name: "add_cliff_face",
  description:
    "Add a vertical cliff face/rock wall layer. Renders a textured cliff silhouette with ledge shadows. " +
    "Supports 4 texture modes (sandstone, granite, basalt, limestone). " +
    "Presets: granite-cliff, sandstone-wall, basalt-columns, limestone-face, shale-cliff.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: [...CLIFF_FACE_PRESETS_LIST],
        description: "Cliff preset. Defaults to 'granite-cliff'.",
      },
      seed: { type: "number", description: "Random seed for cliff variation." },
      textureMode: {
        type: "string",
        enum: ["sandstone", "granite", "basalt", "limestone"],
        description: "Rock texture mode.",
      },
      color: { type: "string", description: "Rock color as hex." },
      shadowColor: { type: "string", description: "Shadow color as hex." },
      height: { type: "number", description: "Cliff height as fraction of canvas (0.2-1.0)." },
      xPosition: { type: "number", description: "Horizontal position (0=left, 0.7=right)." },
      width: { type: "number", description: "Cliff width as fraction of canvas (0.1-0.8)." },
      depthLane: { type: "string", description: "Depth lane placement. Defaults to 'background'." },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "granite-cliff";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown cliff-face preset "${presetId}". Use list_terrain_presets category=cliff-face to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.textureMode) properties.textureMode = input.textureMode;
    if (input.color) properties.color = input.color;
    if (input.shadowColor) properties.shadowColor = input.shadowColor;
    if (input.height !== undefined) properties.height = input.height;
    if (input.xPosition !== undefined) properties.xPosition = input.xPosition;
    if (input.width !== undefined) properties.width = input.width;
    if (input.depthLane) {
      if (!parseDepthLaneSub(input.depthLane as string)) {
        return errorResult(`Invalid depth lane "${input.depthLane}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`);
      }
      properties.depthLane = input.depthLane;
    }
    if (input.atmosphericMode) properties.atmosphericMode = input.atmosphericMode;

    const layerName = (input.name as string) ?? `Cliff (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:cliff-face", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added cliff face layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_snowfield
// ---------------------------------------------------------------------------

const SNOWFIELD_PRESETS_LIST = [
  "fresh-powder", "wind-swept", "sun-crust", "deep-snow",
] as const;

const addSnowfieldTool: McpToolDefinition = {
  name: "add_snowfield",
  description:
    "Add a snow-covered ground layer with drift patterns, shadow tinting, and sparkle highlights. " +
    "Presets: fresh-powder, wind-swept, sun-crust, deep-snow.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: [...SNOWFIELD_PRESETS_LIST],
        description: "Snowfield preset. Defaults to 'fresh-powder'.",
      },
      seed: { type: "number", description: "Random seed for snow variation." },
      snowColor: { type: "string", description: "Snow color as hex." },
      shadowColor: { type: "string", description: "Shadow color as hex." },
      driftIntensity: { type: "number", description: "Drift pattern intensity 0-1." },
      sparkleIntensity: { type: "number", description: "Sparkle highlight intensity 0-1." },
      depthLane: { type: "string", description: "Depth lane placement. Defaults to 'ground-plane'." },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "fresh-powder";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown snowfield preset "${presetId}". Use list_terrain_presets category=snowfield to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.snowColor) properties.snowColor = input.snowColor;
    if (input.shadowColor) properties.shadowColor = input.shadowColor;
    if (input.driftIntensity !== undefined) properties.driftIntensity = input.driftIntensity;
    if (input.sparkleIntensity !== undefined) properties.sparkleIntensity = input.sparkleIntensity;
    if (input.depthLane) {
      if (!parseDepthLaneSub(input.depthLane as string)) {
        return errorResult(`Invalid depth lane "${input.depthLane}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`);
      }
      properties.depthLane = input.depthLane;
    }
    if (input.atmosphericMode) properties.atmosphericMode = input.atmosphericMode;

    const layerName = (input.name as string) ?? `Snow (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:snowfield", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added snowfield layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_building
// ---------------------------------------------------------------------------

const BUILDING_PRESETS_LIST = [
  "farmhouse", "church-steeple", "tower-ruin", "village-cluster", "temple", "lighthouse",
] as const;

const addBuildingTool: McpToolDefinition = {
  name: "add_building",
  description:
    "Add a simple architectural silhouette layer. Renders farmhouses, churches, towers, or village clusters " +
    "as filled shapes. Buildings are intentionally simple — silhouette impressions, not detailed architecture. " +
    "Presets: farmhouse, church-steeple, tower-ruin, village-cluster, temple, lighthouse.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: [...BUILDING_PRESETS_LIST],
        description: "Building preset. Defaults to 'farmhouse'.",
      },
      seed: { type: "number", description: "Random seed for building variation." },
      buildingType: {
        type: "string",
        enum: ["farmhouse", "church", "tower", "village"],
        description: "Building form type.",
      },
      color: { type: "string", description: "Building body color as hex." },
      roofColor: { type: "string", description: "Roof color as hex." },
      scale: { type: "number", description: "Scale factor 0.3-2.0." },
      xPosition: { type: "number", description: "Horizontal position 0-1." },
      yPosition: { type: "number", description: "Vertical base position 0.2-0.95." },
      depthLane: { type: "string", description: "Depth lane placement. Defaults to 'midground'." },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "farmhouse";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown building preset "${presetId}". Use list_terrain_presets category=building to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.buildingType) properties.buildingType = input.buildingType;
    if (input.color) properties.color = input.color;
    if (input.roofColor) properties.roofColor = input.roofColor;
    if (input.scale !== undefined) properties.scale = input.scale;
    if (input.xPosition !== undefined) properties.xPosition = input.xPosition;
    if (input.yPosition !== undefined) properties.yPosition = input.yPosition;
    if (input.depthLane) {
      if (!parseDepthLaneSub(input.depthLane as string)) {
        return errorResult(`Invalid depth lane "${input.depthLane}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`);
      }
      properties.depthLane = input.depthLane;
    }
    if (input.atmosphericMode) properties.atmosphericMode = input.atmosphericMode;

    const layerName = (input.name as string) ?? `Building (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:building", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added building layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_bridge
// ---------------------------------------------------------------------------

const BRIDGE_PRESETS_LIST = [
  "stone-arch", "wooden-footbridge", "suspension-bridge", "flat-crossing",
] as const;

const addBridgeTool: McpToolDefinition = {
  name: "add_bridge",
  description:
    "Add a bridge silhouette layer spanning between terrain elements. Supports arch, suspension, " +
    "footbridge, and flat crossing styles. " +
    "Presets: stone-arch, wooden-footbridge, suspension-bridge, flat-crossing.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: [...BRIDGE_PRESETS_LIST],
        description: "Bridge preset. Defaults to 'stone-arch'.",
      },
      seed: { type: "number", description: "Random seed for bridge variation." },
      bridgeStyle: {
        type: "string",
        enum: ["arch", "suspension", "footbridge", "flat"],
        description: "Bridge style.",
      },
      color: { type: "string", description: "Bridge structure color as hex." },
      deckColor: { type: "string", description: "Bridge deck color as hex." },
      span: { type: "number", description: "Bridge span as fraction of canvas width (0.15-0.8)." },
      xPosition: { type: "number", description: "Horizontal center position 0-1." },
      yPosition: { type: "number", description: "Vertical position 0.2-0.9." },
      depthLane: { type: "string", description: "Depth lane placement. Defaults to 'midground'." },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "stone-arch";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown bridge preset "${presetId}". Use list_terrain_presets category=bridge to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.bridgeStyle) properties.bridgeStyle = input.bridgeStyle;
    if (input.color) properties.color = input.color;
    if (input.deckColor) properties.deckColor = input.deckColor;
    if (input.span !== undefined) properties.span = input.span;
    if (input.xPosition !== undefined) properties.xPosition = input.xPosition;
    if (input.yPosition !== undefined) properties.yPosition = input.yPosition;
    if (input.depthLane) {
      if (!parseDepthLaneSub(input.depthLane as string)) {
        return errorResult(`Invalid depth lane "${input.depthLane}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`);
      }
      properties.depthLane = input.depthLane;
    }
    if (input.atmosphericMode) properties.atmosphericMode = input.atmosphericMode;

    const layerName = (input.name as string) ?? `Bridge (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:bridge", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added bridge layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_reflection
// ---------------------------------------------------------------------------

const REFLECTION_PRESETS_LIST = [
  "calm-lake", "rippled-reflection", "dark-water", "golden-reflection",
] as const;

const addReflectionTool: McpToolDefinition = {
  name: "add_reflection",
  description:
    "Add a water surface reflection layer. Renders a simplified mirror of sky/terrain colors below " +
    "the waterline with darkening and ripple distortion. Not an actual scene mirror — uses solid color " +
    "bands that simulate reflected sky and terrain tones. " +
    "Presets: calm-lake, rippled-reflection, dark-water, golden-reflection.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: [...REFLECTION_PRESETS_LIST],
        description: "Reflection preset. Defaults to 'calm-lake'.",
      },
      seed: { type: "number", description: "Random seed for ripple variation." },
      skyColor: { type: "string", description: "Reflected sky color as hex." },
      terrainColor: { type: "string", description: "Reflected terrain color as hex." },
      darkening: { type: "number", description: "Reflection darkening 0-0.7." },
      rippleFrequency: { type: "number", description: "Ripple frequency 0-1." },
      rippleAmplitude: { type: "number", description: "Ripple distortion amplitude 0-1." },
      waterlinePosition: { type: "number", description: "Waterline position 0.2-0.9." },
      depthLane: { type: "string", description: "Depth lane placement. Defaults to 'ground-plane'." },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "calm-lake";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown reflection preset "${presetId}". Use list_terrain_presets category=reflection to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.skyColor) properties.skyColor = input.skyColor;
    if (input.terrainColor) properties.terrainColor = input.terrainColor;
    if (input.darkening !== undefined) properties.darkening = input.darkening;
    if (input.rippleFrequency !== undefined) properties.rippleFrequency = input.rippleFrequency;
    if (input.rippleAmplitude !== undefined) properties.rippleAmplitude = input.rippleAmplitude;
    if (input.waterlinePosition !== undefined) properties.waterlinePosition = input.waterlinePosition;
    if (input.depthLane) {
      if (!parseDepthLaneSub(input.depthLane as string)) {
        return errorResult(`Invalid depth lane "${input.depthLane}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`);
      }
      properties.depthLane = input.depthLane;
    }
    if (input.atmosphericMode) properties.atmosphericMode = input.atmosphericMode;

    const layerName = (input.name as string) ?? `Reflection (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:reflection", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added reflection layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_haze
// ---------------------------------------------------------------------------

const HAZE_PRESETS_LIST = [
  "light-haze", "golden-haze", "cool-mist", "heat-haze",
] as const;

const addHazeTool: McpToolDefinition = {
  name: "add_haze",
  description:
    "Add a subtle atmospheric haze layer. Lighter and more additive than fog-layer — haze softens " +
    "distant elements without fully obscuring them. Supports directional gradients and noise modulation. " +
    "Presets: light-haze, golden-haze, cool-mist, heat-haze.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: [...HAZE_PRESETS_LIST],
        description: "Haze preset. Defaults to 'light-haze'.",
      },
      seed: { type: "number", description: "Random seed for haze variation." },
      color: { type: "string", description: "Haze color as hex." },
      opacity: { type: "number", description: "Haze opacity 0.02-0.6." },
      yPosition: { type: "number", description: "Vertical center position 0-1." },
      height: { type: "number", description: "Haze height as fraction of canvas (0.05-1.0)." },
      gradientDirection: {
        type: "string",
        enum: ["bottom-up", "top-down", "center-out", "uniform"],
        description: "Haze gradient direction.",
      },
      depthLane: { type: "string", description: "Depth lane placement. Defaults to 'midground'." },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "light-haze";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown haze preset "${presetId}". Use list_terrain_presets category=haze to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.color) properties.color = input.color;
    if (input.opacity !== undefined) properties.opacity = input.opacity;
    if (input.yPosition !== undefined) properties.yPosition = input.yPosition;
    if (input.height !== undefined) properties.height = input.height;
    if (input.gradientDirection) properties.gradientDirection = input.gradientDirection;
    if (input.depthLane) {
      if (!parseDepthLaneSub(input.depthLane as string)) {
        return errorResult(`Invalid depth lane "${input.depthLane}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`);
      }
      properties.depthLane = input.depthLane;
    }
    if (input.atmosphericMode) properties.atmosphericMode = input.atmosphericMode;

    const layerName = (input.name as string) ?? `Haze (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:haze", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added haze layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_fence
// ---------------------------------------------------------------------------

const FENCE_PRESETS_LIST = [
  "white-picket", "stone-wall", "ranch-rail", "wire-fence",
] as const;

const addFenceTool: McpToolDefinition = {
  name: "add_fence",
  description:
    "Add a fence or wall silhouette layer. Renders picket fences, stone walls, ranch rails, or wire fences " +
    "as foreground elements. " +
    "Presets: white-picket, stone-wall, ranch-rail, wire-fence.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: [...FENCE_PRESETS_LIST],
        description: "Fence preset. Defaults to 'white-picket'.",
      },
      seed: { type: "number", description: "Random seed for fence variation." },
      fenceStyle: {
        type: "string",
        enum: ["picket", "stone-wall", "rail", "wire"],
        description: "Fence style.",
      },
      color: { type: "string", description: "Fence color as hex." },
      postColor: { type: "string", description: "Post color as hex." },
      height: { type: "number", description: "Fence height 0.02-0.15." },
      yPosition: { type: "number", description: "Vertical base position 0.2-0.95." },
      spacing: { type: "number", description: "Post spacing 0.01-0.1." },
      sag: { type: "number", description: "Wire/rail sag amount 0-1." },
      depthLane: { type: "string", description: "Depth lane placement. Defaults to 'foreground'." },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "white-picket";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown fence preset "${presetId}". Use list_terrain_presets category=fence to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.fenceStyle) properties.fenceStyle = input.fenceStyle;
    if (input.color) properties.color = input.color;
    if (input.postColor) properties.postColor = input.postColor;
    if (input.height !== undefined) properties.height = input.height;
    if (input.yPosition !== undefined) properties.yPosition = input.yPosition;
    if (input.spacing !== undefined) properties.spacing = input.spacing;
    if (input.sag !== undefined) properties.sag = input.sag;
    if (input.depthLane) {
      if (!parseDepthLaneSub(input.depthLane as string)) {
        return errorResult(`Invalid depth lane "${input.depthLane}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`);
      }
      properties.depthLane = input.depthLane;
    }
    if (input.atmosphericMode) properties.atmosphericMode = input.atmosphericMode;

    const layerName = (input.name as string) ?? `Fence (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:fence", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added fence layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// add_boat
// ---------------------------------------------------------------------------

const BOAT_PRESETS_LIST = [
  "sailboat", "rowboat", "fishing-boat", "cargo-ship",
] as const;

const addBoatTool: McpToolDefinition = {
  name: "add_boat",
  description:
    "Add a boat or ship silhouette layer on water. Renders sailboats, rowboats, fishing boats, or cargo ships. " +
    "Presets: sailboat, rowboat, fishing-boat, cargo-ship.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: [...BOAT_PRESETS_LIST],
        description: "Boat preset. Defaults to 'sailboat'.",
      },
      seed: { type: "number", description: "Random seed for boat variation." },
      boatType: {
        type: "string",
        enum: ["sailboat", "rowboat", "fishing", "ship"],
        description: "Boat form type.",
      },
      color: { type: "string", description: "Hull color as hex." },
      sailColor: { type: "string", description: "Sail/cabin color as hex." },
      scale: { type: "number", description: "Scale factor 0.02-0.15." },
      xPosition: { type: "number", description: "Horizontal position 0-1." },
      yPosition: { type: "number", description: "Vertical position 0.2-0.9." },
      tilt: { type: "number", description: "Wave rocking tilt in degrees -15 to 15." },
      depthLane: { type: "string", description: "Depth lane placement. Defaults to 'midground'." },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = (input.preset as string) ?? "sailboat";
    const preset = getPreset(presetId);
    if (presetId && !preset) {
      return errorResult(`Unknown boat preset "${presetId}". Use list_terrain_presets category=boat to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const properties: Record<string, unknown> = { preset: presetId, seed };

    if (input.boatType) properties.boatType = input.boatType;
    if (input.color) properties.color = input.color;
    if (input.sailColor) properties.sailColor = input.sailColor;
    if (input.scale !== undefined) properties.scale = input.scale;
    if (input.xPosition !== undefined) properties.xPosition = input.xPosition;
    if (input.yPosition !== undefined) properties.yPosition = input.yPosition;
    if (input.tilt !== undefined) properties.tilt = input.tilt;
    if (input.depthLane) {
      if (!parseDepthLaneSub(input.depthLane as string)) {
        return errorResult(`Invalid depth lane "${input.depthLane}". Valid lanes: ${DEPTH_LANE_ORDER.join(", ")} (with optional -1/-2/-3 sub-level).`);
      }
      properties.depthLane = input.depthLane;
    }
    if (input.atmosphericMode) properties.atmosphericMode = input.atmosphericMode;

    const layerName = (input.name as string) ?? `Boat (${preset?.name ?? presetId})`;
    const layer = createLayer("terrain:boat", layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added boat layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// Scene Recipe helpers
// ---------------------------------------------------------------------------

interface RecipeLayer {
  typeId: string;
  name: string;
  preset: string;
  depthLane: string;
  extra?: Record<string, unknown>;
}

function createSceneRecipe(
  recipeName: string,
  description: string,
  defaultLayers: RecipeLayer[],
  presetOverrideKeys: string[],
): McpToolDefinition {
  const inputProperties: Record<string, unknown> = {
    seed: { type: "number", description: "Base seed for all layers." },
    atmosphericMode: {
      type: "string",
      enum: ["none", "western", "ink-wash"],
      description: "Atmospheric depth mode for terrain layers. Defaults to 'western'.",
    },
  };
  for (const key of presetOverrideKeys) {
    inputProperties[key] = {
      type: "string",
      description: `Override preset for ${key.replace("Preset", "")} layer.`,
    };
  }

  return {
    name: recipeName,
    description,
    inputSchema: { type: "object", properties: inputProperties },
    async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
      const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
      const atmoMode = (input.atmosphericMode as string) ?? "western";
      const layerIds: string[] = [];
      const summary: string[] = [];

      for (let i = 0; i < defaultLayers.length; i++) {
        const def = defaultLayers[i]!;
        const overrideKey = `${def.name.toLowerCase().replace(/[^a-z]/g, "")}Preset`;
        const presetId = (input[overrideKey] as string) ?? def.preset;

        const properties: Record<string, unknown> = {
          preset: presetId,
          seed: seed + i,
          depthLane: def.depthLane,
          ...def.extra,
        };
        if (atmoMode !== "none") {
          properties.atmosphericMode = atmoMode;
        }

        const layerName = `${def.name} (${presetId})`;
        const layer = createLayer(def.typeId, layerName, ctx, properties);
        ctx.layers.add(layer);
        layerIds.push(layer.id);
        summary.push(`${def.name}: ${presetId} [${def.depthLane}]`);
      }

      ctx.emitChange("layer-added");

      return textResult(
        `${recipeName} created (${layerIds.length} layers):\n` +
        summary.map((s) => `  ${s}`).join("\n") +
        `\nLayer IDs: ${layerIds.join(", ")}`,
      );
    },
  };
}

// ---------------------------------------------------------------------------
// 12 Scene Recipe Tools
// ---------------------------------------------------------------------------

const createMountainValleyTool = createSceneRecipe(
  "create_mountain_valley",
  "Create a mountain valley scene: sky + alpine ridges + valley fog + treeline + meadow field + haze.",
  [
    { typeId: "terrain:sky", name: "Sky", preset: "noon", depthLane: "sky" },
    { typeId: "terrain:profile", name: "Terrain", preset: "alpine-range", depthLane: "background" },
    { typeId: "terrain:fog-layer", name: "Fog", preset: "valley-fog", depthLane: "midground" },
    { typeId: "terrain:treeline", name: "Treeline", preset: "conifer-ridge", depthLane: "midground" },
    { typeId: "terrain:field", name: "Field", preset: "meadow-grass", depthLane: "foreground" },
    { typeId: "terrain:haze", name: "Haze", preset: "light-haze", depthLane: "overlay" },
  ],
  ["skyPreset", "terrainPreset", "fogPreset", "treelinePreset", "fieldPreset", "hazePreset"],
);

const createRiverSceneTool = createSceneRecipe(
  "create_river_scene",
  "Create a river scene: sky + rolling hills + river + shore + treeline + reflection.",
  [
    { typeId: "terrain:sky", name: "Sky", preset: "dawn", depthLane: "sky" },
    { typeId: "terrain:profile", name: "Terrain", preset: "rolling-hills", depthLane: "background" },
    { typeId: "terrain:river", name: "River", preset: "gentle-stream", depthLane: "midground" },
    { typeId: "terrain:shore", name: "Shore", preset: "sandy-beach", depthLane: "midground" },
    { typeId: "terrain:treeline", name: "Treeline", preset: "deciduous-canopy", depthLane: "midground" },
    { typeId: "terrain:reflection", name: "Reflection", preset: "calm-lake", depthLane: "midground" },
  ],
  ["skyPreset", "terrainPreset", "riverPreset", "shorePreset", "treelinePreset", "reflectionPreset"],
);

const createCoastalMoonlightTool = createSceneRecipe(
  "create_coastal_moonlight",
  "Create a moonlit coastal scene: night sky + starfield + moon + water + rocky shore + dark reflection.",
  [
    { typeId: "terrain:sky", name: "Sky", preset: "night", depthLane: "sky" },
    { typeId: "terrain:starfield", name: "Starfield", preset: "clear-night", depthLane: "sky" },
    { typeId: "terrain:celestial", name: "Celestial", preset: "harvest-moon", depthLane: "sky" },
    { typeId: "terrain:water", name: "Water", preset: "still-lake", depthLane: "midground" },
    { typeId: "terrain:shore", name: "Shore", preset: "rocky-shore", depthLane: "foreground" },
    { typeId: "terrain:reflection", name: "Reflection", preset: "dark-water", depthLane: "midground" },
  ],
  ["skyPreset", "starfieldPreset", "celestialPreset", "waterPreset", "shorePreset", "reflectionPreset"],
);

const createParkRiversideTool = createSceneRecipe(
  "create_park_riverside",
  "Create a park riverside scene: overcast sky + gentle hills + river + path + treeline + meadow + building.",
  [
    { typeId: "terrain:sky", name: "Sky", preset: "noon", depthLane: "sky" },
    { typeId: "terrain:profile", name: "Terrain", preset: "foothills", depthLane: "background" },
    { typeId: "terrain:river", name: "River", preset: "gentle-stream", depthLane: "midground" },
    { typeId: "terrain:path", name: "Path", preset: "dirt-trail", depthLane: "foreground" },
    { typeId: "terrain:treeline", name: "Treeline", preset: "deciduous-canopy", depthLane: "midground" },
    { typeId: "terrain:field", name: "Field", preset: "meadow-grass", depthLane: "foreground" },
    { typeId: "terrain:building", name: "Building", preset: "farmhouse", depthLane: "midground" },
  ],
  ["skyPreset", "terrainPreset", "riverPreset", "pathPreset", "treelinePreset", "fieldPreset", "buildingPreset"],
);

const createShanShuiTool = createSceneRecipe(
  "create_shan_shui",
  "Create a Chinese shan-shui (mountain-water) landscape: misty sky + sharp peaks + mountain mist + rock + calm water + haze.",
  [
    { typeId: "terrain:sky", name: "Sky", preset: "dawn", depthLane: "sky" },
    { typeId: "terrain:profile", name: "Terrain", preset: "alpine-range", depthLane: "background" },
    { typeId: "terrain:fog-layer", name: "Fog", preset: "mountain-veil", depthLane: "midground" },
    { typeId: "terrain:rock", name: "Rock", preset: "shan-shui-rock", depthLane: "foreground" },
    { typeId: "terrain:water", name: "Water", preset: "still-lake", depthLane: "midground" },
    { typeId: "terrain:haze", name: "Haze", preset: "cool-mist", depthLane: "overlay" },
  ],
  ["skyPreset", "terrainPreset", "fogPreset", "rockPreset", "waterPreset", "hazePreset"],
);

const createPastoralTool = createSceneRecipe(
  "create_pastoral",
  "Create a pastoral countryside scene: golden-hour sky + rolling hills + wheat field + country lane + picket fence + farmhouse + golden haze.",
  [
    { typeId: "terrain:sky", name: "Sky", preset: "golden-hour", depthLane: "sky" },
    { typeId: "terrain:profile", name: "Terrain", preset: "rolling-hills", depthLane: "background" },
    { typeId: "terrain:field", name: "Field", preset: "wheat-field", depthLane: "midground" },
    { typeId: "terrain:path", name: "Path", preset: "country-lane", depthLane: "foreground" },
    { typeId: "terrain:fence", name: "Fence", preset: "white-picket", depthLane: "foreground" },
    { typeId: "terrain:building", name: "Building", preset: "farmhouse", depthLane: "midground" },
    { typeId: "terrain:haze", name: "Haze", preset: "golden-haze", depthLane: "overlay" },
  ],
  ["skyPreset", "terrainPreset", "fieldPreset", "pathPreset", "fencePreset", "buildingPreset", "hazePreset"],
);

const createForestClearingTool = createSceneRecipe(
  "create_forest_clearing",
  "Create a forest clearing scene: overcast sky + treeline + overhanging branches + fern carpet + ground fog + woodland trail.",
  [
    { typeId: "terrain:sky", name: "Sky", preset: "noon", depthLane: "sky" },
    { typeId: "terrain:treeline", name: "Treeline", preset: "deciduous-canopy", depthLane: "midground" },
    { typeId: "terrain:vignette-foliage", name: "Vignette", preset: "overhanging-branches", depthLane: "overlay" },
    { typeId: "terrain:forest-floor", name: "ForestFloor", preset: "fern-carpet", depthLane: "foreground" },
    { typeId: "terrain:fog-layer", name: "Fog", preset: "morning-mist", depthLane: "midground" },
    { typeId: "terrain:path", name: "Path", preset: "forest-path", depthLane: "foreground" },
  ],
  ["skyPreset", "treelinePreset", "vignettePreset", "forestfloorPreset", "fogPreset", "pathPreset"],
);

const createAlpineLakeTool = createSceneRecipe(
  "create_alpine_lake",
  "Create an alpine lake scene: noon sky + alpine range + snow field + calm water + lake reflection + granite cliff + cool mist.",
  [
    { typeId: "terrain:sky", name: "Sky", preset: "noon", depthLane: "sky" },
    { typeId: "terrain:profile", name: "Terrain", preset: "alpine-range", depthLane: "background" },
    { typeId: "terrain:snowfield", name: "Snowfield", preset: "fresh-powder", depthLane: "background" },
    { typeId: "terrain:water", name: "Water", preset: "still-lake", depthLane: "midground" },
    { typeId: "terrain:reflection", name: "Reflection", preset: "calm-lake", depthLane: "midground" },
    { typeId: "terrain:cliff-face", name: "CliffFace", preset: "granite-cliff", depthLane: "midground" },
    { typeId: "terrain:haze", name: "Haze", preset: "cool-mist", depthLane: "overlay" },
  ],
  ["skyPreset", "terrainPreset", "snowfieldPreset", "waterPreset", "reflectionPreset", "cliffPreset", "hazePreset"],
);

const createJapaneseGardenTool = createSceneRecipe(
  "create_japanese_garden",
  "Create a Japanese garden scene: misty sky + calm water + stone bridge + decorative rock + treeline + lake reflection + light haze.",
  [
    { typeId: "terrain:sky", name: "Sky", preset: "dawn", depthLane: "sky" },
    { typeId: "terrain:water", name: "Water", preset: "still-lake", depthLane: "midground" },
    { typeId: "terrain:bridge", name: "Bridge", preset: "stone-arch", depthLane: "midground" },
    { typeId: "terrain:rock", name: "Rock", preset: "shan-shui-rock", depthLane: "foreground" },
    { typeId: "terrain:treeline", name: "Treeline", preset: "autumn-treeline", depthLane: "midground" },
    { typeId: "terrain:reflection", name: "Reflection", preset: "calm-lake", depthLane: "midground" },
    { typeId: "terrain:haze", name: "Haze", preset: "light-haze", depthLane: "overlay" },
  ],
  ["skyPreset", "waterPreset", "bridgePreset", "rockPreset", "treelinePreset", "reflectionPreset", "hazePreset"],
);

const createDesertExpanseTool = createSceneRecipe(
  "create_desert_expanse",
  "Create a desert expanse scene: noon sky + mesa plateau + sandstone cliff + dry scrub field + heat haze + wind erosion.",
  [
    { typeId: "terrain:sky", name: "Sky", preset: "noon", depthLane: "sky" },
    { typeId: "terrain:profile", name: "Terrain", preset: "mesa-plateau", depthLane: "background" },
    { typeId: "terrain:cliff-face", name: "CliffFace", preset: "sandstone-wall", depthLane: "midground" },
    { typeId: "terrain:field", name: "Field", preset: "dry-savanna", depthLane: "foreground" },
    { typeId: "terrain:haze", name: "Haze", preset: "heat-haze", depthLane: "overlay" },
    { typeId: "terrain:erosion", name: "Erosion", preset: "wind-erosion", depthLane: "foreground" },
  ],
  ["skyPreset", "terrainPreset", "cliffPreset", "fieldPreset", "hazePreset", "erosionPreset"],
);

const createWinterWoodlandTool = createSceneRecipe(
  "create_winter_woodland",
  "Create a winter woodland scene: overcast sky + gentle hills + deep snow + conifer treeline + pine canopy vignette + morning mist.",
  [
    { typeId: "terrain:sky", name: "Sky", preset: "noon", depthLane: "sky" },
    { typeId: "terrain:profile", name: "Terrain", preset: "foothills", depthLane: "background" },
    { typeId: "terrain:snowfield", name: "Snowfield", preset: "deep-snow", depthLane: "midground" },
    { typeId: "terrain:treeline", name: "Treeline", preset: "conifer-ridge", depthLane: "midground" },
    { typeId: "terrain:vignette-foliage", name: "Vignette", preset: "pine-canopy", depthLane: "overlay" },
    { typeId: "terrain:fog-layer", name: "Fog", preset: "morning-mist", depthLane: "midground" },
  ],
  ["skyPreset", "terrainPreset", "snowfieldPreset", "treelinePreset", "vignettePreset", "fogPreset"],
);

const createTropicalCoastTool = createSceneRecipe(
  "create_tropical_coast",
  "Create a tropical coast scene: golden-hour sky + calm sea + sandy beach + sailboat + golden reflection + leaf frame vignette + golden haze.",
  [
    { typeId: "terrain:sky", name: "Sky", preset: "golden-hour", depthLane: "sky" },
    { typeId: "terrain:water", name: "Water", preset: "still-lake", depthLane: "midground" },
    { typeId: "terrain:shore", name: "Shore", preset: "sandy-beach", depthLane: "foreground" },
    { typeId: "terrain:boat", name: "Boat", preset: "sailboat", depthLane: "midground" },
    { typeId: "terrain:reflection", name: "Reflection", preset: "golden-reflection", depthLane: "midground" },
    { typeId: "terrain:vignette-foliage", name: "Vignette", preset: "leaf-frame", depthLane: "overlay" },
    { typeId: "terrain:haze", name: "Haze", preset: "golden-haze", depthLane: "overlay" },
  ],
  ["skyPreset", "waterPreset", "shorePreset", "boatPreset", "reflectionPreset", "vignettePreset", "hazePreset"],
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const terrainMcpTools: McpToolDefinition[] = [
  addSkyTool,
  addTerrainProfileTool,
  addCloudsTool,
  addWaterSurfaceTool,
  addRiverTool,
  addPathTool,
  addShoreTool,
  addFieldTool,
  addRockTool,
  addTreelineTool,
  addCelestialTool,
  addFogLayerTool,
  addStarfieldTool,
  addCliffFaceTool,
  addSnowfieldTool,
  addBuildingTool,
  addBridgeTool,
  addReflectionTool,
  addHazeTool,
  addFenceTool,
  addBoatTool,
  createLandscapeTool,
  createMountainValleyTool,
  createRiverSceneTool,
  createCoastalMoonlightTool,
  createParkRiversideTool,
  createShanShuiTool,
  createPastoralTool,
  createForestClearingTool,
  createAlpineLakeTool,
  createJapaneseGardenTool,
  createDesertExpanseTool,
  createWinterWoodlandTool,
  createTropicalCoastTool,
  setTimeOfDayTool,
  listTerrainPresetsTool,
  setTerrainDepthTool,
  setDepthLaneTool,
];
