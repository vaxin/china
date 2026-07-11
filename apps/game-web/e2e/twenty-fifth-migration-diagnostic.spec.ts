import { expect, test } from "@playwright/test";

test("迁入诊断明确指出缺少城门入口道路", async ({ page }) => {
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
  }, unconnectedPlot());
  await page.reload();

  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await expect(page.getByTestId("migration-attractiveness")).toHaveText(
    "迁引 50 · 可迁",
  );
  await expect(page.getByTestId("migration-diagnostic")).toHaveText(
    "待迁 1 处 · 城门入口 (0,15) 未铺路",
  );
});

function unconnectedPlot() {
  return {
    map: { width: 32, height: 32 },
    tick: 1,
    revision: 5,
    buildings: [
      {
        id: 1,
        typeId: "house",
        x: 2,
        y: 13,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        level: 1,
        constructionStage: 0,
      },
    ],
    roads: [],
    households: [],
    migrants: [],
    economy: {
      treasury: 500,
      taxRate: "standard",
      lastTaxRevenue: 0,
      lastPayroll: 0,
      taxableHouses: 0,
      sentiment: 50,
      lastTradeRevenue: 0,
    },
  };
}
