import { _decorator, Button, Color, Component, Label, Node, tween, UITransform, Vec3 } from 'cc';

import { decideCardToPlay } from '../ai/decide-card';
import { decideSkillToUse } from '../ai/decide-skill';
import { resolveAiLanding } from '../ai/decide-turn';
import { advancePhase } from '../core/advance-phase';
import { createMatch } from '../core/create-match';
import { GamePhase } from '../core/phases';
import {
  advanceToNextTurnFlow,
  beginTurnFlow,
  completeRoleSelectionFlow,
  finishPreRollActionWindow,
  openRoleSelectionFlow,
} from '../core/turn-flow';
import type { MatchSetupSelection, MatchState } from '../core/types';
import { BOARD_CONFIG } from '../data/board-config';
import { MATCH_CONFIG } from '../data/match-config';
import { playCardForPlayer } from '../gameplay/cards';
import { getPropertyPurchaseQuote, getTileAt } from '../gameplay/economy';
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
  applyMatchSetupSelection,
  getCurrentMatchSetupSelection,
  setCurrentMatchSetupSelection,
} from './LobbyController';
import { createDiamondTrackPositions } from './battle-layout';
import { getBattleHudFlowPresentation, getTilePresentation } from './battle-presentation';
import { getBattleLayoutProfile, getBattleRuntimeLayout } from './battle-responsive-layout';
import type { BattleLayoutProfile, BattleRuntimeLayout } from './battle-responsive-layout';

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

function applyStoredRoleSelection(match: MatchState, selectedRoleId: string | undefined): MatchState {
  if (!selectedRoleId || !match.availableRoleIds.includes(selectedRoleId)) {
    return match;
  }

  return completeRoleSelectionFlow(openRoleSelectionFlow(match), selectedRoleId);
}

export function createInitialBattleMatch(selection: MatchSetupSelection = getCurrentMatchSetupSelection()): MatchState {
  const match = createMatch(BOARD_CONFIG, applyMatchSetupSelection(MATCH_CONFIG, selection));
  return applyStoredRoleSelection(match, selection.selectedRoleId);
}

function createInitialMatch(): MatchState {
  return createInitialBattleMatch();
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

  private match: MatchState = createInitialMatch();
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
    const selectedMatch = completeRoleSelectionFlow(this.match, roleId);
    setCurrentMatchSetupSelection({
      ...getCurrentMatchSetupSelection(),
      selectedRoleId: roleId,
    });
    this.match = beginTurnFlow(selectedMatch);
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
    const runtimeLayout = getBattleRuntimeLayout(layout);
    const sceneRoots = this.getSceneRoots(canvasNode);

    this.applyResponsiveLayout(sceneRoots, runtimeLayout);
    this.syncParticipantVisibility(sceneRoots);
    this.hud = this.bindHud(sceneRoots.hudLayer, layout.profile);
    this.rollButton = this.bindRollButton(this.getRequiredChild(sceneRoots.hudLayer, 'CenterStage'));
    this.propertyPrompt = this.bindPropertyPrompt(sceneRoots.overlayLayer, layout.profile);
    this.resultPanel = this.bindResultPanel(sceneRoots.overlayLayer);
    this.roleSelection = this.bindRoleSelection(sceneRoots.overlayLayer);

    const actionArea = this.getRequiredChild(sceneRoots.hudLayer, 'ActionArea');
    this.cardHand = this.bindCardHand(actionArea);
    this.skillButton = this.bindSkillButton(actionArea);

    const tilePositions = createDiamondTrackPositions(BOARD_CONFIG.length, 330, 210);
    this.tileNodes = BOARD_CONFIG.map((_tile, index) => {
      const tileNode = this.getRequiredChild(sceneRoots.tileLayer, `Tile${index}`);
      const tilePosition = tilePositions[index];
      tileNode.setPosition(tilePosition?.x ?? 0, tilePosition?.y ?? 0, 0);
      return tileNode;
    });

    this.tokenNodes = this.match.players.map((_player, index) =>
      this.getRequiredChild(sceneRoots.tokenLayer, `Token${index}`),
    );
  }

  private getSceneRoots(canvasNode: Node): BattleSceneRoots {
    return {
      backgroundLayer: this.getRequiredChild(canvasNode, 'BackgroundLayer'),
      boardDecorLayer: this.getRequiredChild(canvasNode, 'BoardDecorLayer'),
      tileLayer: this.getRequiredChild(canvasNode, 'TileLayer'),
      tokenLayer: this.getRequiredChild(canvasNode, 'TokenLayer'),
      hudLayer: this.getRequiredChild(canvasNode, 'HudLayer'),
      overlayLayer: this.getRequiredChild(canvasNode, 'OverlayLayer'),
    };
  }

  private applyResponsiveLayout(sceneRoots: BattleSceneRoots, layout: BattleRuntimeLayout): void {
    [sceneRoots.boardDecorLayer, sceneRoots.tileLayer, sceneRoots.tokenLayer].forEach((layer) => {
      layer.setScale(layout.boardScale, layout.boardScale, 1);
    });

    const centerStage = this.getRequiredChild(sceneRoots.hudLayer, 'CenterStage');
    centerStage.setPosition(layout.centerStage.x, layout.centerStage.y, 0);
    const centerStageTransform = assertDefined(
      centerStage.getComponent(UITransform) ?? undefined,
      `Missing UITransform on node ${centerStage.name}`,
    );
    centerStageTransform.setContentSize(layout.centerStage.width, layout.centerStage.height);

    const seatPanelsRoot = this.getRequiredChild(sceneRoots.hudLayer, 'SeatPanels');
    seatPanelsRoot.setPosition(0, 0, 0);
    layout.seatPanelPositions.forEach((position, index) => {
      const seatPanelNode = this.getRequiredChild(seatPanelsRoot, `SeatPanel${index}`);
      seatPanelNode.setPosition(position.x, position.y, 0);
    });
  }

  private syncParticipantVisibility(sceneRoots: BattleSceneRoots): void {
    const seatPanelsRoot = this.getRequiredChild(sceneRoots.hudLayer, 'SeatPanels');
    this.syncIndexedNodeVisibility(seatPanelsRoot, 'SeatPanel');
    this.syncIndexedNodeVisibility(sceneRoots.tokenLayer, 'Token');
  }

  private syncIndexedNodeVisibility(parent: Node, prefix: string): void {
    parent.children.forEach((child) => {
      if (!child.name.startsWith(prefix)) {
        return;
      }

      const index = Number.parseInt(child.name.slice(prefix.length), 10);
      child.active = Number.isInteger(index) && index < this.match.players.length;
    });
  }

  private bindHud(root: Node, layoutProfile: BattleLayoutProfile): HudController {
    const controller = this.getRequiredComponent(root, HudController, 'HudController');
    const seatPanelsRoot = this.getRequiredChild(root, 'SeatPanels');
    const centerStage = this.getRequiredChild(root, 'CenterStage');
    const actionArea = this.getRequiredChild(root, 'ActionArea');

    controller.layoutProfile = layoutProfile;
    controller.seatPanelNodes = this.match.players.map((_player, index) =>
      this.getRequiredChild(seatPanelsRoot, `SeatPanel${index}`),
    );
    controller.seatPanelTitleLabels = controller.seatPanelNodes.map((panelNode) =>
      this.getRequiredLabel(panelNode, 'TitleLabel'),
    );
    controller.seatPanelStatsLabels = controller.seatPanelNodes.map((panelNode) =>
      this.getRequiredLabel(panelNode, 'StatsLabel'),
    );
    controller.seatPanelStateLabels = controller.seatPanelNodes.map((panelNode) =>
      this.getRequiredLabel(panelNode, 'StateLabel'),
    );
    controller.activePlayerLabel = this.getRequiredLabel(centerStage, 'ActivePlayerLabel');
    controller.turnLabel = this.getRequiredLabel(centerStage, 'TurnLabel');
    controller.latestEventLabel = this.getRequiredLabel(centerStage, 'LatestEventLabel');
    controller.logLabel = this.getRequiredLabel(actionArea, 'LogLabel');

    return controller;
  }

  private bindRollButton(parent: Node): Button {
    const button = this.getRequiredButton(parent, 'RollButton');
    button.node.on(Button.EventType.CLICK, this.onRollClicked, this);
    return button;
  }

  private bindPropertyPrompt(parent: Node, layoutProfile: BattleLayoutProfile): PropertyPrompt {
    const root = this.getRequiredChild(parent, 'PropertyPrompt');
    const controller = this.getRequiredComponent(root, PropertyPrompt, 'PropertyPrompt');

    controller.root = root;
    controller.frameNode = root;
    controller.titleLabel = this.getRequiredLabel(root, 'TitleLabel');
    controller.districtLabel = this.getRequiredLabel(root, 'DistrictLabel');
    controller.costLabel = this.getRequiredLabel(root, 'CostLabel');
    controller.projectedCashLabel = this.getRequiredLabel(root, 'ProjectedCashLabel');
    controller.buttonRowNode = root;
    controller.buyButton = this.getRequiredButton(root, 'BuyButton');
    controller.skipButton = this.getRequiredButton(root, 'SkipButton');
    controller.layoutProfile = layoutProfile;
    controller.buyButton.node.on(Button.EventType.CLICK, this.onBuyProperty, this);
    controller.skipButton.node.on(Button.EventType.CLICK, this.onSkipProperty, this);

    return controller;
  }

  private bindResultPanel(parent: Node): ResultPanel {
    const root = this.getRequiredChild(parent, 'ResultPanel');
    const controller = this.getRequiredComponent(root, ResultPanel, 'ResultPanel');
    const resultLabel = this.getRequiredLabel(root, 'ResultLabel');

    controller.root = root;
    controller.frameNode = root;
    controller.headlineLabel = resultLabel;
    controller.resultLabel = resultLabel;
    controller.hide();

    return controller;
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
    const result = player.isHuman
      ? resolveTileForPlayer(this.match, activeIndex, { type: 'skip' })
      : resolveAiLanding(this.match, activeIndex, MATCH_CONFIG.aiReserveCash);
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
    const offsets = [new Vec3(-18, 18, 0), new Vec3(18, 18, 0), new Vec3(-18, -18, 0), new Vec3(18, -18, 0)];

    return offsets[playerIndex] ?? new Vec3();
  }

  private render(): void {
    const hudFlow = getBattleHudFlowPresentation(this.match);

    if (this.rollButton) {
      this.rollButton.interactable = hudFlow.rollButtonEnabled;
    }

    if (this.roleSelection) {
      if (hudFlow.roleSelection.visible) {
        this.roleSelection.render(hudFlow.roleSelection.options, (roleId) => this.onRoleSelected(roleId));
      } else {
        this.roleSelection.hide();
      }
    }

    if (this.cardHand) {
      if (hudFlow.cardHand.visible) {
        this.cardHand.render(hudFlow.cardHand.cards, hudFlow.cardHand.canPlayCards, (cardId) =>
          this.onPlayCard(cardId),
        );
      } else {
        this.cardHand.hide();
      }
    }

    if (this.skillButton) {
      if (hudFlow.skillButton.visible && hudFlow.skillButton.label) {
        this.skillButton.render(hudFlow.skillButton.label, hudFlow.skillButton.canUseSkill, () => this.onUseSkill());
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
    const controller = this.getRequiredComponent(root, RoleSelectionController, 'RoleSelectionController');

    controller.root = root;
    controller.titleLabel = this.getRequiredLabel(root, 'TitleLabel');
    controller.optionsRoot = this.getRequiredChild(root, 'Options');
    controller.hide();

    return controller;
  }

  private bindCardHand(parent: Node): CardHandController {
    const root = this.getRequiredChild(parent, 'CardHand');
    const controller = this.getRequiredComponent(root, CardHandController, 'CardHandController');

    controller.root = root;
    controller.titleLabel = this.getRequiredLabel(root, 'TitleLabel');
    controller.cardsRoot = this.getRequiredChild(root, 'Cards');
    controller.hide();

    return controller;
  }

  private bindSkillButton(parent: Node): SkillButtonController {
    const root = this.getRequiredChild(parent, 'SkillButton');
    const controller = this.getRequiredComponent(root, SkillButtonController, 'SkillButtonController');

    controller.root = root;
    controller.button = this.getRequiredButton(parent, 'SkillButton');
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

    const purchaseQuote = getPropertyPurchaseQuote(this.match, player.id, tile.purchaseCost ?? 0);
    this.propertyPrompt?.render({
      tileName: tile.label,
      district: tile.district ? tile.district.replace(/-/g, ' ') : 'city park',
      purchaseCost: purchaseQuote.effectivePurchaseCost,
      projectedCash: player.cash - purchaseQuote.effectivePurchaseCost,
    });
  }

  private colorFromHex(hex: string): Color {
    const normalized = hex.replace('#', '');
    const value =
      normalized.length === 3
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
