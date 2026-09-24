import { expect, test, type Page } from "@playwright/test";

test("LAND-01～09 道路可跨坡且建筑仍明确拒绝坡地", async ({ page }) => {
  const errors: string[] = [];
  const terrainMessages: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
    if (message.type() === "info" && message.text().startsWith("[terrain]")) {
      terrainMessages.push(message.text());
    }
  });

  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await expect
    .poll(() =>
      terrainMessages.some((message) =>
        /^\[terrain\] 郊野台地已就绪：\d+ 顶面三角，\d+ 土坡三角$/.test(
          message,
        ),
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .some((entry) => entry.name.includes("loess-slope-face-v2.png")),
      ),
    )
    .toBe(true);
  await settleWebGl(page);
  const canvas = page.getByTestId("game-canvas");
  await canvas.screenshot({
    path: "/tmp/empire-suburban-highlands-default.png",
  });

  await page.getByRole("button", { name: "道路" }).click();
  await canvas.focus();
  await settleWebGl(page);
  await canvas.screenshot({ path: "/tmp/empire-grid-build-mode.png" });
  for (let index = 0; index < 16; index += 1) {
    await page.keyboard.press("ArrowLeft");
  }
  await page.keyboard.press("ArrowUp");
  await expect(page.getByTestId("keyboard-tile")).toHaveText(
    "键盘选中地格 0,15",
  );
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("road-count")).toHaveText("1");

  for (let index = 0; index < 20; index += 1) {
    await page.keyboard.press("ArrowLeft");
  }
  await expect(page.getByTestId("keyboard-tile")).toHaveText(
    "键盘选中地格 -20,15",
  );
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("road-count")).toHaveText("2");
  await expect(page.getByTestId("save-status")).toHaveText("已保存");
  await page.reload();
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await expect(page.getByTestId("road-count")).toHaveText("2");
  await canvas.focus();

  for (let index = 0; index < 21; index += 1) {
    await page.keyboard.press("ArrowLeft");
  }
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("keyboard-tile")).toHaveText(
    "键盘选中地格 -5,17",
  );
  await page.getByRole("button", { name: "水井" }).click();
  await canvas.focus();
  await expect(page.getByTestId("placement-status")).toHaveText("steep-slope");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("feedback")).toHaveText(
    "坡地不可营造，请选择平坦土地",
  );
  await page.getByRole("button", { name: "道路" }).click();
  await canvas.focus();
  await expect(page.getByTestId("placement-status")).toHaveText("valid");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("road-count")).toHaveText("3");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("road-count")).toHaveText("5");
  await expect(page.getByTestId("save-status")).toHaveText("已保存");
  await page.keyboard.press("ArrowLeft");
  await page.getByRole("button", { name: "道路" }).click();

  await canvas.hover({ position: { x: 420, y: 360 } });
  await settleWebGl(page);
  await expect(page.getByTestId("hovered-tile")).not.toHaveText("—");
  expect(terrainMessages).toHaveLength(2);

  await canvas.screenshot({ path: "/tmp/empire-suburban-highlands.png" });
  expect(errors).toEqual([]);
});

async function settleWebGl(page: Page) {
  await page.waitForTimeout(600);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let frames = 0;
        const settle = () => {
          frames += 1;
          if (frames < 3) {
            requestAnimationFrame(settle);
            return;
          }
          document.querySelector("canvas")?.getContext("webgl2")?.finish();
          resolve();
        };
        requestAnimationFrame(settle);
      }),
  );
  await page.waitForTimeout(150);
}
