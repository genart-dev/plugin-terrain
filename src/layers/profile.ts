import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { createFractalNoise } from "../shared/noise.js";
import { lerpColor, lighten, parseHex, toHex } from "../shared/color-utils.js";
import { applyDepthEasing } from "../shared/depth.js";
import type { DepthEasing } from "../shared/depth.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { ProfilePreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const PROFILE_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Terrain Type",
    type: "select",
    default: "rolling-hills",
    group: "preset",
    options: [
      { value: "alpine-range", label: "Alpine Range" },
      { value: "rolling-hills", label: "Rolling Hills" },
      { value: "mesa-plateau", label: "Mesa Plateau" },
      { value: "coastal-cliffs", label: "Coastal Cliffs" },
      { value: "sand-dunes", label: "Sand Dunes" },
      { value: "foothills", label: "Foothills" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  { key: "ridgeCount", label: "Ridge Count", type: "number", default: 3, min: 1, max: 8, step: 1, group: "shape" },
  { key: "roughness", label: "Roughness", type: "number", default: 0.35, min: 0, max: 1, step: 0.05, group: "shape" },
  { key: "elevationMin", label: "Elevation Min", type: "number", default: 0.4, min: 0, max: 1, step: 0.05, group: "shape" },
  { key: "elevationMax", label: "Elevation Max", type: "number", default: 0.7, min: 0, max: 1, step: 0.05, group: "shape" },
  { key: "noiseScale", label: "Noise Scale", type: "number", default: 2.0, min: 0.5, max: 8, step: 0.5, group: "shape" },
  { key: "jaggedness", label: "Jaggedness", type: "number", default: 0.3, min: 0, max: 1, step: 0.05, group: "shape" },
  { key: "foregroundColor", label: "Foreground Color", type: "color", default: "#3B5E3B", group: "colors" },
  { key: "backgroundRidgeColor", label: "Background Color", type: "color", default: "#7A9E8A", group: "colors" },
  { key: "depthValueShift", label: "Depth Value Shift", type: "number", default: 0.4, min: 0, max: 1, step: 0.05, group: "depth" },
  {
    key: "depthEasing",
    label: "Depth Easing",
    type: "select",
    default: "linear",
    group: "depth",
    options: [
      { value: "linear", label: "Linear" },
      { value: "quadratic", label: "Quadratic" },
      { value: "cubic", label: "Cubic" },
      { value: "exponential", label: "Exponential" },
    ],
  },
  createDepthLaneProperty("background"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  ridgeCount: number;
  roughness: number;
  elevationMin: number;
  elevationMax: number;
  noiseScale: number;
  jaggedness: number;
  foregroundColor: string;
  backgroundRidgeColor: string;
  depthValueShift: number;
  depthEasing: DepthEasing;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const pp = preset?.category === "profile" ? (preset as ProfilePreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    ridgeCount: (properties.ridgeCount as number) ?? pp?.ridgeCount ?? 3,
    roughness: (properties.roughness as number) ?? pp?.roughness ?? 0.35,
    elevationMin: (properties.elevationMin as number) ?? pp?.elevationMin ?? 0.4,
    elevationMax: (properties.elevationMax as number) ?? pp?.elevationMax ?? 0.7,
    noiseScale: (properties.noiseScale as number) ?? pp?.noiseScale ?? 2.0,
    jaggedness: (properties.jaggedness as number) ?? pp?.jaggedness ?? 0.3,
    foregroundColor: (properties.foregroundColor as string) || pp?.foregroundColor || "#3B5E3B",
    backgroundRidgeColor: (properties.backgroundRidgeColor as string) || pp?.backgroundRidgeColor || "#7A9E8A",
    depthValueShift: (properties.depthValueShift as number) ?? pp?.depthValueShift ?? 0.4,
    depthEasing: (properties.depthEasing as DepthEasing) ?? pp?.depthEasing ?? "linear",
    depthLane: (properties.depthLane as string) ?? "background",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

export const profileLayerType: LayerTypeDefinition = {
  typeId: "terrain:profile",
  displayName: "Terrain Profile",
  icon: "mountain",
  category: "draw",
  properties: PROFILE_PROPERTIES,
  propertyEditorId: "terrain:profile-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(PROFILE_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const { width, height, x: bx, y: by } = bounds;
    const ridgeCount = Math.max(1, Math.min(8, p.ridgeCount));

    // Octave count scales with roughness: 1 at 0, 6 at 1
    const octaves = Math.max(1, Math.round(1 + p.roughness * 5));

    // Resolve depth lane once for all ridges
    const laneConfig = resolveDepthLane(p.depthLane);

    // Haze color for inter-ridge atmospheric effect
    const hazeHex = p.atmosphericMode === "ink-wash" ? "#E8DDD0" : "#B8C8D8";
    const [hazeR, hazeG, hazeB] = parseHex(hazeHex);

    for (let i = 0; i < ridgeCount; i++) {
      // t=0 for farthest ridge, t=1 for nearest
      const t = ridgeCount === 1 ? 1 : i / (ridgeCount - 1);
      const easedT = applyDepthEasing(t, p.depthEasing);

      // --- Inter-ridge haze ---
      // Before drawing each ridge (except the first), overlay a thin haze
      // layer over everything already drawn. This accumulates on far ridges,
      // creating natural atmospheric separation (refs #6 Appalachian, #8 blue mountains).
      if (i > 0 && p.atmosphericMode !== "none") {
        const hazeAlpha = 0.03 + (1 - t) * 0.05;
        ctx.fillStyle = `rgba(${hazeR},${hazeG},${hazeB},${hazeAlpha})`;
        ctx.fillRect(bx, by, width, height);
      }

      // Per-ridge noise with unique seed offset
      const noise = createFractalNoise(p.seed + i * 7919, octaves, 2.0, 0.5);

      // Baseline Y: far ridges (t=0) sit high on screen (near horizon),
      // near ridges (t=1) sit lower (closer to bottom edge).
      const baselineNorm = p.elevationMin + (p.elevationMax - p.elevationMin) * easedT;
      const baselineY = by + height * baselineNorm;

      // Elevation amplitude: far ridges get dramatic peaks above their baseline,
      // near ridges get moderate variation. Scale with available space above baseline.
      const ampScale = 0.35 + 0.15 * (1 - easedT);
      const elevRange = baselineNorm * height * ampScale;

      // Determine colors for this ridge.
      // Use t directly as depth (0=far, 1=near) for maximum ridge-to-ridge
      // contrast, rather than the narrow depth lane range which compresses
      // all ridges into similar atmospheric values.
      let ridgeColor: string;

      if (p.atmosphericMode !== "none") {
        const bgColor = applyAtmosphericDepth(p.backgroundRidgeColor, t, p.atmosphericMode);
        const fgColor = applyAtmosphericDepth(p.foregroundColor, t, p.atmosphericMode);
        ridgeColor = lerpColor(bgColor, fgColor, t);
      } else {
        const baseLerp = lerpColor(p.backgroundRidgeColor, p.foregroundColor, t);
        const lightenAmount = (1 - t) * p.depthValueShift * 0.5;
        ridgeColor = lighten(baseLerp, lightenAmount);
      }

      // --- Build noise profile path (used for fill + lighting clip) ---
      const step = Math.max(1, Math.floor(width / 300));
      const profilePoints: Array<{ px: number; py: number }> = [];

      for (let px = 0; px <= width; px += step) {
        const nx = (px / width) * p.noiseScale;
        let noiseVal = noise(nx, i * 10);

        if (p.jaggedness > 0.3) {
          const hfNoise = createFractalNoise(p.seed + i * 3571 + 999, 2, 4.0, 0.3);
          noiseVal += hfNoise(nx * 3, i * 10) * p.jaggedness * 0.3;
          noiseVal = Math.min(1, Math.max(0, noiseVal));
        }

        profilePoints.push({
          px: bx + px,
          py: baselineY - noiseVal * elevRange,
        });
      }

      // Draw filled ridge path
      ctx.beginPath();
      for (let j = 0; j < profilePoints.length; j++) {
        const pt = profilePoints[j]!;
        if (j === 0) ctx.moveTo(pt.px, pt.py);
        else ctx.lineTo(pt.px, pt.py);
      }
      ctx.lineTo(bx + width, by + height);
      ctx.lineTo(bx, by + height);
      ctx.closePath();

      // Far ridges get slight transparency for natural haze
      if (ridgeCount > 1 && t < 0.3) {
        ctx.globalAlpha = 0.7 + t;
      }
      ctx.fillStyle = ridgeColor;
      ctx.fill();
      ctx.globalAlpha = 1;

      // --- Directional light gradient ---
      // Apply a subtle left-to-right gradient for consistent sun direction,
      // plus a vertical gradient for ridge volume (peaks lighter, bases darker).
      // Only when multiple ridges and atmospheric mode is active.
      if (ridgeCount > 1 && p.atmosphericMode !== "none") {
        ctx.save();

        // Re-build the ridge clip path
        ctx.beginPath();
        for (let j = 0; j < profilePoints.length; j++) {
          const pt = profilePoints[j]!;
          if (j === 0) ctx.moveTo(pt.px, pt.py);
          else ctx.lineTo(pt.px, pt.py);
        }
        ctx.lineTo(bx + width, by + height);
        ctx.lineTo(bx, by + height);
        ctx.closePath();
        ctx.clip();

        // Find the topmost point of this ridge for gradient anchoring
        let minY = by + height;
        for (const pt of profilePoints) {
          if (pt.py < minY) minY = pt.py;
        }

        // Vertical volume gradient: transparent at peaks, darker at base
        const volGrad = ctx.createLinearGradient(0, minY, 0, by + height);
        volGrad.addColorStop(0, "rgba(0,0,0,0)");
        volGrad.addColorStop(0.5, `rgba(0,0,0,${0.02 + t * 0.03})`);
        volGrad.addColorStop(1, `rgba(0,0,0,${0.06 + t * 0.06})`);
        ctx.fillStyle = volGrad;
        ctx.fillRect(bx, by, width, height);

        // Horizontal directional light: sun from left, shadow on right
        // Strength decreases for nearer ridges (foreground has its own colors)
        const lightStrength = (1 - t) * 0.08;
        if (lightStrength > 0.005) {
          const dirGrad = ctx.createLinearGradient(bx, 0, bx + width, 0);
          dirGrad.addColorStop(0, `rgba(255,255,255,${lightStrength})`);
          dirGrad.addColorStop(0.35, "rgba(255,255,255,0)");
          dirGrad.addColorStop(0.65, "rgba(0,0,0,0)");
          dirGrad.addColorStop(1, `rgba(0,0,0,${lightStrength * 0.7})`);
          ctx.fillStyle = dirGrad;
          ctx.fillRect(bx, by, width, height);
        }

        ctx.restore();
      }
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown profile preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
