import { describe, expect, it } from 'vitest';

import { getBattleLayoutProfile } from '../../assets/scripts/ui/battle-responsive-layout';

describe('getBattleLayoutProfile', () => {
  it('returns the desktop profile for a wide canvas', () => {
    const layout = getBattleLayoutProfile({ width: 1280, height: 720 });

    expect(layout.profile).toBe('desktop');
    expect(layout.boardScale).toBeGreaterThan(0.9);
    expect(layout.centerStage.width).toBeGreaterThan(260);
  });

  it('returns the narrow profile for compressed landscape', () => {
    const layout = getBattleLayoutProfile({ width: 960, height: 720 });

    expect(layout.profile).toBe('narrow');
    expect(layout.seatPanels.topLeft.x).toBeLessThan(0);
    expect(layout.seatPanels.topRight.x).toBeGreaterThan(0);
  });

  it('returns the portrait profile for mobile-like canvases', () => {
    const layout = getBattleLayoutProfile({ width: 720, height: 1280 });

    expect(layout.profile).toBe('portrait');
    expect(layout.boardScale).toBeLessThan(0.9);
    expect(layout.centerStage.y).toBeGreaterThan(-80);
  });
});
