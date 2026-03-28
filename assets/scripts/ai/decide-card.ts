import type { CardDefinition, MatchState } from '../core/types';
import { STARTER_CARD_DEFINITIONS } from '../data/card-config';
import { getTileAt } from '../gameplay/economy';
import { movePlayerPosition } from '../gameplay/movement';
import { assertDefined } from '../utils/assert';

function getCardDefinition(cardId: string): CardDefinition {
  return assertDefined(
    STARTER_CARD_DEFINITIONS.find((card) => card.id === cardId),
    `Unknown card definition ${cardId}`,
  );
}

function isVulnerableNextTile(match: MatchState, playerIndex: number): boolean {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  const nextTile = getTileAt(match, (player.position + 1) % match.board.length);

  if (nextTile.type === 'penalty') {
    return true;
  }

  if (nextTile.type !== 'property') {
    return false;
  }

  const property = match.properties.find((entry) => entry.tileId === nextTile.id);
  return property?.ownerId !== null && property.ownerId !== player.id;
}

function landsOnRewardOrUnownedProperty(match: MatchState, playerIndex: number, steps: number): boolean {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  const landing = movePlayerPosition(player.position, steps, match.board.length);
  const tile = getTileAt(match, landing.nextPosition);

  if (tile.type === 'reward') {
    return true;
  }

  if (tile.type !== 'property') {
    return false;
  }

  const property = match.properties.find((entry) => entry.tileId === tile.id);
  return property?.ownerId === null;
}

export function decideCardToPlay(match: MatchState, playerIndex: number, reserveCash: number): string | null {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  if (player.hasUsedCardThisTurn || player.hand.length === 0) {
    return null;
  }

  if (player.cash < reserveCash) {
    const cashCard = player.hand.find((cardId) => getCardDefinition(cardId).effectType === 'gainCash');
    if (cashCard) {
      return cashCard;
    }
  }

  if (player.cash < reserveCash && isVulnerableNextTile(match, playerIndex)) {
    const shieldCard = player.hand.find((cardId) => getCardDefinition(cardId).effectType === 'shieldPenaltyOrToll');
    if (shieldCard) {
      return shieldCard;
    }
  }

  for (const cardId of player.hand) {
    const card = getCardDefinition(cardId);
    if (card.effectType === 'moveSteps' && landsOnRewardOrUnownedProperty(match, playerIndex, card.amount)) {
      return cardId;
    }
  }

  return null;
}
