import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { mulberry32 } from "../shared/prng.js";
import { parseHex, lighten } from "../shared/color-utils.js";
import { createFractalNoise } from "../shared/noise.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { SnowfieldPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const SNOWFIELD_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Snow Type",
    type: "select",
    default: "fresh-powder",
    group: "preset",
    options: [
      { value: "fresh-powder", label: "Fresh Powder" },
      { value: "wind-swept", label: "Wind Swept" },
      { value: "sun-crust", label: "Sun Crust" },
      { value: "deep-snow", label: "Deep Snow" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  { key: "snowColor", label: "Snow Color", type: "color", default: "#F0F4F8", group: "colors" },
  { key: "shadowColor", label: "Shadow Color", type: "color", default: "#A8B8D0", group: "colors" },
  { key: "driftIntensity", label: "Drift Intensity", type: "number", default: 0.5, min: 0, max: 1, step: 0.05, group: "snow" },
  { key: "sparkleIntensity", label: "Sparkle", type: "number", default: 0.3, min: 0, max: 1, step: 0.05, group: "snow" },
  { key: "coverageTop", label: "Coverage Top", type: "number", default: 0.5, min: 0, max: 1, step: 0.05, group: "layout" },
  { key: "coverageBottom", label: "Coverage Bottom", type: "number", default: 1.0, min: 0, max: 1, step: 0.05, group: "layout" },
  createDepthLaneProperty("ground-plane"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  snowColor: string;
  shadowColor: string;
  driftIntensity: number;
  sparkleIntensity: number;
  coverageTop: number;
  coverageBottom: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const sp = preset?.category === "snowfield" ? (preset as SnowfieldPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    snowColor: (properties.snowColor as string) || sp?.snowColor || "#F0F4F8",
    shadowColor: (properties.shadowColor as string) || sp?.shadowColor || "#A8B8D0",
    driftIntensity: (properties.driftIntensity as number) ?? sp?.driftIntensity ?? 0.5,
    sparkleIntensity: (properties.sparkleIntensity as number) ?? sp?.sparkleIntensity ?? 0.3,
    coverageTop: (properties.coverageTop as number) ?? sp?.coverageTop ?? 0.5,
    coverageBottom: (properties.coverageBottom as number) ?? sp?.coverageBottom ?? 1.0,
    depthLane: (properties.depthLane as string) ?? "ground-plane",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

// Build the snow surface wave profile (STEPS+1 y-values, left to right)
// References: amplitude 2-4% canvas height, wavelength 15-40% canvas width
function buildSurfaceProfile(
  preset: string | undefined,
  driftIntensity: number,
  top: number,
  coverH: number,
  canvasW: number,
  canvasH: number,
  seed: number,
): number[] {
  const STEPS = 120;
  // Wide-wavelength noise (frequency 0.5-2.0 cycles across canvas width)
  const noise = createFractalNoise(seed + 600, 3, 1.8, 0.45);
  const profile: number[] = [];

  const isWindSwept = preset === "wind-swept";
  const isSunCrust = preset === "sun-crust";

  // Amplitude: 2-4% of canvas height (references: mid-distance open field)
  // Wind-swept: very low amplitude, near-flat surface with streaking
  // Sun-crust: slightly higher amplitude with sharper crests
  const baseAmp = isWindSwept
    ? canvasH * 0.010 * (0.5 + driftIntensity * 0.5)  // near-flat
    : isSunCrust
      ? canvasH * 0.040 * (0.5 + driftIntensity)       // slightly more pronounced, sharper
      : canvasH * 0.025 * (0.5 + driftIntensity);       // standard 2-4% of canvas height

  // Noise frequency: long wavelength (0.5-1.5 full cycles across canvas)
  const freq = isWindSwept ? 0.5 : isSunCrust ? 1.8 : 1.0;

  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    // Sample at y=0.5 to avoid the degenerate y=0 axis where value noise
    // returns exactly 0.5 at integer x-coordinates, collapsing profile amplitude.
    const nv = noise(t * freq, 0.5);
    profile.push(top + baseAmp * (1 - 2 * nv));
  }

  return profile;
}

export const snowfieldLayerType: LayerTypeDefinition = {
  typeId: "terrain:snowfield",
  displayName: "Snow Field",
  icon: "snowfield",
  category: "draw",
  properties: SNOWFIELD_PROPERTIES,
  propertyEditorId: "terrain:snowfield-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(SNOWFIELD_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const rng = mulberry32(p.seed);
    const w = bounds.width;
    const h = bounds.height;

    // Apply atmospheric depth
    let snowColor = p.snowColor;
    let shadowColor = p.shadowColor;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      if (laneConfig) {
        snowColor = applyAtmosphericDepth(snowColor, laneConfig.depth, p.atmosphericMode);
        shadowColor = applyAtmosphericDepth(shadowColor, laneConfig.depth, p.atmosphericMode);
      }
    }

    const [snR, snG, snB] = parseHex(snowColor);
    const [shR, shG, shB] = parseHex(shadowColor);
    const top = bounds.y + p.coverageTop * h;
    const bottom = bounds.y + p.coverageBottom * h;
    const coverH = bottom - top;

    if (coverH <= 2) return;

    const presetId = properties.preset as string | undefined;
    const STEPS = 120;

    // Build snow surface wave profile
    const surfaceProfile = buildSurfaceProfile(
      presetId, p.driftIntensity, top, coverH, w, h, p.seed,
    );

    // --- Fill the snow body from surface profile down to coverageBottom ---
    ctx.fillStyle = snowColor;
    ctx.beginPath();
    ctx.moveTo(bounds.x, bottom);
    for (let i = 0; i <= STEPS; i++) {
      ctx.lineTo(bounds.x + (i / STEPS) * w, surfaceProfile[i]!);
    }
    ctx.lineTo(bounds.x + w, bottom);
    ctx.closePath();
    ctx.fill();

    // --- Clip all subsequent passes to the snow body ---
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(bounds.x, bottom);
    for (let i = 0; i <= STEPS; i++) {
      ctx.lineTo(bounds.x + (i / STEPS) * w, surfaceProfile[i]!);
    }
    ctx.lineTo(bounds.x + w, bottom);
    ctx.closePath();
    ctx.clip();

    // --- Drift shadow system ---
    // Shadow depth at each x is proportional to how much lower that surface point is
    // relative to the highest crest across the profile.
    // References: Homer shadows are continuous cool washes that pool in valleys.
    // Approach: depth-map — no crest-detection needed. Works for any noise shape.
    const shadowAlpha = 0.35 + p.driftIntensity * 0.25; // 0.35–0.60
    const shadowDepth = coverH * 0.22; // shadow fades ~22% of cover height into snow body
    const minProfileY = Math.min(...surfaceProfile); // global crest = y-minimum
    const maxProfileY = Math.max(...surfaceProfile); // deepest valley = y-maximum
    const profileRange = maxProfileY - minProfileY;

    if (profileRange > 4) { // only render if there's meaningful surface relief
      const stepW = w / STEPS;
      for (let i = 0; i < STEPS; i++) {
        const surfY = surfaceProfile[i]!;
        const depth = (surfY - minProfileY) / profileRange; // 0=crest, 1=valley
        if (depth < 0.12) continue; // skip near-crest positions

        const alpha = depth * shadowAlpha;
        const x = bounds.x + (i / STEPS) * w;

        // Vertical gradient: shadow peaks at the surface and fades downward into the snow
        const vGrad = ctx.createLinearGradient(x, surfY, x, surfY + shadowDepth);
        vGrad.addColorStop(0.0, `rgba(${shR},${shG},${shB},${alpha})`);
        vGrad.addColorStop(1.0, `rgba(${shR},${shG},${shB},0)`);
        ctx.fillStyle = vGrad;
        ctx.fillRect(x, surfY, stepW + 0.5, shadowDepth);
      }
    }

    // --- Wind-swept horizontal streaks ---
    if (presetId === "wind-swept" && p.driftIntensity > 0.1) {
      const streakCount = Math.round(8 + p.driftIntensity * 20);
      for (let i = 0; i < streakCount; i++) {
        const sy = top + rng() * coverH;
        const streakAlpha = (0.06 + rng() * 0.10) * p.driftIntensity;
        const streakLen = w * (0.3 + rng() * 0.6);
        const streakX = bounds.x + rng() * (w - streakLen);
        ctx.strokeStyle = `rgba(${shR},${shG},${shB},${streakAlpha})`;
        ctx.lineWidth = 0.5 + rng() * 1.0;
        ctx.beginPath();
        ctx.moveTo(streakX, sy + (rng() - 0.5) * 2);
        ctx.lineTo(streakX + streakLen, sy + (rng() - 0.5) * 2);
        ctx.stroke();
      }
    }

    // --- Sparkle highlights (area-level luminance boost on crest tops) ---
    // References: area brightening on upper-facing crest zones, NOT random scatter.
    // Concentrate on crest positions (profile local minima = surface peaks in canvas-y space).
    if (p.sparkleIntensity > 0) {
      const lightSnow = lighten(snowColor, 0.12);
      const [lR, lG, lB] = parseHex(lightSnow);

      // Find local minima in profile (surface crests — lowest y value = highest visually)
      for (let i = 1; i < STEPS; i++) {
        const prev = surfaceProfile[i - 1]!;
        const curr = surfaceProfile[i]!;
        const next = surfaceProfile[i + 1]!;
        if (curr < prev && curr < next) {
          // local minimum = surface crest
          const crestX = bounds.x + (i / STEPS) * w;
          const crestY = curr;
          const crestW = w / STEPS * 6;

          // Gentle luminance boost across crest zone
          const crestAlpha = (0.15 + rng() * 0.20) * p.sparkleIntensity;
          const crestGrad = ctx.createLinearGradient(crestX, crestY, crestX, crestY + coverH * 0.06);
          crestGrad.addColorStop(0.0, `rgba(${lR},${lG},${lB},${crestAlpha})`);
          crestGrad.addColorStop(1.0, `rgba(${lR},${lG},${lB},0)`);
          ctx.fillStyle = crestGrad;
          ctx.fillRect(crestX - crestW * 0.5, crestY, crestW, coverH * 0.06);

          // Sun-crust: add sharp bright crest lip
          if (presetId === "sun-crust") {
            ctx.strokeStyle = `rgba(255,255,255,${0.4 * p.sparkleIntensity})`;
            ctx.lineWidth = 1.0 + rng() * 1.0;
            ctx.beginPath();
            ctx.moveTo(crestX - crestW * 0.5, crestY);
            ctx.lineTo(crestX + crestW * 0.5, crestY);
            ctx.stroke();
          }
        }
      }

      // A sparse scattering of bright dots on the brightest crest areas
      const dotCount = Math.round(p.sparkleIntensity * 60 * (w / 800));
      for (let i = 0; i < dotCount; i++) {
        // Find a random x, then look up the surface y at that x
        const sx = bounds.x + rng() * w;
        const profileIdx = Math.min(STEPS, Math.round(((sx - bounds.x) / w) * STEPS));
        const crestY = surfaceProfile[profileIdx] ?? top;
        // Only place sparkles within ~5% of coverH above the surface
        const sy = crestY - rng() * coverH * 0.04;
        if (sy < top || sy > bottom) continue;
        const dotAlpha = (0.25 + rng() * 0.45) * p.sparkleIntensity;
        ctx.fillStyle = `rgba(255,255,255,${dotAlpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.5 + rng() * 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown snowfield preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
