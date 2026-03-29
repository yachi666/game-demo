import type { EventDefinition } from '../core/types';
import { EVENT_DEFINITIONS } from '../data/event-config';
import { assertDefined } from '../utils/assert';

export function getEventForLanding(turn: number, tileIndex: number): EventDefinition {
  const index = Math.abs(turn + tileIndex) % EVENT_DEFINITIONS.length;
  return assertDefined(EVENT_DEFINITIONS[index], `Missing event definition at index ${index}`);
}
