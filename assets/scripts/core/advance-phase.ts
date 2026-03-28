import { appendLog } from './logger';
import { GamePhase } from './phases';
import type { MatchAction, MatchState } from './types';

export function advancePhase(match: MatchState, action: MatchAction): MatchState {
  switch (action.type) {
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
    case 'TILE_RESOLVED':
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
