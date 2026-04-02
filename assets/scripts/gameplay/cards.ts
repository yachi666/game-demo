import { appendLog } from '../core/logger';
import type { CardDefinition, MatchState } from '../core/types';
import { STARTER_CARD_DEFINITIONS } from '../data/card-config';
import { assertDefined } from '../utils/assert';
import { applyMovementForPlayer } from './movement';
import { addStatusEffect } from './status-effects';

function getCardDefinition(cardId: string): CardDefinition {
  return assertDefined(
    STARTER_CARD_DEFINITIONS.find((card) => card.id === cardId),
    `Unknown card definition ${cardId}`,
  );
}

export function drawCardsForPlayer(match: MatchState, playerIndex: number, count: number): MatchState {
  if (count <= 0) {
    return match;
  }

  const nextMatch = structuredClone(match);
  const nextPlayer = assertDefined(nextMatch.players[playerIndex], `Missing player at index ${playerIndex}`);
  const drawnCards = nextMatch.drawPile.splice(0, count);
  nextPlayer.hand.push(...drawnCards);
  return nextMatch;
}

export function validateCardPlayForPlayer(match: MatchState, playerIndex: number, cardId: string): void {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);

  if (player.hasUsedCardThisTurn) {
    throw new Error(`${player.label} has already used a card this turn`);
  }

  if (!player.hand.includes(cardId)) {
    throw new Error(`${player.label} does not have card ${cardId} in hand`);
  }
}

export function discardCardForPlayer(match: MatchState, playerIndex: number, cardId: string): MatchState {
  const nextMatch = structuredClone(match);
  const nextPlayer = assertDefined(nextMatch.players[playerIndex], `Missing player at index ${playerIndex}`);
  const handIndex = nextPlayer.hand.indexOf(cardId);
  nextPlayer.hand.splice(handIndex, 1);
  nextPlayer.hasUsedCardThisTurn = true;
  nextMatch.discardPile.push(cardId);
  return nextMatch;
}

export function resolveCardForPlayer(match: MatchState, playerIndex: number, cardId: string): MatchState {
  const card = getCardDefinition(cardId);
  let nextMatch = structuredClone(match);
  const nextPlayer = assertDefined(nextMatch.players[playerIndex], `Missing player at index ${playerIndex}`);

  if (card.effectType === 'gainCash') {
    nextPlayer.cash += card.amount;
  } else if (card.effectType === 'moveSteps') {
    nextMatch = applyMovementForPlayer(nextMatch, playerIndex, card.amount).match;
  } else {
    nextMatch = addStatusEffect(nextMatch, {
      id: `${card.id}-${nextPlayer.id}-${nextMatch.turn}-${nextMatch.statusEffects.length}`,
      ownerId: nextPlayer.id,
      effectType: card.effectType,
      amount: card.amount,
      sourceType: 'card',
    });
  }

  nextMatch.logs = appendLog(
    nextMatch.logs,
    nextMatch.turn,
    nextMatch.phase,
    `${nextPlayer.label} played ${card.label}`,
  );
  return nextMatch;
}

export function playCardForPlayer(match: MatchState, playerIndex: number, cardId: string): MatchState {
  validateCardPlayForPlayer(match, playerIndex, cardId);
  const discardedMatch = discardCardForPlayer(match, playerIndex, cardId);
  return resolveCardForPlayer(discardedMatch, playerIndex, cardId);
}
