import { describe, expect, it } from 'vitest';

import { createMatch } from '../../assets/scripts/core/create-match';
import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { decideCardToPlay } from '../../assets/scripts/ai/decide-card';
import { addStatusEffect } from '../../assets/scripts/gameplay/status-effects';

const firstPropertyId = 'civic-1';

describe('decideCardToPlay', () => {
  it('plays a gain-cash card when the active player is below the reserve threshold', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].cash = 100;
    match.players[1].hand = ['card-cash-50', 'card-move-2'];

    expect(decideCardToPlay(match, 1, MATCH_CONFIG.aiReserveCash)).toBe('card-cash-50');
  });

  it('plays a shield card when the active player is low on cash and vulnerable to penalties or tolls', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].cash = 120;
    match.players[1].position = 0;
    match.players[1].hand = ['card-shield'];
    match.properties.find((property) => property.tileId === firstPropertyId)!.ownerId = 'player-1';

    expect(decideCardToPlay(match, 1, MATCH_CONFIG.aiReserveCash)).toBe('card-shield');
  });

  it('prefers a shield card over an opportunistic move when trailing into a hostile toll', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].cash = 520;
    match.players[1].cash = 180;
    match.players[1].position = 0;
    match.players[1].hand = ['card-shield', 'card-move-back-1'];
    match.properties.find((property) => property.tileId === firstPropertyId)!.ownerId = 'player-1';

    expect(decideCardToPlay(match, 1, MATCH_CONFIG.aiReserveCash)).toBe('card-shield');
  });

  it('plays a shield card when the highest pre-roll danger sits at roll +6 with a pending toll boost', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].cash = 320;
    match.players[1].position = 17;
    match.players[1].hand = ['card-shield', 'card-move-back-1'];
    match.properties.find((property) => property.tileId === 'neon-3')!.ownerId = 'player-1';
    match.statusEffects.push({
      id: 'boosted-neon-3',
      ownerId: 'player-1',
      effectType: 'boostNextToll',
      amount: 25,
      sourceType: 'card',
    });

    expect(decideCardToPlay(match, 1, MATCH_CONFIG.aiReserveCash)).toBe('card-shield');
  });

  it('skips a shield card when the only hazardous wrap-around roll is offset by the start bonus', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].cash = 180;
    match.players[1].position = 23;
    match.players[1].hand = ['card-shield'];
    match.properties.find((property) => property.tileId === firstPropertyId)!.ownerId = 'player-1';

    expect(decideCardToPlay(match, 1, MATCH_CONFIG.aiReserveCash)).toBeNull();
  });

  it('does not spend a shield card when a shield is already pending', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].cash = 120;
    match.players[1].position = 0;
    match.players[1].hand = ['card-shield'];
    match.properties.find((property) => property.tileId === firstPropertyId)!.ownerId = 'player-1';

    const shieldedMatch = addStatusEffect(match, {
      id: 'existing-shield',
      ownerId: 'player-2',
      effectType: 'shieldPenaltyOrToll',
      amount: 1,
      sourceType: 'event',
    });

    expect(decideCardToPlay(shieldedMatch, 1, MATCH_CONFIG.aiReserveCash)).toBeNull();
  });

  it('plays a move card only when it lands on a reward or unowned property', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].position = 0;
    match.players[1].hand = ['card-move-2', 'card-move-back-1'];

    expect(decideCardToPlay(match, 1, MATCH_CONFIG.aiReserveCash)).toBe('card-move-back-1');
  });

  it('returns null when no card heuristic is satisfied', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].position = 0;
    match.players[1].hand = ['card-toll-boost-25'];

    expect(decideCardToPlay(match, 1, MATCH_CONFIG.aiReserveCash)).toBeNull();
  });
});
