import { _decorator, Button, Color, Component, Label, Node, tween, UITransform, Vec3 } from 'cc';

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
import { applyCostDiscount, getTileAt } from '../gameplay/economy';
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
import { getTilePresentation } from './battle-presentation';
import {
  advanceToNextTurnFlow,
  beginTurnFlow,
  completeRoleSelectionFlow,
  finishPreRollActionWindow,
  openRoleSelectionFlow,
} from '../core/turn-flow';
import { createDiamondTrackPositions } from './battle-layout';
import { getBattleLayoutProfile } from './battle-responsive-layout';

const { ccclass, property } = _decorator;
type ComponentCtor<T extends Component> = new () => T;

interface BattleSceneRoots {
  backgroundLayer: Node;
  boardDecorLayer: Node;
  tileLayer: Node;
  tokenLayer: Node;
  hudLayer: Node;
  overlayLayer: Node;
}

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
    const canvasNode = this.getCanvasRoot();
    const viewport = canvasNode.getComponent(UITransform)?.contentSize ?? { width: 960, height: 640 };
    const layout = getBattleLayoutProfile({ width: viewport.width, height: viewport.height });

    const hudNode = this.getOptionalChild(canvasNode, 'Hud') ?? canvasNode;
    const boardNode = this.getOptionalChild(canvasNode, 'Board') ?? canvasNode;
    const tokensNode = this.getOptionalChild(canvasNode, 'Tokens') ?? canvasNode;
    const overlayNode = this.getOptionalChild(canvasNode, 'Overlay') ?? canvasNode;

    const hud = this.getOptionalComponent(hudNode, HudController) ?? this.node.addComponent(HudController);
    hud.activePlayerLabel = this.getOptionalLabel(hudNode, 'ActivePlayerLabel');
    hud.turnLabel = this.getOptionalLabel(hudNode, 'TurnLabel');
    hud.latestEventLabel = this.getOptionalLabel(hudNode, 'LatestEventLabel');
    hud.logLabel = this.getOptionalLabel(hudNode, 'LogLabel');
    hud.layoutProfile = layout.profile;
    this.hud = hud;

    const rollButtonNode = this.getOptionalChild(hudNode, 'RollButton');
    if (rollButtonNode) {
      const rollButton = rollButtonNode.getComponent(Button);
      if (rollButton) {
        this.rollButton = rollButton;
        rollButton.node.on(Button.EventType.CLICK, this.onRollClicked, this);
      }
    }

    const propertyPromptNode = this.getOptionalChild(canvasNode, 'PropertyPrompt');
    if (propertyPromptNode) {
      const propertyPrompt = this.getOptionalComponent(propertyPromptNode, PropertyPrompt) ?? propertyPromptNode.addComponent(PropertyPrompt);
      propertyPrompt.root = propertyPromptNode;
      propertyPrompt.frameNode = propertyPromptNode;
      propertyPrompt.titleLabel = this.getOptionalLabel(propertyPromptNode, 'PromptLabel');
      propertyPrompt.districtLabel = this.getOptionalLabel(propertyPromptNode, 'DistrictLabel');
      propertyPrompt.costLabel = this.getOptionalLabel(propertyPromptNode, 'CostLabel');
      propertyPrompt.projectedCashLabel = this.getOptionalLabel(propertyPromptNode, 'ProjectedCashLabel');
      propertyPrompt.buttonRowNode = propertyPromptNode;
      propertyPrompt.buyButton = this.getOptionalButton(propertyPromptNode, 'BuyButton');
      propertyPrompt.skipButton = this.getOptionalButton(propertyPromptNode, 'SkipButton');
      propertyPrompt.layoutProfile = layout.profile;
      this.propertyPrompt = propertyPrompt;
      if (propertyPrompt.buyButton) {
        propertyPrompt.buyButton.node.on(Button.EventType.CLICK, this.onBuyProperty, this);
      }
      if (propertyPrompt.skipButton) {
        propertyPrompt.skipButton.node.on(Button.EventType.CLICK, this.onSkipProperty, this);
      }
    }

    const resultPanelNode = this.getOptionalChild(canvasNode, 'ResultPanel');
    if (resultPanelNode) {
      const resultPanel = this.getOptionalComponent(resultPanelNode, ResultPanel) ?? resultPanelNode.addComponent(ResultPanel);
      resultPanel.root = resultPanelNode;
      resultPanel.frameNode = resultPanelNode;
      resultPanel.headlineLabel = this.getOptionalLabel(resultPanelNode, 'ResultLabel');
      resultPanel.resultLabel = resultPanel.headlineLabel;
      this.resultPanel = resultPanel;
    }

    const tilePositions = createDiamondTrackPositions(BOARD_CONFIG.length, 330, 210);
    this.tileNodes = BOARD_CONFIG.map((tile, index) => {
      const tileNode = this.getOptionalChild(boardNode, `Tile${index}`);
      if (tileNode) {
        tileNode.setPosition(tilePositions[index]?.x ?? 0, tilePositions[index]?.y ?? 0, 0);
      }
      return tileNode;
    }).filter((n): n is Node => n !== null);

    this.tokenNodes = this.match.players.map((_player, index) => {
      return this.getOptionalChild(tokensNode, `Token${index}`);
    }).filter((n): n is Node => n !== null);
  }

  private getOptionalChild(parent: Node, name: string): Node | null {
    return parent.children.find(child => child.name === name) ?? null;
  }

  private getOptionalComponent<T extends Component>(node: Node, ctor: ComponentCtor<T>): T | null {
    return node.getComponent(ctor);
  }

  private getOptionalLabel(parent: Node, name: string): Label | null {
    const node = this.getOptionalChild(parent, name);
    return node?.getComponent(Label) ?? null;
  }

  private getOptionalButton(parent: Node, name: string): Button | null {
    const node = this.getOptionalChild(parent, name);
    return node?.getComponent(Button) ?? null;
  }

  private getSceneRoots(canvasNode: Node): BattleSceneRoots {
    return {
      backgroundLayer: this.getOptionalChild(canvasNode, 'BackgroundLayer') ?? canvasNode,
      boardDecorLayer: this.getOptionalChild(canvasNode, 'BoardDecorLayer') ?? canvasNode,
      tileLayer: this.getOptionalChild(canvasNode, 'TileLayer') ?? this.getRequiredChild(canvasNode, 'Board'),
      tokenLayer: this.getOptionalChild(canvasNode, 'TokenLayer') ?? this.getRequiredChild(canvasNode, 'Tokens'),
      hudLayer: this.getOptionalChild(canvasNode, 'HudLayer') ?? this.getRequiredChild(canvasNode, 'Hud'),
      overlayLayer: this.getOptionalChild(canvasNode, 'OverlayLayer') ?? this.getRequiredChild(canvasNode, 'ResultPanel'),
    };
  }

  private getOptionalChild(parent: Node, name: string): Node | null {
    return parent.children.find(child => child.name === name) ?? null;
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
      this.populatePropertyPrompt(activeIndex);
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

    this.renderBoardTiles();
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

  private bindRoleSelection(parent: Node): RoleSelectionController {
    const root = this.getRequiredChild(parent, 'RoleSelection');
    const transform = this.getRequiredTransform(root);
    transform.setContentSize(320, 240);
    root.setPosition(0, 40, 0);
    const controller = this.getRequiredComponent(root, RoleSelectionController, 'RoleSelectionController');
    controller.root = root;
    controller.titleLabel = this.getRequiredLabel(root, 'TitleLabel');
    controller.optionsRoot = this.getRequiredChild(root, 'Options');
    controller.hide();
    return controller;
  }

  private bindCardHand(parent: Node): CardHandController {
    const root = this.getRequiredChild(parent, 'CardHand');
    const transform = this.getRequiredTransform(root);
    transform.setContentSize(620, 100);
    root.setPosition(-120, 6, 0);
    const controller = this.getRequiredComponent(root, CardHandController, 'CardHandController');
    controller.root = root;
    controller.titleLabel = this.getRequiredLabel(root, 'TitleLabel');
    controller.cardsRoot = this.getRequiredChild(root, 'Cards');
    controller.hide();
    return controller;
  }

  private bindSkillButton(parent: Node): SkillButtonController {
    const root = this.getRequiredChild(parent, 'SkillButton');
    const transform = this.getRequiredTransform(root);
    transform.setContentSize(220, 40);
    root.setPosition(226, 0, 0);
    const button = assertDefined(root.getComponent(Button) ?? undefined, 'Missing Button on SkillButton');
    button.transition = Button.Transition.NONE;
    const controller = this.getRequiredComponent(root, SkillButtonController, 'SkillButtonController');
    controller.root = root;
    controller.button = button;
    controller.label = this.getRequiredLabel(root, 'Label');
    controller.hide();
    return controller;
  }

  private getRequiredChild(parent: Node, name: string): Node {
    return assertDefined(parent.getChildByName(name) ?? undefined, `Missing child node ${name} under ${parent.name}`);
  }

  private getCanvasRoot(): Node {
    if (this.node.name === 'Canvas') {
      return this.node;
    }

    return this.getRequiredChild(this.node, 'Canvas');
  }

  private getRequiredLabel(parent: Node, name: string): Label {
    const node = this.getRequiredChild(parent, name);
    return assertDefined(node.getComponent(Label) ?? undefined, `Missing Label on node ${name}`);
  }

  private getRequiredTransform(node: Node): UITransform {
    return assertDefined(node.getComponent(UITransform) ?? undefined, `Missing UITransform on node ${node.name}`);
  }

  private getRequiredButton(parent: Node, name: string): Button {
    const node = this.getRequiredChild(parent, name);
    return assertDefined(node.getComponent(Button) ?? undefined, `Missing Button on node ${name}`);
  }

  private getRequiredComponent<T extends Component>(node: Node, ctor: ComponentCtor<T>, label: string): T {
    return assertDefined(node.getComponent(ctor) ?? undefined, `Missing ${label} on node ${node.name}`);
  }

  private renderBoardTiles(): void {
    this.tileNodes.forEach((tileNode, index) => {
      const presentation = getTilePresentation(this.match, index);
      const titleLabel = this.getRequiredLabel(tileNode, 'TitleLabel');
      const supportingLabel = this.getRequiredLabel(tileNode, 'SupportingLabel');
      const badgeLabel = this.getRequiredLabel(tileNode, 'BadgeLabel');

      titleLabel.string = presentation.title;
      supportingLabel.string = presentation.supportingLabel;
      badgeLabel.string = presentation.badgeLabel;
      titleLabel.color = this.colorFromHex(presentation.accentHex);
      supportingLabel.color = this.colorFromHex(presentation.accentHex);
      badgeLabel.color = this.colorFromHex(presentation.accentHex);
      titleLabel.overflow = Label.Overflow.SHRINK;
      supportingLabel.overflow = Label.Overflow.SHRINK;
      badgeLabel.overflow = Label.Overflow.SHRINK;
    });
  }

  private populatePropertyPrompt(playerIndex: number): void {
    const player = assertDefined(this.match.players[playerIndex], `Missing player at index ${playerIndex}`);
    const tile = getTileAt(this.match, player.position);
    if (tile.type !== 'property') {
      return;
    }

    const discount = this.match.statusEffects.reduce((highestDiscount, effect) => {
      if (effect.ownerId !== player.id || effect.effectType !== 'discountNextProperty') {
        return highestDiscount;
      }

      return Math.max(highestDiscount, effect.amount);
    }, 0);
    const purchaseCost = applyCostDiscount(tile.purchaseCost ?? 0, discount);
    this.propertyPrompt?.render({
      tileName: tile.label,
      district: tile.district ? tile.district.replace(/-/g, ' ') : 'city park',
      purchaseCost,
      projectedCash: player.cash - purchaseCost,
    });
  }

  private colorFromHex(hex: string): Color {
    const normalized = hex.replace('#', '');
    const value = normalized.length === 3
      ? normalized
          .split('')
          .map((channel) => `${channel}${channel}`)
          .join('')
      : normalized;

    return new Color(
      Number.parseInt(value.slice(0, 2), 16),
      Number.parseInt(value.slice(2, 4), 16),
      Number.parseInt(value.slice(4, 6), 16),
      255,
    );
  }
}
