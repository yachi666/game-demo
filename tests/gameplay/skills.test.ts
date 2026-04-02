import { describe, expect, it } from 'vitest';

import { createMatch } from '../../assets/scripts/core/create-match';
import { GamePhase } from '../../assets/scripts/core/phases';
import {
  advanceToNextTurnFlow,
  beginTurnFlow,
  completeRoleSelectionFlow,
  openRoleSelectionFlow,
} from '../../assets/scripts/core/turn-flow';
import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { applyRollMovementForPlayer } from '../../assets/scripts/gameplay/movement';
import { resolveTileForPlayer } from '../../assets/scripts/gameplay/resolve-tile';
import { applySkillForPlayer } from '../../assets/scripts/gameplay/skills';

const firstPropertyId = 'civic-1';
const penaltyTileIndex = BOARD_CONFIG.findIndex((tile) => tile.id === 'penalty-1');

describe('skills', () => {
  it('applies the Broker skill as a one-time property discount', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].roleId = 'role-economy';
    match.players[0].position = 1;

    const skilledMatch = applySkillForPlayer(match, 0);
    const result = resolveTileForPlayer(skilledMatch, 0, { type: 'buy' });

    expect(skilledMatch.players[0].hasUsedSkillThisTurn).toBe(true);
    expect(skilledMatch.statusEffects).toEqual([
      expect.objectContaining({
        ownerId: 'player-1',
        effectType: 'discountNextProperty',
        amount: 30,
        sourceType: 'skill',
      }),
    ]);
    expect(result.match.players[0].cash).toBe(310);
    expect(result.match.statusEffects).toEqual([]);
  });

  it('carries the Collector skill into the next opponent toll through turn flow', () => {
    const match = beginTurnFlow(
      completeRoleSelectionFlow(openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG)), 'role-toll'),
    );
    match.properties.find((property) => property.tileId === firstPropertyId)!.ownerId = 'player-1';

    const skilledMatch = applySkillForPlayer(match, 0);
    const nextTurnMatch = advanceToNextTurnFlow({ ...skilledMatch, phase: GamePhase.TurnEnd });
    nextTurnMatch.players[1].position = 1;
    const result = resolveTileForPlayer(nextTurnMatch, 1);

    expect(nextTurnMatch.players[0].hasUsedSkillThisTurn).toBe(false);
    expect(nextTurnMatch.statusEffects).toEqual([
      expect.objectContaining({
        ownerId: 'player-1',
        effectType: 'boostNextToll',
        amount: 20,
        sourceType: 'skill',
      }),
    ]);
    expect(result.match.players[1].cash).toBe(335);
    expect(result.match.players[0].cash).toBe(465);
    expect(result.match.statusEffects).toEqual([]);
  });

  it('applies the Courier skill as a one-time roll bonus through the movement pipeline', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].roleId = 'role-mobility';
    match.players[0].position = BOARD_CONFIG.length - 2;

    const skilledMatch = applySkillForPlayer(match, 0);
    const moved = applyRollMovementForPlayer(skilledMatch, 0, 1);

    expect(moved.appliedRollBonus).toBe(1);
    expect(moved.totalSteps).toBe(2);
    expect(moved.match.players[0].position).toBe(0);
    expect(moved.match.players[0].cash).toBe(500);
    expect(moved.match.statusEffects).toEqual([]);
  });

  it('applies the Guardian skill as a one-time shield against penalties', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].roleId = 'role-defense';
    match.players[0].position = penaltyTileIndex;

    const skilledMatch = applySkillForPlayer(match, 0);
    const result = resolveTileForPlayer(skilledMatch, 0);

    expect(skilledMatch.players[0].hasUsedSkillThisTurn).toBe(true);
    expect(result.match.players[0].cash).toBe(400);
    expect(result.match.statusEffects).toEqual([]);
  });

  it('keeps unused skill effects across turn end while resetting the per-turn usage flag', () => {
    const match = beginTurnFlow(
      completeRoleSelectionFlow(openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG)), 'role-economy'),
    );

    const skilledMatch = applySkillForPlayer(match, 0);
    const nextTurnMatch = advanceToNextTurnFlow({ ...skilledMatch, phase: GamePhase.TurnEnd });

    expect(nextTurnMatch.players[0].hasUsedSkillThisTurn).toBe(false);
    expect(nextTurnMatch.statusEffects).toEqual([
      expect.objectContaining({
        ownerId: 'player-1',
        effectType: 'discountNextProperty',
        amount: 30,
        sourceType: 'skill',
      }),
    ]);
  });

  it('refreshes a repeated unused skill effect instead of stacking duplicates across turns', () => {
    const match = beginTurnFlow(
      completeRoleSelectionFlow(openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG)), 'role-economy'),
    );

    const firstUseMatch = applySkillForPlayer(match, 0);
    let nextSkillTurnMatch = firstUseMatch;
    for (let index = 0; index < MATCH_CONFIG.players.length; index += 1) {
      nextSkillTurnMatch = advanceToNextTurnFlow({ ...nextSkillTurnMatch, phase: GamePhase.TurnEnd });
    }

    const secondUseMatch = applySkillForPlayer(nextSkillTurnMatch, 0);

    expect(secondUseMatch.players[0].hasUsedSkillThisTurn).toBe(true);
    expect(secondUseMatch.statusEffects).toEqual([
      expect.objectContaining({
        ownerId: 'player-1',
        effectType: 'discountNextProperty',
        amount: 30,
        sourceType: 'skill',
      }),
    ]);
  });

  it('refuses to use a second skill in the same turn', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].roleId = 'role-defense';

    const skilledMatch = applySkillForPlayer(match, 0);

    expect(() => applySkillForPlayer(skilledMatch, 0)).toThrow('already used a skill');
  });
});
