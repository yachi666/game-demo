import type { MatchState } from '../core/types';
import { assertDefined } from '../utils/assert';
import { consumeStatusEffect } from './status-effects';

export function movePlayerPosition(current: number, steps: number, boardSize: number) {
  const visitedPositions: number[] = [];
  let nextPosition = current;
  let passedStart = false;
  let passedStartCount = 0;

  if (steps >= 0) {
    for (let step = 0; step < steps; step += 1) {
      nextPosition = (nextPosition + 1) % boardSize;
      if (nextPosition === 0) {
        passedStart = true;
        passedStartCount += 1;
      }
      visitedPositions.push(nextPosition);
    }
  } else {
    for (let step = 0; step < Math.abs(steps); step += 1) {
      nextPosition = (nextPosition - 1 + boardSize) % boardSize;
      visitedPositions.push(nextPosition);
    }
  }

  return {
    nextPosition,
    passedStart,
    passedStartCount,
    visitedPositions,
  };
}

export function applyMovementForPlayer(match: MatchState, playerIndex: number, steps: number) {
  const nextMatch = structuredClone(match);
  const nextPlayer = assertDefined(nextMatch.players[playerIndex], `Missing player at index ${playerIndex}`);
  const movement = movePlayerPosition(nextPlayer.position, steps, nextMatch.board.length);

  nextPlayer.position = movement.nextPosition;
  if (movement.passedStartCount > 0) {
    nextPlayer.cash += nextMatch.startBonus * movement.passedStartCount;
  }

  return {
    match: nextMatch,
    movement,
  };
}

export function applyForcedMovement(match: MatchState, playerIndex: number, delta: number) {
  return applyMovementForPlayer(match, playerIndex, delta);
}

export function applyRollMovementForPlayer(match: MatchState, playerIndex: number, roll: number) {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  const bonusResult = consumeStatusEffect(match, player.id, 'rollBonus');
  const appliedRollBonus = bonusResult.effect?.amount ?? 0;
  const totalSteps = roll + appliedRollBonus;
  const movementResult = applyMovementForPlayer(bonusResult.match, playerIndex, totalSteps);

  return {
    ...movementResult,
    appliedRollBonus,
    totalSteps,
  };
}
