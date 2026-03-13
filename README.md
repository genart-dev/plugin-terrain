# @genart-dev/plugin-terrain

Natural landscape element layers for [genart.dev](https://genart.dev) — 24 layer types, 128 presets, and 41 MCP tools for AI-agent control. Includes a depth lane system for multi-layer landscape composition and 13 scene recipe tools for instant complete landscapes.

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
  riverLayerType,
  fieldLayerType,
  rockLayerType,
  treelineLayerType,
  // ... all 24 layer types exported
} from "@genart-dev/plugin-terrain";
```

## Layer Types (24)

### Core Layers (4)

| Layer Type | Presets | Description |
|---|---|---|
| `terrain:sky` | 5 | Time-of-day sky gradients with zenith, horizon, and haze colors |
| `terrain:profile` | 6 | Layered ridgeline silhouettes with depth-aware coloring |
| `terrain:clouds` | 5 | Noise-driven cloud formations (cumulus, stratus, cirrus) |
| `terrain:water` | 5 | Water surfaces with wave lines and shimmer highlights |

### Perspective Layers (3)

| Layer Type | Presets | Description |
|---|---|---|
| `terrain:river` | 8 | Perspective rivers with flow path and banks |
| `terrain:path` | 8 | Trails and roads with surface textures |
| `terrain:shore` | 6 | Shoreline/beach transitions where water meets land |

### Depth Lane Layers (3)

| Layer Type | Presets | Description |
|---|---|---|
| `terrain:field` | 8 | Vegetation fields with depth-aware marks (grass, wheat, wildflowers) |
| `terrain:rock` | 6 | Natural rock forms (boulder, outcrop, pinnacle, shelf) |
| `terrain:treeline` | 6 | Tree canopy silhouette bands |

### Atmospheric Layers (2)

| Layer Type | Presets | Description |
|---|---|---|
| `terrain:celestial` | 6 | Celestial bodies (sun, moon, stars) with glow effects |
| `terrain:fog-layer` | 5 | Occluding fog bands with masking |

### Tier 2 Layers (9)

| Layer Type | Presets | Description |
|---|---|---|
| `terrain:starfield` | 5 | Star fields with optional Milky Way band |
| `terrain:cliff-face` | 5 | Vertical cliff/rock wall silhouettes |
| `terrain:snowfield` | 4 | Snow-covered ground with drifts |
| `terrain:building` | 6 | Architectural silhouettes (farmhouse, church, tower, etc.) |
| `terrain:bridge` | 4 | Bridge structures (arch, suspension, footbridge, flat) |
| `terrain:reflection` | 4 | Water surface reflections mirroring sky/terrain tones |
| `terrain:vignette-foliage` | 5 | Framing foliage along canvas edges |
| `terrain:forest-floor` | 5 | Ground cover undergrowth (ferns, moss, fallen logs, mushrooms) |
| `terrain:haze` | 4 | Subtle atmospheric haze/mist (additive) |

### Tier 3 Layers (3)

| Layer Type | Presets | Description |
|---|---|---|
| `terrain:fence` | 4 | Fence/wall silhouettes (picket, stone, rail, wire) |
| `terrain:boat` | 4 | Boat/ship silhouettes on water |
| `terrain:erosion` | 4 | Weathering/erosion textures (rain streaks, wind scour, frost cracks, lichen) |

## Depth Lane System

All terrain layers support a `depthLane` property for coordinated multi-layer landscapes. Seven named lanes define depth ordering from farthest to nearest:

| Lane | Depth Range | Typical Use |
|---|---|---|
| `sky` | 0.00 | Sky, celestial bodies |
| `far-background` | 0.00–0.20 | Distant peaks, starfields |
| `background` | 0.20–0.40 | Ridgelines, treelines, fog |
| `midground` | 0.40–0.60 | Fields, rocks, buildings |
| `foreground` | 0.60–0.85 | Paths, rivers, fences, boats |
| `ground-plane` | 0.85–1.00 | Forest floor, shore, snow |
| `overlay` | full range | Haze, vignette, erosion |

Each lane supports sub-levels (`-1`, `-2`, `-3`) for fine-grained ordering within a lane. Atmospheric depth is applied automatically — distant layers desaturate and shift toward blue (western mode) or warm paper tones (ink-wash mode).

## Presets (128)

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

### River (8)

| ID | Name | Description | Tags |
|---|---|---|---|
| `gentle-stream` | Gentle Stream | Calm, meandering stream with soft banks | calm, stream, gentle, peaceful |
| `wide-river` | Wide River | Broad river with steady flow | wide, river, flowing, deep |
| `mountain-creek` | Mountain Creek | Fast-flowing rocky creek | mountain, creek, fast, rocky |
| `lazy-oxbow` | Lazy Oxbow | Slow, winding oxbow curve | slow, oxbow, winding, marshy |
| `forest-brook` | Forest Brook | Narrow brook through woodland | forest, brook, narrow, shaded |
| `delta-channels` | Delta Channels | Branching delta waterways | delta, channels, branching, coastal |
| `waterfall-stream` | Waterfall Stream | Stream with cascading flow | waterfall, cascade, rushing, rocky |
| `tidal-estuary` | Tidal Estuary | Wide tidal estuary meeting the sea | tidal, estuary, wide, coastal |

### Path (8)

| ID | Name | Description | Tags |
|---|---|---|---|
| `dirt-trail` | Dirt Trail | Worn dirt path through open terrain | dirt, trail, worn, natural |
| `cobblestone-road` | Cobblestone Road | Old cobblestone road with uneven stones | cobblestone, road, old, stone |
| `gravel-path` | Gravel Path | Crunchy gravel garden path | gravel, path, garden, neat |
| `forest-path` | Forest Path | Shaded path through dense woodland | forest, path, shaded, mossy |
| `mountain-switchback` | Mountain Switchback | Steep zigzag trail up a mountain | mountain, switchback, steep, exposed |
| `garden-walk` | Garden Walk | Manicured garden walkway | garden, walk, manicured, formal |
| `sand-track` | Sand Track | Sandy track through dunes or beach | sand, track, beach, desert |
| `country-lane` | Country Lane | Quiet lane through rolling countryside | country, lane, quiet, pastoral |

### Shore (6)

| ID | Name | Description | Tags |
|---|---|---|---|
| `sandy-beach` | Sandy Beach | Wide sandy beach with gentle slope | sandy, beach, wide, warm |
| `rocky-shore` | Rocky Shore | Rugged shoreline with boulders | rocky, shore, rugged, dramatic |
| `muddy-riverbank` | Muddy Riverbank | Soft muddy bank along a river | muddy, riverbank, soft, marshy |
| `grassy-bank` | Grassy Bank | Green grass growing down to water's edge | grassy, bank, green, gentle |
| `tidal-flat` | Tidal Flat | Exposed tidal flat at low tide | tidal, flat, exposed, coastal |
| `cliff-base` | Cliff Base | Base of a cliff where rock meets water | cliff, base, rock, dramatic |

### Field (8)

| ID | Name | Description | Tags |
|---|---|---|---|
| `meadow-grass` | Meadow Grass | Lush green meadow with mixed grasses | meadow, grass, green, lush |
| `wheat-field` | Wheat Field | Golden wheat field ready for harvest | wheat, golden, harvest, warm |
| `wildflower-meadow` | Wildflower Meadow | Colorful wildflower-dotted grassland | wildflower, meadow, colorful, spring |
| `lavender-rows` | Lavender Rows | Orderly rows of lavender in bloom | lavender, rows, purple, fragrant |
| `dry-savanna` | Dry Savanna | Dry golden savanna grassland | savanna, dry, golden, hot |
| `rice-paddy` | Rice Paddy | Flooded rice paddy with green shoots | rice, paddy, green, water |
| `autumn-stubble` | Autumn Stubble | Harvested field with stubble remaining | autumn, stubble, brown, harvested |
| `snow-covered` | Snow Covered | Field covered in a blanket of snow | snow, covered, white, winter |

### Rock (6)

| ID | Name | Description | Tags |
|---|---|---|---|
| `granite-boulder` | Granite Boulder | Large granite boulder with rough texture | granite, boulder, grey, rough |
| `sandstone-outcrop` | Sandstone Outcrop | Layered sandstone outcrop with warm tones | sandstone, outcrop, warm, layered |
| `shan-shui-rock` | Shan Shui Rock | Stylized Chinese landscape rock | shan-shui, rock, stylized, eastern |
| `mossy-rock` | Mossy Rock | Weathered rock covered in green moss | mossy, rock, green, old |
| `slate-shelf` | Slate Shelf | Flat shelf of layered slate | slate, shelf, flat, dark |
| `volcanic-basalt` | Volcanic Basalt | Dark volcanic basalt columns | volcanic, basalt, dark, columnar |

### Treeline (6)

| ID | Name | Description | Tags |
|---|---|---|---|
| `deciduous-canopy` | Deciduous Canopy | Lush deciduous tree canopy in summer | deciduous, canopy, green, summer |
| `conifer-ridge` | Conifer Ridge | Dense conifer ridge silhouette | conifer, ridge, dark, evergreen |
| `autumn-treeline` | Autumn Treeline | Treeline in full autumn color | autumn, treeline, colorful, warm |
| `misty-forest` | Misty Forest | Forest edge shrouded in mist | misty, forest, atmospheric, soft |
| `palm-fringe` | Palm Fringe | Tropical palm tree silhouettes | palm, tropical, silhouette, coastal |
| `winter-bare` | Winter Bare | Bare winter trees with no leaves | winter, bare, stark, cold |

### Celestial (6)

| ID | Name | Description | Tags |
|---|---|---|---|
| `noon-sun` | Noon Sun | Bright overhead sun | sun, noon, bright, warm |
| `golden-hour-sun` | Golden Hour Sun | Low sun with golden glow | sun, golden, warm, atmospheric |
| `harvest-moon` | Harvest Moon | Large amber harvest moon | moon, harvest, amber, warm |
| `crescent-moon` | Crescent Moon | Thin crescent moon | moon, crescent, cool, night |
| `blood-moon` | Blood Moon | Deep red lunar eclipse moon | moon, blood, red, dramatic |
| `polar-star` | Polar Star | Bright northern star with glow | star, polar, bright, night |

### Fog (5)

| ID | Name | Description | Tags |
|---|---|---|---|
| `morning-mist` | Morning Mist | Light morning mist in low areas | morning, mist, light, soft |
| `mountain-veil` | Mountain Veil | Fog wrapping around mountain bases | mountain, veil, thick, atmospheric |
| `valley-fog` | Valley Fog | Dense fog filling a valley | valley, fog, dense, cold |
| `shan-shui-cloud-band` | Shan Shui Cloud Band | Stylized cloud band for ink-wash landscapes | shan-shui, cloud, band, eastern |
| `coastal-haar` | Coastal Haar | Sea fog rolling in from the coast | coastal, haar, rolling, cool |

### Starfield (5)

| ID | Name | Description | Tags |
|---|---|---|---|
| `clear-night` | Clear Night | Clear night sky with scattered stars | clear, night, scattered, standard |
| `dense-starfield` | Dense Starfield | Densely packed star field | dense, starfield, packed, bright |
| `milky-way` | Milky Way | Milky Way band across the sky | milky-way, band, galactic, dramatic |
| `sparse-stars` | Sparse Stars | Few scattered stars in early twilight | sparse, stars, twilight, subtle |
| `twilight-stars` | Twilight Stars | Stars emerging at dusk | twilight, stars, emerging, dusk |

### Cliff Face (5)

| ID | Name | Description | Tags |
|---|---|---|---|
| `granite-cliff` | Granite Cliff | Sheer granite cliff face | granite, cliff, sheer, grey |
| `sandstone-wall` | Sandstone Wall | Warm sandstone cliff wall | sandstone, wall, warm, layered |
| `basalt-columns` | Basalt Columns | Columnar basalt cliff formation | basalt, columns, dark, geometric |
| `limestone-face` | Limestone Face | Pale limestone cliff with erosion | limestone, face, pale, eroded |
| `shale-cliff` | Shale Cliff | Dark layered shale cliff | shale, cliff, dark, layered |

### Snowfield (4)

| ID | Name | Description | Tags |
|---|---|---|---|
| `fresh-powder` | Fresh Powder | Freshly fallen undisturbed snow | fresh, powder, white, pristine |
| `wind-swept` | Wind Swept | Wind-sculpted snow with ridges | wind, swept, ridges, textured |
| `sun-crust` | Sun Crust | Sun-crusted snow with icy surface | sun, crust, icy, sparkling |
| `deep-snow` | Deep Snow | Deep snow with soft contours | deep, snow, soft, heavy |

### Building (6)

| ID | Name | Description | Tags |
|---|---|---|---|
| `farmhouse` | Farmhouse | Rustic farmhouse silhouette | farmhouse, rustic, rural, warm |
| `church-steeple` | Church Steeple | Church with pointed steeple | church, steeple, tall, village |
| `tower-ruin` | Tower Ruin | Ruined tower silhouette | tower, ruin, old, dramatic |
| `village-cluster` | Village Cluster | Cluster of small buildings | village, cluster, small, grouped |
| `temple` | Temple | Temple or shrine structure | temple, shrine, eastern, ornate |
| `lighthouse` | Lighthouse | Tall lighthouse silhouette | lighthouse, tall, coastal, beacon |

### Bridge (4)

| ID | Name | Description | Tags |
|---|---|---|---|
| `stone-arch` | Stone Arch | Classic stone arch bridge | stone, arch, classic, old |
| `wooden-footbridge` | Wooden Footbridge | Simple wooden foot bridge | wooden, footbridge, simple, rustic |
| `suspension-bridge` | Suspension Bridge | Suspension bridge with cables | suspension, bridge, cables, modern |
| `flat-crossing` | Flat Crossing | Low flat bridge or ford | flat, crossing, low, simple |

### Reflection (4)

| ID | Name | Description | Tags |
|---|---|---|---|
| `calm-lake` | Calm Lake | Mirror-still lake reflection | calm, lake, mirror, peaceful |
| `rippled-reflection` | Rippled Reflection | Gently rippled water reflection | rippled, reflection, gentle, moving |
| `dark-water` | Dark Water | Dark, deep water reflection | dark, water, deep, moody |
| `golden-reflection` | Golden Reflection | Warm golden light reflected in water | golden, reflection, warm, sunset |

### Vignette Foliage (5)

| ID | Name | Description | Tags |
|---|---|---|---|
| `overhanging-branches` | Overhanging Branches | Tree branches framing from above | branches, overhanging, framing, canopy |
| `grass-border` | Grass Border | Tall grass along the bottom edge | grass, border, bottom, foreground |
| `leaf-frame` | Leaf Frame | Decorative leaf border around edges | leaf, frame, border, decorative |
| `pine-canopy` | Pine Canopy | Pine branches framing from above | pine, canopy, dark, evergreen |
| `vine-border` | Vine Border | Climbing vines along the edges | vine, border, climbing, organic |

### Forest Floor (5)

| ID | Name | Description | Tags |
|---|---|---|---|
| `fern-carpet` | Fern Carpet | Dense fern undergrowth | fern, carpet, green, dense |
| `mossy-ground` | Mossy Ground | Moss-covered forest floor | mossy, ground, green, soft |
| `fallen-leaves` | Fallen Leaves | Carpet of fallen autumn leaves | fallen, leaves, autumn, colorful |
| `pine-needles` | Pine Needles | Pine needle floor covering | pine, needles, brown, soft |
| `mushroom-patch` | Mushroom Patch | Forest floor with scattered mushrooms | mushroom, patch, forest, whimsical |

### Haze (4)

| ID | Name | Description | Tags |
|---|---|---|---|
| `light-haze` | Light Haze | Subtle atmospheric haze | light, haze, subtle, atmospheric |
| `golden-haze` | Golden Haze | Warm golden atmospheric haze | golden, haze, warm, sunset |
| `cool-mist` | Cool Mist | Cool blue-grey mist | cool, mist, blue, morning |
| `heat-haze` | Heat Haze | Shimmering heat distortion | heat, haze, shimmer, hot |

### Fence (4)

| ID | Name | Description | Tags |
|---|---|---|---|
| `white-picket` | White Picket | Classic white picket fence | white, picket, classic, garden |
| `stone-wall` | Stone Wall | Low dry-stone wall | stone, wall, rustic, rural |
| `ranch-rail` | Ranch Rail | Horizontal ranch rail fence | ranch, rail, wooden, pastoral |
| `wire-fence` | Wire Fence | Simple wire fence with posts | wire, fence, simple, rural |

### Boat (4)

| ID | Name | Description | Tags |
|---|---|---|---|
| `sailboat` | Sailboat | Single-mast sailboat | sailboat, sail, coastal, classic |
| `rowboat` | Rowboat | Small rowboat | rowboat, small, lake, simple |
| `fishing-boat` | Fishing Boat | Working fishing boat | fishing, boat, working, coastal |
| `cargo-ship` | Cargo Ship | Large cargo vessel silhouette | cargo, ship, large, industrial |

### Erosion (4)

| ID | Name | Description | Tags |
|---|---|---|---|
| `rain-streaks` | Rain Streaks | Vertical rain erosion streaks | rain, streaks, vertical, wet |
| `wind-erosion` | Wind Erosion | Horizontal wind erosion marks | wind, erosion, horizontal, dry |
| `frost-cracks` | Frost Cracks | Frost-heave crack patterns | frost, cracks, cold, fractured |
| `lichen-growth` | Lichen Growth | Patches of lichen on rock surfaces | lichen, growth, organic, old |

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

The `examples/` directory contains `.genart` sketch files organized by category, with `.png` thumbnails and `.genart-workspace` files:

```
examples/
├── sky/              5 sky gradient presets + workspace
├── profile/          6 terrain ridgeline presets + workspace
├── clouds/           5 cloud formation presets + workspace
├── water/            5 water surface presets + workspace
├── landscape/        6 composite scenes + workspace
└── terrain-gallery.genart-workspace   (all sketches)
```

**Regenerating examples:**

```bash
node generate-genart-files.cjs        # Create .genart files from presets
node generate-workspace-files.cjs     # Create .genart-workspace files
node render-examples.cjs              # Render .png thumbnails (requires genart CLI)
bash generate-galleries.sh            # Create category gallery montages
```

## MCP Tools (41)

Exposed to AI agents through the MCP server when this plugin is registered.

### Add Layer Tools (24)

| Tool | Description |
|---|---|
| `add_sky` | Add a sky gradient layer with time-of-day preset or custom colors |
| `add_terrain_profile` | Add terrain ridgeline silhouettes from profile presets |
| `add_clouds` | Add noise-driven cloud formations (cumulus, stratus, cirrus) |
| `add_water_surface` | Add water surface with waves and shimmer highlights |
| `add_river` | Add a perspective river with flow path and banks |
| `add_path` | Add a trail or road with surface texture |
| `add_shore` | Add a shoreline transition layer |
| `add_field` | Add a vegetation field with depth-aware marks |
| `add_rock` | Add natural rock forms |
| `add_treeline` | Add a tree canopy silhouette band |
| `add_celestial` | Add celestial bodies (sun, moon, stars) with glow |
| `add_fog_layer` | Add an occluding fog band |
| `add_starfield` | Add a star field with optional Milky Way |
| `add_cliff_face` | Add a vertical cliff or rock wall silhouette |
| `add_snowfield` | Add snow-covered ground with drifts |
| `add_building` | Add an architectural silhouette |
| `add_bridge` | Add a bridge structure |
| `add_reflection` | Add water surface reflections |
| `add_vignette_foliage` | Add framing foliage along canvas edges |
| `add_forest_floor` | Add ground cover undergrowth |
| `add_haze` | Add subtle atmospheric haze |
| `add_fence` | Add a fence or wall silhouette |
| `add_boat` | Add a boat silhouette on water |
| `add_erosion` | Add weathering/erosion texture |

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
| `create_forest_clearing` | Sky + treeline + vignette + forest floor + fog + path |
| `create_alpine_lake` | Sky + alpine range + snowfield + water + reflection + cliff + haze |
| `create_japanese_garden` | Sky + water + bridge + rock + treeline + reflection + haze |
| `create_desert_expanse` | Sky + mesa + cliff + field + haze + erosion |
| `create_winter_woodland` | Sky + terrain + snow + treeline + vignette + fog |
| `create_tropical_coast` | Golden-hour coast: sky + water + shore + boat + reflection + vignette + haze |

### Utility Tools (4)

| Tool | Description |
|---|---|
| `set_time_of_day` | Update a sky layer to a different time-of-day preset |
| `list_terrain_presets` | List all 128 presets, optionally filtered by category |
| `set_terrain_depth` | Adjust depth properties on a terrain profile layer |
| `set_depth_lane` | Update depth lane assignment on any layer |

## Rendering

Each layer type renders via canvas2d:

- **Sky** — Three-stop vertical gradient (zenith → haze → horizon) with configurable haze band
- **Profile** — Back-to-front ridgeline silhouettes with fractal noise elevation and depth-aware color interpolation
- **Clouds** — Fractal noise sampled per-pixel into an ImageData buffer with cloud/shadow color blending
- **Water** — Vertical gradient fill with sine or noise-driven wave lines and shimmer highlight streaks
- **River/Path/Shore** — Perspective bezier curves with depth-aware width scaling and surface textures
- **Field** — Depth-aware mark generation (grass blades, wheat stalks, flowers) with perspective scaling
- **Rock** — Procedural rock silhouettes with fractal detail and depth-placed shading
- **Treeline** — Canopy silhouette generation with per-tree variation and atmospheric coloring
- **Celestial** — Radial gradient glow with optional lens flare and corona effects
- **Fog** — Horizontal noise-driven opacity band with soft edges
- **Starfield** — Pseudo-random star placement with brightness variation and optional galaxy band
- **Building/Bridge/Fence/Boat** — Silhouette rendering with depth-aware scaling and atmospheric tinting
- **Reflection** — Mirrored color sampling from sky/terrain tones with ripple distortion
- **Erosion** — Directional mark overlays (rain streaks, wind scour, frost cracks, lichen patches)
- **Haze/Vignette/Snowfield/Forest Floor/Cliff Face** — Full-canvas or region-based procedural textures

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

// All 128 presets
console.log(ALL_PRESETS.length); // 128

// Filter by category
const skyPresets = filterPresets({ category: "sky" });     // 5 presets
const profiles = filterPresets({ category: "profile" });   // 6 presets
const rivers = filterPresets({ category: "river" });       // 8 presets

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

## Support

Questions, bugs, or feedback — [support@genart.dev](mailto:support@genart.dev) or [open an issue](https://github.com/genart-dev/plugin-terrain/issues).

## License

MIT
