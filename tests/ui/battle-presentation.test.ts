import { describe, expect, it } from 'vitest';

import { createMatch } from '../../assets/scripts/core/create-match';
import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import {
  getCenterStagePresentation,
  getPropertyPromptPresentation,
  getSeatPanelPresentation,
  getTilePresentation,
} from '../../assets/scripts/ui/battle-presentation';

describe('getSeatPanelPresentation', () => {
  it('returns active-player seat copy with role and asset totals', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].roleId = 'role-economy';

    const presentation = getSeatPanelPresentation(match, 0);

    expect(presentation.title).toBe('Player 1 ACTIVE');
    expect(presentation.lines).toEqual(['Cash: 400', 'Assets: 400', 'Role: Broker']);
    expect(presentation.tintHex).toBe('#ffe8a3');
    expect(presentation.opacity).toBe(255);
  });

  it('returns bankrupt emphasis for eliminated seats', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[2].isBankrupt = true;

    const presentation = getSeatPanelPresentation(match, 2);

    expect(presentation.title).toBe('AI 2 BANKRUPT');
    expect(presentation.tintHex).toBe('#c47474');
    expect(presentation.opacity).toBe(140);
  });

  it('keeps seat panel copy compact and role-aware', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[1].roleId = 'role-economy';

    const seat = getSeatPanelPresentation(match, 1);

    expect(seat.title).toContain('AI 1');
    expect(seat.lines.some((line) => line.includes('Role: Broker'))).toBe(true);
    expect(seat.lines).toHaveLength(3);
  });
});

describe('getCenterStagePresentation', () => {
  it('keeps full latest-event copy on desktop layouts', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.logs.push({ turn: 1, phase: match.phase, message: 'Player 1 bought Mayor Plaza' });

    const presentation = getCenterStagePresentation(match, 'desktop');

    expect(presentation.activePlayerLabel).toBe('Current: Player 1');
    expect(presentation.turnLabel).toBe('Turn: 0');
    expect(presentation.latestEventLabel).toBe('Latest: Player 1 bought Mayor Plaza');
  });

  it('compresses latest-event copy on portrait layouts', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.logs.push({ turn: 1, phase: match.phase, message: 'Player 1 bought Mayor Plaza' });

    const presentation = getCenterStagePresentation(match, 'portrait');

    expect(presentation.activePlayerLabel).toBe('Player 1');
    expect(presentation.turnLabel).toBe('T0');
    expect(presentation.latestEventLabel).toBe('Bought Mayor Plaza');
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

    const presentation = getTilePresentation(match, 1);

    expect(presentation).toStrictEqual({
      title: 'Mayor Plaza',
      supportingLabel: 'Buy 120 | Toll 45',
      accentHex: '#4fc3f7',
      badgeLabel: 'Open',
    });
  });

  it('switches to owner presentation and player color after purchase', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.properties.find((property) => property.tileId === 'civic-1')!.ownerId = 'player-2';

    const presentation = getTilePresentation(match, 1);

    expect(presentation).toStrictEqual({
      title: 'Mayor Plaza',
      supportingLabel: 'Toll 45',
      badgeLabel: 'AI 1',
      accentHex: '#4aa8ff',
    });
  });

  it('gives special tiles stronger themed subtitles', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);

    expect(getTilePresentation(match, 2)).toStrictEqual({
      title: 'Transit Hub',
      supportingLabel: 'Chance Event',
      badgeLabel: 'Fortune',
      accentHex: '#8bc34a',
    });

    expect(getTilePresentation(match, 8)).toStrictEqual({
      title: 'City Festival',
      supportingLabel: 'Festival Bonus',
      badgeLabel: 'Spotlight',
      accentHex: '#ffd166',
    });
  });

  it('returns bounded tile-card copy rather than raw three-line debug text', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    const presentation = getTilePresentation(match, 1);

    expect(Object.keys(presentation).sort()).toEqual(['accentHex', 'badgeLabel', 'supportingLabel', 'title']);
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
