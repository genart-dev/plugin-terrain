import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { parseHex } from "../shared/color-utils.js";
import { createDepthLaneProperty } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { SkyPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const SKY_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Time of Day",
    type: "select",
    default: "noon",
    group: "preset",
    options: [
      { value: "dawn", label: "Dawn" },
      { value: "noon", label: "Noon" },
      { value: "golden-hour", label: "Golden Hour" },
      { value: "dusk", label: "Dusk" },
      { value: "night", label: "Night" },
    ],
  },
  { key: "zenithColor", label: "Zenith Color", type: "color", default: "#1E3A6E", group: "colors" },
  { key: "horizonColor", label: "Horizon Color", type: "color", default: "#87CEEB", group: "colors" },
  { key: "hazeColor", label: "Haze Color", type: "color", default: "#B0D4E8", group: "colors" },
  { key: "hazeIntensity", label: "Haze Intensity", type: "number", default: 0.15, min: 0, max: 1, step: 0.05, group: "haze" },
  { key: "hazePosition", label: "Haze Position", type: "number", default: 0.9, min: 0, max: 1, step: 0.05, group: "haze" },
  { key: "hazeWidth", label: "Haze Width", type: "number", default: 0.1, min: 0.01, max: 0.5, step: 0.01, group: "haze" },
  { key: "horizonLine", label: "Horizon Line", type: "number", default: 1.0, min: 0.3, max: 1.0, step: 0.05, group: "layout" },
  createDepthLaneProperty("sky"),
];

function resolveProps(properties: LayerProperties): {
  zenithColor: string;
  horizonColor: string;
  hazeColor: string;
  hazeIntensity: number;
  hazePosition: number;
  hazeWidth: number;
  horizonLine: number;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const sky = preset?.category === "sky" ? (preset as SkyPreset) : undefined;

  return {
    zenithColor: (properties.zenithColor as string) || sky?.zenithColor || "#1E3A6E",
    horizonColor: (properties.horizonColor as string) || sky?.horizonColor || "#87CEEB",
    hazeColor: (properties.hazeColor as string) || sky?.hazeColor || "#B0D4E8",
    hazeIntensity: (properties.hazeIntensity as number) ?? sky?.hazeIntensity ?? 0.15,
    hazePosition: (properties.hazePosition as number) ?? sky?.hazePosition ?? 0.9,
    hazeWidth: (properties.hazeWidth as number) ?? sky?.hazeWidth ?? 0.1,
    horizonLine: (properties.horizonLine as number) ?? 1.0,
  };
}

export const skyLayerType: LayerTypeDefinition = {
  typeId: "terrain:sky",
  displayName: "Sky",
  icon: "sky",
  category: "draw",
  properties: SKY_PROPERTIES,
  propertyEditorId: "terrain:sky-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(SKY_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const top = bounds.y;
    const bottom = bounds.y + bounds.height * p.horizonLine;
    const width = bounds.width;

    // Main zenith-to-horizon gradient
    const grad = ctx.createLinearGradient(bounds.x, top, bounds.x, bottom);
    grad.addColorStop(0, p.zenithColor);
    grad.addColorStop(1, p.horizonColor);

    ctx.fillStyle = grad;
    ctx.fillRect(bounds.x, top, width, bottom - top);

    // Haze band overlay
    if (p.hazeIntensity > 0) {
      const hazeY = top + (bottom - top) * p.hazePosition;
      const hazeSpread = (bottom - top) * p.hazeWidth;
      const [hr, hg, hb] = parseHex(p.hazeColor);

      const hazeGrad = ctx.createLinearGradient(bounds.x, hazeY - hazeSpread, bounds.x, hazeY + hazeSpread);
      hazeGrad.addColorStop(0, `rgba(${hr},${hg},${hb},0)`);
      hazeGrad.addColorStop(0.5, `rgba(${hr},${hg},${hb},${p.hazeIntensity})`);
      hazeGrad.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);

      ctx.fillStyle = hazeGrad;
      ctx.fillRect(bounds.x, hazeY - hazeSpread, width, hazeSpread * 2);
    }
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown sky preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
