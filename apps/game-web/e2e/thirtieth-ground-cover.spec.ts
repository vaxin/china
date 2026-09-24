import { expect, test, type Page } from "@playwright/test";

test("COVER-01～05 郊区植被阻挡营造并可清理", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  const canvas = page.getByTestId("game-canvas");
  await settleWebGl(page);
  await canvas.screenshot({
    path: "/tmp/empire-ground-cover-before-clear.png",
  });

  await page.getByRole("button", { name: "道路" }).click();
  await canvas.focus();
  for (let index = 0; index < 19; index += 1) {
    await page.keyboard.press("ArrowLeft");
  }
  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press("ArrowDown");
  }
  await expect(page.getByTestId("keyboard-tile")).toHaveText(
    "键盘选中地格 -3,21",
  );
  await expect(page.getByTestId("placement-status")).toHaveText("vegetation");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("feedback")).toHaveText(
    "杂草植被阻挡营造，请先使用拆除工具清理",
  );
  await expect(page.getByTestId("road-count")).toHaveText("0");

  await page.getByRole("button", { name: "城务" }).click();
  await page.getByRole("button", { name: "拆除" }).click();
  await canvas.focus();
  await expect(page.getByTestId("placement-status")).toHaveText("valid");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("feedback")).toHaveText("植被已清理");
  await expect(page.getByTestId("save-status")).toHaveText("已保存");
  await page.getByRole("button", { name: "拆除" }).click();
  await settleWebGl(page);
  await canvas.screenshot({
    path: "/tmp/empire-ground-cover-cleared-dirt.png",
  });

  await page.getByRole("button", { name: "民生" }).click();
  await page.getByRole("button", { name: "道路" }).click();
  await canvas.focus();
  await expect(page.getByTestId("placement-status")).toHaveText("valid");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("road-count")).toHaveText("1");
  await page.getByRole("button", { name: "道路" }).click();
  await settleWebGl(page);
  await canvas.screenshot({ path: "/tmp/empire-ground-cover-after-clear.png" });
  await canvas.hover({ position: { x: 460, y: 320 } });
  await page.mouse.wheel(0, -2400);
  await settleWebGl(page);
  await canvas.screenshot({ path: "/tmp/empire-ground-cover-panorama.png" });
  expect(errors).toEqual([]);
});

async function settleWebGl(page: Page) {
  await page.waitForTimeout(600);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            document.querySelector("canvas")?.getContext("webgl2")?.finish();
            resolve();
          }),
        );
      }),
  );
}
