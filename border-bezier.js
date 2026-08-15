/**
 * border-bezier.js
 * Classic browser build. Works over HTTP(S) and directly through file://.
 */

(function initBorderBezier(global) {
  "use strict";

  const SELECTOR = ".border-bezier, [data-border-bezier]";
  const instances = new WeakMap();

  const clamp = (value, min, max) =>
    Math.min(max, Math.max(min, value));

  const mix = (from, to, amount) =>
    from + (to - from) * amount;

  const round = value => Number(value.toFixed(3));

  function resolveRadius(rawValue, element, width, height) {
    const raw = String(rawValue).trim().toLowerCase();
    const value = Number.parseFloat(raw);

    if (!Number.isFinite(value)) return 24;

    const rootSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize
    ) || 16;
    const elementSize = Number.parseFloat(
      getComputedStyle(element).fontSize
    ) || rootSize;
    const viewportWidth = global.innerWidth;
    const viewportHeight = global.innerHeight;
    const basis = Math.min(width, height);

    if (raw.endsWith("%")) return basis * value / 100;
    if (raw.endsWith("rem")) return rootSize * value;
    if (raw.endsWith("em")) return elementSize * value;
    if (raw.endsWith("vmin")) {
      return Math.min(viewportWidth, viewportHeight) * value / 100;
    }
    if (raw.endsWith("vmax")) {
      return Math.max(viewportWidth, viewportHeight) * value / 100;
    }
    if (raw.endsWith("vw")) return viewportWidth * value / 100;
    if (raw.endsWith("vh")) return viewportHeight * value / 100;

    return value;
  }

  function buildBorderBezierPath({
    width,
    height,
    radius,
    smoothing = 1
  }) {
    const r = clamp(radius, 0, Math.min(width, height) / 2);
    const s = clamp(smoothing, 0, 1);

    /*
     * Normalized quarter-corner profile.
     * s = 0 approaches a circular corner.
     * s = 1 produces the extended, continuous transition.
     */
    const profile = [
      [0, 0],
      [mix(0.265216, 0.5, s), 0],
      [mix(0.51957, 0.72, s), mix(0.10536, 0.108, s)],
      [mix(0.707107, 0.892, s), mix(0.292893, 0.36, s)],
      [mix(0.89464, 0.96, s), mix(0.48043, 0.52, s)],
      [1, mix(0.734784, 0.76, s)],
      [1, 1]
    ];

    const transform = (point, corner) => {
      const [u, v] = point;

      switch (corner) {
        case "top-right":
          return [width - r + u * r, v * r];
        case "bottom-right":
          return [width - r + u * r, height - v * r];
        case "bottom-left":
          return [r - u * r, height - v * r];
        default:
          return [r - u * r, v * r];
      }
    };

    const curve = corner => {
      const reverse = corner === "bottom-right" || corner === "top-left";
      const cornerProfile = reverse ? [...profile].reverse() : profile;
      const points = cornerProfile
        .slice(1)
        .map(point => transform(point, corner))
        .map(([x, y]) => [round(x), round(y)]);

      return [
        "C", points[0][0], points[0][1],
        points[1][0], points[1][1],
        points[2][0], points[2][1],
        "C", points[3][0], points[3][1],
        points[4][0], points[4][1],
        points[5][0], points[5][1]
      ].join(" ");
    };

    return [
      "M", round(r), 0,
      "H", round(width - r),
      curve("top-right"),
      "V", round(height - r),
      curve("bottom-right"),
      "H", round(r),
      curve("bottom-left"),
      "V", round(r),
      curve("top-left"),
      "Z"
    ].join(" ");
  }

  class BorderBezier {
    constructor(element, options = {}) {
      if (!(element instanceof Element)) {
        throw new TypeError("BorderBezier expects a DOM Element.");
      }

      this.element = element;
      this.options = options;
      this.resizeObserver = new ResizeObserver(() => this.refresh());
      this.resizeObserver.observe(element);
      this.refresh();
    }

    refresh() {
      const { width, height } = this.element.getBoundingClientRect();

      if (!width || !height) return this;

      const styles = getComputedStyle(this.element);
      const radius = this.options.radius ?? resolveRadius(
        styles.getPropertyValue("--border-bezier"),
        this.element,
        width,
        height
      );
      const smoothing = this.options.smoothing ?? (
        Number.parseFloat(
          styles.getPropertyValue("--border-bezier-smoothing")
        ) || 0
      );
      const path = buildBorderBezierPath({
        width,
        height,
        radius,
        smoothing
      });
      const clipPath = `path("${path}")`;

      if (this.element.style.clipPath !== clipPath) {
        this.element.style.clipPath = clipPath;
      }

      return this;
    }

    update(options = {}) {
      Object.assign(this.options, options);
      return this.refresh();
    }

    destroy({ restore = true } = {}) {
      this.resizeObserver.disconnect();
      instances.delete(this.element);

      if (restore) {
        this.element.style.removeProperty("clip-path");
      }
    }
  }

  function mountBorderBezier(element, options) {
    const current = instances.get(element);

    if (current) {
      if (options) current.update(options);
      return current;
    }

    const instance = new BorderBezier(element, options);
    instances.set(element, instance);
    return instance;
  }

  function mountAllBorderBezier(root = document) {
    return [...root.querySelectorAll(SELECTOR)].map(element =>
      mountBorderBezier(element)
    );
  }

  function refreshAllBorderBezier(root = document) {
    return mountAllBorderBezier(root).map(instance => instance.refresh());
  }

  function startAutoMount() {
    mountAllBorderBezier();

    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === "childList") {
          for (const node of record.addedNodes) {
            if (!(node instanceof Element)) continue;
            if (node.matches(SELECTOR)) mountBorderBezier(node);
            mountAllBorderBezier(node);
          }
        } else if (record.target instanceof Element) {
          const instance = instances.get(record.target);

          if (record.target.matches(SELECTOR)) {
            mountBorderBezier(record.target).refresh();
          } else if (instance) {
            instance.destroy();
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "data-border-bezier"]
    });

    return observer;
  }

  const api = Object.freeze({
    BorderBezier,
    buildBorderBezierPath,
    mountBorderBezier,
    mountAllBorderBezier,
    refreshAllBorderBezier
  });

  global.BorderBezier = api;

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startAutoMount, {
        once: true
      });
    } else {
      startAutoMount();
    }
  }
})(globalThis);
