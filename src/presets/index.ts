import type { TerrainPreset, PresetCategory } from "./types.js";
import { SKY_PRESETS } from "./sky.js";
import { PROFILE_PRESETS } from "./profiles.js";
import { CLOUD_PRESETS } from "./clouds.js";
import { WATER_PRESETS } from "./water.js";
import { RIVER_PRESETS } from "./river.js";
import { PATH_PRESETS } from "./path.js";
import { SHORE_PRESETS } from "./shore.js";
import { FIELD_PRESETS } from "./field.js";
import { ROCK_PRESETS } from "./rock.js";
import { TREELINE_PRESETS } from "./treeline.js";
import { CELESTIAL_PRESETS } from "./celestial.js";
import { FOG_PRESETS } from "./fog.js";
import { STARFIELD_PRESETS } from "./starfield.js";
import { CLIFF_FACE_PRESETS } from "./cliff-face.js";
import { SNOWFIELD_PRESETS } from "./snowfield.js";
import { BUILDING_PRESETS } from "./building.js";
import { BRIDGE_PRESETS } from "./bridge.js";
import { REFLECTION_PRESETS } from "./reflection.js";
import { VIGNETTE_FOLIAGE_PRESETS } from "./vignette-foliage.js";
import { FOREST_FLOOR_PRESETS } from "./forest-floor.js";
import { HAZE_PRESETS } from "./haze.js";
import { FENCE_PRESETS } from "./fence.js";
import { BOAT_PRESETS } from "./boat.js";
import { EROSION_PRESETS } from "./erosion.js";

export const ALL_PRESETS: TerrainPreset[] = [
  ...SKY_PRESETS,
  ...PROFILE_PRESETS,
  ...CLOUD_PRESETS,
  ...WATER_PRESETS,
  ...RIVER_PRESETS,
  ...PATH_PRESETS,
  ...SHORE_PRESETS,
  ...FIELD_PRESETS,
  ...ROCK_PRESETS,
  ...TREELINE_PRESETS,
  ...CELESTIAL_PRESETS,
  ...FOG_PRESETS,
  ...STARFIELD_PRESETS,
  ...CLIFF_FACE_PRESETS,
  ...SNOWFIELD_PRESETS,
  ...BUILDING_PRESETS,
  ...BRIDGE_PRESETS,
  ...REFLECTION_PRESETS,
  ...VIGNETTE_FOLIAGE_PRESETS,
  ...FOREST_FLOOR_PRESETS,
  ...HAZE_PRESETS,
  ...FENCE_PRESETS,
  ...BOAT_PRESETS,
  ...EROSION_PRESETS,
];

/** Look up a preset by ID. */
export function getPreset(id: string): TerrainPreset | undefined {
  return ALL_PRESETS.find((p) => p.id === id);
}

/** Filter presets by category and/or tags. */
export function filterPresets(opts: {
  category?: PresetCategory;
  tags?: string[];
}): TerrainPreset[] {
  let results = ALL_PRESETS;

  if (opts.category) {
    results = results.filter((p) => p.category === opts.category);
  }

  if (opts.tags && opts.tags.length > 0) {
    const searchTags = opts.tags.map((t) => t.toLowerCase());
    results = results.filter((p) =>
      searchTags.some((t) => p.tags.includes(t)),
    );
  }

  return results;
}

/** Full-text search across preset names, descriptions, and tags. */
export function searchPresets(query: string): TerrainPreset[] {
  const q = query.toLowerCase();
  return ALL_PRESETS.filter(
    (p) =>
      p.id.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q)),
  );
}
