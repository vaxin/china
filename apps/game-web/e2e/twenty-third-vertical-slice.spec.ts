import { expect, test } from "@playwright/test";

test("N-LAB-03 低民心宅基地停迁，提高工资后流民出现", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await page.evaluate(async (world) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("empire-game");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("saves", "readwrite");
      transaction.objectStore("saves").put({
        id: "autosave",
        envelope: { saveFormatVersion: 6, world },
        savedAt: new Date().toISOString(),
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, lowAppealPlot());
  await page.reload();
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await expect(page.getByTestId("migration-attractiveness")).toHaveText(
    "迁引 35 · 停迁",
  );
  await page.waitForTimeout(1_200);
  await expect(page.getByTestId("migrant-count")).toHaveText("0");

  await page.getByTestId("wage-high").click();
  await expect(page.getByTestId("migration-attractiveness")).toHaveText(
    "迁引 55 · 可迁",
  );
  await expect(page.getByTestId("migrant-count")).toHaveText("1", {
    timeout: 2_000,
  });
});

function lowAppealPlot() {
  return {
    map: { width: 32, height: 32 },
    tick: 1,
    revision: 5,
    buildings: [
      {
        id: 1,
        typeId: "house",
        x: 1,
        y: 14,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        level: 1,
        constructionStage: 0,
      },
    ],
    roads: [{ x: 0, y: 15 }],
    households: [],
    migrants: [],
    economy: {
      treasury: 500,
      taxRate: "standard",
      lastTaxRevenue: 0,
      lastPayroll: 0,
      taxableHouses: 0,
      sentiment: 35,
      lastTradeRevenue: 0,
    },
  };
}
