import { describe, expect, it } from 'vitest';

import { createMatch } from '../../assets/scripts/core/create-match';
import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { drawCardsForPlayer, playCardForPlayer } from '../../assets/scripts/gameplay/cards';

describe('cards', () => {
  it('draws cards from the deterministic starter deck into the active hand', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);

    const nextMatch = drawCardsForPlayer(match, 0, 2);

    expect(nextMatch.players[0].hand).toEqual(['card-cash-50', 'card-move-2']);
    expect(nextMatch.drawPile).toEqual(['card-move-back-1', 'card-shield', 'card-discount-40', 'card-toll-boost-25']);
  });

  it('plays a gain-cash card, discards it, and marks the turn card-use flag', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].hand = ['card-cash-50'];

    const nextMatch = playCardForPlayer(match, 0, 'card-cash-50');

    expect(nextMatch.players[0].cash).toBe(450);
    expect(nextMatch.players[0].hand).toEqual([]);
    expect(nextMatch.players[0].hasUsedCardThisTurn).toBe(true);
    expect(nextMatch.discardPile).toEqual(['card-cash-50']);
  });

  it('plays a move card and updates the player position deterministically', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].position = 1;
    match.players[0].hand = ['card-move-2'];

    const nextMatch = playCardForPlayer(match, 0, 'card-move-2');

    expect(nextMatch.players[0].position).toBe(3);
    expect(nextMatch.players[0].hand).toEqual([]);
    expect(nextMatch.discardPile).toEqual(['card-move-2']);
  });

  it('plays a backward move card through the shared movement pipeline', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].position = 0;
    match.players[0].hand = ['card-move-back-1'];

    const nextMatch = playCardForPlayer(match, 0, 'card-move-back-1');

    expect(nextMatch.players[0].position).toBe(BOARD_CONFIG.length - 1);
    expect(nextMatch.players[0].cash).toBe(400);
    expect(nextMatch.discardPile).toEqual(['card-move-back-1']);
  });

  it('refuses to play a second card in the same turn', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].hand = ['card-cash-50', 'card-move-2'];

    const afterFirstCard = playCardForPlayer(match, 0, 'card-cash-50');

    expect(() => playCardForPlayer(afterFirstCard, 0, 'card-move-2')).toThrow('already used a card');
  });
});
