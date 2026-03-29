import { _decorator, Color, Component, Label, Node, UIOpacity } from 'cc';
import type { MatchState } from '../core/types';
import type { BattleLayoutProfile } from './battle-responsive-layout';
import { getCenterStagePresentation, getSeatPanelPresentation } from './battle-presentation';

const { ccclass, property } = _decorator;

@ccclass('HudController')
export class HudController extends Component {
  @property([Node])
  public seatPanelNodes: Node[] = [];

  @property([Label])
  public seatPanelTitleLabels: Label[] = [];

  @property([Label])
  public seatPanelStatsLabels: Label[] = [];

  @property([Label])
  public seatPanelStateLabels: Label[] = [];

  @property(Label)
  public activePlayerLabel: Label | null = null;

  @property(Label)
  public turnLabel: Label | null = null;

  @property(Label)
  public latestEventLabel: Label | null = null;

  @property(Label)
  public logLabel: Label | null = null;

  public layoutProfile: BattleLayoutProfile = 'desktop';

  public render(match: MatchState): void {
    const centerStage = getCenterStagePresentation(match, this.layoutProfile);

    if (this.activePlayerLabel) {
      this.activePlayerLabel.string = centerStage.activePlayerLabel;
    }
    if (this.turnLabel) {
      this.turnLabel.string = centerStage.turnLabel;
    }
    if (this.latestEventLabel) {
      this.latestEventLabel.string = centerStage.latestEventLabel;
    }
    if (this.logLabel) {
      this.logLabel.string = match.logs.slice(-6).map((entry) => entry.message).join('\n');
    }

    match.players.forEach((player, index) => {
      const titleLabel = this.seatPanelTitleLabels[index];
      const statsLabel = this.seatPanelStatsLabels[index];
      const stateLabel = this.seatPanelStateLabels[index];
      if (!titleLabel || !statsLabel || !stateLabel) {
        return;
      }

      const presentation = getSeatPanelPresentation(match, index);
      titleLabel.string = presentation.title;
      statsLabel.string = presentation.lines.slice(0, 2).join('\n');
      stateLabel.string = presentation.lines[2] ?? '';

      const panelNode = this.seatPanelNodes[index];
      const opacity = panelNode?.getComponent(UIOpacity) ?? panelNode?.addComponent(UIOpacity) ?? null;
      const tint = this.colorFromHex(presentation.tintHex);
      titleLabel.color = tint;
      statsLabel.color = tint;
      stateLabel.color = tint;
      if (opacity) {
        opacity.opacity = presentation.opacity;
      }
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
