import api, { observeBorderBezier } from "./index.js";

globalThis.BorderBezier = api;

if (typeof document !== "undefined") {
  const start = () => observeBorderBezier(document);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
