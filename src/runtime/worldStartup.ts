export type WorldStartupSupport =
  | { readonly supported: true }
  | {
      readonly supported: false;
      readonly reason: 'webgl2-unavailable';
    };

export interface WebGL2ProbeCanvas {
  getContext: (
    contextId: 'webgl2',
    options?: WebGLContextAttributes,
  ) => WebGL2RenderingContext | null;
}

export type CanvasFactory = () => WebGL2ProbeCanvas;

export interface WorldStartupProbeOptions {
  allowSoftwareRenderer?: boolean;
}

export function detectWorldStartupSupport(
  createCanvas?: CanvasFactory,
  options: WorldStartupProbeOptions = {},
): WorldStartupSupport {
  const factory =
    createCanvas ??
    (() => {
      if (typeof document === 'undefined') {
        throw new Error('Document is unavailable.');
      }
      return document.createElement('canvas');
    });

  try {
    const canvas = factory();
    const context = canvas.getContext('webgl2', {
      failIfMajorPerformanceCaveat: !options.allowSoftwareRenderer,
      powerPreference: 'high-performance',
    });

    if (!context) {
      return { supported: false, reason: 'webgl2-unavailable' };
    }

    context.getExtension('WEBGL_lose_context')?.loseContext();
    return { supported: true };
  } catch {
    return { supported: false, reason: 'webgl2-unavailable' };
  }
}
