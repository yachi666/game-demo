import { _decorator, Button, Component, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('PropertyPrompt')
export class PropertyPrompt extends Component {
  @property(Node)
  public root: Node | null = null;

  @property(Button)
  public buyButton: Button | null = null;

  @property(Button)
  public skipButton: Button | null = null;

  public show(): void {
    if (this.root) {
      this.root.active = true;
    }
  }

  public hide(): void {
    if (this.root) {
      this.root.active = false;
    }
  }
}
