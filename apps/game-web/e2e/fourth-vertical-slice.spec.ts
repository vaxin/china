import { expect, test, type Page } from "@playwright/test";

import { findTilePosition } from "./tile-locator";

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

test("S4-01、S4-05～S4-08 建井升级、拆井降级，补井后仍受口粮条件约束", async ({
  page,
}) => {
  test.setTimeout(25_000);
  const canvas = page.getByTestId("game-canvas");
  const housePosition = await findTilePosition(page, { x: 1, y: 14 });
  const gatePosition = await findTilePosition(page, { x: 0, y: 15 });
  const wellPosition = await findTilePosition(page, { x: 0, y: 14 });

  await page.getByRole("button", { name: "住宅" }).click();
  await canvas.click({ position: housePosition });
  await page.getByRole("button", { name: "道路" }).click();
  await canvas.click({ position: gatePosition });
  await expect(page.getByTestId("population-count")).toHaveText("5", {
    timeout: 7_000,
  });

  await page.getByRole("button", { name: "水井" }).click();
  await canvas.click({ position: wellPosition });
  await expect(page.getByTestId("well-count")).toHaveText("1");
  await expect(page.getByTestId("feedback")).toHaveText("水井建造完成");
  await expect(page.getByTestId("population-count")).toHaveText("10", {
    timeout: 2_500,
  });
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  await page.getByRole("button", { name: "拆除" }).click();
  await canvas.click({ position: wellPosition });
  await expect(page.getByTestId("well-count")).toHaveText("0");
  await expect(page.getByTestId("population-count")).toHaveText("5");
  await expect(page.getByTestId("feedback")).toHaveText("水井已拆除");

  await page.getByRole("button", { name: "水井" }).click();
  await canvas.click({ position: wellPosition });
  await expect(page.getByTestId("well-count")).toHaveText("1");
  await expect(page.getByTestId("population-count")).toHaveText("5");
  await expect(page.getByTestId("food-supply-status")).toHaveText("缺粮 1 户", {
    timeout: 4_500,
  });
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  const savedState = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("empire-game");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return await new Promise<{
      saveFormatVersion: number;
      houseLevel: number;
      residents: number;
    }>((resolve, reject) => {
      const transaction = database.transaction("saves", "readonly");
      const request = transaction.objectStore("saves").get("autosave");
      transaction.oncomplete = () => {
        const envelope = request.result.envelope;
        const house = envelope.world.buildings.find(
          (building: { typeId: string }) => building.typeId === "house",
        );
        database.close();
        resolve({
          saveFormatVersion: envelope.saveFormatVersion,
          houseLevel: house.level,
          residents: envelope.world.households[0].residents,
        });
      };
      transaction.onerror = () => reject(transaction.error);
    });
  });
  expect(savedState).toEqual({
    saveFormatVersion: 6,
    houseLevel: 1,
    residents: 5,
  });

  await page.reload();

  await expect(page.getByTestId("building-count")).toHaveText("1");
  await expect(page.getByTestId("well-count")).toHaveText("1");
  await expect(page.getByTestId("population-count")).toHaveText("5");
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
});
