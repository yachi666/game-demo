import type { MatchState } from '../core/types';
import { ROLE_DEFINITIONS } from '../data/role-config';
import { getTileAt } from '../gameplay/economy';
import { assertDefined } from '../utils/assert';
import { getDefenseReserve, getLowestProjectedHazardCash, landsOnRewardOrUnownedProperty } from './decision-helpers';

function ownsAnyProperty(match: MatchState, playerId: string): boolean {
  return match.properties.some((property) => property.ownerId === playerId);
}

function hasPendingEffect(match: MatchState, playerId: string, effectType: string): boolean {
  return match.statusEffects.some((effect) => effect.ownerId === playerId && effect.effectType === effectType);
}

function countFavorableLandingRolls(match: MatchState, playerIndex: number, rollBonus: number): number {
  let favorableLandingCount = 0;

  for (let roll = 1; roll <= 6; roll += 1) {
    if (landsOnRewardOrUnownedProperty(match, playerIndex, roll + rollBonus)) {
      favorableLandingCount += 1;
    }
  }

  return favorableLandingCount;
}

export function decideSkillToUse(match: MatchState, playerIndex: number, reserveCash: number): boolean {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  if (player.hasUsedSkillThisTurn || !player.roleId) {
    return false;
  }

  const role = ROLE_DEFINITIONS.find((entry) => entry.id === player.roleId);
  if (!role || hasPendingEffect(match, player.id, role.skillEffectType)) {
    return false;
  }

  switch (role.id) {
    case 'role-economy': {
      const nextTile = getTileAt(match, (player.position + 1) % match.board.length);
      return (
        nextTile.type === 'property' &&
        (nextTile.purchaseCost ?? 0) > player.cash &&
        (nextTile.purchaseCost ?? 0) <= player.cash + role.amount
      );
    }
    case 'role-toll':
      return ownsAnyProperty(match, player.id);
    case 'role-mobility':
      return (
        countFavorableLandingRolls(match, playerIndex, role.amount) > countFavorableLandingRolls(match, playerIndex, 0)
      );
    case 'role-defense': {
      const lowestProjectedHazardCash = getLowestProjectedHazardCash(match, playerIndex);
      return (
        lowestProjectedHazardCash !== null &&
        lowestProjectedHazardCash < getDefenseReserve(match, playerIndex, reserveCash)
      );
    }
    default:
      return false;
  }
}
