import type { MatchState } from '../core/types';
import { ROLE_DEFINITIONS } from '../data/role-config';
import { getTileAt } from '../gameplay/economy';
import { assertDefined } from '../utils/assert';

function ownsAnyProperty(match: MatchState, playerId: string): boolean {
  return match.properties.some((property) => property.ownerId === playerId);
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

export function decideSkillToUse(match: MatchState, playerIndex: number, reserveCash: number): boolean {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  if (player.hasUsedSkillThisTurn || !player.roleId) {
    return false;
  }

  const role = ROLE_DEFINITIONS.find((entry) => entry.id === player.roleId);
  if (!role) {
    return false;
  }

  switch (role.id) {
    case 'role-economy': {
      const nextTile = getTileAt(match, (player.position + 1) % match.board.length);
      return nextTile.type === 'property' && (nextTile.purchaseCost ?? 0) > player.cash && (nextTile.purchaseCost ?? 0) <= player.cash + role.amount;
    }
    case 'role-toll':
      return ownsAnyProperty(match, player.id);
    case 'role-mobility': {
      const nextTile = getTileAt(match, (player.position + 1) % match.board.length);
      if (nextTile.type === 'reward') {
        return true;
      }
      if (nextTile.type !== 'property') {
        return false;
      }
      const property = match.properties.find((entry) => entry.tileId === nextTile.id);
      return property?.ownerId === null;
    }
    case 'role-defense':
      return player.cash < reserveCash && isVulnerableNextTile(match, playerIndex);
    default:
      return false;
  }
}
