import * as cc from 'cc';

import { replayBattleWithCurrentSelection, returnToLobby } from './LobbyController';

const { _decorator } = cc;
const { ccclass, property } = _decorator;

@ccclass('ResultPanel')
export class ResultPanel extends cc.Component {
  @property(cc.Node)
  public root: cc.Node | null = null;

  @property(cc.Node)
  public frameNode: cc.Node | null = null;

  @property(cc.Label)
  public headlineLabel: cc.Label | null = null;

  @property(cc.Label)
  public resultLabel: cc.Label | null = null;

  @property(cc.Button)
  public replayButton: cc.Button | null = null;

  @property(cc.Button)
  public lobbyButton: cc.Button | null = null;

  private shellActionsBound = false;

  onLoad(): void {
    this.ensureBindings();
    this.bindShellActions();
  }

  public show(message: string): void {
    this.ensureBindings();
    this.bindShellActions();

    const target = this.getTargetNode();
    if (target) {
      target.active = true;
    }
    if (this.headlineLabel) {
      this.headlineLabel.string = message;
    }
    if (this.resultLabel) {
      this.resultLabel.string = message;
    }
  }

  public hide(): void {
    const target = this.getTargetNode();
    if (target) {
      target.active = false;
    }
  }

  public onReplayClicked(): void {
    replayBattleWithCurrentSelection();
  }

  public onReturnToLobbyClicked(): void {
    returnToLobby();
  }

  private ensureBindings(): void {
    if (!this.root) {
      this.root = this.node;
    }
    if (!this.frameNode) {
      this.frameNode = this.root;
    }
    if (!this.headlineLabel) {
      this.headlineLabel = this.findLabel('ResultLabel');
    }
    if (!this.resultLabel) {
      this.resultLabel = this.findLabel('ResultLabel');
    }
    if (!this.replayButton) {
      this.replayButton = this.findButton('ReplayButton');
    }
    if (!this.lobbyButton) {
      this.lobbyButton = this.findButton('LobbyButton');
    }

    const replayButtonLabel = this.replayButton?.node.getComponent(cc.Label);
    if (replayButtonLabel) {
      replayButtonLabel.string = 'Play Again';
    }

    const lobbyButtonLabel = this.lobbyButton?.node.getComponent(cc.Label);
    if (lobbyButtonLabel) {
      lobbyButtonLabel.string = 'Return to Lobby';
    }
  }

  private bindShellActions(): void {
    if (this.shellActionsBound) {
      return;
    }

    this.replayButton?.node.on(cc.Button.EventType.CLICK, this.onReplayClicked, this);
    this.lobbyButton?.node.on(cc.Button.EventType.CLICK, this.onReturnToLobbyClicked, this);
    this.shellActionsBound = Boolean(this.replayButton || this.lobbyButton);
  }

  private findButton(name: string): cc.Button | null {
    return this.root?.getChildByName(name)?.getComponent(cc.Button) ?? null;
  }

  private findLabel(name: string): cc.Label | null {
    return this.root?.getChildByName(name)?.getComponent(cc.Label) ?? null;
  }

  private getTargetNode(): cc.Node | null {
    return this.root ?? this.frameNode ?? this.node ?? null;
  }
}
