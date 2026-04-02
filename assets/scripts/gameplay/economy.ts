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

export function applyCostDiscount(cost: number, discount: number): number {
  return Math.max(0, cost - discount);
}

export function getPropertyPurchaseQuote(match: MatchState, playerId: string, purchaseCost: number) {
  const appliedDiscount =
    match.statusEffects.find((effect) => effect.ownerId === playerId && effect.effectType === 'discountNextProperty')
      ?.amount ?? 0;

  return {
    purchaseCost,
    appliedDiscount,
    effectivePurchaseCost: applyCostDiscount(purchaseCost, appliedDiscount),
  };
}

export function applyTollBoost(toll: number, boost: number): number {
  return Math.max(0, toll + boost);
}
