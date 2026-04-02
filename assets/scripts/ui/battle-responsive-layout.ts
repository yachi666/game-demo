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
      boardScale: 1,
      centerStage: { x: 0, y: 0, width: 320, height: 132 },
      seatPanels: {
        topLeft: { x: -360, y: 216 },
        topRight: { x: 360, y: 216 },
        bottomRight: { x: 360, y: -156 },
        bottomLeft: { x: -360, y: -156 },
      },
    };
  }

  if (aspect >= 1) {
    return {
      profile: 'narrow',
      boardScale: 0.88,
      centerStage: { x: 0, y: -12, width: 280, height: 120 },
      seatPanels: {
        topLeft: { x: -286, y: 224 },
        topRight: { x: 286, y: 224 },
        bottomRight: { x: 286, y: -214 },
        bottomLeft: { x: -286, y: -214 },
      },
    };
  }

  return {
    profile: 'portrait',
    boardScale: 0.76,
    centerStage: { x: 0, y: 52, width: 250, height: 108 },
    seatPanels: {
      topLeft: { x: -176, y: 448 },
      topRight: { x: 176, y: 448 },
      bottomRight: { x: 176, y: -448 },
      bottomLeft: { x: -176, y: -448 },
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
