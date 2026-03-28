import type { MatchState, StatusEffectState } from '../core/types';

export function addStatusEffect(match: MatchState, effect: StatusEffectState): MatchState {
  const nextMatch = structuredClone(match);
  nextMatch.statusEffects.push(effect);
  return nextMatch;
}

export function consumeStatusEffect(
  match: MatchState,
  ownerId: string,
  effectType: StatusEffectState['effectType'],
): { match: MatchState; effect: StatusEffectState | null } {
  const effectIndex = match.statusEffects.findIndex(
    (effect) => effect.ownerId === ownerId && effect.effectType === effectType,
  );

  if (effectIndex === -1) {
    return { match, effect: null };
  }

  const nextMatch = structuredClone(match);
  const [effect] = nextMatch.statusEffects.splice(effectIndex, 1);
  return { match: nextMatch, effect: effect ?? null };
}

export function clearStatusEffects(
  match: MatchState,
  shouldClear: (effect: StatusEffectState) => boolean,
): MatchState {
  const nextMatch = structuredClone(match);
  nextMatch.statusEffects = nextMatch.statusEffects.filter((effect) => !shouldClear(effect));
  return nextMatch;
}
