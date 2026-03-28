import { _decorator, Button, Component, Label, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SkillButtonController')
export class SkillButtonController extends Component {
  @property(Node)
  public root: Node | null = null;

  @property(Button)
  public button: Button | null = null;

  @property(Label)
  public label: Label | null = null;

  public render(skillLabel: string, canUseSkill: boolean, onUse: () => void): void {
    if (!this.root || !this.button || !this.label) {
      return;
    }

    this.root.active = true;
    this.button.interactable = canUseSkill;
    this.label.string = canUseSkill ? skillLabel : `${skillLabel} (Used)`;
    this.button.node.off(Button.EventType.CLICK);
    this.button.node.on(Button.EventType.CLICK, onUse);
  }

  public hide(): void {
    if (this.root) {
      this.root.active = false;
    }
  }
}
