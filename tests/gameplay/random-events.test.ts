import { describe, expect, it } from 'vitest';

import { createMatch } from '../../assets/scripts/core/create-match';
import { GamePhase } from '../../assets/scripts/core/phases';
import {
  advanceToNextTurnFlow,
  completeRoleSelectionFlow,
  openRoleSelectionFlow,
} from '../../assets/scripts/core/turn-flow';
import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { resolveTileForPlayer } from '../../assets/scripts/gameplay/resolve-tile';

const firstPropertyId = 'civic-1';

describe('random events', () => {
  it('carries a toll boost event into the next opponent toll through turn flow', () => {
    const match = completeRoleSelectionFlow(
      openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG)),
      'role-toll',
    );
    match.turn = 4;
    match.players[0].position = 2;
    match.properties.find((property) => property.tileId === firstPropertyId)!.ownerId = 'player-1';

    const eventMatch = resolveTileForPlayer(match, 0);
    const nextTurnMatch = advanceToNextTurnFlow({ ...eventMatch.match, phase: GamePhase.TurnEnd });
    nextTurnMatch.players[1].position = 1;
    const result = resolveTileForPlayer(nextTurnMatch, 1);

    expect(eventMatch.match.statusEffects).toEqual([
      {
        id: 'toll-boost',
        ownerId: 'player-1',
        effectType: 'boostNextToll',
        amount: 35,
        sourceType: 'event',
      },
    ]);
    expect(nextTurnMatch.statusEffects).toEqual([
      {
        id: 'toll-boost',
        ownerId: 'player-1',
        effectType: 'boostNextToll',
        amount: 35,
        sourceType: 'event',
      },
    ]);
    expect(result.match.players[0].cash).toBe(480);
    expect(result.match.players[1].cash).toBe(320);
    expect(result.match.statusEffects).toEqual([]);
  });

  it('carries a property discount event into a later property purchase through turn flow', () => {
    const match = completeRoleSelectionFlow(
      openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG)),
      'role-toll',
    );
    match.turn = 3;
    match.players[0].position = 2;

    const eventMatch = resolveTileForPlayer(match, 0);
    const nextTurnMatch = advanceToNextTurnFlow({ ...eventMatch.match, phase: GamePhase.TurnEnd });
    nextTurnMatch.players[0].position = 3;
    const result = resolveTileForPlayer(nextTurnMatch, 0, { type: 'buy' });

    expect(eventMatch.match.statusEffects).toEqual([
      {
        id: 'property-discount',
        ownerId: 'player-1',
        effectType: 'discountNextProperty',
        amount: 40,
        sourceType: 'event',
      },
    ]);
    expect(nextTurnMatch.statusEffects).toEqual([
      {
        id: 'property-discount',
        ownerId: 'player-1',
        effectType: 'discountNextProperty',
        amount: 40,
        sourceType: 'event',
      },
    ]);
    expect(result.match.players[0].cash).toBe(295);
    expect(result.match.properties.find((property) => property.tileId === 'civic-2')?.ownerId).toBe('player-1');
    expect(result.match.statusEffects).toEqual([]);
  });
});
