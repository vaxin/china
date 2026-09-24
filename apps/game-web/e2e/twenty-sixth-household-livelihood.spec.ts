import { expect, test, type Page } from "@playwright/test";

test("LIFE-13～16 家庭生计链可对账、可键盘进入并适配狭屏减动效", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await installWorld(page, livelihoodWorld());
  await page.reload();
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");

  await expect(page.getByTestId("livelihood-summary")).toContainText("钱");
  await expect(page.getByTestId("livelihood-blocker")).toContainText("运粮中");

  await page
    .getByLabel("建造工具")
    .getByRole("button", { name: "人口 5" })
    .press("Enter");
  const householdCard = page.getByRole("button", { name: "住户 1 5 人" });
  await expect(householdCard).toContainText("运粮中");
  await expect(householdCard).toContainText("17 钱");
  await householdCard.press("Enter");

  const sheet = page.getByTestId("household-livelihood-1");
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("本户生计");
  await expect(sheet).toContainText("劳作");
  await expect(sheet).toContainText("钱袋");
  await expect(sheet).toContainText("采办");
  await expect(sheet).toContainText("粮瓮");
  await expect(sheet).toContainText("运粮中");
  await expect(sheet).toContainText("近 12 笔流水");
  await expect(sheet).toContainText("安家本钱");
  await expect(sheet).toContainText("工钱");
  await expect(sheet).toContainText("买粮");
  await expect(sheet).toContainText("+4");
  await expect(sheet).toContainText("-1");

  await page.setViewportSize({ width: 620, height: 800 });
  const flow = sheet.locator(".livelihood-flow");
  await expect
    .poll(() =>
      flow.evaluate(
        (element) =>
          getComputedStyle(element)
            .gridTemplateColumns.split(" ")
            .filter(Boolean).length,
      ),
    )
    .toBe(1);
  expect(
    await flow.evaluate(
      (element) => getComputedStyle(element, "::after").display,
    ),
  ).toBe("none");
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

function livelihoodWorld() {
  return {
    map: { width: 32, height: 32 },
    tick: 8,
    revision: 10,
    buildings: [
      {
        id: 1,
        typeId: "house",
        x: 1,
        y: 13,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        level: 1,
        constructionStage: 4,
      },
      {
        id: 2,
        typeId: "market",
        x: 4,
        y: 13,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        foodStock: 3,
        foodStocks: {
          wheat: 3,
          soybean: 0,
          rice: 0,
          millet: 0,
          cabbage: 0,
        },
        clothingStock: 0,
      },
    ],
    roads: Array.from({ length: 6 }, (_, x) => ({ x, y: 15 })),
    households: [
      {
        houseId: 1,
        residents: 5,
        foodReserveTicks: 1,
        foodQuality: "bland",
        cash: 17,
        employedWorkers: 2,
        lastIncome: 4,
        lastFoodExpense: 1,
        wageArrears: 0,
        taxArrears: 0,
        foodShortageReason: "delivery-pending",
        livelihoodLedger: [
          {
            id: "6:arrival-funds:0",
            tick: 6,
            kind: "arrival-funds",
            amount: 12,
            balanceAfter: 12,
          },
          {
            id: "8:wage:0",
            tick: 8,
            kind: "wage",
            amount: 4,
            balanceAfter: 18,
          },
          {
            id: "8:food-order:0",
            tick: 8,
            kind: "food-order",
            amount: -1,
            balanceAfter: 17,
          },
        ],
      },
    ],
    householdFoodOrders: [
      {
        houseId: 1,
        marketId: 2,
        cropType: "wheat",
        foodQuality: "bland",
        price: 1,
        placedAtTick: 8,
        arrivesAtTick: 40,
      },
    ],
    migrants: [],
    economy: {
      treasury: 500,
      taxRate: "standard",
      lastTaxRevenue: 0,
      lastPayroll: 0,
      taxableHouses: 0,
      sentiment: 50,
      lastTradeRevenue: 0,
      foodOrderEscrow: 1,
    },
  };
}
