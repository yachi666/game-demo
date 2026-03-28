import type { MatchState, PlayerState } from '../core/types';
import { getAssetTotal } from './economy';

export function getWinner(match: MatchState): PlayerState | null {
  const livingPlayers = match.players.filter((player) => !player.isBankrupt);
  if (livingPlayers.length === 1) {
    return livingPlayers[0] ?? null;
  }

  const winnerByAssets = match.players.find((_, index) => getAssetTotal(match, index) >= match.assetTarget);
  return winnerByAssets ?? null;
}
