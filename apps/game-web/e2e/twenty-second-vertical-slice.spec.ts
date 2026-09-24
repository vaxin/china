import { expect, test } from "@playwright/test";

test("UX-TIME-01 暂停冻结权威 tick，4× 每 2.5 秒推进一个月", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");

  await page.getByTestId("speed-0").click();
  await expect(page.getByTestId("speed-0")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const pausedAt = tickValue(
    await page.getByTestId("simulation-tick").innerText(),
  );
  await page.waitForTimeout(1_300);
  expect(tickValue(await page.getByTestId("simulation-tick").innerText())).toBe(
    pausedAt,
  );

  await page.getByTestId("speed-4").click();
  await expect(page.getByTestId("feedback")).toHaveText("模拟速度已设为 4×");
  await expect
    .poll(
      async () =>
        tickValue(await page.getByTestId("simulation-tick").innerText()) -
        pausedAt,
      { timeout: 4_000 },
    )
    .toBeGreaterThanOrEqual(1);
});

function tickValue(label: string) {
  return Number(label.replace("tick ", ""));
}
