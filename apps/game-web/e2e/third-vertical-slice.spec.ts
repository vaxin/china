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

test("S3-01～S3-06 拆路迁出、空地拒绝、补路自愈并刷新恢复", async ({
  page,
}) => {
  test.setTimeout(25_000);
  const canvas = page.getByTestId("game-canvas");
  const housePosition = await findTilePosition(page, { x: 1, y: 14 });
  await page.getByRole("button", { name: "住宅" }).click();
  await canvas.click({ position: housePosition });
  const gatePosition = await findTilePosition(page, { x: 0, y: 15 });
  await page.getByRole("button", { name: "道路" }).click();
  await canvas.click({ position: gatePosition });
  await expect(page.getByTestId("population-count")).toHaveText("5", {
    timeout: 7_000,
  });

  await page.getByRole("button", { name: "拆除" }).click();
  await canvas.click({ position: gatePosition });

  await expect(page.getByTestId("road-count")).toHaveText("0");
  await expect(page.getByTestId("population-count")).toHaveText("0");
  await expect(page.getByTestId("feedback")).toHaveText("道路已拆除");
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  await canvas.click({ position: gatePosition });
  await expect(page.getByTestId("feedback")).toHaveText("这里没有可拆除的对象");
  await expect(page.getByTestId("road-count")).toHaveText("0");

  await page.getByRole("button", { name: "道路" }).click();
  await canvas.click({ position: gatePosition });
  await expect(page.getByTestId("population-count")).toHaveText("5", {
    timeout: 2_500,
  });
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  await page.reload();

  await expect(page.getByTestId("building-count")).toHaveText("1");
  await expect(page.getByTestId("road-count")).toHaveText("1");
  await expect(page.getByTestId("population-count")).toHaveText("5");
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
});
