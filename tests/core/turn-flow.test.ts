import { describe, expect, it } from 'vitest';

import { createMatch } from '../../assets/scripts/core/create-match';
import { playCardForPlayer } from '../../assets/scripts/gameplay/cards';
import { resolveTileForPlayer } from '../../assets/scripts/gameplay/resolve-tile';
import {
  advanceToNextTurnFlow,
  beginTurnFlow,
  completeRoleSelectionFlow,
  finishPreRollActionWindow,
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

  it('assigns the remaining roles to every later seat in order, including additional human players', () => {
    const multiHumanConfig = {
      ...MATCH_CONFIG,
      players: [
        { ...MATCH_CONFIG.players[0]!, isHuman: true, label: 'Player 1' },
        { ...MATCH_CONFIG.players[1]!, isHuman: true, label: 'Player 2' },
        { ...MATCH_CONFIG.players[2]!, isHuman: false, label: 'AI 1' },
      ],
    };
    const match = openRoleSelectionFlow(createMatch(BOARD_CONFIG, multiHumanConfig));

    const nextMatch = completeRoleSelectionFlow(match, 'role-toll');

    expect(nextMatch.players.map((player) => player.roleId)).toEqual(['role-toll', 'role-economy', 'role-mobility']);
  });

  it('refuses to start turn flow before the human role is selected', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);

    expect(() => beginTurnFlow(match)).toThrow('role selection');
  });

  it('draws a turn-start card and opens the human pre-roll action window', () => {
    const match = completeRoleSelectionFlow(
      openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG)),
      'role-toll',
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
      'role-toll',
    );
    const startedMatch = beginTurnFlow(match);

    const awaitRollMatch = finishPreRollActionWindow(startedMatch);

    expect(awaitRollMatch.phase).toBe(GamePhase.AwaitRoll);
  });

  it('starts the match and carries the expanded board contract into the pre-roll phase', () => {
    const assignedMatch = completeRoleSelectionFlow(
      openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG)),
      'role-toll',
    );

    const nextMatch = beginTurnFlow(assignedMatch);

    expect(nextMatch.phase).toBe(GamePhase.AwaitPreRollActions);
    expect(nextMatch.turn).toBe(1);
    expect(nextMatch.board).toHaveLength(24);
    expect(nextMatch.properties).toHaveLength(12);
    expect(nextMatch.board.at(-1)?.id).toBe('neon-3');
    expect(nextMatch.logs.map((entry) => entry.message)).toEqual(['Match started', 'Turn ready for roll']);
  });

  it('advances to the next player turn, drawing a card and opening the AI pre-roll window', () => {
    const assignedMatch = completeRoleSelectionFlow(
      openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG)),
      'role-toll',
    );
    const startedMatch = beginTurnFlow(assignedMatch);

    const nextTurnMatch = advanceToNextTurnFlow({ ...startedMatch, phase: GamePhase.TurnEnd });

    expect(nextTurnMatch.activePlayerIndex).toBe(1);
    expect(nextTurnMatch.turn).toBe(2);
    expect(nextTurnMatch.phase).toBe(GamePhase.AwaitAiPreRollActions);
    expect(nextTurnMatch.players[1].hand).toEqual(['card-move-2']);
  });

  it('resets turn action flags but preserves unresolved card effects for later turns', () => {
    const assignedMatch = completeRoleSelectionFlow(
      openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG)),
      'role-toll',
    );
    const startedMatch = beginTurnFlow(assignedMatch);
    const cardReadyMatch = {
      ...startedMatch,
      players: startedMatch.players.map((player, index) =>
        index === 0 ? { ...player, hand: ['card-toll-boost-25'] } : player,
      ),
    };
    const boostedMatch = playCardForPlayer(cardReadyMatch, 0, 'card-toll-boost-25');
    const endedTurnMatch = structuredClone(boostedMatch);
    endedTurnMatch.players[0].hasUsedSkillThisTurn = true;
    endedTurnMatch.properties.find((property) => property.tileId === 'civic-1')!.ownerId = 'player-1';

    const nextTurnMatch = advanceToNextTurnFlow({ ...endedTurnMatch, phase: GamePhase.TurnEnd });
    nextTurnMatch.players[1].position = 1;
    const result = resolveTileForPlayer(nextTurnMatch, 1);

    expect(nextTurnMatch.players[0].hasUsedCardThisTurn).toBe(false);
    expect(nextTurnMatch.players[0].hasUsedSkillThisTurn).toBe(false);
    expect(nextTurnMatch.statusEffects).toEqual([
      expect.objectContaining({
        ownerId: 'player-1',
        effectType: 'boostNextToll',
        amount: 25,
        sourceType: 'card',
      }),
    ]);
    expect(result.match.players[0].cash).toBe(470);
    expect(result.match.players[1].cash).toBe(330);
    expect(result.match.statusEffects).toEqual([]);
  });
});
