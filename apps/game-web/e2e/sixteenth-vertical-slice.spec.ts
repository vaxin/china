import { expect, test, type Page } from "@playwright/test";

test("N-DIP-01 两份赠礼由使者延迟送达，达到门槛才通商", async ({ page }) => {
  test.setTimeout(22_000);
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  let selected = { x: 16, y: 16 };

  await page.getByRole("button", { name: "农场" }).click();
  for (const tile of [
    { x: 1, y: 11 },
    { x: 4, y: 11 },
  ]) {
    selected = await moveSelection(page, selected, tile);
    await page.keyboard.press("Enter");
  }
  await page.getByRole("button", { name: "粮仓" }).click();
  selected = await moveSelection(page, selected, { x: 1, y: 14 });
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "道路" }).click();
  for (let x = 1; x <= 4; x += 1) {
    selected = await moveSelection(page, selected, { x, y: 13 });
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("granary-food-count")).toHaveText("2", {
    timeout: 9_000,
  });

  await page.getByTestId("send-gift").click();
  await expect(page.getByTestId("envoy-count")).toHaveText("使者 1");
  await expect(page.getByTestId("diplomacy-status")).toHaveText(
    "关系 0 · 未通商",
  );
  await page.getByTestId("send-gift").click();
  await expect(page.getByTestId("envoy-count")).toHaveText("使者 2");
  await expect(page.getByTestId("granary-food-count")).toHaveText("0");

  await expect(page.getByTestId("diplomacy-status")).toHaveText(
    "关系 50 · 已通商",
    { timeout: 5_000 },
  );
  await expect(page.getByTestId("envoy-count")).toHaveText("使者 0");
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  await page.reload();
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await expect(page.getByTestId("diplomacy-status")).toHaveText(
    "关系 50 · 已通商",
  );
  await expect(page.getByTestId("envoy-count")).toHaveText("使者 0");
});

async function moveSelection(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const canvas = page.getByTestId("game-canvas");
  await canvas.focus();
  const horizontal = to.x < from.x ? "ArrowLeft" : "ArrowRight";
  const vertical = to.y < from.y ? "ArrowUp" : "ArrowDown";
  for (let index = 0; index < Math.abs(to.x - from.x); index += 1) {
    await page.keyboard.press(horizontal);
  }
  for (let index = 0; index < Math.abs(to.y - from.y); index += 1) {
    await page.keyboard.press(vertical);
  }
  await expect(page.getByTestId("keyboard-tile")).toHaveText(
    `键盘选中地格 ${to.x},${to.y}`,
  );
  return to;
}
