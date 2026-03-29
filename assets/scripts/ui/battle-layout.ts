export interface DiamondTrackPosition {
  x: number;
  y: number;
}

export function createDiamondTrackPositions(
  tileCount: number,
  radiusX: number,
  radiusY: number,
): DiamondTrackPosition[] {
  if (tileCount < 4) {
    throw new Error('Diamond track requires at least 4 tiles');
  }

  const corners: DiamondTrackPosition[] = [
    { x: -radiusX, y: 0 },
    { x: 0, y: -radiusY },
    { x: radiusX, y: 0 },
    { x: 0, y: radiusY },
  ];
  const baseStepsPerSide = Math.floor(tileCount / 4);
  const remainder = tileCount % 4;
  const stepsPerSide = Array.from({ length: 4 }, () => baseStepsPerSide);
  const remainderOrder = [1, 3, 0, 2];
  for (let index = 0; index < remainder; index += 1) {
    stepsPerSide[remainderOrder[index]!] += 1;
  }
  const positions: DiamondTrackPosition[] = [];

  corners.forEach((start, sideIndex) => {
    const end = corners[(sideIndex + 1) % corners.length]!;
    const steps = stepsPerSide[sideIndex]!;
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      positions.push({
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
      });
    }
  });

  return positions;
}
