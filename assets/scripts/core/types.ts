import { GamePhase } from './phases';

export type TileType = 'start' | 'property' | 'reward' | 'penalty';

export interface TileConfig {
  id: string;
  label: string;
  type: TileType;
  purchaseCost?: number;
  tollCost?: number;
  rewardAmount?: number;
  penaltyAmount?: number;
}

export interface PlayerConfig {
  id: string;
  label: string;
  isHuman: boolean;
  color: string;
}

export interface PropertyState {
  tileId: string;
  ownerId: string | null;
}

export interface PlayerState {
  id: string;
  label: string;
  isHuman: boolean;
  color: string;
  position: number;
  cash: number;
  isBankrupt: boolean;
}

export interface MatchLogEntry {
  turn: number;
  phase: GamePhase;
  message: string;
}

export interface MatchState {
  phase: GamePhase;
  turn: number;
  activePlayerIndex: number;
  board: TileConfig[];
  players: PlayerState[];
  properties: PropertyState[];
  logs: MatchLogEntry[];
  startBonus: number;
  assetTarget: number;
}

export type MatchAction =
  | { type: 'START_MATCH' }
  | { type: 'BEGIN_TURN' }
  | { type: 'ROLL_CONFIRMED'; value: number }
  | { type: 'MOVEMENT_FINISHED' }
  | { type: 'PROMPT_PROPERTY_DECISION' }
  | { type: 'TILE_RESOLVED' }
  | { type: 'PROPERTY_DECISION_FINISHED' }
  | { type: 'END_TURN' }
  | { type: 'END_GAME' };
