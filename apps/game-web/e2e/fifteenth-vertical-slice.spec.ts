import { expect, test, type Page } from "@playwright/test";

test("N-REL-01 神农供奉真实扣粮、提升好感并保存", async ({ page }) => {
  test.setTimeout(18_000);
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  let selected = { x: 16, y: 16 };
  for (const [tool, tile] of [
    ["农场", { x: 1, y: 14 }],
    ["粮仓", { x: 1, y: 17 }],
  ] as const) {
    await page.getByRole("button", { name: tool }).click();
    selected = await moveSelection(page, selected, tile);
    await page.keyboard.press("Enter");
  }
  await page.getByRole("button", { name: "道路" }).click();
  for (let y = 15; y <= 17; y += 1) {
    selected = await moveSelection(page, selected, { x: 0, y });
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("granary-food-count")).toHaveText("1", {
    timeout: 8_000,
  });
  await expect(page.getByTestId("make-offering")).toHaveText("供奉小麦");
  await expect(page.getByTestId("shennong-favor")).toHaveText("神农 0/3");

  await page.getByTestId("make-offering").click();
  await expect(page.getByTestId("granary-food-count")).toHaveText("0");
  await expect(page.getByTestId("shennong-favor")).toHaveText("神农 1/3");
  await expect(page.getByTestId("feedback")).toHaveText("已向神农供奉一份小麦");
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  await page.reload();
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await expect(page.getByTestId("shennong-favor")).toHaveText("神农 1/3");
  await expect(page.getByTestId("granary-food-count")).toHaveText("0");
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
