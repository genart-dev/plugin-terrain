/** Depth easing curve types. */
export type DepthEasing = "linear" | "quadratic" | "cubic" | "exponential";

/** Map a linear t in [0,1] through the chosen easing curve. */
export function applyDepthEasing(t: number, easing: DepthEasing): number {
  switch (easing) {
    case "linear":
      return t;
    case "quadratic":
      return t * t;
    case "cubic":
      return t * t * t;
    case "exponential": {
      const k = 3;
      return (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
    }
  }
}
