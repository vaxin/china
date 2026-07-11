import { expect, test, type Page } from "@playwright/test";

test("P24-01～06 市民从入住延续到上工返家并使用职业动画", async ({ page }) => {
  test.setTimeout(30_000);
  const errors: string[] = [];
  const peopleAssets = new Map<string, number>();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.url().includes("/assets/runtime/v4/people/")) {
      peopleAssets.set(new URL(response.url()).pathname, response.status());
    }
  });

  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await installWorld(page, citizenCommuteWorld());
  await page.reload();
  expect(await readQuarantineReason(page)).toBeNull();
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await expect(page.getByTestId("citizen-activity")).toContainText("1 · 工");

  await expect
    .poll(() => readCitizen(page), { timeout: 8_000 })
    .toMatchObject({ workplaceId: 2, x: 6, y: 15, state: "working" });
  await page.screenshot({ path: "/tmp/empire-twenty-fourth-citizen-work.png" });

  await expect
    .poll(() => readCitizen(page), { timeout: 6_000 })
    .toMatchObject({ state: "returning" });
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  await page.reload();
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await expect(page.getByTestId("citizen-activity")).toContainText("1 · 工");
  const restored = await readCitizen(page);
  expect(restored).not.toBeNull();

  for (const role of ["farmer", "artisan", "merchant", "official"]) {
    for (const action of ["walk", "work"]) {
      for (const frame of [0, 1]) {
        expect([200, 304]).toContain(
          peopleAssets.get(
            `/assets/runtime/v4/people/${role}-${action}-${frame}.png`,
          ),
        );
      }
    }
  }
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

async function readCitizen(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("empire-game");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const record = await new Promise<{
      envelope?: { world?: { citizens?: unknown[] } };
    } | null>((resolve, reject) => {
      const request = database
        .transaction("saves", "readonly")
        .objectStore("saves")
        .get("autosave");
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return record?.envelope?.world?.citizens?.[0] ?? null;
  });
}

async function readQuarantineReason(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("empire-game");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const records = await new Promise<Array<{ reason?: string }>>(
      (resolve, reject) => {
        const request = database
          .transaction("quarantine", "readonly")
          .objectStore("quarantine")
          .getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      },
    );
    database.close();
    return records.at(-1)?.reason ?? null;
  });
}

function citizenCommuteWorld() {
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
        x: 1,
        y: 15,
        state: "commuting",
        dwellTicks: 0,
      },
    ],
  };
}
