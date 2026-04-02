import { describe, expect, it } from 'vitest';

import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { STARTER_CARD_DEFINITIONS } from '../../assets/scripts/data/card-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { ROLE_DEFINITIONS } from '../../assets/scripts/data/role-config';
import { createMatch } from '../../assets/scripts/core/create-match';
import { GamePhase } from '../../assets/scripts/core/phases';

describe('createMatch', () => {
  it('creates a match-local snapshot for the expanded 24-tile board and 12-property loop', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    const propertyTileIds = BOARD_CONFIG.filter((tile) => tile.type === 'property').map((tile) => tile.id);
    const originalLabel = BOARD_CONFIG[1]?.label;

    expect(match.phase).toBe(GamePhase.GameInit);
    expect(match.activePlayerIndex).toBe(0);
    expect(match.board).toHaveLength(24);
    expect(match.board).not.toBe(BOARD_CONFIG);
    expect(match.board.at(-1)?.id).toBe('neon-3');
    expect(match.players).toHaveLength(MATCH_CONFIG.players.length);
    expect(match.players.map((player) => player.position)).toEqual([0, 0, 0, 0]);
    expect(match.players.map((player) => player.cash)).toEqual([400, 400, 400, 400]);
    expect(match.players.every((player) => player.roleId === null)).toBe(true);
    expect(match.players.every((player) => player.hand.length === 0)).toBe(true);
    expect(match.players.every((player) => player.hasUsedCardThisTurn === false)).toBe(true);
    expect(match.players.every((player) => player.hasUsedSkillThisTurn === false)).toBe(true);
    expect(match.properties).toHaveLength(12);
    expect(match.properties.map((property) => property.tileId)).toEqual(propertyTileIds);
    expect(match.properties.every((property) => property.ownerId === null)).toBe(true);
    expect(match.requiresRoleSelection).toBe(true);
    expect(match.availableRoleIds).toEqual(ROLE_DEFINITIONS.map((role) => role.id));
    expect(match.drawPile).toEqual(MATCH_CONFIG.starterDeckCardIds);
    expect(match.drawPile).toHaveLength(STARTER_CARD_DEFINITIONS.length);
    expect(match.discardPile).toEqual([]);
    expect(match.statusEffects).toEqual([]);

    match.board[1]!.label = 'Temporary Test Label';
    expect(BOARD_CONFIG[1]?.label).toBe(originalLabel);
  });

  it('rejects boards that fall back to the tiny prototype footprint', () => {
    expect(() => createMatch(BOARD_CONFIG.slice(0, 18), MATCH_CONFIG)).toThrow('at least 24 tiles');
  });
});
