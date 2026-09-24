import { expect, test } from "@playwright/test";

test("LAB-L1-01 实验页独立运行、拒绝透支并确定性重放", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/lab");
  await expect(
    page.getByRole("heading", { name: "可编程物理实验室" }),
  ).toBeVisible();
  await expect(
    page.getByTestId("lab-object-list").getByRole("button"),
  ).toHaveCount(2);
  await expect(page.getByTestId("lab-reserve-matter")).toHaveText("160");
  await expect(page.getByTestId("lab-reserve-energy")).toHaveText("84");
  await expect(page.getByTestId("lab-tick")).toHaveText("0");

  await page.getByRole("button", { name: "单步" }).click();
  await expect(page.getByTestId("lab-tick")).toHaveText("1");

  await page.getByRole("button", { name: /制造箱体/ }).click();
  await expect(
    page.getByTestId("lab-object-list").getByRole("button"),
  ).toHaveCount(3);
  await expect(page.getByTestId("lab-reserve-matter")).toHaveText("148");
  await expect(page.getByTestId("lab-reserve-energy")).toHaveText("82");

  const hashBeforeRejection = await page
    .getByTestId("lab-state-hash")
    .textContent();
  await page.getByTestId("lab-overdraft").click();
  await expect(page.getByTestId("lab-event-track")).toContainText(
    "拒绝 · 能量不足",
  );
  await expect(page.getByTestId("lab-state-hash")).toHaveText(
    hashBeforeRejection ?? "",
  );

  await page.getByTestId("lab-replay").click();
  await page.getByRole("tab", { name: "内核" }).click();
  await expect(page.getByTestId("lab-replay-report")).toContainText(
    "重放完全一致",
  );

  await page.getByTestId("lab-run-toggle").click();
  await expect
    .poll(async () => Number(await page.getByTestId("lab-tick").innerText()))
    .toBeGreaterThan(1);
  await page.getByTestId("lab-run-toggle").click();
  const pausedAt = await page.getByTestId("lab-tick").innerText();
  await page.waitForTimeout(800);
  await expect(page.getByTestId("lab-tick")).toHaveText(pausedAt);
  expect(errors).toEqual([]);
});

test("LAB-L0-02 城市入口与实验页按路径隔离", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await expect(
    page.getByRole("heading", { name: "可编程物理实验室" }),
  ).toHaveCount(0);
});
