export interface EnvironmentPoint {
  position: [number, number, number];
  scale: number;
  rotation: number;
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
