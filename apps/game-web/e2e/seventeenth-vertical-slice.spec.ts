import { expect, test } from "@playwright/test";

test("N-AES-01 悬停地块分别解释五行风水与周边宜居度", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");

  await page.getByRole("button", { name: "水井" }).click();
  await page.getByTestId("game-canvas").focus();
  await expect(page.getByTestId("site-element")).toHaveText("地格 金");
  await expect(page.getByTestId("site-feng-shui")).toHaveText(
    "风水 相生 · 金生水，地气相生",
  );
  await expect(page.getByTestId("site-desirability")).toHaveText(
    "宜居 +0 · 周边无影响",
  );

  await page.keyboard.press("Enter");
  await expect(page.getByTestId("feedback")).toHaveText("水井建造完成");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("site-desirability")).toHaveText(
    "宜居 +1 · 近水井 +1",
  );
  await expect(page.getByTestId("site-feng-shui")).not.toHaveText("风水 —");
});
