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

/** Field preset (depth-receding vegetation marks). */
export interface FieldPreset extends BasePreset {
  category: "field";
  vegetationType: "grass" | "wheat" | "wildflowers";
  color: string;
  secondaryColor: string;
  density: number;
  markLength: number;
  windDirection: number;
  windStrength: number;
  seasonalTint: "spring" | "summer" | "autumn" | "winter";
}

/** Rock preset (natural rock forms with texture modes). */
export interface RockPreset extends BasePreset {
  category: "rock";
  rockType: "boulder" | "outcrop" | "pinnacle" | "shelf";
  textureMode: "speckled" | "striated" | "cun-fa" | "cracked";
  color: string;
  shadowColor: string;
  scale: number;
  roughness: number;
  crackDensity: number;
}

/** Treeline preset (dense canopy silhouette band). */
export interface TreelinePreset extends BasePreset {
  category: "treeline";
  canopyStyle: "rounded" | "pointed" | "fan" | "bare";
  color: string;
  highlightColor: string;
  shadowColor: string;
  density: number;
  height: number;
  irregularity: number;
}

/** Celestial body preset (sun, moon, star with glow and light path). */
export interface CelestialPreset extends BasePreset {
  category: "celestial";
  bodyType: "sun" | "moon" | "star";
  elevation: number;
  azimuth: number;
  size: number;
  glowRadius: number;
  glowColor: string;
  bodyColor: string;
  lightPathEnabled: boolean;
  lightPathColor: string;
}

/** Fog layer preset (occluding fog bands for depth separation). */
export interface FogPreset extends BasePreset {
  category: "fog";
  fogType: "band" | "ground" | "mountain" | "veil";
  opacity: number;
  height: number;
  yPosition: number;
  color: string;
  edgeSoftness: number;
  wispDensity: number;
}

/** Star field preset (night sky stars). */
export interface StarfieldPreset extends BasePreset {
  category: "starfield";
  starCount: number;
  brightnessRange: number;
  maxSize: number;
  starColor: string;
  warmTint: number;
  milkyWayEnabled: boolean;
  milkyWayAngle: number;
  milkyWayIntensity: number;
  constellationHints: boolean;
}

/** Cliff face preset (vertical rock wall). */
export interface CliffFacePreset extends BasePreset {
  category: "cliff-face";
  textureMode: "sandstone" | "granite" | "basalt" | "limestone";
  color: string;
  shadowColor: string;
  height: number;
  xPosition: number;
  width: number;
  roughness: number;
  ledgeCount: number;
}

/** Snow field preset (snow-covered ground). */
export interface SnowfieldPreset extends BasePreset {
  category: "snowfield";
  snowColor: string;
  shadowColor: string;
  driftIntensity: number;
  sparkleIntensity: number;
  coverageTop: number;
  coverageBottom: number;
}

/** Building preset (architectural silhouettes). */
export interface BuildingPreset extends BasePreset {
  category: "building";
  buildingType: "farmhouse" | "church" | "tower" | "village";
  color: string;
  roofColor: string;
  scale: number;
  xPosition: number;
  yPosition: number;
  windowCount: number;
}

/** Bridge preset (bridge silhouettes spanning terrain). */
export interface BridgePreset extends BasePreset {
  category: "bridge";
  bridgeStyle: "arch" | "suspension" | "footbridge" | "flat";
  color: string;
  deckColor: string;
  span: number;
  xPosition: number;
  yPosition: number;
  archHeight: number;
  railingHeight: number;
}

/** Fence preset (fence/wall silhouettes). */
export interface FencePreset extends BasePreset {
  category: "fence";
  fenceStyle: "picket" | "stone-wall" | "rail" | "wire";
  color: string;
  postColor: string;
  height: number;
  yPosition: number;
  spacing: number;
  sag: number;
}

/** Boat preset (boat/ship silhouettes on water). */
export interface BoatPreset extends BasePreset {
  category: "boat";
  boatType: "sailboat" | "rowboat" | "fishing" | "ship";
  color: string;
  sailColor: string;
  scale: number;
  xPosition: number;
  yPosition: number;
  tilt: number;
}

/** Erosion preset (weathering texture overlay). */
export interface ErosionPreset extends BasePreset {
  category: "erosion";
  erosionType: "rain-wash" | "wind-scour" | "frost-crack" | "lichen";
  color: string;
  intensity: number;
  coverageTop: number;
  coverageBottom: number;
  noiseScale: number;
}

/** Reflection preset (mirror reflection in water surface). */
export interface ReflectionPreset extends BasePreset {
  category: "reflection";
  skyColor: string;
  terrainColor: string;
  darkening: number;
  rippleFrequency: number;
  rippleAmplitude: number;
  waterlinePosition: number;
  blurAmount: number;
}

/** Vignette foliage preset (foreground framing foliage). */
export interface VignetteFoliagePreset extends BasePreset {
  category: "vignette-foliage";
  foliageStyle: "branches" | "grass-blades" | "leaves" | "vines";
  color: string;
  secondaryColor: string;
  density: number;
  depth: number;
  edges: "top" | "bottom" | "sides" | "top-sides" | "all";
}

/** Forest floor preset (ground cover with undergrowth). */
export interface ForestFloorPreset extends BasePreset {
  category: "forest-floor";
  coverType: "ferns" | "moss" | "fallen-logs" | "mushrooms";
  color: string;
  secondaryColor: string;
  groundColor: string;
  density: number;
  coverageTop: number;
  coverageBottom: number;
}

/** Haze preset (subtle atmospheric haze). */
export interface HazePreset extends BasePreset {
  category: "haze";
  color: string;
  opacity: number;
  yPosition: number;
  height: number;
  gradientDirection: "bottom-up" | "top-down" | "center-out" | "uniform";
  noiseAmount: number;
}

/** Discriminated union of all terrain presets. */
export type TerrainPreset = SkyPreset | ProfilePreset | CloudPreset | WaterPreset | RiverPreset | PathPreset | ShorePreset | FieldPreset | RockPreset | TreelinePreset | CelestialPreset | FogPreset | StarfieldPreset | CliffFacePreset | SnowfieldPreset | BuildingPreset | BridgePreset | ReflectionPreset | VignetteFoliagePreset | ForestFloorPreset | HazePreset | FencePreset | BoatPreset | ErosionPreset;

export type PresetCategory = "sky" | "profile" | "clouds" | "water" | "river" | "path" | "shore" | "field" | "rock" | "treeline" | "celestial" | "fog" | "starfield" | "cliff-face" | "snowfield" | "building" | "bridge" | "reflection" | "vignette-foliage" | "forest-floor" | "haze" | "fence" | "boat" | "erosion";
