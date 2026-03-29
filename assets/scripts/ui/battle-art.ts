export const REQUIRED_BATTLE_LAYER_NAMES = [
  'BackgroundLayer',
  'BoardDecorLayer',
  'TileLayer',
  'TokenLayer',
  'HudLayer',
  'OverlayLayer',
] as const;

export const BATTLE_ART_ASSETS = {
  background: 'battle-polish/amusement-map-background',
  centerStage: 'battle-polish/amusement-center-stage',
  seatPanelFrame: 'battle-polish/amusement-seat-panel',
  tileFrame: 'battle-polish/amusement-tile-frame',
  propertyPromptFrame: 'battle-polish/amusement-prompt-frame',
  resultPanelFrame: 'battle-polish/amusement-result-frame',
} as const;
