import { expect, test, type Page } from "@playwright/test";

test("N-ENT-01 乐师沿学校到市场的真实路线服务沿途住宅", async ({ page }) => {
  test.setTimeout(30_000);
  const entertainmentAssets = new Set<string>();
  page.on("response", (response) => {
    const pathname = new URL(response.url()).pathname;
    if (pathname.startsWith("/assets/runtime/v3/entertainment/")) {
      expect([200, 304]).toContain(response.status());
      entertainmentAssets.add(pathname);
    }
  });

  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  let selected = { x: 16, y: 16 };
  for (const [tool, tile] of [
    ["住宅", { x: 4, y: 13 }],
    ["音乐学校", { x: 1, y: 16 }],
    ["市场", { x: 7, y: 16 }],
  ] as const) {
    await page.getByRole("button", { name: tool }).click();
    selected = await moveSelection(page, selected, tile);
    await page.keyboard.press("Enter");
  }
  await page.getByRole("button", { name: "道路" }).click();
  for (let x = 0; x <= 9; x += 1) {
    selected = await moveSelection(page, selected, { x, y: 15 });
    await page.keyboard.press("Enter");
  }

  await expect(page.getByTestId("population-count")).toHaveText("5", {
    timeout: 10_000,
  });
  await expect(page.getByTestId("entertainment-service")).toHaveText("1/1", {
    timeout: 12_000,
  });
  expect(entertainmentAssets).toContain(
    "/assets/runtime/v3/entertainment/music-school.png",
  );
  await page.screenshot({ path: "/tmp/empire-music-walker.png" });

  await page.getByRole("button", { name: "拆除" }).click();
  selected = await moveSelection(page, selected, { x: 5, y: 15 });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("entertainment-service")).toHaveText("0/1", {
    timeout: 5_000,
  });
  await expect(page.getByTestId("performer-count")).toHaveText("0");
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  await page.reload();
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await expect(page.getByTestId("music-school-count")).toHaveText("1");
  await expect(page.getByTestId("entertainment-service")).toHaveText("0/1");
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
