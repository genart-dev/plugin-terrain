import { describe, it, expect, vi, beforeEach } from "vitest";
import { terrainMcpTools } from "../src/terrain-tools.js";
import type { McpToolContext, DesignLayer, LayerProperties } from "@genart-dev/core";

function createMockContext(): McpToolContext {
  const layers = new Map<string, DesignLayer>();
  return {
    canvasWidth: 800,
    canvasHeight: 600,
    layers: {
      add: vi.fn((layer: DesignLayer) => layers.set(layer.id, layer)),
      get: vi.fn((id: string) => layers.get(id)),
      updateProperties: vi.fn((id: string, props: Partial<LayerProperties>) => {
        const layer = layers.get(id);
        if (layer) {
          layer.properties = { ...layer.properties, ...props } as Record<string, string | number | boolean | null>;
        }
      }),
      list: vi.fn(() => [...layers.values()]),
    },
    emitChange: vi.fn(),
  } as unknown as McpToolContext;
}

function getTool(name: string) {
  const tool = terrainMcpTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool "${name}" not found`);
  return tool;
}

describe("terrain MCP tools", () => {
  it("exports 15 tools", () => {
    expect(terrainMcpTools).toHaveLength(15);
  });

  it("all tools have name, description, and handler", () => {
    for (const tool of terrainMcpTools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.handler).toBeInstanceOf(Function);
    }
  });

  describe("add_sky", () => {
    it("adds a sky layer with default preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_sky").handler({}, ctx);
      expect(result.isError).toBeUndefined();
      expect(ctx.layers.add).toHaveBeenCalled();
      expect(ctx.emitChange).toHaveBeenCalledWith("layer-added");
    });

    it("adds sky with custom preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_sky").handler({ preset: "dusk" }, ctx);
      expect(result.content[0]!.text).toContain("dusk");
    });

    it("returns error for unknown preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_sky").handler({ preset: "midnight" }, ctx);
      expect(result.isError).toBe(true);
    });
  });

  describe("add_terrain_profile", () => {
    it("adds a terrain profile layer", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_terrain_profile").handler({ preset: "alpine-range", seed: 123 }, ctx);
      expect(result.isError).toBeUndefined();
      expect(result.content[0]!.text).toContain("alpine-range");
    });
  });

  describe("add_clouds", () => {
    it("adds a cloud layer", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_clouds").handler({ preset: "overcast" }, ctx);
      expect(result.isError).toBeUndefined();
      expect(result.content[0]!.text).toContain("overcast");
    });
  });

  describe("add_water_surface", () => {
    it("adds a water layer", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_water_surface").handler({ preset: "choppy-sea" }, ctx);
      expect(result.isError).toBeUndefined();
      expect(result.content[0]!.text).toContain("choppy-sea");
    });
  });

  describe("add_river", () => {
    it("adds a river layer with default preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_river").handler({}, ctx);
      expect(result.isError).toBeUndefined();
      expect(ctx.layers.add).toHaveBeenCalled();
      expect(ctx.emitChange).toHaveBeenCalledWith("layer-added");
      expect(result.content[0]!.text).toContain("gentle-stream");
    });

    it("adds river with custom preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_river").handler({ preset: "wide-river" }, ctx);
      expect(result.content[0]!.text).toContain("wide-river");
    });

    it("returns error for unknown preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_river").handler({ preset: "lava-flow" }, ctx);
      expect(result.isError).toBe(true);
    });

    it("accepts depthLane parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_river").handler({
        preset: "gentle-stream",
        depthLane: "foreground",
      }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.depthLane).toBe("foreground");
    });

    it("rejects invalid depth lane", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_river").handler({
        depthLane: "invalid",
      }, ctx);
      expect(result.isError).toBe(true);
    });

    it("accepts atmosphericMode parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_river").handler({
        atmosphericMode: "western",
      }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.atmosphericMode).toBe("western");
    });

    it("accepts pathPreset override", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_river").handler({
        pathPreset: "s-curve",
      }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.pathPreset).toBe("s-curve");
    });

    it("accepts bankStyle parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_river").handler({
        bankStyle: "rocky",
      }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.bankStyle).toBe("rocky");
    });

    it("sets correct layer type", async () => {
      const ctx = createMockContext();
      await getTool("add_river").handler({}, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.type).toBe("terrain:river");
    });
  });

  describe("add_path", () => {
    it("adds a path layer with default preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_path").handler({}, ctx);
      expect(result.isError).toBeUndefined();
      expect(ctx.layers.add).toHaveBeenCalled();
      expect(ctx.emitChange).toHaveBeenCalledWith("layer-added");
      expect(result.content[0]!.text).toContain("dirt-trail");
    });

    it("adds path with custom preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_path").handler({ preset: "cobblestone-road" }, ctx);
      expect(result.content[0]!.text).toContain("cobblestone-road");
    });

    it("returns error for unknown preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_path").handler({ preset: "highway" }, ctx);
      expect(result.isError).toBe(true);
    });

    it("accepts surfaceStyle parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_path").handler({
        surfaceStyle: "gravel",
      }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.surfaceStyle).toBe("gravel");
    });

    it("accepts edgeTreatment parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_path").handler({
        edgeTreatment: "overgrown",
      }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.edgeTreatment).toBe("overgrown");
    });

    it("accepts wear parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_path").handler({
        wear: 0.8,
      }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.wear).toBe(0.8);
    });

    it("accepts depthLane parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_path").handler({
        depthLane: "foreground-2",
      }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.depthLane).toBe("foreground-2");
    });

    it("rejects invalid depth lane", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_path").handler({
        depthLane: "invalid",
      }, ctx);
      expect(result.isError).toBe(true);
    });

    it("sets correct layer type", async () => {
      const ctx = createMockContext();
      await getTool("add_path").handler({}, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.type).toBe("terrain:path");
    });
  });

  describe("add_shore", () => {
    it("adds a shore layer with default preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_shore").handler({}, ctx);
      expect(result.isError).toBeUndefined();
      expect(ctx.layers.add).toHaveBeenCalled();
      expect(ctx.emitChange).toHaveBeenCalledWith("layer-added");
      expect(result.content[0]!.text).toContain("sandy-beach");
    });

    it("adds shore with custom preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_shore").handler({ preset: "rocky-shore" }, ctx);
      expect(result.content[0]!.text).toContain("rocky-shore");
    });

    it("returns error for unknown preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_shore").handler({ preset: "lava-coast" }, ctx);
      expect(result.isError).toBe(true);
    });

    it("accepts waterlinePosition parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_shore").handler({
        waterlinePosition: 0.7,
      }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.waterlinePosition).toBe(0.7);
    });

    it("accepts width parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_shore").handler({
        width: 0.15,
      }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.width).toBe(0.15);
    });

    it("accepts debrisType parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_shore").handler({
        debrisType: "pebbles",
      }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.debrisType).toBe("pebbles");
    });

    it("accepts foamIntensity parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_shore").handler({
        foamIntensity: 0.9,
      }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.foamIntensity).toBe(0.9);
    });

    it("accepts depthLane parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_shore").handler({
        depthLane: "foreground",
      }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.depthLane).toBe("foreground");
    });

    it("rejects invalid depth lane", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_shore").handler({
        depthLane: "invalid",
      }, ctx);
      expect(result.isError).toBe(true);
    });

    it("sets correct layer type", async () => {
      const ctx = createMockContext();
      await getTool("add_shore").handler({}, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.type).toBe("terrain:shore");
    });
  });

  describe("add_field", () => {
    it("adds a field layer with default preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_field").handler({}, ctx);
      expect(result.isError).toBeUndefined();
      expect(ctx.layers.add).toHaveBeenCalled();
      expect(ctx.emitChange).toHaveBeenCalledWith("layer-added");
      expect(result.content[0]!.text).toContain("meadow-grass");
    });

    it("adds field with custom preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_field").handler({ preset: "wheat-field" }, ctx);
      expect(result.content[0]!.text).toContain("wheat-field");
    });

    it("returns error for unknown preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_field").handler({ preset: "corn-field" }, ctx);
      expect(result.isError).toBe(true);
    });

    it("accepts vegetationType parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_field").handler({ vegetationType: "wildflowers" }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.vegetationType).toBe("wildflowers");
    });

    it("accepts density parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_field").handler({ density: 0.9 }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.density).toBe(0.9);
    });

    it("accepts windDirection and windStrength", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_field").handler({
        windDirection: 180,
        windStrength: 0.8,
      }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.windDirection).toBe(180);
      expect(addedLayer.properties.windStrength).toBe(0.8);
    });

    it("accepts seasonalTint parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_field").handler({ seasonalTint: "autumn" }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.seasonalTint).toBe("autumn");
    });

    it("accepts depthLane parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_field").handler({ depthLane: "foreground" }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.depthLane).toBe("foreground");
    });

    it("rejects invalid depth lane", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_field").handler({ depthLane: "invalid" }, ctx);
      expect(result.isError).toBe(true);
    });

    it("sets correct layer type", async () => {
      const ctx = createMockContext();
      await getTool("add_field").handler({}, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.type).toBe("terrain:field");
    });
  });

  describe("add_rock", () => {
    it("adds a rock layer with default preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_rock").handler({}, ctx);
      expect(result.isError).toBeUndefined();
      expect(ctx.layers.add).toHaveBeenCalled();
      expect(ctx.emitChange).toHaveBeenCalledWith("layer-added");
      expect(result.content[0]!.text).toContain("granite-boulder");
    });

    it("adds rock with custom preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_rock").handler({ preset: "shan-shui-rock" }, ctx);
      expect(result.content[0]!.text).toContain("shan-shui-rock");
    });

    it("returns error for unknown preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_rock").handler({ preset: "marble-statue" }, ctx);
      expect(result.isError).toBe(true);
    });

    it("accepts rockType parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_rock").handler({ rockType: "pinnacle" }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.rockType).toBe("pinnacle");
    });

    it("accepts textureMode parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_rock").handler({ textureMode: "cun-fa" }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.textureMode).toBe("cun-fa");
    });

    it("accepts scale and roughness", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_rock").handler({
        scale: 1.5,
        roughness: 0.8,
      }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.scale).toBe(1.5);
      expect(addedLayer.properties.roughness).toBe(0.8);
    });

    it("accepts crackDensity parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_rock").handler({ crackDensity: 0.9 }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.crackDensity).toBe(0.9);
    });

    it("accepts depthLane parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_rock").handler({ depthLane: "midground-1" }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.depthLane).toBe("midground-1");
    });

    it("rejects invalid depth lane", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_rock").handler({ depthLane: "invalid" }, ctx);
      expect(result.isError).toBe(true);
    });

    it("sets correct layer type", async () => {
      const ctx = createMockContext();
      await getTool("add_rock").handler({}, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.type).toBe("terrain:rock");
    });
  });

  describe("add_treeline", () => {
    it("adds a treeline layer with default preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_treeline").handler({}, ctx);
      expect(result.isError).toBeUndefined();
      expect(ctx.layers.add).toHaveBeenCalled();
      expect(ctx.emitChange).toHaveBeenCalledWith("layer-added");
      expect(result.content[0]!.text).toContain("deciduous-canopy");
    });

    it("adds treeline with custom preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_treeline").handler({ preset: "conifer-ridge" }, ctx);
      expect(result.content[0]!.text).toContain("conifer-ridge");
    });

    it("returns error for unknown preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_treeline").handler({ preset: "bamboo-grove" }, ctx);
      expect(result.isError).toBe(true);
    });

    it("accepts canopyStyle parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_treeline").handler({ canopyStyle: "pointed" }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.canopyStyle).toBe("pointed");
    });

    it("accepts density and height", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_treeline").handler({
        density: 0.5,
        height: 0.25,
      }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.density).toBe(0.5);
      expect(addedLayer.properties.height).toBe(0.25);
    });

    it("accepts irregularity parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_treeline").handler({ irregularity: 0.9 }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.irregularity).toBe(0.9);
    });

    it("accepts depthLane parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_treeline").handler({ depthLane: "far-background" }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.depthLane).toBe("far-background");
    });

    it("rejects invalid depth lane", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_treeline").handler({ depthLane: "invalid" }, ctx);
      expect(result.isError).toBe(true);
    });

    it("accepts atmosphericMode parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_treeline").handler({ atmosphericMode: "ink-wash" }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.atmosphericMode).toBe("ink-wash");
    });

    it("sets correct layer type", async () => {
      const ctx = createMockContext();
      await getTool("add_treeline").handler({}, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.type).toBe("terrain:treeline");
    });
  });

  describe("set_depth_lane on new layer types", () => {
    it("sets depth lane on river layer", async () => {
      const ctx = createMockContext();
      await getTool("add_river").handler({}, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_depth_lane").handler({
        layerId: addedLayer.id,
        depthLane: "background",
      }, ctx);
      expect(result.isError).toBeUndefined();
    });

    it("sets depth lane on path layer", async () => {
      const ctx = createMockContext();
      await getTool("add_path").handler({}, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_depth_lane").handler({
        layerId: addedLayer.id,
        depthLane: "foreground-3",
      }, ctx);
      expect(result.isError).toBeUndefined();
    });

    it("sets depth lane on shore layer", async () => {
      const ctx = createMockContext();
      await getTool("add_shore").handler({}, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_depth_lane").handler({
        layerId: addedLayer.id,
        depthLane: "ground-plane",
      }, ctx);
      expect(result.isError).toBeUndefined();
    });

    it("sets depth lane on field layer", async () => {
      const ctx = createMockContext();
      await getTool("add_field").handler({}, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_depth_lane").handler({
        layerId: addedLayer.id,
        depthLane: "foreground",
      }, ctx);
      expect(result.isError).toBeUndefined();
    });

    it("sets depth lane on rock layer", async () => {
      const ctx = createMockContext();
      await getTool("add_rock").handler({}, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_depth_lane").handler({
        layerId: addedLayer.id,
        depthLane: "midground-2",
      }, ctx);
      expect(result.isError).toBeUndefined();
    });

    it("sets depth lane on treeline layer", async () => {
      const ctx = createMockContext();
      await getTool("add_treeline").handler({}, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_depth_lane").handler({
        layerId: addedLayer.id,
        depthLane: "far-background",
      }, ctx);
      expect(result.isError).toBeUndefined();
    });
  });

  describe("list_terrain_presets with new categories", () => {
    it("filters river presets", async () => {
      const ctx = createMockContext();
      const result = await getTool("list_terrain_presets").handler({ category: "river" }, ctx);
      expect(result.content[0]!.text).toContain("8 presets");
    });

    it("filters path presets", async () => {
      const ctx = createMockContext();
      const result = await getTool("list_terrain_presets").handler({ category: "path" }, ctx);
      expect(result.content[0]!.text).toContain("8 presets");
    });

    it("filters shore presets", async () => {
      const ctx = createMockContext();
      const result = await getTool("list_terrain_presets").handler({ category: "shore" }, ctx);
      expect(result.content[0]!.text).toContain("6 presets");
    });

    it("filters field presets", async () => {
      const ctx = createMockContext();
      const result = await getTool("list_terrain_presets").handler({ category: "field" }, ctx);
      expect(result.content[0]!.text).toContain("8 presets");
    });

    it("filters rock presets", async () => {
      const ctx = createMockContext();
      const result = await getTool("list_terrain_presets").handler({ category: "rock" }, ctx);
      expect(result.content[0]!.text).toContain("6 presets");
    });

    it("filters treeline presets", async () => {
      const ctx = createMockContext();
      const result = await getTool("list_terrain_presets").handler({ category: "treeline" }, ctx);
      expect(result.content[0]!.text).toContain("6 presets");
    });
  });

  describe("create_landscape", () => {
    it("creates sky + terrain (2 layers minimum)", async () => {
      const ctx = createMockContext();
      const result = await getTool("create_landscape").handler({}, ctx);
      expect(result.isError).toBeUndefined();
      expect(ctx.layers.add).toHaveBeenCalledTimes(2);
    });

    it("creates sky + terrain + water + clouds (4 layers)", async () => {
      const ctx = createMockContext();
      const result = await getTool("create_landscape").handler({
        waterPreset: "still-lake",
        cloudPreset: "fair-weather",
      }, ctx);
      expect(ctx.layers.add).toHaveBeenCalledTimes(4);
      expect(result.content[0]!.text).toContain("4 layers");
    });
  });

  describe("set_time_of_day", () => {
    it("updates sky layer to new time of day", async () => {
      const ctx = createMockContext();
      // First add a sky layer
      await getTool("add_sky").handler({ preset: "noon" }, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_time_of_day").handler({
        layerId: addedLayer.id,
        timeOfDay: "dusk",
      }, ctx);
      expect(result.isError).toBeUndefined();
      expect(ctx.layers.updateProperties).toHaveBeenCalled();
    });

    it("returns error for non-sky layer", async () => {
      const ctx = createMockContext();
      await getTool("add_terrain_profile").handler({ preset: "rolling-hills" }, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_time_of_day").handler({
        layerId: addedLayer.id,
        timeOfDay: "dawn",
      }, ctx);
      expect(result.isError).toBe(true);
    });
  });

  describe("list_terrain_presets", () => {
    it("lists all presets when no filter", async () => {
      const ctx = createMockContext();
      const result = await getTool("list_terrain_presets").handler({}, ctx);
      expect(result.content[0]!.text).toContain("63 presets");
    });

    it("filters by category", async () => {
      const ctx = createMockContext();
      const result = await getTool("list_terrain_presets").handler({ category: "sky" }, ctx);
      expect(result.content[0]!.text).toContain("5 presets");
    });
  });

  describe("set_terrain_depth", () => {
    it("updates depth properties on terrain profile", async () => {
      const ctx = createMockContext();
      await getTool("add_terrain_profile").handler({ preset: "rolling-hills" }, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_terrain_depth").handler({
        layerId: addedLayer.id,
        ridgeCount: 6,
        depthEasing: "cubic",
      }, ctx);
      expect(result.isError).toBeUndefined();
      expect(result.content[0]!.text).toContain("ridgeCount");
      expect(result.content[0]!.text).toContain("cubic");
    });

    it("returns error for non-profile layer", async () => {
      const ctx = createMockContext();
      await getTool("add_sky").handler({}, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_terrain_depth").handler({
        layerId: addedLayer.id,
        ridgeCount: 5,
      }, ctx);
      expect(result.isError).toBe(true);
    });

    it("returns error when no changes specified", async () => {
      const ctx = createMockContext();
      await getTool("add_terrain_profile").handler({ preset: "rolling-hills" }, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_terrain_depth").handler({
        layerId: addedLayer.id,
      }, ctx);
      expect(result.isError).toBe(true);
    });
  });

  describe("set_depth_lane", () => {
    it("sets depth lane on a terrain profile layer", async () => {
      const ctx = createMockContext();
      await getTool("add_terrain_profile").handler({ preset: "rolling-hills" }, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_depth_lane").handler({
        layerId: addedLayer.id,
        depthLane: "foreground",
      }, ctx);
      expect(result.isError).toBeUndefined();
      expect(result.content[0]!.text).toContain("foreground");
      expect(ctx.layers.updateProperties).toHaveBeenCalledWith(
        addedLayer.id,
        expect.objectContaining({ depthLane: "foreground" }),
      );
    });

    it("sets depth lane with sub-level", async () => {
      const ctx = createMockContext();
      await getTool("add_sky").handler({}, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_depth_lane").handler({
        layerId: addedLayer.id,
        depthLane: "far-background-1",
      }, ctx);
      expect(result.isError).toBeUndefined();
      expect(result.content[0]!.text).toContain("far-background-1");
      expect(result.content[0]!.text).toContain("sub-level 1");
    });

    it("sets depth lane on water layer", async () => {
      const ctx = createMockContext();
      await getTool("add_water_surface").handler({}, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_depth_lane").handler({
        layerId: addedLayer.id,
        depthLane: "midground",
      }, ctx);
      expect(result.isError).toBeUndefined();
    });

    it("sets depth lane on cloud layer", async () => {
      const ctx = createMockContext();
      await getTool("add_clouds").handler({}, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_depth_lane").handler({
        layerId: addedLayer.id,
        depthLane: "overlay",
      }, ctx);
      expect(result.isError).toBeUndefined();
    });

    it("sets atmospheric mode on profile layer", async () => {
      const ctx = createMockContext();
      await getTool("add_terrain_profile").handler({ preset: "alpine-range" }, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_depth_lane").handler({
        layerId: addedLayer.id,
        depthLane: "background",
        atmosphericMode: "western",
      }, ctx);
      expect(result.isError).toBeUndefined();
      expect(result.content[0]!.text).toContain("western");
      expect(ctx.layers.updateProperties).toHaveBeenCalledWith(
        addedLayer.id,
        expect.objectContaining({ depthLane: "background", atmosphericMode: "western" }),
      );
    });

    it("rejects atmospheric mode on non-profile layer", async () => {
      const ctx = createMockContext();
      await getTool("add_sky").handler({}, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_depth_lane").handler({
        layerId: addedLayer.id,
        depthLane: "sky",
        atmosphericMode: "western",
      }, ctx);
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain("terrain:profile");
    });

    it("returns error for invalid depth lane", async () => {
      const ctx = createMockContext();
      await getTool("add_terrain_profile").handler({ preset: "rolling-hills" }, ctx);
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_depth_lane").handler({
        layerId: addedLayer.id,
        depthLane: "not-a-lane",
      }, ctx);
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain("Invalid depth lane");
    });

    it("returns error for non-existent layer", async () => {
      const ctx = createMockContext();
      const result = await getTool("set_depth_lane").handler({
        layerId: "nope",
        depthLane: "background",
      }, ctx);
      expect(result.isError).toBe(true);
    });

    it("returns error for non-terrain layer type", async () => {
      const ctx = createMockContext();
      // Manually add a non-terrain layer
      const fakeLayer: DesignLayer = {
        id: "fake-1",
        type: "painting:brush",
        name: "Brush",
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: "normal",
        transform: { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0, anchorY: 0 },
        properties: {},
      };
      (ctx.layers.add as any)(fakeLayer);

      const result = await getTool("set_depth_lane").handler({
        layerId: "fake-1",
        depthLane: "background",
      }, ctx);
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain("not a terrain layer");
    });
  });

  describe("add_terrain_profile with depth lane", () => {
    it("accepts depthLane parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_terrain_profile").handler({
        preset: "alpine-range",
        depthLane: "far-background",
      }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.depthLane).toBe("far-background");
    });

    it("accepts atmosphericMode parameter", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_terrain_profile").handler({
        preset: "rolling-hills",
        atmosphericMode: "ink-wash",
      }, ctx);
      expect(result.isError).toBeUndefined();
      const addedLayer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(addedLayer.properties.atmosphericMode).toBe("ink-wash");
    });

    it("rejects invalid depth lane", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_terrain_profile").handler({
        preset: "rolling-hills",
        depthLane: "invalid-lane",
      }, ctx);
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain("Invalid depth lane");
    });
  });

  describe("create_landscape depth lane auto-assignment", () => {
    it("auto-assigns depth lanes to all layers", async () => {
      const ctx = createMockContext();
      const result = await getTool("create_landscape").handler({
        waterPreset: "still-lake",
        cloudPreset: "fair-weather",
      }, ctx);
      expect(result.isError).toBeUndefined();
      expect(ctx.layers.add).toHaveBeenCalledTimes(4);

      const layers = (ctx.layers.add as any).mock.calls.map((c: any) => c[0] as DesignLayer);
      expect(layers[0]!.properties.depthLane).toBe("sky");
      expect(layers[1]!.properties.depthLane).toBe("background");
      expect(layers[2]!.properties.depthLane).toBe("midground"); // water
      expect(layers[3]!.properties.depthLane).toBe("overlay"); // clouds
    });

    it("passes atmosphericMode to terrain profile layer", async () => {
      const ctx = createMockContext();
      await getTool("create_landscape").handler({
        atmosphericMode: "western",
      }, ctx);
      const layers = (ctx.layers.add as any).mock.calls.map((c: any) => c[0] as DesignLayer);
      // Second layer is terrain profile
      expect(layers[1]!.properties.atmosphericMode).toBe("western");
    });

    it("summary includes lane assignments", async () => {
      const ctx = createMockContext();
      const result = await getTool("create_landscape").handler({
        waterPreset: "still-lake",
      }, ctx);
      const text = result.content[0]!.text as string;
      expect(text).toContain("[sky]");
      expect(text).toContain("[background]");
      expect(text).toContain("[midground]");
    });
  });
});
