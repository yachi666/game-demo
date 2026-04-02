import type { MatchState } from '../core/types';
import { assertDefined } from '../utils/assert';
import { getTileHazard } from './decision-helpers';

const PROPERTY_DANGER_LOOKAHEAD = 3;

function hasPendingShield(match: MatchState, playerId: string): boolean {
  return match.statusEffects.some(
    (effect) => effect.ownerId === playerId && effect.effectType === 'shieldPenaltyOrToll',
  );
}

export function getAiForwardDanger(
  match: MatchState,
  playerIndex: number,
  lookahead = PROPERTY_DANGER_LOOKAHEAD,
): number {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  const consumedTollBoostOwnerIds = new Set<string>();
  let shieldAvailable = hasPendingShield(match, player.id);
  let forwardDanger = 0;

  for (let step = 1; step <= lookahead; step += 1) {
    const tilePosition = (player.position + step) % match.board.length;
    const hazard = getTileHazard(match, playerIndex, tilePosition, consumedTollBoostOwnerIds);

    if (hazard.danger === 0) {
      continue;
    }

    if (shieldAvailable) {
      shieldAvailable = false;
      continue;
    }

    forwardDanger += hazard.danger;
    if (hazard.type === 'hostileToll' && hazard.appliedBoost > 0) {
      consumedTollBoostOwnerIds.add(hazard.ownerId);
    }
  }

  return forwardDanger;
}

export function shouldAiBuyProperty(
  currentCash: number,
  purchaseCost: number,
  reserveCash: number,
  forwardDanger = 0,
): boolean {
  const projectedCash = currentCash - purchaseCost;
  return projectedCash >= reserveCash && projectedCash - forwardDanger >= reserveCash;
}
