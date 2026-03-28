export enum GamePhase {
  GameInit = 'GameInit',
  AwaitRoleSelection = 'AwaitRoleSelection',
  TurnStart = 'TurnStart',
  AwaitPreRollActions = 'AwaitPreRollActions',
  AwaitAiPreRollActions = 'AwaitAiPreRollActions',
  AwaitRoll = 'AwaitRoll',
  MovePiece = 'MovePiece',
  ResolveTile = 'ResolveTile',
  ResolvePropertyDecision = 'ResolvePropertyDecision',
  TurnEnd = 'TurnEnd',
  GameOver = 'GameOver',
}
