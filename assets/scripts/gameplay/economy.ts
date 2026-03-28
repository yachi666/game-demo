import type { MatchState, TileConfig } from '../core/types';
import { assertDefined } from '../utils/assert';

export function getTileAt(match: MatchState, position: number): TileConfig {
  return assertDefined(match.board[position], `Missing tile at board position ${position}`);
}

export function getAssetTotal(match: MatchState, playerIndex: number): number {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  const ownedValue = match.properties.reduce((total, property) => {
    if (property.ownerId !== player.id) {
      return total;
    }

    const tile = match.board.find((candidate) => candidate.id === property.tileId);
    return total + (tile?.purchaseCost ?? 0);
  }, 0);

  return player.cash + ownedValue;
}
