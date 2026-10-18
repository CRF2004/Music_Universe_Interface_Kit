export const MEMORY_FRAGMENT_COUNT = 24;

/** Stateless sampling: the same song time reconstructs the same local-space pose. */
export function sampleMemoryFragment(index: number, songTime: number) {
  const phase = index / MEMORY_FRAGMENT_COUNT;
  const angle = phase * Math.PI * 2 + songTime * 0.35;
  const height = ((phase + songTime * 0.12) % 1 + 1) % 1;
  const radius = 0.65 + Math.sin(height * Math.PI) * 0.45;
  return {
    position: [Math.cos(angle) * radius, 0.3 + height * 2.3, Math.sin(angle) * 0.28] as [number, number, number],
    scale: 0.035 + Math.sin(height * Math.PI) * 0.035,
    rotation: angle,
  };
}
