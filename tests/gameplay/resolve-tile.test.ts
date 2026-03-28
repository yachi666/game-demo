import { describe, expect, it } from 'vitest';

import { createMatch } from '../../assets/scripts/core/create-match';
import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { resolveTileForPlayer } from '../../assets/scripts/gameplay/resolve-tile';

describe('resolveTileForPlayer', () => {
  it('allows buying an unowned property', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].position = 1;

    const result = resolveTileForPlayer(match, 0, { type: 'buy' });

    expect(result.match.players[0].cash).toBe(280);
    expect(result.match.properties.find((property) => property.tileId === 'property-1')?.ownerId).toBe('player-1');
    expect(result.requiresPropertyDecision).toBe(false);
  });
});
