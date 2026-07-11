export function spriteMirrorForHeading(heading: number): boolean {
  const quarterTurn = ((Math.round(heading / 90) % 4) + 4) % 4;
  return quarterTurn % 2 === 1;
}
