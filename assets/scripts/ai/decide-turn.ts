import type { MatchState } from '../core/types';
import { assertDefined } from '../utils/assert';
import { getPropertyPurchaseQuote, getTileAt } from '../gameplay/economy';
import { resolveTileForPlayer } from '../gameplay/resolve-tile';
import { getAiForwardDanger, shouldAiBuyProperty } from './decide-property';

export function getAiPropertyDecision(match: MatchState, playerIndex: number, reserveCash: number): 'buy' | 'skip' {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  const tile = getTileAt(match, player.position);

  if (tile.type !== 'property' || tile.purchaseCost === undefined) {
    return 'skip';
  }

  const property = match.properties.find((entry) => entry.tileId === tile.id);
  if (property && property.ownerId !== null) {
    return 'skip';
  }

  const purchaseQuote = getPropertyPurchaseQuote(match, player.id, tile.purchaseCost);
  const forwardDanger = getAiForwardDanger(match, playerIndex);
  return shouldAiBuyProperty(player.cash, purchaseQuote.effectivePurchaseCost, reserveCash, forwardDanger)
    ? 'buy'
    : 'skip';
}

export function resolveAiLanding(match: MatchState, playerIndex: number, reserveCash: number) {
  const initialDecision = getAiPropertyDecision(match, playerIndex, reserveCash);
  const initialResult = resolveTileForPlayer(match, playerIndex, { type: initialDecision });

  if (!initialResult.requiresPropertyDecision) {
    return initialResult;
  }

  const followUpDecision = getAiPropertyDecision(initialResult.match, playerIndex, reserveCash);
  if (followUpDecision === 'buy') {
    return resolveTileForPlayer(initialResult.match, playerIndex, { type: 'buy' });
  }

  return {
    match: initialResult.match,
    requiresPropertyDecision: false,
  };
}
