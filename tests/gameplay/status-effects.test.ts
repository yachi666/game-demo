import { describe, expect, it } from 'vitest';

import { createMatch } from '../../assets/scripts/core/create-match';
import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { resolveTileForPlayer } from '../../assets/scripts/gameplay/resolve-tile';
import { addStatusEffect } from '../../assets/scripts/gameplay/status-effects';

describe('status-effects', () => {
  it('prevents a penalty tile once when the player has a shield effect', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].position = 4;

    const shieldedMatch = addStatusEffect(match, {
      id: 'shield-penalty',
      ownerId: 'player-1',
      effectType: 'shieldPenaltyOrToll',
      amount: 1,
      sourceType: 'card',
    });

    const result = resolveTileForPlayer(shieldedMatch, 0);

    expect(result.match.players[0].cash).toBe(400);
    expect(result.match.statusEffects).toEqual([]);
  });

  it('prevents an opponent toll once when the player has a shield effect', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].position = 1;
    match.properties.find((property) => property.tileId === 'property-1')!.ownerId = 'player-2';

    const shieldedMatch = addStatusEffect(match, {
      id: 'shield-toll',
      ownerId: 'player-1',
      effectType: 'shieldPenaltyOrToll',
      amount: 1,
      sourceType: 'card',
    });

    const result = resolveTileForPlayer(shieldedMatch, 0);

    expect(result.match.players[0].cash).toBe(400);
    expect(result.match.players[1].cash).toBe(400);
    expect(result.match.statusEffects).toEqual([]);
  });

  it('applies a one-time property discount and consumes it on purchase', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].position = 1;

    const discountedMatch = addStatusEffect(match, {
      id: 'discount-property',
      ownerId: 'player-1',
      effectType: 'discountNextProperty',
      amount: 40,
      sourceType: 'card',
    });

    const result = resolveTileForPlayer(discountedMatch, 0, { type: 'buy' });

    expect(result.match.players[0].cash).toBe(320);
    expect(result.match.properties.find((property) => property.tileId === 'property-1')?.ownerId).toBe('player-1');
    expect(result.match.statusEffects).toEqual([]);
  });

  it('applies a one-time toll boost for the owner and consumes it after collection', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].position = 1;
    match.properties.find((property) => property.tileId === 'property-1')!.ownerId = 'player-2';

    const boostedMatch = addStatusEffect(match, {
      id: 'boost-toll',
      ownerId: 'player-2',
      effectType: 'boostNextToll',
      amount: 25,
      sourceType: 'card',
    });

    const result = resolveTileForPlayer(boostedMatch, 0);

    expect(result.match.players[0].cash).toBe(330);
    expect(result.match.players[1].cash).toBe(470);
    expect(result.match.statusEffects).toEqual([]);
  });

  it('keeps a toll boost if the toll was fully blocked by a shield', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].position = 1;
    match.properties.find((property) => property.tileId === 'property-1')!.ownerId = 'player-2';

    const boostedMatch = addStatusEffect(match, {
      id: 'boost-toll',
      ownerId: 'player-2',
      effectType: 'boostNextToll',
      amount: 25,
      sourceType: 'skill',
    });
    const shieldedMatch = addStatusEffect(boostedMatch, {
      id: 'shield-toll',
      ownerId: 'player-1',
      effectType: 'shieldPenaltyOrToll',
      amount: 1,
      sourceType: 'skill',
    });

    const result = resolveTileForPlayer(shieldedMatch, 0);

    expect(result.match.players[0].cash).toBe(400);
    expect(result.match.players[1].cash).toBe(400);
    expect(result.match.statusEffects).toEqual([
      expect.objectContaining({
        ownerId: 'player-2',
        effectType: 'boostNextToll',
        amount: 25,
      }),
    ]);
  });
});
