# @genart-dev/plugin-terrain

Natural landscape element layers for [genart.dev](https://genart.dev) — sky gradients, terrain profiles, cloud formations, and water surfaces. 21 presets across 4 categories, with 8 MCP tools for AI-agent control.

Part of [genart.dev](https://genart.dev) — a generative art platform with an MCP server, desktop app, and IDE extensions.

## Install

```bash
npm install @genart-dev/plugin-terrain
```

## Usage

```typescript
import terrainPlugin from "@genart-dev/plugin-terrain";
import { createDefaultRegistry } from "@genart-dev/core";

const registry = createDefaultRegistry();
registry.registerPlugin(terrainPlugin);

// Or access individual exports
import {
  ALL_PRESETS,
  getPreset,
  filterPresets,
  searchPresets,
  skyLayerType,
  profileLayerType,
  cloudsLayerType,
  waterLayerType,
} from "@genart-dev/plugin-terrain";
```

## Layer Types (4)

| Layer Type | Category | Default Preset | Description |
|---|---|---|---|
| `terrain:sky` | Sky (5) | `noon` | Time-of-day sky gradients with zenith, horizon, and haze colors |
| `terrain:profile` | Profile (6) | `rolling-hills` | Layered ridgeline silhouettes with depth-aware coloring |
| `terrain:clouds` | Clouds (5) | `fair-weather` | Noise-driven cloud formations (cumulus, stratus, cirrus) |
| `terrain:water` | Water (5) | `still-lake` | Water surfaces with wave lines and shimmer highlights |

## Presets (21)

### Sky (5)

[![Sky gallery](galleries/sky-gallery.png)](#sky-5)

| Preview | ID | Name | Description | Tags |
|---|---|---|---|---|
| [![](examples/sky/dawn.png)](examples/sky/dawn.png) | `dawn` | Dawn | Early morning sky with warm pink-orange horizon fading to pale blue zenith | warm, morning, sunrise, soft |
| [![](examples/sky/noon.png)](examples/sky/noon.png) | `noon` | Noon | Clear midday sky with deep blue zenith and pale blue horizon | bright, clear, midday, blue |
| [![](examples/sky/golden-hour.png)](examples/sky/golden-hour.png) | `golden-hour` | Golden Hour | Late afternoon golden light with amber horizon and warm blue zenith | warm, golden, afternoon, atmospheric |
| [![](examples/sky/dusk.png)](examples/sky/dusk.png) | `dusk` | Dusk | Twilight sky with deep purple zenith and burnt orange horizon | cool, evening, twilight, purple |
| [![](examples/sky/night.png)](examples/sky/night.png) | `night` | Night | Dark night sky with near-black zenith and deep navy horizon | dark, night, cool, moody |

### Profile (6)

[![Profile gallery](galleries/profile-gallery.png)](#profile-6)

| Preview | ID | Name | Description | Ridges | Tags |
|---|---|---|---|---|---|
| [![](examples/profile/alpine-range.png)](examples/profile/alpine-range.png) | `alpine-range` | Alpine Range | Sharp, jagged alpine peaks with multiple receding ridges | 5 | mountains, alpine, jagged, dramatic |
| [![](examples/profile/rolling-hills.png)](examples/profile/rolling-hills.png) | `rolling-hills` | Rolling Hills | Gentle, smooth rolling hills with soft contours | 3 | hills, gentle, pastoral, soft |
| [![](examples/profile/mesa-plateau.png)](examples/profile/mesa-plateau.png) | `mesa-plateau` | Mesa Plateau | Flat-topped mesa formations with steep cliff sides | 2 | desert, mesa, flat-top, arid |
| [![](examples/profile/coastal-cliffs.png)](examples/profile/coastal-cliffs.png) | `coastal-cliffs` | Coastal Cliffs | Dramatic coastal cliffs with weathered profiles | 2 | coast, cliffs, dramatic, ocean |
| [![](examples/profile/sand-dunes.png)](examples/profile/sand-dunes.png) | `sand-dunes` | Sand Dunes | Smooth undulating sand dunes with minimal roughness | 4 | desert, dunes, smooth, sand |
| [![](examples/profile/foothills.png)](examples/profile/foothills.png) | `foothills` | Foothills | Low foothills transitioning from plains with moderate elevation | 4 | hills, foothills, transitional, moderate |

### Clouds (5)

[![Clouds gallery](galleries/clouds-gallery.png)](#clouds-5)

| Preview | ID | Name | Description | Type | Coverage | Tags |
|---|---|---|---|---|---|---|
| [![](examples/clouds/fair-weather.png)](examples/clouds/fair-weather.png) | `fair-weather` | Fair Weather | Scattered cumulus clouds on a clear day | cumulus | 0.3 | cumulus, light, clear, scattered |
| [![](examples/clouds/overcast.png)](examples/clouds/overcast.png) | `overcast` | Overcast | Heavy stratus cloud cover blanketing the sky | stratus | 0.75 | stratus, heavy, grey, uniform |
| [![](examples/clouds/wispy-high.png)](examples/clouds/wispy-high.png) | `wispy-high` | Wispy High | Thin cirrus wisps high in the atmosphere | cirrus | 0.2 | cirrus, thin, high, wispy |
| [![](examples/clouds/storm-clouds.png)](examples/clouds/storm-clouds.png) | `storm-clouds` | Storm Clouds | Dense, dark cumulonimbus clouds building before a storm | cumulus | 0.6 | cumulus, dark, storm, dramatic |
| [![](examples/clouds/scattered.png)](examples/clouds/scattered.png) | `scattered` | Scattered | Mixed scattered clouds at varying altitudes | cumulus | 0.4 | cumulus, scattered, mixed, varied |

### Water (5)

[![Water gallery](galleries/water-gallery.png)](#water-5)

| Preview | ID | Name | Description | Ripple Mode | Tags |
|---|---|---|---|---|---|
| [![](examples/water/still-lake.png)](examples/water/still-lake.png) | `still-lake` | Still Lake | Calm, mirror-like lake surface with minimal ripples | sine | calm, lake, mirror, peaceful |
| [![](examples/water/choppy-sea.png)](examples/water/choppy-sea.png) | `choppy-sea` | Choppy Sea | Rough ocean surface with strong waves and whitecaps | noise | ocean, rough, waves, dramatic |
| [![](examples/water/mountain-stream.png)](examples/water/mountain-stream.png) | `mountain-stream` | Mountain Stream | Clear mountain stream with visible ripple patterns | noise | stream, clear, mountain, fresh |
| [![](examples/water/river.png)](examples/water/river.png) | `river` | River | Wide river with moderate current and surface texture | sine | river, moderate, flowing, wide |
| [![](examples/water/pond.png)](examples/water/pond.png) | `pond` | Pond | Small quiet pond with subtle surface movement | sine | pond, quiet, small, still |

### Landscape Composites (6)

[![Landscape gallery](galleries/landscape-gallery.png)](#landscape-composites-6)

Multi-layer scenes combining sky, terrain, clouds, and water:

| Preview | ID | Name | Layers |
|---|---|---|---|
| [![](examples/landscape/mountain-dawn.png)](examples/landscape/mountain-dawn.png) | `mountain-dawn` | Mountain Dawn | dawn sky + alpine-range profile + wispy-high clouds |
| [![](examples/landscape/rolling-pastoral.png)](examples/landscape/rolling-pastoral.png) | `rolling-pastoral` | Rolling Pastoral | noon sky + rolling-hills profile + fair-weather clouds |
| [![](examples/landscape/desert-sunset.png)](examples/landscape/desert-sunset.png) | `desert-sunset` | Desert Sunset | golden-hour sky + mesa-plateau + sand-dunes profiles |
| [![](examples/landscape/coastal-storm.png)](examples/landscape/coastal-storm.png) | `coastal-storm` | Coastal Storm | dusk sky + coastal-cliffs profile + storm clouds + choppy sea |
| [![](examples/landscape/lake-at-night.png)](examples/landscape/lake-at-night.png) | `lake-at-night` | Lake at Night | night sky + foothills profile + still-lake water |
| [![](examples/landscape/mountain-stream-scene.png)](examples/landscape/mountain-stream-scene.png) | `mountain-stream-scene` | Mountain Stream | noon sky + alpine-range profile + scattered clouds + mountain-stream water |

## Examples

The `examples/` directory contains 27 `.genart` sketch files organized by category, with `.png` thumbnails and `.genart-workspace` files:

```
examples/
├── sky/              5 sky gradient presets + workspace
├── profile/          6 terrain ridgeline presets + workspace
├── clouds/           5 cloud formation presets + workspace
├── water/            5 water surface presets + workspace
├── landscape/        6 composite scenes + workspace
└── terrain-gallery.genart-workspace   (all 27 sketches)
```

**Regenerating examples:**

```bash
node generate-genart-files.cjs        # Create .genart files from presets
node generate-workspace-files.cjs     # Create .genart-workspace files
node render-examples.cjs              # Render .png thumbnails (requires genart CLI)
bash generate-galleries.sh            # Create category gallery montages
```

## MCP Tools (8)

Exposed to AI agents through the MCP server when this plugin is registered:

| Tool | Description |
|---|---|
| `add_sky` | Add a sky gradient layer with time-of-day preset or custom colors |
| `add_terrain_profile` | Add terrain ridgeline silhouettes from 6 profile presets |
| `add_clouds` | Add noise-driven cloud formations (cumulus, stratus, cirrus) |
| `add_water_surface` | Add water surface with waves and shimmer highlights |
| `create_landscape` | Compose a complete scene: sky + terrain + optional clouds + water |
| `set_time_of_day` | Update a sky layer to a different time-of-day preset |
| `list_terrain_presets` | List all 21 presets, optionally filtered by category |
| `set_terrain_depth` | Adjust depth properties on a terrain profile layer |

## Rendering

Each layer type renders via canvas2d:

- **Sky** — Three-stop vertical gradient (zenith → haze → horizon) with configurable haze band
- **Profile** — Back-to-front ridgeline silhouettes with fractal noise elevation and depth-aware color interpolation
- **Clouds** — Fractal noise sampled per-pixel into an ImageData buffer with cloud/shadow color blending
- **Water** — Vertical gradient fill with sine or noise-driven wave lines and shimmer highlight streaks

## Utilities

Shared utilities exported for advanced use:

```typescript
import {
  mulberry32,                          // Deterministic PRNG
  createValueNoise, createFractalNoise, // Procedural noise generators
  parseHex, toHex, lerpColor,          // Color interpolation
  darken, lighten,                     // Color adjustment
  applyDepthEasing,                    // Depth curve functions
} from "@genart-dev/plugin-terrain";
```

## Preset Discovery

```typescript
import { ALL_PRESETS, filterPresets, searchPresets, getPreset } from "@genart-dev/plugin-terrain";

// All 21 presets
console.log(ALL_PRESETS.length); // 21

// Filter by category
const skyPresets = filterPresets({ category: "sky" });     // 5 presets
const profiles = filterPresets({ category: "profile" });   // 6 presets

// Filter by tags
const dramatic = filterPresets({ tags: ["dramatic"] });    // alpine-range, coastal-cliffs, storm-clouds, choppy-sea

// Full-text search
const results = searchPresets("mountain"); // mountain-stream

// Look up by ID
const preset = getPreset("alpine-range");
```

## Related Packages

| Package | Purpose |
|---|---|
| [`@genart-dev/core`](https://github.com/genart-dev/core) | Plugin host, layer system (dependency) |
| [`@genart-dev/mcp-server`](https://github.com/genart-dev/mcp-server) | MCP server that surfaces plugin tools to AI agents |
| [`@genart-dev/plugin-plants`](https://github.com/genart-dev/plugin-plants) | Algorithmic plant generation (110 presets) |
| [`@genart-dev/plugin-patterns`](https://github.com/genart-dev/plugin-patterns) | Geometric and organic pattern fills (153 presets) |

## Support

Questions, bugs, or feedback — [support@genart.dev](mailto:support@genart.dev) or [open an issue](https://github.com/genart-dev/plugin-terrain/issues).

## License

MIT
