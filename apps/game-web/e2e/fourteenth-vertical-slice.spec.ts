import { expect, test, type Page } from "@playwright/test";

test("N-COM-01 粮仓拒收品类会阻断运输，恢复接收后下一 tick 自愈", async ({
  page,
}) => {
  test.setTimeout(22_000);
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  let selected = { x: 16, y: 16 };

  await page.getByRole("button", { name: "农场" }).click();
  await page.getByTestId("crop-wheat").click();
  selected = await moveSelection(page, selected, { x: 1, y: 11 });
  await page.keyboard.press("Enter");
  await page.getByTestId("crop-rice").click();
  selected = await moveSelection(page, selected, { x: 4, y: 11 });
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "粮仓" }).click();
  selected = await moveSelection(page, selected, { x: 1, y: 14 });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("granary-accept-rice")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByTestId("granary-accept-rice").click();
  await expect(page.getByTestId("granary-accept-rice")).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await page.getByRole("button", { name: "道路" }).click();
  for (let x = 1; x <= 4; x += 1) {
    selected = await moveSelection(page, selected, { x, y: 13 });
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("simulation-tick")).toHaveText("tick 9", {
    timeout: 11_000,
  });
  await expect(page.getByTestId("granary-food-count")).toHaveText("1");

  await page.getByTestId("granary-accept-rice").click();
  await expect(page.getByTestId("granary-accept-rice")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("granary-food-count")).toHaveText("2", {
    timeout: 2_500,
  });
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  await page.reload();
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await expect(page.getByTestId("granary-food-count")).toHaveText("2");
  await expect(page.getByTestId("granary-accept-rice")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
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
