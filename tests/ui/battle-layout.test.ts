import { describe, expect, it } from 'vitest';

import { createDiamondTrackPositions } from '../../assets/scripts/ui/battle-layout';

describe('createDiamondTrackPositions', () => {
  it('returns one position per tile without duplicating adjacent corners', () => {
    const positions = createDiamondTrackPositions(18, 360, 220);

    expect(positions).toHaveLength(18);
    expect(new Set(positions.map(({ x, y }) => `${x}:${y}`)).size).toBe(18);
  });

  it('places the first four anchor points at left, bottom, right, and top', () => {
    const positions = createDiamondTrackPositions(18, 360, 220);

    expect(positions[0]).toEqual({ x: -360, y: 0 });
    expect(positions[4]).toEqual({ x: 0, y: -220 });
    expect(positions[9]).toEqual({ x: 360, y: 0 });
    expect(positions[13]).toEqual({ x: 0, y: 220 });
  });

  it('walks clockwise with evenly spaced steps along each edge for the 18-tile board', () => {
    const positions = createDiamondTrackPositions(18, 360, 220);

    expect(positions.slice(0, 5)).toEqual([
      { x: -360, y: 0 },
      { x: -270, y: -55 },
      { x: -180, y: -110 },
      { x: -90, y: -165 },
      { x: 0, y: -220 },
    ]);

    expect(positions.slice(13)).toEqual([
      { x: 0, y: 220 },
      { x: -72, y: 176 },
      { x: -144, y: 132 },
      { x: -216, y: 88 },
      { x: -288, y: 44 },
    ]);
  });

  it('keeps the ring centered even when later consumers scale the board root', () => {
    const positions = createDiamondTrackPositions(18, 330, 210);
    const xs = positions.map(({ x }) => x);
    const ys = positions.map(({ y }) => y);

    expect(Math.max(...xs)).toBe(330);
    expect(Math.min(...xs)).toBe(-330);
    expect(Math.max(...ys)).toBe(210);
    expect(Math.min(...ys)).toBe(-210);
  });
});
