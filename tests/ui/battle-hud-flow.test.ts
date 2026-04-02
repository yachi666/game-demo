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

type Match = ReturnType<typeof createMatch>;

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

type TopInfoBannerPresentation = {
  accentHex: string;
  eventLabel: string;
  incomeLabel: string;
  roundLabel: string;
};

function getHudFlowPresentation(match: Match) {
  expect(getBattleHudFlowPresentation).toBeTypeOf('function');
  return getBattleHudFlowPresentation!(match);
}

function getTopBannerPresentation(match: Match) {
  expect(getTopInfoBannerPresentation).toBeTypeOf('function');
  return getTopInfoBannerPresentation!(match);
}

const getBattleHudFlowPresentation = (battlePresentation as Record<string, unknown>).getBattleHudFlowPresentation as
  | ((match: Match) => BattleHudFlowPresentation)
  | undefined;

const getTopInfoBannerPresentation = (battlePresentation as Record<string, unknown>).getTopInfoBannerPresentation as
  | ((match: Match) => TopInfoBannerPresentation)
  | undefined;

function createAssignedMatch() {
  return completeRoleSelectionFlow(openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG)), 'role-toll');
}

describe('getTopInfoBannerPresentation', () => {
  it('surfaces the role-selection prompt before the match starts', () => {
    const match = openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG));

    expect(getTopBannerPresentation(match)).toMatchObject({
      eventLabel: 'Choose a role',
    });
  });

  it('surfaces round copy and the active player accent during the active turn', () => {
    const match = beginTurnFlow(createAssignedMatch());

    expect(getTopBannerPresentation(match)).toMatchObject({
      roundLabel: 'Round 0',
      accentHex: match.players[match.activePlayerIndex]!.color,
    });
  });
});

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
