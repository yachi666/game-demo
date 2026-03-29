import { describe, expect, it } from 'vitest';

import { createMatch } from '../../assets/scripts/core/create-match';
import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { applyForcedMovement, applyRollMovementForPlayer, movePlayerPosition } from '../../assets/scripts/gameplay/movement';

describe('movePlayerPosition', () => {
  it('wraps around the board and reports passing start', () => {
    expect(movePlayerPosition(7, 4, 10)).toEqual({
      nextPosition: 1,
      passedStart: true,
      passedStartCount: 1,
      visitedPositions: [8, 9, 0, 1],
    });
  });
});

describe('applyForcedMovement', () => {
  it('moves a player and awards the start bonus when wrapping forward', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].position = BOARD_CONFIG.length - 1;

    const result = applyForcedMovement(match, 0, 2);

    expect(result.match.players[0].position).toBe(1);
    expect(result.match.players[0].cash).toBe(500);
    expect(result.movement.visitedPositions).toEqual([0, 1]);
  });

  it('awards the start bonus for each wrap when movement crosses start multiple times', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].position = BOARD_CONFIG.length - 1;

    const result = applyForcedMovement(match, 0, BOARD_CONFIG.length * 2 + 1);

    expect(result.match.players[0].position).toBe(0);
    expect(result.match.players[0].cash).toBe(700);
    expect(result.movement.visitedPositions).toHaveLength(BOARD_CONFIG.length * 2 + 1);
  });
});

describe('applyRollMovementForPlayer', () => {
  it('consumes rollBonus, derives total steps, and awards the start bonus when wrapping', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].position = BOARD_CONFIG.length - 2;
    match.statusEffects.push({
      id: 'test-roll-bonus',
      ownerId: 'player-1',
      effectType: 'rollBonus',
      amount: 2,
      sourceType: 'skill',
    });

    const result = applyRollMovementForPlayer(match, 0, 3);

    expect(result.appliedRollBonus).toBe(2);
    expect(result.totalSteps).toBe(5);
    expect(result.match.players[0].position).toBe(3);
    expect(result.match.players[0].cash).toBe(500);
    expect(result.match.statusEffects).toEqual([]);
    expect(result.movement.visitedPositions).toEqual([17, 0, 1, 2, 3]);
  });
});
