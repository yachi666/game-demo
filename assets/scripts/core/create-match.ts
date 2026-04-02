import { GamePhase } from './phases';
import type { MatchConfig, MatchState, TileConfig } from './types';

function validateBoardContract(board: TileConfig[], config: MatchConfig): void {
  if (board.length < config.minimumBoardTileCount) {
    throw new Error(`Board must include at least ${config.minimumBoardTileCount} tiles`);
  }

  const propertyTileCount = board.filter((tile) => tile.type === 'property').length;
  if (propertyTileCount < config.minimumPropertyTileCount) {
    throw new Error(`Board must include at least ${config.minimumPropertyTileCount} property tiles`);
  }

  if (board[0]?.type !== 'start') {
    throw new Error('Board must begin with a start tile');
  }
}

export function createMatch(board: TileConfig[], config: MatchConfig): MatchState {
  const boardSnapshot = structuredClone(board);
  validateBoardContract(boardSnapshot, config);

  return {
    phase: GamePhase.GameInit,
    turn: 0,
    activePlayerIndex: 0,
    board: boardSnapshot,
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
    properties: boardSnapshot
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
