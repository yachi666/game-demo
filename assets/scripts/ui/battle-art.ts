export const REQUIRED_BATTLE_LAYER_NAMES = [
  'BackgroundLayer',
  'BoardDecorLayer',
  'TileLayer',
  'TokenLayer',
  'HudLayer',
  'OverlayLayer',
] as const;

export const BATTLE_ART_ASSETS = {
  background: 'battle-polish/world-map-background',
  centerStage: 'battle-polish/world-map-dice-plaza',
  seatPanelFrame: 'battle-polish/world-map-seat-panel',
  tileFrame: 'battle-polish/world-map-tile-frame',
  propertyPromptFrame: 'battle-polish/world-map-prompt-frame',
  resultPanelFrame: 'battle-polish/world-map-result-frame',
} as const;
