import { appendLog } from './logger';
import { GamePhase } from './phases';
import type { MatchAction, MatchState } from './types';

// Legal phase transitions stay centralized here; multi-step sequencing belongs in turn-flow.ts.
export function advancePhase(match: MatchState, action: MatchAction): MatchState {
  switch (action.type) {
    case 'OPEN_ROLE_SELECTION':
      return {
        ...match,
        phase: GamePhase.AwaitRoleSelection,
      };
    case 'ROLE_SELECTION_FINISHED':
      return {
        ...match,
        phase: GamePhase.GameInit,
      };
    case 'START_MATCH':
      return {
        ...match,
        phase: GamePhase.TurnStart,
        logs: appendLog(match.logs, 0, GamePhase.TurnStart, 'Match started'),
      };
    case 'BEGIN_TURN':
      return {
        ...match,
        turn: match.turn + 1,
        phase: GamePhase.AwaitRoll,
        logs: appendLog(match.logs, match.turn + 1, GamePhase.AwaitRoll, 'Turn ready for roll'),
      };
    case 'ENTER_PRE_ROLL_ACTIONS':
      return {
        ...match,
        phase: GamePhase.AwaitPreRollActions,
      };
    case 'ENTER_AI_PRE_ROLL_ACTIONS':
      return {
        ...match,
        phase: GamePhase.AwaitAiPreRollActions,
      };
    case 'PRE_ROLL_ACTIONS_FINISHED':
      return {
        ...match,
        phase: GamePhase.AwaitRoll,
      };
    case 'ROLL_CONFIRMED':
      return {
        ...match,
        phase: GamePhase.MovePiece,
        logs: appendLog(match.logs, match.turn, GamePhase.MovePiece, `Rolled ${action.value}`),
      };
    case 'MOVEMENT_FINISHED':
      return {
        ...match,
        phase: GamePhase.ResolveTile,
      };
    case 'PROMPT_PROPERTY_DECISION':
      return {
        ...match,
        phase: GamePhase.ResolvePropertyDecision,
      };
    case 'PRE_ROLL_TILE_RESOLVED':
      return {
        ...match,
        phase: GamePhase.AwaitPreRollActions,
      };
    case 'AI_PRE_ROLL_TILE_RESOLVED':
      return {
        ...match,
        phase: GamePhase.AwaitAiPreRollActions,
      };
    case 'TILE_RESOLVED':
      return {
        ...match,
        phase: GamePhase.TurnEnd,
      };
    case 'PRE_ROLL_PROPERTY_DECISION_FINISHED':
      return {
        ...match,
        phase: GamePhase.AwaitPreRollActions,
      };
    case 'PROPERTY_DECISION_FINISHED':
      return {
        ...match,
        phase: GamePhase.TurnEnd,
      };
    case 'END_TURN':
      return {
        ...match,
        activePlayerIndex: (match.activePlayerIndex + 1) % match.players.length,
        phase: GamePhase.TurnStart,
      };
    case 'END_GAME':
      return {
        ...match,
        phase: GamePhase.GameOver,
      };
  }
}
