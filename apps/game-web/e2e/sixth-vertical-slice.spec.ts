import { expect, test, type Page } from "@playwright/test";

const runtimeErrors = new WeakMap<Page, string[]>();
const selectedTiles = new WeakMap<Page, { x: number; y: number }>();

test.beforeEach(async ({ page }) => {
  selectedTiles.set(page, { x: 16, y: 16 });
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page) ?? []).toEqual([]);
});

const hudTestIds = [
  "game-status",
  "renderer-name",
  "building-count",
  "well-count",
  "farm-count",
  "granary-count",
  "market-count",
  "granary-food-count",
  "market-food-count",
  "road-count",
  "population-count",
  "simulation-tick",
];

test("S6-10 桌面、窄桌面和移动窄屏均显示十二项民生 HUD", async ({ page }) => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 800, height: 700 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const testId of hudTestIds) {
      await expect(page.getByTestId(testId)).toBeVisible();
      await expect(page.getByTestId(testId)).toBeInViewport();
    }
    await expect(page.getByTestId("food-supply-status")).toHaveText("供粮 —");
    if (viewport.width === 390) {
      await page.screenshot({ path: "/tmp/empire-sixth-mobile.png" });
    }
  }
});

test("S6-01 市场工具可用键盘建造并产生独特 3D 像素", async ({ page }) => {
  const canvas = page.getByTestId("game-canvas");
  const before = await canvas.screenshot();
  await page.getByRole("button", { name: "市场" }).click();
  await expect(page.getByRole("button", { name: "市场" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await moveSelection(page, { x: 5, y: 5 });
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("market-count")).toHaveText("1");
  await expect(page.getByTestId("feedback")).toHaveText("市场建造完成");
  await expect(page.getByRole("button", { name: "市场" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const after = await canvas.screenshot();
  expect(after.equals(before)).toBe(false);
});

test("S6-03～S6-09 市场稳定供粮、断路缺粮、补路自愈并刷新恢复", async ({
  page,
}) => {
  test.setTimeout(35_000);
  const canvas = page.getByTestId("game-canvas");

  await buildAt(page, "住宅", { x: 1, y: 14 });
  await buildAt(page, "水井", { x: 0, y: 14 });
  await buildAt(page, "市场", { x: 4, y: 14 });
  await buildAt(page, "农场", { x: 1, y: 18 });
  await buildAt(page, "粮仓", { x: 4, y: 18 });
  await page.getByRole("button", { name: "道路" }).click();
  const roads = [
    { x: 0, y: 15 },
    { x: 0, y: 16 },
    { x: 1, y: 16 },
    { x: 2, y: 16 },
    { x: 3, y: 16 },
    { x: 4, y: 16 },
    { x: 4, y: 17 },
    { x: 3, y: 17 },
    { x: 3, y: 18 },
  ];
  for (const [index, tile] of roads.entries()) {
    await moveSelection(page, tile);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("road-count")).toHaveText(String(index + 1));
  }

  await expect(page.getByTestId("population-count")).toHaveText("10", {
    timeout: 8_000,
  });
  await expect(page.getByTestId("food-supply-status")).toHaveText("供粮 1/1");

  await page.getByRole("button", { name: "拆除" }).click();
  await moveSelection(page, { x: 4, y: 16 });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("road-count")).toHaveText("8");
  await expect(page.getByTestId("food-supply-status")).toHaveText("缺粮 1 户", {
    timeout: 5_500,
  });
  await expect(page.getByTestId("population-count")).toHaveText("5");

  await page.getByRole("button", { name: "道路" }).click();
  await canvas.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("road-count")).toHaveText("9");
  await expect(page.getByTestId("food-supply-status")).toHaveText("供粮 1/1", {
    timeout: 2_500,
  });
  await expect(page.getByTestId("population-count")).toHaveText("10");
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  await expect
    .poll(() => readSavedSupply(page))
    .toMatchObject({
      version: 6,
      markets: 1,
      residents: 10,
    });
  const saved = await readSavedSupply(page);
  expect(saved.reserve).toBeGreaterThan(0);

  await page.reload();

  await expect(page.getByTestId("market-count")).toHaveText("1");
  await expect(page.getByTestId("farm-count")).toHaveText("1");
  await expect(page.getByTestId("granary-count")).toHaveText("1");
  await expect(page.getByTestId("road-count")).toHaveText("9");
  await expect(page.getByTestId("population-count")).toHaveText("10");
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await page.screenshot({ path: "/tmp/empire-sixth-final.png" });
});

async function moveSelection(page: Page, target: { x: number; y: number }) {
  const canvas = page.getByTestId("game-canvas");
  await canvas.focus();
  const selectedTile = selectedTiles.get(page) ?? { x: 16, y: 16 };
  const horizontalKey = target.x < selectedTile.x ? "ArrowLeft" : "ArrowRight";
  const verticalKey = target.y < selectedTile.y ? "ArrowUp" : "ArrowDown";
  for (let x = 0; x < Math.abs(target.x - selectedTile.x); x += 1) {
    await page.keyboard.press(horizontalKey, { delay: 5 });
  }
  for (let y = 0; y < Math.abs(target.y - selectedTile.y); y += 1) {
    await page.keyboard.press(verticalKey, { delay: 5 });
  }
  selectedTiles.set(page, target);
  await expect(page.getByTestId("keyboard-tile")).toHaveText(
    `键盘选中地格 ${target.x},${target.y}`,
  );
}

async function buildAt(
  page: Page,
  tool: "住宅" | "水井" | "市场" | "农场" | "粮仓",
  tile: { x: number; y: number },
) {
  await page.getByRole("button", { name: tool }).click();
  await expect(page.getByRole("button", { name: tool })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await moveSelection(page, tile);
  await page.keyboard.press("Enter");
}

async function readSavedSupply(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("empire-game");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<{
      version: number;
      markets: number;
      residents: number;
      reserve: number;
    }>((resolve, reject) => {
      const transaction = database.transaction("saves", "readonly");
      const request = transaction.objectStore("saves").get("autosave");
      transaction.oncomplete = () => {
        const envelope = request.result.envelope;
        const household = envelope.world.households[0];
        database.close();
        resolve({
          version: envelope.saveFormatVersion,
          markets: envelope.world.buildings.filter(
            (building: { typeId: string }) => building.typeId === "market",
          ).length,
          residents: household.residents,
          reserve: household.foodReserveTicks,
        });
      };
      transaction.onerror = () => reject(transaction.error);
    });
  });
}
