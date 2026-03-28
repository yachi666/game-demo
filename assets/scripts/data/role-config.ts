import type { RoleDefinition } from '../core/types';

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: 'role-economy',
    label: 'Broker',
    skillLabel: 'Smart Buy',
    skillEffectType: 'discountNextProperty',
    amount: 30,
  },
  {
    id: 'role-toll',
    label: 'Collector',
    skillLabel: 'High Toll',
    skillEffectType: 'boostNextToll',
    amount: 20,
  },
  {
    id: 'role-mobility',
    label: 'Courier',
    skillLabel: 'Quick Step',
    skillEffectType: 'rollBonus',
    amount: 1,
  },
  {
    id: 'role-defense',
    label: 'Guardian',
    skillLabel: 'Safe Pass',
    skillEffectType: 'shieldPenaltyOrToll',
    amount: 1,
  },
];
