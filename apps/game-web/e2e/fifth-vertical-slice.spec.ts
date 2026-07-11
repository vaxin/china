import { expect, test, type Page } from "@playwright/test";

const runtimeErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
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
  "granary-food-count",
  "road-count",
  "population-count",
  "simulation-tick",
];

test("S5-01 默认桌面十项 HUD 全部位于视口内", async ({ page }) => {
  for (const testId of hudTestIds) {
    await expect(page.getByTestId(testId)).toBeInViewport();
  }
});

test("S5-01 窄桌面仍显示既有与粮食链 HUD", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 700 });

  for (const testId of hudTestIds) {
    await expect(page.getByTestId(testId)).toBeVisible();
    await expect(page.getByTestId(testId)).toBeInViewport();
  }
});

test("S5-01、S5-04、S5-07～S5-08 产粮入仓、断路停运、补路自愈并刷新恢复", async ({
  page,
}) => {
  test.setTimeout(40_000);
  const canvas = page.getByTestId("game-canvas");
  let selectedTile = { x: 16, y: 16 };
  const moveSelection = async (target: { x: number; y: number }) => {
    await canvas.focus();
    const horizontalKey =
      target.x < selectedTile.x ? "ArrowLeft" : "ArrowRight";
    const verticalKey = target.y < selectedTile.y ? "ArrowUp" : "ArrowDown";
    for (let x = 0; x < Math.abs(target.x - selectedTile.x); x += 1) {
      await page.keyboard.press(horizontalKey);
    }
    for (let y = 0; y < Math.abs(target.y - selectedTile.y); y += 1) {
      await page.keyboard.press(verticalKey);
    }
    selectedTile = target;
    await expect(page.getByTestId("keyboard-tile")).toHaveText(
      `键盘选中地格 ${target.x},${target.y}`,
    );
  };
  const beforeProductionBuildings = await canvas.screenshot();

  await page.getByRole("button", { name: "农场" }).click();
  await moveSelection({ x: 1, y: 14 });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("farm-count")).toHaveText("1");
  await expect(page.getByTestId("feedback")).toHaveText("农场建造完成");

  await page.getByRole("button", { name: "粮仓" }).click();
  await moveSelection({ x: 1, y: 17 });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("granary-count")).toHaveText("1");
  await expect(page.getByTestId("feedback")).toHaveText("粮仓建造完成");
  await page.getByRole("button", { name: "粮仓" }).click();
  const afterProductionBuildings = await canvas.screenshot();
  expect(afterProductionBuildings.equals(beforeProductionBuildings)).toBe(
    false,
  );

  await page.getByRole("button", { name: "道路" }).click();
  for (const [index, y] of [15, 16, 17].entries()) {
    await moveSelection({ x: 0, y });
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("road-count")).toHaveText(String(index + 1));
  }
  await expect(page.getByTestId("granary-food-count")).toHaveText("1", {
    timeout: 8_000,
  });

  await page.getByRole("button", { name: "拆除" }).click();
  await moveSelection({ x: 0, y: 16 });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("road-count")).toHaveText("2");
  await page.waitForFunction(() => {
    const value = document.querySelector(
      '[data-testid="simulation-tick"]',
    )?.textContent;
    return Number(value?.replace("tick ", "")) >= 18;
  });
  await expect(page.getByTestId("granary-food-count")).toHaveText("1");

  await expect
    .poll(() => readFoodStocks(page), { timeout: 2_500 })
    .toEqual({ farm: 1, granary: 1, version: 6 });

  await page.getByRole("button", { name: "道路" }).click();
  await canvas.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("granary-food-count")).toHaveText("2", {
    timeout: 2_500,
  });
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  await page.reload();

  await expect(page.getByTestId("farm-count")).toHaveText("1");
  await expect(page.getByTestId("granary-count")).toHaveText("1");
  await expect(page.getByTestId("granary-food-count")).toHaveText("2");
  await expect(page.getByTestId("road-count")).toHaveText("3");
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
});

async function readFoodStocks(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("empire-game");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<{ farm: number; granary: number; version: number }>(
      (resolve, reject) => {
        const transaction = database.transaction("saves", "readonly");
        const request = transaction.objectStore("saves").get("autosave");
        transaction.oncomplete = () => {
          const envelope = request.result.envelope;
          const farm = envelope.world.buildings.find(
            (building: { typeId: string }) => building.typeId === "farm",
          );
          const granary = envelope.world.buildings.find(
            (building: { typeId: string }) => building.typeId === "granary",
          );
          database.close();
          resolve({
            farm: farm.foodStock,
            granary: granary.foodStock,
            version: envelope.saveFormatVersion,
          });
        };
        transaction.onerror = () => reject(transaction.error);
      },
    );
  });
}
