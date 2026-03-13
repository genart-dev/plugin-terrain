#!/usr/bin/env node
/**
 * Generates .genart sketch files for all terrain presets + landscape composites.
 * Usage: node generate-genart-files.cjs
 *
 * Output: examples/<category>/<preset-id>.genart
 *         examples/landscape/<scene-id>.genart
 *         examples/scenes/<scene-id>.genart
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

// ── v2 presets ──────────────────────────────────────────────────────────────

const RIVER_PRESETS = [
  { id: "gentle-stream", name: "Gentle Stream", pathPreset: "meandering", widthNear: 80, widthFar: 15, waterColor: "#4A7A8A", bankColor: "#5C6B3A", rippleScale: 0.3, rippleIntensity: 0.2, reflectionIntensity: 0.3, flowDirection: 1, bankStyle: "soft-grass" },
  { id: "wide-river", name: "Wide River", pathPreset: "meandering", widthNear: 200, widthFar: 40, waterColor: "#2A5060", bankColor: "#6B5A3A", rippleScale: 0.6, rippleIntensity: 0.5, reflectionIntensity: 0.4, flowDirection: 1, bankStyle: "muddy" },
  { id: "mountain-creek", name: "Mountain Creek", pathPreset: "switchback", widthNear: 60, widthFar: 10, waterColor: "#5A8A9A", bankColor: "#7A7A6A", rippleScale: 0.8, rippleIntensity: 0.7, reflectionIntensity: 0.15, flowDirection: 1, bankStyle: "rocky" },
  { id: "lazy-oxbow", name: "Lazy Oxbow", pathPreset: "s-curve", widthNear: 140, widthFar: 30, waterColor: "#3A6070", bankColor: "#5A5030", rippleScale: 0.15, rippleIntensity: 0.1, reflectionIntensity: 0.6, flowDirection: 1, bankStyle: "muddy" },
  { id: "forest-brook", name: "Forest Brook", pathPreset: "winding", widthNear: 50, widthFar: 8, waterColor: "#3A5A50", bankColor: "#4A5A30", rippleScale: 0.4, rippleIntensity: 0.3, reflectionIntensity: 0.2, flowDirection: 1, bankStyle: "soft-grass" },
  { id: "delta-channels", name: "Delta Channels", pathPreset: "fork", widthNear: 120, widthFar: 25, waterColor: "#4A6A70", bankColor: "#6A6A50", rippleScale: 0.2, rippleIntensity: 0.15, reflectionIntensity: 0.35, flowDirection: 1, bankStyle: "sandy" },
  { id: "waterfall-stream", name: "Waterfall Stream", pathPreset: "straight", widthNear: 70, widthFar: 12, waterColor: "#5A9AAA", bankColor: "#6A6A5A", rippleScale: 1.0, rippleIntensity: 0.9, reflectionIntensity: 0.05, flowDirection: 1, bankStyle: "rocky" },
  { id: "tidal-estuary", name: "Tidal Estuary", pathPreset: "straight", widthNear: 250, widthFar: 60, waterColor: "#3A5A6A", bankColor: "#7A7060", rippleScale: 0.5, rippleIntensity: 0.4, reflectionIntensity: 0.45, flowDirection: 1, bankStyle: "sandy" },
];

const PATH_PRESETS = [
  { id: "dirt-trail", name: "Dirt Trail", pathPreset: "winding", widthNear: 60, widthFar: 10, surfaceColor: "#8B7355", surfaceStyle: "dirt", edgeTreatment: "grass-encroach", wear: 0.5 },
  { id: "cobblestone-road", name: "Cobblestone Road", pathPreset: "straight", widthNear: 100, widthFar: 18, surfaceColor: "#7A7068", surfaceStyle: "cobblestone", edgeTreatment: "sharp", wear: 0.3 },
  { id: "gravel-path", name: "Gravel Path", pathPreset: "meandering", widthNear: 70, widthFar: 12, surfaceColor: "#9A9080", surfaceStyle: "gravel", edgeTreatment: "scattered-stones", wear: 0.4 },
  { id: "forest-path", name: "Forest Path", pathPreset: "winding", widthNear: 50, widthFar: 8, surfaceColor: "#6A5A40", surfaceStyle: "dirt", edgeTreatment: "overgrown", wear: 0.7 },
  { id: "mountain-switchback", name: "Mountain Switchback", pathPreset: "switchback", widthNear: 45, widthFar: 8, surfaceColor: "#7A6A55", surfaceStyle: "gravel", edgeTreatment: "scattered-stones", wear: 0.6 },
  { id: "garden-walk", name: "Garden Walk", pathPreset: "meandering", widthNear: 80, widthFar: 14, surfaceColor: "#8A8070", surfaceStyle: "flagstone", edgeTreatment: "sharp", wear: 0.15 },
  { id: "sand-track", name: "Sand Track", pathPreset: "meandering", widthNear: 65, widthFar: 12, surfaceColor: "#C4A870", surfaceStyle: "sand", edgeTreatment: "grass-encroach", wear: 0.3 },
  { id: "country-lane", name: "Country Lane", pathPreset: "straight", widthNear: 90, widthFar: 16, surfaceColor: "#7A7050", surfaceStyle: "worn-grass", edgeTreatment: "grass-encroach", wear: 0.6 },
];

const SHORE_PRESETS = [
  { id: "sandy-beach", name: "Sandy Beach", shoreType: "sandy-beach", width: 0.08, color: "#D4C4A0", wetColor: "#B0A080", foamLine: true, foamIntensity: 0.5, debrisType: "shells" },
  { id: "rocky-shore", name: "Rocky Shore", shoreType: "rocky-shore", width: 0.06, color: "#6A6A5A", wetColor: "#4A4A3A", foamLine: true, foamIntensity: 0.8, debrisType: "seaweed" },
  { id: "muddy-riverbank", name: "Muddy Riverbank", shoreType: "muddy-bank", width: 0.05, color: "#6A5A3A", wetColor: "#4A3A20", foamLine: false, foamIntensity: 0, debrisType: "none" },
  { id: "grassy-bank", name: "Grassy Bank", shoreType: "grassy-bank", width: 0.07, color: "#5A7A3A", wetColor: "#4A6030", foamLine: false, foamIntensity: 0, debrisType: "none" },
  { id: "tidal-flat", name: "Tidal Flat", shoreType: "tidal-flat", width: 0.1, color: "#B0A080", wetColor: "#8A8068", foamLine: true, foamIntensity: 0.3, debrisType: "seaweed" },
  { id: "cliff-base", name: "Cliff Base", shoreType: "cliff-base", width: 0.03, color: "#5A5A4A", wetColor: "#3A3A2A", foamLine: true, foamIntensity: 0.9, debrisType: "pebbles" },
];

const FIELD_PRESETS = [
  { id: "meadow-grass", name: "Meadow Grass", vegetationType: "grass", color: "#5A8A3A", secondaryColor: "#7AAA5A", density: 0.6, markLength: 8, windDirection: 45, windStrength: 0.3, seasonalTint: "summer" },
  { id: "wheat-field", name: "Wheat Field", vegetationType: "wheat", color: "#C4A035", secondaryColor: "#D4B855", density: 0.8, markLength: 12, windDirection: 90, windStrength: 0.5, seasonalTint: "autumn" },
  { id: "wildflower-meadow", name: "Wildflower Meadow", vegetationType: "wildflowers", color: "#4A7A3A", secondaryColor: "#D45A8A", density: 0.5, markLength: 6, windDirection: 30, windStrength: 0.2, seasonalTint: "spring" },
  { id: "lavender-rows", name: "Lavender Rows", vegetationType: "wildflowers", color: "#7A5AA0", secondaryColor: "#9A7AC0", density: 0.7, markLength: 10, windDirection: 0, windStrength: 0.1, seasonalTint: "summer" },
  { id: "dry-savanna", name: "Dry Savanna", vegetationType: "grass", color: "#B8A060", secondaryColor: "#D0C080", density: 0.3, markLength: 14, windDirection: 60, windStrength: 0.4, seasonalTint: "autumn" },
  { id: "rice-paddy", name: "Rice Paddy", vegetationType: "grass", color: "#6AAA4A", secondaryColor: "#8ACC6A", density: 0.9, markLength: 6, windDirection: 0, windStrength: 0.1, seasonalTint: "summer" },
  { id: "autumn-stubble", name: "Autumn Stubble", vegetationType: "wheat", color: "#9A8050", secondaryColor: "#B0A070", density: 0.4, markLength: 4, windDirection: 90, windStrength: 0.1, seasonalTint: "autumn" },
  { id: "snow-covered", name: "Snow Covered", vegetationType: "grass", color: "#E8E8F0", secondaryColor: "#8A7A5A", density: 0.2, markLength: 5, windDirection: 0, windStrength: 0.0, seasonalTint: "winter" },
];

const ROCK_PRESETS = [
  { id: "granite-boulder", name: "Granite Boulder", rockType: "boulder", textureMode: "speckled", color: "#8A8A8A", shadowColor: "#4A4A4A", scale: 1.0, roughness: 0.5, crackDensity: 0.3 },
  { id: "sandstone-outcrop", name: "Sandstone Outcrop", rockType: "outcrop", textureMode: "striated", color: "#C4A070", shadowColor: "#8A6A40", scale: 1.2, roughness: 0.4, crackDensity: 0.5 },
  { id: "shan-shui-rock", name: "Shan-Shui Rock", rockType: "pinnacle", textureMode: "cun-fa", color: "#3A3A3A", shadowColor: "#1A1A1A", scale: 1.5, roughness: 0.8, crackDensity: 0.7 },
  { id: "mossy-rock", name: "Mossy Rock", rockType: "boulder", textureMode: "speckled", color: "#6A7A6A", shadowColor: "#3A4A3A", scale: 0.8, roughness: 0.6, crackDensity: 0.2 },
  { id: "slate-shelf", name: "Slate Shelf", rockType: "shelf", textureMode: "striated", color: "#5A6070", shadowColor: "#2A3040", scale: 0.6, roughness: 0.3, crackDensity: 0.6 },
  { id: "volcanic-basalt", name: "Volcanic Basalt", rockType: "outcrop", textureMode: "cracked", color: "#2A2A30", shadowColor: "#101015", scale: 1.0, roughness: 0.7, crackDensity: 0.9 },
];

const TREELINE_PRESETS = [
  { id: "deciduous-canopy", name: "Deciduous Canopy", canopyStyle: "rounded", color: "#3A6A2A", highlightColor: "#5A8A4A", shadowColor: "#1A4A10", density: 0.8, height: 0.15, irregularity: 0.4 },
  { id: "conifer-ridge", name: "Conifer Ridge", canopyStyle: "pointed", color: "#2A4A2A", highlightColor: "#3A6A3A", shadowColor: "#0A2A0A", density: 0.9, height: 0.2, irregularity: 0.6 },
  { id: "autumn-treeline", name: "Autumn Treeline", canopyStyle: "rounded", color: "#C47030", highlightColor: "#D4A040", shadowColor: "#8A4020", density: 0.7, height: 0.15, irregularity: 0.5 },
  { id: "misty-forest", name: "Misty Forest", canopyStyle: "rounded", color: "#5A7A6A", highlightColor: "#7A9A8A", shadowColor: "#3A5A4A", density: 0.6, height: 0.12, irregularity: 0.3 },
  { id: "palm-fringe", name: "Palm Fringe", canopyStyle: "fan", color: "#2A5A2A", highlightColor: "#4A7A4A", shadowColor: "#0A3A0A", density: 0.5, height: 0.18, irregularity: 0.7 },
  { id: "winter-bare", name: "Winter Bare", canopyStyle: "bare", color: "#4A3A30", highlightColor: "#6A5A50", shadowColor: "#2A1A10", density: 0.4, height: 0.16, irregularity: 0.6 },
];

const CELESTIAL_PRESETS = [
  { id: "noon-sun", name: "Noon Sun", bodyType: "sun", elevation: 0.85, azimuth: 0.5, size: 0.04, glowRadius: 0.15, glowColor: "#FFFDE0", bodyColor: "#FFFFFF", lightPathEnabled: false, lightPathColor: "#FFFFFF" },
  { id: "golden-hour-sun", name: "Golden Hour Sun", bodyType: "sun", elevation: 0.15, azimuth: 0.3, size: 0.06, glowRadius: 0.25, glowColor: "#FFD080", bodyColor: "#FFE0A0", lightPathEnabled: true, lightPathColor: "#FFD080" },
  { id: "harvest-moon", name: "Harvest Moon", bodyType: "moon", elevation: 0.2, azimuth: 0.6, size: 0.07, glowRadius: 0.12, glowColor: "#FFE8C0", bodyColor: "#FFF0D0", lightPathEnabled: true, lightPathColor: "#FFE8C0" },
  { id: "crescent-moon", name: "Crescent Moon", bodyType: "moon", elevation: 0.7, azimuth: 0.7, size: 0.06, moonPhase: 0.12, glowRadius: 0.08, glowColor: "#C0D8FF", bodyColor: "#E8F0FF", lightPathEnabled: false, lightPathColor: "#C0D8FF" },
  { id: "blood-moon", name: "Blood Moon", bodyType: "moon", elevation: 0.4, azimuth: 0.5, size: 0.06, glowRadius: 0.18, glowColor: "#CC4020", bodyColor: "#E06040", lightPathEnabled: true, lightPathColor: "#CC4020" },
  { id: "polar-star", name: "Polar Star", bodyType: "star", elevation: 0.9, azimuth: 0.5, size: 0.015, glowRadius: 0.06, glowColor: "#E0E8FF", bodyColor: "#FFFFFF", lightPathEnabled: false, lightPathColor: "#E0E8FF" },
];

const FOG_PRESETS = [
  { id: "morning-mist", name: "Morning Mist", fogType: "ground", opacity: 0.4, height: 0.2, yPosition: 0.7, color: "#FFFFFF", edgeSoftness: 0.8, wispDensity: 0.3 },
  { id: "mountain-veil", name: "Mountain Veil", fogType: "mountain", opacity: 0.6, height: 0.15, yPosition: 0.45, color: "#F0F0F8", edgeSoftness: 0.9, wispDensity: 0.5 },
  { id: "valley-fog", name: "Valley Fog", fogType: "band", opacity: 0.7, height: 0.25, yPosition: 0.6, color: "#E8E8F0", edgeSoftness: 0.6, wispDensity: 0.2 },
  { id: "shan-shui-cloud-band", name: "Shan-Shui Cloud Band", fogType: "band", opacity: 0.8, height: 0.1, yPosition: 0.4, color: "#FFFFFF", edgeSoftness: 0.95, wispDensity: 0.7 },
  { id: "coastal-haar", name: "Coastal Haar", fogType: "veil", opacity: 0.5, height: 0.3, yPosition: 0.55, color: "#D0D0D8", edgeSoftness: 0.5, wispDensity: 0.6 },
];

const STARFIELD_PRESETS = [
  { id: "clear-night", name: "Clear Night", starCount: 200, brightnessRange: 0.7, maxSize: 3.0, starColor: "#FFFFFF", warmTint: 0.1, milkyWayEnabled: false, milkyWayAngle: 30, milkyWayIntensity: 0.15, constellationHints: false },
  { id: "dense-starfield", name: "Dense Starfield", starCount: 600, brightnessRange: 0.9, maxSize: 3.5, starColor: "#FFFFFF", warmTint: 0.15, milkyWayEnabled: false, milkyWayAngle: 30, milkyWayIntensity: 0.15, constellationHints: false },
  { id: "milky-way", name: "Milky Way", starCount: 500, brightnessRange: 0.8, maxSize: 3.0, starColor: "#F8F0E8", warmTint: 0.2, milkyWayEnabled: true, milkyWayAngle: 30, milkyWayIntensity: 0.15, constellationHints: false },
  { id: "sparse-stars", name: "Sparse Stars", starCount: 40, brightnessRange: 0.5, maxSize: 2.5, starColor: "#FFFFFF", warmTint: 0.05, milkyWayEnabled: false, milkyWayAngle: 30, milkyWayIntensity: 0.15, constellationHints: false },
  { id: "twilight-stars", name: "Twilight Stars", starCount: 80, brightnessRange: 0.4, maxSize: 2.0, starColor: "#E8E0D0", warmTint: 0.3, milkyWayEnabled: false, milkyWayAngle: 30, milkyWayIntensity: 0.15, constellationHints: true },
];

const CLIFF_FACE_PRESETS = [
  { id: "granite-cliff", name: "Granite Cliff", textureMode: "granite", color: "#808080", shadowColor: "#404040", height: 0.6, xPosition: 0.0, width: 0.3, roughness: 0.6, ledgeCount: 4 },
  { id: "sandstone-wall", name: "Sandstone Wall", textureMode: "sandstone", color: "#C4A070", shadowColor: "#8A6A40", height: 0.5, xPosition: 0.0, width: 0.35, roughness: 0.4, ledgeCount: 5 },
  { id: "basalt-columns", name: "Basalt Columns", textureMode: "basalt", color: "#3A3A40", shadowColor: "#1A1A20", height: 0.7, xPosition: 0.0, width: 0.25, roughness: 0.3, ledgeCount: 2 },
  { id: "limestone-face", name: "Limestone Face", textureMode: "limestone", color: "#C0C0B0", shadowColor: "#808070", height: 0.55, xPosition: 0.0, width: 0.3, roughness: 0.5, ledgeCount: 3 },
  { id: "shale-cliff", name: "Shale Cliff", textureMode: "sandstone", color: "#5A5A60", shadowColor: "#2A2A30", height: 0.5, xPosition: 0.0, width: 0.28, roughness: 0.8, ledgeCount: 6 },
];

const SNOWFIELD_PRESETS = [
  { id: "fresh-powder", name: "Fresh Powder", snowColor: "#F0F4F8", shadowColor: "#B0C0D8", driftIntensity: 0.4, sparkleIntensity: 0.5, coverageTop: 0.5, coverageBottom: 1.0 },
  { id: "wind-swept", name: "Wind Swept", snowColor: "#E8ECF0", shadowColor: "#8898B0", driftIntensity: 0.8, sparkleIntensity: 0.2, coverageTop: 0.4, coverageBottom: 1.0 },
  { id: "sun-crust", name: "Sun Crust", snowColor: "#F8F0E8", shadowColor: "#C0B0A0", driftIntensity: 0.3, sparkleIntensity: 0.8, coverageTop: 0.5, coverageBottom: 1.0 },
  { id: "deep-snow", name: "Deep Snow", snowColor: "#F0F0FA", shadowColor: "#90A0C0", driftIntensity: 0.6, sparkleIntensity: 0.15, coverageTop: 0.3, coverageBottom: 1.0 },
];

const BUILDING_PRESETS = [
  { id: "farmhouse", name: "Farmhouse", buildingType: "farmhouse", color: "#5A5050", roofColor: "#704030", scale: 1.0, xPosition: 0.5, yPosition: 0.6, windowCount: 2 },
  { id: "church-steeple", name: "Church Steeple", buildingType: "church", color: "#E0D8D0", roofColor: "#504540", scale: 1.2, xPosition: 0.5, yPosition: 0.6, windowCount: 3 },
  { id: "tower-ruin", name: "Tower Ruin", buildingType: "tower", color: "#6A6060", roofColor: "#6A6060", scale: 1.0, xPosition: 0.5, yPosition: 0.55, windowCount: 1 },
  { id: "village-cluster", name: "Village Cluster", buildingType: "village", color: "#5A5050", roofColor: "#704030", scale: 0.8, xPosition: 0.5, yPosition: 0.6, windowCount: 1 },
  { id: "temple", name: "Temple", buildingType: "farmhouse", color: "#4A4040", roofColor: "#3A3030", scale: 1.3, xPosition: 0.5, yPosition: 0.55, windowCount: 0 },
  { id: "lighthouse", name: "Lighthouse", buildingType: "tower", color: "#E0D8D0", roofColor: "#C04030", scale: 1.1, xPosition: 0.7, yPosition: 0.55, windowCount: 1 },
];

const BRIDGE_PRESETS = [
  { id: "stone-arch", name: "Stone Arch", bridgeStyle: "arch", color: "#6A6060", deckColor: "#8A7A70", span: 0.4, xPosition: 0.5, yPosition: 0.6, archHeight: 0.08, railingHeight: 0.02 },
  { id: "wooden-footbridge", name: "Wooden Footbridge", bridgeStyle: "footbridge", color: "#6A5040", deckColor: "#8A7060", span: 0.3, xPosition: 0.5, yPosition: 0.65, archHeight: 0.05, railingHeight: 0.025 },
  { id: "suspension-bridge", name: "Suspension Bridge", bridgeStyle: "suspension", color: "#505050", deckColor: "#707070", span: 0.5, xPosition: 0.5, yPosition: 0.6, archHeight: 0.1, railingHeight: 0.015 },
  { id: "flat-crossing", name: "Flat Crossing", bridgeStyle: "flat", color: "#707060", deckColor: "#909080", span: 0.35, xPosition: 0.5, yPosition: 0.65, archHeight: 0.05, railingHeight: 0.0 },
];

const REFLECTION_PRESETS = [
  { id: "calm-lake", name: "Calm Lake", skyColor: "#87CEEB", terrainColor: "#3A5A30", darkening: 0.25, rippleFrequency: 0.2, rippleAmplitude: 0.1, waterlinePosition: 0.5, blurAmount: 0.2 },
  { id: "rippled-reflection", name: "Rippled Reflection", skyColor: "#6AAEDC", terrainColor: "#2A4A28", darkening: 0.35, rippleFrequency: 0.7, rippleAmplitude: 0.5, waterlinePosition: 0.5, blurAmount: 0.5 },
  { id: "dark-water", name: "Dark Water", skyColor: "#4A6A8A", terrainColor: "#1A2A18", darkening: 0.5, rippleFrequency: 0.3, rippleAmplitude: 0.2, waterlinePosition: 0.5, blurAmount: 0.6 },
  { id: "golden-reflection", name: "Golden Reflection", skyColor: "#E8A040", terrainColor: "#4A3A20", darkening: 0.2, rippleFrequency: 0.4, rippleAmplitude: 0.3, waterlinePosition: 0.5, blurAmount: 0.3 },
];

const VIGNETTE_FOLIAGE_PRESETS = [
  { id: "overhanging-branches", name: "Overhanging Branches", foliageStyle: "branches", color: "#2A4A20", secondaryColor: "#4A6A30", density: 0.5, depth: 0.15, edges: "top" },
  { id: "grass-border", name: "Grass Border", foliageStyle: "grass-blades", color: "#3A5A28", secondaryColor: "#5A7A38", density: 0.7, depth: 0.12, edges: "bottom" },
  { id: "leaf-frame", name: "Leaf Frame", foliageStyle: "leaves", color: "#2A5020", secondaryColor: "#408030", density: 0.6, depth: 0.18, edges: "all" },
  { id: "pine-canopy", name: "Pine Canopy", foliageStyle: "branches", color: "#1A3A18", secondaryColor: "#2A4A20", density: 0.4, depth: 0.2, edges: "top-sides" },
  { id: "vine-border", name: "Vine Border", foliageStyle: "vines", color: "#305828", secondaryColor: "#4A7838", density: 0.5, depth: 0.15, edges: "top-sides" },
];

const FOREST_FLOOR_PRESETS = [
  { id: "fern-carpet", name: "Fern Carpet", coverType: "ferns", color: "#3A5A30", secondaryColor: "#5A7A40", groundColor: "#4A3A28", density: 0.7, coverageTop: 0.7, coverageBottom: 1.0 },
  { id: "mossy-ground", name: "Mossy Ground", coverType: "moss", color: "#4A7040", secondaryColor: "#608050", groundColor: "#3A3020", density: 0.8, coverageTop: 0.65, coverageBottom: 1.0 },
  { id: "fallen-leaves", name: "Fallen Leaves", coverType: "fallen-logs", color: "#8A6030", secondaryColor: "#A07040", groundColor: "#3A3020", density: 0.5, coverageTop: 0.7, coverageBottom: 1.0 },
  { id: "pine-needles", name: "Pine Needles", coverType: "moss", color: "#506030", secondaryColor: "#706840", groundColor: "#5A4030", density: 0.5, coverageTop: 0.7, coverageBottom: 1.0 },
  { id: "mushroom-patch", name: "Mushroom Patch", coverType: "mushrooms", color: "#C0A080", secondaryColor: "#B04030", groundColor: "#2A2018", density: 0.6, coverageTop: 0.75, coverageBottom: 1.0 },
];

const HAZE_PRESETS = [
  { id: "light-haze", name: "Light Haze", color: "#E0E8F0", opacity: 0.2, yPosition: 0.5, height: 0.4, gradientDirection: "bottom-up", noiseAmount: 0.3 },
  { id: "golden-haze", name: "Golden Haze", color: "#F0D8B0", opacity: 0.25, yPosition: 0.55, height: 0.5, gradientDirection: "bottom-up", noiseAmount: 0.2 },
  { id: "cool-mist", name: "Cool Mist", color: "#C0D0E0", opacity: 0.3, yPosition: 0.6, height: 0.35, gradientDirection: "center-out", noiseAmount: 0.4 },
  { id: "heat-haze", name: "Heat Haze", color: "#F0E8D8", opacity: 0.15, yPosition: 0.7, height: 0.3, gradientDirection: "bottom-up", noiseAmount: 0.6 },
];

const FENCE_PRESETS = [
  { id: "white-picket", name: "White Picket", fenceStyle: "picket", color: "#FFFFFF", postColor: "#E0E0E0", height: 0.06, yPosition: 0.7, spacing: 0.03, sag: 0 },
  { id: "stone-wall", name: "Stone Wall", fenceStyle: "stone-wall", color: "#8A8070", postColor: "#6A6050", height: 0.05, yPosition: 0.72, spacing: 0.04, sag: 0 },
  { id: "ranch-rail", name: "Ranch Rail", fenceStyle: "rail", color: "#7A5A3A", postColor: "#5A3A20", height: 0.07, yPosition: 0.68, spacing: 0.06, sag: 0.3 },
  { id: "wire-fence", name: "Wire Fence", fenceStyle: "wire", color: "#707070", postColor: "#5A4A3A", height: 0.08, yPosition: 0.65, spacing: 0.05, sag: 0.5 },
];

const BOAT_PRESETS = [
  { id: "sailboat", name: "Sailboat", boatType: "sailboat", color: "#4A3A30", sailColor: "#F0E8D8", scale: 0.06, xPosition: 0.5, yPosition: 0.55, tilt: 0 },
  { id: "rowboat", name: "Rowboat", boatType: "rowboat", color: "#5A4030", sailColor: "#8A7060", scale: 0.04, xPosition: 0.4, yPosition: 0.6, tilt: 0 },
  { id: "fishing-boat", name: "Fishing Boat", boatType: "fishing", color: "#3A4A60", sailColor: "#E0D8C8", scale: 0.07, xPosition: 0.6, yPosition: 0.55, tilt: 0 },
  { id: "cargo-ship", name: "Cargo Ship", boatType: "ship", color: "#3A3A3A", sailColor: "#C0C0C0", scale: 0.1, xPosition: 0.5, yPosition: 0.5, tilt: 0 },
];

const EROSION_PRESETS = [
  { id: "rain-streaks", name: "Rain Streaks", erosionType: "rain-wash", color: "rgba(60,50,40,0.3)", intensity: 0.6, coverageTop: 0.25, coverageBottom: 0.85, noiseScale: 0.5 },
  { id: "wind-erosion", name: "Wind Erosion", erosionType: "wind-scour", color: "rgba(90,80,60,0.25)", intensity: 0.5, coverageTop: 0.3, coverageBottom: 0.75, noiseScale: 0.6 },
  { id: "frost-cracks", name: "Frost Cracks", erosionType: "frost-crack", color: "rgba(50,50,50,0.35)", intensity: 0.55, coverageTop: 0.2, coverageBottom: 0.8, noiseScale: 0.4 },
  { id: "lichen-growth", name: "Lichen Growth", erosionType: "lichen", color: "rgba(120,140,80,0.4)", intensity: 0.45, coverageTop: 0.3, coverageBottom: 0.7, noiseScale: 0.5 },
];

// ── Landscape composites (v1) ───────────────────────────────────────────────

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

// ── Scene recipes (v2, mirrors terrain-tools.ts) ────────────────────────────

const SCENE_RECIPES = [
  {
    id: "mountain-valley",
    name: "Mountain Valley",
    layers: [
      { type: "terrain:sky", preset: "noon", name: "Sky" },
      { type: "terrain:profile", preset: "alpine-range", name: "Terrain", seed: 1111 },
      { type: "terrain:fog-layer", preset: "valley-fog", name: "Fog" },
      { type: "terrain:treeline", preset: "conifer-ridge", name: "Treeline" },
      { type: "terrain:field", preset: "meadow-grass", name: "Field" },
      { type: "terrain:haze", preset: "light-haze", name: "Haze" },
    ],
  },
  {
    id: "river-scene",
    name: "River Scene",
    layers: [
      { type: "terrain:sky", preset: "dawn", name: "Sky" },
      { type: "terrain:profile", preset: "rolling-hills", name: "Terrain", seed: 2222 },
      { type: "terrain:river", preset: "gentle-stream", name: "River" },
      { type: "terrain:shore", preset: "sandy-beach", name: "Shore" },
      { type: "terrain:treeline", preset: "deciduous-canopy", name: "Treeline" },
      { type: "terrain:reflection", preset: "calm-lake", name: "Reflection" },
    ],
  },
  {
    id: "coastal-moonlight",
    name: "Coastal Moonlight",
    layers: [
      { type: "terrain:sky", preset: "night", name: "Sky" },
      { type: "terrain:starfield", preset: "clear-night", name: "Starfield" },
      { type: "terrain:celestial", preset: "harvest-moon", name: "Celestial" },
      { type: "terrain:water", preset: "still-lake", name: "Water", seed: 3333 },
      { type: "terrain:shore", preset: "rocky-shore", name: "Shore" },
      { type: "terrain:reflection", preset: "dark-water", name: "Reflection" },
    ],
  },
  {
    id: "park-riverside",
    name: "Park Riverside",
    layers: [
      { type: "terrain:sky", preset: "noon", name: "Sky" },
      { type: "terrain:profile", preset: "foothills", name: "Terrain", seed: 4444 },
      { type: "terrain:river", preset: "gentle-stream", name: "River" },
      { type: "terrain:path", preset: "dirt-trail", name: "Path" },
      { type: "terrain:treeline", preset: "deciduous-canopy", name: "Treeline" },
      { type: "terrain:field", preset: "meadow-grass", name: "Field" },
      { type: "terrain:building", preset: "farmhouse", name: "Building" },
    ],
  },
  {
    id: "shan-shui",
    name: "Shan-Shui",
    layers: [
      { type: "terrain:sky", preset: "dawn", name: "Sky" },
      { type: "terrain:profile", preset: "alpine-range", name: "Terrain", seed: 5555 },
      { type: "terrain:fog-layer", preset: "mountain-veil", name: "Fog" },
      { type: "terrain:rock", preset: "shan-shui-rock", name: "Rock" },
      { type: "terrain:water", preset: "still-lake", name: "Water", seed: 5556 },
      { type: "terrain:haze", preset: "cool-mist", name: "Haze" },
    ],
  },
  {
    id: "pastoral",
    name: "Pastoral",
    layers: [
      { type: "terrain:sky", preset: "golden-hour", name: "Sky" },
      { type: "terrain:profile", preset: "rolling-hills", name: "Terrain", seed: 6666 },
      { type: "terrain:field", preset: "wheat-field", name: "Field" },
      { type: "terrain:path", preset: "country-lane", name: "Path" },
      { type: "terrain:fence", preset: "white-picket", name: "Fence" },
      { type: "terrain:building", preset: "farmhouse", name: "Building" },
      { type: "terrain:haze", preset: "golden-haze", name: "Haze" },
    ],
  },
  {
    id: "forest-clearing",
    name: "Forest Clearing",
    layers: [
      { type: "terrain:sky", preset: "noon", name: "Sky" },
      { type: "terrain:treeline", preset: "deciduous-canopy", name: "Treeline" },
      { type: "terrain:vignette-foliage", preset: "overhanging-branches", name: "Vignette" },
      { type: "terrain:forest-floor", preset: "fern-carpet", name: "ForestFloor" },
      { type: "terrain:fog-layer", preset: "morning-mist", name: "Fog" },
      { type: "terrain:path", preset: "forest-path", name: "Path" },
    ],
  },
  {
    id: "alpine-lake",
    name: "Alpine Lake",
    layers: [
      { type: "terrain:sky", preset: "noon", name: "Sky" },
      { type: "terrain:profile", preset: "alpine-range", name: "Terrain", seed: 7777 },
      { type: "terrain:snowfield", preset: "fresh-powder", name: "Snowfield" },
      { type: "terrain:water", preset: "still-lake", name: "Water", seed: 7778 },
      { type: "terrain:reflection", preset: "calm-lake", name: "Reflection" },
      { type: "terrain:cliff-face", preset: "granite-cliff", name: "CliffFace" },
      { type: "terrain:haze", preset: "cool-mist", name: "Haze" },
    ],
  },
  {
    id: "japanese-garden",
    name: "Japanese Garden",
    layers: [
      { type: "terrain:sky", preset: "dawn", name: "Sky" },
      { type: "terrain:water", preset: "still-lake", name: "Water", seed: 8888 },
      { type: "terrain:bridge", preset: "stone-arch", name: "Bridge" },
      { type: "terrain:rock", preset: "shan-shui-rock", name: "Rock" },
      { type: "terrain:treeline", preset: "autumn-treeline", name: "Treeline" },
      { type: "terrain:reflection", preset: "calm-lake", name: "Reflection" },
      { type: "terrain:haze", preset: "light-haze", name: "Haze" },
    ],
  },
  {
    id: "desert-expanse",
    name: "Desert Expanse",
    layers: [
      { type: "terrain:sky", preset: "noon", name: "Sky" },
      { type: "terrain:profile", preset: "mesa-plateau", name: "Terrain", seed: 9999 },
      { type: "terrain:cliff-face", preset: "sandstone-wall", name: "CliffFace" },
      { type: "terrain:field", preset: "dry-savanna", name: "Field" },
      { type: "terrain:haze", preset: "heat-haze", name: "Haze" },
      { type: "terrain:erosion", preset: "wind-erosion", name: "Erosion" },
    ],
  },
  {
    id: "winter-woodland",
    name: "Winter Woodland",
    layers: [
      { type: "terrain:sky", preset: "noon", name: "Sky" },
      { type: "terrain:profile", preset: "foothills", name: "Terrain", seed: 1010 },
      { type: "terrain:snowfield", preset: "deep-snow", name: "Snowfield" },
      { type: "terrain:treeline", preset: "conifer-ridge", name: "Treeline" },
      { type: "terrain:vignette-foliage", preset: "pine-canopy", name: "Vignette" },
      { type: "terrain:fog-layer", preset: "morning-mist", name: "Fog" },
    ],
  },
  {
    id: "tropical-coast",
    name: "Tropical Coast",
    layers: [
      { type: "terrain:sky", preset: "golden-hour", name: "Sky" },
      { type: "terrain:water", preset: "still-lake", name: "Water", seed: 1212 },
      { type: "terrain:shore", preset: "sandy-beach", name: "Shore" },
      { type: "terrain:boat", preset: "sailboat", name: "Boat" },
      { type: "terrain:reflection", preset: "golden-reflection", name: "Reflection" },
      { type: "terrain:vignette-foliage", preset: "leaf-frame", name: "Vignette" },
      { type: "terrain:haze", preset: "golden-haze", name: "Haze" },
    ],
  },
];

// ── Constants ───────────────────────────────────────────────────────────────

const W = 600;
const H = 600;
const NOW = "2026-03-12T00:00:00.000Z";

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

/** Create a layer from a preset array. Copies all preset properties except id/name/category/description/tags. */
function presetLayer(presetArray, presetId, layerType, layerIdSuffix, extraProps = {}) {
  const p = presetArray.find((s) => s.id === presetId);
  if (!p) throw new Error(`Preset "${presetId}" not found in ${layerType}`);
  const props = { preset: presetId };
  for (const [k, v] of Object.entries(p)) {
    if (["id", "name", "category", "description", "tags"].includes(k)) continue;
    props[k] = v;
  }
  Object.assign(props, extraProps);
  return baseLayer(`${layerIdSuffix}-layer`, layerType, `${p.name}`, props);
}

function skyLayer(preset, layerId = "sky-layer") {
  return presetLayer(SKY_PRESETS, preset, "terrain:sky", layerId, { horizonLine: 1.0 });
}

function profileLayer(preset, seed = 42, layerId = "profile-layer") {
  return presetLayer(PROFILE_PRESETS, preset, "terrain:profile", layerId, { seed });
}

function cloudLayer(preset, seed = 42, layerId = "clouds-layer") {
  return presetLayer(CLOUD_PRESETS, preset, "terrain:clouds", layerId, { seed });
}

function waterLayer(preset, seed = 42, layerId = "water-layer") {
  return presetLayer(WATER_PRESETS, preset, "terrain:water", layerId, { seed });
}

/** Default sky for non-sky single-layer categories */
const DEFAULT_SKY = "noon";
/** Night sky for categories that look best at night */
const NIGHT_SKY = "night";
/** Dawn sky for warm-toned categories */
const DAWN_SKY = "dawn";

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

// ── Category config: defines sky context + extra context layers per category ─

const CATEGORY_CONFIG = {
  sky: { skyPreset: null, extraLayers: [] },
  profile: { skyPreset: DEFAULT_SKY, extraLayers: [] },
  clouds: { skyPreset: DEFAULT_SKY, extraLayers: [] },
  water: { skyPreset: DEFAULT_SKY, extraLayers: [] },
  river: { skyPreset: DAWN_SKY, extraLayers: [
    () => profileLayer("rolling-hills", 100, "bg-profile"),
  ]},
  path: { skyPreset: DEFAULT_SKY, extraLayers: [
    () => profileLayer("rolling-hills", 200, "bg-profile"),
    () => presetLayer(FIELD_PRESETS, "meadow-grass", "terrain:field", "bg-field"),
  ]},
  shore: { skyPreset: DEFAULT_SKY, extraLayers: [
    () => waterLayer("still-lake", 300, "bg-water"),
  ]},
  field: { skyPreset: DEFAULT_SKY, extraLayers: [
    () => profileLayer("rolling-hills", 400, "bg-profile"),
  ]},
  rock: { skyPreset: DEFAULT_SKY, extraLayers: [
    () => profileLayer("alpine-range", 500, "bg-profile"),
  ]},
  treeline: { skyPreset: DEFAULT_SKY, extraLayers: [
    () => profileLayer("foothills", 600, "bg-profile"),
  ]},
  celestial: { skyPreset: NIGHT_SKY, extraLayers: [] },
  fog: { skyPreset: DEFAULT_SKY, extraLayers: [
    () => profileLayer("alpine-range", 700, "bg-profile"),
  ]},
  starfield: { skyPreset: NIGHT_SKY, extraLayers: [] },
  "cliff-face": { skyPreset: DEFAULT_SKY, extraLayers: [
    () => profileLayer("alpine-range", 800, "bg-profile"),
  ]},
  snowfield: { skyPreset: DEFAULT_SKY, extraLayers: [
    () => profileLayer("alpine-range", 900, "bg-profile"),
  ]},
  building: { skyPreset: DEFAULT_SKY, extraLayers: [
    () => profileLayer("rolling-hills", 1000, "bg-profile"),
    () => presetLayer(FIELD_PRESETS, "meadow-grass", "terrain:field", "bg-field"),
  ]},
  bridge: { skyPreset: DEFAULT_SKY, extraLayers: [
    () => presetLayer(RIVER_PRESETS, "wide-river", "terrain:river", "bg-river"),
  ]},
  reflection: { skyPreset: DEFAULT_SKY, extraLayers: [
    () => profileLayer("rolling-hills", 1100, "bg-profile"),
    () => waterLayer("still-lake", 1200, "bg-water"),
  ]},
  "vignette-foliage": { skyPreset: DEFAULT_SKY, extraLayers: [
    () => profileLayer("foothills", 1300, "bg-profile"),
    () => presetLayer(TREELINE_PRESETS, "deciduous-canopy", "terrain:treeline", "bg-treeline"),
  ]},
  "forest-floor": { skyPreset: DEFAULT_SKY, extraLayers: [
    () => presetLayer(TREELINE_PRESETS, "deciduous-canopy", "terrain:treeline", "bg-treeline"),
  ]},
  haze: { skyPreset: DEFAULT_SKY, extraLayers: [
    () => profileLayer("alpine-range", 1400, "bg-profile"),
  ]},
  fence: { skyPreset: DEFAULT_SKY, extraLayers: [
    () => profileLayer("rolling-hills", 1500, "bg-profile"),
    () => presetLayer(FIELD_PRESETS, "meadow-grass", "terrain:field", "bg-field"),
  ]},
  boat: { skyPreset: DEFAULT_SKY, extraLayers: [
    () => waterLayer("still-lake", 1600, "bg-water"),
  ]},
  erosion: { skyPreset: DEFAULT_SKY, extraLayers: [
    () => profileLayer("mesa-plateau", 1700, "bg-profile"),
    () => presetLayer(CLIFF_FACE_PRESETS, "sandstone-wall", "terrain:cliff-face", "bg-cliff"),
  ]},
};

// Map category → { presets, layerType }
const PRESET_CATEGORIES = {
  sky:               { presets: SKY_PRESETS,             layerType: "terrain:sky" },
  profile:           { presets: PROFILE_PRESETS,         layerType: "terrain:profile" },
  clouds:            { presets: CLOUD_PRESETS,           layerType: "terrain:clouds" },
  water:             { presets: WATER_PRESETS,           layerType: "terrain:water" },
  river:             { presets: RIVER_PRESETS,           layerType: "terrain:river" },
  path:              { presets: PATH_PRESETS,            layerType: "terrain:path" },
  shore:             { presets: SHORE_PRESETS,           layerType: "terrain:shore" },
  field:             { presets: FIELD_PRESETS,           layerType: "terrain:field" },
  rock:              { presets: ROCK_PRESETS,            layerType: "terrain:rock" },
  treeline:          { presets: TREELINE_PRESETS,        layerType: "terrain:treeline" },
  celestial:         { presets: CELESTIAL_PRESETS,       layerType: "terrain:celestial" },
  fog:               { presets: FOG_PRESETS,             layerType: "terrain:fog-layer" },
  starfield:         { presets: STARFIELD_PRESETS,       layerType: "terrain:starfield" },
  "cliff-face":      { presets: CLIFF_FACE_PRESETS,     layerType: "terrain:cliff-face" },
  snowfield:         { presets: SNOWFIELD_PRESETS,       layerType: "terrain:snowfield" },
  building:          { presets: BUILDING_PRESETS,        layerType: "terrain:building" },
  bridge:            { presets: BRIDGE_PRESETS,          layerType: "terrain:bridge" },
  reflection:        { presets: REFLECTION_PRESETS,      layerType: "terrain:reflection" },
  "vignette-foliage":{ presets: VIGNETTE_FOLIAGE_PRESETS, layerType: "terrain:vignette-foliage" },
  "forest-floor":    { presets: FOREST_FLOOR_PRESETS,   layerType: "terrain:forest-floor" },
  haze:              { presets: HAZE_PRESETS,            layerType: "terrain:haze" },
  fence:             { presets: FENCE_PRESETS,           layerType: "terrain:fence" },
  boat:              { presets: BOAT_PRESETS,            layerType: "terrain:boat" },
  erosion:           { presets: EROSION_PRESETS,         layerType: "terrain:erosion" },
};

// ── Generate single-layer preset examples ───────────────────────────────────

let count = 0;

for (const [cat, { presets, layerType }] of Object.entries(PRESET_CATEGORIES)) {
  const config = CATEGORY_CONFIG[cat];

  for (const preset of presets) {
    const layers = [];

    // Sky background (unless this IS the sky category)
    if (config.skyPreset) {
      layers.push(skyLayer(config.skyPreset));
    }

    // Extra context layers (terrain profiles, water, fields, etc.)
    for (const fn of config.extraLayers) {
      layers.push(fn());
    }

    // The featured layer itself
    layers.push(presetLayer(presets, preset.id, layerType, cat));

    const sketch = buildSketch(`terrain-${preset.id}`, `${preset.name}`, layers);
    const rel = writeGenart(cat, `${preset.id}.genart`, sketch);
    console.log(`  ${rel}`);
    count++;
  }
}

// ── Generate v1 landscape composites ────────────────────────────────────────

for (const scene of LANDSCAPE_SCENES) {
  const layers = [];

  layers.push(skyLayer(scene.sky));

  if (scene.extraProfile) {
    layers.push(profileLayer(scene.extraProfile, scene.extraProfileSeed, "profile-back"));
  }

  if (scene.clouds) {
    layers.push(cloudLayer(scene.clouds, scene.cloudSeed));
  }

  layers.push(profileLayer(scene.profile, scene.profileSeed));

  if (scene.water) {
    layers.push(waterLayer(scene.water, scene.waterSeed));
  }

  const sketch = buildSketch(`terrain-${scene.id}`, scene.name, layers);
  const rel = writeGenart("landscape", `${scene.id}.genart`, sketch);
  console.log(`  ${rel}`);
  count++;
}

// ── Generate v2 scene recipes ───────────────────────────────────────────────

for (const recipe of SCENE_RECIPES) {
  const layers = [];

  for (let i = 0; i < recipe.layers.length; i++) {
    const l = recipe.layers[i];
    const extraProps = {};
    if (l.seed) extraProps.seed = l.seed;
    // Find the preset in the right array
    const cat = Object.values(PRESET_CATEGORIES).find((c) => c.layerType === l.type);
    if (cat) {
      layers.push(presetLayer(cat.presets, l.preset, l.type, `${l.name.toLowerCase()}-${i}`, extraProps));
    } else {
      // Fallback: just create a minimal layer
      layers.push(baseLayer(`${l.name.toLowerCase()}-${i}-layer`, l.type, l.name, { preset: l.preset, ...extraProps }));
    }
  }

  const sketch = buildSketch(`terrain-${recipe.id}`, recipe.name, layers);
  const rel = writeGenart("scenes", `${recipe.id}.genart`, sketch);
  console.log(`  ${rel}`);
  count++;
}

console.log(`\nDone: ${count} .genart files generated in examples/`);
