import { _decorator, Button, Component, Label, Node, UITransform } from 'cc';

const { ccclass, property } = _decorator;

export interface RoleSelectionOption {
  id: string;
  label: string;
  skillLabel: string;
}

@ccclass('RoleSelectionController')
export class RoleSelectionController extends Component {
  @property(Node)
  public root: Node | null = null;

  @property(Label)
  public titleLabel: Label | null = null;

  @property(Node)
  public optionsRoot: Node | null = null;

  public render(
    options: RoleSelectionOption[],
    onSelect: (roleId: string) => void,
  ): void {
    if (!this.root || !this.optionsRoot) {
      return;
    }

    this.root.active = true;
    if (this.titleLabel) {
      this.titleLabel.string = 'Choose Your Role';
    }

    this.optionsRoot.destroyAllChildren();
    options.forEach((option, index) => {
      const buttonNode = new Node(`RoleOption${index}`);
      buttonNode.layer = this.optionsRoot!.layer;
      const transform = buttonNode.addComponent(UITransform);
      transform.setContentSize(280, 36);
      buttonNode.setPosition(0, 60 - index * 42, 0);

      const label = buttonNode.addComponent(Label);
      label.string = `${option.label} - ${option.skillLabel}`;

      const button = buttonNode.addComponent(Button);
      button.transition = Button.Transition.NONE;
      buttonNode.on(Button.EventType.CLICK, () => onSelect(option.id));

      this.optionsRoot.addChild(buttonNode);
    });
  }

  public hide(): void {
    if (this.root) {
      this.root.active = false;
    }
  }
}
