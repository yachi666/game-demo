import { describe, expect, it } from 'vitest';

import { EVENT_DEFINITIONS } from '../../assets/scripts/data/event-config';
import { getEventForLanding } from '../../assets/scripts/gameplay/events';

const EXPECTED_EVENTS = [
  { id: 'cash-bonus', effectType: 'gainCash', amount: 120 },
  { id: 'cash-loss', effectType: 'loseCash', amount: 90 },
  { id: 'move-forward', effectType: 'moveForward', amount: 2 },
  { id: 'move-backward', effectType: 'moveBackward', amount: 2 },
  { id: 'toll-shield', effectType: 'shieldPenaltyOrToll', amount: 1 },
  { id: 'property-discount', effectType: 'discountNextProperty', amount: 40 },
  { id: 'toll-boost', effectType: 'boostNextToll', amount: 35 },
] as const;

describe('getEventForLanding', () => {
  it('returns the same event for the same turn and tile', () => {
    const first = getEventForLanding(3, 5);
    const second = getEventForLanding(3, 5);

    expect(first).toEqual(second);
  });

  it('maps turn and tile index to the expected authored event', () => {
    expect(getEventForLanding(3, 5)).toEqual(EVENT_DEFINITIONS[1]);
    expect(getEventForLanding(7, 9)).toEqual(EVENT_DEFINITIONS[2]);
  });

  it('covers the full authored event table with deterministic modulo lookup', () => {
    expect(
      EVENT_DEFINITIONS.map((event) => ({
        id: event.id,
        effectType: event.effectType,
        amount: event.amount,
      })),
    ).toEqual(EXPECTED_EVENTS);

    expect(EVENT_DEFINITIONS.map((_, index) => getEventForLanding(index, 0).id)).toEqual(
      EVENT_DEFINITIONS.map((event) => event.id),
    );
  });
});
