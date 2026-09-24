import { expect, test, type Page } from "@playwright/test";

import { findTilePosition } from "./tile-locator";

async function buildAt(
  page: Page,
  tool: "城墙" | "道路" | "拆除",
  tile: { x: number; y: number },
) {
  const toolButton = page.getByRole("button", { name: tool });
  if ((await toolButton.getAttribute("aria-pressed")) !== "true") {
    await toolButton.click();
  }
  const position = await findTilePosition(page, tile);
  await page.getByTestId("game-canvas").click({ position });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
});

test("WALL-01、02、09 城墙接入城门、保留门洞道路并随刷新恢复", async ({
  page,
}) => {
  await page.getByRole("button", { name: "城务" }).click();
  await buildAt(page, "城墙", { x: 0, y: 14 });
  await expect(page.getByTestId("wall-count")).toHaveText("1");
  await buildAt(page, "城墙", { x: 0, y: 16 });
  await expect(page.getByTestId("wall-count")).toHaveText("2");
  await expect(page.getByTestId("feedback")).toHaveText("城墙修筑完成");

  await page.getByRole("button", { name: "民生" }).click();
  await buildAt(page, "道路", { x: 0, y: 15 });
  await expect(page.getByTestId("road-count")).toHaveText("1");
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  await page.reload();
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await expect(page.getByTestId("wall-count")).toHaveText("2");
  await expect(page.getByTestId("road-count")).toHaveText("1");
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
});

test("WALL-05、06 墙路互斥且拆墙后可恢复", async ({ page }) => {
  await page.getByRole("button", { name: "城务" }).click();
  await buildAt(page, "城墙", { x: 6, y: 16 });
  await expect(page.getByTestId("wall-count")).toHaveText("1");

  await page.getByRole("button", { name: "民生" }).click();
  await page.getByRole("button", { name: "道路" }).click();
  const wallPosition = await findTilePosition(page, { x: 6, y: 16 });
  await page.getByTestId("game-canvas").hover({ position: wallPosition });
  await expect(page.getByTestId("placement-status")).toHaveText("occupied");
  await page.getByTestId("game-canvas").click({ position: wallPosition });
  await expect(page.getByTestId("road-count")).toHaveText("0");

  await page.getByRole("button", { name: "城务" }).click();
  await buildAt(page, "拆除", { x: 6, y: 16 });
  await expect(page.getByTestId("wall-count")).toHaveText("0");
  await expect(page.getByTestId("feedback")).toHaveText("城墙已拆除");
});

test("WALL-07、08 城门不可封堵且键盘可连续修墙", async ({ page }) => {
  await page.getByRole("button", { name: "城务" }).click();
  await page.getByRole("button", { name: "城墙" }).click();
  const canvas = page.getByTestId("game-canvas");
  await canvas.focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("wall-count")).toHaveText("1");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(page.getByTestId("wall-count")).toHaveText("2");

  const gatePosition = await findTilePosition(page, { x: 0, y: 15 });
  await canvas.hover({ position: gatePosition });
  await expect(page.getByTestId("placement-status")).toHaveText("occupied");
  await canvas.click({ position: gatePosition });
  await expect(page.getByTestId("wall-count")).toHaveText("2");
});

test("WALL-13 城门南北直墙沿同一屏幕轴连续延伸", async ({ page }) => {
  await page.getByRole("button", { name: "城务" }).click();
  for (const y of [11, 12, 13, 14, 16, 17, 18, 19]) {
    await buildAt(page, "城墙", { x: 0, y });
  }

  await expect(page.getByTestId("wall-count")).toHaveText("8");
  await page.getByTestId("game-canvas").screenshot({
    path: "/tmp/empire-wall-direction-fixed.png",
  });
});

test("WALL-14 闭合城墙的四个拐角朝向墙体内部连接", async ({ page }) => {
  test.setTimeout(60_000);
  await page.getByRole("button", { name: "城务" }).click();
  const perimeter = [
    ...Array.from({ length: 8 }, (_, index) => ({ x: 3 + index, y: 11 })),
    ...Array.from({ length: 8 }, (_, index) => ({ x: 3 + index, y: 17 })),
    ...Array.from({ length: 5 }, (_, index) => ({ x: 3, y: 12 + index })),
    ...Array.from({ length: 5 }, (_, index) => ({ x: 10, y: 12 + index })),
  ];
  for (const tile of perimeter) await buildAt(page, "城墙", tile);

  await expect(page.getByTestId("wall-count")).toHaveText("26");
  await page.getByTestId("game-canvas").screenshot({
    path: "/tmp/empire-wall-corners-fixed.png",
  });
});

test("WALL-02、15 四种 T 形与十字形共用同一连接中心", async ({ page }) => {
  test.setTimeout(90_000);
  await page.getByRole("button", { name: "城务" }).click();
  const junctions = [
    // 缺 W / S / E / N 的四种 T 形。
    [
      { x: 3, y: 11 },
      { x: 3, y: 10 },
      { x: 4, y: 11 },
      { x: 3, y: 12 },
    ],
    [
      { x: 8, y: 11 },
      { x: 8, y: 10 },
      { x: 9, y: 11 },
      { x: 7, y: 11 },
    ],
    [
      { x: 3, y: 17 },
      { x: 3, y: 16 },
      { x: 3, y: 18 },
      { x: 2, y: 17 },
    ],
    [
      { x: 8, y: 17 },
      { x: 9, y: 17 },
      { x: 8, y: 18 },
      { x: 7, y: 17 },
    ],
    // 十字形。
    [
      { x: 13, y: 14 },
      { x: 13, y: 13 },
      { x: 14, y: 14 },
      { x: 13, y: 15 },
      { x: 12, y: 14 },
    ],
  ];
  for (const tile of junctions.flat()) await buildAt(page, "城墙", tile);

  await expect(page.getByTestId("wall-count")).toHaveText("21");
  await page.getByTestId("game-canvas").screenshot({
    path: "/tmp/empire-wall-junctions.png",
  });
});

test("WALL-12 墙体素材失败时游戏仍可营造和拆除", async ({ page }) => {
  const pageErrors: string[] = [];
  const assetErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      message.text().includes("wall-autotiles-4x4.png")
    ) {
      assetErrors.push(message.text());
    }
  });
  await page.route("**/wall-autotiles-4x4.png", (route) => route.abort());
  await page.reload();
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");

  await page.getByRole("button", { name: "城务" }).click();
  await buildAt(page, "城墙", { x: 6, y: 16 });
  await expect(page.getByTestId("wall-count")).toHaveText("1");
  await buildAt(page, "拆除", { x: 6, y: 16 });
  await expect(page.getByTestId("wall-count")).toHaveText("0");
  await expect.poll(() => assetErrors.length).toBeGreaterThan(0);
  expect(pageErrors).toEqual([]);
});
