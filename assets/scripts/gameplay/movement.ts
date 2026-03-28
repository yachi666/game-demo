export function movePlayerPosition(current: number, roll: number, boardSize: number) {
  const visitedPositions: number[] = [];
  let nextPosition = current;
  let passedStart = false;

  for (let step = 0; step < roll; step += 1) {
    nextPosition = (nextPosition + 1) % boardSize;
    if (nextPosition === 0) {
      passedStart = true;
    }
    visitedPositions.push(nextPosition);
  }

  return {
    nextPosition,
    passedStart,
    visitedPositions,
  };
}
