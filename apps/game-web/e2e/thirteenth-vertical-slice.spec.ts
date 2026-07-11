import { expect, test } from "@playwright/test";

test("N-ERA-01 跨年解锁纸张政务并把年代节点写入存档", async ({ page }) => {
  test.setTimeout(22_000);
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await expect(page.getByTestId("era-state")).toHaveText("聚落奠基");
  await expect(page.getByTestId("next-technology")).toHaveText(
    "2年 · 纸张政务",
  );

  await expect(page.getByTestId("simulation-tick")).toHaveText("tick 12", {
    timeout: 14_000,
  });
  await expect(page.getByTestId("era-state")).toHaveText("文书初兴");
  await expect(page.getByTestId("next-technology")).toHaveText(
    "3年 · 学校礼制",
  );
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  await page.reload();
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await expect(page.getByTestId("era-state")).toHaveText("文书初兴");
  await expect(page.getByTestId("next-technology")).toHaveText(
    "3年 · 学校礼制",
  );
});
