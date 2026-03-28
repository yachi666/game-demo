import { describe, expect, it } from 'vitest';

import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { advancePhase } from '../../assets/scripts/core/advance-phase';
import { createMatch } from '../../assets/scripts/core/create-match';
import { GamePhase } from '../../assets/scripts/core/phases';

describe('advancePhase', () => {
  it('moves a new match from init to turn start to await roll', () => {
    const initMatch = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    const turnStartMatch = advancePhase(initMatch, { type: 'START_MATCH' });
    const awaitRollMatch = advancePhase(turnStartMatch, { type: 'BEGIN_TURN' });

    expect(turnStartMatch.phase).toBe(GamePhase.TurnStart);
    expect(awaitRollMatch.phase).toBe(GamePhase.AwaitRoll);
    expect(awaitRollMatch.turn).toBe(1);
  });

  it('moves a new match into and out of role selection', () => {
    const initMatch = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    const roleSelectionMatch = advancePhase(initMatch, { type: 'OPEN_ROLE_SELECTION' });
    const postSelectionMatch = advancePhase(roleSelectionMatch, { type: 'ROLE_SELECTION_FINISHED' });

    expect(roleSelectionMatch.phase).toBe(GamePhase.AwaitRoleSelection);
    expect(postSelectionMatch.phase).toBe(GamePhase.GameInit);
  });

  it('moves from the pre-roll action window back to await roll', () => {
    const initMatch = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    const preRollMatch = advancePhase(initMatch, { type: 'ENTER_PRE_ROLL_ACTIONS' });
    const awaitRollMatch = advancePhase(preRollMatch, { type: 'PRE_ROLL_ACTIONS_FINISHED' });

    expect(preRollMatch.phase).toBe(GamePhase.AwaitPreRollActions);
    expect(awaitRollMatch.phase).toBe(GamePhase.AwaitRoll);
  });

  it('opens the ai pre-roll action window explicitly', () => {
    const initMatch = createMatch(BOARD_CONFIG, MATCH_CONFIG);

    const aiPreRollMatch = advancePhase(initMatch, { type: 'ENTER_AI_PRE_ROLL_ACTIONS' });

    expect(aiPreRollMatch.phase).toBe(GamePhase.AwaitAiPreRollActions);
  });

  it('returns to the pre-roll action window after resolving a pre-roll landing', () => {
    const initMatch = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    const resolvingTileMatch = { ...initMatch, phase: GamePhase.ResolveTile };
    const resolvingPromptMatch = { ...initMatch, phase: GamePhase.ResolvePropertyDecision };

    const afterTileResolution = advancePhase(resolvingTileMatch, { type: 'PRE_ROLL_TILE_RESOLVED' });
    const afterPropertyDecision = advancePhase(resolvingPromptMatch, { type: 'PRE_ROLL_PROPERTY_DECISION_FINISHED' });

    expect(afterTileResolution.phase).toBe(GamePhase.AwaitPreRollActions);
    expect(afterPropertyDecision.phase).toBe(GamePhase.AwaitPreRollActions);
  });

  it('returns ai pre-roll landing resolution to the ai pre-roll window', () => {
    const initMatch = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    const resolvingTileMatch = { ...initMatch, phase: GamePhase.ResolveTile };

    const afterAiTileResolution = advancePhase(resolvingTileMatch, { type: 'AI_PRE_ROLL_TILE_RESOLVED' });

    expect(afterAiTileResolution.phase).toBe(GamePhase.AwaitAiPreRollActions);
  });
});
