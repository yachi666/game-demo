import { _decorator, Button, Component, Label, Node } from 'cc';
import type { BattleLayoutProfile } from './battle-responsive-layout';
import { getPropertyPromptPresentation } from './battle-presentation';

const { ccclass, property } = _decorator;

export interface PropertyPromptDetails {
  district: string;
  projectedCash: number;
  purchaseCost: number;
  tileName: string;
}

@ccclass('PropertyPrompt')
export class PropertyPrompt extends Component {
  @property(Node)
  public root: Node | null = null;

  @property(Node)
  public frameNode: Node | null = null;

  @property(Label)
  public titleLabel: Label | null = null;

  @property(Label)
  public districtLabel: Label | null = null;

  @property(Label)
  public costLabel: Label | null = null;

  @property(Label)
  public projectedCashLabel: Label | null = null;

  @property(Node)
  public buttonRowNode: Node | null = null;

  @property(Button)
  public buyButton: Button | null = null;

  @property(Button)
  public skipButton: Button | null = null;

  public layoutProfile: BattleLayoutProfile = 'desktop';

  public render(details: PropertyPromptDetails): void {
    const presentation = getPropertyPromptPresentation(details, this.layoutProfile);

    if (this.titleLabel) {
      this.titleLabel.string = presentation.title;
    }
    if (this.districtLabel) {
      this.districtLabel.string = presentation.districtLabel;
    }
    if (this.costLabel) {
      this.costLabel.string = presentation.costLabel;
    }
    if (this.projectedCashLabel) {
      this.projectedCashLabel.string = presentation.projectedCashLabel;
    }
  }

  public show(): void {
    const target = this.root ?? this.frameNode;
    if (target) {
      target.active = true;
    }
  }

  public hide(): void {
    const target = this.root ?? this.frameNode;
    if (target) {
      target.active = false;
    }
  }
}
