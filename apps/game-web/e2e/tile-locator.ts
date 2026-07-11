import { expect, type Locator, type Page } from "@playwright/test";

export interface Point {
  x: number;
  y: number;
}

function parseTile(value: string): Point {
  const [x, y] = value.split(",").map(Number);
  return { x, y };
}

async function hoverAndReadTile(
  page: Page,
  canvas: Locator,
  point: Point,
): Promise<Point> {
  await canvas.hover({ position: point });
  await expect(page.getByTestId("hovered-tile")).not.toHaveText("—");
  return parseTile(await page.getByTestId("hovered-tile").innerText());
}

async function hoverAndMaybeReadTile(
  page: Page,
  canvas: Locator,
  point: Point,
): Promise<Point | null> {
  await canvas.hover({ position: point });
  await page.waitForTimeout(0);
  const value = await page.getByTestId("hovered-tile").innerText();
  return value === "—" ? null : parseTile(value);
}

export async function findTilePosition(
  page: Page,
  target: Point,
): Promise<Point> {
  const canvas = page.getByTestId("game-canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const origin = { x: box!.width / 2, y: box!.height / 2 };
  const xProbe = { x: origin.x + 180, y: origin.y };
  const yProbe = { x: origin.x, y: origin.y + 140 };
  const originTile = await hoverAndReadTile(page, canvas, origin);
  const xTile = await hoverAndReadTile(page, canvas, xProbe);
  const yTile = await hoverAndReadTile(page, canvas, yProbe);
  const a = (xTile.x - originTile.x) / 180;
  const c = (xTile.y - originTile.y) / 180;
  const b = (yTile.x - originTile.x) / 140;
  const d = (yTile.y - originTile.y) / 140;
  const determinant = a * d - b * c;
  expect(Math.abs(determinant)).toBeGreaterThan(0.0001);

  let point = { ...origin };
  const probes: Array<{ point: Point; tileDistance: number }> = [];
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const current = await hoverAndMaybeReadTile(page, canvas, point);
    if (!current) break;
    if (current.x === target.x && current.y === target.y) return point;
    const tileDeltaX = target.x - current.x;
    const tileDeltaY = target.y - current.y;
    probes.push({
      point: { ...point },
      tileDistance: Math.abs(tileDeltaX) + Math.abs(tileDeltaY),
    });
    const rawScreenDeltaX = (d * tileDeltaX - b * tileDeltaY) / determinant;
    const rawScreenDeltaY = (-c * tileDeltaX + a * tileDeltaY) / determinant;
    const scale = Math.min(
      1,
      64 / Math.max(Math.abs(rawScreenDeltaX), Math.abs(rawScreenDeltaY)),
    );
    point = {
      x: Math.min(
        box!.width - 2,
        Math.max(2, point.x + rawScreenDeltaX * scale),
      ),
      y: Math.min(
        box!.height - 2,
        Math.max(2, point.y + rawScreenDeltaY * scale),
      ),
    };
  }

  const localOffsets: Point[] = [];
  for (let y = -8; y <= 8; y += 1) {
    for (let x = -8; x <= 8; x += 1) localOffsets.push({ x, y });
  }
  localOffsets.sort(
    (left, right) =>
      Math.abs(left.x) +
        Math.abs(left.y) -
        Math.abs(right.x) -
        Math.abs(right.y) ||
      left.y - right.y ||
      left.x - right.x,
  );
  const visited = new Set<string>();
  for (const probe of probes
    .sort((left, right) => left.tileDistance - right.tileDistance)
    .slice(0, 4)) {
    for (const offset of localOffsets) {
      const candidate = {
        x: Math.min(box!.width - 2, Math.max(2, probe.point.x + offset.x)),
        y: Math.min(box!.height - 2, Math.max(2, probe.point.y + offset.y)),
      };
      const key = `${candidate.x.toFixed(2)},${candidate.y.toFixed(2)}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const current = await hoverAndMaybeReadTile(page, canvas, candidate);
      if (current?.x === target.x && current.y === target.y) return candidate;
    }
  }
  throw new Error(`无法在画布上定位 tile ${target.x},${target.y}`);
}
