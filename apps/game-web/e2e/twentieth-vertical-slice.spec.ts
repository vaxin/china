import { expect, test } from "@playwright/test";

test("N-DIP-02 已通商贸易站出口真实衣物并增加国库", async ({ page }) => {
  const commerceAssets = new Set<string>();
  page.on("response", (response) => {
    const pathname = new URL(response.url()).pathname;
    if (pathname.startsWith("/assets/runtime/v3/commerce/")) {
      expect([200, 304]).toContain(response.status());
      commerceAssets.add(pathname);
    }
  });
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
  }, tradeSnapshot());
  await page.reload();
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await expect(page.getByTestId("trading-post-count")).toHaveText("1");
  await expect(page.getByTestId("trade-revenue")).toHaveText("+12", {
    timeout: 4_000,
  });
  await expect(page.getByTestId("treasury")).toHaveText("508");
  await expect(page.getByTestId("trade-stock")).toHaveText("0");
  expect(commerceAssets).toContain(
    "/assets/runtime/v3/commerce/trading-post.png",
  );
  await page.screenshot({ path: "/tmp/empire-trading-post.png" });
});

function tradeSnapshot() {
  return {
    map: { width: 32, height: 32 },
    tick: 2,
    revision: 10,
    buildings: [
      {
        id: 1,
        typeId: "market",
        x: 1,
        y: 16,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        foodStock: 0,
        foodStocks: { wheat: 0, soybean: 0, rice: 0, millet: 0, cabbage: 0 },
        clothingStock: 1,
      },
      {
        id: 2,
        typeId: "trading-post",
        x: 6,
        y: 16,
        rotation: 0,
        footprint: { width: 3, height: 3 },
        clothingStock: 0,
      },
      {
        id: 3,
        typeId: "house",
        x: 10,
        y: 13,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        level: 1,
        constructionStage: 4,
      },
    ],
    roads: Array.from({ length: 13 }, (_, x) => ({ x, y: 15 })),
    households: [
      {
        houseId: 3,
        residents: 5,
        foodReserveTicks: 3,
        foodQuality: "bland",
        clothingReserveTicks: 3,
      },
    ],
    migrants: [],
    diplomacy: { relation: 50, tradeOpen: true, envoys: [] },
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
