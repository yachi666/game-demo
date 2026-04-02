import type { GamePhase } from './phases';

export type TileType = 'start' | 'property' | 'reward' | 'penalty' | 'chance' | 'festival';
export type BoardDistrict = 'civic-plaza' | 'play-street' | 'harbor-leisure' | 'sky-garden' | 'neon-bazaar';
export type CardEffectType =
  | 'gainCash'
  | 'moveSteps'
  | 'shieldPenaltyOrToll'
  | 'discountNextProperty'
  | 'boostNextToll';
export type EventEffectType =
  | 'gainCash'
  | 'loseCash'
  | 'moveForward'
  | 'moveBackward'
  | 'shieldPenaltyOrToll'
  | 'discountNextProperty'
  | 'boostNextToll';

export type SkillEffectType = 'discountNextProperty' | 'boostNextToll' | 'rollBonus' | 'shieldPenaltyOrToll';

export interface CardDefinition {
  id: string;
  label: string;
  effectType: CardEffectType;
  amount: number;
}

export interface EventDefinition {
  id: string;
  label: string;
  effectType: EventEffectType;
  amount: number;
}

export interface RoleDefinition {
  id: string;
  label: string;
  skillLabel: string;
  skillEffectType: SkillEffectType;
  amount: number;
}

export interface TileConfig {
  id: string;
  label: string;
  type: TileType;
  district?: BoardDistrict;
  eventId?: string;
  accentColor?: string;
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
  roleId: string | null;
  hand: string[];
  hasUsedCardThisTurn: boolean;
  hasUsedSkillThisTurn: boolean;
  position: number;
  cash: number;
  isBankrupt: boolean;
}

export interface StatusEffectState {
  id: string;
  ownerId: string;
  effectType: CardEffectType | SkillEffectType;
  amount: number;
  sourceType: 'card' | 'skill' | 'event';
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
  drawPile: string[];
  discardPile: string[];
  availableRoleIds: string[];
  requiresRoleSelection: boolean;
  statusEffects: StatusEffectState[];
  startBonus: number;
  assetTarget: number;
}

export interface MatchConfig {
  players: PlayerConfig[];
  startingCash: number;
  startBonus: number;
  assetTarget: number;
  starterDeckCardIds: string[];
  availableRoleIds: string[];
  minimumBoardTileCount: number;
  minimumPropertyTileCount: number;
}

export interface MatchSetupSelection {
  humanPlayers: number;
  aiPlayers: number;
  selectedRoleId?: string;
}

export type MatchAction =
  | { type: 'OPEN_ROLE_SELECTION' }
  | { type: 'ROLE_SELECTION_FINISHED' }
  | { type: 'START_MATCH' }
  | { type: 'BEGIN_TURN' }
  | { type: 'ENTER_PRE_ROLL_ACTIONS' }
  | { type: 'ENTER_AI_PRE_ROLL_ACTIONS' }
  | { type: 'PRE_ROLL_ACTIONS_FINISHED' }
  | { type: 'ROLL_CONFIRMED'; value: number }
  | { type: 'MOVEMENT_FINISHED' }
  | { type: 'PROMPT_PROPERTY_DECISION' }
  | { type: 'TILE_RESOLVED' }
  | { type: 'PRE_ROLL_TILE_RESOLVED' }
  | { type: 'AI_PRE_ROLL_TILE_RESOLVED' }
  | { type: 'PROPERTY_DECISION_FINISHED' }
  | { type: 'PRE_ROLL_PROPERTY_DECISION_FINISHED' }
  | { type: 'END_TURN' }
  | { type: 'END_GAME' };
