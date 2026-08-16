// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBorderBezierInstance,
  mountAllBorderBezier,
  mountBorderBezier,
  observeBorderBezier,
  refreshAllBorderBezier,
  unmountBorderBezier
} from "../src/browser.js";

class ResizeObserverMock {
  static instances = [];

  constructor(callback) {
    this.callback = callback;
    this.disconnect = vi.fn();
    this.observe = vi.fn();
    ResizeObserverMock.instances.push(this);
  }
}

function element({ width = 200, height = 100 } = {}) {
  const node = document.createElement("div");
  node.getBoundingClientRect = vi.fn(() => ({
    width,
    height,
    top: 0,
    right: width,
    bottom: height,
    left: 0,
    x: 0,
    y: 0,
    toJSON() {}
  }));
  return node;
}

const mutationTick = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
  ResizeObserverMock.instances = [];
  globalThis.ResizeObserver = ResizeObserverMock;
  document.body.replaceChildren();
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("instance lifecycle", () => {
  it("mounts and reuses a single instance", () => {
    const node = element();
    const first = mountBorderBezier(node, { radius: 20 });
    const second = mountBorderBezier(node, { radius: 30 });

    expect(second).toBe(first);
    expect(first.options.radius).toBe(30);
    expect(node.style.clipPath).toContain("path(");
    expect(ResizeObserverMock.instances).toHaveLength(1);
  });

  it("updates and refreshes the generated path", () => {
    const node = element();
    const instance = mountBorderBezier(node, { radius: 10 });
    const before = instance.path;

    expect(instance.update({ radius: "50%" })).toBe(instance);
    expect(instance.path).not.toBe(before);
    expect(refreshAllBorderBezier(node.parentNode ?? document)).toBeInstanceOf(Array);
  });

  it("restores the previous inline clip-path on destroy", () => {
    const node = element();
    node.style.setProperty("clip-path", "inset(2px)", "important");
    const instance = mountBorderBezier(node);

    expect(instance.destroy()).toBe(instance);
    expect(node.style.getPropertyValue("clip-path")).toBe("inset(2px)");
    expect(node.style.getPropertyPriority("clip-path")).toBe("important");
    expect(ResizeObserverMock.instances[0].disconnect).toHaveBeenCalledOnce();
  });

  it("unmounts through the public function", () => {
    const node = element();
    mountBorderBezier(node);

    expect(unmountBorderBezier(node)).toBe(true);
    expect(unmountBorderBezier(node)).toBe(false);
    expect(getBorderBezierInstance(node)).toBeUndefined();
  });

  it("does not overwrite a previous clip-path for a zero-sized element", () => {
    const node = element({ width: 0, height: 0 });
    node.style.clipPath = "circle(50%)";
    const instance = mountBorderBezier(node);

    expect(instance.path).toBeNull();
    expect(node.style.clipPath).toBe("circle(50%)");
  });

  it("can mount multiple matching elements", () => {
    const first = element();
    const second = element();
    first.className = "border-bezier";
    second.dataset.borderBezier = "";
    document.body.append(first, second);

    const mounted = mountAllBorderBezier(document, { observeResize: false });
    expect(mounted).toHaveLength(2);
    expect(mounted[0]).not.toBe(mounted[1]);
  });
});

describe("dynamic elements", () => {
  it("mounts added elements and cleans up removed elements", async () => {
    const controller = observeBorderBezier(document);
    const node = element();
    node.dataset.borderBezier = "";

    document.body.append(node);
    await mutationTick();

    const instance = getBorderBezierInstance(node);
    expect(instance).toBeDefined();

    node.remove();
    await mutationTick();

    expect(getBorderBezierInstance(node)).toBeUndefined();
    expect(instance.destroyed).toBe(true);
    expect(instance.resizeObserver).toBeNull();
    controller.disconnect();
  });

  it("unmounts when the selector is removed", async () => {
    const node = element();
    node.className = "border-bezier";
    document.body.append(node);
    const controller = observeBorderBezier(document);

    expect(getBorderBezierInstance(node)).toBeDefined();
    node.className = "";
    await mutationTick();

    expect(getBorderBezierInstance(node)).toBeUndefined();
    controller.disconnect();
  });
});
