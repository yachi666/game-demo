import { describe, expect, it } from 'vitest';

import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { advancePhase } from '../../assets/scripts/core/advance-phase';
import { createMatch } from '../../assets/scripts/core/create-match';
import { GamePhase } from '../../assets/scripts/core/phases';

describe('advancePhase', () => {
  it('moves a new match from init to turn start to await roll', () => {
    const initMatch = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    const turnStartMatch = advancePhase(initMatch, { type: 'START_MATCH' });
    const awaitRollMatch = advancePhase(turnStartMatch, { type: 'BEGIN_TURN' });

    expect(turnStartMatch.phase).toBe(GamePhase.TurnStart);
    expect(awaitRollMatch.phase).toBe(GamePhase.AwaitRoll);
    expect(awaitRollMatch.turn).toBe(1);
  });
});
