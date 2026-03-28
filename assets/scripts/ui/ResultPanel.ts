import { _decorator, Component, Label, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('ResultPanel')
export class ResultPanel extends Component {
  @property(Node)
  public root: Node | null = null;

  @property(Label)
  public resultLabel: Label | null = null;

  public show(message: string): void {
    if (this.root) {
      this.root.active = true;
    }
    if (this.resultLabel) {
      this.resultLabel.string = message;
    }
  }

  public hide(): void {
    if (this.root) {
      this.root.active = false;
    }
  }
}
