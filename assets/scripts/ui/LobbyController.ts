import * as cc from 'cc';

import type { MatchConfig, MatchSetupSelection } from '../core/types';
import { MATCH_CONFIG } from '../data/match-config';

const { _decorator } = cc;
const { ccclass, property } = _decorator;

type SceneDirector = {
  loadScene(sceneName: string): void;
};

const SUPPORTED_SEAT_COUNT = Math.max(1, MATCH_CONFIG.players.length);

export const LOBBY_SCENE_NAME = 'Lobby';
export const BATTLE_SCENE_NAME = 'Battle';

export const DEFAULT_MATCH_SETUP_SELECTION: MatchSetupSelection = {
  humanPlayers: 1,
  aiPlayers: 3,
  selectedRoleId: 'role-economy',
};

let currentMatchSetupSelection: MatchSetupSelection = { ...DEFAULT_MATCH_SETUP_SELECTION };

function getDirector(): SceneDirector | null {
  return (cc as typeof cc & { director?: SceneDirector }).director ?? null;
}

function getFinitePlayerCount(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function normalizeMatchSetupSelection(
  selection: MatchSetupSelection,
  supportedSeatCount = SUPPORTED_SEAT_COUNT,
): MatchSetupSelection {
  const maxPlayers = Number.isFinite(supportedSeatCount)
    ? Math.max(1, Math.trunc(supportedSeatCount))
    : SUPPORTED_SEAT_COUNT;
  const humanPlayers = Math.min(
    maxPlayers,
    Math.max(1, getFinitePlayerCount(selection.humanPlayers, DEFAULT_MATCH_SETUP_SELECTION.humanPlayers)),
  );
  const aiPlayers = Math.min(
    maxPlayers - humanPlayers,
    Math.max(0, getFinitePlayerCount(selection.aiPlayers, DEFAULT_MATCH_SETUP_SELECTION.aiPlayers)),
  );
  const nextSelection: MatchSetupSelection = {
    humanPlayers,
    aiPlayers,
  };

  if (selection.selectedRoleId) {
    nextSelection.selectedRoleId = selection.selectedRoleId;
  }

  return nextSelection;
}

function relabelSelectedPlayers(config: MatchConfig, humanPlayerCount: number, totalPlayers: number) {
  let humanLabelIndex = 0;
  let aiLabelIndex = 0;

  return config.players.slice(0, totalPlayers).map((player, index) => {
    const isHuman = index < humanPlayerCount;
    if (isHuman) {
      humanLabelIndex += 1;
    } else {
      aiLabelIndex += 1;
    }

    return {
      ...player,
      isHuman,
      label: isHuman ? `Player ${humanLabelIndex}` : `AI ${aiLabelIndex}`,
    };
  });
}

export function applyMatchSetupSelection(config: MatchConfig, selection: MatchSetupSelection): MatchConfig {
  const nextSelection = normalizeMatchSetupSelection(selection, config.players.length);
  const totalPlayers = nextSelection.humanPlayers + nextSelection.aiPlayers;

  return {
    ...config,
    players: relabelSelectedPlayers(config, nextSelection.humanPlayers, totalPlayers),
  };
}

export function getCurrentMatchSetupSelection(): MatchSetupSelection {
  return { ...currentMatchSetupSelection };
}

export function setCurrentMatchSetupSelection(selection: MatchSetupSelection): MatchSetupSelection {
  currentMatchSetupSelection = normalizeMatchSetupSelection(selection);
  return getCurrentMatchSetupSelection();
}

export function launchBattleWithSelection(selection: MatchSetupSelection): MatchSetupSelection {
  const nextSelection = setCurrentMatchSetupSelection(selection);
  getDirector()?.loadScene(BATTLE_SCENE_NAME);
  return nextSelection;
}

export function replayBattleWithCurrentSelection(): MatchSetupSelection {
  const nextSelection = getCurrentMatchSetupSelection();
  getDirector()?.loadScene(BATTLE_SCENE_NAME);
  return nextSelection;
}

export function returnToLobby(): void {
  getDirector()?.loadScene(LOBBY_SCENE_NAME);
}

@ccclass('LobbyController')
export class LobbyController extends cc.Component {
  @property(cc.Node)
  public root: cc.Node | null = null;

  @property(cc.Label)
  public titleLabel: cc.Label | null = null;

  @property(cc.Label)
  public selectionLabel: cc.Label | null = null;

  @property(cc.Button)
  public startButton: cc.Button | null = null;

  private currentSelection: MatchSetupSelection = getCurrentMatchSetupSelection();

  start(): void {
    this.ensureBindings();
    this.startButton?.node.on(cc.Button.EventType.CLICK, this.onStartClicked, this);
    this.render();
  }

  public render(selection: MatchSetupSelection = getCurrentMatchSetupSelection()): void {
    this.ensureBindings();
    this.currentSelection = normalizeMatchSetupSelection(selection);
    if (this.root) {
      this.root.active = true;
    }
    if (this.titleLabel) {
      this.titleLabel.string = 'Fortune Board';
    }
    if (this.selectionLabel) {
      this.selectionLabel.string = this.describeSelection(this.currentSelection);
    }
  }

  public launchBattle(selection: MatchSetupSelection = this.currentSelection): MatchSetupSelection {
    return launchBattleWithSelection(selection);
  }

  public onStartClicked(): void {
    this.launchBattle();
  }

  private ensureBindings(): void {
    if (!this.root) {
      this.root = this.node;
    }
    if (!this.titleLabel) {
      this.titleLabel = this.findLabel('TitleLabel');
    }
    if (!this.selectionLabel) {
      this.selectionLabel = this.findLabel('SelectionLabel');
    }
    if (!this.startButton) {
      this.startButton = this.findButton('StartButton');
    }
  }

  private findButton(name: string): cc.Button | null {
    return this.root?.getChildByName(name)?.getComponent(cc.Button) ?? null;
  }

  private findLabel(name: string): cc.Label | null {
    return this.root?.getChildByName(name)?.getComponent(cc.Label) ?? null;
  }

  private describeSelection(selection: MatchSetupSelection): string {
    const roleSummary = selection.selectedRoleId ? `, role ${selection.selectedRoleId}` : '';
    return `${selection.humanPlayers} human vs ${selection.aiPlayers} AI${roleSummary}`;
  }
}
