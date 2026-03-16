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
  {
    key: "terrainType",
    label: "Terrain Mode",
    type: "select",
    default: "mountains",
    group: "shape",
    options: [
      { value: "mountains", label: "Mountains" },
      { value: "hills", label: "Rolling Hills" },
      { value: "plains", label: "Plains" },
    ],
  },
  { key: "ridgeCount", label: "Ridge Count", type: "number", default: 3, min: 1, max: 8, step: 1, group: "shape" },
  { key: "roughness", label: "Roughness", type: "number", default: 0.35, min: 0, max: 1, step: 0.05, group: "shape" },
  { key: "elevationMin", label: "Elevation Min", type: "number", default: 0.4, min: 0, max: 1, step: 0.05, group: "shape" },
  { key: "elevationMax", label: "Elevation Max", type: "number", default: 0.7, min: 0, max: 1, step: 0.05, group: "shape" },
  { key: "noiseScale", label: "Noise Scale", type: "number", default: 2.0, min: 0.5, max: 8, step: 0.5, group: "shape" },
  { key: "jaggedness", label: "Jaggedness", type: "number", default: 0.3, min: 0, max: 1, step: 0.05, group: "shape" },
  {
    key: "renderStyle",
    label: "Render Style",
    type: "select",
    default: "solid",
    group: "style",
    options: [
      { value: "solid", label: "Solid" },
      { value: "contour", label: "Contour Lines" },
      { value: "hatched", label: "Hatched" },
    ],
  },
  { key: "contourCount", label: "Contour Lines", type: "number", default: 12, min: 4, max: 30, step: 1, group: "style" },
  { key: "hatchDensity", label: "Hatch Density", type: "number", default: 0.5, min: 0.1, max: 1.0, step: 0.05, group: "style" },
  { key: "subRangeCount", label: "Sub-range Layers", type: "number", default: 0, min: 0, max: 3, step: 1, group: "sub-range" },
  { key: "subRangeAmplitude", label: "Sub-range Amplitude", type: "number", default: 0.5, min: 0.1, max: 1.0, step: 0.05, group: "sub-range" },
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
  terrainType: "mountains" | "hills" | "plains";
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
  renderStyle: "solid" | "contour" | "hatched";
  contourCount: number;
  hatchDensity: number;
  subRangeCount: number;
  subRangeAmplitude: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const pp = preset?.category === "profile" ? (preset as ProfilePreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    terrainType: (properties.terrainType as "mountains" | "hills" | "plains") ?? "mountains",
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
    renderStyle: (properties.renderStyle as "solid" | "contour" | "hatched") ?? "solid",
    contourCount: (properties.contourCount as number) ?? 12,
    hatchDensity: (properties.hatchDensity as number) ?? 0.5,
    subRangeCount: (properties.subRangeCount as number) ?? 0,
    subRangeAmplitude: (properties.subRangeAmplitude as number) ?? 0.5,
    depthLane: (properties.depthLane as string) ?? "background",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

/**
 * Draw contour lines: horizontal lines at evenly-spaced elevations.
 * Lines follow the terrain edge — drawn as segments that hug the profile
 * silhouette rather than spanning the full width.
 */
function drawContourLines(
  ctx: CanvasRenderingContext2D,
  profilePoints: Array<{ px: number; py: number }>,
  baselineY: number,
  ridgeColor: string,
  contourCount: number,
  _bx: number,
  _width: number,
  _height: number,
  _by: number,
): void {
  // Find the topmost point (minimum Y in canvas coords)
  let minY = baselineY;
  for (const pt of profilePoints) {
    if (pt.py < minY) minY = pt.py;
  }

  const elevRange = baselineY - minY;
  if (elevRange < 4) return;

  const [cr, cg, cb] = parseHex(ridgeColor);
  const lineR = Math.max(0, cr - 45);
  const lineG = Math.max(0, cg - 45);
  const lineB = Math.max(0, cb - 45);

  ctx.save();
  ctx.strokeStyle = `rgba(${lineR},${lineG},${lineB},0.55)`;
  ctx.lineWidth = 0.8;

  for (let c = 1; c < contourCount; c++) {
    const contourY = minY + (elevRange * c) / contourCount;

    // Walk profile points and draw segments only where terrain is above this Y
    ctx.beginPath();
    let drawing = false;
    for (let j = 0; j < profilePoints.length; j++) {
      const pt = profilePoints[j]!;
      if (pt.py <= contourY) {
        // Terrain is above (or at) this contour level
        if (!drawing) {
          ctx.moveTo(pt.px, contourY);
          drawing = true;
        } else {
          ctx.lineTo(pt.px, contourY);
        }
      } else {
        // Terrain dropped below this contour — end segment
        if (drawing) {
          ctx.stroke();
          ctx.beginPath();
          drawing = false;
        }
      }
    }
    if (drawing) ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw hatching: diagonal parallel lines filling the ridge body, clipped to
 * the ridge shape. Denser on steep slopes (surface-normal edge marks added too).
 */
function drawHatching(
  ctx: CanvasRenderingContext2D,
  profilePoints: Array<{ px: number; py: number }>,
  baselineY: number,
  ridgeColor: string,
  hatchDensity: number,
  bx: number,
  width: number,
  height: number,
  by: number,
): void {
  if (profilePoints.length < 3) return;

  // Find topmost point
  let minY = baselineY;
  for (const pt of profilePoints) {
    if (pt.py < minY) minY = pt.py;
  }
  const elevRange = baselineY - minY;
  if (elevRange < 4) return;

  ctx.save();

  // Clip to ridge shape
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

  const [cr, cg, cb] = parseHex(ridgeColor);
  const lineR = Math.max(0, cr - 50);
  const lineG = Math.max(0, cg - 50);
  const lineB = Math.max(0, cb - 50);

  // --- Body hatching: diagonal parallel lines at ~45° ---
  const spacing = Math.max(3, Math.round(10 / hatchDensity));
  ctx.strokeStyle = `rgba(${lineR},${lineG},${lineB},0.35)`;
  ctx.lineWidth = 0.6;

  // Diagonal lines from top-left to bottom-right (slope = 1)
  const diagLen = width + (baselineY - minY);
  ctx.beginPath();
  for (let d = -diagLen; d < diagLen; d += spacing) {
    // Line from (bx + d, minY) going at 45° down-right
    const x0 = bx + d;
    const y0 = minY;
    const x1 = x0 + elevRange;
    const y1 = y0 + elevRange;
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
  }
  ctx.stroke();

  // --- Edge hatching: short marks perpendicular to surface at steep slopes ---
  ctx.strokeStyle = `rgba(${lineR},${lineG},${lineB},0.5)`;
  ctx.lineWidth = 0.7;
  const baseStride = Math.max(2, Math.round(6 / hatchDensity));

  for (let j = 1; j < profilePoints.length - 1; j++) {
    const prev = profilePoints[j - 1]!;
    const curr = profilePoints[j]!;
    const next = profilePoints[j + 1]!;

    const dx = next.px - prev.px;
    const dy = next.py - prev.py;
    const slope = Math.abs(dy / (dx || 1));

    // Only at steep slopes, and spaced by stride
    const slopeStride = Math.max(1, Math.round(baseStride / (0.2 + slope * 4)));
    if (j % slopeStride !== 0 || slope < 0.15) continue;

    const tangentLen = Math.sqrt(dx * dx + dy * dy);
    if (tangentLen < 0.5) continue;
    const nx = -dy / tangentLen;
    const ny = dx / tangentLen;

    const hatchLen = Math.min(elevRange * 0.3, 5 + slope * 20) * hatchDensity;

    ctx.beginPath();
    ctx.moveTo(curr.px, curr.py);
    ctx.lineTo(curr.px + nx * hatchLen, curr.py + ny * hatchLen);
    ctx.stroke();
  }

  ctx.restore();
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

    // Terrain mode: hills and plains get gentler noise (wider wavelength, lower amplitude)
    const terrainNoiseScaleMultiplier = p.terrainType === "hills" ? 0.4 : p.terrainType === "plains" ? 0.2 : 1.0;
    const terrainAmpMultiplier = p.terrainType === "hills" ? 0.45 : p.terrainType === "plains" ? 0.15 : 1.0;

    // Octave count scales with roughness: 1 at 0, 6 at 1
    const octaves = Math.max(1, Math.round(1 + p.roughness * 5));

    // Resolve depth lane once for all ridges
    const laneConfig = resolveDepthLane(p.depthLane);

    // Haze color for inter-ridge atmospheric effect
    const hazeHex = p.atmosphericMode === "ink-wash" ? "#E8DDD0" : "#B8C8D8";
    const [hazeR, hazeG, hazeB] = parseHex(hazeHex);

    // --- Sub-range detail ---
    // Draw secondary ridge systems behind the main range (rendered first, so they appear farther).
    if (p.subRangeCount > 0) {
      const subOctaves = Math.max(1, Math.round(1 + p.roughness * 3));

      for (let s = 0; s < p.subRangeCount; s++) {
        // Sub-ranges sit behind the main range: t values compressed into far zone (0–0.4)
        const subT = (p.subRangeCount - s) / (p.subRangeCount + 1) * 0.4;
        const easedSubT = applyDepthEasing(subT, p.depthEasing);

        // Amplitude is a fraction of main range, scaled by subRangeAmplitude property
        const subAmpScale = p.subRangeAmplitude * (0.15 + 0.1 * (1 - easedSubT)) * terrainAmpMultiplier;
        const subBaselineNorm = p.elevationMin + (p.elevationMax - p.elevationMin) * easedSubT * 0.7;
        const subBaselineY = by + height * subBaselineNorm;
        const subElevRange = subBaselineNorm * height * subAmpScale;

        // Unique seed per sub-range
        const subNoise = createFractalNoise(p.seed + 50000 + s * 6131, subOctaves, 2.0, 0.5);

        // Color: lighter/hazier than the farthest main ridge
        let subColor: string;
        if (p.atmosphericMode !== "none") {
          subColor = applyAtmosphericDepth(p.backgroundRidgeColor, subT, p.atmosphericMode);
        } else {
          subColor = lighten(p.backgroundRidgeColor, (1 - subT) * p.depthValueShift * 0.7);
        }

        // Build sub-range profile
        const subStep = Math.max(1, Math.floor(width / 300));
        const subPoints: Array<{ px: number; py: number }> = [];
        for (let px = 0; px <= width; px += subStep) {
          const nx = (px / width) * p.noiseScale * terrainNoiseScaleMultiplier * 1.5;
          const nv = Math.min(1, Math.max(0, subNoise(nx, s * 7 + 100)));
          subPoints.push({ px: bx + px, py: subBaselineY - nv * subElevRange });
        }

        // Draw sub-range fill (slightly transparent to show depth separation)
        ctx.globalAlpha = 0.6 + subT * 0.3;
        ctx.fillStyle = subColor;
        ctx.beginPath();
        for (let j = 0; j < subPoints.length; j++) {
          const pt = subPoints[j]!;
          if (j === 0) ctx.moveTo(pt.px, pt.py);
          else ctx.lineTo(pt.px, pt.py);
        }
        ctx.lineTo(bx + width, by + height);
        ctx.lineTo(bx, by + height);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

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
      // terrainAmpMultiplier suppresses amplitude for hills/plains modes.
      const ampScale = (0.35 + 0.15 * (1 - easedT)) * terrainAmpMultiplier;
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
        const nx = (px / width) * p.noiseScale * terrainNoiseScaleMultiplier;
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

        // Vertical volume gradient: transparent at peaks, significantly darker at base.
        // Target ~30% value range (up from ~10%) to show internal ridge body shading.
        const volGrad = ctx.createLinearGradient(0, minY, 0, by + height);
        volGrad.addColorStop(0, "rgba(0,0,0,0)");
        volGrad.addColorStop(0.4, `rgba(0,0,0,${0.06 + t * 0.06})`);
        volGrad.addColorStop(1, `rgba(0,0,0,${0.22 + t * 0.10})`);
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

      // --- Contour / Hatching overlay ---
      if (p.renderStyle === "contour") {
        drawContourLines(ctx, profilePoints, baselineY, ridgeColor, p.contourCount, bx, width, height, by);
      } else if (p.renderStyle === "hatched") {
        drawHatching(ctx, profilePoints, baselineY, ridgeColor, p.hatchDensity, bx, width, height, by);
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
