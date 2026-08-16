import {
  buildBorderBezierPath,
  DEFAULT_RADIUS,
  DEFAULT_SMOOTHING
} from "./core.js";

export const BORDER_BEZIER_SELECTOR =
  ".border-bezier, [data-border-bezier]";

const instances = new WeakMap();
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isElement = value => value?.nodeType === 1 && value?.style;

function computedStyles(element) {
  return element.ownerDocument?.defaultView?.getComputedStyle(element)
    ?? globalThis.getComputedStyle?.(element);
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

export class BorderBezier {
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

    const ResizeObserverClass =
      element.ownerDocument?.defaultView?.ResizeObserver
      ?? globalThis.ResizeObserver;

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

    if (!Number.isFinite(width) || !Number.isFinite(height)
      || width <= 0 || height <= 0) {
      if (this.applied) restoreInlineClipPath(this);
      this.path = null;
      return this;
    }

    const styles = computedStyles(this.element);
    const radius = hasOwn(this.options, "radius")
      ? this.options.radius
      : styles?.getPropertyValue("--border-bezier") || DEFAULT_RADIUS;
    const smoothing = hasOwn(this.options, "smoothing")
      ? this.options.smoothing
      : styles?.getPropertyValue("--border-bezier-smoothing")
        || DEFAULT_SMOOTHING;
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
}

export function getBorderBezierInstance(element) {
  return instances.get(element);
}

export function mountBorderBezier(element, options) {
  const current = instances.get(element);

  if (current && !current.destroyed) {
    if (options) current.update(options);
    return current;
  }

  const instance = new BorderBezier(element, options);
  instances.set(element, instance);
  return instance;
}

export function unmountBorderBezier(element, options) {
  const instance = instances.get(element);
  if (!instance) return false;
  instance.destroy(options);
  return true;
}

export function mountAllBorderBezier(root = globalThis.document, options) {
  return matchingElements(root).map(element =>
    mountBorderBezier(element, options)
  );
}

export function refreshAllBorderBezier(root = globalThis.document) {
  return mountAllBorderBezier(root).map(instance => instance.refresh());
}

export function unmountAllBorderBezier(
  root = globalThis.document,
  options
) {
  return instanceElements(root).reduce(
    (count, element) => count + Number(unmountBorderBezier(element, options)),
    0
  );
}

export function observeBorderBezier(root = globalThis.document, options = {}) {
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

  const observer = new view.MutationObserver(records => {
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
