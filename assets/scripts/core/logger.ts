import { GamePhase } from './phases';
import type { MatchLogEntry } from './types';

export function appendLog(
  logs: MatchLogEntry[],
  turn: number,
  phase: GamePhase,
  message: string,
): MatchLogEntry[] {
  return [...logs, { turn, phase, message }];
}
