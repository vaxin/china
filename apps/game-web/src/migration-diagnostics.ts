import { CITY_GATE_TILE, type WorldSnapshot } from "@empire/protocol";
import { migrationAttractiveness } from "@empire/simulation";

function tileKey(tile: { x: number; y: number }): string {
  return `${tile.x},${tile.y}`;
}

function connectedRoadKeys(snapshot: WorldSnapshot): Set<string> {
  const roads = new Map(snapshot.roads.map((road) => [tileKey(road), road]));
  const entrance = tileKey(CITY_GATE_TILE);
  if (!roads.has(entrance)) return new Set();
  const connected = new Set([entrance]);
  const queue: Array<{ x: number; y: number }> = [{ ...CITY_GATE_TILE }];
  let cursor = 0;
  while (cursor < queue.length) {
    const current = queue[cursor]!;
    cursor += 1;
    for (const neighbor of [
      { x: current.x - 1, y: current.y },
      { x: current.x + 1, y: current.y },
      { x: current.x, y: current.y - 1 },
      { x: current.x, y: current.y + 1 },
    ]) {
      const key = tileKey(neighbor);
      if (!roads.has(key) || connected.has(key)) continue;
      connected.add(key);
      queue.push(neighbor);
    }
  }
  return connected;
}

function houseBorderTiles(
  house: WorldSnapshot["buildings"][number],
  map: WorldSnapshot["map"],
) {
  const tiles: Array<{ x: number; y: number }> = [];
  for (let x = house.x; x < house.x + house.footprint.width; x += 1) {
    tiles.push(
      { x, y: house.y - 1 },
      { x, y: house.y + house.footprint.height },
    );
  }
  for (let y = house.y; y < house.y + house.footprint.height; y += 1) {
    tiles.push(
      { x: house.x - 1, y },
      { x: house.x + house.footprint.width, y },
    );
  }
  return tiles.filter(
    (tile) =>
      tile.x >= 0 && tile.y >= 0 && tile.x < map.width && tile.y < map.height,
  );
}

export function constructionDiagnostic(snapshot: WorldSnapshot): string {
  const pending = snapshot.buildings.filter(
    (building) => building.typeId === "house" && building.constructionStage < 4,
  );
  if (pending.length === 0) return "营造 —";

  const appeal = migrationAttractiveness(
    snapshot.economy?.sentiment ?? 50,
    snapshot.laborPolicy?.wageLevel ?? "standard",
  );
  if (!appeal.canMigrate) {
    return `待迁 ${pending.length} 处 · 迁引 ${appeal.score} 停迁（提高工资或民心）`;
  }

  const connected = connectedRoadKeys(snapshot);
  if (!connected.has(tileKey(CITY_GATE_TILE))) {
    return `待迁 ${pending.length} 处 · 城门入口 (0,15) 未铺路`;
  }
  const unconnectedPlots = pending.filter(
    (house) =>
      !houseBorderTiles(house, snapshot.map).some((tile) =>
        connected.has(tileKey(tile)),
      ),
  );
  if (unconnectedPlots.length > 0) {
    return `待迁 ${pending.length} 处 · ${unconnectedPlots.length} 处宅基地未贴城门连通道路`;
  }
  if (snapshot.migrants.length > 0) {
    return `营造 ${pending.length} 处 · 流民正在赶来`;
  }
  return `待迁 ${pending.length} 处 · 条件已满足，等待下一月流民出发`;
}
