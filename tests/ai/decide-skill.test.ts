import { describe, expect, it } from 'vitest';

import { createMatch } from '../../assets/scripts/core/create-match';
import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { decideSkillToUse } from '../../assets/scripts/ai/decide-skill';

describe('decideSkillToUse', () => {
  it('uses the Broker skill when the next property would only be affordable with the discount', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].roleId = 'role-economy';
    match.players[1].cash = 100;
    match.players[1].position = 0;

    expect(decideSkillToUse(match, 1, MATCH_CONFIG.aiReserveCash)).toBe(true);
  });

  it('uses the Collector skill when the ai already owns property', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].roleId = 'role-toll';
    match.properties.find((property) => property.tileId === 'property-1')!.ownerId = 'player-2';

    expect(decideSkillToUse(match, 1, MATCH_CONFIG.aiReserveCash)).toBe(true);
  });

  it('uses the Courier skill when the next tile is a reward or unowned property', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].roleId = 'role-mobility';
    match.players[1].position = 1;

    expect(decideSkillToUse(match, 1, MATCH_CONFIG.aiReserveCash)).toBe(true);
  });

  it('uses the Guardian skill when the ai is low on cash and vulnerable next turn', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].roleId = 'role-defense';
    match.players[1].cash = 120;
    match.players[1].position = 0;
    match.properties.find((property) => property.tileId === 'property-1')!.ownerId = 'player-1';

    expect(decideSkillToUse(match, 1, MATCH_CONFIG.aiReserveCash)).toBe(true);
  });

  it('returns false when the skill has already been used or no heuristic is met', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].roleId = 'role-toll';
    match.players[1].hasUsedSkillThisTurn = true;

    expect(decideSkillToUse(match, 1, MATCH_CONFIG.aiReserveCash)).toBe(false);
  });
});
