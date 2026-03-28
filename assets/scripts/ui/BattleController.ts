import { _decorator, Button, Component, Label, Node, tween, Vec3 } from 'cc';

import { getAiPropertyDecision } from '../ai/decide-turn';
import { advancePhase } from '../core/advance-phase';
import { createMatch } from '../core/create-match';
import { GamePhase } from '../core/phases';
import type { MatchState } from '../core/types';
import { BOARD_CONFIG } from '../data/board-config';
import { MATCH_CONFIG } from '../data/match-config';
import { movePlayerPosition } from '../gameplay/movement';
import { resolveTileForPlayer } from '../gameplay/resolve-tile';
import { getWinner } from '../gameplay/win-check';
import { assertDefined } from '../utils/assert';
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
    this.bindScene();
    this.match = advancePhase(this.match, { type: 'START_MATCH' });
    this.match = advancePhase(this.match, { type: 'BEGIN_TURN' });
    this.resultPanel?.hide();
    this.propertyPrompt?.hide();
    this.syncTokenPositions();
    this.render();
    this.maybeRunAiTurn();
  }

  public onRollClicked(): void {
    if (this.match.phase !== GamePhase.AwaitRoll) {
      return;
    }
    if (!this.match.players[this.match.activePlayerIndex]!.isHuman) {
      return;
    }

    this.runRoll(Math.floor(Math.random() * 6) + 1);
  }

  public onBuyProperty(): void {
    const result = resolveTileForPlayer(this.match, this.match.activePlayerIndex, { type: 'buy' });
    this.match = result.match;
    this.match = advancePhase(this.match, { type: 'PROPERTY_DECISION_FINISHED' });
    this.propertyPrompt?.hide();
    this.finishTurnFlow();
  }

  public onSkipProperty(): void {
    this.match = advancePhase(this.match, { type: 'PROPERTY_DECISION_FINISHED' });
    this.propertyPrompt?.hide();
    this.finishTurnFlow();
  }

  private bindScene(): void {
    const hudNode = this.getRequiredChild(this.node, 'Hud');
    const propertyPromptNode = this.getRequiredChild(this.node, 'PropertyPrompt');
    const resultPanelNode = this.getRequiredChild(this.node, 'ResultPanel');
    const boardNode = this.getRequiredChild(this.node, 'Board');
    const tokensNode = this.getRequiredChild(this.node, 'Tokens');

    this.hud = hudNode.getComponent(HudController) ?? hudNode.addComponent(HudController);
    this.hud.activePlayerLabel = this.getRequiredLabel(hudNode, 'ActivePlayerLabel');
    this.hud.cashLabel = this.getRequiredLabel(hudNode, 'CashLabel');
    this.hud.assetsLabel = this.getRequiredLabel(hudNode, 'AssetsLabel');
    this.hud.turnLabel = this.getRequiredLabel(hudNode, 'TurnLabel');
    this.hud.logLabel = this.getRequiredLabel(hudNode, 'LogLabel');

    this.propertyPrompt =
      propertyPromptNode.getComponent(PropertyPrompt) ?? propertyPromptNode.addComponent(PropertyPrompt);
    this.propertyPrompt.root = propertyPromptNode;
    this.propertyPrompt.buyButton = this.getRequiredButton(propertyPromptNode, 'BuyButton');
    this.propertyPrompt.skipButton = this.getRequiredButton(propertyPromptNode, 'SkipButton');

    this.resultPanel = resultPanelNode.getComponent(ResultPanel) ?? resultPanelNode.addComponent(ResultPanel);
    this.resultPanel.root = resultPanelNode;
    this.resultPanel.resultLabel = this.getRequiredLabel(resultPanelNode, 'ResultLabel');

    this.rollButton = this.getRequiredButton(hudNode, 'RollButton');
    this.rollButton.node.on(Button.EventType.CLICK, this.onRollClicked, this);
    this.propertyPrompt.buyButton.node.on(Button.EventType.CLICK, this.onBuyProperty, this);
    this.propertyPrompt.skipButton.node.on(Button.EventType.CLICK, this.onSkipProperty, this);

    this.tileNodes = boardNode.children
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));
    this.tokenNodes = tokensNode.children
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));
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

    this.match = advancePhase(this.match, { type: 'TILE_RESOLVED' });
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
      this.scheduleOnce(() => {
        this.runRoll(Math.floor(Math.random() * 6) + 1);
      }, 0.6);
    }
  }

  private syncTokenPositions(): void {
    this.match.players.forEach((player, index) => {
      this.placeTokenAtTile(index, player.position);
    });
  }

  private placeTokenAtTile(playerIndex: number, tileIndex: number): void {
    const token = this.tokenNodes[playerIndex];
    const tile = this.tileNodes[tileIndex];
    if (!token || !tile) {
      return;
    }

    token.setWorldPosition(tile.worldPosition.clone().add(this.getTokenOffset(playerIndex)));
  }

  private animateTokenToTile(playerIndex: number, tileIndex: number, onDone: () => void): void {
    const token = this.tokenNodes[playerIndex];
    const tile = this.tileNodes[tileIndex];
    if (!token || !tile) {
      onDone();
      return;
    }

    tween(token)
      .to(0.25, { worldPosition: tile.worldPosition.clone().add(this.getTokenOffset(playerIndex)) })
      .call(onDone)
      .start();
  }

  private getTokenOffset(playerIndex: number): Vec3 {
    const offsets = [
      new Vec3(-18, 18, 0),
      new Vec3(18, 18, 0),
      new Vec3(-18, -18, 0),
      new Vec3(18, -18, 0),
    ];

    return offsets[playerIndex] ?? new Vec3();
  }

  private render(): void {
    if (this.rollButton) {
      this.rollButton.interactable =
        this.match.phase === GamePhase.AwaitRoll && this.match.players[this.match.activePlayerIndex]!.isHuman;
    }

    this.hud?.render(this.match);
  }

  private getRequiredChild(parent: Node, name: string): Node {
    return assertDefined(parent.getChildByName(name) ?? undefined, `Missing child node ${name} under ${parent.name}`);
  }

  private getRequiredLabel(parent: Node, name: string): Label {
    const node = this.getRequiredChild(parent, name);
    return assertDefined(node.getComponent(Label) ?? undefined, `Missing Label on node ${name}`);
  }

  private getRequiredButton(parent: Node, name: string): Button {
    const node = this.getRequiredChild(parent, name);
    return assertDefined(node.getComponent(Button) ?? undefined, `Missing Button on node ${name}`);
  }
}
