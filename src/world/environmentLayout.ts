export interface EnvironmentPoint {
  position: [number, number, number];
  scale: number;
  rotation: number;
}

export interface MemoryShardPoint {
  position: [number, number, number];
  scale: number;
  phase: number;
  lean: number;
}

function seededUnit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function createRockLayout(count: number, innerRadius = 7, outerRadius = 38) {
  return Array.from({ length: count }, (_, index): EnvironmentPoint => {
    const radius = innerRadius + (outerRadius - innerRadius) * seededUnit(index + 1);
    const angle = seededUnit(index + 91) * Math.PI * 2;
    return {
      position: [Math.cos(angle) * radius, -0.02, Math.sin(angle) * radius],
      scale: 0.38 + seededUnit(index + 181) * 1.25,
      rotation: seededUnit(index + 271) * Math.PI * 2,
    };
  });
}

export function createMemoryGroveLayout(count: number): MemoryShardPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const cluster = index % 4;
    const row = Math.floor(index / 4);
    const side = cluster < 2 ? -1 : 1;
    const laneOffset = cluster % 2 === 0 ? 5.8 : 9.4;
    return {
      position: [
        side * (laneOffset + seededUnit(index + 401) * 1.3),
        0.18,
        -5.2 - row * 2.7 - seededUnit(index + 451) * 1.2,
      ],
      scale: 0.42 + seededUnit(index + 501) * 0.52,
      phase: seededUnit(index + 551) * Math.PI * 2,
      lean: (seededUnit(index + 601) - 0.5) * 0.34,
    };
  });
}

export function journeyRoutePoint(
  start: [number, number, number],
  target: 'guide' | 'archive' | 'gate',
  progress: number,
): [number, number, number] {
  const clamped = Math.min(1, Math.max(0, progress));
  const destinations = {
    guide: [0, 0.09, -5],
    archive: [-2, 0.09, -11],
    gate: [0, 0.09, -15],
  } as const;
  const destination = destinations[target];
  if (clamped === 1) return [...destination];
  const bend = target === 'archive' ? 4.8 * Math.sin(clamped * Math.PI) : 0;
  return [
    start[0] + (destination[0] - start[0]) * clamped + bend,
    0.09,
    start[2] + (destination[2] - start[2]) * clamped,
  ];
}

export function lightPathPoint(index: number, count: number): [number, number, number] {
  const progress = count <= 1 ? 0 : index / (count - 1);
  const z = -2.2 - progress * 16;
  const x = Math.sin(progress * Math.PI * 2.1) * (0.45 + progress * 1.5);
  const y = 0.055 + Math.sin(progress * Math.PI) * 0.045;
  return [x, y, z];
}

export function lightPathPhase(index: number, count: number) {
  return count <= 1 ? 0 : index / (count - 1);
}

export function createSkyStarPositions(count: number) {
  const positions: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const column = index % 29;
    const layer = Math.floor(index / 29);
    positions.push(
      (column - 14) * 1.9 + (layer % 2) * 0.8,
      12 + (index % 13) * 1.15,
      -24 - (index % 19) * 1.8,
    );
  }
  return positions;
}
