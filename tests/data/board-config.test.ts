import { describe, expect, it } from 'vitest';

import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';

const EXPECTED_TILE_VALUES = {
  'civic-1': { purchaseCost: 120, tollCost: 45 },
  'civic-2': { purchaseCost: 145, tollCost: 55 },
  'reward-1': { rewardAmount: 90 },
  'play-1': { purchaseCost: 160, tollCost: 60 },
  'penalty-1': { penaltyAmount: 70 },
  'play-2': { purchaseCost: 175, tollCost: 70 },
  'harbor-1': { purchaseCost: 190, tollCost: 80 },
  'reward-2': { rewardAmount: 110 },
  'harbor-2': { purchaseCost: 205, tollCost: 90 },
  'sky-1': { purchaseCost: 220, tollCost: 95 },
  'penalty-2': { penaltyAmount: 85 },
  'sky-2': { purchaseCost: 235, tollCost: 105 },
  'reward-3': { rewardAmount: 120 },
  'sky-3': { purchaseCost: 250, tollCost: 115 },
} as const;

describe('BOARD_CONFIG', () => {
  it('contains a medium-size city park loop', () => {
    expect(BOARD_CONFIG.length).toBeGreaterThanOrEqual(16);
    expect(BOARD_CONFIG.length).toBeLessThanOrEqual(20);
  });

  it('contains start, property, reward, penalty, chance, and festival tiles', () => {
    const types = new Set(BOARD_CONFIG.map((tile) => tile.type));

    expect(types.has('start')).toBe(true);
    expect(types.has('property')).toBe(true);
    expect(types.has('reward')).toBe(true);
    expect(types.has('penalty')).toBe(true);
    expect(types.has('chance')).toBe(true);
    expect(types.has('festival')).toBe(true);
  });

  it('uses an authored district distribution and tile mix', () => {
    const districts = new Set(BOARD_CONFIG.map((tile) => tile.district).filter(Boolean));
    const counts = BOARD_CONFIG.reduce<Record<string, number>>((totals, tile) => {
      totals[tile.type] = (totals[tile.type] ?? 0) + 1;
      return totals;
    }, {});

    expect(districts).toEqual(new Set(['civic-plaza', 'play-street', 'harbor-leisure', 'sky-garden']));
    expect(BOARD_CONFIG.every((tile) => tile.type === 'start' || Boolean(tile.accentColor))).toBe(true);
    expect(counts.property).toBeGreaterThanOrEqual(8);
    expect(counts.property).toBeLessThanOrEqual(10);
    expect(counts.reward).toBeGreaterThanOrEqual(2);
    expect(counts.reward).toBeLessThanOrEqual(3);
    expect(counts.penalty).toBe(2);
    expect((counts.chance ?? 0) + (counts.festival ?? 0)).toBeGreaterThanOrEqual(2);
    expect((counts.chance ?? 0) + (counts.festival ?? 0)).toBeLessThanOrEqual(3);
  });

  it('keeps the authored city-park loop stable enough to catch accidental reordering', () => {
    expect(BOARD_CONFIG.map((tile) => tile.id)).toEqual([
      'start',
      'civic-1',
      'chance-1',
      'civic-2',
      'reward-1',
      'play-1',
      'penalty-1',
      'play-2',
      'festival-1',
      'harbor-1',
      'reward-2',
      'harbor-2',
      'chance-2',
      'sky-1',
      'penalty-2',
      'sky-2',
      'reward-3',
      'sky-3',
    ]);
  });

  it('provides the required authored fields for each tile type', () => {
    for (const tile of BOARD_CONFIG) {
      if (tile.type === 'property') {
        expect(tile.purchaseCost, `property ${tile.id} must define purchaseCost`).toEqual(expect.any(Number));
        expect(tile.tollCost, `property ${tile.id} must define tollCost`).toEqual(expect.any(Number));
      }

      if (tile.type === 'reward') {
        expect(tile.rewardAmount, `reward ${tile.id} must define rewardAmount`).toEqual(expect.any(Number));
      }

      if (tile.type === 'penalty') {
        expect(tile.penaltyAmount, `penalty ${tile.id} must define penaltyAmount`).toEqual(expect.any(Number));
      }
    }
  });

  it('locks the authored economics payloads exactly', () => {
    const actual = Object.fromEntries(
      BOARD_CONFIG.filter(
        (tile) => tile.type === 'property' || tile.type === 'reward' || tile.type === 'penalty',
      ).map((tile) => [
        tile.id,
        {
          ...(tile.purchaseCost !== undefined ? { purchaseCost: tile.purchaseCost } : {}),
          ...(tile.tollCost !== undefined ? { tollCost: tile.tollCost } : {}),
          ...(tile.rewardAmount !== undefined ? { rewardAmount: tile.rewardAmount } : {}),
          ...(tile.penaltyAmount !== undefined ? { penaltyAmount: tile.penaltyAmount } : {}),
        },
      ]),
    );

    expect(actual).toEqual(EXPECTED_TILE_VALUES);
  });
});
