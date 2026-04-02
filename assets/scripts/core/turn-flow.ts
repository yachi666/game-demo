import { advancePhase } from './advance-phase';
import { GamePhase } from './phases';
import type { MatchState } from './types';
import { drawCardsForPlayer } from '../gameplay/cards';
import { assertDefined } from '../utils/assert';

// This module owns deterministic multi-step sequencing so scene controllers stay thin adapters.
export function openRoleSelectionFlow(match: MatchState): MatchState {
  if (!match.requiresRoleSelection) {
    throw new Error('Role selection is already completed');
  }
  if (match.phase !== GamePhase.GameInit) {
    throw new Error(`Role selection can only open from ${GamePhase.GameInit}`);
  }

  return advancePhase(match, { type: 'OPEN_ROLE_SELECTION' });
}

function assignRolesForMatch(match: MatchState, humanRoleId: string): MatchState {
  if (!match.requiresRoleSelection) {
    throw new Error('Human role selection has already been completed');
  }

  if (!match.availableRoleIds.includes(humanRoleId)) {
    throw new Error(`Unknown role selection: ${humanRoleId}`);
  }

  const nextMatch = structuredClone(match);
  const humanIndex = nextMatch.players.findIndex((player) => player.isHuman);

  if (humanIndex === -1) {
    throw new Error('A human player is required for role selection');
  }

  const remainingRoleIds = nextMatch.availableRoleIds.filter((roleId) => roleId !== humanRoleId);
  nextMatch.players[humanIndex]!.roleId = humanRoleId;

  nextMatch.players.forEach((player, index) => {
    if (index === humanIndex) {
      return;
    }

    const nextRoleId = remainingRoleIds.shift();
    if (!nextRoleId) {
      throw new Error('Not enough roles available to assign to players');
    }
    player.roleId = nextRoleId;
  });

  nextMatch.availableRoleIds = [];
  nextMatch.requiresRoleSelection = false;
  return nextMatch;
}

export function completeRoleSelectionFlow(match: MatchState, humanRoleId: string): MatchState {
  if (match.phase !== GamePhase.AwaitRoleSelection) {
    throw new Error(`Role selection can only complete from ${GamePhase.AwaitRoleSelection}`);
  }

  const assignedMatch = assignRolesForMatch(match, humanRoleId);
  return advancePhase(assignedMatch, { type: 'ROLE_SELECTION_FINISHED' });
}

export function openPreRollActionWindow(match: MatchState): MatchState {
  if (match.requiresRoleSelection) {
    throw new Error('Human role selection is required before opening pre-roll actions');
  }
  if (match.phase !== GamePhase.AwaitRoll) {
    throw new Error(`Pre-roll actions can only open from ${GamePhase.AwaitRoll}`);
  }

  return advancePhase(match, { type: 'ENTER_PRE_ROLL_ACTIONS' });
}

export function finishPreRollActionWindow(match: MatchState): MatchState {
  if (match.phase !== GamePhase.AwaitPreRollActions && match.phase !== GamePhase.AwaitAiPreRollActions) {
    throw new Error(
      `Pre-roll actions can only close from ${GamePhase.AwaitPreRollActions} or ${GamePhase.AwaitAiPreRollActions}`,
    );
  }

  return advancePhase(match, { type: 'PRE_ROLL_ACTIONS_FINISHED' });
}

export function beginTurnFlow(match: MatchState): MatchState {
  if (match.requiresRoleSelection) {
    throw new Error('Human role selection is required before turn flow can start');
  }

  const startedMatch = match.turn === 0 ? advancePhase(match, { type: 'START_MATCH' }) : match;
  const turnReadyMatch = advancePhase(startedMatch, { type: 'BEGIN_TURN' });
  const drawnMatch = drawCardsForPlayer(turnReadyMatch, turnReadyMatch.activePlayerIndex, 1);
  const activePlayer = assertDefined(
    drawnMatch.players[drawnMatch.activePlayerIndex],
    `Missing player at index ${drawnMatch.activePlayerIndex}`,
  );

  return advancePhase(
    drawnMatch,
    activePlayer.isHuman ? { type: 'ENTER_PRE_ROLL_ACTIONS' } : { type: 'ENTER_AI_PRE_ROLL_ACTIONS' },
  );
}

export function advanceToNextTurnFlow(match: MatchState): MatchState {
  if (match.phase !== GamePhase.TurnEnd) {
    throw new Error(`Next turn flow can only advance from ${GamePhase.TurnEnd}`);
  }

  const cleanedMatch = structuredClone(match);
  const cleanedPlayer = assertDefined(
    cleanedMatch.players[cleanedMatch.activePlayerIndex],
    `Missing player at index ${cleanedMatch.activePlayerIndex}`,
  );

  // One-shot gameplay effects stay in the deterministic rules state until their next legal consumer uses them.
  cleanedPlayer.hasUsedCardThisTurn = false;
  cleanedPlayer.hasUsedSkillThisTurn = false;

  return beginTurnFlow(advancePhase(cleanedMatch, { type: 'END_TURN' }));
}
