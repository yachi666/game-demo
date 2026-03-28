import { describe, expect, it } from 'vitest';

import { createMatch } from '../../assets/scripts/core/create-match';
import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { decideCardToPlay } from '../../assets/scripts/ai/decide-card';

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
    match.properties.find((property) => property.tileId === 'property-1')!.ownerId = 'player-1';

    expect(decideCardToPlay(match, 1, MATCH_CONFIG.aiReserveCash)).toBe('card-shield');
  });

  it('plays a move card only when it lands on a reward or unowned property', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].position = 0;
    match.players[1].hand = ['card-move-2', 'card-move-back-1'];

    expect(decideCardToPlay(match, 1, MATCH_CONFIG.aiReserveCash)).toBe('card-move-2');
  });

  it('returns null when no card heuristic is satisfied', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].position = 0;
    match.players[1].hand = ['card-toll-boost-25'];

    expect(decideCardToPlay(match, 1, MATCH_CONFIG.aiReserveCash)).toBeNull();
  });
});
