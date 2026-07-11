import { expect, test } from "@playwright/test";

test("N-ENT-02 二月新年祭真实消耗粮钱并提升民心", async ({ page }) => {
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
  }, festivalSnapshot());
  await page.reload();
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await expect(page.getByTestId("calendar-state")).toHaveText("二年 · 二月", {
    timeout: 2_500,
  });
  await expect(page.getByTestId("hold-festival")).toBeEnabled();
  await page.getByTestId("hold-festival").click();

  await expect(page.getByTestId("granary-food-count")).toHaveText("0");
  await expect(page.getByTestId("treasury")).toHaveText("30");
  await expect(page.getByTestId("city-sentiment")).toHaveText("60");
  await expect(page.getByTestId("last-festival")).toHaveText("2年已办");
  await expect(page.getByTestId("hold-festival")).toBeDisabled();
  await expect(page.getByTestId("feedback")).toHaveText(
    "新年祭已举办：耗粮 1、国库 20、民心 +10",
  );
  await expect(page.getByTestId("save-status")).toHaveText("已保存");
});

function festivalSnapshot() {
  return {
    map: { width: 32, height: 32 },
    tick: 12,
    revision: 10,
    buildings: [
      {
        id: 1,
        typeId: "music-school",
        x: 1,
        y: 1,
        rotation: 0,
        footprint: { width: 2, height: 2 },
      },
      {
        id: 2,
        typeId: "granary",
        x: 4,
        y: 1,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        foodStock: 1,
        foodStocks: { wheat: 0, soybean: 0, rice: 0, millet: 1, cabbage: 0 },
      },
    ],
    roads: [],
    households: [],
    migrants: [],
    economy: {
      treasury: 50,
      taxRate: "standard",
      lastTaxRevenue: 0,
      lastPayroll: 0,
      taxableHouses: 0,
      sentiment: 50,
      lastTradeRevenue: 0,
    },
  };
}
