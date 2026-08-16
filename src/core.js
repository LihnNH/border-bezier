export const DEFAULT_RADIUS = 24;
export const DEFAULT_SMOOTHING = 1;

const SUPPORTED_LENGTH =
  /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))(px|%|rem|em|vw|vh|vmin|vmax)?$/i;

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

const mix = (from, to, amount) => from + (to - from) * amount;

const round = value => {
  const rounded = Number(value.toFixed(3));
  return Object.is(rounded, -0) ? 0 : rounded;
};

const finiteDimension = value => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const finiteOr = (value, fallback) => {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
};

function browserMetrics(element, width, height) {
  const view = element?.ownerDocument?.defaultView ?? globalThis.window;
  const document = element?.ownerDocument ?? globalThis.document;
  const getStyles = view?.getComputedStyle?.bind(view);
  const rootFontSize = getStyles && document?.documentElement
    ? finiteOr(getStyles(document.documentElement).fontSize, 16)
    : 16;
  const fontSize = getStyles && element
    ? finiteOr(getStyles(element).fontSize, rootFontSize)
    : rootFontSize;

  return {
    rootFontSize,
    fontSize,
    viewportWidth: finiteOr(view?.innerWidth, width),
    viewportHeight: finiteOr(view?.innerHeight, height)
  };
}

/**
 * Resolve a numeric radius or a supported CSS length into CSS pixels.
 */
export function resolveBorderBezierRadius(rawRadius, options = {}) {
  const width = finiteDimension(options.width);
  const height = finiteDimension(options.height);
  const fallback = Number.isFinite(Number(options.fallback))
    ? Number(options.fallback)
    : DEFAULT_RADIUS;

  if (typeof rawRadius === "number") {
    return Number.isFinite(rawRadius) ? rawRadius : fallback;
  }

  const match = String(rawRadius ?? "").trim().match(SUPPORTED_LENGTH);
  if (!match) return fallback;

  const value = Number(match[1]);
  const unit = (match[2] || "px").toLowerCase();
  const detected = browserMetrics(options.element, width, height);
  const rootFontSize = finiteOr(options.rootFontSize, detected.rootFontSize);
  const fontSize = finiteOr(options.fontSize, detected.fontSize);
  const viewportWidth = finiteOr(options.viewportWidth, detected.viewportWidth);
  const viewportHeight = finiteOr(
    options.viewportHeight,
    detected.viewportHeight
  );
  const basis = Math.min(width, height);

  switch (unit) {
    case "%":
      return basis * value / 100;
    case "rem":
      return rootFontSize * value;
    case "em":
      return fontSize * value;
    case "vw":
      return viewportWidth * value / 100;
    case "vh":
      return viewportHeight * value / 100;
    case "vmin":
      return Math.min(viewportWidth, viewportHeight) * value / 100;
    case "vmax":
      return Math.max(viewportWidth, viewportHeight) * value / 100;
    default:
      return value;
  }
}

/**
 * Build the SVG path data used by `clip-path: path()`.
 */
export function buildBorderBezierPath(options = {}) {
  const width = finiteDimension(options.width);
  const height = finiteDimension(options.height);

  if (!width || !height) return "M 0 0 Z";

  const resolvedRadius = resolveBorderBezierRadius(
    options.radius ?? DEFAULT_RADIUS,
    { ...options, width, height }
  );
  const parsedSmoothing = Number(options.smoothing ?? DEFAULT_SMOOTHING);
  const radius = clamp(
    Number.isFinite(resolvedRadius) ? resolvedRadius : DEFAULT_RADIUS,
    0,
    Math.min(width, height) / 2
  );
  const smoothing = clamp(
    Number.isFinite(parsedSmoothing) ? parsedSmoothing : DEFAULT_SMOOTHING,
    0,
    1
  );
  const circleHandle = 0.552284749831;
  const continuousHandle = 0.775;
  const handle = mix(circleHandle, continuousHandle, smoothing);
  const inverseHandle = 1 - handle;

  const topRight = [
    "C",
    round(width - radius + handle * radius), 0,
    round(width), round(inverseHandle * radius),
    round(width), round(radius)
  ].join(" ");

  const bottomRight = [
    "C",
    round(width), round(height - radius + handle * radius),
    round(width - radius + handle * radius), round(height),
    round(width - radius), round(height)
  ].join(" ");

  const bottomLeft = [
    "C",
    round(radius - handle * radius), round(height),
    0, round(height - radius + handle * radius),
    0, round(height - radius)
  ].join(" ");

  const topLeft = [
    "C",
    0, round(radius - handle * radius),
    round(radius - handle * radius), 0,
    round(radius), 0
  ].join(" ");

  return [
    "M", round(radius), 0,
    "H", round(width - radius),
    topRight,
    "V", round(height - radius),
    bottomRight,
    "H", round(radius),
    bottomLeft,
    "V", round(radius),
    topLeft,
    "Z"
  ].join(" ");
}
