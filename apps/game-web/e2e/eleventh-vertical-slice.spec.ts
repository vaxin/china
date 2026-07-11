import { expect, test, type Page } from "@playwright/test";

test("N-IND-01～02 麻田、织坊、市场形成守恒产业链并恢复存档", async ({
  page,
}) => {
  test.setTimeout(25_000);
  const assets = new Set<string>();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    const pathname = new URL(response.url()).pathname;
    if (pathname.startsWith("/assets/runtime/v3/industry/")) {
      expect([200, 304]).toContain(response.status());
      assets.add(pathname);
    }
  });
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  let selected = { x: 16, y: 16 };

  for (const [tool, tile] of [
    ["麻田", { x: 1, y: 11 }],
    ["织坊", { x: 1, y: 14 }],
    ["市场", { x: 1, y: 17 }],
  ] as const) {
    await page.getByRole("button", { name: tool }).click();
    selected = await moveSelection(page, selected, tile);
    await page.keyboard.press("Enter");
  }
  await page.getByRole("button", { name: "道路" }).click();
  for (let y = 12; y <= 17; y += 1) {
    selected = await moveSelection(page, selected, { x: 0, y });
    await page.keyboard.press("Enter");
  }

  await expect(page.getByTestId("hemp-farm-count")).toHaveText("1");
  await expect(page.getByTestId("weaver-count")).toHaveText("1");
  await expect(page.getByTestId("clothing-count")).toHaveText("1", {
    timeout: 11_000,
  });
  expect(assets).toContain("/assets/runtime/v3/industry/hemp-farm.png");
  expect(assets).toContain("/assets/runtime/v3/industry/weaver.png");
  await page.keyboard.press("KeyE");
  await expect(page.getByTestId("camera-state")).toHaveText("方位 0°");
  await page.screenshot({ path: "/tmp/empire-eleventh-hemp-industry.png" });
  expect(errors).toEqual([]);
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  await page.reload();
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await expect(page.getByTestId("hemp-farm-count")).toHaveText("1");
  await expect(page.getByTestId("weaver-count")).toHaveText("1");
  await expect(page.getByTestId("clothing-count")).toHaveText("1");
  expect(errors).toEqual([]);
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
