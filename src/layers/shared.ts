import type { LayerPropertySchema, LayerProperties } from "@genart-dev/core";

/** Create default properties from a schema array. */
export function createDefaultProps(properties: LayerPropertySchema[]): LayerProperties {
  const props: LayerProperties = {};
  for (const schema of properties) {
    props[schema.key] = schema.default;
  }
  return props;
}
