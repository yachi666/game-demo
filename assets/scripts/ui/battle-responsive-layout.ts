export type BattleLayoutProfile = 'desktop' | 'narrow' | 'portrait';

export interface LayoutRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface BattleLayoutProfileResult {
  boardScale: number;
  centerStage: LayoutRect;
  profile: BattleLayoutProfile;
  seatPanels: {
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
  };
}

export interface BattleViewportSize {
  height: number;
  width: number;
}

export interface BattleRuntimeLayout {
  boardScale: number;
  centerStage: LayoutRect;
  seatPanelPositions: Array<{ x: number; y: number }>;
}

function isPositiveFiniteNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function assertValidViewport(viewport: BattleViewportSize): void {
  if (!isPositiveFiniteNumber(viewport.width) || !isPositiveFiniteNumber(viewport.height)) {
    throw new Error('Viewport width and height must be positive finite numbers');
  }
}

export function getBattleLayoutProfile(viewport: { height: number; width: number }): BattleLayoutProfileResult {
  assertValidViewport(viewport);

  const aspect = viewport.width / viewport.height;

  if (aspect >= 1.45) {
    return {
      profile: 'desktop',
      boardScale: 1.08,
      centerStage: { x: 0, y: 8, width: 380, height: 188 },
      seatPanels: {
        topLeft: { x: -396, y: 228 },
        topRight: { x: 396, y: 228 },
        bottomRight: { x: 396, y: -188 },
        bottomLeft: { x: -396, y: -188 },
      },
    };
  }

  if (aspect >= 1) {
    return {
      profile: 'narrow',
      boardScale: 0.98,
      centerStage: { x: 0, y: 0, width: 336, height: 168 },
      seatPanels: {
        topLeft: { x: -324, y: 232 },
        topRight: { x: 324, y: 232 },
        bottomRight: { x: 324, y: -236 },
        bottomLeft: { x: -324, y: -236 },
      },
    };
  }

  return {
    profile: 'portrait',
    boardScale: 0.84,
    centerStage: { x: 0, y: 36, width: 288, height: 136 },
    seatPanels: {
      topLeft: { x: -212, y: 436 },
      topRight: { x: 212, y: 436 },
      bottomRight: { x: 212, y: -436 },
      bottomLeft: { x: -212, y: -436 },
    },
  };
}

export function getBattleRuntimeLayout(layout: BattleLayoutProfileResult): BattleRuntimeLayout {
  return {
    boardScale: layout.boardScale,
    centerStage: layout.centerStage,
    seatPanelPositions: [
      layout.seatPanels.topLeft,
      layout.seatPanels.topRight,
      layout.seatPanels.bottomRight,
      layout.seatPanels.bottomLeft,
    ],
  };
}
