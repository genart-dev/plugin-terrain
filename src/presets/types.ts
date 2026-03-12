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

/** Discriminated union of all terrain presets. */
export type TerrainPreset = SkyPreset | ProfilePreset | CloudPreset | WaterPreset;

export type PresetCategory = "sky" | "profile" | "clouds" | "water";
