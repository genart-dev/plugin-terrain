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
  it("exports 8 tools", () => {
    expect(terrainMcpTools).toHaveLength(8);
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
      expect(result.content[0]!.text).toContain("21 presets");
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
});
