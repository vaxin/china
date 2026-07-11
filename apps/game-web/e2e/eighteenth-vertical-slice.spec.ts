import { expect, test, type Page } from "@playwright/test";

test("N-GOV-01 税务署沿路征税、工资入账并保存国库", async ({ page }) => {
  test.setTimeout(20_000);
  const governmentAssets = new Set<string>();
  page.on("response", (response) => {
    const pathname = new URL(response.url()).pathname;
    if (pathname.startsWith("/assets/runtime/v3/government/")) {
      expect([200, 304]).toContain(response.status());
      governmentAssets.add(pathname);
    }
  });

  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  let selected = { x: 16, y: 16 };

  for (const [tool, tile] of [
    ["住宅", { x: 1, y: 14 }],
    ["税务署", { x: 1, y: 18 }],
  ] as const) {
    await page.getByRole("button", { name: tool }).click();
    selected = await moveSelection(page, selected, tile);
    await page.keyboard.press("Enter");
  }
  await page.getByRole("button", { name: "道路" }).click();
  for (let y = 15; y <= 19; y += 1) {
    selected = await moveSelection(page, selected, { x: 0, y });
    await page.keyboard.press("Enter");
  }
  await page.getByTestId("tax-rate-high").click();

  await expect(page.getByTestId("population-count")).toHaveText("5", {
    timeout: 8_000,
  });
  await expect(page.getByTestId("tax-revenue")).toHaveText("+3", {
    timeout: 5_000,
  });
  await expect(page.getByTestId("tax-summary")).toContainText("征 1 户");
  await expect(page.getByTestId("tax-summary")).toContainText("薪 -4");
  await expect(page.getByTestId("sentiment-reasons")).toContainText("重税 -2");
  await expect
    .poll(async () =>
      Number(await page.getByTestId("city-sentiment").innerText()),
    )
    .toBeLessThan(50);
  await expect(page.getByTestId("treasury")).not.toHaveText("500");
  expect(governmentAssets).toContain(
    "/assets/runtime/v3/government/tax-office.png",
  );
  await page.screenshot({ path: "/tmp/empire-tax-office.png" });
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  const savedTreasury = await page.getByTestId("treasury").innerText();
  await page.reload();
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await expect(page.getByTestId("tax-rate-high")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect
    .poll(async () => Number(await page.getByTestId("treasury").innerText()))
    .toBeLessThanOrEqual(Number(savedTreasury));
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
