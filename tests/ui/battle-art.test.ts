import { describe, expect, it } from 'vitest';

import { BATTLE_ART_ASSETS, REQUIRED_BATTLE_LAYER_NAMES } from '../../assets/scripts/ui/battle-art';

describe('battle art contract', () => {
  it('declares the scenic assets required by the polished board', () => {
    expect(BATTLE_ART_ASSETS.background).toContain('battle-polish');
    expect(BATTLE_ART_ASSETS.centerStage).toContain('battle-polish');
    expect(BATTLE_ART_ASSETS.seatPanelFrame).toContain('battle-polish');
  });

  it('declares every required scene layer root', () => {
    expect(REQUIRED_BATTLE_LAYER_NAMES).toEqual([
      'BackgroundLayer',
      'BoardDecorLayer',
      'TileLayer',
      'TokenLayer',
      'HudLayer',
      'OverlayLayer',
    ]);
  });

  it('keeps the overlay layer separate from scenic and token layers', () => {
    expect(REQUIRED_BATTLE_LAYER_NAMES.indexOf('OverlayLayer')).toBeGreaterThan(
      REQUIRED_BATTLE_LAYER_NAMES.indexOf('HudLayer'),
    );
  });
});
