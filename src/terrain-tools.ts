/**
 * MCP tool definitions for plugin-terrain.
 *
 * 15 tools: add_sky, add_terrain_profile, add_clouds, add_water_surface,
 * add_river, add_path, add_shore, add_field, add_rock, add_treeline,
 * create_landscape, set_time_of_day, list_terrain_presets, set_terrain_depth, set_depth_lane.
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
    `List all ${ALL_PRESETS.length} terrain presets, optionally filtered by category (sky, profile, clouds, water, river, path, shore, field, rock, treeline).`,
  inputSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["sky", "profile", "clouds", "water", "river", "path", "shore", "field", "rock", "treeline"],
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

const TERRAIN_TYPE_IDS = ["terrain:sky", "terrain:profile", "terrain:clouds", "terrain:water", "terrain:river", "terrain:path", "terrain:shore", "terrain:field", "terrain:rock", "terrain:treeline"];

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
  createLandscapeTool,
  setTimeOfDayTool,
  listTerrainPresetsTool,
  setTerrainDepthTool,
  setDepthLaneTool,
];
