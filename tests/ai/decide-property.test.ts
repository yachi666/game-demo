import { describe, expect, it } from 'vitest';

import { shouldAiBuyProperty } from '../../assets/scripts/ai/decide-property';
import { getAiPropertyDecision, resolveAiLanding } from '../../assets/scripts/ai/decide-turn';
import { createMatch } from '../../assets/scripts/core/create-match';
import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { addStatusEffect } from '../../assets/scripts/gameplay/status-effects';

function createIsolatedMatch() {
  const match = createMatch(structuredClone(BOARD_CONFIG), MATCH_CONFIG);
  match.board = structuredClone(match.board);
  return match;
}

describe('shouldAiBuyProperty', () => {
  it('buys only when reserve cash remains after purchase', () => {
    expect(shouldAiBuyProperty(400, 140, 150)).toBe(true);
    expect(shouldAiBuyProperty(260, 140, 150)).toBe(false);
  });
});

describe('getAiPropertyDecision', () => {
  it('buys when a carried event discount keeps the purchase safe above reserve after forward hazards', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].cash = 330;
    match.players[1].position = 3;

    const discountedMatch = addStatusEffect(match, {
      id: 'property-discount',
      ownerId: 'player-2',
      effectType: 'discountNextProperty',
      amount: 40,
      sourceType: 'event',
    });

    expect(getAiPropertyDecision(match, 1, MATCH_CONFIG.aiReserveCash)).toBe('skip');
    expect(getAiPropertyDecision(discountedMatch, 1, MATCH_CONFIG.aiReserveCash)).toBe('buy');
  });

  it('buys when a pending shield neutralizes the otherwise-blocking first hazard ahead', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].cash = 420;
    match.players[1].position = 17;
    match.properties.find((property) => property.tileId === 'neon-1')!.ownerId = 'player-1';

    const shieldedMatch = addStatusEffect(match, {
      id: 'property-danger-shield',
      ownerId: 'player-2',
      effectType: 'shieldPenaltyOrToll',
      amount: 1,
      sourceType: 'card',
    });

    expect(getAiPropertyDecision(match, 1, MATCH_CONFIG.aiReserveCash)).toBe('skip');
    expect(getAiPropertyDecision(shieldedMatch, 1, MATCH_CONFIG.aiReserveCash)).toBe('buy');
  });

  it('skips when a pending shield is spent on an earlier penalty before a hostile toll', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].cash = 320;
    match.players[1].position = 5;
    match.properties.find((property) => property.tileId === 'play-2')!.ownerId = 'player-1';

    const shieldedMatch = addStatusEffect(match, {
      id: 'ordered-danger-shield',
      ownerId: 'player-2',
      effectType: 'shieldPenaltyOrToll',
      amount: 1,
      sourceType: 'card',
    });

    expect(getAiPropertyDecision(shieldedMatch, 1, MATCH_CONFIG.aiReserveCash)).toBe('skip');
  });

  it('skips when a pending hostile toll boost turns an otherwise-safe buy into a cash trap', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].cash = 325;
    match.players[1].position = 1;
    match.properties.find((property) => property.tileId === 'civic-2')!.ownerId = 'player-1';

    const boostedMatch = addStatusEffect(match, {
      id: 'pending-toll-boost',
      ownerId: 'player-1',
      effectType: 'boostNextToll',
      amount: 25,
      sourceType: 'card',
    });

    expect(getAiPropertyDecision(match, 1, MATCH_CONFIG.aiReserveCash)).toBe('buy');
    expect(getAiPropertyDecision(boostedMatch, 1, MATCH_CONFIG.aiReserveCash)).toBe('skip');
  });

  it('skips when the current property is already owned by an opponent', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].cash = 400;
    match.players[1].position = 3;
    match.properties.find((property) => property.tileId === 'civic-2')!.ownerId = 'player-1';

    expect(getAiPropertyDecision(match, 1, MATCH_CONFIG.aiReserveCash)).toBe('skip');
  });

  it('skips when the current property is already owned by the ai', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].cash = 400;
    match.players[1].position = 3;
    match.properties.find((property) => property.tileId === 'civic-2')!.ownerId = 'player-2';

    expect(getAiPropertyDecision(match, 1, MATCH_CONFIG.aiReserveCash)).toBe('skip');
  });
});

describe('resolveAiLanding', () => {
  it('buys after chance movement lands on an affordable unowned property without leaking a pending decision', () => {
    const match = createIsolatedMatch();
    match.turn = 0;
    match.players[1].position = 2;
    match.players[1].cash = 370;
    match.board[4] = {
      ...match.board[4],
      id: 'ai-destination-property',
      label: 'AI Destination Property',
      type: 'property',
      purchaseCost: 130,
      tollCost: 50,
      rewardAmount: undefined,
      penaltyAmount: undefined,
    };
    match.properties.push({ tileId: 'ai-destination-property', ownerId: null });

    const result = resolveAiLanding(match, 1, MATCH_CONFIG.aiReserveCash);

    expect(result.requiresPropertyDecision).toBe(false);
    expect(result.match.players[1].position).toBe(4);
    expect(result.match.players[1].cash).toBe(240);
    expect(result.match.properties.find((property) => property.tileId === 'ai-destination-property')?.ownerId).toBe(
      'player-2',
    );
  });
});
