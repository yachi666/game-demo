import { describe, expect, it } from 'vitest';

import { createMatch } from '../../assets/scripts/core/create-match';
import { beginTurnFlow, completeRoleSelectionFlow, openRoleSelectionFlow } from '../../assets/scripts/core/turn-flow';
import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import * as battlePresentation from '../../assets/scripts/ui/battle-presentation';
import {
  getPropertyPromptPresentation,
  getSeatPanelPresentation,
  getTilePresentation,
} from '../../assets/scripts/ui/battle-presentation';

type Match = ReturnType<typeof createMatch>;

type TopInfoBannerPresentation = {
  accentHex: string;
  eventLabel: string;
  incomeLabel: string;
  roundLabel: string;
};

const getTopInfoBannerPresentation = (battlePresentation as Record<string, unknown>).getTopInfoBannerPresentation as
  | ((match: Match) => TopInfoBannerPresentation)
  | undefined;

function getTopBannerPresentation(match: Match) {
  expect(getTopInfoBannerPresentation).toBeTypeOf('function');
  return getTopInfoBannerPresentation!(match);
}

function createAssignedMatch() {
  return completeRoleSelectionFlow(openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG)), 'role-toll');
}

describe('getTopInfoBannerPresentation', () => {
  it('summarizes round, assets, and the latest event for a started match', () => {
    const startedMatch = beginTurnFlow(createAssignedMatch());
    startedMatch.logs.push({
      turn: startedMatch.turn,
      phase: startedMatch.phase,
      message: 'Player 1 bought Mayor Plaza',
    });

    expect(getTopBannerPresentation(startedMatch)).toEqual({
      roundLabel: 'Round 0',
      incomeLabel: 'Assets 400',
      eventLabel: 'Bought Mayor Plaza',
      accentHex: startedMatch.players[startedMatch.activePlayerIndex]!.color,
    });
  });
});

describe('getSeatPanelPresentation', () => {
  it('returns active-player seat fields with compact labels', () => {
    const match = beginTurnFlow(createAssignedMatch());

    expect(getSeatPanelPresentation(match, 0)).toMatchObject({
      playerNameLabel: 'Player 1',
      cashLabel: 'Cash 400',
      assetLabel: 'Assets 400',
      statusLabel: 'ACTIVE',
      avatarLabel: '1',
      propertyCount: 0,
      accentHex: match.players[0]!.color,
      opacity: 255,
    });
  });

  it('returns bankrupt emphasis for eliminated seats', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[2]!.isBankrupt = true;

    expect(getSeatPanelPresentation(match, 2)).toMatchObject({
      playerNameLabel: 'AI 2',
      cashLabel: 'Cash 400',
      assetLabel: 'Assets 400',
      statusLabel: 'BANKRUPT',
      avatarLabel: '3',
      propertyCount: 0,
      accentHex: '#c47474',
      opacity: 140,
    });
  });

  it('tracks owned property count on ready seats', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.properties.find((property) => property.tileId === 'civic-1')!.ownerId = match.players[1]!.id;

    expect(getSeatPanelPresentation(match, 1)).toMatchObject({
      playerNameLabel: 'AI 1',
      cashLabel: 'Cash 400',
      assetLabel: 'Assets 520',
      statusLabel: 'READY',
      avatarLabel: '2',
      propertyCount: 1,
      accentHex: match.players[1]!.color,
      opacity: 210,
    });
  });
});

describe('getPropertyPromptPresentation', () => {
  it('compresses property-prompt field labels on portrait layouts', () => {
    const presentation = getPropertyPromptPresentation(
      {
        tileName: 'Mayor Plaza',
        district: 'city park',
        purchaseCost: 120,
        projectedCash: 280,
      },
      'portrait',
    );

    expect(presentation).toEqual({
      title: 'Mayor Plaza',
      districtLabel: 'District city park',
      costLabel: 'Buy 120',
      projectedCashLabel: 'Cash Left 280',
    });
  });
});

describe('getTilePresentation', () => {
  it('shows purchase info for unowned property tiles', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);

    expect(getTilePresentation(match, 1)).toStrictEqual({
      title: 'Mayor Plaza',
      supportingLabel: 'Buy 120 | Toll 45',
      accentHex: '#4fc3f7',
      badgeLabel: 'Open',
      buildingCount: 0,
    });
  });

  it('switches to owner presentation, player color, and one building after purchase', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.properties.find((property) => property.tileId === 'civic-1')!.ownerId = 'player-2';

    expect(getTilePresentation(match, 1)).toStrictEqual({
      title: 'Mayor Plaza',
      supportingLabel: 'Toll 45',
      badgeLabel: 'AI 1',
      accentHex: '#4aa8ff',
      buildingCount: 1,
    });
  });

  it('gives special tiles stronger themed subtitles without phantom buildings', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);

    expect(getTilePresentation(match, 2)).toStrictEqual({
      title: 'Transit Hub',
      supportingLabel: 'Chance Event',
      badgeLabel: 'Fortune',
      accentHex: '#8bc34a',
      buildingCount: 0,
    });

    expect(getTilePresentation(match, 8)).toStrictEqual({
      title: 'City Festival',
      supportingLabel: 'Festival Bonus',
      badgeLabel: 'Spotlight',
      accentHex: '#ffd166',
      buildingCount: 0,
    });
  });

  it('returns bounded tile-card copy rather than raw debug text', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    const presentation = getTilePresentation(match, 1);

    expect(Object.keys(presentation).sort()).toEqual([
      'accentHex',
      'badgeLabel',
      'buildingCount',
      'supportingLabel',
      'title',
    ]);
  });

  it('throws when property ownership points at a missing player', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.properties.find((property) => property.tileId === 'civic-1')!.ownerId = 'ghost-player';

    expect(() => getTilePresentation(match, 1)).toThrow('Missing owner ghost-player for tile civic-1');
  });

  it('throws when tile type is not recognized', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    (match.board[2] as { type: string }).type = 'mystery';

    expect(() => getTilePresentation(match, 2)).toThrow('Unhandled tile type mystery for tile Transit Hub');
  });
});
