import { expect, test, type Page } from "@playwright/test";

test("P27 人物在月份不变时完成连续一步并自然进入工作", async ({ page }) => {
  test.setTimeout(20_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await installWorld(page, citizenAtLastCommuteStep());
  await page.reload();
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await expect(page.getByTestId("citizen-activity")).toHaveText("1 · 工0");

  const tickBefore = await page.getByTestId("simulation-tick").textContent();
  const canvas = page.getByTestId("game-canvas");
  const frameA = await canvas.screenshot();
  await page.waitForTimeout(420);
  const frameB = await canvas.screenshot();
  expect(frameA.equals(frameB)).toBe(false);

  await expect(page.getByTestId("citizen-activity")).toHaveText("1 · 工1", {
    timeout: 5_500,
  });
  await expect(page.getByTestId("simulation-tick")).toHaveText(
    tickBefore ?? "tick 6",
  );
  expect(errors).toEqual([]);
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

function citizenAtLastCommuteStep() {
  return {
    map: { width: 32, height: 32 },
    tick: 6,
    revision: 9,
    buildings: [
      {
        id: 1,
        typeId: "house",
        x: 1,
        y: 13,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        level: 2,
        constructionStage: 4,
      },
      {
        id: 2,
        typeId: "well",
        x: 6,
        y: 14,
        rotation: 0,
        footprint: { width: 1, height: 1 },
      },
    ],
    roads: Array.from({ length: 7 }, (_, x) => ({ x, y: 15 })),
    households: [
      {
        houseId: 1,
        residents: 10,
        foodReserveTicks: 3,
        foodQuality: "bland",
      },
    ],
    migrants: [],
    citizens: [
      {
        id: 1,
        houseId: 1,
        workplaceId: 2,
        x: 5,
        y: 15,
        state: "commuting",
        dwellTicks: 0,
      },
    ],
  };
}
