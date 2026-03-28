import type { CardDefinition } from '../core/types';

export const STARTER_CARD_DEFINITIONS: CardDefinition[] = [
  { id: 'card-cash-50', label: 'Lucky Coin', effectType: 'gainCash', amount: 50 },
  { id: 'card-move-2', label: 'Short Dash', effectType: 'moveSteps', amount: 2 },
  { id: 'card-move-back-1', label: 'Retreat Step', effectType: 'moveSteps', amount: -1 },
  { id: 'card-shield', label: 'Street Shield', effectType: 'shieldPenaltyOrToll', amount: 1 },
  { id: 'card-discount-40', label: 'Buyer Coupon', effectType: 'discountNextProperty', amount: 40 },
  { id: 'card-toll-boost-25', label: 'Rent Spike', effectType: 'boostNextToll', amount: 25 },
];
