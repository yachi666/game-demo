import { GamePhase } from '../core/phases';
import type { CardDefinition, MatchState, TileConfig } from '../core/types';
import { STARTER_CARD_DEFINITIONS } from '../data/card-config';
import { ROLE_DEFINITIONS } from '../data/role-config';
import { getAssetTotal } from '../gameplay/economy';
import { assertDefined } from '../utils/assert';
import type { BattleLayoutProfile } from './battle-responsive-layout';

export interface SeatPanelPresentation {
  lines: string[];
  opacity: number;
  tintHex: string;
  title: string;
}

export interface TilePresentation {
  accentHex: string;
  badgeLabel: string;
  supportingLabel: string;
  title: string;
}

export interface CenterStagePresentation {
  activePlayerLabel: string;
  latestEventLabel: string;
  turnLabel: string;
}

export interface PropertyPromptPresentation {
  costLabel: string;
  districtLabel: string;
  projectedCashLabel: string;
  title: string;
}

export interface BattleHudRoleOptionPresentation {
  id: string;
  label: string;
  skillLabel: string;
}

export interface BattleHudCardHandPresentation {
  cards: CardDefinition[];
  canPlayCards: boolean;
  visible: boolean;
}

export interface BattleHudSkillButtonPresentation {
  canUseSkill: boolean;
  label: string | null;
  visible: boolean;
}

export interface BattleHudRoleSelectionPresentation {
  options: BattleHudRoleOptionPresentation[];
  visible: boolean;
}

export interface BattleHudFlowPresentation {
  cardHand: BattleHudCardHandPresentation;
  roleSelection: BattleHudRoleSelectionPresentation;
  rollButtonEnabled: boolean;
  skillButton: BattleHudSkillButtonPresentation;
}

export function getSeatPanelPresentation(match: MatchState, playerIndex: number): SeatPanelPresentation {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  const roleLabel = ROLE_DEFINITIONS.find((role) => role.id === player.roleId)?.label ?? 'Unassigned';

  if (player.isBankrupt) {
    return {
      title: `${player.label} BANKRUPT`,
      lines: [`Cash: ${player.cash}`, `Assets: ${getAssetTotal(match, playerIndex)}`, `Role: ${roleLabel}`],
      tintHex: '#c47474',
      opacity: 140,
    };
  }

  if (playerIndex === match.activePlayerIndex) {
    return {
      title: `${player.label} ACTIVE`,
      lines: [`Cash: ${player.cash}`, `Assets: ${getAssetTotal(match, playerIndex)}`, `Role: ${roleLabel}`],
      tintHex: '#ffe8a3',
      opacity: 255,
    };
  }

  return {
    title: `${player.label} READY`,
    lines: [`Cash: ${player.cash}`, `Assets: ${getAssetTotal(match, playerIndex)}`, `Role: ${roleLabel}`],
    tintHex: '#dde8f0',
    opacity: 210,
  };
}

export function getTilePresentation(match: MatchState, tileIndex: number): TilePresentation {
  const tile = assertDefined(match.board[tileIndex], `Missing tile at board position ${tileIndex}`);
  const propertyState = match.properties.find((property) => property.tileId === tile.id);
  const ownerId = propertyState?.ownerId;

  if (tile.type === 'property') {
    if (ownerId) {
      const owner = assertDefined(
        match.players.find((player) => player.id === ownerId),
        `Missing owner ${ownerId} for tile ${tile.id}`,
      );

      return {
        title: tile.label,
        badgeLabel: owner.label,
        accentHex: owner.color,
        supportingLabel: `Toll ${tile.tollCost ?? 0}`,
      };
    }

    return {
      title: tile.label,
      badgeLabel: 'Open',
      accentHex: tile.accentColor ?? '#ffffff',
      supportingLabel: `Buy ${tile.purchaseCost ?? 0} | Toll ${tile.tollCost ?? 0}`,
    };
  }

  return getSpecialTilePresentation(tile);
}

export function getCenterStagePresentation(match: MatchState, profile: BattleLayoutProfile): CenterStagePresentation {
  const activePlayer = match.players[match.activePlayerIndex]!;
  const latestLogEntry = match.logs[match.logs.length - 1];
  const latestLog = latestLogEntry?.message ?? `Phase: ${match.phase}`;

  if (profile === 'portrait') {
    return {
      activePlayerLabel: activePlayer.label,
      turnLabel: `T${match.turn}`,
      latestEventLabel: compressLatestEvent(latestLog),
    };
  }

  return {
    activePlayerLabel: `Current: ${activePlayer.label}`,
    turnLabel: `Turn: ${match.turn}`,
    latestEventLabel: `Latest: ${latestLog}`,
  };
}

export function getPropertyPromptPresentation(
  details: { district: string; projectedCash: number; purchaseCost: number; tileName: string },
  profile: BattleLayoutProfile,
): PropertyPromptPresentation {
  if (profile === 'portrait') {
    return {
      title: details.tileName,
      districtLabel: `District ${details.district}`,
      costLabel: `Buy ${details.purchaseCost}`,
      projectedCashLabel: `Cash Left ${details.projectedCash}`,
    };
  }

  return {
    title: details.tileName,
    districtLabel: `District: ${details.district}`,
    costLabel: `Purchase: ${details.purchaseCost}`,
    projectedCashLabel: `Cash After Buy: ${details.projectedCash}`,
  };
}

export function getBattleHudFlowPresentation(match: MatchState): BattleHudFlowPresentation {
  const activePlayer = assertDefined(
    match.players[match.activePlayerIndex],
    `Missing active player at index ${match.activePlayerIndex}`,
  );
  const isHumanPreRollWindow = activePlayer.isHuman && match.phase === GamePhase.AwaitPreRollActions;
  const role = ROLE_DEFINITIONS.find((candidate) => candidate.id === activePlayer.roleId) ?? null;
  const activeCards = activePlayer.hand
    .map((cardId) => STARTER_CARD_DEFINITIONS.find((card) => card.id === cardId) ?? null)
    .filter((card): card is CardDefinition => card !== null);

  return {
    rollButtonEnabled:
      activePlayer.isHuman && (match.phase === GamePhase.AwaitRoll || match.phase === GamePhase.AwaitPreRollActions),
    roleSelection: {
      visible: match.phase === GamePhase.AwaitRoleSelection,
      options:
        match.phase === GamePhase.AwaitRoleSelection
          ? ROLE_DEFINITIONS.filter((candidate) => match.availableRoleIds.includes(candidate.id)).map((candidate) => ({
              id: candidate.id,
              label: candidate.label,
              skillLabel: candidate.skillLabel,
            }))
          : [],
    },
    cardHand: {
      visible: isHumanPreRollWindow && activeCards.length > 0,
      canPlayCards: isHumanPreRollWindow && !activePlayer.hasUsedCardThisTurn,
      cards: activeCards,
    },
    skillButton: {
      visible: isHumanPreRollWindow && role !== null,
      canUseSkill: isHumanPreRollWindow && role !== null && !activePlayer.hasUsedSkillThisTurn,
      label: role?.skillLabel ?? null,
    },
  };
}

function getSpecialTilePresentation(tile: TileConfig): TilePresentation {
  switch (tile.type) {
    case 'start':
      return {
        title: tile.label,
        badgeLabel: 'Launch',
        supportingLabel: 'Start Bonus',
        accentHex: tile.accentColor ?? '#f8d34f',
      };
    case 'reward':
      return {
        title: tile.label,
        badgeLabel: 'Bonus',
        supportingLabel: `Reward ${tile.rewardAmount ?? 0}`,
        accentHex: tile.accentColor ?? '#9cdbff',
      };
    case 'penalty':
      return {
        title: tile.label,
        badgeLabel: 'Risk',
        supportingLabel: `Penalty ${tile.penaltyAmount ?? 0}`,
        accentHex: tile.accentColor ?? '#ef5350',
      };
    case 'chance':
      return {
        title: tile.label,
        badgeLabel: 'Fortune',
        supportingLabel: 'Chance Event',
        accentHex: tile.accentColor ?? '#8bc34a',
      };
    case 'festival':
      return {
        title: tile.label,
        badgeLabel: 'Spotlight',
        supportingLabel: 'Festival Bonus',
        accentHex: tile.accentColor ?? '#ffd166',
      };
    default:
      throw new Error(`Unhandled tile type ${tile.type} for tile ${tile.label}`);
  }
}

function compressLatestEvent(message: string): string {
  const withoutActor = message.replace(/^(Player \d+|AI \d+)\s+/u, '');
  if (withoutActor === message) {
    if (message === 'Turn ready for roll') {
      return 'Ready for roll';
    }

    return message.length > 24 ? `${message.slice(0, 21)}...` : message;
  }

  const normalized = withoutActor.charAt(0).toUpperCase() + withoutActor.slice(1);
  return normalized.length > 24 ? `${normalized.slice(0, 21)}...` : normalized;
}
