import { expect, test, type Page } from "@playwright/test";

test("N-LAB-01～03 工资与行业优先级改变真实分工并随存档恢复", async ({
  page,
}) => {
  test.setTimeout(25_000);
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  let selected = { x: 16, y: 16 };

  for (const [tool, tile] of [
    ["住宅", { x: 1, y: 14 }],
    ["道路", { x: 0, y: 15 }],
    ["水井", { x: 4, y: 14 }],
    ["市场", { x: 6, y: 14 }],
    ["粮仓", { x: 9, y: 14 }],
  ] as const) {
    await page.getByRole("button", { name: tool }).click();
    selected = await moveSelection(page, selected, tile);
    await page.keyboard.press("Enter");
  }
  await page.getByRole("button", { name: "农场" }).click();
  await page.getByTestId("crop-cabbage").click();
  selected = await moveSelection(page, selected, { x: 12, y: 14 });
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("population-count")).toHaveText("5", {
    timeout: 8_000,
  });
  await page.waitForFunction(() => {
    const value = document.querySelector(
      '[data-testid="simulation-tick"]',
    )?.textContent;
    return Number(value?.replace("tick ", "")) >= 7;
  });
  await expect(page.getByTestId("labor-assignment")).toHaveText("2/5");
  await expect(page.getByTestId("labor-vacancies")).toHaveText("3");
  await expect(page.getByTestId("labor-payroll")).toHaveText("4");
  await expect(page.getByTestId("priority-commerce")).toHaveText("商 0/2");
  await expect(page.getByTestId("priority-services")).toHaveText("役 0/1");
  await expect(page.getByTestId("priority-agriculture")).toHaveText("农 2/2");

  await page.getByTestId("priority-services").click();
  await expect(page.getByTestId("priority-services")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("priority-services")).toHaveText("役 1/1");
  await expect(page.getByTestId("priority-agriculture")).toHaveText("农 1/2");
  await expect(page.getByTestId("priority-commerce")).toHaveText("商 0/2");

  await page.getByTestId("wage-low").click();
  await expect(page.getByTestId("wage-low")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("labor-assignment")).toHaveText("1/5");
  await expect(page.getByTestId("labor-vacancies")).toHaveText("4");
  await expect(page.getByTestId("labor-payroll")).toHaveText("1");
  await expect(page.getByTestId("priority-commerce")).toHaveText("商 0/2");
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  await page.reload();
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await expect(page.getByTestId("wage-low")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("priority-services")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("labor-assignment")).toHaveText("1/5");
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
