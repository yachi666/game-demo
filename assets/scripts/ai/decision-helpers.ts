import type { MatchState } from '../core/types';
import { applyTollBoost, getAssetTotal, getTileAt } from '../gameplay/economy';
import { movePlayerPosition } from '../gameplay/movement';
import { assertDefined } from '../utils/assert';

const TRAILING_DEFENSE_BUFFER = 50;
const PRE_ROLL_WINDOW_MAX = 6;

export type TileHazard =
  | { type: 'none'; danger: 0 }
  | { type: 'penalty'; danger: number }
  | { type: 'hostileToll'; danger: number; ownerId: string; appliedBoost: number };

function getLeadingAssetGap(match: MatchState, playerIndex: number): number {
  const playerAssetTotal = getAssetTotal(match, playerIndex);
  const leadingOpponentAssetTotal = match.players.reduce((highestAssetTotal, _player, index) => {
    if (index === playerIndex) {
      return highestAssetTotal;
    }

    return Math.max(highestAssetTotal, getAssetTotal(match, index));
  }, playerAssetTotal);

  return leadingOpponentAssetTotal - playerAssetTotal;
}

function getPendingEffectAmount(match: MatchState, ownerId: string, effectType: 'boostNextToll'): number {
  return (
    match.statusEffects.find((effect) => effect.ownerId === ownerId && effect.effectType === effectType)?.amount ?? 0
  );
}

export function getDefenseReserve(match: MatchState, playerIndex: number, reserveCash: number): number {
  return reserveCash + (getLeadingAssetGap(match, playerIndex) >= reserveCash ? TRAILING_DEFENSE_BUFFER : 0);
}

export function getTileHazard(
  match: MatchState,
  playerIndex: number,
  position: number,
  consumedTollBoostOwnerIds: ReadonlySet<string> = new Set(),
): TileHazard {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  const tile = getTileAt(match, position);

  if (tile.type === 'penalty') {
    return {
      type: 'penalty',
      danger: tile.penaltyAmount ?? 0,
    };
  }

  if (tile.type !== 'property') {
    return {
      type: 'none',
      danger: 0,
    };
  }

  const property = match.properties.find((entry) => entry.tileId === tile.id);
  if (property?.ownerId === null || property?.ownerId === player.id || property?.ownerId === undefined) {
    return {
      type: 'none',
      danger: 0,
    };
  }

  const appliedBoost = consumedTollBoostOwnerIds.has(property.ownerId)
    ? 0
    : getPendingEffectAmount(match, property.ownerId, 'boostNextToll');

  return {
    type: 'hostileToll',
    danger: applyTollBoost(tile.tollCost ?? 0, appliedBoost),
    ownerId: property.ownerId,
    appliedBoost,
  };
}

export function getNextTileDanger(match: MatchState, playerIndex: number): number {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  return getTileHazard(match, playerIndex, (player.position + 1) % match.board.length).danger;
}

export function getLowestProjectedHazardCash(match: MatchState, playerIndex: number): number | null {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  let lowestProjectedHazardCash: number | null = null;

  for (let roll = 1; roll <= PRE_ROLL_WINDOW_MAX; roll += 1) {
    const movement = movePlayerPosition(player.position, roll, match.board.length);
    const hazard = getTileHazard(match, playerIndex, movement.nextPosition);
    if (hazard.danger === 0) {
      continue;
    }

    const projectedHazardCash = player.cash + movement.passedStartCount * match.startBonus - hazard.danger;
    lowestProjectedHazardCash =
      lowestProjectedHazardCash === null
        ? projectedHazardCash
        : Math.min(lowestProjectedHazardCash, projectedHazardCash);
  }

  return lowestProjectedHazardCash;
}

export function landsOnRewardOrUnownedProperty(match: MatchState, playerIndex: number, steps: number): boolean {
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
