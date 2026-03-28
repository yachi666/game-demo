import { describe, expect, it } from 'vitest';

import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { STARTER_CARD_DEFINITIONS } from '../../assets/scripts/data/card-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { ROLE_DEFINITIONS } from '../../assets/scripts/data/role-config';
import { createMatch } from '../../assets/scripts/core/create-match';
import { GamePhase } from '../../assets/scripts/core/phases';

describe('createMatch', () => {
  it('creates players at tile zero with starting cash and strategic-state defaults', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);

    expect(match.phase).toBe(GamePhase.GameInit);
    expect(match.activePlayerIndex).toBe(0);
    expect(match.players).toHaveLength(MATCH_CONFIG.players.length);
    expect(match.players.map((player) => player.position)).toEqual([0, 0, 0, 0]);
    expect(match.players.map((player) => player.cash)).toEqual([400, 400, 400, 400]);
    expect(match.players.every((player) => player.roleId === null)).toBe(true);
    expect(match.players.every((player) => player.hand.length === 0)).toBe(true);
    expect(match.players.every((player) => player.hasUsedCardThisTurn === false)).toBe(true);
    expect(match.players.every((player) => player.hasUsedSkillThisTurn === false)).toBe(true);
    expect(match.properties.every((property) => property.ownerId === null)).toBe(true);
    expect(match.requiresRoleSelection).toBe(true);
    expect(match.availableRoleIds).toEqual(ROLE_DEFINITIONS.map((role) => role.id));
    expect(match.drawPile).toEqual(MATCH_CONFIG.starterDeckCardIds);
    expect(match.drawPile).toHaveLength(STARTER_CARD_DEFINITIONS.length);
    expect(match.discardPile).toEqual([]);
    expect(match.statusEffects).toEqual([]);
  });
});
