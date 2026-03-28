import { appendLog } from '../core/logger';
import type { MatchState, RoleDefinition } from '../core/types';
import { ROLE_DEFINITIONS } from '../data/role-config';
import { assertDefined } from '../utils/assert';
import { addStatusEffect, clearStatusEffects } from './status-effects';

function getRoleDefinition(roleId: string): RoleDefinition {
  return assertDefined(ROLE_DEFINITIONS.find((role) => role.id === roleId), `Unknown role definition ${roleId}`);
}

export function validateSkillUseForPlayer(match: MatchState, playerIndex: number): RoleDefinition {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);

  if (player.hasUsedSkillThisTurn) {
    throw new Error(`${player.label} has already used a skill this turn`);
  }

  if (!player.roleId) {
    throw new Error(`${player.label} does not have a role assigned`);
  }

  return getRoleDefinition(player.roleId);
}

export function applySkillForPlayer(match: MatchState, playerIndex: number): MatchState {
  const role = validateSkillUseForPlayer(match, playerIndex);
  let nextMatch = structuredClone(match);
  const nextPlayer = assertDefined(nextMatch.players[playerIndex], `Missing player at index ${playerIndex}`);

  nextPlayer.hasUsedSkillThisTurn = true;
  nextMatch = addStatusEffect(nextMatch, {
    id: `${role.id}-${nextPlayer.id}-${nextMatch.turn}-${nextMatch.statusEffects.length}`,
    ownerId: nextPlayer.id,
    effectType: role.skillEffectType,
    amount: role.amount,
    sourceType: 'skill',
  });
  nextMatch.logs = appendLog(nextMatch.logs, nextMatch.turn, nextMatch.phase, `${nextPlayer.label} used ${role.skillLabel}`);
  return nextMatch;
}

export function clearSkillStateForPlayer(match: MatchState, playerIndex: number): MatchState {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  let nextMatch = clearStatusEffects(
    match,
    (effect) => effect.ownerId === player.id && effect.sourceType === 'skill',
  );
  nextMatch = structuredClone(nextMatch);
  assertDefined(nextMatch.players[playerIndex], `Missing player at index ${playerIndex}`).hasUsedSkillThisTurn = false;
  return nextMatch;
}
