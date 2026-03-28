import type { PlayerConfig } from '../core/types';

export const MATCH_CONFIG: {
  players: PlayerConfig[];
  startingCash: number;
  startBonus: number;
  assetTarget: number;
  aiReserveCash: number;
} = {
  players: [
    { id: 'player-1', label: 'Player 1', isHuman: true, color: '#ff7a59' },
    { id: 'player-2', label: 'AI 1', isHuman: false, color: '#4aa8ff' },
    { id: 'player-3', label: 'AI 2', isHuman: false, color: '#7ddc83' },
    { id: 'player-4', label: 'AI 3', isHuman: false, color: '#ffd166' },
  ],
  startingCash: 400,
  startBonus: 100,
  assetTarget: 650,
  aiReserveCash: 150,
};
