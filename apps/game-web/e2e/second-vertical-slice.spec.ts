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

test("S2-01 单格道路可铺设、显示并自动保存", async ({ page }) => {
  await expect(page.getByTestId("road-count")).toHaveText("0");
  await expect(page.getByTestId("population-count")).toHaveText("0");
  await page.getByRole("button", { name: "道路" }).click();
  const canvas = page.getByTestId("game-canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const visualClip = {
    x: box!.x + box!.width / 2 - 50,
    y: box!.y + box!.height / 2 - 50,
    width: 100,
    height: 100,
  };
  const beforeRoad = await page.screenshot({ clip: visualClip });

  await canvas.click({ position: { x: box!.width / 2, y: box!.height / 2 } });

  await expect(page.getByTestId("road-count")).toHaveText("1");
  await expect(page.getByTestId("feedback")).toHaveText("道路铺设完成");
  await expect(page.getByTestId("save-status")).toHaveText("已保存");
  await page.getByRole("button", { name: "道路" }).click();
  const afterRoad = await page.screenshot({ clip: visualClip });
  expect(afterRoad.equals(beforeRoad)).toBe(false);
});

test("S2-01 窄桌面仍显示住宅、道路、人口和 tick", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 700 });

  await expect(page.getByTestId("building-count")).toBeVisible();
  await expect(page.getByTestId("road-count")).toBeVisible();
  await expect(page.getByTestId("population-count")).toBeVisible();
  await expect(page.getByTestId("simulation-tick")).toBeVisible();
});

test("S2-03 道路不能覆盖住宅", async ({ page }) => {
  const canvas = page.getByTestId("game-canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const point = { x: box!.width / 2, y: box!.height / 2 };
  await page.getByRole("button", { name: "住宅" }).click();
  await canvas.click({ position: point });
  await expect(page.getByTestId("building-count")).toHaveText("1");

  await page.getByRole("button", { name: "道路" }).click();
  await canvas.hover({ position: point });
  await expect(page.getByTestId("placement-status")).toHaveText("occupied");
  await canvas.click({ position: point });

  await expect(page.getByTestId("road-count")).toHaveText("0");
  await expect(page.getByTestId("feedback")).toHaveText("该位置已被占用");
});

test("S2-05 与 S2-07 城门道路使住宅入住并在刷新后恢复", async ({ page }) => {
  const canvas = page.getByTestId("game-canvas");
  const housePosition = await findTilePosition(page, { x: 1, y: 14 });
  await page.getByRole("button", { name: "住宅" }).click();
  await canvas.click({ position: housePosition });
  await expect(page.getByTestId("building-count")).toHaveText("1");
  await expect(page.getByTestId("population-count")).toHaveText("0");

  const gatePosition = await findTilePosition(page, { x: 0, y: 15 });
  await page.getByRole("button", { name: "道路" }).click();
  await canvas.click({ position: gatePosition });

  await expect(page.getByTestId("road-count")).toHaveText("1");
  await expect(page.getByTestId("population-count")).toHaveText("5", {
    timeout: 7_000,
  });
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  await page.reload();

  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await expect(page.getByTestId("building-count")).toHaveText("1");
  await expect(page.getByTestId("road-count")).toHaveText("1");
  await expect(page.getByTestId("population-count")).toHaveText("5");
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
});
