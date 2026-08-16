import { describe, expect, it } from "vitest";
import {
  buildBorderBezierPath,
  resolveBorderBezierRadius
} from "../src/core.js";

const path = options => buildBorderBezierPath({
  width: 200,
  height: 100,
  radius: 24,
  smoothing: 1,
  ...options
});

describe("buildBorderBezierPath", () => {
  it("builds a finite path when radius is zero", () => {
    expect(path({ radius: 0 })).toMatch(/^M 0 0 H 200/);
    expect(path({ radius: 0 })).not.toMatch(/NaN|Infinity/);
  });

  it("clamps radius to half of the smallest dimension", () => {
    expect(path({ radius: 999 })).toBe(path({ radius: 50 }));
    expect(path({ radius: -10 })).toBe(path({ radius: 0 }));
  });

  it("supports the smoothing endpoints", () => {
    expect(path({ smoothing: 0 })).not.toBe(path({ smoothing: 1 }));
  });

  it("clamps smoothing outside zero and one", () => {
    expect(path({ smoothing: -5 })).toBe(path({ smoothing: 0 }));
    expect(path({ smoothing: 5 })).toBe(path({ smoothing: 1 }));
  });

  it("returns a safe path for zero-sized elements", () => {
    expect(path({ width: 0 })).toBe("M 0 0 Z");
    expect(path({ height: 0 })).toBe("M 0 0 Z");
  });

  it("uses the original continuous curve profile", () => {
    expect(path({ width: 100, height: 80, radius: 20, smoothing: 1 }))
      .toBe(
        "M 20 0 H 80 C 95.5 0 100 4.5 100 20 V 60 "
        + "C 100 75.5 95.5 80 80 80 H 20 C 4.5 80 0 75.5 0 60 "
        + "V 20 C 0 4.5 4.5 0 20 0 Z"
      );
  });
});

describe("resolveBorderBezierRadius", () => {
  const options = {
    width: 200,
    height: 100,
    rootFontSize: 16,
    fontSize: 20,
    viewportWidth: 1000,
    viewportHeight: 800
  };

  it.each([
    ["32px", 32],
    ["2rem", 32],
    ["2em", 40],
    ["10vw", 100],
    ["10vh", 80],
    ["10vmin", 80],
    ["10vmax", 100],
    ["50%", 50]
  ])("resolves %s", (value, expected) => {
    expect(resolveBorderBezierRadius(value, options)).toBe(expected);
  });

  it("accepts numbers and unitless pixel strings", () => {
    expect(resolveBorderBezierRadius(32, options)).toBe(32);
    expect(resolveBorderBezierRadius("32", options)).toBe(32);
  });

  it("falls back for invalid values", () => {
    expect(resolveBorderBezierRadius("calc(1rem + 2px)", options)).toBe(24);
    expect(resolveBorderBezierRadius(Number.NaN, options)).toBe(24);
  });
});
