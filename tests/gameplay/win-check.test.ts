import { describe, expect, it } from 'vitest';

import { createMatch } from '../../assets/scripts/core/create-match';
import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { getWinner } from '../../assets/scripts/gameplay/win-check';

describe('getWinner', () => {
  it('returns a player when the asset target is reached', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].cash = 650;

    expect(getWinner(match)?.id).toBe('player-1');
  });
});
