import { _decorator, Button, Color, Component, Graphics, Label, Node, profiler, tween, UITransform, Vec3 } from 'cc';

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
    this.hidePreviewProfiler();
    this.bindScene();
    this.resultPanel?.hide();
    this.propertyPrompt?.hide();
    this.syncTokenPositions();
    this.match = this.match.requiresRoleSelection ? openRoleSelectionFlow(this.match) : beginTurnFlow(this.match);
    this.render();
    this.maybeRunAiFlow();
  }

  private hidePreviewProfiler(): void {
    try {
      profiler.hideStats();
    } catch {
      // Preview/runtime shells differ; ignore environments without a profiler bridge.
    }
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

    this.applyWorldMapTheme(sceneRoots, layout.profile, tilePositions);
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

  private applyWorldMapTheme(
    sceneRoots: BattleSceneRoots,
    layoutProfile: BattleLayoutProfile,
    tilePositions: Array<{ x: number; y: number }>,
  ): void {
    this.decorateBackgroundLayer(sceneRoots.backgroundLayer);
    this.decorateBoardDecorLayer(sceneRoots.boardDecorLayer, layoutProfile, tilePositions);
    this.decorateSeatPanels(this.getRequiredChild(sceneRoots.hudLayer, 'SeatPanels'), layoutProfile);
    this.decorateCenterStage(this.getRequiredChild(sceneRoots.hudLayer, 'CenterStage'), layoutProfile);
    this.decorateActionArea(this.getRequiredChild(sceneRoots.hudLayer, 'ActionArea'), layoutProfile);
    this.decorateTileNodes(layoutProfile);
    this.decorateTokenNodes();
    this.decoratePropertyPrompt(this.getRequiredChild(sceneRoots.overlayLayer, 'PropertyPrompt'), layoutProfile);
    this.decorateResultPanel(this.getRequiredChild(sceneRoots.overlayLayer, 'ResultPanel'), layoutProfile);
    this.decorateRoleSelection(this.getRequiredChild(sceneRoots.overlayLayer, 'RoleSelection'), layoutProfile);
  }

  private decorateBackgroundLayer(layer: Node): void {
    const backdrop = this.ensureGraphicChild(layer, 'MapBackdrop', 1320, 760);
    this.paintRoundedRect(backdrop, 1320, 760, '#184d72', '#3e7398', 52);

    const oceanGlow = this.ensureGraphicChild(layer, 'OceanGlow', 1060, 560);
    this.paintDiamond(oceanGlow, 920, 460, '#2c678c', '#7db7d9');
  }

  private decorateBoardDecorLayer(
    layer: Node,
    layoutProfile: BattleLayoutProfile,
    tilePositions: Array<{ x: number; y: number }>,
  ): void {
    const routeRing = this.ensureGraphicChild(layer, 'RouteRing', 920, 620);
    this.paintRouteRing(routeRing, tilePositions, layoutProfile);

    const centerStageFrame = this.ensureGraphicChild(layer, 'CenterStageFrame', 350, 220);
    this.paintRoundedRect(centerStageFrame, 350, 220, '#efe8d2', '#c9b37f', 40);

    const landmarkPositions = [
      { x: -318, y: 204 },
      { x: 318, y: 204 },
      { x: 318, y: -204 },
      { x: -318, y: -204 },
    ];

    landmarkPositions.forEach((position, index) => {
      const landmark = this.ensureGraphicChild(layer, `CornerLandmark${index}`, 88, 88);
      landmark.setPosition(position.x, position.y, 0);
      this.paintCircleBadge(landmark, 34, ['#ffb74d', '#64b5f6', '#81c784', '#ba68c8'][index] ?? '#ffb74d');
    });
  }

  private decorateSeatPanels(root: Node, layoutProfile: BattleLayoutProfile): void {
    const panelWidth = layoutProfile === 'portrait' ? 172 : 220;
    const panelHeight = layoutProfile === 'portrait' ? 98 : 112;

    root.children.forEach((panelNode, index) => {
      const transform = panelNode.getComponent(UITransform) ?? panelNode.addComponent(UITransform);
      transform.setContentSize(panelWidth, panelHeight);

      const frame = this.ensureGraphicChild(panelNode, 'PanelFrame', panelWidth, panelHeight);
      this.paintRoundedRect(frame, panelWidth, panelHeight, '#f4ecd6', '#c59d56', 24);

      const titleLabel = this.getRequiredLabel(panelNode, 'TitleLabel');
      const statsLabel = this.getRequiredLabel(panelNode, 'StatsLabel');
      const stateLabel = this.getRequiredLabel(panelNode, 'StateLabel');

      titleLabel.node.setPosition(0, 28, 0);
      statsLabel.node.setPosition(0, -4, 0);
      stateLabel.node.setPosition(0, -34, 0);
      titleLabel.fontSize = layoutProfile === 'portrait' ? 18 : 20;
      statsLabel.fontSize = layoutProfile === 'portrait' ? 14 : 15;
      stateLabel.fontSize = layoutProfile === 'portrait' ? 13 : 14;
      titleLabel.color = this.colorFromHex(['#9c5d12', '#155e9a', '#0d6846', '#7f2d93'][index] ?? '#9c5d12');
      statsLabel.color = this.colorFromHex('#2d3a47');
      stateLabel.color = this.colorFromHex('#5d4830');
    });
  }

  private decorateCenterStage(centerStage: Node, layoutProfile: BattleLayoutProfile): void {
    const transform = centerStage.getComponent(UITransform) ?? centerStage.addComponent(UITransform);
    const width = transform.contentSize.width || (layoutProfile === 'portrait' ? 250 : 320);
    const height = transform.contentSize.height || (layoutProfile === 'portrait' ? 108 : 132);
    transform.setContentSize(width, height);

    const frame = this.ensureGraphicChild(centerStage, 'StageFrame', width, height);
    this.paintRoundedRect(frame, width, height, '#fbf3dc', '#c9ab68', 30);

    this.getRequiredLabel(centerStage, 'ActivePlayerLabel').node.setPosition(0, 28, 0);
    this.getRequiredLabel(centerStage, 'TurnLabel').node.setPosition(0, -4, 0);
    this.getRequiredLabel(centerStage, 'LatestEventLabel').node.setPosition(0, -36, 0);
  }

  private decorateActionArea(actionArea: Node, layoutProfile: BattleLayoutProfile): void {
    const width = layoutProfile === 'portrait' ? 280 : 340;
    const height = layoutProfile === 'portrait' ? 170 : 182;
    const frame = this.ensureGraphicChild(actionArea, 'ActionFrame', width, height);
    frame.setPosition(0, layoutProfile === 'portrait' ? -150 : -170, 0);
    this.paintRoundedRect(frame, width, height, '#f5efd9', '#bfa26b', 28);

    const logLabel = this.getRequiredLabel(actionArea, 'LogLabel');
    logLabel.node.setPosition(0, layoutProfile === 'portrait' ? -102 : -112, 0);
    logLabel.fontSize = layoutProfile === 'portrait' ? 14 : 15;

    const cardHandRoot = this.getRequiredChild(actionArea, 'CardHand');
    cardHandRoot.setPosition(layoutProfile === 'portrait' ? -60 : -74, layoutProfile === 'portrait' ? -44 : -52, 0);
    const cardFrame = this.ensureGraphicChild(cardHandRoot, 'CardFrame', layoutProfile === 'portrait' ? 124 : 146, 72);
    this.paintRoundedRect(cardFrame, layoutProfile === 'portrait' ? 124 : 146, 72, '#fff9ec', '#d1b274', 18);

    const skillButtonRoot = this.getRequiredChild(actionArea, 'SkillButton');
    skillButtonRoot.setPosition(layoutProfile === 'portrait' ? 76 : 92, layoutProfile === 'portrait' ? -46 : -52, 0);
    const skillFrame = this.ensureGraphicChild(skillButtonRoot, 'SkillFrame', layoutProfile === 'portrait' ? 110 : 126, 72);
    this.paintRoundedRect(skillFrame, layoutProfile === 'portrait' ? 110 : 126, 72, '#fff7df', '#c8aa5b', 18);
  }

  private decorateTileNodes(layoutProfile: BattleLayoutProfile): void {
    const tileWidth = layoutProfile === 'portrait' ? 108 : 124;
    const tileHeight = layoutProfile === 'portrait' ? 66 : 74;

    this.tileNodes.forEach((tileNode, index) => {
      const transform = tileNode.getComponent(UITransform) ?? tileNode.addComponent(UITransform);
      transform.setContentSize(tileWidth, tileHeight);

      const frame = this.ensureGraphicChild(tileNode, 'TileFrame', tileWidth, tileHeight);
      this.paintRoundedRect(frame, tileWidth, tileHeight, '#fff8ea', '#d1ac63', 20);

      const titleLabel = this.getRequiredLabel(tileNode, 'TitleLabel');
      const supportingLabel = this.getRequiredLabel(tileNode, 'SupportingLabel');
      const badgeLabel = this.getRequiredLabel(tileNode, 'BadgeLabel');
      titleLabel.node.setPosition(0, 14, 0);
      supportingLabel.node.setPosition(0, -12, 0);
      badgeLabel.node.setPosition(0, 32, 0);
      titleLabel.fontSize = layoutProfile === 'portrait' ? 14 : 15;
      supportingLabel.fontSize = layoutProfile === 'portrait' ? 11 : 12;
      badgeLabel.fontSize = layoutProfile === 'portrait' ? 12 : 13;
      if (index % 2 === 0) {
        titleLabel.color = this.colorFromHex('#2f4050');
        supportingLabel.color = this.colorFromHex('#5c6e7d');
      }
    });
  }

  private decorateTokenNodes(): void {
    this.tokenNodes.forEach((tokenNode, index) => {
      const badge = this.ensureGraphicChild(tokenNode, 'TokenBadge', 42, 42);
      this.paintCircleBadge(badge, 18, ['#ef5350', '#42a5f5', '#ffca28', '#ab47bc'][index] ?? '#ef5350');

      const label = tokenNode.getChildByName('Label')?.getComponent(Label) ?? null;
      if (label) {
        label.string = this.match.players[index]?.label.replace('Player ', 'P').replace('AI ', 'A') ?? `${index + 1}`;
        label.fontSize = 12;
        label.color = this.colorFromHex('#ffffff');
      }
    });
  }

  private decoratePropertyPrompt(root: Node, layoutProfile: BattleLayoutProfile): void {
    const width = layoutProfile === 'portrait' ? 250 : 320;
    const height = layoutProfile === 'portrait' ? 190 : 212;
    const frame = this.ensureGraphicChild(root, 'PromptFrame', width, height);
    this.paintRoundedRect(frame, width, height, '#fbf5e3', '#cda95b', 28);
  }

  private decorateResultPanel(root: Node, layoutProfile: BattleLayoutProfile): void {
    const width = layoutProfile === 'portrait' ? 260 : 336;
    const height = layoutProfile === 'portrait' ? 158 : 176;
    const frame = this.ensureGraphicChild(root, 'ResultFrame', width, height);
    this.paintRoundedRect(frame, width, height, '#fff8e8', '#d1b16a', 28);
  }

  private decorateRoleSelection(root: Node, layoutProfile: BattleLayoutProfile): void {
    const width = layoutProfile === 'portrait' ? 280 : 360;
    const height = layoutProfile === 'portrait' ? 240 : 260;
    const frame = this.ensureGraphicChild(root, 'RoleSelectionFrame', width, height);
    this.paintRoundedRect(frame, width, height, '#f9f1dc', '#caa55e', 28);
  }

  private ensureGraphicChild(parent: Node, name: string, width: number, height: number): Node {
    let node = parent.getChildByName(name);
    if (!node) {
      node = new Node(name);
      parent.addChild(node);
    }

    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);
    if ('setSiblingIndex' in node && typeof (node as Node & { setSiblingIndex?: (index: number) => void }).setSiblingIndex === 'function') {
      (node as Node & { setSiblingIndex: (index: number) => void }).setSiblingIndex(0);
    }
    return node;
  }

  private ensureGraphics(node: Node): Graphics {
    return node.getComponent(Graphics) ?? node.addComponent(Graphics);
  }

  private paintRoundedRect(node: Node, width: number, height: number, fillHex: string, strokeHex: string, radius: number): void {
    const graphics = this.ensureGraphics(node) as Graphics & {
      fillColor?: Color;
      lineWidth?: number;
      strokeColor?: Color;
    };
    graphics.clear();
    graphics.fillColor = this.colorFromHex(fillHex);
    graphics.strokeColor = this.colorFromHex(strokeHex);
    graphics.lineWidth = 4;
    graphics.roundRect(-width / 2, -height / 2, width, height, radius);
    graphics.fill();
    graphics.stroke();
  }

  private paintDiamond(node: Node, width: number, height: number, fillHex: string, strokeHex: string): void {
    const graphics = this.ensureGraphics(node) as Graphics & {
      fillColor?: Color;
      lineWidth?: number;
      strokeColor?: Color;
    };
    graphics.clear();
    graphics.fillColor = this.colorFromHex(fillHex);
    graphics.strokeColor = this.colorFromHex(strokeHex);
    graphics.lineWidth = 6;
    graphics.moveTo(-width / 2, 0);
    graphics.lineTo(0, -height / 2);
    graphics.lineTo(width / 2, 0);
    graphics.lineTo(0, height / 2);
    graphics.lineTo(-width / 2, 0);
    graphics.fill();
    graphics.stroke();
  }

  private paintRouteRing(node: Node, tilePositions: Array<{ x: number; y: number }>, layoutProfile: BattleLayoutProfile): void {
    const graphics = this.ensureGraphics(node) as Graphics & {
      lineWidth?: number;
      strokeColor?: Color;
    };
    graphics.clear();
    graphics.strokeColor = this.colorFromHex(layoutProfile === 'portrait' ? '#f7e0a0' : '#f3d37c');
    graphics.lineWidth = layoutProfile === 'portrait' ? 22 : 26;
    const first = tilePositions[0];
    if (!first) {
      return;
    }
    graphics.moveTo(first.x, first.y);
    tilePositions.slice(1).forEach((position) => {
      graphics.lineTo(position.x, position.y);
    });
    graphics.lineTo(first.x, first.y);
    graphics.stroke();
  }

  private paintCircleBadge(node: Node, radius: number, fillHex: string): void {
    const graphics = this.ensureGraphics(node) as Graphics & {
      fillColor?: Color;
      lineWidth?: number;
      strokeColor?: Color;
    };
    graphics.clear();
    graphics.fillColor = this.colorFromHex(fillHex);
    graphics.strokeColor = this.colorFromHex('#fff6dd');
    graphics.lineWidth = 4;
    graphics.circle(0, 0, radius);
    graphics.fill();
    graphics.stroke();
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
