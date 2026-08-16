import {
  BORDER_BEZIER_SELECTOR,
  BorderBezier,
  getBorderBezierInstance,
  mountAllBorderBezier,
  mountBorderBezier,
  observeBorderBezier,
  refreshAllBorderBezier,
  unmountAllBorderBezier,
  unmountBorderBezier
} from "./browser.js";
import {
  buildBorderBezierPath,
  DEFAULT_RADIUS,
  DEFAULT_SMOOTHING,
  resolveBorderBezierRadius
} from "./core.js";

export {
  BORDER_BEZIER_SELECTOR,
  BorderBezier,
  buildBorderBezierPath,
  DEFAULT_RADIUS,
  DEFAULT_SMOOTHING,
  getBorderBezierInstance,
  mountAllBorderBezier,
  mountBorderBezier,
  observeBorderBezier,
  refreshAllBorderBezier,
  resolveBorderBezierRadius,
  unmountAllBorderBezier,
  unmountBorderBezier
};

const api = Object.freeze({
  BORDER_BEZIER_SELECTOR,
  BorderBezier,
  buildBorderBezierPath,
  DEFAULT_RADIUS,
  DEFAULT_SMOOTHING,
  getBorderBezierInstance,
  mountAllBorderBezier,
  mountBorderBezier,
  observeBorderBezier,
  refreshAllBorderBezier,
  resolveBorderBezierRadius,
  unmountAllBorderBezier,
  unmountBorderBezier
});

export default api;
