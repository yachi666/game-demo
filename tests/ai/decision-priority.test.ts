import { describe, expect, it } from 'vitest';

import { decideCardToPlay } from '../../assets/scripts/ai/decide-card';
import { decideSkillToUse } from '../../assets/scripts/ai/decide-skill';
import { getAiPropertyDecision } from '../../assets/scripts/ai/decide-turn';
import { createMatch } from '../../assets/scripts/core/create-match';
import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { playCardForPlayer } from '../../assets/scripts/gameplay/cards';

const firstPropertyId = 'civic-1';
const secondDistrictPropertyId = 'play-1';

describe('AI decision priority', () => {
  it('plays a shield before an opportunistic move and then preserves the matching defense skill', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].cash = 520;
    match.players[1].roleId = 'role-defense';
    match.players[1].cash = 180;
    match.players[1].position = 0;
    match.players[1].hand = ['card-shield', 'card-move-back-1'];
    match.properties.find((property) => property.tileId === firstPropertyId)!.ownerId = 'player-1';

    expect(decideCardToPlay(match, 1, MATCH_CONFIG.aiReserveCash)).toBe('card-shield');

    const afterCard = playCardForPlayer(match, 1, 'card-shield');
    expect(decideSkillToUse(afterCard, 1, MATCH_CONFIG.aiReserveCash)).toBe(false);
  });

  it('skips buying when a hostile toll zone ahead would leave the ai exposed', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].cash = 320;
    match.players[1].position = 3;
    match.properties.find((property) => property.tileId === secondDistrictPropertyId)!.ownerId = 'player-1';

    expect(getAiPropertyDecision(match, 1, MATCH_CONFIG.aiReserveCash)).toBe('skip');
  });
});
