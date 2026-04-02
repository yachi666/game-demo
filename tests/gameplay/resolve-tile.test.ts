import { describe, expect, it } from 'vitest';

import { createMatch } from '../../assets/scripts/core/create-match';
import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { resolveTileForPlayer } from '../../assets/scripts/gameplay/resolve-tile';

function createIsolatedMatch() {
  const match = createMatch(structuredClone(BOARD_CONFIG), MATCH_CONFIG);
  match.board = structuredClone(match.board);
  return match;
}

describe('resolveTileForPlayer', () => {
  it('allows buying an unowned property', () => {
    const match = createIsolatedMatch();
    match.players[0].position = 1;

    const result = resolveTileForPlayer(match, 0, { type: 'buy' });

    expect(result.match.players[0].cash).toBe(280);
    expect(result.match.properties.find((property) => property.tileId === 'civic-1')?.ownerId).toBe('player-1');
    expect(result.requiresPropertyDecision).toBe(false);
  });

  it('prompts for a decision when landing on an unowned property and skipping', () => {
    const match = createIsolatedMatch();
    match.players[0].position = 1;

    const result = resolveTileForPlayer(match, 0, { type: 'skip' });

    expect(result.requiresPropertyDecision).toBe(true);
    expect(result.match.players[0].cash).toBe(400);
    expect(result.match.properties.find((property) => property.tileId === 'civic-1')?.ownerId).toBeNull();
  });

  it('bankrupts the buyer without granting ownership when a late-loop property purchase is unaffordable', () => {
    const match = createIsolatedMatch();
    const lateLoopPropertyIndex = BOARD_CONFIG.findIndex((tile) => tile.id === 'neon-3');
    expect(lateLoopPropertyIndex).toBeGreaterThan(-1);
    match.players[0].position = lateLoopPropertyIndex;
    match.players[0].cash = 200;

    const result = resolveTileForPlayer(match, 0, { type: 'buy' });

    expect(result.requiresPropertyDecision).toBe(false);
    expect(result.match.players[0].cash).toBe(-120);
    expect(result.match.players[0].isBankrupt).toBe(true);
    expect(result.match.properties.find((property) => property.tileId === 'neon-3')?.ownerId).toBeNull();
  });

  it('releases owned properties when a penalty tile causes bankruptcy', () => {
    const match = createIsolatedMatch();
    match.players[0].position = 6;
    match.players[0].cash = 60;
    const ownedProperty = match.properties.find((property) => property.tileId === 'civic-1');
    if (!ownedProperty) {
      throw new Error('Missing property state for civic-1');
    }
    ownedProperty.ownerId = 'player-1';

    const result = resolveTileForPlayer(match, 0);

    expect(result.match.players[0].cash).toBe(-10);
    expect(result.match.players[0].isBankrupt).toBe(true);
    expect(result.match.properties.find((property) => property.tileId === 'civic-1')?.ownerId).toBeNull();
  });

  it('blocks a penalty tile with shieldPenaltyOrToll and consumes the shield once', () => {
    const match = createIsolatedMatch();
    match.players[0].position = 6;
    match.statusEffects.push({
      id: 'shield',
      ownerId: 'player-1',
      effectType: 'shieldPenaltyOrToll',
      amount: 1,
      sourceType: 'event',
    });

    const first = resolveTileForPlayer(match, 0);
    const second = resolveTileForPlayer(first.match, 0);

    expect(first.match.players[0].cash).toBe(400);
    expect(first.match.statusEffects).toEqual([]);
    expect(first.match.logs.at(-1)?.message).toBe('Player 1 blocked penalty 70');
    expect(second.match.players[0].cash).toBe(330);
  });

  it('resolves a chance tile through the deterministic event table', () => {
    const match = createIsolatedMatch();
    match.turn = 2;
    match.players[0].position = 2;

    const result = resolveTileForPlayer(match, 0);

    expect(result.requiresPropertyDecision).toBe(false);
    expect(result.match.players[0].position).toBe(2);
    expect(result.match.statusEffects).toEqual([
      {
        id: 'toll-shield',
        ownerId: 'player-1',
        effectType: 'shieldPenaltyOrToll',
        amount: 1,
        sourceType: 'event',
      },
    ]);
  });

  it('releases owned properties when a lose-cash event causes bankruptcy', () => {
    const match = createIsolatedMatch();
    match.turn = 6;
    match.players[0].position = 2;
    match.players[0].cash = 50;
    const ownedProperty = match.properties.find((property) => property.tileId === 'civic-1');
    if (!ownedProperty) {
      throw new Error('Missing property state for civic-1');
    }
    ownedProperty.ownerId = 'player-1';

    const result = resolveTileForPlayer(match, 0);

    expect(result.match.players[0].cash).toBe(-40);
    expect(result.match.players[0].isBankrupt).toBe(true);
    expect(result.match.properties.find((property) => property.tileId === 'civic-1')?.ownerId).toBeNull();
  });

  it('grants and consumes a discount from an event before buying property', () => {
    const match = createIsolatedMatch();
    match.turn = 3;
    match.players[0].position = 2;

    const afterEvent = resolveTileForPlayer(match, 0);
    afterEvent.match.players[0].position = 3;

    const result = resolveTileForPlayer(afterEvent.match, 0, { type: 'buy' });

    expect(result.match.players[0].cash).toBe(295);
    expect(result.match.properties.find((property) => property.tileId === 'civic-2')?.ownerId).toBe('player-1');
    expect(result.match.statusEffects).toEqual([]);
  });

  it('grants toll boost from an event and applies it on the next owned toll', () => {
    const match = createIsolatedMatch();
    match.turn = 4;
    match.players[0].position = 2;

    const afterEvent = resolveTileForPlayer(match, 0);
    const property = afterEvent.match.properties.find((entry) => entry.tileId === 'civic-1');
    if (!property) {
      throw new Error('Missing property state for civic-1');
    }
    property.ownerId = 'player-1';
    afterEvent.match.players[1].position = 1;

    const result = resolveTileForPlayer(afterEvent.match, 1);

    expect(result.match.players[0].cash).toBe(480);
    expect(result.match.players[1].cash).toBe(320);
    expect(result.match.statusEffects).toEqual([]);
  });

  it('pays the owner, bankrupts the payer, and releases payer-owned properties on an unaffordable toll', () => {
    const match = createIsolatedMatch();
    const payerOwned = match.properties.find((property) => property.tileId === 'play-1');
    const ownerOwned = match.properties.find((property) => property.tileId === 'civic-1');
    if (!payerOwned || !ownerOwned) {
      throw new Error('Missing property state for toll bankruptcy test');
    }

    payerOwned.ownerId = 'player-1';
    ownerOwned.ownerId = 'player-2';
    match.players[0].position = 1;
    match.players[0].cash = 40;
    match.players[1].cash = 400;

    const result = resolveTileForPlayer(match, 0);

    expect(result.match.players[0].cash).toBe(-5);
    expect(result.match.players[0].isBankrupt).toBe(true);
    expect(result.match.players[1].cash).toBe(445);
    expect(result.match.properties.find((property) => property.tileId === 'play-1')?.ownerId).toBeNull();
  });

  it('blocks a toll with shieldPenaltyOrToll and consumes the shield once', () => {
    const match = createIsolatedMatch();
    const ownerOwned = match.properties.find((property) => property.tileId === 'civic-1');
    if (!ownerOwned) {
      throw new Error('Missing property state for civic-1');
    }
    ownerOwned.ownerId = 'player-2';
    match.players[0].position = 1;
    match.statusEffects.push({
      id: 'shield',
      ownerId: 'player-1',
      effectType: 'shieldPenaltyOrToll',
      amount: 1,
      sourceType: 'event',
    });

    const first = resolveTileForPlayer(match, 0);
    const second = resolveTileForPlayer(first.match, 0);

    expect(first.match.players[0].cash).toBe(400);
    expect(first.match.players[1].cash).toBe(400);
    expect(first.match.statusEffects).toEqual([]);
    expect(first.match.logs.at(-1)?.message).toBe('Player 1 blocked toll 45');
    expect(second.match.players[0].cash).toBe(355);
    expect(second.match.players[1].cash).toBe(445);
  });

  it('resolves a festival tile as a stronger positive authored event', () => {
    const match = createIsolatedMatch();
    match.players[0].position = 8;

    const result = resolveTileForPlayer(match, 0);

    expect(result.requiresPropertyDecision).toBe(false);
    expect(result.match.players[0].cash).toBe(580);
    expect(result.match.logs.at(-1)?.message).toContain('City Festival');
  });

  it('grants the authored reward on a late-loop reward tile', () => {
    const match = createIsolatedMatch();
    const lateLoopRewardIndex = BOARD_CONFIG.findIndex((tile) => tile.id === 'reward-4');
    expect(lateLoopRewardIndex).toBeGreaterThan(-1);
    match.players[0].position = lateLoopRewardIndex;

    const result = resolveTileForPlayer(match, 0);

    expect(result.requiresPropertyDecision).toBe(false);
    expect(result.match.players[0].cash).toBe(540);
    expect(result.match.logs.at(-1)?.message).toBe('Player 1 gained 140');
  });

  it('moves the player when a chance tile resolves to a movement event', () => {
    const match = createIsolatedMatch();
    match.turn = 1;
    match.players[0].position = 2;

    const result = resolveTileForPlayer(match, 0);

    expect(result.requiresPropertyDecision).toBe(false);
    expect(result.match.players[0].position).toBe(0);
    expect(result.match.players[0].cash).toBe(400);
    expect(result.match.logs.at(-1)?.message).toContain('Road Closure');
    expect(result.match.logs.at(-1)?.message).toContain('moved to 0');
  });

  it('resolves the destination tile after a chance tile moves forward onto a reward tile', () => {
    const match = createIsolatedMatch();
    match.turn = 0;
    match.players[0].position = 2;

    const result = resolveTileForPlayer(match, 0);

    expect(result.requiresPropertyDecision).toBe(false);
    expect(result.match.players[0].position).toBe(4);
    expect(result.match.players[0].cash).toBe(490);
    expect(result.match.logs.at(-1)?.message).toBe('Player 1 gained 90');
  });

  it('resolves festival payout when chance movement lands on a festival tile', () => {
    const match = createIsolatedMatch();
    match.turn = 0;
    match.players[0].position = 2;
    match.board[4] = {
      ...match.board[4],
      id: 'festival-destination',
      label: 'Festival Destination',
      type: 'festival',
      rewardAmount: undefined,
    };

    const result = resolveTileForPlayer(match, 0);

    expect(result.requiresPropertyDecision).toBe(false);
    expect(result.match.players[0].position).toBe(4);
    expect(result.match.players[0].cash).toBe(580);
    expect(result.match.logs.at(-1)?.message).toContain('City Festival');
  });

  it('resolves the destination tile after a chance tile moves forward onto a penalty tile', () => {
    const match = createIsolatedMatch();
    match.turn = 4;
    match.players[0].position = 12;

    const result = resolveTileForPlayer(match, 0);

    expect(result.requiresPropertyDecision).toBe(false);
    expect(result.match.players[0].position).toBe(14);
    expect(result.match.players[0].cash).toBe(315);
    expect(result.match.logs.at(-1)?.message).toBe('Player 1 paid 85');
  });

  it('surfaces requiresPropertyDecision when chance movement lands on an unowned property', () => {
    const match = createIsolatedMatch();
    match.turn = 0;
    match.players[0].position = 2;
    match.board[4] = {
      ...match.board[4],
      id: 'test-property',
      label: 'Test Property',
      type: 'property',
      purchaseCost: 130,
      tollCost: 50,
      rewardAmount: undefined,
      penaltyAmount: undefined,
    };
    match.properties.push({ tileId: 'test-property', ownerId: null });

    const result = resolveTileForPlayer(match, 0);

    expect(result.match.players[0].position).toBe(4);
    expect(result.requiresPropertyDecision).toBe(true);
    expect(result.match.properties.find((property) => property.tileId === 'test-property')?.ownerId).toBeNull();
  });

  it('fails fast when a reward tile is missing its authored reward amount', () => {
    const match = createIsolatedMatch();
    match.board[4] = { ...match.board[4], rewardAmount: undefined };
    match.players[0].position = 4;

    expect(() => resolveTileForPlayer(match, 0)).toThrow('Missing rewardAmount for tile reward-1');
  });

  it('fails fast when an owned property tile is missing its authored toll cost', () => {
    const match = createIsolatedMatch();
    match.board[1] = { ...match.board[1], tollCost: undefined };
    const ownedProperty = match.properties.find((property) => property.tileId === 'civic-1');
    if (!ownedProperty) {
      throw new Error('Missing property state for civic-1');
    }
    ownedProperty.ownerId = 'player-2';
    match.players[0].position = 1;

    expect(() => resolveTileForPlayer(match, 0)).toThrow('Missing tollCost for tile civic-1');
  });

  it('fails fast when a penalty tile is missing its authored penalty amount', () => {
    const match = createIsolatedMatch();
    match.board[6] = { ...match.board[6], penaltyAmount: undefined };
    match.players[0].position = 6;

    expect(() => resolveTileForPlayer(match, 0)).toThrow('Missing penaltyAmount for tile penalty-1');
  });

  it('fails fast when an unowned property tile is missing its authored purchase cost', () => {
    const match = createIsolatedMatch();
    match.board[1] = { ...match.board[1], purchaseCost: undefined };
    match.players[0].position = 1;

    expect(() => resolveTileForPlayer(match, 0, { type: 'buy' })).toThrow('Missing purchaseCost for tile civic-1');
  });
});
