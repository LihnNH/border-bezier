/**
 * border-bezier.module.js
 * ES module adapter for border-bezier.js.
 */

import "./border-bezier.js";

const api = globalThis.BorderBezier;

export const {
  BorderBezier,
  buildBorderBezierPath,
  mountBorderBezier,
  mountAllBorderBezier,
  refreshAllBorderBezier
} = api;

export default api;
