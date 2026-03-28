export function shouldAiBuyProperty(currentCash: number, purchaseCost: number, reserveCash: number): boolean {
  return currentCash - purchaseCost >= reserveCash;
}
