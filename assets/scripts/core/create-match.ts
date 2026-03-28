import { GamePhase } from './phases';
import type { MatchConfig, MatchState, TileConfig } from './types';

export function createMatch(board: TileConfig[], config: MatchConfig): MatchState {
  return {
    phase: GamePhase.GameInit,
    turn: 0,
    activePlayerIndex: 0,
    board,
    players: config.players.map((player) => ({
      ...player,
      roleId: null,
      hand: [],
      hasUsedCardThisTurn: false,
      hasUsedSkillThisTurn: false,
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
    drawPile: [...config.starterDeckCardIds],
    discardPile: [],
    availableRoleIds: [...config.availableRoleIds],
    requiresRoleSelection: true,
    statusEffects: [],
    startBonus: config.startBonus,
    assetTarget: config.assetTarget,
  };
}
