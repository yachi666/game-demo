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

    if (this.activePlayerLabel) {
      this.activePlayerLabel.string = `Current: ${activePlayer.label}`;
    }
    if (this.cashLabel) {
      this.cashLabel.string = `Cash: ${activePlayer.cash}`;
    }
    if (this.assetsLabel) {
      this.assetsLabel.string = `Assets: ${getAssetTotal(match, match.activePlayerIndex)}`;
    }
    if (this.turnLabel) {
      this.turnLabel.string = `Turn: ${match.turn}`;
    }
    if (this.logLabel) {
      this.logLabel.string = match.logs.slice(-6).map((entry) => entry.message).join('\n');
    }
  }
}
