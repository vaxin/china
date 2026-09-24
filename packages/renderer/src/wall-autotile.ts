export const WALL_NORTH = 1;
export const WALL_EAST = 2;
export const WALL_SOUTH = 4;
export const WALL_WEST = 8;

interface WallCoordinate {
  x: number;
  y: number;
}

interface WallBounds {
  width: number;
  height: number;
  originX?: number;
  originY?: number;
}

const wallKey = (wall: WallCoordinate) => `${wall.x}:${wall.y}`;

const inBounds = (wall: WallCoordinate, bounds?: WallBounds) =>
  !bounds ||
  (wall.x >= (bounds.originX ?? 0) &&
    wall.y >= (bounds.originY ?? 0) &&
    wall.x < (bounds.originX ?? 0) + bounds.width &&
    wall.y < (bounds.originY ?? 0) + bounds.height);

const boundedWallKey = (wall: WallCoordinate, bounds: WallBounds) =>
  (wall.y - (bounds.originY ?? 0)) * bounds.width +
  wall.x -
  (bounds.originX ?? 0);

function connectionMaskFromOccupied(
  wall: WallCoordinate,
  occupied: ReadonlySet<string>,
): number {
  let mask = 0;
  if (occupied.has(wallKey({ x: wall.x, y: wall.y - 1 }))) {
    mask |= WALL_NORTH;
  }
  if (occupied.has(wallKey({ x: wall.x + 1, y: wall.y }))) {
    mask |= WALL_EAST;
  }
  if (occupied.has(wallKey({ x: wall.x, y: wall.y + 1 }))) {
    mask |= WALL_SOUTH;
  }
  if (occupied.has(wallKey({ x: wall.x - 1, y: wall.y }))) {
    mask |= WALL_WEST;
  }
  return mask;
}

export function wallConnectionMask(
  wall: WallCoordinate,
  walls: readonly WallCoordinate[],
  bounds?: WallBounds,
  gate?: WallCoordinate,
): number {
  const occupied = new Set(
    walls.filter((candidate) => inBounds(candidate, bounds)).map(wallKey),
  );
  if (gate && inBounds(gate, bounds)) occupied.add(wallKey(gate));
  return connectionMaskFromOccupied(wall, occupied);
}

export function wallConnectionMasks(
  walls: readonly WallCoordinate[],
  bounds: WallBounds,
  gate?: WallCoordinate,
): Map<number, number> {
  const validWalls = walls.filter((wall) => inBounds(wall, bounds));
  const occupied = new Set(validWalls.map(wallKey));
  if (gate && inBounds(gate, bounds)) occupied.add(wallKey(gate));
  return new Map(
    validWalls.map((wall) => [
      boundedWallKey(wall, bounds),
      connectionMaskFromOccupied(wall, occupied),
    ]),
  );
}

function rotateWallMaskClockwise(mask: number): number {
  let rotated = 0;
  if (mask & WALL_NORTH) rotated |= WALL_EAST;
  if (mask & WALL_EAST) rotated |= WALL_SOUTH;
  if (mask & WALL_SOUTH) rotated |= WALL_WEST;
  if (mask & WALL_WEST) rotated |= WALL_NORTH;
  return rotated;
}

export function rotateWallMaskForHeading(
  mask: number,
  heading: number,
): number {
  const quarterTurns = ((Math.round(heading / 90) % 4) + 4) % 4;
  let rotated = mask & 0b1111;
  for (let turn = 0; turn < quarterTurns; turn += 1) {
    rotated = rotateWallMaskClockwise(rotated);
  }
  return rotated;
}
