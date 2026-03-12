/** Base preset fields shared by all terrain presets. */
interface BasePreset {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

/** Sky gradient preset. */
export interface SkyPreset extends BasePreset {
  category: "sky";
  zenithColor: string;
  horizonColor: string;
  hazeColor: string;
  hazeIntensity: number;
  hazePosition: number;
  hazeWidth: number;
}

/** Terrain profile (ridgeline) preset. */
export interface ProfilePreset extends BasePreset {
  category: "profile";
  ridgeCount: number;
  roughness: number;
  elevationMin: number;
  elevationMax: number;
  noiseScale: number;
  jaggedness: number;
  foregroundColor: string;
  backgroundRidgeColor: string;
  depthValueShift: number;
  depthEasing: "linear" | "quadratic" | "cubic" | "exponential";
}

/** Cloud preset. */
export interface CloudPreset extends BasePreset {
  category: "clouds";
  coverage: number;
  altitudeMin: number;
  altitudeMax: number;
  cloudType: "cumulus" | "stratus" | "cirrus";
  scale: number;
  windDirection: number;
  cloudColor: string;
  shadowColor: string;
  softness: number;
}

/** Water surface preset. */
export interface WaterPreset extends BasePreset {
  category: "water";
  waterlinePosition: number;
  rippleFrequency: number;
  rippleAmplitude: number;
  rippleMode: "sine" | "noise";
  waterColor: string;
  depthDarkening: number;
  shimmerIntensity: number;
}

/** River preset (perspective curve water body). */
export interface RiverPreset extends BasePreset {
  category: "river";
  pathPreset: "straight" | "meandering" | "s-curve" | "winding" | "switchback" | "fork";
  widthNear: number;
  widthFar: number;
  waterColor: string;
  bankColor: string;
  rippleScale: number;
  rippleIntensity: number;
  reflectionIntensity: number;
  flowDirection: number;
  bankStyle: "none" | "soft-grass" | "rocky" | "sandy" | "muddy";
}

/** Path preset (perspective curve dry ground). */
export interface PathPreset extends BasePreset {
  category: "path";
  pathPreset: "straight" | "meandering" | "winding" | "switchback" | "fork";
  widthNear: number;
  widthFar: number;
  surfaceColor: string;
  surfaceStyle: "dirt" | "cobblestone" | "gravel" | "sand" | "worn-grass" | "flagstone";
  edgeTreatment: "sharp" | "grass-encroach" | "scattered-stones" | "overgrown";
  wear: number;
}

/** Shore preset (water-land transition zone). */
export interface ShorePreset extends BasePreset {
  category: "shore";
  shoreType: "sandy-beach" | "rocky-shore" | "muddy-bank" | "grassy-bank" | "tidal-flat" | "cliff-base";
  width: number;
  color: string;
  wetColor: string;
  foamLine: boolean;
  foamIntensity: number;
  debrisType: "none" | "seaweed" | "driftwood" | "shells" | "pebbles";
}

/** Discriminated union of all terrain presets. */
export type TerrainPreset = SkyPreset | ProfilePreset | CloudPreset | WaterPreset | RiverPreset | PathPreset | ShorePreset;

export type PresetCategory = "sky" | "profile" | "clouds" | "water" | "river" | "path" | "shore";
