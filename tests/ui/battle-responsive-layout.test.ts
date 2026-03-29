import { describe, expect, it } from 'vitest';

import { getBattleLayoutProfile } from '../../assets/scripts/ui/battle-responsive-layout';

describe('getBattleLayoutProfile', () => {
  it('throws a clear error for invalid viewport dimensions', () => {
    const invalidViewports = [
      { width: 0, height: 720 },
      { width: -1, height: 720 },
      { width: 1280, height: 0 },
      { width: 1280, height: -1 },
      { width: Number.NaN, height: 720 },
      { width: 1280, height: Number.POSITIVE_INFINITY },
    ];

    for (const viewport of invalidViewports) {
      expect(() => getBattleLayoutProfile(viewport)).toThrow(
        'Viewport width and height must be positive finite numbers',
      );
    }
  });

  it('returns the desktop geometry at the 1.45 aspect-ratio threshold', () => {
    const layout = getBattleLayoutProfile({ width: 1450, height: 1000 });

    expect(layout).toEqual({
      profile: 'desktop',
      boardScale: 1,
      centerStage: { x: 0, y: 0, width: 320, height: 132 },
      seatPanels: {
        topLeft: { x: -360, y: 216 },
        topRight: { x: 360, y: 216 },
        bottomRight: { x: 360, y: -156 },
        bottomLeft: { x: -360, y: -156 },
      },
    });
  });

  it('returns the narrow geometry at the 1.0 aspect-ratio threshold', () => {
    const layout = getBattleLayoutProfile({ width: 1000, height: 1000 });

    expect(layout).toEqual({
      profile: 'narrow',
      boardScale: 0.88,
      centerStage: { x: 0, y: -12, width: 280, height: 120 },
      seatPanels: {
        topLeft: { x: -286, y: 224 },
        topRight: { x: 286, y: 224 },
        bottomRight: { x: 286, y: -214 },
        bottomLeft: { x: -286, y: -214 },
      },
    });
  });

  it('returns the portrait geometry below the 1.0 aspect-ratio threshold', () => {
    const layout = getBattleLayoutProfile({ width: 999, height: 1000 });

    expect(layout).toEqual({
      profile: 'portrait',
      boardScale: 0.76,
      centerStage: { x: 0, y: 52, width: 250, height: 108 },
      seatPanels: {
        topLeft: { x: -176, y: 448 },
        topRight: { x: 176, y: 448 },
        bottomRight: { x: 176, y: -448 },
        bottomLeft: { x: -176, y: -448 },
      },
    });
  });

  it('returns the desktop profile for a wide canvas', () => {
    const layout = getBattleLayoutProfile({ width: 1280, height: 720 });

    expect(layout.profile).toBe('desktop');
    expect(layout.boardScale).toBe(1);
    expect(layout.centerStage).toEqual({ x: 0, y: 0, width: 320, height: 132 });
  });

  it('returns the narrow profile for compressed landscape', () => {
    const layout = getBattleLayoutProfile({ width: 960, height: 720 });

    expect(layout.profile).toBe('narrow');
    expect(layout.boardScale).toBe(0.88);
    expect(layout.centerStage).toEqual({ x: 0, y: -12, width: 280, height: 120 });
  });

  it('returns the portrait profile for mobile-like canvases', () => {
    const layout = getBattleLayoutProfile({ width: 720, height: 1280 });

    expect(layout.profile).toBe('portrait');
    expect(layout.boardScale).toBe(0.76);
    expect(layout.centerStage).toEqual({ x: 0, y: 52, width: 250, height: 108 });
  });
});
