import type { MatchState } from '../core/types';
import { assertDefined } from '../utils/assert';
import { getTileAt } from '../gameplay/economy';
import { shouldAiBuyProperty } from './decide-property';

export function getAiPropertyDecision(match: MatchState, playerIndex: number, reserveCash: number): 'buy' | 'skip' {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  const tile = getTileAt(match, player.position);

  if (tile.type !== 'property' || tile.purchaseCost === undefined) {
    return 'skip';
  }

  return shouldAiBuyProperty(player.cash, tile.purchaseCost, reserveCash) ? 'buy' : 'skip';
}
