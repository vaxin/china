import { expect, test, type Page } from "@playwright/test";

test("N-AGR-01～05 五种作物可选择、独立渲染、季节收获并随存档恢复", async ({
  page,
}) => {
  test.setTimeout(35_000);
  const errors: string[] = [];
  const loadedAssets = new Set<string>();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    const pathname = new URL(response.url()).pathname;
    if (pathname.startsWith("/assets/runtime/v3/crops/")) {
      expect([200, 304]).toContain(response.status());
      loadedAssets.add(pathname);
    }
  });

  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await expect(page.getByTestId("calendar-state")).toContainText("年 ·");
  await page.getByRole("button", { name: "农场" }).click();

  const crops = [
    ["wheat", "小麦", { x: 4, y: 4 }],
    ["soybean", "大豆", { x: 7, y: 4 }],
    ["rice", "水稻", { x: 10, y: 4 }],
    ["millet", "粟", { x: 13, y: 4 }],
    ["cabbage", "白菜", { x: 16, y: 4 }],
  ] as const;
  let selected = { x: 16, y: 16 };
  for (const [index, [cropType, label, tile]] of crops.entries()) {
    await page.getByTestId(`crop-${cropType}`).click();
    await expect(page.getByTestId(`crop-${cropType}`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("feedback")).toContainText(
      `${label}农场营造`,
    );
    selected = await moveSelection(page, selected, tile);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("farm-count")).toHaveText(String(index + 1));
  }

  await expect(page.getByTestId("farm-crop-summary")).toHaveText(
    "小麦1 · 大豆1 · 水稻1 · 粟1 · 白菜1",
  );
  await expect(page.getByTestId("save-status")).toHaveText("已保存");
  await expect
    .poll(() => readFarmStocks(page), { timeout: 10_000 })
    .toEqual({ wheat: 1, soybean: 0, rice: 0, millet: 0, cabbage: 0 });

  for (const [cropType] of crops) {
    expect(loadedAssets).toContain(`/assets/runtime/v3/crops/${cropType}.png`);
  }
  await page.keyboard.press("KeyE");
  await expect(page.getByTestId("camera-state")).toHaveText("方位 0°");
  await page.screenshot({ path: "/tmp/empire-ninth-five-crops.png" });
  expect(errors).toEqual([]);

  await page.reload();
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await expect(page.getByTestId("farm-crop-summary")).toHaveText(
    "小麦1 · 大豆1 · 水稻1 · 粟1 · 白菜1",
  );
  expect(errors).toEqual([]);
});

test("N-FOOD-01～03 两种作物沿真实道路入市并形成普通膳食品质", async ({
  page,
}) => {
  test.setTimeout(30_000);
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  let selected = { x: 16, y: 16 };

  await page.getByRole("button", { name: "农场" }).click();
  await page.getByTestId("crop-wheat").click();
  selected = await moveSelection(page, selected, { x: 1, y: 18 });
  await page.keyboard.press("Enter");
  await page.getByTestId("crop-soybean").click();
  selected = await moveSelection(page, selected, { x: 1, y: 21 });
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "粮仓" }).click();
  selected = await moveSelection(page, selected, { x: 4, y: 18 });
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "市场" }).click();
  selected = await moveSelection(page, selected, { x: 4, y: 14 });
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "道路" }).click();
  for (const tile of [
    { x: 4, y: 16 },
    { x: 4, y: 17 },
    { x: 3, y: 17 },
    { x: 3, y: 18 },
    { x: 3, y: 19 },
    { x: 3, y: 20 },
    { x: 2, y: 20 },
    { x: 4, y: 20 },
  ]) {
    selected = await moveSelection(page, selected, tile);
    await page.keyboard.press("Enter");
  }

  await expect(page.getByTestId("market-food-quality")).toHaveText("普通", {
    timeout: 12_000,
  });
  await expect(page.getByTestId("market-food-count")).toHaveText("2");
  await expect
    .poll(() => readFoodNetwork(page), { timeout: 4_000 })
    .toMatchObject({
      granary: { total: 0 },
      market: { total: 2, wheat: 1, soybean: 1 },
    });
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  await page.reload();
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
  await expect(page.getByTestId("market-food-quality")).toHaveText("普通");
  await expect(page.getByTestId("farm-crop-summary")).toHaveText(
    "小麦1 · 大豆1",
  );
});

async function moveSelection(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const canvas = page.getByTestId("game-canvas");
  await canvas.focus();
  const horizontal = to.x < from.x ? "ArrowLeft" : "ArrowRight";
  const vertical = to.y < from.y ? "ArrowUp" : "ArrowDown";
  for (let index = 0; index < Math.abs(to.x - from.x); index += 1) {
    await page.keyboard.press(horizontal);
  }
  for (let index = 0; index < Math.abs(to.y - from.y); index += 1) {
    await page.keyboard.press(vertical);
  }
  await expect(page.getByTestId("keyboard-tile")).toHaveText(
    `键盘选中地格 ${to.x},${to.y}`,
  );
  return to;
}

async function readFarmStocks(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("empire-game");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<Record<string, number>>((resolve, reject) => {
      const transaction = database.transaction("saves", "readonly");
      const request = transaction.objectStore("saves").get("autosave");
      transaction.oncomplete = () => {
        const farms = request.result.envelope.world.buildings.filter(
          (building: { typeId: string }) => building.typeId === "farm",
        ) as Array<{ cropType: string; foodStock: number }>;
        database.close();
        resolve(
          Object.fromEntries(
            farms.map((farm) => [farm.cropType, farm.foodStock]),
          ),
        );
      };
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

async function readFoodNetwork(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("empire-game");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<Record<string, Record<string, number>>>(
      (resolve, reject) => {
        const transaction = database.transaction("saves", "readonly");
        const request = transaction.objectStore("saves").get("autosave");
        transaction.oncomplete = () => {
          const buildings = request.result.envelope.world.buildings as Array<{
            typeId: string;
            foodStock?: number;
            foodStocks?: Record<string, number>;
          }>;
          const result: Record<string, Record<string, number>> = {};
          for (const typeId of ["granary", "market"]) {
            const building = buildings.find((item) => item.typeId === typeId);
            result[typeId] = {
              total: building?.foodStock ?? 0,
              ...(building?.foodStocks ?? {}),
            };
          }
          database.close();
          resolve(result);
        };
        transaction.onerror = () => reject(transaction.error);
      },
    );
  });
}
