import { GamePhase } from './phases';
import type { MatchState, PlayerConfig, TileConfig } from './types';

interface MatchConfig {
  players: PlayerConfig[];
  startingCash: number;
  startBonus: number;
  assetTarget: number;
}

export function createMatch(board: TileConfig[], config: MatchConfig): MatchState {
  return {
    phase: GamePhase.GameInit,
    turn: 0,
    activePlayerIndex: 0,
    board,
    players: config.players.map((player) => ({
      ...player,
      position: 0,
      cash: config.startingCash,
      isBankrupt: false,
    })),
    properties: board
      .filter((tile) => tile.type === 'property')
      .map((tile) => ({
        tileId: tile.id,
        ownerId: null,
      })),
    logs: [],
    startBonus: config.startBonus,
    assetTarget: config.assetTarget,
  };
}
