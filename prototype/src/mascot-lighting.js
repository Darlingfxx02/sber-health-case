// Chromium's two-point radial-gradient renderer loses the light colour bands
// for near-coincident centres (reproduced at fx=.0001, fy=.00004, r=1).
// Skip that numerically unstable neighbourhood. At the largest authored radius
// this is less than 0.46 SVG units, so the neutral artwork stays unchanged.
export const MIN_FOCAL_DISTANCE=.005;
export function stableGradientFocus(fx,fy){
  if(!Number.isFinite(fx)||!Number.isFinite(fy)||Math.hypot(fx,fy)<MIN_FOCAL_DISTANCE)return {fx:0,fy:0};
  return {fx,fy};
}
