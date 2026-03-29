import { _decorator, Component, Label, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('ResultPanel')
export class ResultPanel extends Component {
  @property(Node)
  public root: Node | null = null;

  @property(Node)
  public frameNode: Node | null = null;

  @property(Label)
  public headlineLabel: Label | null = null;

  @property(Label)
  public resultLabel: Label | null = null;

  public show(message: string): void {
    const target = this.root ?? this.frameNode;
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
    const target = this.root ?? this.frameNode;
    if (target) {
      target.active = false;
    }
  }
}
