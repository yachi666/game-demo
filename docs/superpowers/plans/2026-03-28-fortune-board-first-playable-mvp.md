# Fortune Board First Playable MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize a real Cocos Creator 3.8.8 project in this repository and deliver the first playable board-game slice with deterministic rules, simple AI, a battle scene, and a minimal HUD.

**Architecture:** Use the built-in `empty-2d` Cocos template as the project base, then keep custom code inside `assets/scripts` with a strict split between deterministic rules and scene/presentation adapters. The `Battle` scene is the default entry point, while gameplay state lives in plain TypeScript modules that can be tested outside the editor runtime.

**Tech Stack:** Cocos Creator 3.8.8, TypeScript, Node.js, Vitest, npm

---

## File Structure

- Create: `assets/scenes/Battle.scene`
- Create: `assets/scenes/Battle.scene.meta`
- Create: `assets/scripts/core/types.ts`
- Create: `assets/scripts/core/phases.ts`
- Create: `assets/scripts/core/create-match.ts`
- Create: `assets/scripts/core/advance-phase.ts`
- Create: `assets/scripts/core/logger.ts`
- Create: `assets/scripts/gameplay/movement.ts`
- Create: `assets/scripts/gameplay/economy.ts`
- Create: `assets/scripts/gameplay/resolve-tile.ts`
- Create: `assets/scripts/gameplay/win-check.ts`
- Create: `assets/scripts/ai/decide-property.ts`
- Create: `assets/scripts/ai/decide-turn.ts`
- Create: `assets/scripts/data/board-config.ts`
- Create: `assets/scripts/data/match-config.ts`
- Create: `assets/scripts/ui/BattleController.ts`
- Create: `assets/scripts/ui/HudController.ts`
- Create: `assets/scripts/ui/PropertyPrompt.ts`
- Create: `assets/scripts/ui/ResultPanel.ts`
- Create: `assets/scripts/utils/assert.ts`
- Create: `tests/core/create-match.test.ts`
- Create: `tests/core/advance-phase.test.ts`
- Create: `tests/gameplay/movement.test.ts`
- Create: `tests/gameplay/resolve-tile.test.ts`
- Create: `tests/gameplay/win-check.test.ts`
- Create: `tests/ai/decide-property.test.ts`
- Create: `tests/setup/vitest.config.ts`
- Create: `tools/create-cocos-project.sh`
- Create: `tmp/tsconfig.cocos.json`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `docs/README.md`
- Modify: `docs/superpowers/README.md`

### Task 1: Initialize The Real Cocos Project

**Files:**
- Create: `tools/create-cocos-project.sh`
- Create: `tests/setup/vitest.config.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `assets/`
- Create: `settings/`
- Create: `profiles/`
- Create: `tmp/`

- [ ] **Step 1: Copy the `empty-2d` Cocos template into the repository**

Create `tools/create-cocos-project.sh` with:

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_DIR="/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/Resources/templates/empty-2d"

if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "Missing Cocos template at: $TEMPLATE_DIR" >&2
  exit 1
fi

rsync -a \
  --exclude ".git" \
  --exclude "node_modules" \
  "$TEMPLATE_DIR"/ \
  "$ROOT_DIR"/

mkdir -p \
  "$ROOT_DIR/assets/scenes" \
  "$ROOT_DIR/assets/scripts/core" \
  "$ROOT_DIR/assets/scripts/gameplay" \
  "$ROOT_DIR/assets/scripts/ai" \
  "$ROOT_DIR/assets/scripts/data" \
  "$ROOT_DIR/assets/scripts/ui" \
  "$ROOT_DIR/assets/scripts/utils" \
  "$ROOT_DIR/tests/core" \
  "$ROOT_DIR/tests/gameplay" \
  "$ROOT_DIR/tests/ai" \
  "$ROOT_DIR/tests/setup" \
  "$ROOT_DIR/tools"
```

- [ ] **Step 2: Run the project bootstrap script**

Run:

```bash
bash tools/create-cocos-project.sh
```

Expected: `assets/`, `settings/`, `profiles/`, `.creator/`, `package.json`, and `tsconfig.json` now exist in the repository root.

- [ ] **Step 3: Add npm scripts and test dependencies without removing the template baseline**

Update `package.json` to:

```json
{
  "name": "fortune-board",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "test": "vitest run --config tests/setup/vitest.config.ts",
    "test:watch": "vitest --config tests/setup/vitest.config.ts"
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "vitest": "^3.1.1"
  }
}
```

- [ ] **Step 4: Add the Vitest config file**

Create `tests/setup/vitest.config.ts` with:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Install dependencies and verify the project has a test runner**

Run:

```bash
npm install
```

Expected: `node_modules/` and `package-lock.json` are created with no install errors.

- [ ] **Step 6: Tighten TypeScript config for shared rule modules**

Update `tsconfig.json` to:

```json
{
  "extends": "./tmp/tsconfig.cocos.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "types": ["vitest/globals"]
  },
  "include": [
    "assets/scripts/**/*.ts",
    "tests/**/*.ts"
  ]
}
```

Note: `tmp/tsconfig.cocos.json` is part of the copied Cocos template baseline and must be committed with the initialized project rather than treated as a machine-local generated artifact.

- [ ] **Step 7: Commit the initialized project baseline**

Run:

```bash
git add .creator .gitignore assets package.json package-lock.json profiles settings tests tmp tools tsconfig.json
git commit -m "Initialize Cocos project baseline"
```

Expected: a commit exists that only establishes the real project and test/tooling baseline.

### Task 2: Build The Deterministic Match Core

**Files:**
- Create: `assets/scripts/core/types.ts`
- Create: `assets/scripts/core/phases.ts`
- Create: `assets/scripts/core/create-match.ts`
- Create: `assets/scripts/core/advance-phase.ts`
- Create: `assets/scripts/core/logger.ts`
- Create: `assets/scripts/utils/assert.ts`
- Test: `tests/core/create-match.test.ts`
- Test: `tests/core/advance-phase.test.ts`

- [ ] **Step 1: Write the failing tests for match creation and phase advancement**

Create `tests/core/create-match.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';

import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { createMatch } from '../../assets/scripts/core/create-match';
import { GamePhase } from '../../assets/scripts/core/phases';

describe('createMatch', () => {
  it('creates players at tile zero with starting cash', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);

    expect(match.phase).toBe(GamePhase.GameInit);
    expect(match.activePlayerIndex).toBe(0);
    expect(match.players).toHaveLength(MATCH_CONFIG.players.length);
    expect(match.players.map((player) => player.position)).toEqual([0, 0, 0, 0]);
    expect(match.players.map((player) => player.cash)).toEqual([400, 400, 400, 400]);
    expect(match.properties.every((property) => property.ownerId === null)).toBe(true);
  });
});
```

Create `tests/core/advance-phase.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';

import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { advancePhase } from '../../assets/scripts/core/advance-phase';
import { createMatch } from '../../assets/scripts/core/create-match';
import { GamePhase } from '../../assets/scripts/core/phases';

describe('advancePhase', () => {
  it('moves a new match from init to turn start to await roll', () => {
    const initMatch = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    const turnStartMatch = advancePhase(initMatch, { type: 'START_MATCH' });
    const awaitRollMatch = advancePhase(turnStartMatch, { type: 'BEGIN_TURN' });

    expect(turnStartMatch.phase).toBe(GamePhase.TurnStart);
    expect(awaitRollMatch.phase).toBe(GamePhase.AwaitRoll);
    expect(awaitRollMatch.turn).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify the core files do not exist yet**

Run:

```bash
npm test -- tests/core/create-match.test.ts tests/core/advance-phase.test.ts
```

Expected: FAIL with module resolution errors for the missing core and data files.

- [ ] **Step 3: Add the shared types and phase enum**

Create `assets/scripts/core/phases.ts` with:

```ts
export enum GamePhase {
  GameInit = 'GameInit',
  TurnStart = 'TurnStart',
  AwaitRoll = 'AwaitRoll',
  MovePiece = 'MovePiece',
  ResolveTile = 'ResolveTile',
  ResolvePropertyDecision = 'ResolvePropertyDecision',
  TurnEnd = 'TurnEnd',
  GameOver = 'GameOver',
}
```

Create `assets/scripts/core/types.ts` with:

```ts
import { GamePhase } from './phases';

export type TileType = 'start' | 'property' | 'reward' | 'penalty';

export interface TileConfig {
  id: string;
  label: string;
  type: TileType;
  purchaseCost?: number;
  tollCost?: number;
  rewardAmount?: number;
  penaltyAmount?: number;
}

export interface PlayerConfig {
  id: string;
  label: string;
  isHuman: boolean;
  color: string;
}

export interface PropertyState {
  tileId: string;
  ownerId: string | null;
}

export interface PlayerState {
  id: string;
  label: string;
  isHuman: boolean;
  color: string;
  position: number;
  cash: number;
  isBankrupt: boolean;
}

export interface MatchLogEntry {
  turn: number;
  phase: GamePhase;
  message: string;
}

export interface MatchState {
  phase: GamePhase;
  turn: number;
  activePlayerIndex: number;
  board: TileConfig[];
  players: PlayerState[];
  properties: PropertyState[];
  logs: MatchLogEntry[];
  startBonus: number;
  assetTarget: number;
}

export type MatchAction =
  | { type: 'START_MATCH' }
  | { type: 'BEGIN_TURN' }
  | { type: 'ROLL_CONFIRMED'; value: number }
  | { type: 'MOVEMENT_FINISHED' }
  | { type: 'PROMPT_PROPERTY_DECISION' }
  | { type: 'TILE_RESOLVED' }
  | { type: 'PROPERTY_DECISION_FINISHED' }
  | { type: 'END_TURN' }
  | { type: 'END_GAME' };
```

- [ ] **Step 4: Add match creation, logging, assertion, and phase advancement**

Create `assets/scripts/utils/assert.ts` with:

```ts
export function assertDefined<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}
```

Create `assets/scripts/core/logger.ts` with:

```ts
import { GamePhase } from './phases';
import type { MatchLogEntry } from './types';

export function appendLog(
  logs: MatchLogEntry[],
  turn: number,
  phase: GamePhase,
  message: string,
): MatchLogEntry[] {
  return [...logs, { turn, phase, message }];
}
```

Create `assets/scripts/core/create-match.ts` with:

```ts
import { GamePhase } from './phases';
import type { MatchState, PlayerConfig, TileConfig } from './types';

interface MatchConfig {
  players: PlayerConfig[];
  startingCash: number;
  startBonus: number;
  assetTarget: number;
}

export function createMatch(board: TileConfig[], config: MatchConfig): MatchState {
  return {
    phase: GamePhase.GameInit,
    turn: 0,
    activePlayerIndex: 0,
    board,
    players: config.players.map((player) => ({
      ...player,
      position: 0,
      cash: config.startingCash,
      isBankrupt: false,
    })),
    properties: board
      .filter((tile) => tile.type === 'property')
      .map((tile) => ({
        tileId: tile.id,
        ownerId: null,
      })),
    logs: [],
    startBonus: config.startBonus,
    assetTarget: config.assetTarget,
  };
}
```

Create `assets/scripts/core/advance-phase.ts` with:

```ts
import { GamePhase } from './phases';
import type { MatchAction, MatchState } from './types';
import { appendLog } from './logger';

export function advancePhase(match: MatchState, action: MatchAction): MatchState {
  switch (action.type) {
    case 'START_MATCH':
      return {
        ...match,
        phase: GamePhase.TurnStart,
        logs: appendLog(match.logs, 0, GamePhase.TurnStart, 'Match started'),
      };
    case 'BEGIN_TURN':
      return {
        ...match,
        turn: match.turn + 1,
        phase: GamePhase.AwaitRoll,
        logs: appendLog(match.logs, match.turn + 1, GamePhase.AwaitRoll, 'Turn ready for roll'),
      };
    case 'ROLL_CONFIRMED':
      return {
        ...match,
        phase: GamePhase.MovePiece,
        logs: appendLog(match.logs, match.turn, GamePhase.MovePiece, `Rolled ${action.value}`),
      };
    case 'MOVEMENT_FINISHED':
      return {
        ...match,
        phase: GamePhase.ResolveTile,
      };
    case 'PROMPT_PROPERTY_DECISION':
      return {
        ...match,
        phase: GamePhase.ResolvePropertyDecision,
      };
    case 'TILE_RESOLVED':
      return {
        ...match,
        phase: GamePhase.TurnEnd,
      };
    case 'PROPERTY_DECISION_FINISHED':
      return {
        ...match,
        phase: GamePhase.TurnEnd,
      };
    case 'END_TURN':
      return {
        ...match,
        activePlayerIndex: (match.activePlayerIndex + 1) % match.players.length,
        phase: GamePhase.TurnStart,
      };
    case 'END_GAME':
      return {
        ...match,
        phase: GamePhase.GameOver,
      };
  }
}
```

- [ ] **Step 5: Run the core tests and verify they pass**

Run:

```bash
npm test -- tests/core/create-match.test.ts tests/core/advance-phase.test.ts
```

Expected: PASS with both core tests green.

- [ ] **Step 6: Commit the deterministic core**

Run:

```bash
git add assets/scripts/core assets/scripts/utils tests/core
git commit -m "Add deterministic match core"
```

Expected: a commit exists with only phase, state, and logging primitives.

### Task 3: Implement Board Data And Gameplay Rules

**Files:**
- Create: `assets/scripts/data/board-config.ts`
- Create: `assets/scripts/data/match-config.ts`
- Create: `assets/scripts/gameplay/movement.ts`
- Create: `assets/scripts/gameplay/economy.ts`
- Create: `assets/scripts/gameplay/resolve-tile.ts`
- Create: `assets/scripts/gameplay/win-check.ts`
- Test: `tests/gameplay/movement.test.ts`
- Test: `tests/gameplay/resolve-tile.test.ts`
- Test: `tests/gameplay/win-check.test.ts`

- [ ] **Step 1: Write failing tests for movement, tile resolution, and win checks**

Create `tests/gameplay/movement.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';

import { movePlayerPosition } from '../../assets/scripts/gameplay/movement';

describe('movePlayerPosition', () => {
  it('wraps around the board and reports passing start', () => {
    expect(movePlayerPosition(7, 4, 10)).toEqual({
      nextPosition: 1,
      passedStart: true,
      visitedPositions: [8, 9, 0, 1],
    });
  });
});
```

Create `tests/gameplay/resolve-tile.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';

import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { createMatch } from '../../assets/scripts/core/create-match';
import { resolveTileForPlayer } from '../../assets/scripts/gameplay/resolve-tile';

describe('resolveTileForPlayer', () => {
  it('allows buying an unowned property', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].position = 1;

    const result = resolveTileForPlayer(match, 0, { type: 'buy' });

    expect(result.match.players[0].cash).toBe(280);
    expect(result.match.properties.find((property) => property.tileId === 'property-1')?.ownerId).toBe('player-1');
    expect(result.requiresPropertyDecision).toBe(false);
  });
});
```

Create `tests/gameplay/win-check.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';

import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { createMatch } from '../../assets/scripts/core/create-match';
import { getWinner } from '../../assets/scripts/gameplay/win-check';

describe('getWinner', () => {
  it('returns a player when the asset target is reached', () => {
    const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
    match.players[0].cash = 650;

    expect(getWinner(match)?.id).toBe('player-1');
  });
});
```

- [ ] **Step 2: Run the gameplay tests and verify they fail**

Run:

```bash
npm test -- tests/gameplay/movement.test.ts tests/gameplay/resolve-tile.test.ts tests/gameplay/win-check.test.ts
```

Expected: FAIL because the data and gameplay modules are not implemented.

- [ ] **Step 3: Add concrete board and match configuration**

Create `assets/scripts/data/board-config.ts` with:

```ts
import type { TileConfig } from '../core/types';

export const BOARD_CONFIG: TileConfig[] = [
  { id: 'start', label: 'Start', type: 'start' },
  { id: 'property-1', label: 'Mint Plaza', type: 'property', purchaseCost: 120, tollCost: 45 },
  { id: 'reward-1', label: 'Lucky Fountain', type: 'reward', rewardAmount: 80 },
  { id: 'property-2', label: 'Lantern Row', type: 'property', purchaseCost: 140, tollCost: 55 },
  { id: 'penalty-1', label: 'Tax Booth', type: 'penalty', penaltyAmount: 60 },
  { id: 'property-3', label: 'Harbor Walk', type: 'property', purchaseCost: 160, tollCost: 65 },
  { id: 'reward-2', label: 'Treasure Cart', type: 'reward', rewardAmount: 90 },
  { id: 'property-4', label: 'Moon Gate', type: 'property', purchaseCost: 180, tollCost: 75 },
];
```

Create `assets/scripts/data/match-config.ts` with:

```ts
import type { PlayerConfig } from '../core/types';

export const MATCH_CONFIG: {
  players: PlayerConfig[];
  startingCash: number;
  startBonus: number;
  assetTarget: number;
  aiReserveCash: number;
} = {
  players: [
    { id: 'player-1', label: 'Player 1', isHuman: true, color: '#ff7a59' },
    { id: 'player-2', label: 'AI 1', isHuman: false, color: '#4aa8ff' },
    { id: 'player-3', label: 'AI 2', isHuman: false, color: '#7ddc83' },
    { id: 'player-4', label: 'AI 3', isHuman: false, color: '#ffd166' },
  ],
  startingCash: 400,
  startBonus: 100,
  assetTarget: 650,
  aiReserveCash: 150,
};
```

- [ ] **Step 4: Implement movement, economy, tile resolution, and win checks**

Create `assets/scripts/gameplay/movement.ts` with:

```ts
export function movePlayerPosition(current: number, roll: number, boardSize: number) {
  const visitedPositions: number[] = [];
  let nextPosition = current;
  let passedStart = false;

  for (let step = 0; step < roll; step += 1) {
    nextPosition = (nextPosition + 1) % boardSize;
    if (nextPosition === 0) {
      passedStart = true;
    }
    visitedPositions.push(nextPosition);
  }

  return {
    nextPosition,
    passedStart,
    visitedPositions,
  };
}
```

Create `assets/scripts/gameplay/economy.ts` with:

```ts
import type { MatchState, TileConfig } from '../core/types';

export function getTileAt(match: MatchState, position: number): TileConfig {
  return match.board[position]!;
}

export function getAssetTotal(match: MatchState, playerIndex: number): number {
  const player = match.players[playerIndex]!;
  const ownedValue = match.properties.reduce((total, property) => {
    if (property.ownerId !== player.id) {
      return total;
    }
    const tile = match.board.find((candidate) => candidate.id === property.tileId);
    return total + (tile?.purchaseCost ?? 0);
  }, 0);

  return player.cash + ownedValue;
}
```

Create `assets/scripts/gameplay/resolve-tile.ts` with:

```ts
import { appendLog } from '../core/logger';
import type { MatchState } from '../core/types';
import { getTileAt } from './economy';

type PropertyDecision = { type: 'buy' } | { type: 'skip' };

export function resolveTileForPlayer(
  match: MatchState,
  playerIndex: number,
  propertyDecision: PropertyDecision = { type: 'skip' },
) {
  const player = match.players[playerIndex]!;
  const tile = getTileAt(match, player.position);

  if (tile.type === 'start') {
    return { match, requiresPropertyDecision: false };
  }

  if (tile.type === 'reward') {
    const reward = tile.rewardAmount ?? 0;
    const nextMatch = structuredClone(match);
    nextMatch.players[playerIndex]!.cash += reward;
    nextMatch.logs = appendLog(nextMatch.logs, nextMatch.turn, nextMatch.phase, `${player.label} gained ${reward}`);
    return { match: nextMatch, requiresPropertyDecision: false };
  }

  if (tile.type === 'penalty') {
    const penalty = tile.penaltyAmount ?? 0;
    const nextMatch = structuredClone(match);
    nextMatch.players[playerIndex]!.cash -= penalty;
    if (nextMatch.players[playerIndex]!.cash < 0) {
      nextMatch.players[playerIndex]!.isBankrupt = true;
    }
    nextMatch.logs = appendLog(nextMatch.logs, nextMatch.turn, nextMatch.phase, `${player.label} paid ${penalty}`);
    return { match: nextMatch, requiresPropertyDecision: false };
  }

  const property = match.properties.find((entry) => entry.tileId === tile.id)!;
  if (property.ownerId === null) {
    if (propertyDecision.type === 'skip') {
      return { match, requiresPropertyDecision: true };
    }
    const nextMatch = structuredClone(match);
    const nextPlayer = nextMatch.players[playerIndex]!;
    nextPlayer.cash -= tile.purchaseCost ?? 0;
    nextMatch.properties.find((entry) => entry.tileId === tile.id)!.ownerId = nextPlayer.id;
    nextMatch.logs = appendLog(nextMatch.logs, nextMatch.turn, nextMatch.phase, `${nextPlayer.label} bought ${tile.label}`);
    return { match: nextMatch, requiresPropertyDecision: false };
  }

  if (property.ownerId !== player.id) {
    const nextMatch = structuredClone(match);
    const toll = tile.tollCost ?? 0;
    const ownerIndex = nextMatch.players.findIndex((candidate) => candidate.id === property.ownerId);
    nextMatch.players[playerIndex]!.cash -= toll;
    nextMatch.players[ownerIndex]!.cash += toll;
    if (nextMatch.players[playerIndex]!.cash < 0) {
      nextMatch.players[playerIndex]!.isBankrupt = true;
      nextMatch.properties = nextMatch.properties.map((entry) =>
        entry.ownerId === nextMatch.players[playerIndex]!.id ? { ...entry, ownerId: null } : entry,
      );
    }
    nextMatch.logs = appendLog(nextMatch.logs, nextMatch.turn, nextMatch.phase, `${player.label} paid toll ${toll}`);
    return { match: nextMatch, requiresPropertyDecision: false };
  }

  return { match, requiresPropertyDecision: false };
}
```

Create `assets/scripts/gameplay/win-check.ts` with:

```ts
import type { MatchState, PlayerState } from '../core/types';
import { getAssetTotal } from './economy';

export function getWinner(match: MatchState): PlayerState | null {
  const livingPlayers = match.players.filter((player) => !player.isBankrupt);
  if (livingPlayers.length === 1) {
    return livingPlayers[0]!;
  }

  const winnerByAssets = match.players.find((_, index) => getAssetTotal(match, index) >= match.assetTarget);
  return winnerByAssets ?? null;
}
```

- [ ] **Step 5: Run the gameplay tests and make sure they pass**

Run:

```bash
npm test -- tests/gameplay/movement.test.ts tests/gameplay/resolve-tile.test.ts tests/gameplay/win-check.test.ts
```

Expected: PASS with all three gameplay tests green.

- [ ] **Step 6: Commit the board rules layer**

Run:

```bash
git add assets/scripts/data assets/scripts/gameplay tests/gameplay
git commit -m "Add board loop gameplay rules"
```

Expected: a commit exists with only board config and deterministic rule logic.

### Task 4: Add AI Decisions And End-To-End Turn Helpers

**Files:**
- Create: `assets/scripts/ai/decide-property.ts`
- Create: `assets/scripts/ai/decide-turn.ts`
- Test: `tests/ai/decide-property.test.ts`
- Modify: `assets/scripts/gameplay/economy.ts`

- [ ] **Step 1: Write the failing AI property decision test**

Create `tests/ai/decide-property.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';

import { shouldAiBuyProperty } from '../../assets/scripts/ai/decide-property';

describe('shouldAiBuyProperty', () => {
  it('buys only when reserve cash remains after purchase', () => {
    expect(shouldAiBuyProperty(400, 140, 150)).toBe(true);
    expect(shouldAiBuyProperty(260, 140, 150)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the AI test to verify it fails**

Run:

```bash
npm test -- tests/ai/decide-property.test.ts
```

Expected: FAIL because the AI module does not exist yet.

- [ ] **Step 3: Implement the AI decision helpers**

Create `assets/scripts/ai/decide-property.ts` with:

```ts
export function shouldAiBuyProperty(currentCash: number, purchaseCost: number, reserveCash: number): boolean {
  return currentCash - purchaseCost >= reserveCash;
}
```

Create `assets/scripts/ai/decide-turn.ts` with:

```ts
import type { MatchState } from '../core/types';
import { getTileAt } from '../gameplay/economy';
import { shouldAiBuyProperty } from './decide-property';

export function getAiPropertyDecision(match: MatchState, playerIndex: number, reserveCash: number): 'buy' | 'skip' {
  const player = match.players[playerIndex]!;
  const tile = getTileAt(match, player.position);

  if (tile.type !== 'property' || tile.purchaseCost === undefined) {
    return 'skip';
  }

  return shouldAiBuyProperty(player.cash, tile.purchaseCost, reserveCash) ? 'buy' : 'skip';
}
```

- [ ] **Step 4: Run the AI test and then the full deterministic test suite**

Run:

```bash
npm test -- tests/ai/decide-property.test.ts
npm test
```

Expected: PASS for the AI test and then PASS for the full test suite.

- [ ] **Step 5: Commit the AI rules**

Run:

```bash
git add assets/scripts/ai tests/ai
git commit -m "Add simple AI property decisions"
```

Expected: a commit exists with only AI rule logic and tests.

### Task 5: Build The Battle Scene And Runtime Controllers

**Files:**
- Create: `assets/scripts/ui/BattleController.ts`
- Create: `assets/scripts/ui/HudController.ts`
- Create: `assets/scripts/ui/PropertyPrompt.ts`
- Create: `assets/scripts/ui/ResultPanel.ts`
- Create: `assets/scenes/Battle.scene`
- Create: `assets/scenes/Battle.scene.meta`
- Modify: `assets/scripts/core/advance-phase.ts`
- Modify: `assets/scripts/gameplay/resolve-tile.ts`

- [ ] **Step 1: Create the controller scripts that bridge rules to the scene**

Create `assets/scripts/ui/HudController.ts` with:

```ts
import { _decorator, Component, Label } from 'cc';
import type { MatchState } from '../core/types';
import { getAssetTotal } from '../gameplay/economy';

const { ccclass, property } = _decorator;

@ccclass('HudController')
export class HudController extends Component {
  @property(Label)
  public activePlayerLabel: Label | null = null;

  @property(Label)
  public cashLabel: Label | null = null;

  @property(Label)
  public assetsLabel: Label | null = null;

  @property(Label)
  public turnLabel: Label | null = null;

  @property(Label)
  public logLabel: Label | null = null;

  public render(match: MatchState): void {
    const activePlayer = match.players[match.activePlayerIndex]!;
    if (this.activePlayerLabel) this.activePlayerLabel.string = `Current: ${activePlayer.label}`;
    if (this.cashLabel) this.cashLabel.string = `Cash: ${activePlayer.cash}`;
    if (this.assetsLabel) this.assetsLabel.string = `Assets: ${getAssetTotal(match, match.activePlayerIndex)}`;
    if (this.turnLabel) this.turnLabel.string = `Turn: ${match.turn}`;
    if (this.logLabel) this.logLabel.string = match.logs.slice(-6).map((entry) => entry.message).join('\n');
  }
}
```

Create `assets/scripts/ui/PropertyPrompt.ts` with:

```ts
import { _decorator, Button, Component, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('PropertyPrompt')
export class PropertyPrompt extends Component {
  @property(Node)
  public root: Node | null = null;

  @property(Button)
  public buyButton: Button | null = null;

  @property(Button)
  public skipButton: Button | null = null;

  public show(): void {
    if (this.root) {
      this.root.active = true;
    }
  }

  public hide(): void {
    if (this.root) {
      this.root.active = false;
    }
  }
}
```

Create `assets/scripts/ui/ResultPanel.ts` with:

```ts
import { _decorator, Component, Label, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('ResultPanel')
export class ResultPanel extends Component {
  @property(Node)
  public root: Node | null = null;

  @property(Label)
  public resultLabel: Label | null = null;

  public show(message: string): void {
    if (this.root) {
      this.root.active = true;
    }
    if (this.resultLabel) {
      this.resultLabel.string = message;
    }
  }

  public hide(): void {
    if (this.root) {
      this.root.active = false;
    }
  }
}
```

Create `assets/scripts/ui/BattleController.ts` with:

```ts
import { _decorator, Button, Component, Node, tween, Vec3 } from 'cc';

import { advancePhase } from '../core/advance-phase';
import { createMatch } from '../core/create-match';
import { GamePhase } from '../core/phases';
import type { MatchState } from '../core/types';
import { getAiPropertyDecision } from '../ai/decide-turn';
import { BOARD_CONFIG } from '../data/board-config';
import { MATCH_CONFIG } from '../data/match-config';
import { movePlayerPosition } from '../gameplay/movement';
import { resolveTileForPlayer } from '../gameplay/resolve-tile';
import { getWinner } from '../gameplay/win-check';
import { HudController } from './HudController';
import { PropertyPrompt } from './PropertyPrompt';
import { ResultPanel } from './ResultPanel';

const { ccclass, property } = _decorator;

@ccclass('BattleController')
export class BattleController extends Component {
  @property(HudController)
  public hud: HudController | null = null;

  @property(PropertyPrompt)
  public propertyPrompt: PropertyPrompt | null = null;

  @property(Button)
  public rollButton: Button | null = null;

  @property(ResultPanel)
  public resultPanel: ResultPanel | null = null;

  @property([Node])
  public tokenNodes: Node[] = [];

  @property([Node])
  public tileNodes: Node[] = [];

  private match: MatchState = createMatch(BOARD_CONFIG, MATCH_CONFIG);

  start(): void {
    this.match = advancePhase(this.match, { type: 'START_MATCH' });
    this.match = advancePhase(this.match, { type: 'BEGIN_TURN' });
    this.resultPanel?.hide();
    this.propertyPrompt?.hide();
    this.render();
    this.maybeRunAiTurn();
  }

  public onRollClicked(): void {
    if (this.match.phase !== GamePhase.AwaitRoll) return;
    if (!this.match.players[this.match.activePlayerIndex]!.isHuman) return;
    this.runRoll(Math.floor(Math.random() * 6) + 1);
  }

  private runRoll(value: number): void {
    this.match = advancePhase(this.match, { type: 'ROLL_CONFIRMED', value });
    const activePlayer = this.match.players[this.match.activePlayerIndex]!;
    const move = movePlayerPosition(activePlayer.position, value, this.match.board.length);
    activePlayer.position = move.nextPosition;
    if (move.passedStart) {
      activePlayer.cash += this.match.startBonus;
    }
    this.animateTokenToTile(this.match.activePlayerIndex, move.nextPosition, () => {
      this.match = advancePhase(this.match, { type: 'MOVEMENT_FINISHED' });
      this.resolveLanding();
    });
    this.render();
  }

  private resolveLanding(): void {
    const activeIndex = this.match.activePlayerIndex;
    const player = this.match.players[activeIndex]!;
    const aiDecision = player.isHuman ? 'skip' : getAiPropertyDecision(this.match, activeIndex, MATCH_CONFIG.aiReserveCash);
    const result = resolveTileForPlayer(this.match, activeIndex, { type: aiDecision });
    this.match = result.match;

    if (result.requiresPropertyDecision && player.isHuman) {
      this.match = advancePhase(this.match, { type: 'PROMPT_PROPERTY_DECISION' });
      this.propertyPrompt?.show();
      this.render();
      return;
    }

    this.finishTurnFlow();
  }

  public onBuyProperty(): void {
    const result = resolveTileForPlayer(this.match, this.match.activePlayerIndex, { type: 'buy' });
    this.match = result.match;
    this.propertyPrompt?.hide();
    this.finishTurnFlow();
  }

  public onSkipProperty(): void {
    this.propertyPrompt?.hide();
    this.finishTurnFlow();
  }

  private finishTurnFlow(): void {
    const winner = getWinner(this.match);
    if (winner) {
      this.match = advancePhase(this.match, { type: 'END_GAME' });
      this.match.logs.push({ turn: this.match.turn, phase: this.match.phase, message: `${winner.label} wins` });
      this.resultPanel?.show(`${winner.label} wins`);
      this.render();
      return;
    }

    this.match = advancePhase(this.match, { type: 'END_TURN' });
    this.match = advancePhase(this.match, { type: 'BEGIN_TURN' });
    this.render();
    this.maybeRunAiTurn();
  }

  private maybeRunAiTurn(): void {
    const activePlayer = this.match.players[this.match.activePlayerIndex]!;
    if (!activePlayer.isHuman && this.match.phase === GamePhase.AwaitRoll) {
      this.scheduleOnce(() => this.runRoll(Math.floor(Math.random() * 6) + 1), 0.6);
    }
  }

  private animateTokenToTile(playerIndex: number, tileIndex: number, onDone: () => void): void {
    const token = this.tokenNodes[playerIndex];
    const tile = this.tileNodes[tileIndex];
    if (!token || !tile) {
      onDone();
      return;
    }
    tween(token)
      .to(0.25, { worldPosition: tile.worldPosition.clone().add(new Vec3(0, 24, 0)) })
      .call(onDone)
      .start();
  }

  private render(): void {
    if (this.rollButton) {
      this.rollButton.interactable =
        this.match.phase === GamePhase.AwaitRoll && this.match.players[this.match.activePlayerIndex]!.isHuman;
    }
    this.hud?.render(this.match);
  }
}
```

- [ ] **Step 2: Create the `Battle` scene in the editor and wire nodes to the scripts**

Create in Cocos Editor:

```text
Canvas
  Hud
    ActivePlayerLabel
    CashLabel
    AssetsLabel
    TurnLabel
    LogLabel
    RollButton
  PropertyPrompt
    BuyButton
    SkipButton
  ResultPanel
    ResultLabel
  Board
    Tile0
    Tile1
    Tile2
    Tile3
    Tile4
    Tile5
    Tile6
    Tile7
  Tokens
    Token0
    Token1
    Token2
    Token3
```

Editor actions:

- Attach `BattleController` to `Canvas`.
- Attach `HudController` to `Hud`.
- Attach `PropertyPrompt` to `PropertyPrompt`.
- Attach `ResultPanel` to `ResultPanel`.
- Assign all label, button, token, and tile references in the inspector.
- Save the result as `assets/scenes/Battle.scene`.
- Set `Battle.scene` as the default launch scene in project settings.
- Preserve the current `assets/scenes/Battle.scene.meta` UUID `6d8fa4db-c84c-4c65-9490-29da8a5d74cd`. If the scene is recreated and that UUID changes, the CI verification contract and committed build config must be updated in the same change.

- [ ] **Step 3: Run the editor and manually verify the battle loop**

Run:

```bash
open -a /Applications/Cocos/Creator/3.8.8/CocosCreator.app /Users/lzn/.codex/worktrees/fe99/demo
```

Expected manual result:

- the project opens successfully
- `Battle.scene` loads without missing script warnings
- the roll button advances the human turn
- AI turns auto-run after the human turn
- ownership and cash change as tiles resolve

- [ ] **Step 4: Commit the first playable scene**

Run:

```bash
git add assets/scenes assets/scripts/ui
git commit -m "Add first playable battle scene"
```

Expected: a commit exists with the playable editor scene and controller scripts.

### Task 6: Verify, Document, And Clean Up The Slice

**Files:**
- Modify: `docs/README.md`
- Modify: `docs/superpowers/README.md`
- Modify: `docs/superpowers/plans/README.md`

- [ ] **Step 1: Run the full automated test suite**

Run:

```bash
npm test
```

Expected: PASS for every deterministic rules test.

- [ ] **Step 2: Smoke-test the editor flow again after a fresh reopen**

Run:

```bash
open -a /Applications/Cocos/Creator/3.8.8/CocosCreator.app /Users/lzn/.codex/worktrees/fe99/demo
```

Expected manual result:

- the project reopens cleanly
- `Battle.scene` is still the default launch scene
- `assets/scenes/Battle.scene.meta` still preserves UUID `6d8fa4db-c84c-4c65-9490-29da8a5d74cd`, or the CI verification contract has been updated in the same change
- one full match can be completed without deadlock

- [ ] **Step 3: Update docs to mention the new runnable project surface**

Append to the appropriate project-facing doc:

```md
## Local Development

- Create or refresh the Cocos project baseline with `bash tools/create-cocos-project.sh`
- Install JS dependencies with `npm install`
- Run deterministic rules tests with `npm test`
- Run repository preflight verification with `npm run verify:cocos-preflight` once the CI verification slice lands
- Run the authoritative Cocos smoke build with `npm run verify:cocos-build` on a GUI-capable macOS machine with Cocos Creator `3.8.8`
- Open the project in Cocos Creator with:
  `open -a /Applications/Cocos/Creator/3.8.8/CocosCreator.app /Users/lzn/.codex/worktrees/fe99/demo`
- If `assets/scenes/Battle.scene.meta` UUID or the playable build target changes, update the committed CI build config in the same change
```

- [ ] **Step 4: Commit the verification and doc updates**

Run:

```bash
git add docs package-lock.json package.json tests tools
git commit -m "Document first playable MVP workflow"
```

Expected: a final commit exists that only updates verification-facing docs and project commands.
