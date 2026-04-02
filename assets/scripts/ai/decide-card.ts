import type { CardDefinition, MatchState } from '../core/types';
import { STARTER_CARD_DEFINITIONS } from '../data/card-config';
import { assertDefined } from '../utils/assert';
import { getDefenseReserve, getLowestProjectedHazardCash, landsOnRewardOrUnownedProperty } from './decision-helpers';

function getCardDefinition(cardId: string): CardDefinition {
  return assertDefined(
    STARTER_CARD_DEFINITIONS.find((card) => card.id === cardId),
    `Unknown card definition ${cardId}`,
  );
}

function hasPendingShield(match: MatchState, playerId: string): boolean {
  return match.statusEffects.some(
    (effect) => effect.ownerId === playerId && effect.effectType === 'shieldPenaltyOrToll',
  );
}

export function decideCardToPlay(match: MatchState, playerIndex: number, reserveCash: number): string | null {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  if (player.hasUsedCardThisTurn || player.hand.length === 0) {
    return null;
  }

  const cashCard = player.hand.find((cardId) => getCardDefinition(cardId).effectType === 'gainCash');
  const shieldCard = player.hand.find((cardId) => getCardDefinition(cardId).effectType === 'shieldPenaltyOrToll');
  const lowestProjectedHazardCash = getLowestProjectedHazardCash(match, playerIndex);
  const defenseReserve = getDefenseReserve(match, playerIndex, reserveCash);

  if (player.cash < reserveCash && cashCard) {
    return cashCard;
  }

  if (
    shieldCard &&
    !hasPendingShield(match, player.id) &&
    lowestProjectedHazardCash !== null &&
    lowestProjectedHazardCash < defenseReserve
  ) {
    return shieldCard;
  }

  for (const cardId of player.hand) {
    const card = getCardDefinition(cardId);
    if (card.effectType === 'moveSteps' && landsOnRewardOrUnownedProperty(match, playerIndex, card.amount)) {
      return cardId;
    }
  }

  return null;
}
