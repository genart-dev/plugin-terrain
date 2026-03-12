#!/usr/bin/env node
/**
 * Generates .genart sketch files for all terrain presets + landscape composites.
 * Usage: node generate-genart-files.cjs
 *
 * Output: examples/<category>/<preset-id>.genart
 *         examples/landscape/<scene-id>.genart
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "examples");

// ── Preset data (mirrors src/presets/*.ts) ──────────────────────────────────

const SKY_PRESETS = [
  { id: "dawn", name: "Dawn", zenithColor: "#4A6FA5", horizonColor: "#F4A460", hazeColor: "#FFB6C1", hazeIntensity: 0.4, hazePosition: 0.85, hazeWidth: 0.15 },
  { id: "noon", name: "Noon", zenithColor: "#1E3A6E", horizonColor: "#87CEEB", hazeColor: "#B0D4E8", hazeIntensity: 0.15, hazePosition: 0.9, hazeWidth: 0.1 },
  { id: "golden-hour", name: "Golden Hour", zenithColor: "#2C5F8A", horizonColor: "#E8A317", hazeColor: "#F0C75E", hazeIntensity: 0.5, hazePosition: 0.8, hazeWidth: 0.2 },
  { id: "dusk", name: "Dusk", zenithColor: "#1A0A2E", horizonColor: "#D4622A", hazeColor: "#8B4D6E", hazeIntensity: 0.35, hazePosition: 0.75, hazeWidth: 0.2 },
  { id: "night", name: "Night", zenithColor: "#050510", horizonColor: "#0E1A2B", hazeColor: "#1A2540", hazeIntensity: 0.1, hazePosition: 0.9, hazeWidth: 0.1 },
];

const PROFILE_PRESETS = [
  { id: "alpine-range", name: "Alpine Range", ridgeCount: 5, roughness: 0.8, elevationMin: 0.2, elevationMax: 0.6, noiseScale: 3.0, jaggedness: 0.7, foregroundColor: "#2D3B2D", backgroundRidgeColor: "#8BA4B8", depthValueShift: 0.6, depthEasing: "quadratic" },
  { id: "rolling-hills", name: "Rolling Hills", ridgeCount: 3, roughness: 0.2, elevationMin: 0.5, elevationMax: 0.75, noiseScale: 1.5, jaggedness: 0.1, foregroundColor: "#3B5E3B", backgroundRidgeColor: "#7A9E8A", depthValueShift: 0.4, depthEasing: "linear" },
  { id: "mesa-plateau", name: "Mesa Plateau", ridgeCount: 2, roughness: 0.4, elevationMin: 0.35, elevationMax: 0.55, noiseScale: 2.0, jaggedness: 0.9, foregroundColor: "#8B5E3C", backgroundRidgeColor: "#C4A882", depthValueShift: 0.3, depthEasing: "linear" },
  { id: "coastal-cliffs", name: "Coastal Cliffs", ridgeCount: 2, roughness: 0.6, elevationMin: 0.4, elevationMax: 0.65, noiseScale: 2.5, jaggedness: 0.5, foregroundColor: "#4A4A3A", backgroundRidgeColor: "#8A9AA0", depthValueShift: 0.35, depthEasing: "quadratic" },
  { id: "sand-dunes", name: "Sand Dunes", ridgeCount: 4, roughness: 0.15, elevationMin: 0.55, elevationMax: 0.8, noiseScale: 1.2, jaggedness: 0.05, foregroundColor: "#C4A55A", backgroundRidgeColor: "#E8D5A0", depthValueShift: 0.25, depthEasing: "linear" },
  { id: "foothills", name: "Foothills", ridgeCount: 4, roughness: 0.35, elevationMin: 0.5, elevationMax: 0.7, noiseScale: 2.0, jaggedness: 0.25, foregroundColor: "#3A5030", backgroundRidgeColor: "#7090A0", depthValueShift: 0.45, depthEasing: "quadratic" },
];

const CLOUD_PRESETS = [
  { id: "fair-weather", name: "Fair Weather", coverage: 0.3, altitudeMin: 0.1, altitudeMax: 0.4, cloudType: "cumulus", scale: 4.0, windDirection: 0, cloudColor: "#FFFFFF", shadowColor: "#A0A8B0", softness: 0.5 },
  { id: "overcast", name: "Overcast", coverage: 0.75, altitudeMin: 0.15, altitudeMax: 0.55, cloudType: "stratus", scale: 3.0, windDirection: 0, cloudColor: "#D0D0D0", shadowColor: "#808890", softness: 0.7 },
  { id: "wispy-high", name: "Wispy High", coverage: 0.2, altitudeMin: 0.05, altitudeMax: 0.25, cloudType: "cirrus", scale: 6.0, windDirection: 15, cloudColor: "#F0F0FF", shadowColor: "#C0C8D0", softness: 0.8 },
  { id: "storm-clouds", name: "Storm Clouds", coverage: 0.6, altitudeMin: 0.1, altitudeMax: 0.5, cloudType: "cumulus", scale: 3.5, windDirection: -10, cloudColor: "#B0B0B0", shadowColor: "#505860", softness: 0.3 },
  { id: "scattered", name: "Scattered", coverage: 0.4, altitudeMin: 0.1, altitudeMax: 0.45, cloudType: "cumulus", scale: 5.0, windDirection: 5, cloudColor: "#F8F8FF", shadowColor: "#9098A0", softness: 0.6 },
];

const WATER_PRESETS = [
  { id: "still-lake", name: "Still Lake", waterlinePosition: 0.6, rippleFrequency: 8, rippleAmplitude: 0.5, rippleMode: "sine", waterColor: "#2A4A6B", depthDarkening: 0.4, shimmerIntensity: 0.15 },
  { id: "choppy-sea", name: "Choppy Sea", waterlinePosition: 0.55, rippleFrequency: 25, rippleAmplitude: 3.0, rippleMode: "noise", waterColor: "#1A3A5C", depthDarkening: 0.6, shimmerIntensity: 0.3 },
  { id: "mountain-stream", name: "Mountain Stream", waterlinePosition: 0.75, rippleFrequency: 15, rippleAmplitude: 1.5, rippleMode: "noise", waterColor: "#3A6A7A", depthDarkening: 0.25, shimmerIntensity: 0.4 },
  { id: "river", name: "River", waterlinePosition: 0.65, rippleFrequency: 12, rippleAmplitude: 1.0, rippleMode: "sine", waterColor: "#2E5060", depthDarkening: 0.45, shimmerIntensity: 0.2 },
  { id: "pond", name: "Pond", waterlinePosition: 0.7, rippleFrequency: 6, rippleAmplitude: 0.3, rippleMode: "sine", waterColor: "#2A4050", depthDarkening: 0.5, shimmerIntensity: 0.1 },
];

// ── Landscape composites ────────────────────────────────────────────────────

const LANDSCAPE_SCENES = [
  {
    id: "mountain-dawn",
    name: "Mountain Dawn",
    sky: "dawn",
    profile: "alpine-range",
    clouds: "wispy-high",
    water: null,
    profileSeed: 1234,
    cloudSeed: 5678,
  },
  {
    id: "rolling-pastoral",
    name: "Rolling Pastoral",
    sky: "noon",
    profile: "rolling-hills",
    clouds: "fair-weather",
    water: null,
    profileSeed: 2345,
    cloudSeed: 6789,
  },
  {
    id: "desert-sunset",
    name: "Desert Sunset",
    sky: "golden-hour",
    profile: "mesa-plateau",
    clouds: null,
    water: null,
    profileSeed: 3456,
    cloudSeed: null,
    // Also add sand dunes as a second profile layer
    extraProfile: "sand-dunes",
    extraProfileSeed: 7890,
  },
  {
    id: "coastal-storm",
    name: "Coastal Storm",
    sky: "dusk",
    profile: "coastal-cliffs",
    clouds: "storm-clouds",
    water: "choppy-sea",
    profileSeed: 4567,
    cloudSeed: 8901,
    waterSeed: 1357,
  },
  {
    id: "lake-at-night",
    name: "Lake at Night",
    sky: "night",
    profile: "foothills",
    clouds: null,
    water: "still-lake",
    profileSeed: 5678,
    cloudSeed: null,
    waterSeed: 2468,
  },
  {
    id: "mountain-stream-scene",
    name: "Mountain Stream",
    sky: "noon",
    profile: "alpine-range",
    clouds: "scattered",
    water: "mountain-stream",
    profileSeed: 6789,
    cloudSeed: 9012,
    waterSeed: 3579,
  },
];

// ── Constants ───────────────────────────────────────────────────────────────

const W = 600;
const H = 600;
const NOW = "2026-03-11T00:00:00.000Z";

// ── Helpers ─────────────────────────────────────────────────────────────────

function fullTransform() {
  return { x: 0, y: 0, width: W, height: H, rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0, anchorY: 0 };
}

function baseLayer(id, type, name, properties) {
  return {
    id,
    type,
    name,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    transform: fullTransform(),
    properties,
  };
}

function skyLayer(preset, layerId = "sky-layer") {
  const p = SKY_PRESETS.find((s) => s.id === preset);
  return baseLayer(layerId, "terrain:sky", `Sky — ${p.name}`, {
    preset,
    zenithColor: p.zenithColor,
    horizonColor: p.horizonColor,
    hazeColor: p.hazeColor,
    hazeIntensity: p.hazeIntensity,
    hazePosition: p.hazePosition,
    hazeWidth: p.hazeWidth,
    horizonLine: 1.0,
  });
}

function profileLayer(preset, seed = 42, layerId = "profile-layer") {
  const p = PROFILE_PRESETS.find((s) => s.id === preset);
  return baseLayer(layerId, "terrain:profile", `Profile — ${p.name}`, {
    preset,
    seed,
    ridgeCount: p.ridgeCount,
    roughness: p.roughness,
    elevationMin: p.elevationMin,
    elevationMax: p.elevationMax,
    noiseScale: p.noiseScale,
    jaggedness: p.jaggedness,
    foregroundColor: p.foregroundColor,
    backgroundRidgeColor: p.backgroundRidgeColor,
    depthValueShift: p.depthValueShift,
    depthEasing: p.depthEasing,
  });
}

function cloudLayer(preset, seed = 42, layerId = "clouds-layer") {
  const c = CLOUD_PRESETS.find((s) => s.id === preset);
  return baseLayer(layerId, "terrain:clouds", `Clouds — ${c.name}`, {
    preset,
    seed,
    coverage: c.coverage,
    altitudeMin: c.altitudeMin,
    altitudeMax: c.altitudeMax,
    cloudType: c.cloudType,
    scale: c.scale,
    windDirection: c.windDirection,
    cloudColor: c.cloudColor,
    shadowColor: c.shadowColor,
    softness: c.softness,
  });
}

function waterLayer(preset, seed = 42, layerId = "water-layer") {
  const w = WATER_PRESETS.find((s) => s.id === preset);
  return baseLayer(layerId, "terrain:water", `Water — ${w.name}`, {
    preset,
    seed,
    waterlinePosition: w.waterlinePosition,
    rippleFrequency: w.rippleFrequency,
    rippleAmplitude: w.rippleAmplitude,
    rippleMode: w.rippleMode,
    waterColor: w.waterColor,
    depthDarkening: w.depthDarkening,
    shimmerIntensity: w.shimmerIntensity,
  });
}

/** Background sky colors keyed by sky preset for non-sky single-layer examples. */
const SKY_BG_FOR_CATEGORY = {
  profile: "noon",
  clouds: "noon",
  water: "noon",
};

function buildSketch(id, title, layers) {
  return {
    genart: "1.3",
    id,
    title,
    created: NOW,
    modified: NOW,
    renderer: { type: "canvas2d" },
    canvas: { width: W, height: H },
    parameters: [],
    colors: [],
    state: { seed: 42, params: {}, colorPalette: [] },
    algorithm: "function sketch(ctx, state) {}",
    layers,
  };
}

function writeGenart(dir, filename, sketch) {
  const outDir = path.join(root, dir);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, filename);
  fs.writeFileSync(outFile, JSON.stringify(sketch, null, 2) + "\n");
  return path.relative(root, outFile);
}

// ── Generate single-layer preset examples ───────────────────────────────────

let count = 0;

// Sky presets — sky layer only (fills full canvas)
for (const preset of SKY_PRESETS) {
  const layers = [skyLayer(preset.id)];
  const sketch = buildSketch(`terrain-${preset.id}`, `${preset.name} Sky`, layers);
  const rel = writeGenart("sky", `${preset.id}.genart`, sketch);
  console.log(`  ${rel}`);
  count++;
}

// Profile presets — sky background + profile layer
for (const preset of PROFILE_PRESETS) {
  const layers = [
    skyLayer(SKY_BG_FOR_CATEGORY.profile),
    profileLayer(preset.id),
  ];
  const sketch = buildSketch(`terrain-${preset.id}`, `${preset.name} Terrain`, layers);
  const rel = writeGenart("profile", `${preset.id}.genart`, sketch);
  console.log(`  ${rel}`);
  count++;
}

// Cloud presets — sky background + cloud layer
for (const preset of CLOUD_PRESETS) {
  const layers = [
    skyLayer(SKY_BG_FOR_CATEGORY.clouds),
    cloudLayer(preset.id),
  ];
  const sketch = buildSketch(`terrain-${preset.id}`, `${preset.name} Clouds`, layers);
  const rel = writeGenart("clouds", `${preset.id}.genart`, sketch);
  console.log(`  ${rel}`);
  count++;
}

// Water presets — sky background + water layer
for (const preset of WATER_PRESETS) {
  const layers = [
    skyLayer(SKY_BG_FOR_CATEGORY.water),
    waterLayer(preset.id),
  ];
  const sketch = buildSketch(`terrain-${preset.id}`, `${preset.name} Water`, layers);
  const rel = writeGenart("water", `${preset.id}.genart`, sketch);
  console.log(`  ${rel}`);
  count++;
}

// ── Generate landscape composites ───────────────────────────────────────────

for (const scene of LANDSCAPE_SCENES) {
  const layers = [];

  // Sky is always first
  layers.push(skyLayer(scene.sky));

  // Optional extra back-layer profile (desert sunset has sand dunes behind mesa)
  if (scene.extraProfile) {
    layers.push(profileLayer(scene.extraProfile, scene.extraProfileSeed, "profile-back-layer"));
  }

  // Clouds rendered before profile so terrain overlaps cloud base
  if (scene.clouds) {
    layers.push(cloudLayer(scene.clouds, scene.cloudSeed));
  }

  // Main profile
  layers.push(profileLayer(scene.profile, scene.profileSeed));

  // Water on top (drawn over lower terrain)
  if (scene.water) {
    layers.push(waterLayer(scene.water, scene.waterSeed));
  }

  const sketch = buildSketch(`terrain-${scene.id}`, scene.name, layers);
  const rel = writeGenart("landscape", `${scene.id}.genart`, sketch);
  console.log(`  ${rel}`);
  count++;
}

console.log(`\nDone: ${count} .genart files generated in examples/`);
