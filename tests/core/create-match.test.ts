import { describe, expect, it } from 'vitest';

import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { createMatch } from '../../assets/scripts/core/create-match';
import { GamePhase } from '../../assets/scripts/core/phases';

describe('createMatch', () => {
  it('creates players at tile zero with starting cash', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);

    expect(match.phase).toBe(GamePhase.GameInit);
    expect(match.activePlayerIndex).toBe(0);
    expect(match.players).toHaveLength(MATCH_CONFIG.players.length);
    expect(match.players.map((player) => player.position)).toEqual([0, 0, 0, 0]);
    expect(match.players.map((player) => player.cash)).toEqual([400, 400, 400, 400]);
    expect(match.properties.every((property) => property.ownerId === null)).toBe(true);
  });
});
