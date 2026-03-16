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
  { key: "ridgeCount", label: "Ridge Count", type: "number", default: 3, min: 1, max: 20, step: 1, group: "shape" },
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
  { key: "contourCount", label: "Contour Lines", type: "number", default: 12, min: 4, max: 60, step: 1, group: "style" },
  { key: "contourFollow", label: "Contour Follow", type: "number", default: 0.5, min: 0, max: 1, step: 0.05, group: "style" },
  { key: "contourPerturbation", label: "Contour Wobble", type: "number", default: 0.3, min: 0, max: 1, step: 0.05, group: "style" },
  { key: "hatchDensity", label: "Hatch Density", type: "number", default: 0.5, min: 0.1, max: 1.0, step: 0.05, group: "style" },
  { key: "noiseComplexity", label: "Noise Complexity", type: "number", default: 0.5, min: 0, max: 1, step: 0.05, group: "shape" },
  {
    key: "baseEdge",
    label: "Base Edge",
    type: "select",
    default: "flat",
    group: "shape",
    options: [
      { value: "flat", label: "Flat" },
      { value: "natural", label: "Natural" },
      { value: "jagged", label: "Jagged" },
      { value: "waterline", label: "Waterline" },
    ],
  },
  { key: "baseEdgeAmount", label: "Base Edge Amount", type: "number", default: 0.5, min: 0, max: 1, step: 0.05, group: "shape" },
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
  contourFollow: number;
  contourPerturbation: number;
  hatchDensity: number;
  noiseComplexity: number;
  baseEdge: "flat" | "natural" | "jagged" | "waterline";
  baseEdgeAmount: number;
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
    contourFollow: (properties.contourFollow as number) ?? 0.5,
    contourPerturbation: (properties.contourPerturbation as number) ?? 0.3,
    hatchDensity: (properties.hatchDensity as number) ?? 0.5,
    noiseComplexity: (properties.noiseComplexity as number) ?? 0.5,
    baseEdge: (properties.baseEdge as "flat" | "natural" | "jagged" | "waterline") ?? "flat",
    baseEdgeAmount: (properties.baseEdgeAmount as number) ?? 0.5,
    subRangeCount: (properties.subRangeCount as number) ?? 0,
    subRangeAmplitude: (properties.subRangeAmplitude as number) ?? 0.5,
    depthLane: (properties.depthLane as string) ?? "background",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

/**
 * Draw surface-following contour lines.
 *
 * Each contour line is positioned as a fraction between the terrain surface
 * and the baseline at every x position, so lines naturally curve with the
 * terrain shape. `followFactor` blends between this surface-following
 * position and a flat horizontal level.
 *
 * At high contourCount (40+) the densely packed lines create a "plastic
 * landscape" fill effect (Ref B).
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
  followFactor: number = 0.5,
  perturbation: number = 0.3,
  seed: number = 0,
): void {
  let minY = baselineY;
  for (const pt of profilePoints) {
    if (pt.py < minY) minY = pt.py;
  }

  const elevRange = baselineY - minY;
  if (elevRange < 4) return;

  const [cr, cg, cb] = parseHex(ridgeColor);
  // Auto-contrast: on dark fills, draw lighter lines; on light fills, draw much darker
  const brightness = (cr + cg + cb) / 3;
  const shift = brightness < 100 ? 60 : -60;
  const lineR = Math.max(0, Math.min(255, cr + shift));
  const lineG = Math.max(0, Math.min(255, cg + shift));
  const lineB = Math.max(0, Math.min(255, cb + shift));

  // Perturbation noise
  const perturbNoise = perturbation > 0.01
    ? createFractalNoise(seed + 8888, 2, 2.0, 0.5)
    : null;

  const isDense = contourCount >= 30;

  ctx.save();

  // Clip to ridge shape so lines don't draw outside
  ctx.beginPath();
  for (let j = 0; j < profilePoints.length; j++) {
    const pt = profilePoints[j]!;
    if (j === 0) ctx.moveTo(pt.px, pt.py);
    else ctx.lineTo(pt.px, pt.py);
  }
  ctx.lineTo(profilePoints[profilePoints.length - 1]!.px, baselineY);
  ctx.lineTo(profilePoints[0]!.px, baselineY);
  ctx.closePath();
  ctx.clip();

  for (let c = 1; c < contourCount; c++) {
    const cFrac = c / contourCount; // 0=near surface, 1=near baseline

    // Horizontal contour level (the "flat" position)
    const horizontalY = minY + elevRange * cFrac;

    // Fade out near the baseline for natural ending (last 30% of depth)
    const baseFade = cFrac > 0.7 ? 1 - (cFrac - 0.7) / 0.3 : 1;

    // Line style
    if (isDense) {
      const alpha = (0.35 + (1 - cFrac) * 0.35) * baseFade;
      ctx.strokeStyle = `rgba(${lineR},${lineG},${lineB},${alpha})`;
      ctx.lineWidth = (0.5 + (1 - cFrac) * 0.5) * baseFade;
    } else {
      const alpha = 0.75 * baseFade;
      ctx.strokeStyle = `rgba(${lineR},${lineG},${lineB},${alpha})`;
      ctx.lineWidth = (1.0 + (1 - cFrac) * 0.6) * baseFade;
    }

    // Perturbation amplitude scales with depth and elevation range
    const perturbAmp = perturbation * elevRange * 0.03 * (0.5 + cFrac * 0.5);

    ctx.beginPath();
    let started = false;
    for (let j = 0; j < profilePoints.length; j++) {
      const pt = profilePoints[j]!;
      const surfaceY = pt.py;
      const localDepth = baselineY - surfaceY;

      if (localDepth < 2) {
        if (started) { ctx.stroke(); ctx.beginPath(); started = false; }
        continue;
      }

      // Surface-following: offset from surface by a constant fraction of
      // the global elevation range, so lines wrap around peaks evenly.
      const surfaceFollowY = surfaceY + elevRange * cFrac;

      // Near the surface (small cFrac), lines hug the ridgeline closely.
      // Deeper into the body (large cFrac), blend toward horizontal.
      // This makes peaks look natural while bases stay structured.
      const depthFollow = followFactor + (1 - followFactor) * (1 - cFrac);
      let lineY = horizontalY * (1 - depthFollow) + surfaceFollowY * depthFollow;

      // Add wobble
      if (perturbNoise) {
        const pxNorm = (pt.px - profilePoints[0]!.px) / (_width || 1);
        lineY += (perturbNoise(pxNorm * 5, c * 3.7) - 0.5) * perturbAmp * 2;
      }

      if (!started) {
        ctx.moveTo(pt.px, lineY);
        started = true;
      } else {
        ctx.lineTo(pt.px, lineY);
      }
    }
    if (started) ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw surface-normal hatching: short marks perpendicular to the terrain
 * slope, radiating inward from the surface. Density varies with steepness
 * and depth. At each surface point, multiple marks stack downward into the
 * body along the inward normal — like cross-section lines of the terrain form.
 * Target: Ref D middle-left dense line-work appearance.
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
  const brightness = (cr + cg + cb) / 3;
  const lineR = brightness < 100 ? Math.min(255, cr + 50) : Math.max(0, cr - 40);
  const lineG = brightness < 100 ? Math.min(255, cg + 50) : Math.max(0, cg - 40);
  const lineB = brightness < 100 ? Math.min(255, cb + 50) : Math.max(0, cb - 40);

  // Surface-normal hatching: at each profile point, draw a line from
  // the surface straight down (perpendicular to slope) into the body.
  // This creates the "cross-section" line effect.
  const stride = Math.max(1, Math.round(3 / hatchDensity));

  for (let j = 1; j < profilePoints.length - 1; j += stride) {
    const prev = profilePoints[j - 1]!;
    const curr = profilePoints[j]!;
    const next = profilePoints[Math.min(j + 1, profilePoints.length - 1)]!;

    const dx = next.px - prev.px;
    const dy = next.py - prev.py;
    const tangentLen = Math.sqrt(dx * dx + dy * dy);
    if (tangentLen < 0.5) continue;

    // Two candidate normals to the surface tangent
    const n1x = -dy / tangentLen;
    const n1y = dx / tangentLen;
    // Pick the one pointing inward (toward baseline = positive Y direction)
    const inwardNx = n1y > 0 ? n1x : -n1x;
    const inwardNy = n1y > 0 ? n1y : -n1y;

    const slope = Math.abs(dy / (dx || 1));

    // How deep is the ridge body at this point
    const depthToBase = baselineY - curr.py;
    if (depthToBase < 3) continue;

    // Draw a single hatch line from the surface inward
    // Length: proportional to local depth, slope adds emphasis, capped to avoid rain-like lines
    const rawLen = Math.min(depthToBase * 0.5, elevRange * 0.35) * (0.3 + slope * 0.7);
    const hatchLen = Math.min(rawLen, 30 * hatchDensity);
    if (hatchLen < 2) continue;

    const alpha = 0.25 + slope * 0.35;
    ctx.strokeStyle = `rgba(${lineR},${lineG},${lineB},${Math.min(0.6, alpha)})`;
    ctx.lineWidth = 0.5 + slope * 0.5;

    ctx.beginPath();
    ctx.moveTo(curr.px, curr.py);
    ctx.lineTo(curr.px + inwardNx * hatchLen, curr.py + inwardNy * hatchLen);
    ctx.stroke();
  }

  // Second pass: body fill with horizontal-ish depth marks at intervals
  // These create the cross-hatching density effect
  const depthLayers = Math.max(3, Math.round(8 * hatchDensity));
  const bodyStride = Math.max(2, Math.round(5 / hatchDensity));

  for (let d = 1; d <= depthLayers; d++) {
    const depthFrac = d / (depthLayers + 1);
    const alpha = (0.15 + (1 - depthFrac) * 0.2);
    ctx.strokeStyle = `rgba(${lineR},${lineG},${lineB},${alpha})`;
    ctx.lineWidth = 0.4 + (1 - depthFrac) * 0.3;

    ctx.beginPath();
    let started = false;
    for (let j = 0; j < profilePoints.length; j += bodyStride) {
      const pt = profilePoints[j]!;
      const localDepth = baselineY - pt.py;
      if (localDepth < 3) {
        if (started) { ctx.stroke(); ctx.beginPath(); started = false; }
        continue;
      }

      // Position: surface + fraction of depth to baseline
      const markY = pt.py + localDepth * depthFrac;

      // Get local tangent for mark direction
      const prevJ = Math.max(0, j - 1);
      const nextJ = Math.min(profilePoints.length - 1, j + 1);
      const tdx = profilePoints[nextJ]!.px - profilePoints[prevJ]!.px;
      const tdy = profilePoints[nextJ]!.py - profilePoints[prevJ]!.py;
      const tLen = Math.sqrt(tdx * tdx + tdy * tdy);
      if (tLen < 0.5) continue;

      // Normal to tangent
      const tnx = -tdy / tLen;
      const tny = tdx / tLen;
      // Make sure it points inward
      const inx = tny > 0 ? tnx : -tnx;
      const iny = tny > 0 ? tny : -tny;

      // Short mark along the normal direction at this depth
      const markLen = (4 + Math.abs(tdy / (tdx || 1)) * 8) * hatchDensity * (1 - depthFrac * 0.5);

      if (!started) {
        // Draw individual marks, not connected lines
      }
      started = false; // reset — we draw individual marks

      ctx.moveTo(pt.px - inx * markLen * 0.5, markY - iny * markLen * 0.5);
      ctx.lineTo(pt.px + inx * markLen * 0.5, markY + iny * markLen * 0.5);
    }
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Generate a bottom edge path for a ridge instead of flat horizontal lines.
 * "natural": gentle noise undulation; "jagged": sharp rocky edge;
 * "waterline": subtle wave at the water meeting point.
 */
function drawBaseEdge(
  ctx: CanvasRenderingContext2D,
  baseEdge: "flat" | "natural" | "jagged" | "waterline",
  amount: number,
  baselineY: number,
  bx: number,
  width: number,
  canvasBottom: number,
  seed: number,
  step: number,
): void {
  if (baseEdge === "flat") {
    ctx.lineTo(bx + width, canvasBottom);
    ctx.lineTo(bx, canvasBottom);
    return;
  }

  // Height of the base edge undulations (fraction of space below baseline)
  const belowSpace = canvasBottom - baselineY;
  const edgeHeight = belowSpace * amount * 0.6;
  if (edgeHeight < 2) {
    ctx.lineTo(bx + width, canvasBottom);
    ctx.lineTo(bx, canvasBottom);
    return;
  }

  // Generate noise for bottom edge
  const octaves = baseEdge === "jagged" ? 3 : baseEdge === "waterline" ? 1 : 2;
  const freq = baseEdge === "jagged" ? 4.0 : baseEdge === "waterline" ? 1.5 : 2.5;
  const baseNoise = createFractalNoise(seed + 33333, octaves, 2.0, 0.5);

  // Right edge: go down from last profile point to bottom-right area
  const edgeY = baselineY + belowSpace * 0.3; // base edge sits ~30% below baseline
  ctx.lineTo(bx + width, edgeY);

  // Walk right-to-left along the bottom edge with noise
  const edgeStep = Math.max(2, step);
  for (let px = width; px >= 0; px -= edgeStep) {
    const nx = (px / width) * freq;
    let nv = baseNoise(nx, seed * 0.01);

    if (baseEdge === "waterline") {
      // Subtle sine wave for waterline
      nv = 0.5 + Math.sin(px * 0.02 + seed) * 0.15 + (nv - 0.5) * 0.3;
    }

    const y = edgeY + (nv - 0.5) * edgeHeight;
    ctx.lineTo(bx + px, y);
  }

  // Close: connect back up to the first profile point's x position
  ctx.lineTo(bx, edgeY);
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
    const ridgeCount = Math.max(1, Math.min(20, p.ridgeCount));

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
        // Scale haze alpha down for high ridge counts to prevent washout
        const hazeScale = ridgeCount > 8 ? 8 / ridgeCount : 1;
        const hazeAlpha = (0.03 + (1 - t) * 0.05) * hazeScale;
        ctx.fillStyle = `rgba(${hazeR},${hazeG},${hazeB},${hazeAlpha})`;
        ctx.fillRect(bx, by, width, height);
      }

      // --- Per-ridge noise variation (W4) ---
      // Far ridges: smoother (fewer octaves, lower scale). Near ridges: rougher.
      const ridgeOctaves = Math.max(1, Math.round(octaves * (0.6 + t * 0.5)));
      const ridgeNoiseScale = p.noiseScale * terrainNoiseScaleMultiplier * (0.7 + t * 0.5);
      const ridgeRoughness = Math.min(1, p.roughness + (t - 0.5) * 0.2);

      // Primary noise
      const noise = createFractalNoise(p.seed + i * 7919, ridgeOctaves, 2.0, 0.5);

      // --- Composite noise layers (W3) ---
      // Secondary: 2-3x frequency, 25-40% amplitude — adds sub-peaks
      // Tertiary: 5-8x frequency, 10-15% amplitude — fine detail on near ridges
      const complexity = p.noiseComplexity;
      const secondaryNoise = complexity > 0.1
        ? createFractalNoise(p.seed + i * 4253 + 2000, Math.max(1, ridgeOctaves - 1), 2.0, 0.5)
        : null;
      const tertiaryNoise = complexity > 0.4 && t > 0.3
        ? createFractalNoise(p.seed + i * 6101 + 5000, 2, 2.0, 0.4)
        : null;

      const secondaryAmp = complexity * 0.35;
      const tertiaryAmp = complexity * 0.12 * Math.min(1, (t - 0.3) / 0.4);

      // Baseline Y: far ridges (t=0) sit high on screen (near horizon),
      // near ridges (t=1) sit lower (closer to bottom edge).
      const baselineNorm = p.elevationMin + (p.elevationMax - p.elevationMin) * easedT;
      const baselineY = by + height * baselineNorm;

      // Elevation amplitude: far ridges get dramatic peaks, near ridges moderate.
      // Use max of baseline-proportional and a minimum fraction of canvas height
      // to prevent far ridges from being paper-thin strips.
      const ampScale = (0.35 + 0.15 * (1 - easedT)) * terrainAmpMultiplier;
      const baselineAmp = baselineNorm * height * ampScale;
      const minAmp = height * 0.12 * terrainAmpMultiplier; // at least 12% of canvas
      const elevRange = Math.max(baselineAmp, minAmp);

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
        const nx = (px / width) * ridgeNoiseScale;
        let noiseVal = noise(nx, i * 10);

        // Composite noise layers
        if (secondaryNoise) {
          noiseVal += (secondaryNoise(nx * 2.5, i * 10 + 50) - 0.5) * secondaryAmp;
        }
        if (tertiaryNoise) {
          noiseVal += (tertiaryNoise(nx * 6, i * 10 + 100) - 0.5) * tertiaryAmp;
        }

        if (p.jaggedness > 0.3) {
          const hfNoise = createFractalNoise(p.seed + i * 3571 + 999, 2, 4.0, 0.3);
          noiseVal += hfNoise(nx * 3, i * 10) * p.jaggedness * 0.3;
        }

        noiseVal = Math.min(1, Math.max(0, noiseVal));

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
      drawBaseEdge(ctx, p.baseEdge, p.baseEdgeAmount, baselineY, bx, width, by + height, p.seed + i * 1337, step);
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

      // --- Valley shadowing (W5) ---
      // Column-wise shadow from nearest higher peak to the left.
      // Darkens valleys to create 3D illusion.
      if (ridgeCount > 1 || p.noiseComplexity > 0.2) {
        ctx.save();

        // Re-build ridge clip path
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

        // Compute shadow: for each column, track the highest peak to its left
        let peakY = profilePoints[0]!.py;
        const shadowStep = Math.max(1, step);
        ctx.fillStyle = "rgba(0,0,0,1)";

        for (let j = 0; j < profilePoints.length; j++) {
          const pt = profilePoints[j]!;
          // Update running peak (lowest Y = highest point)
          if (pt.py < peakY) {
            peakY = pt.py;
          }
          // Shadow depth: how far below the peak this point sits
          const shadowDepth = pt.py - peakY;
          if (shadowDepth > 2) {
            const maxShadow = elevRange * 0.4;
            const shadowAlpha = Math.min(0.18, (shadowDepth / maxShadow) * 0.18);
            ctx.globalAlpha = shadowAlpha;
            // Fill a thin column from the surface down to baseline
            const colWidth = j < profilePoints.length - 1
              ? profilePoints[j + 1]!.px - pt.px
              : shadowStep;
            ctx.fillRect(pt.px, pt.py, colWidth, baselineY - pt.py);
          }
          // Gradually relax peak to allow new valleys (decay)
          peakY += (baselineY - peakY) * 0.003;
        }

        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // --- Contour / Hatching overlay ---
      if (p.renderStyle === "contour") {
        drawContourLines(ctx, profilePoints, baselineY, ridgeColor, p.contourCount, bx, width, height, by, p.contourFollow, p.contourPerturbation, p.seed + i * 1111);
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
