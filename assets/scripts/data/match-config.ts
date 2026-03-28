import type { MatchConfig as MatchConfigType } from '../core/types';
import { ROLE_DEFINITIONS } from './role-config';
import { STARTER_CARD_DEFINITIONS } from './card-config';

export const MATCH_CONFIG: MatchConfigType & {
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
  starterDeckCardIds: STARTER_CARD_DEFINITIONS.map((card) => card.id),
  availableRoleIds: ROLE_DEFINITIONS.map((role) => role.id),
  aiReserveCash: 150,
};
