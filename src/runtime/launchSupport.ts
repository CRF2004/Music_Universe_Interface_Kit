export interface LaunchEnvironment {
  coarsePointer: boolean;
  hoverUnavailable: boolean;
}

export type LaunchSupport =
  | { readonly supported: true }
  | { readonly supported: false; readonly reason: 'touch-only' };

export function detectLaunchSupport(
  environment: LaunchEnvironment = {
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    hoverUnavailable: window.matchMedia('(hover: none)').matches,
  },
): LaunchSupport {
  if (environment.coarsePointer && environment.hoverUnavailable) {
    return { supported: false, reason: 'touch-only' };
  }

  return { supported: true };
}
