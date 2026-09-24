import { expect, test, type Page } from "@playwright/test";

test("P25-01 市场缺席时，连通粮仓的真实粮食会救济缺粮住宅", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await installWorld(page, hungryHouseWithGranary());
  await page.reload();
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await expect
    .poll(() => readFoodState(page), { timeout: 3_000 })
    .toEqual({ granaryFood: 0, reserve: 3, quality: "bland" });
  await expect(page.getByTestId("household-food-quality")).toHaveText("清淡");
});

async function installWorld(page: Page, world: unknown) {
  await page.evaluate(async (snapshot) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("empire-game");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("saves", "readwrite");
      transaction.objectStore("saves").put({
        id: "autosave",
        envelope: { saveFormatVersion: 6, world: snapshot },
        savedAt: new Date().toISOString(),
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, world);
}

async function readFoodState(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("empire-game");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const record = await new Promise<{
      envelope?: {
        world?: {
          buildings?: Array<{ typeId: string; foodStock?: number }>;
          households?: Array<{
            foodReserveTicks?: number;
            foodQuality?: string;
          }>;
        };
      };
    } | null>((resolve, reject) => {
      const request = database
        .transaction("saves", "readonly")
        .objectStore("saves")
        .get("autosave");
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    database.close();
    const world = record?.envelope?.world;
    return {
      granaryFood:
        world?.buildings?.find((building) => building.typeId === "granary")
          ?.foodStock ?? -1,
      reserve: world?.households?.[0]?.foodReserveTicks ?? -1,
      quality: world?.households?.[0]?.foodQuality ?? "missing",
    };
  });
}

function hungryHouseWithGranary() {
  return {
    map: { width: 32, height: 32 },
    tick: 6,
    revision: 6,
    buildings: [
      {
        id: 1,
        typeId: "house",
        x: 1,
        y: 14,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        level: 1,
        constructionStage: 4,
      },
      {
        id: 2,
        typeId: "granary",
        x: 4,
        y: 14,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        foodStock: 1,
        foodStocks: { wheat: 0, soybean: 0, rice: 0, millet: 1, cabbage: 0 },
      },
    ],
    roads: [
      { x: 0, y: 15 },
      { x: 0, y: 16 },
      { x: 1, y: 16 },
      { x: 2, y: 16 },
      { x: 3, y: 16 },
      { x: 4, y: 16 },
    ],
    households: [
      {
        houseId: 1,
        residents: 5,
        foodReserveTicks: 0,
        foodQuality: "none",
      },
    ],
    migrants: [],
  };
}
