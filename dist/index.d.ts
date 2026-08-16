export type BorderBezierRadius = number | string;

export interface BorderBezierPathOptions {
  width: number;
  height: number;
  radius?: BorderBezierRadius;
  smoothing?: number;
  element?: Element;
  rootFontSize?: number;
  fontSize?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  fallback?: number;
}

export interface BorderBezierRadiusOptions {
  width?: number;
  height?: number;
  element?: Element;
  rootFontSize?: number;
  fontSize?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  fallback?: number;
}

export interface BorderBezierOptions {
  radius?: BorderBezierRadius;
  smoothing?: number;
  observeResize?: boolean;
}

export interface BorderBezierDestroyOptions {
  restore?: boolean;
}

export interface BorderBezierObserveOptions extends BorderBezierOptions {
  mount?: boolean;
}

export interface BorderBezierObserverDisconnectOptions {
  unmount?: boolean;
  restore?: boolean;
}

export interface BorderBezierObserverController {
  observer: MutationObserver | null;
  disconnect(options?: BorderBezierObserverDisconnectOptions): void;
}

export declare const BORDER_BEZIER_SELECTOR: string;
export declare const DEFAULT_RADIUS: number;
export declare const DEFAULT_SMOOTHING: number;

export declare class BorderBezier {
  readonly element: Element;
  readonly options: BorderBezierOptions;
  readonly previousClipPath: string;
  readonly previousClipPathPriority: string;
  readonly applied: boolean;
  readonly destroyed: boolean;
  readonly path: string | null;
  readonly resizeObserver: ResizeObserver | null;

  constructor(element: Element, options?: BorderBezierOptions);
  refresh(): this;
  update(options?: BorderBezierOptions): this;
  destroy(options?: BorderBezierDestroyOptions): this;
}

export declare function resolveBorderBezierRadius(
  radius: BorderBezierRadius,
  options?: BorderBezierRadiusOptions
): number;

export declare function buildBorderBezierPath(
  options: BorderBezierPathOptions
): string;

export declare function getBorderBezierInstance(
  element: Element
): BorderBezier | undefined;

export declare function mountBorderBezier(
  element: Element,
  options?: BorderBezierOptions
): BorderBezier;

export declare function unmountBorderBezier(
  element: Element,
  options?: BorderBezierDestroyOptions
): boolean;

export declare function mountAllBorderBezier(
  root?: ParentNode,
  options?: BorderBezierOptions
): BorderBezier[];

export declare function refreshAllBorderBezier(
  root?: ParentNode
): BorderBezier[];

export declare function unmountAllBorderBezier(
  root?: ParentNode,
  options?: BorderBezierDestroyOptions
): number;

export declare function observeBorderBezier(
  root?: Document | Element,
  options?: BorderBezierObserveOptions
): BorderBezierObserverController;

declare const api: Readonly<{
  BORDER_BEZIER_SELECTOR: typeof BORDER_BEZIER_SELECTOR;
  BorderBezier: typeof BorderBezier;
  buildBorderBezierPath: typeof buildBorderBezierPath;
  DEFAULT_RADIUS: typeof DEFAULT_RADIUS;
  DEFAULT_SMOOTHING: typeof DEFAULT_SMOOTHING;
  getBorderBezierInstance: typeof getBorderBezierInstance;
  mountAllBorderBezier: typeof mountAllBorderBezier;
  mountBorderBezier: typeof mountBorderBezier;
  observeBorderBezier: typeof observeBorderBezier;
  refreshAllBorderBezier: typeof refreshAllBorderBezier;
  resolveBorderBezierRadius: typeof resolveBorderBezierRadius;
  unmountAllBorderBezier: typeof unmountAllBorderBezier;
  unmountBorderBezier: typeof unmountBorderBezier;
}>;

export default api;
