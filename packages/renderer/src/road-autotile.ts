export const ROAD_NORTH = 1;
export const ROAD_EAST = 2;
export const ROAD_SOUTH = 4;
export const ROAD_WEST = 8;

export type RoadVariantName =
  | "isolated"
  | "n"
  | "e"
  | "ne"
  | "s"
  | "ns"
  | "es"
  | "nes"
  | "w"
  | "nw"
  | "ew"
  | "new"
  | "sw"
  | "nsw"
  | "esw"
  | "nesw";

const ROAD_VARIANTS: readonly RoadVariantName[] = [
  "isolated",
  "n",
  "e",
  "ne",
  "s",
  "ns",
  "es",
  "nes",
  "w",
  "nw",
  "ew",
  "new",
  "sw",
  "nsw",
  "esw",
  "nesw",
];

interface RoadCoordinate {
  x: number;
  y: number;
}

interface RoadBounds {
  width: number;
  height: number;
}

const roadKey = (road: RoadCoordinate) => `${road.x}:${road.y}`;

const inBounds = (road: RoadCoordinate, bounds?: RoadBounds) =>
  !bounds ||
  (road.x >= 0 &&
    road.y >= 0 &&
    road.x < bounds.width &&
    road.y < bounds.height);

const connectionMaskFromOccupied = (
  road: RoadCoordinate,
  occupied: ReadonlySet<string>,
) => {
  let mask = 0;
  if (occupied.has(roadKey({ x: road.x, y: road.y - 1 }))) {
    mask |= ROAD_NORTH;
  }
  if (occupied.has(roadKey({ x: road.x + 1, y: road.y }))) {
    mask |= ROAD_EAST;
  }
  if (occupied.has(roadKey({ x: road.x, y: road.y + 1 }))) {
    mask |= ROAD_SOUTH;
  }
  if (occupied.has(roadKey({ x: road.x - 1, y: road.y }))) {
    mask |= ROAD_WEST;
  }
  return mask;
};

export function roadConnectionMask(
  road: RoadCoordinate,
  roads: readonly RoadCoordinate[],
  bounds?: RoadBounds,
): number {
  const occupied = new Set(
    roads.filter((candidate) => inBounds(candidate, bounds)).map(roadKey),
  );
  return connectionMaskFromOccupied(road, occupied);
}

export function roadConnectionMasks(
  roads: readonly RoadCoordinate[],
  bounds: RoadBounds,
): Map<number, number> {
  const validRoads = roads.filter((road) => inBounds(road, bounds));
  const occupied = new Set(validRoads.map(roadKey));
  return new Map(
    validRoads.map((road) => [
      road.y * bounds.width + road.x,
      connectionMaskFromOccupied(road, occupied),
    ]),
  );
}

export function roadVariantName(mask: number): RoadVariantName {
  return ROAD_VARIANTS[mask & 0b1111]!;
}
