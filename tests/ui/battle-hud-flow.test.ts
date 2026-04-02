import { describe, expect, it } from 'vitest';

import { createMatch } from '../../assets/scripts/core/create-match';
import { GamePhase } from '../../assets/scripts/core/phases';
import {
  advanceToNextTurnFlow,
  beginTurnFlow,
  completeRoleSelectionFlow,
  finishPreRollActionWindow,
  openRoleSelectionFlow,
} from '../../assets/scripts/core/turn-flow';
import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import * as battlePresentation from '../../assets/scripts/ui/battle-presentation';

type BattleHudFlowPresentation = {
  rollButtonEnabled: boolean;
  roleSelection: {
    visible: boolean;
    options: Array<{ id: string; label: string; skillLabel: string }>;
  };
  cardHand: {
    visible: boolean;
    canPlayCards: boolean;
    cards: Array<{ id: string; label: string }>;
  };
  skillButton: {
    visible: boolean;
    canUseSkill: boolean;
    label: string | null;
  };
};

function getHudFlowPresentation(match: Parameters<Exclude<typeof getBattleHudFlowPresentation, undefined>>[0]) {
  expect(getBattleHudFlowPresentation).toBeTypeOf('function');
  return getBattleHudFlowPresentation!(match);
}

const getBattleHudFlowPresentation = (battlePresentation as Record<string, unknown>).getBattleHudFlowPresentation as
  | ((match: ReturnType<typeof createMatch>) => BattleHudFlowPresentation)
  | undefined;

function createAssignedMatch() {
  return completeRoleSelectionFlow(openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG)), 'role-toll');
}

describe('getBattleHudFlowPresentation', () => {
  it('shows every available role option only during role selection', () => {
    const match = openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG));

    const presentation = getHudFlowPresentation(match);

    expect(presentation.roleSelection).toEqual({
      visible: true,
      options: [
        { id: 'role-economy', label: 'Broker', skillLabel: 'Smart Buy' },
        { id: 'role-toll', label: 'Collector', skillLabel: 'High Toll' },
        { id: 'role-mobility', label: 'Courier', skillLabel: 'Quick Step' },
        { id: 'role-defense', label: 'Guardian', skillLabel: 'Safe Pass' },
      ],
    });
    expect(presentation.rollButtonEnabled).toBe(false);
    expect(presentation.cardHand.visible).toBe(false);
    expect(presentation.skillButton.visible).toBe(false);
  });

  it('shows the active human hand, skill, and roll affordance during pre-roll actions', () => {
    const match = beginTurnFlow(createAssignedMatch());

    const presentation = getHudFlowPresentation(match);

    expect(match.phase).toBe(GamePhase.AwaitPreRollActions);
    expect(presentation.rollButtonEnabled).toBe(true);
    expect(presentation.roleSelection.visible).toBe(false);
    expect(presentation.cardHand.visible).toBe(true);
    expect(presentation.cardHand.canPlayCards).toBe(true);
    expect(presentation.cardHand.cards.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'card-cash-50', label: 'Lucky Coin' },
    ]);
    expect(presentation.skillButton).toEqual({
      visible: true,
      canUseSkill: true,
      label: 'High Toll',
    });
  });

  it('keeps the richer action area visible but locked after the human spends both pre-roll actions', () => {
    const match = beginTurnFlow(createAssignedMatch());
    match.players[0].hasUsedCardThisTurn = true;
    match.players[0].hasUsedSkillThisTurn = true;

    const presentation = getHudFlowPresentation(match);

    expect(presentation.rollButtonEnabled).toBe(true);
    expect(presentation.cardHand.visible).toBe(true);
    expect(presentation.cardHand.canPlayCards).toBe(false);
    expect(presentation.skillButton.visible).toBe(true);
    expect(presentation.skillButton.canUseSkill).toBe(false);
    expect(presentation.skillButton.label).toBe('High Toll');
  });

  it('hides hand and skill controls once the human pre-roll window closes', () => {
    const match = finishPreRollActionWindow(beginTurnFlow(createAssignedMatch()));

    const presentation = getHudFlowPresentation(match);

    expect(match.phase).toBe(GamePhase.AwaitRoll);
    expect(presentation.rollButtonEnabled).toBe(true);
    expect(presentation.cardHand.visible).toBe(false);
    expect(presentation.skillButton.visible).toBe(false);
  });

  it('hides human-only battle controls during AI pre-roll turns', () => {
    const startedMatch = beginTurnFlow(createAssignedMatch());
    const nextTurnMatch = advanceToNextTurnFlow({ ...startedMatch, phase: GamePhase.TurnEnd });

    const presentation = getHudFlowPresentation(nextTurnMatch);

    expect(nextTurnMatch.phase).toBe(GamePhase.AwaitAiPreRollActions);
    expect(presentation.rollButtonEnabled).toBe(false);
    expect(presentation.roleSelection.visible).toBe(false);
    expect(presentation.cardHand.visible).toBe(false);
    expect(presentation.skillButton.visible).toBe(false);
  });
});
