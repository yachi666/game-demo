import { describe, expect, it } from 'vitest';

import { createMatch } from '../../assets/scripts/core/create-match';
import { addStatusEffect } from '../../assets/scripts/gameplay/status-effects';
import { playCardForPlayer } from '../../assets/scripts/gameplay/cards';
import {
  advanceToNextTurnFlow,
  beginTurnFlow,
  completeRoleSelectionFlow,
  finishPreRollActionWindow,
  openPreRollActionWindow,
  openRoleSelectionFlow,
} from '../../assets/scripts/core/turn-flow';
import { GamePhase } from '../../assets/scripts/core/phases';
import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';

describe('turn-flow', () => {
  it('opens role selection before the first turn starts', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);

    const nextMatch = openRoleSelectionFlow(match);

    expect(nextMatch.phase).toBe(GamePhase.AwaitRoleSelection);
  });

  it('completes role selection and returns to the game init phase', () => {
    const match = openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG));

    const nextMatch = completeRoleSelectionFlow(match, 'role-toll');

    expect(nextMatch.phase).toBe(GamePhase.GameInit);
    expect(nextMatch.requiresRoleSelection).toBe(false);
    expect(nextMatch.availableRoleIds).toEqual([]);
    expect(nextMatch.players.map((player) => player.roleId)).toEqual([
      'role-toll',
      'role-economy',
      'role-mobility',
      'role-defense',
    ]);
  });

  it('refuses to start turn flow before the human role is selected', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);

    expect(() => beginTurnFlow(match)).toThrow('role selection');
  });

  it('draws a turn-start card and opens the human pre-roll action window', () => {
    const match = completeRoleSelectionFlow(
      openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG)),
      'role-toll'
    );
    const startedMatch = beginTurnFlow(match);

    expect(startedMatch.phase).toBe(GamePhase.AwaitPreRollActions);
    expect(startedMatch.players[0].hand).toEqual(['card-cash-50']);
    expect(startedMatch.drawPile).toEqual([
      'card-move-2',
      'card-move-back-1',
      'card-shield',
      'card-discount-40',
      'card-toll-boost-25',
    ]);
  });

  it('opens and closes the pre-roll action window after role selection', () => {
    const match = completeRoleSelectionFlow(
      openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG)),
      'role-toll'
    );
    const startedMatch = beginTurnFlow(match);

    const awaitRollMatch = finishPreRollActionWindow(startedMatch);

    expect(awaitRollMatch.phase).toBe(GamePhase.AwaitRoll);
  });

  it('starts the match and enters the pre-roll phase after roles are assigned', () => {
    const assignedMatch = completeRoleSelectionFlow(
      openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG)),
      'role-toll'
    );

    const nextMatch = beginTurnFlow(assignedMatch);

    expect(nextMatch.phase).toBe(GamePhase.AwaitPreRollActions);
    expect(nextMatch.turn).toBe(1);
    expect(nextMatch.logs.map((entry) => entry.message)).toEqual(['Match started', 'Turn ready for roll']);
  });

  it('advances to the next player turn, drawing a card and opening the AI pre-roll window', () => {
    const assignedMatch = completeRoleSelectionFlow(
      openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG)),
      'role-toll'
    );
    const startedMatch = beginTurnFlow(assignedMatch);

    const nextTurnMatch = advanceToNextTurnFlow({ ...startedMatch, phase: GamePhase.TurnEnd });

    expect(nextTurnMatch.activePlayerIndex).toBe(1);
    expect(nextTurnMatch.turn).toBe(2);
    expect(nextTurnMatch.phase).toBe(GamePhase.AwaitAiPreRollActions);
    expect(nextTurnMatch.players[1].hand).toEqual(['card-move-2']);
  });

  it('cleans up turn-limited flags and status effects before the next turn starts', () => {
    const assignedMatch = completeRoleSelectionFlow(
      openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG)),
      'role-toll'
    );
    const startedMatch = beginTurnFlow(assignedMatch);
    const cardReadyMatch = {
      ...startedMatch,
      players: startedMatch.players.map((player, index) =>
        index === 0 ? { ...player, hand: ['card-cash-50', 'card-move-2'] } : player,
      ),
    };
    const playedCardMatch = playCardForPlayer(cardReadyMatch, 0, 'card-cash-50');
    const markedMatch = structuredClone(playedCardMatch);
    markedMatch.players[0].hasUsedSkillThisTurn = true;
    const effectedMatch = addStatusEffect(markedMatch, {
      id: 'turn-end-skill',
      ownerId: 'player-1',
      effectType: 'shieldPenaltyOrToll',
      amount: 1,
      sourceType: 'skill',
    });

    const nextTurnMatch = advanceToNextTurnFlow({ ...effectedMatch, phase: GamePhase.TurnEnd });

    expect(nextTurnMatch.players[0].hasUsedCardThisTurn).toBe(false);
    expect(nextTurnMatch.players[0].hasUsedSkillThisTurn).toBe(false);
    expect(nextTurnMatch.statusEffects).toEqual([]);
  });
});
