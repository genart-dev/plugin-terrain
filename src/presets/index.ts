import type { TerrainPreset, PresetCategory } from "./types.js";
import { SKY_PRESETS } from "./sky.js";
import { PROFILE_PRESETS } from "./profiles.js";
import { CLOUD_PRESETS } from "./clouds.js";
import { WATER_PRESETS } from "./water.js";
import { RIVER_PRESETS } from "./river.js";
import { PATH_PRESETS } from "./path.js";
import { SHORE_PRESETS } from "./shore.js";

export const ALL_PRESETS: TerrainPreset[] = [
  ...SKY_PRESETS,
  ...PROFILE_PRESETS,
  ...CLOUD_PRESETS,
  ...WATER_PRESETS,
  ...RIVER_PRESETS,
  ...PATH_PRESETS,
  ...SHORE_PRESETS,
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
