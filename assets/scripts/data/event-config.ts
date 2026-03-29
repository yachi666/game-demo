import type { EventDefinition } from '../core/types';

export const EVENT_DEFINITIONS: EventDefinition[] = [
  { id: 'cash-bonus', label: 'Park Grant', effectType: 'gainCash', amount: 120 },
  { id: 'cash-loss', label: 'Repair Bill', effectType: 'loseCash', amount: 90 },
  { id: 'move-forward', label: 'Express Tram', effectType: 'moveForward', amount: 2 },
  { id: 'move-backward', label: 'Road Closure', effectType: 'moveBackward', amount: 2 },
  { id: 'toll-shield', label: 'VIP Pass', effectType: 'shieldPenaltyOrToll', amount: 1 },
  { id: 'property-discount', label: 'Investor Coupon', effectType: 'discountNextProperty', amount: 40 },
  { id: 'toll-boost', label: 'Peak Crowd', effectType: 'boostNextToll', amount: 35 },
];
