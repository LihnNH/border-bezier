// src/core.js
var DEFAULT_RADIUS = 24;
var DEFAULT_SMOOTHING = 1;
var SUPPORTED_LENGTH = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))(px|%|rem|em|vw|vh|vmin|vmax)?$/i;
var clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
var mix = (from, to, amount) => from + (to - from) * amount;
var round = (value) => {
  const rounded = Number(value.toFixed(3));
  return Object.is(rounded, -0) ? 0 : rounded;
};
var finiteDimension = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};
var finiteOr = (value, fallback) => {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
};
function browserMetrics(element, width, height) {
  const view = element?.ownerDocument?.defaultView ?? globalThis.window;
  const document = element?.ownerDocument ?? globalThis.document;
  const getStyles = view?.getComputedStyle?.bind(view);
  const rootFontSize = getStyles && document?.documentElement ? finiteOr(getStyles(document.documentElement).fontSize, 16) : 16;
  const fontSize = getStyles && element ? finiteOr(getStyles(element).fontSize, rootFontSize) : rootFontSize;
  return {
    rootFontSize,
    fontSize,
    viewportWidth: finiteOr(view?.innerWidth, width),
    viewportHeight: finiteOr(view?.innerHeight, height)
  };
}
function resolveBorderBezierRadius(rawRadius, options = {}) {
  const width = finiteDimension(options.width);
  const height = finiteDimension(options.height);
  const fallback = Number.isFinite(Number(options.fallback)) ? Number(options.fallback) : DEFAULT_RADIUS;
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
function buildBorderBezierPath(options = {}) {
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
    round(width - radius + handle * radius),
    0,
    round(width),
    round(inverseHandle * radius),
    round(width),
    round(radius)
  ].join(" ");
  const bottomRight = [
    "C",
    round(width),
    round(height - radius + handle * radius),
    round(width - radius + handle * radius),
    round(height),
    round(width - radius),
    round(height)
  ].join(" ");
  const bottomLeft = [
    "C",
    round(radius - handle * radius),
    round(height),
    0,
    round(height - radius + handle * radius),
    0,
    round(height - radius)
  ].join(" ");
  const topLeft = [
    "C",
    0,
    round(radius - handle * radius),
    round(radius - handle * radius),
    0,
    round(radius),
    0
  ].join(" ");
  return [
    "M",
    round(radius),
    0,
    "H",
    round(width - radius),
    topRight,
    "V",
    round(height - radius),
    bottomRight,
    "H",
    round(radius),
    bottomLeft,
    "V",
    round(radius),
    topLeft,
    "Z"
  ].join(" ");
}

// src/browser.js
var BORDER_BEZIER_SELECTOR = ".border-bezier, [data-border-bezier]";
var instances = /* @__PURE__ */ new WeakMap();
var hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
var isElement = (value) => value?.nodeType === 1 && value?.style;
function computedStyles(element) {
  return element.ownerDocument?.defaultView?.getComputedStyle(element) ?? globalThis.getComputedStyle?.(element);
}
function matchingElements(root) {
  const elements = [];
  if (isElement(root) && root.matches(BORDER_BEZIER_SELECTOR)) {
    elements.push(root);
  }
  if (root?.querySelectorAll) {
    elements.push(...root.querySelectorAll(BORDER_BEZIER_SELECTOR));
  }
  return elements;
}
function instanceElements(root) {
  const elements = [];
  if (isElement(root) && instances.has(root)) elements.push(root);
  if (root?.querySelectorAll) {
    for (const element of root.querySelectorAll("*")) {
      if (instances.has(element)) elements.push(element);
    }
  }
  return elements;
}
function restoreInlineClipPath(instance) {
  const { element } = instance;
  if (instance.previousClipPath) {
    element.style.setProperty(
      "clip-path",
      instance.previousClipPath,
      instance.previousClipPathPriority
    );
  } else {
    element.style.removeProperty("clip-path");
  }
  instance.applied = false;
}
var BorderBezier = class {
  constructor(element, options = {}) {
    if (!isElement(element)) {
      throw new TypeError("BorderBezier expects a DOM Element.");
    }
    this.element = element;
    this.options = { ...options };
    this.previousClipPath = element.style.getPropertyValue("clip-path");
    this.previousClipPathPriority = element.style.getPropertyPriority(
      "clip-path"
    );
    this.applied = false;
    this.destroyed = false;
    this.path = null;
    this.resizeObserver = null;
    const ResizeObserverClass = element.ownerDocument?.defaultView?.ResizeObserver ?? globalThis.ResizeObserver;
    if (options.observeResize !== false && ResizeObserverClass) {
      this.resizeObserver = new ResizeObserverClass(() => this.refresh());
      this.resizeObserver.observe(element);
    }
    this.refresh();
  }
  refresh() {
    if (this.destroyed) return this;
    const rectangle = this.element.getBoundingClientRect();
    const width = Number(rectangle.width);
    const height = Number(rectangle.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      if (this.applied) restoreInlineClipPath(this);
      this.path = null;
      return this;
    }
    const styles = computedStyles(this.element);
    const radius = hasOwn(this.options, "radius") ? this.options.radius : styles?.getPropertyValue("--border-bezier") || DEFAULT_RADIUS;
    const smoothing = hasOwn(this.options, "smoothing") ? this.options.smoothing : styles?.getPropertyValue("--border-bezier-smoothing") || DEFAULT_SMOOTHING;
    const path = buildBorderBezierPath({
      width,
      height,
      radius,
      smoothing,
      element: this.element
    });
    const clipPath = `path("${path}")`;
    if (this.element.style.getPropertyValue("clip-path") !== clipPath) {
      this.element.style.setProperty("clip-path", clipPath);
    }
    this.path = path;
    this.applied = true;
    return this;
  }
  update(options = {}) {
    if (!options || typeof options !== "object") {
      throw new TypeError("BorderBezier.update expects an options object.");
    }
    Object.assign(this.options, options);
    return this.refresh();
  }
  destroy({ restore = true } = {}) {
    if (this.destroyed) return this;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (instances.get(this.element) === this) {
      instances.delete(this.element);
    }
    if (restore) restoreInlineClipPath(this);
    this.path = null;
    this.destroyed = true;
    return this;
  }
};
function getBorderBezierInstance(element) {
  return instances.get(element);
}
function mountBorderBezier(element, options) {
  const current = instances.get(element);
  if (current && !current.destroyed) {
    if (options) current.update(options);
    return current;
  }
  const instance = new BorderBezier(element, options);
  instances.set(element, instance);
  return instance;
}
function unmountBorderBezier(element, options) {
  const instance = instances.get(element);
  if (!instance) return false;
  instance.destroy(options);
  return true;
}
function mountAllBorderBezier(root = globalThis.document, options) {
  return matchingElements(root).map(
    (element) => mountBorderBezier(element, options)
  );
}
function refreshAllBorderBezier(root = globalThis.document) {
  return mountAllBorderBezier(root).map((instance) => instance.refresh());
}
function unmountAllBorderBezier(root = globalThis.document, options) {
  return instanceElements(root).reduce(
    (count, element) => count + Number(unmountBorderBezier(element, options)),
    0
  );
}
function observeBorderBezier(root = globalThis.document, options = {}) {
  const { mount = true, ...instanceOptions } = options;
  const document = root?.nodeType === 9 ? root : root?.ownerDocument;
  const view = document?.defaultView ?? globalThis;
  const target = root?.nodeType === 9 ? root.documentElement : root;
  if (mount) mountAllBorderBezier(root, instanceOptions);
  if (!target || !view.MutationObserver) {
    return {
      observer: null,
      disconnect({ unmount = false, restore = true } = {}) {
        if (unmount) unmountAllBorderBezier(root, { restore });
      }
    };
  }
  const observer = new view.MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "childList") {
        for (const node of record.removedNodes) {
          if (!isElement(node)) continue;
          for (const element of instanceElements(node)) {
            unmountBorderBezier(element);
          }
        }
        for (const node of record.addedNodes) {
          if (!isElement(node)) continue;
          for (const element of matchingElements(node)) {
            mountBorderBezier(element, instanceOptions);
          }
        }
      } else if (isElement(record.target)) {
        if (record.target.matches(BORDER_BEZIER_SELECTOR)) {
          mountBorderBezier(record.target, instanceOptions).refresh();
        } else {
          unmountBorderBezier(record.target);
        }
      }
    }
  });
  observer.observe(target, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "data-border-bezier"]
  });
  return {
    observer,
    disconnect({ unmount = false, restore = true } = {}) {
      observer.disconnect();
      if (unmount) unmountAllBorderBezier(root, { restore });
    }
  };
}

// src/index.js
var api = Object.freeze({
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
var index_default = api;
export {
  BORDER_BEZIER_SELECTOR,
  BorderBezier,
  DEFAULT_RADIUS,
  DEFAULT_SMOOTHING,
  buildBorderBezierPath,
  index_default as default,
  getBorderBezierInstance,
  mountAllBorderBezier,
  mountBorderBezier,
  observeBorderBezier,
  refreshAllBorderBezier,
  resolveBorderBezierRadius,
  unmountAllBorderBezier,
  unmountBorderBezier
};
