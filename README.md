# @genart-dev/plugin-terrain

Natural landscape element layers for [genart.dev](https://genart.dev) — 21 layer types, 114 presets, and 38 MCP tools for AI-agent control. Includes a depth lane system for multi-layer landscape composition and 13 scene recipe tools for instant complete landscapes.

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
  fieldLayerType,
  rockLayerType,
  treelineLayerType,
  celestialLayerType,
  starfieldLayerType,
  cliffFaceLayerType,
  snowfieldLayerType,
  // ... all 21 layer types exported
} from "@genart-dev/plugin-terrain";
```

## Layer Types (21)

### Active Layers (9)

| Layer Type | Presets | Description |
|---|---|---|
| `terrain:sky` | 5 | Time-of-day sky gradients with zenith, horizon, and haze colors |
| `terrain:profile` | 6 | Layered ridgeline silhouettes with depth-aware coloring, terrain type, and sub-ranges |
| `terrain:field` | 8 | Vegetation fields with depth-aware marks (grass, wheat, wildflowers) |
| `terrain:rock` | 6 | Natural rock forms (boulder, outcrop, pinnacle, shelf) |
| `terrain:treeline` | 6 | Tree canopy silhouette bands |
| `terrain:celestial` | 6 | Celestial bodies (sun, moon, stars) with glow effects |
| `terrain:starfield` | 5 | Star fields with optional Milky Way band |
| `terrain:cliff-face` | 5 | Vertical cliff/rock wall silhouettes |
| `terrain:snowfield` | 4 | Snow-covered ground with drifts |

### Deprecated Layers (12)

These layers are deprecated in v0.5.0 and will be removed in v1.0.0. They are being extracted into dedicated plugins in the v2 roadmap. Calls will continue to work but emit a `console.warn` deprecation notice.

**Moving to `@genart-dev/plugin-atmosphere` (Phase C):**

| Layer Type | Presets |
|---|---|
| `terrain:clouds` | 5 |
| `terrain:fog-layer` | 5 |
| `terrain:haze` | 4 |

**Moving to `@genart-dev/plugin-water` (Phase D):**

| Layer Type | Presets |
|---|---|
| `terrain:water` | 5 |
| `terrain:river` | 8 |
| `terrain:reflection` | 4 |
| `terrain:shore` | 6 |

**Moving to `@genart-dev/plugin-architecture` (Phase E):**

| Layer Type | Presets |
|---|---|
| `terrain:building` | 6 |
| `terrain:bridge` | 4 |
| `terrain:path` | 8 |
| `terrain:fence` | 4 |
| `terrain:boat` | 4 |

## Depth Lane System

All terrain layers support a `depthLane` property for coordinated multi-layer landscapes. Seven named lanes define depth ordering from farthest to nearest:

| Lane | Depth Range | Typical Use |
|---|---|---|
| `sky` | 0.00 | Sky, celestial bodies |
| `far-background` | 0.00–0.20 | Distant peaks, starfields |
| `background` | 0.20–0.40 | Ridgelines, treelines |
| `midground` | 0.40–0.60 | Fields, rocks |
| `foreground` | 0.60–0.85 | Cliff faces, snowfields |
| `ground-plane` | 0.85–1.00 | Snow drifts, ground cover |
| `overlay` | full range | Full-canvas overlays |

Each lane supports sub-levels (`-1`, `-2`, `-3`) for fine-grained ordering within a lane. Atmospheric depth is applied automatically — distant layers desaturate and shift toward blue (western mode) or warm paper tones (ink-wash mode).

## Presets (114)

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

Each profile preset supports three optional runtime properties that tune the landform character:

- **`terrainType`** (`'mountains'` | `'hills'` | `'plains'`) — scales noise amplitude and frequency. Mountains use full amplitude; hills use ~45%; plains use ~15% with compressed frequency.
- **`subRangeCount`** (0–3) — number of sub-range ridges drawn behind the main ridge, adding depth and layering.
- **`subRangeAmplitude`** (0.1–1.0) — scale factor for sub-range ridge heights relative to the main ridge.

| Preview | ID | Name | Description | Ridges | Tags |
|---|---|---|---|---|---|
| [![](examples/profile/alpine-range.png)](examples/profile/alpine-range.png) | `alpine-range` | Alpine Range | Sharp, jagged alpine peaks with multiple receding ridges | 5 | mountains, alpine, jagged, dramatic |
| [![](examples/profile/rolling-hills.png)](examples/profile/rolling-hills.png) | `rolling-hills` | Rolling Hills | Gentle, smooth rolling hills with soft contours | 3 | hills, gentle, pastoral, soft |
| [![](examples/profile/mesa-plateau.png)](examples/profile/mesa-plateau.png) | `mesa-plateau` | Mesa Plateau | Flat-topped mesa formations with steep cliff sides | 2 | desert, mesa, flat-top, arid |
| [![](examples/profile/coastal-cliffs.png)](examples/profile/coastal-cliffs.png) | `coastal-cliffs` | Coastal Cliffs | Dramatic coastal cliffs with weathered profiles | 2 | coast, cliffs, dramatic, ocean |
| [![](examples/profile/sand-dunes.png)](examples/profile/sand-dunes.png) | `sand-dunes` | Sand Dunes | Smooth undulating sand dunes with minimal roughness | 4 | desert, dunes, smooth, sand |
| [![](examples/profile/foothills.png)](examples/profile/foothills.png) | `foothills` | Foothills | Low foothills transitioning from plains with moderate elevation | 4 | hills, foothills, transitional, moderate |

### Field (8)

[![Field gallery](galleries/field-gallery.png)](#field-8)

| Preview | ID | Name | Description | Tags |
|---|---|---|---|---|
| [![](examples/field/meadow-grass.png)](examples/field/meadow-grass.png) | `meadow-grass` | Meadow Grass | Lush green meadow with mixed grasses | meadow, grass, green, lush |
| [![](examples/field/wheat-field.png)](examples/field/wheat-field.png) | `wheat-field` | Wheat Field | Golden wheat field ready for harvest | wheat, golden, harvest, warm |
| [![](examples/field/wildflower-meadow.png)](examples/field/wildflower-meadow.png) | `wildflower-meadow` | Wildflower Meadow | Colorful wildflower-dotted grassland | wildflower, meadow, colorful, spring |
| [![](examples/field/lavender-rows.png)](examples/field/lavender-rows.png) | `lavender-rows` | Lavender Rows | Orderly rows of lavender in bloom | lavender, rows, purple, fragrant |
| [![](examples/field/dry-savanna.png)](examples/field/dry-savanna.png) | `dry-savanna` | Dry Savanna | Dry golden savanna grassland | savanna, dry, golden, hot |
| [![](examples/field/rice-paddy.png)](examples/field/rice-paddy.png) | `rice-paddy` | Rice Paddy | Flooded rice paddy with green shoots | rice, paddy, green, water |
| [![](examples/field/autumn-stubble.png)](examples/field/autumn-stubble.png) | `autumn-stubble` | Autumn Stubble | Harvested field with stubble remaining | autumn, stubble, brown, harvested |
| [![](examples/field/snow-covered.png)](examples/field/snow-covered.png) | `snow-covered` | Snow Covered | Field covered in a blanket of snow | snow, covered, white, winter |

### Rock (6)

[![Rock gallery](galleries/rock-gallery.png)](#rock-6)

| Preview | ID | Name | Description | Tags |
|---|---|---|---|---|
| [![](examples/rock/granite-boulder.png)](examples/rock/granite-boulder.png) | `granite-boulder` | Granite Boulder | Large granite boulder with rough texture | granite, boulder, grey, rough |
| [![](examples/rock/sandstone-outcrop.png)](examples/rock/sandstone-outcrop.png) | `sandstone-outcrop` | Sandstone Outcrop | Layered sandstone outcrop with warm tones | sandstone, outcrop, warm, layered |
| [![](examples/rock/shan-shui-rock.png)](examples/rock/shan-shui-rock.png) | `shan-shui-rock` | Shan Shui Rock | Stylized Chinese landscape rock | shan-shui, rock, stylized, eastern |
| [![](examples/rock/mossy-rock.png)](examples/rock/mossy-rock.png) | `mossy-rock` | Mossy Rock | Weathered rock covered in green moss | mossy, rock, green, old |
| [![](examples/rock/slate-shelf.png)](examples/rock/slate-shelf.png) | `slate-shelf` | Slate Shelf | Flat shelf of layered slate | slate, shelf, flat, dark |
| [![](examples/rock/volcanic-basalt.png)](examples/rock/volcanic-basalt.png) | `volcanic-basalt` | Volcanic Basalt | Dark volcanic basalt columns | volcanic, basalt, dark, columnar |

### Treeline (6)

[![Treeline gallery](galleries/treeline-gallery.png)](#treeline-6)

| Preview | ID | Name | Description | Tags |
|---|---|---|---|---|
| [![](examples/treeline/deciduous-canopy.png)](examples/treeline/deciduous-canopy.png) | `deciduous-canopy` | Deciduous Canopy | Lush deciduous tree canopy in summer | deciduous, canopy, green, summer |
| [![](examples/treeline/conifer-ridge.png)](examples/treeline/conifer-ridge.png) | `conifer-ridge` | Conifer Ridge | Dense conifer ridge silhouette | conifer, ridge, dark, evergreen |
| [![](examples/treeline/autumn-treeline.png)](examples/treeline/autumn-treeline.png) | `autumn-treeline` | Autumn Treeline | Treeline in full autumn color | autumn, treeline, colorful, warm |
| [![](examples/treeline/misty-forest.png)](examples/treeline/misty-forest.png) | `misty-forest` | Misty Forest | Forest edge shrouded in mist | misty, forest, atmospheric, soft |
| [![](examples/treeline/palm-fringe.png)](examples/treeline/palm-fringe.png) | `palm-fringe` | Palm Fringe | Tropical palm tree silhouettes | palm, tropical, silhouette, coastal |
| [![](examples/treeline/winter-bare.png)](examples/treeline/winter-bare.png) | `winter-bare` | Winter Bare | Bare winter trees with no leaves | winter, bare, stark, cold |

### Celestial (6)

[![Celestial gallery](galleries/celestial-gallery.png)](#celestial-6)

| Preview | ID | Name | Description | Tags |
|---|---|---|---|---|
| [![](examples/celestial/noon-sun.png)](examples/celestial/noon-sun.png) | `noon-sun` | Noon Sun | Bright overhead sun | sun, noon, bright, warm |
| [![](examples/celestial/golden-hour-sun.png)](examples/celestial/golden-hour-sun.png) | `golden-hour-sun` | Golden Hour Sun | Low sun with golden glow | sun, golden, warm, atmospheric |
| [![](examples/celestial/harvest-moon.png)](examples/celestial/harvest-moon.png) | `harvest-moon` | Harvest Moon | Large amber harvest moon | moon, harvest, amber, warm |
| [![](examples/celestial/crescent-moon.png)](examples/celestial/crescent-moon.png) | `crescent-moon` | Crescent Moon | Thin crescent moon | moon, crescent, cool, night |
| [![](examples/celestial/blood-moon.png)](examples/celestial/blood-moon.png) | `blood-moon` | Blood Moon | Deep red lunar eclipse moon | moon, blood, red, dramatic |
| [![](examples/celestial/polar-star.png)](examples/celestial/polar-star.png) | `polar-star` | Polar Star | Bright northern star with glow | star, polar, bright, night |

### Starfield (5)

[![Starfield gallery](galleries/starfield-gallery.png)](#starfield-5)

| Preview | ID | Name | Description | Tags |
|---|---|---|---|---|
| [![](examples/starfield/clear-night.png)](examples/starfield/clear-night.png) | `clear-night` | Clear Night | Clear night sky with scattered stars | clear, night, scattered, standard |
| [![](examples/starfield/dense-starfield.png)](examples/starfield/dense-starfield.png) | `dense-starfield` | Dense Starfield | Densely packed star field | dense, starfield, packed, bright |
| [![](examples/starfield/milky-way.png)](examples/starfield/milky-way.png) | `milky-way` | Milky Way | Milky Way band across the sky | milky-way, band, galactic, dramatic |
| [![](examples/starfield/sparse-stars.png)](examples/starfield/sparse-stars.png) | `sparse-stars` | Sparse Stars | Few scattered stars in early twilight | sparse, stars, twilight, subtle |
| [![](examples/starfield/twilight-stars.png)](examples/starfield/twilight-stars.png) | `twilight-stars` | Twilight Stars | Stars emerging at dusk | twilight, stars, emerging, dusk |

### Cliff Face (5)

[![Cliff Face gallery](galleries/cliff-face-gallery.png)](#cliff-face-5)

| Preview | ID | Name | Description | Tags |
|---|---|---|---|---|
| [![](examples/cliff-face/granite-cliff.png)](examples/cliff-face/granite-cliff.png) | `granite-cliff` | Granite Cliff | Sheer granite cliff face | granite, cliff, sheer, grey |
| [![](examples/cliff-face/sandstone-wall.png)](examples/cliff-face/sandstone-wall.png) | `sandstone-wall` | Sandstone Wall | Warm sandstone cliff wall | sandstone, wall, warm, layered |
| [![](examples/cliff-face/basalt-columns.png)](examples/cliff-face/basalt-columns.png) | `basalt-columns` | Basalt Columns | Columnar basalt cliff formation | basalt, columns, dark, geometric |
| [![](examples/cliff-face/limestone-face.png)](examples/cliff-face/limestone-face.png) | `limestone-face` | Limestone Face | Pale limestone cliff with erosion | limestone, face, pale, eroded |
| [![](examples/cliff-face/shale-cliff.png)](examples/cliff-face/shale-cliff.png) | `shale-cliff` | Shale Cliff | Dark layered shale cliff | shale, cliff, dark, layered |

### Snowfield (4)

[![Snowfield gallery](galleries/snowfield-gallery.png)](#snowfield-4)

| Preview | ID | Name | Description | Tags |
|---|---|---|---|---|
| [![](examples/snowfield/fresh-powder.png)](examples/snowfield/fresh-powder.png) | `fresh-powder` | Fresh Powder | Freshly fallen undisturbed snow | fresh, powder, white, pristine |
| [![](examples/snowfield/wind-swept.png)](examples/snowfield/wind-swept.png) | `wind-swept` | Wind Swept | Wind-sculpted snow with ridges | wind, swept, ridges, textured |
| [![](examples/snowfield/sun-crust.png)](examples/snowfield/sun-crust.png) | `sun-crust` | Sun Crust | Sun-crusted snow with icy surface | sun, crust, icy, sparkling |
| [![](examples/snowfield/deep-snow.png)](examples/snowfield/deep-snow.png) | `deep-snow` | Deep Snow | Deep snow with soft contours | deep, snow, soft, heavy |

### Deprecated Presets (63)

The 12 deprecated layer types retain their presets for backwards compatibility. See [Deprecated Layers](#deprecated-layers-12) for the migration path.

| Layer | Presets | IDs |
|---|---|---|
| `terrain:clouds` | 5 | fair-weather, overcast, wispy-high, storm-clouds, scattered |
| `terrain:fog-layer` | 5 | morning-mist, mountain-veil, valley-fog, shan-shui-cloud-band, coastal-haar |
| `terrain:haze` | 4 | light-haze, golden-haze, cool-mist, heat-haze |
| `terrain:water` | 5 | still-lake, choppy-sea, mountain-stream, river, pond |
| `terrain:river` | 8 | gentle-stream, wide-river, mountain-creek, lazy-oxbow, forest-brook, delta-channels, waterfall-stream, tidal-estuary |
| `terrain:reflection` | 4 | calm-lake, rippled-reflection, dark-water, golden-reflection |
| `terrain:shore` | 6 | sandy-beach, rocky-shore, muddy-riverbank, grassy-bank, tidal-flat, cliff-base |
| `terrain:building` | 6 | farmhouse, church-steeple, tower-ruin, village-cluster, temple, lighthouse |
| `terrain:bridge` | 4 | stone-arch, wooden-footbridge, suspension-bridge, flat-crossing |
| `terrain:path` | 8 | dirt-trail, cobblestone-road, gravel-path, forest-path, mountain-switchback, garden-walk, sand-track, country-lane |
| `terrain:fence` | 4 | white-picket, stone-wall, ranch-rail, wire-fence |
| `terrain:boat` | 4 | sailboat, rowboat, fishing-boat, cargo-ship |

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

### Scene Recipes (12)

[![Scenes gallery](galleries/scenes-gallery.png)](#scene-recipes-12)

Multi-layer scenes assembled by the scene recipe MCP tools:

| Preview | ID | Name | Layers |
|---|---|---|---|
| [![](examples/scenes/mountain-valley.png)](examples/scenes/mountain-valley.png) | `mountain-valley` | Mountain Valley | sky + alpine ridges + fog + treeline + field + haze |
| [![](examples/scenes/river-scene.png)](examples/scenes/river-scene.png) | `river-scene` | River Scene | sky + hills + river + shore + treeline + reflection |
| [![](examples/scenes/coastal-moonlight.png)](examples/scenes/coastal-moonlight.png) | `coastal-moonlight` | Coastal Moonlight | night sky + starfield + moon + water + shore + reflection |
| [![](examples/scenes/park-riverside.png)](examples/scenes/park-riverside.png) | `park-riverside` | Park Riverside | sky + terrain + river + path + treeline + field + building |
| [![](examples/scenes/shan-shui.png)](examples/scenes/shan-shui.png) | `shan-shui` | Shan Shui | sky + peaks + fog + rock + water + haze |
| [![](examples/scenes/pastoral.png)](examples/scenes/pastoral.png) | `pastoral` | Pastoral | golden-hour sky + hills + wheat field + path + fence + building + haze |
| [![](examples/scenes/forest-clearing.png)](examples/scenes/forest-clearing.png) | `forest-clearing` | Forest Clearing | sky + treeline + forest floor + fog + path |
| [![](examples/scenes/alpine-lake.png)](examples/scenes/alpine-lake.png) | `alpine-lake` | Alpine Lake | sky + alpine range + snowfield + water + reflection + cliff + haze |
| [![](examples/scenes/japanese-garden.png)](examples/scenes/japanese-garden.png) | `japanese-garden` | Japanese Garden | sky + water + bridge + rock + treeline + reflection + haze |
| [![](examples/scenes/desert-expanse.png)](examples/scenes/desert-expanse.png) | `desert-expanse` | Desert Expanse | sky + mesa + cliff + field + haze |
| [![](examples/scenes/winter-woodland.png)](examples/scenes/winter-woodland.png) | `winter-woodland` | Winter Woodland | sky + terrain + snow + treeline + fog |
| [![](examples/scenes/tropical-coast.png)](examples/scenes/tropical-coast.png) | `tropical-coast` | Tropical Coast | golden-hour sky + water + shore + boat + reflection + haze |

> **Note:** Scene recipes that include deprecated layers (clouds, fog-layer, haze, water, river, shore, reflection, building, bridge, path, fence, boat) will emit deprecation warnings at render time.

## Examples

The `examples/` directory contains `.genart` sketch files organized by category, with `.png` thumbnails and `.genart-workspace` files:

```
examples/
├── sky/               5 sky gradient presets
├── profile/           6 terrain ridgeline presets
├── field/             8 vegetation field presets
├── rock/              6 natural rock form presets
├── treeline/          6 canopy silhouette presets
├── celestial/         6 sun/moon/star presets
├── starfield/         5 star field presets
├── cliff-face/        5 cliff wall presets
├── snowfield/         4 snow ground presets
├── landscape/         6 composite scenes
├── scenes/           12 scene recipe compositions
└── terrain-gallery.genart-workspace  (all active sketches)
```

**Regenerating examples:**

```bash
node generate-genart-files.cjs        # Create .genart files from presets
node generate-workspace-files.cjs     # Create .genart-workspace files
node render-examples.cjs              # Render .png thumbnails (requires local CLI)
node generate-galleries.cjs           # Create category gallery montages
```

## MCP Tools (38)

Exposed to AI agents through the MCP server when this plugin is registered.

### Add Layer Tools — Active (9)

| Tool | Description |
|---|---|
| `add_sky` | Add a sky gradient layer with time-of-day preset or custom colors |
| `add_terrain_profile` | Add terrain ridgeline silhouettes from profile presets |
| `add_field` | Add a vegetation field with depth-aware marks |
| `add_rock` | Add natural rock forms |
| `add_treeline` | Add a tree canopy silhouette band |
| `add_celestial` | Add celestial bodies (sun, moon, stars) with glow |
| `add_starfield` | Add a star field with optional Milky Way |
| `add_cliff_face` | Add a vertical cliff or rock wall silhouette |
| `add_snowfield` | Add snow-covered ground with drifts |

### Add Layer Tools — Deprecated (12)

These tools still function but emit a deprecation warning. They will be removed in v1.0.0 when the target plugins are released.

| Tool | Moves To |
|---|---|
| `add_clouds` | `@genart-dev/plugin-atmosphere` |
| `add_fog_layer` | `@genart-dev/plugin-atmosphere` |
| `add_haze` | `@genart-dev/plugin-atmosphere` |
| `add_water_surface` | `@genart-dev/plugin-water` |
| `add_river` | `@genart-dev/plugin-water` |
| `add_reflection` | `@genart-dev/plugin-water` |
| `add_shore` | `@genart-dev/plugin-water` |
| `add_building` | `@genart-dev/plugin-architecture` |
| `add_bridge` | `@genart-dev/plugin-architecture` |
| `add_path` | `@genart-dev/plugin-architecture` |
| `add_fence` | `@genart-dev/plugin-architecture` |
| `add_boat` | `@genart-dev/plugin-architecture` |

### Scene Recipe Tools (13)

Complete landscape compositions assembled from multiple layers:

| Tool | Description |
|---|---|
| `create_landscape` | Sky + terrain profile + optional clouds + water |
| `create_mountain_valley` | Sky + alpine ridges + fog + treeline + field + haze |
| `create_river_scene` | Sky + hills + river + shore + treeline + reflection |
| `create_coastal_moonlight` | Night sky + starfield + moon + water + shore + reflection |
| `create_park_riverside` | Sky + terrain + river + path + treeline + field + building |
| `create_shan_shui` | Chinese landscape: sky + peaks + fog + rock + water + haze |
| `create_pastoral` | Golden-hour countryside: sky + hills + wheat field + path + fence + building + haze |
| `create_forest_clearing` | Sky + treeline + forest floor + fog + path |
| `create_alpine_lake` | Sky + alpine range + snowfield + water + reflection + cliff + haze |
| `create_japanese_garden` | Sky + water + bridge + rock + treeline + reflection + haze |
| `create_desert_expanse` | Sky + mesa + cliff + field + haze |
| `create_winter_woodland` | Sky + terrain + snow + treeline + fog |
| `create_tropical_coast` | Golden-hour coast: sky + water + shore + boat + reflection + haze |

### Utility Tools (4)

| Tool | Description |
|---|---|
| `set_time_of_day` | Update a sky layer to a different time-of-day preset |
| `list_terrain_presets` | List all 114 presets, optionally filtered by category |
| `set_terrain_depth` | Adjust depth properties on a terrain profile layer |
| `set_depth_lane` | Update depth lane assignment on any layer |

## Rendering

Each layer type renders via canvas2d:

- **Sky** — Three-stop vertical gradient (zenith → haze → horizon) with configurable haze band
- **Profile** — Back-to-front ridgeline silhouettes with fractal noise elevation and depth-aware color interpolation. `terrainType` scales noise amplitude/frequency for mountains, hills, or plains. `subRangeCount` adds secondary ridges behind the main ridge; `subRangeAmplitude` controls their relative height.
- **Field** — Depth-aware mark generation (grass blades, wheat stalks, flowers) with perspective scaling, constrained to the assigned depth lane vertical extent
- **Rock** — Procedural rock silhouettes with fractal detail and depth-placed shading
- **Treeline** — Canopy silhouette generation with per-tree variation and atmospheric coloring
- **Celestial** — Radial gradient glow with optional lens flare and corona effects
- **Starfield** — Pseudo-random star placement with brightness variation and optional galaxy band
- **Cliff Face** — Vertical wall silhouette with horizontal striation marks and depth tinting
- **Snowfield** — Horizontal coverage bands with drift accumulation noise and sparkle highlights

## Utilities

Shared utilities exported for advanced use:

```typescript
import {
  mulberry32,                          // Deterministic PRNG
  createValueNoise, createFractalNoise, // Procedural noise generators
  parseHex, toHex, lerpColor,          // Color interpolation
  darken, lighten,                     // Color adjustment
  applyDepthEasing,                    // Depth curve functions
  resolveDepthLane,                    // Depth lane resolution
  depthForLane,                        // Lane → depth value
  DEPTH_LANE_ORDER,                    // Lane names in order
  DEPTH_LANE_OPTIONS,                  // UI-ready enum options
} from "@genart-dev/plugin-terrain";
```

## Preset Discovery

```typescript
import { ALL_PRESETS, filterPresets, searchPresets, getPreset } from "@genart-dev/plugin-terrain";

// All 114 presets (51 active + 63 deprecated)
console.log(ALL_PRESETS.length); // 114

// Filter by category
const skyPresets = filterPresets({ category: "sky" });     // 5 presets
const profiles = filterPresets({ category: "profile" });   // 6 presets
const fields = filterPresets({ category: "field" });       // 8 presets

// Filter by tags
const dramatic = filterPresets({ tags: ["dramatic"] });

// Full-text search
const results = searchPresets("mountain");

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
| [`@genart-dev/plugin-particles`](https://github.com/genart-dev/plugin-particles) | Particle systems (15 presets) |
| [`@genart-dev/plugin-atmosphere`](https://github.com/genart-dev/plugin-atmosphere) | Clouds, fog, haze (v2 Phase C — coming soon) |
| [`@genart-dev/plugin-water`](https://github.com/genart-dev/plugin-water) | Water, rivers, reflections (v2 Phase D — coming soon) |
| [`@genart-dev/plugin-architecture`](https://github.com/genart-dev/plugin-architecture) | Buildings, bridges, paths (v2 Phase E — coming soon) |

## Support

Questions, bugs, or feedback — [support@genart.dev](mailto:support@genart.dev) or [open an issue](https://github.com/genart-dev/plugin-terrain/issues).

## License

MIT
