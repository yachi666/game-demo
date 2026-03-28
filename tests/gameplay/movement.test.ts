import { describe, expect, it } from 'vitest';

import { movePlayerPosition } from '../../assets/scripts/gameplay/movement';

describe('movePlayerPosition', () => {
  it('wraps around the board and reports passing start', () => {
    expect(movePlayerPosition(7, 4, 10)).toEqual({
      nextPosition: 1,
      passedStart: true,
      visitedPositions: [8, 9, 0, 1],
    });
  });
});
