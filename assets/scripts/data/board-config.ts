import type { TileConfig } from '../core/types';

export const BOARD_CONFIG: TileConfig[] = [
  { id: 'start', label: 'Start', type: 'start' },
  { id: 'property-1', label: 'Mint Plaza', type: 'property', purchaseCost: 120, tollCost: 45 },
  { id: 'reward-1', label: 'Lucky Fountain', type: 'reward', rewardAmount: 80 },
  { id: 'property-2', label: 'Lantern Row', type: 'property', purchaseCost: 140, tollCost: 55 },
  { id: 'penalty-1', label: 'Tax Booth', type: 'penalty', penaltyAmount: 60 },
  { id: 'property-3', label: 'Harbor Walk', type: 'property', purchaseCost: 160, tollCost: 65 },
  { id: 'reward-2', label: 'Treasure Cart', type: 'reward', rewardAmount: 90 },
  { id: 'property-4', label: 'Moon Gate', type: 'property', purchaseCost: 180, tollCost: 75 },
];
