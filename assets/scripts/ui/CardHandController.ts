import { _decorator, Button, Component, Label, Node, UITransform } from 'cc';

import type { CardDefinition } from '../core/types';

const { ccclass, property } = _decorator;

@ccclass('CardHandController')
export class CardHandController extends Component {
  @property(Node)
  public root: Node | null = null;

  @property(Label)
  public titleLabel: Label | null = null;

  @property(Node)
  public cardsRoot: Node | null = null;

  public render(cards: CardDefinition[], canPlayCards: boolean, onPlay: (cardId: string) => void): void {
    if (!this.root || !this.cardsRoot) {
      return;
    }

    this.root.active = cards.length > 0;
    if (this.titleLabel) {
      this.titleLabel.string = canPlayCards ? 'Hand' : 'Hand (Locked)';
    }

    this.cardsRoot.destroyAllChildren();
    cards.forEach((card, index) => {
      const buttonNode = new Node(`Card${index}`);
      buttonNode.layer = this.cardsRoot!.layer;
      const transform = buttonNode.addComponent(UITransform);
      transform.setContentSize(180, 34);
      buttonNode.setPosition(index * 190, 0, 0);

      const label = buttonNode.addComponent(Label);
      label.string = card.label;

      const button = buttonNode.addComponent(Button);
      button.transition = Button.Transition.NONE;
      button.interactable = canPlayCards;
      buttonNode.on(Button.EventType.CLICK, () => onPlay(card.id));

      this.cardsRoot.addChild(buttonNode);
    });
  }

  public hide(): void {
    if (this.root) {
      this.root.active = false;
    }
  }
}
