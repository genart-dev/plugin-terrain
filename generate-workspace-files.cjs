#!/usr/bin/env node
/**
 * Generates .genart-workspace files for terrain presets.
 * Usage: node generate-workspace-files.cjs
 *
 * Creates:
 *   - examples/<category>/<category>.genart-workspace  (per-category workspace)
 *   - examples/terrain-gallery.genart-workspace        (full gallery workspace)
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "examples");
const GRID_SPACING = 700; // 600px canvas + 100px gap
const COLS = 8;
const NOW = "2026-03-12T00:00:00.000Z";

// Category definitions with preset IDs — mirrors generate-genart-files.cjs
const CATEGORIES = {
  sky: {
    title: "Sky Presets",
    presets: ["dawn", "noon", "golden-hour", "dusk", "night"],
  },
  profile: {
    title: "Terrain Profile Presets",
    presets: ["alpine-range", "rolling-hills", "mesa-plateau", "coastal-cliffs", "sand-dunes", "foothills"],
  },
  clouds: {
    title: "Cloud Presets",
    presets: ["fair-weather", "overcast", "wispy-high", "storm-clouds", "scattered"],
  },
  water: {
    title: "Water Presets",
    presets: ["still-lake", "choppy-sea", "mountain-stream", "river", "pond"],
  },
  river: {
    title: "River Presets",
    presets: ["gentle-stream", "wide-river", "mountain-creek", "lazy-oxbow", "forest-brook", "delta-channels", "waterfall-stream", "tidal-estuary"],
  },
  path: {
    title: "Path Presets",
    presets: ["dirt-trail", "cobblestone-road", "gravel-path", "forest-path", "mountain-switchback", "garden-walk", "sand-track", "country-lane"],
  },
  shore: {
    title: "Shore Presets",
    presets: ["sandy-beach", "rocky-shore", "muddy-riverbank", "grassy-bank", "tidal-flat", "cliff-base"],
  },
  field: {
    title: "Field Presets",
    presets: ["meadow-grass", "wheat-field", "wildflower-meadow", "lavender-rows", "dry-savanna", "rice-paddy", "autumn-stubble", "snow-covered"],
  },
  rock: {
    title: "Rock Presets",
    presets: ["granite-boulder", "sandstone-outcrop", "shan-shui-rock", "mossy-rock", "slate-shelf", "volcanic-basalt"],
  },
  treeline: {
    title: "Treeline Presets",
    presets: ["deciduous-canopy", "conifer-ridge", "autumn-treeline", "misty-forest", "palm-fringe", "winter-bare"],
  },
  celestial: {
    title: "Celestial Presets",
    presets: ["noon-sun", "golden-hour-sun", "harvest-moon", "crescent-moon", "blood-moon", "polar-star"],
  },
  fog: {
    title: "Fog Presets",
    presets: ["morning-mist", "mountain-veil", "valley-fog", "shan-shui-cloud-band", "coastal-haar"],
  },
  starfield: {
    title: "Starfield Presets",
    presets: ["clear-night", "dense-starfield", "milky-way", "sparse-stars", "twilight-stars"],
  },
  "cliff-face": {
    title: "Cliff Face Presets",
    presets: ["granite-cliff", "sandstone-wall", "basalt-columns", "limestone-face", "shale-cliff"],
  },
  snowfield: {
    title: "Snowfield Presets",
    presets: ["fresh-powder", "wind-swept", "sun-crust", "deep-snow"],
  },
  building: {
    title: "Building Presets",
    presets: ["farmhouse", "church-steeple", "tower-ruin", "village-cluster", "temple", "lighthouse"],
  },
  bridge: {
    title: "Bridge Presets",
    presets: ["stone-arch", "wooden-footbridge", "suspension-bridge", "flat-crossing"],
  },
  reflection: {
    title: "Reflection Presets",
    presets: ["calm-lake", "rippled-reflection", "dark-water", "golden-reflection"],
  },
  "vignette-foliage": {
    title: "Vignette Foliage Presets",
    presets: ["overhanging-branches", "grass-border", "leaf-frame", "pine-canopy", "vine-border"],
  },
  "forest-floor": {
    title: "Forest Floor Presets",
    presets: ["fern-carpet", "mossy-ground", "fallen-leaves", "pine-needles", "mushroom-patch"],
  },
  haze: {
    title: "Haze Presets",
    presets: ["light-haze", "golden-haze", "cool-mist", "heat-haze"],
  },
  fence: {
    title: "Fence Presets",
    presets: ["white-picket", "stone-wall", "ranch-rail", "wire-fence"],
  },
  boat: {
    title: "Boat Presets",
    presets: ["sailboat", "rowboat", "fishing-boat", "cargo-ship"],
  },
  erosion: {
    title: "Erosion Presets",
    presets: ["rain-streaks", "wind-erosion", "frost-cracks", "lichen-growth"],
  },
  landscape: {
    title: "Landscape Composites",
    presets: ["mountain-dawn", "rolling-pastoral", "desert-sunset", "coastal-storm", "lake-at-night", "mountain-stream-scene"],
  },
  scenes: {
    title: "Scene Recipes",
    presets: ["mountain-valley", "river-scene", "coastal-moonlight", "park-riverside", "shan-shui", "pastoral", "forest-clearing", "alpine-lake", "japanese-garden", "desert-expanse", "winter-woodland", "tropical-coast"],
  },
};

function buildWorkspace(id, title, sketches) {
  return {
    "genart-workspace": "1.0",
    id,
    title,
    created: NOW,
    modified: NOW,
    viewport: { x: 0, y: 0, zoom: 0.4 },
    sketches,
    groups: [],
    series: [],
  };
}

let totalFiles = 0;

// Per-category workspaces
for (const [cat, def] of Object.entries(CATEGORIES)) {
  const sketches = def.presets.map((presetId, i) => ({
    file: `./${presetId}.genart`,
    position: {
      x: (i % COLS) * GRID_SPACING,
      y: Math.floor(i / COLS) * GRID_SPACING,
    },
  }));

  const outDir = path.join(root, cat);
  fs.mkdirSync(outDir, { recursive: true });
  const ws = buildWorkspace(`terrain-${cat}`, def.title, sketches);
  const outFile = path.join(outDir, `${cat}.genart-workspace`);
  fs.writeFileSync(outFile, JSON.stringify(ws, null, 2) + "\n");
  console.log(`  ${path.relative(root, outFile)} (${sketches.length} sketches)`);
  totalFiles++;
}

// Full gallery workspace — all categories in rows
const allSketches = [];
let currentRow = 0;

for (const [cat, def] of Object.entries(CATEGORIES)) {
  def.presets.forEach((presetId, i) => {
    allSketches.push({
      file: `${cat}/${presetId}.genart`,
      position: {
        x: (i % COLS) * GRID_SPACING,
        y: currentRow * GRID_SPACING,
      },
    });
    if ((i + 1) % COLS === 0) currentRow++;
  });
  // Move to next row after each category
  currentRow = Math.ceil(currentRow + 1);
}

const galleryWs = buildWorkspace("terrain-gallery", "Terrain Preset Gallery", allSketches);
galleryWs.viewport.zoom = 0.1;
const galleryFile = path.join(root, "terrain-gallery.genart-workspace");
fs.writeFileSync(galleryFile, JSON.stringify(galleryWs, null, 2) + "\n");
console.log(`  ${path.relative(root, galleryFile)} (${allSketches.length} sketches)`);
totalFiles++;

console.log(`\nDone: ${totalFiles} workspace files generated.`);
