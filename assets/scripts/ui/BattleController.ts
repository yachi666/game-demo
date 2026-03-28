import { _decorator, Button, Component, Label, Node, tween, UITransform, Vec3 } from 'cc';

import { decideCardToPlay } from '../ai/decide-card';
import { decideSkillToUse } from '../ai/decide-skill';
import { getAiPropertyDecision } from '../ai/decide-turn';
import { advancePhase } from '../core/advance-phase';
import { createMatch } from '../core/create-match';
import { GamePhase } from '../core/phases';
import type { MatchState } from '../core/types';
import { BOARD_CONFIG } from '../data/board-config';
import { STARTER_CARD_DEFINITIONS } from '../data/card-config';
import { MATCH_CONFIG } from '../data/match-config';
import { ROLE_DEFINITIONS } from '../data/role-config';
import { playCardForPlayer } from '../gameplay/cards';
import { applyRollMovementForPlayer } from '../gameplay/movement';
import { resolveTileForPlayer } from '../gameplay/resolve-tile';
import { applySkillForPlayer } from '../gameplay/skills';
import { getWinner } from '../gameplay/win-check';
import { assertDefined } from '../utils/assert';
import { CardHandController } from './CardHandController';
import { HudController } from './HudController';
import { PropertyPrompt } from './PropertyPrompt';
import { ResultPanel } from './ResultPanel';
import { RoleSelectionController } from './RoleSelectionController';
import { SkillButtonController } from './SkillButtonController';
import {
  advanceToNextTurnFlow,
  beginTurnFlow,
  completeRoleSelectionFlow,
  finishPreRollActionWindow,
  openRoleSelectionFlow,
} from '../core/turn-flow';

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

  @property(RoleSelectionController)
  public roleSelection: RoleSelectionController | null = null;

  @property(CardHandController)
  public cardHand: CardHandController | null = null;

  @property(SkillButtonController)
  public skillButton: SkillButtonController | null = null;

  @property([Node])
  public tokenNodes: Node[] = [];

  @property([Node])
  public tileNodes: Node[] = [];

  private match: MatchState = createMatch(BOARD_CONFIG, MATCH_CONFIG);
  private resumePreRollAfterPropertyDecision = false;

  // BattleController owns scene wiring, animation, and rendering; rules sequencing belongs in core/.
  start(): void {
    this.bindScene();
    this.resultPanel?.hide();
    this.propertyPrompt?.hide();
    this.syncTokenPositions();
    this.match = this.match.requiresRoleSelection ? openRoleSelectionFlow(this.match) : beginTurnFlow(this.match);
    this.render();
    this.maybeRunAiFlow();
  }

  public onRollClicked(): void {
    const activePlayer = this.match.players[this.match.activePlayerIndex]!;
    if (!activePlayer.isHuman) {
      return;
    }

    if (this.match.phase === GamePhase.AwaitPreRollActions) {
      this.match = finishPreRollActionWindow(this.match);
      this.render();
    }

    if (this.match.phase !== GamePhase.AwaitRoll) {
      return;
    }

    this.runRoll(Math.floor(Math.random() * 6) + 1);
  }

  public onRoleSelected(roleId: string): void {
    this.match = completeRoleSelectionFlow(this.match, roleId);
    this.match = beginTurnFlow(this.match);
    this.render();
    this.maybeRunAiFlow();
  }

  public onPlayCard(cardId: string): void {
    if (this.match.phase !== GamePhase.AwaitPreRollActions) {
      return;
    }

    this.playActiveCard(cardId);
  }

  public onUseSkill(): void {
    if (this.match.phase !== GamePhase.AwaitPreRollActions) {
      return;
    }

    this.match = applySkillForPlayer(this.match, this.match.activePlayerIndex);
    this.render();
  }

  public onBuyProperty(): void {
    const result = resolveTileForPlayer(this.match, this.match.activePlayerIndex, { type: 'buy' });
    this.match = result.match;
    this.propertyPrompt?.hide();

    if (this.resumePreRollAfterPropertyDecision) {
      this.resumePreRollAfterPropertyDecision = false;
      if (this.showWinnerIfAny()) {
        return;
      }
      this.match = advancePhase(this.match, { type: 'PRE_ROLL_PROPERTY_DECISION_FINISHED' });
      this.render();
      return;
    }

    this.match = advancePhase(this.match, { type: 'PROPERTY_DECISION_FINISHED' });
    this.finishTurnFlow();
  }

  public onSkipProperty(): void {
    this.propertyPrompt?.hide();

    if (this.resumePreRollAfterPropertyDecision) {
      this.resumePreRollAfterPropertyDecision = false;
      this.match = advancePhase(this.match, { type: 'PRE_ROLL_PROPERTY_DECISION_FINISHED' });
      this.render();
      return;
    }

    this.match = advancePhase(this.match, { type: 'PROPERTY_DECISION_FINISHED' });
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
    this.hud.roleLabel = this.getOrCreateLabel(hudNode, 'RoleLabel', new Vec3(-150, -10, 0), 'Role: Unassigned');
    this.hud.cardCountLabel = this.getOrCreateLabel(hudNode, 'CardCountLabel', new Vec3(120, -10, 0), 'Cards: 0');
    this.hud.logLabel = this.getRequiredLabel(hudNode, 'LogLabel');

    this.propertyPrompt =
      propertyPromptNode.getComponent(PropertyPrompt) ?? propertyPromptNode.addComponent(PropertyPrompt);
    this.propertyPrompt.root = propertyPromptNode;
    this.propertyPrompt.buyButton = this.getRequiredButton(propertyPromptNode, 'BuyButton');
    this.propertyPrompt.skipButton = this.getRequiredButton(propertyPromptNode, 'SkipButton');

    this.resultPanel = resultPanelNode.getComponent(ResultPanel) ?? resultPanelNode.addComponent(ResultPanel);
    this.resultPanel.root = resultPanelNode;
    this.resultPanel.resultLabel = this.getRequiredLabel(resultPanelNode, 'ResultLabel');

    this.roleSelection = this.bindRoleSelection();
    this.cardHand = this.bindCardHand();
    this.skillButton = this.bindSkillButton();

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
    const movementResult = applyRollMovementForPlayer(this.match, this.match.activePlayerIndex, value);
    this.match = movementResult.match;

    this.animateTokenToTile(this.match.activePlayerIndex, movementResult.movement.nextPosition, () => {
      this.match = advancePhase(this.match, { type: 'MOVEMENT_FINISHED' });
      this.resolveLanding(true);
    });
    this.render();
  }

  private resolveLanding(shouldEndTurnAfterResolution: boolean, onSettled?: () => void): void {
    const activeIndex = this.match.activePlayerIndex;
    const player = this.match.players[activeIndex]!;
    const aiDecision = player.isHuman ? 'skip' : getAiPropertyDecision(this.match, activeIndex, MATCH_CONFIG.aiReserveCash);
    const result = resolveTileForPlayer(this.match, activeIndex, { type: aiDecision });
    this.match = result.match;

    if (result.requiresPropertyDecision && player.isHuman) {
      this.resumePreRollAfterPropertyDecision = !shouldEndTurnAfterResolution;
      this.match = advancePhase(this.match, { type: 'PROMPT_PROPERTY_DECISION' });
      this.propertyPrompt?.show();
      this.render();
      return;
    }

    this.match = advancePhase(
      this.match,
      shouldEndTurnAfterResolution
        ? { type: 'TILE_RESOLVED' }
        : player.isHuman
          ? { type: 'PRE_ROLL_TILE_RESOLVED' }
          : { type: 'AI_PRE_ROLL_TILE_RESOLVED' },
    );

    if (!shouldEndTurnAfterResolution) {
      if (this.showWinnerIfAny()) {
        return;
      }
      this.render();
      onSettled?.();
      return;
    }

    this.finishTurnFlow();
  }

  private finishTurnFlow(): void {
    if (this.showWinnerIfAny()) {
      return;
    }

    this.match = advanceToNextTurnFlow(this.match);
    this.render();
    this.maybeRunAiFlow();
  }

  private maybeRunAiFlow(): void {
    const activePlayer = this.match.players[this.match.activePlayerIndex]!;
    if (!activePlayer.isHuman && this.match.phase === GamePhase.AwaitAiPreRollActions) {
      this.scheduleOnce(() => {
        const cardId = decideCardToPlay(this.match, this.match.activePlayerIndex, MATCH_CONFIG.aiReserveCash);
        if (cardId) {
          this.playActiveCard(cardId, () => this.maybeRunAiFlow());
          return;
        }

        if (decideSkillToUse(this.match, this.match.activePlayerIndex, MATCH_CONFIG.aiReserveCash)) {
          this.match = applySkillForPlayer(this.match, this.match.activePlayerIndex);
          this.render();
          this.maybeRunAiFlow();
          return;
        }

        this.match = finishPreRollActionWindow(this.match);
        this.render();
        this.maybeRunAiFlow();
      }, 0.3);
      return;
    }

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
        (this.match.phase === GamePhase.AwaitRoll || this.match.phase === GamePhase.AwaitPreRollActions) &&
        this.match.players[this.match.activePlayerIndex]!.isHuman;
    }

    if (this.roleSelection) {
      if (this.match.phase === GamePhase.AwaitRoleSelection) {
        this.roleSelection.render(
          ROLE_DEFINITIONS.filter((role) => this.match.availableRoleIds.includes(role.id)).map((role) => ({
            id: role.id,
            label: role.label,
            skillLabel: role.skillLabel,
          })),
          (roleId) => this.onRoleSelected(roleId),
        );
      } else {
        this.roleSelection.hide();
      }
    }

    const activePlayer = this.match.players[this.match.activePlayerIndex]!;
    const activeCards = activePlayer.hand
      .map((cardId) => STARTER_CARD_DEFINITIONS.find((card) => card.id === cardId) ?? null)
      .filter((card): card is (typeof STARTER_CARD_DEFINITIONS)[number] => card !== null);
    if (this.cardHand) {
      if (activePlayer.isHuman && this.match.phase === GamePhase.AwaitPreRollActions) {
        this.cardHand.render(activeCards, !activePlayer.hasUsedCardThisTurn, (cardId) => this.onPlayCard(cardId));
      } else {
        this.cardHand.hide();
      }
    }

    if (this.skillButton) {
      const role = ROLE_DEFINITIONS.find((candidate) => candidate.id === activePlayer.roleId);
      if (activePlayer.isHuman && this.match.phase === GamePhase.AwaitPreRollActions && role) {
        this.skillButton.render(role.skillLabel, !activePlayer.hasUsedSkillThisTurn, () => this.onUseSkill());
      } else {
        this.skillButton.hide();
      }
    }

    this.hud?.render(this.match);
  }

  private playActiveCard(cardId: string, onSettled?: () => void): void {
    const previousPosition = this.match.players[this.match.activePlayerIndex]!.position;
    this.match = playCardForPlayer(this.match, this.match.activePlayerIndex, cardId);
    const nextPosition = this.match.players[this.match.activePlayerIndex]!.position;
    if (nextPosition !== previousPosition) {
      this.animateTokenToTile(this.match.activePlayerIndex, nextPosition, () => {
        this.match = advancePhase(this.match, { type: 'MOVEMENT_FINISHED' });
        this.resolveLanding(false, onSettled);
      });
      this.render();
      return;
    }

    this.syncTokenPositions();
    this.render();
    onSettled?.();
  }

  private showWinnerIfAny(): boolean {
    const winner = getWinner(this.match);
    if (!winner) {
      return false;
    }

    this.match = advancePhase(this.match, { type: 'END_GAME' });
    this.match.logs.push({ turn: this.match.turn, phase: this.match.phase, message: `${winner.label} wins` });
    this.resultPanel?.show(`${winner.label} wins`);
    this.render();
    return true;
  }

  private bindRoleSelection(): RoleSelectionController {
    const root = this.getOrCreateChild(this.node, 'RoleSelection');
    const transform = root.getComponent(UITransform) ?? root.addComponent(UITransform);
    transform.setContentSize(320, 240);
    root.setPosition(0, 40, 0);
    const controller = root.getComponent(RoleSelectionController) ?? root.addComponent(RoleSelectionController);
    controller.root = root;
    controller.titleLabel = this.getOrCreateLabel(root, 'TitleLabel', new Vec3(0, 100, 0), 'Choose Your Role');
    controller.optionsRoot = this.getOrCreateChild(root, 'Options');
    controller.hide();
    return controller;
  }

  private bindCardHand(): CardHandController {
    const root = this.getOrCreateChild(this.node, 'CardHand');
    const transform = root.getComponent(UITransform) ?? root.addComponent(UITransform);
    transform.setContentSize(620, 100);
    root.setPosition(-260, -270, 0);
    const controller = root.getComponent(CardHandController) ?? root.addComponent(CardHandController);
    controller.root = root;
    controller.titleLabel = this.getOrCreateLabel(root, 'TitleLabel', new Vec3(0, 34, 0), 'Hand');
    controller.cardsRoot = this.getOrCreateChild(root, 'Cards');
    controller.hide();
    return controller;
  }

  private bindSkillButton(): SkillButtonController {
    const root = this.getOrCreateChild(this.node, 'SkillButton');
    const transform = root.getComponent(UITransform) ?? root.addComponent(UITransform);
    transform.setContentSize(220, 40);
    root.setPosition(340, -270, 0);
    const button = root.getComponent(Button) ?? root.addComponent(Button);
    button.transition = Button.Transition.NONE;
    const controller = root.getComponent(SkillButtonController) ?? root.addComponent(SkillButtonController);
    controller.root = root;
    controller.button = button;
    controller.label = this.getOrCreateLabel(root, 'Label', new Vec3(0, 0, 0), 'Use Skill');
    controller.hide();
    return controller;
  }

  private getRequiredChild(parent: Node, name: string): Node {
    return assertDefined(parent.getChildByName(name) ?? undefined, `Missing child node ${name} under ${parent.name}`);
  }

  private getOrCreateChild(parent: Node, name: string): Node {
    const existing = parent.getChildByName(name);
    if (existing) {
      return existing;
    }

    const node = new Node(name);
    node.layer = parent.layer;
    parent.addChild(node);
    return node;
  }

  private getRequiredLabel(parent: Node, name: string): Label {
    const node = this.getRequiredChild(parent, name);
    return assertDefined(node.getComponent(Label) ?? undefined, `Missing Label on node ${name}`);
  }

  private getOrCreateLabel(parent: Node, name: string, position: Vec3, text: string): Label {
    const node = this.getOrCreateChild(parent, name);
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(260, 30);
    node.setPosition(position);
    const label = node.getComponent(Label) ?? node.addComponent(Label);
    label.string = text;
    return label;
  }

  private getRequiredButton(parent: Node, name: string): Button {
    const node = this.getRequiredChild(parent, name);
    return assertDefined(node.getComponent(Button) ?? undefined, `Missing Button on node ${name}`);
  }
}
