import { appendLog } from '../core/logger';
import type { EventDefinition, MatchState, StatusEffectState } from '../core/types';
import { assertDefined } from '../utils/assert';
import { applyTollBoost, getPropertyPurchaseQuote, getTileAt } from './economy';
import { getEventForLanding } from './events';
import { applyForcedMovement } from './movement';
import { addStatusEffect, consumeStatusEffect } from './status-effects';

type PropertyDecision = { type: 'buy' } | { type: 'skip' };

function assertNever(_value: never, message: string): never {
  throw new Error(message);
}

function releasePlayerProperties(match: MatchState, playerId: string): MatchState['properties'] {
  return match.properties.map((entry) => (entry.ownerId === playerId ? { ...entry, ownerId: null } : entry));
}

function bankruptPlayer(nextMatch: MatchState, playerIndex: number): MatchState {
  const nextPlayer = assertDefined(nextMatch.players[playerIndex], `Missing player at index ${playerIndex}`);
  nextPlayer.isBankrupt = true;
  nextMatch.properties = releasePlayerProperties(nextMatch, nextPlayer.id);
  return nextMatch;
}

function requireTileAmount(value: number | undefined, label: 'rewardAmount' | 'penaltyAmount', tileId: string): number {
  return assertDefined(value, `Missing ${label} for tile ${tileId}`);
}

function requireTileCost(value: number | undefined, label: 'purchaseCost' | 'tollCost', tileId: string): number {
  return assertDefined(value, `Missing ${label} for tile ${tileId}`);
}

function getStatusEffectTypeForEvent(event: EventDefinition): StatusEffectState['effectType'] {
  const effectType = event.effectType;

  switch (effectType) {
    case 'shieldPenaltyOrToll':
      return 'shieldPenaltyOrToll';
    case 'discountNextProperty':
      return 'discountNextProperty';
    case 'boostNextToll':
      return 'boostNextToll';
    case 'gainCash':
    case 'loseCash':
    case 'moveForward':
    case 'moveBackward':
      throw new Error(`Event effect ${effectType} does not map to a status effect`);
    default:
      return assertNever(effectType, `Unhandled event effect ${String(effectType)}`);
  }
}

function createEventStatusEffect(
  playerId: string,
  event: EventDefinition,
  effectType: StatusEffectState['effectType'],
): StatusEffectState {
  return {
    id: event.id,
    ownerId: playerId,
    effectType,
    amount: event.amount,
    sourceType: 'event',
  };
}

function resolveTileForPlayerInternal(
  match: MatchState,
  playerIndex: number,
  propertyDecision: PropertyDecision,
  canTriggerChainedEventMovement: boolean,
): { match: MatchState; requiresPropertyDecision: boolean } {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  const tile = getTileAt(match, player.position);

  function resolveEventForPlayer(event: EventDefinition): { match: MatchState; requiresPropertyDecision: boolean } {
    if (event.effectType === 'gainCash' || event.effectType === 'loseCash') {
      const nextMatch = structuredClone(match);
      const nextPlayer = assertDefined(nextMatch.players[playerIndex], `Missing player at index ${playerIndex}`);
      const cashDelta = event.effectType === 'gainCash' ? event.amount : -event.amount;

      nextPlayer.cash += cashDelta;
      if (nextPlayer.cash < 0) {
        bankruptPlayer(nextMatch, playerIndex);
      }

      nextMatch.logs = appendLog(
        nextMatch.logs,
        nextMatch.turn,
        nextMatch.phase,
        `${nextPlayer.label} resolved ${event.label} (${cashDelta >= 0 ? '+' : ''}${cashDelta})`,
      );
      return { match: nextMatch, requiresPropertyDecision: false };
    }

    if (event.effectType === 'moveForward' || event.effectType === 'moveBackward') {
      const delta = event.effectType === 'moveForward' ? event.amount : -event.amount;
      const movementResult = applyForcedMovement(match, playerIndex, delta);
      movementResult.match.logs = appendLog(
        movementResult.match.logs,
        movementResult.match.turn,
        movementResult.match.phase,
        `${player.label} resolved ${event.label} and moved to ${movementResult.movement.nextPosition}`,
      );

      if (!canTriggerChainedEventMovement) {
        return { match: movementResult.match, requiresPropertyDecision: false };
      }

      return resolveTileForPlayerInternal(movementResult.match, playerIndex, { type: 'skip' }, false);
    }

    const nextMatch = addStatusEffect(
      match,
      createEventStatusEffect(player.id, event, getStatusEffectTypeForEvent(event)),
    );

    nextMatch.logs = appendLog(
      nextMatch.logs,
      nextMatch.turn,
      nextMatch.phase,
      `${player.label} gained ${event.label}`,
    );
    return { match: nextMatch, requiresPropertyDecision: false };
  }

  if (tile.type === 'start') {
    return { match, requiresPropertyDecision: false };
  }

  if (tile.type === 'reward') {
    const reward = requireTileAmount(tile.rewardAmount, 'rewardAmount', tile.id);
    const nextMatch = structuredClone(match);
    assertDefined(nextMatch.players[playerIndex], `Missing player at index ${playerIndex}`).cash += reward;
    nextMatch.logs = appendLog(nextMatch.logs, nextMatch.turn, nextMatch.phase, `${player.label} gained ${reward}`);
    return { match: nextMatch, requiresPropertyDecision: false };
  }

  if (tile.type === 'chance') {
    return canTriggerChainedEventMovement
      ? resolveEventForPlayer(getEventForLanding(match.turn, player.position))
      : { match, requiresPropertyDecision: false };
  }

  if (tile.type === 'festival') {
    return resolveEventForPlayer({
      id: 'festival-bonus',
      label: 'City Festival',
      effectType: 'gainCash',
      amount: 180,
    });
  }

  if (tile.type === 'penalty') {
    const penalty = requireTileAmount(tile.penaltyAmount, 'penaltyAmount', tile.id);
    const shieldResult = consumeStatusEffect(match, player.id, 'shieldPenaltyOrToll');
    if (shieldResult.effect) {
      const shieldedMatch = structuredClone(shieldResult.match);
      shieldedMatch.logs = appendLog(
        shieldedMatch.logs,
        shieldedMatch.turn,
        shieldedMatch.phase,
        `${player.label} blocked penalty ${penalty}`,
      );
      return { match: shieldedMatch, requiresPropertyDecision: false };
    }

    const nextMatch = structuredClone(shieldResult.match);
    const nextPlayer = assertDefined(nextMatch.players[playerIndex], `Missing player at index ${playerIndex}`);
    nextPlayer.cash -= penalty;
    if (nextPlayer.cash < 0) {
      bankruptPlayer(nextMatch, playerIndex);
    }
    nextMatch.logs = appendLog(nextMatch.logs, nextMatch.turn, nextMatch.phase, `${player.label} paid ${penalty}`);
    return { match: nextMatch, requiresPropertyDecision: false };
  }

  const property = assertDefined(
    match.properties.find((entry) => entry.tileId === tile.id),
    `Missing property state for tile ${tile.id}`,
  );

  if (property.ownerId === null) {
    if (propertyDecision.type === 'skip') {
      return { match, requiresPropertyDecision: true };
    }

    const purchaseQuote = getPropertyPurchaseQuote(
      match,
      player.id,
      requireTileCost(tile.purchaseCost, 'purchaseCost', tile.id),
    );
    const discountResult =
      purchaseQuote.appliedDiscount > 0
        ? consumeStatusEffect(match, player.id, 'discountNextProperty')
        : { match, effect: null };
    const nextMatch = structuredClone(discountResult.match);
    const nextPlayer = assertDefined(nextMatch.players[playerIndex], `Missing player at index ${playerIndex}`);
    nextPlayer.cash -= purchaseQuote.effectivePurchaseCost;
    if (nextPlayer.cash < 0) {
      bankruptPlayer(nextMatch, playerIndex);
      nextMatch.logs = appendLog(
        nextMatch.logs,
        nextMatch.turn,
        nextMatch.phase,
        `${nextPlayer.label} could not afford ${tile.label} (${purchaseQuote.effectivePurchaseCost})`,
      );
      return { match: nextMatch, requiresPropertyDecision: false };
    }

    assertDefined(
      nextMatch.properties.find((entry) => entry.tileId === tile.id),
      `Missing property state for tile ${tile.id}`,
    ).ownerId = nextPlayer.id;
    nextMatch.logs = appendLog(
      nextMatch.logs,
      nextMatch.turn,
      nextMatch.phase,
      `${nextPlayer.label} bought ${tile.label}`,
    );
    return { match: nextMatch, requiresPropertyDecision: false };
  }

  if (property.ownerId !== player.id) {
    const tollCost = requireTileCost(tile.tollCost, 'tollCost', tile.id);
    const shieldResult = consumeStatusEffect(match, player.id, 'shieldPenaltyOrToll');
    if (shieldResult.effect) {
      const shieldedMatch = structuredClone(shieldResult.match);
      shieldedMatch.logs = appendLog(
        shieldedMatch.logs,
        shieldedMatch.turn,
        shieldedMatch.phase,
        `${player.label} blocked toll ${tollCost}`,
      );
      return { match: shieldedMatch, requiresPropertyDecision: false };
    }

    const boostResult = consumeStatusEffect(shieldResult.match, property.ownerId, 'boostNextToll');
    const nextMatch = structuredClone(boostResult.match);
    const toll = applyTollBoost(tollCost, boostResult.effect?.amount ?? 0);
    const nextPlayer = assertDefined(nextMatch.players[playerIndex], `Missing player at index ${playerIndex}`);
    const ownerIndex = nextMatch.players.findIndex((candidate) => candidate.id === property.ownerId);
    const owner = assertDefined(
      nextMatch.players[ownerIndex],
      `Missing owner state for property ${tile.id} and player ${property.ownerId}`,
    );

    nextPlayer.cash -= toll;
    owner.cash += toll;

    if (nextPlayer.cash < 0) {
      bankruptPlayer(nextMatch, playerIndex);
    }

    nextMatch.logs = appendLog(nextMatch.logs, nextMatch.turn, nextMatch.phase, `${player.label} paid toll ${toll}`);
    return { match: nextMatch, requiresPropertyDecision: false };
  }

  return { match, requiresPropertyDecision: false };
}

export function resolveTileForPlayer(
  match: MatchState,
  playerIndex: number,
  propertyDecision: PropertyDecision = { type: 'skip' },
) {
  return resolveTileForPlayerInternal(match, playerIndex, propertyDecision, true);
}
