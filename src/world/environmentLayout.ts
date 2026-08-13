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

export interface TerrainReliefPoint {
  position: [number, number, number];
  scale: [number, number, number];
  rotation: number;
}

export const MEMORY_TREE_POSITION: [number, number, number] = [-16, 0, -12];
export const DEPARTURE_GATE_POSITION: [number, number, number] = [0, 0, -15];

function seededUnit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function isRockClearOfJourney(position: [number, number, number]) {
  const [x, , z] = position;
  const distanceTo = (targetX: number, targetZ: number) =>
    Math.hypot(x - targetX, z - targetZ);
  const mainRouteClear = Math.abs(x) > 4.2 || z > 2 || z < -20;
  const archiveFootprintClear = x < -14.5 || x > -1.5 || z < -19 || z > -2.8;
  return mainRouteClear &&
    archiveFootprintClear &&
    distanceTo(0, -5) > 4.5 &&
    distanceTo(-8, -3.8) > 5 &&
    distanceTo(0, -15) > 5.2;
}

export function createRockLayout(count: number, innerRadius = 7, outerRadius = 38) {
  const layout: EnvironmentPoint[] = [];
  let candidate = 0;
  while (layout.length < count) {
    const radius = innerRadius + (outerRadius - innerRadius) * seededUnit(candidate + 1);
    const angle = seededUnit(candidate + 91) * Math.PI * 2;
    const position: [number, number, number] = [
      Math.cos(angle) * radius,
      -0.02,
      Math.sin(angle) * radius,
    ];
    if (isRockClearOfJourney(position)) {
      layout.push({
        position,
        scale: 0.38 + seededUnit(candidate + 181) * 1.25,
        rotation: seededUnit(candidate + 271) * Math.PI * 2,
      });
    }
    candidate += 1;
  }
  return layout;
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

export function createTerrainReliefLayout(count: number): TerrainReliefPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = seededUnit(index + 911) * Math.PI * 2;
    const radius = 23 + seededUnit(index + 961) * 19;
    return {
      position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius - 7],
      scale: [
        3.8 + seededUnit(index + 1011) * 5.5,
        0.7 + seededUnit(index + 1061) * 1.4,
        3.2 + seededUnit(index + 1111) * 5,
      ],
      rotation: seededUnit(index + 1161) * Math.PI * 2,
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
    const azimuth = seededUnit(index + 701) * Math.PI * 2;
    const elevation = 0.2 + seededUnit(index + 751) * 0.72;
    const radius = 32 + seededUnit(index + 801) * 34;
    const horizontalRadius = Math.cos(elevation) * radius;
    positions.push(
      Math.sin(azimuth) * horizontalRadius,
      12 + Math.sin(elevation) * radius,
      Math.cos(azimuth) * horizontalRadius - 10,
    );
  }
  return positions;
}
