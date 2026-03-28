import { appendLog } from '../core/logger';
import type { MatchState } from '../core/types';
import { assertDefined } from '../utils/assert';
import { applyCostDiscount, applyTollBoost, getTileAt } from './economy';
import { consumeStatusEffect } from './status-effects';

type PropertyDecision = { type: 'buy' } | { type: 'skip' };

export function resolveTileForPlayer(
  match: MatchState,
  playerIndex: number,
  propertyDecision: PropertyDecision = { type: 'skip' },
) {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  const tile = getTileAt(match, player.position);

  if (tile.type === 'start') {
    return { match, requiresPropertyDecision: false };
  }

  if (tile.type === 'reward') {
    const reward = tile.rewardAmount ?? 0;
    const nextMatch = structuredClone(match);
    assertDefined(nextMatch.players[playerIndex], `Missing player at index ${playerIndex}`).cash += reward;
    nextMatch.logs = appendLog(nextMatch.logs, nextMatch.turn, nextMatch.phase, `${player.label} gained ${reward}`);
    return { match: nextMatch, requiresPropertyDecision: false };
  }

  if (tile.type === 'penalty') {
    const penalty = tile.penaltyAmount ?? 0;
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
      nextPlayer.isBankrupt = true;
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

    const discountResult = consumeStatusEffect(match, player.id, 'discountNextProperty');
    const nextMatch = structuredClone(discountResult.match);
    const nextPlayer = assertDefined(nextMatch.players[playerIndex], `Missing player at index ${playerIndex}`);
    const purchaseCost = applyCostDiscount(tile.purchaseCost ?? 0, discountResult.effect?.amount ?? 0);
    nextPlayer.cash -= purchaseCost;
    assertDefined(
      nextMatch.properties.find((entry) => entry.tileId === tile.id),
      `Missing property state for tile ${tile.id}`,
    ).ownerId = nextPlayer.id;
    nextMatch.logs = appendLog(nextMatch.logs, nextMatch.turn, nextMatch.phase, `${nextPlayer.label} bought ${tile.label}`);
    return { match: nextMatch, requiresPropertyDecision: false };
  }

  if (property.ownerId !== player.id) {
    const shieldResult = consumeStatusEffect(match, player.id, 'shieldPenaltyOrToll');
    if (shieldResult.effect) {
      const shieldedMatch = structuredClone(shieldResult.match);
      shieldedMatch.logs = appendLog(
        shieldedMatch.logs,
        shieldedMatch.turn,
        shieldedMatch.phase,
        `${player.label} blocked toll ${tile.tollCost ?? 0}`,
      );
      return { match: shieldedMatch, requiresPropertyDecision: false };
    }

    const boostResult = consumeStatusEffect(shieldResult.match, property.ownerId, 'boostNextToll');
    const nextMatch = structuredClone(boostResult.match);
    const toll = applyTollBoost(tile.tollCost ?? 0, boostResult.effect?.amount ?? 0);
    const nextPlayer = assertDefined(nextMatch.players[playerIndex], `Missing player at index ${playerIndex}`);
    const ownerIndex = nextMatch.players.findIndex((candidate) => candidate.id === property.ownerId);
    const owner = assertDefined(
      nextMatch.players[ownerIndex],
      `Missing owner state for property ${tile.id} and player ${property.ownerId}`,
    );

    nextPlayer.cash -= toll;
    owner.cash += toll;

    if (nextPlayer.cash < 0) {
      nextPlayer.isBankrupt = true;
      nextMatch.properties = nextMatch.properties.map((entry) =>
        entry.ownerId === nextPlayer.id ? { ...entry, ownerId: null } : entry,
      );
    }

    nextMatch.logs = appendLog(
      nextMatch.logs,
      nextMatch.turn,
      nextMatch.phase,
      `${player.label} paid toll ${toll}`,
    );
    return { match: nextMatch, requiresPropertyDecision: false };
  }

  return { match, requiresPropertyDecision: false };
}
