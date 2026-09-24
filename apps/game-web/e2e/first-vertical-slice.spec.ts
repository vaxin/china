import { expect, test, type Page } from "@playwright/test";

const runtimeErrors = new WeakMap<Page, string[]>();

async function openFreshGame(page: Page) {
  await page.goto("/");
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await openFreshGame(page);
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page) ?? []).toEqual([]);
});

test("S-01 首次打开即可看到可操作的 3D 沙盘", async ({ page }) => {
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await expect(page.getByTestId("building-count")).toHaveText("0");
  await expect(page.getByTestId("renderer-name")).toHaveText("WebGL2");
  await expect(page.getByTestId("game-canvas")).toBeVisible();
});

test("S-02 合法空地可以建造一座住宅", async ({ page }) => {
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  const buildButton = page.getByRole("button", { name: "住宅" });
  await expect(buildButton).toBeEnabled();
  await buildButton.click();

  const canvas = page.getByTestId("game-canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({ position: { x: box!.width / 2, y: box!.height / 2 } });

  await expect(page.getByTestId("building-count")).toHaveText("1");
  await expect(page.getByTestId("feedback")).toHaveText(
    "宅基地已划定，等待流民营造",
  );
  await expect(page.getByTestId("save-status")).toHaveText("已保存");
});

test("S-02 键盘可以选格并确认建造", async ({ page }) => {
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await page.getByRole("button", { name: "住宅" }).click();
  const canvas = page.getByTestId("game-canvas");
  await canvas.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("hovered-tile")).toHaveText("17,16");

  await page.keyboard.press("Enter");

  await expect(page.getByTestId("building-count")).toHaveText("1");
  await expect(page.getByTestId("feedback")).toHaveText(
    "宅基地已划定，等待流民营造",
  );
});

test("S-03 滚动平移后仍可准确建造", async ({ page }) => {
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  const buildButton = page.getByRole("button", { name: "住宅" });
  await expect(buildButton).toBeEnabled();
  await buildButton.click();
  const canvas = page.getByTestId("game-canvas");

  await canvas.hover({ position: { x: 700, y: 360 } });
  await page.keyboard.press("KeyE");
  await page.mouse.wheel(0, -120);
  await expect(page.getByTestId("camera-state")).toHaveText("方位 0°");
  const previewTile = await page.getByTestId("hovered-tile").innerText();

  await canvas.click({ position: { x: 700, y: 360 } });
  await expect(page.getByTestId("building-count")).toHaveText("1");
  await expect(page.getByTestId("save-status")).toHaveText("已保存");
  const savedTile = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("empire-game");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return await new Promise<string>((resolve, reject) => {
      const transaction = database.transaction("saves", "readonly");
      const request = transaction.objectStore("saves").get("autosave");
      transaction.oncomplete = () => {
        const building = request.result.envelope.world.buildings[0];
        database.close();
        resolve(`${building.x},${building.y}`);
      };
      transaction.onerror = () => reject(transaction.error);
    });
  });
  expect(savedTile).toBe(previewTile);
});

test("S-03 横向和纵向滚动都会平移当前落格", async ({ page }) => {
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await page.getByRole("button", { name: "住宅" }).click();
  const canvas = page.getByTestId("game-canvas");
  await canvas.hover({ position: { x: 700, y: 360 } });
  const initialTile = await page.getByTestId("hovered-tile").innerText();

  await page.mouse.wheel(360, 0);
  await expect(page.getByTestId("camera-state")).toHaveText("方位 0°");
  await expect(page.getByTestId("hovered-tile")).not.toHaveText(initialTile);
  const horizontalTile = await page.getByTestId("hovered-tile").innerText();

  await page.mouse.wheel(0, 360);
  await expect(page.getByTestId("camera-state")).toHaveText("方位 0°");
  await expect(page.getByTestId("hovered-tile")).not.toHaveText(horizontalTile);
});

test("S-03 可建造地图外仍延展为黄土地", async ({ page }) => {
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await page.getByRole("button", { name: "住宅" }).click();
  const canvas = page.getByTestId("game-canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const samplePoint = {
    x: Math.min(300, box!.width * 0.3),
    y: Math.min(140, box!.height * 0.22),
  };

  await canvas.hover({ position: samplePoint });
  for (const [deltaX, deltaY] of [
    [-900, 0],
    [0, -900],
    [-900, -900],
    [900, 0],
    [0, 900],
    [900, 900],
  ] as const) {
    if ((await page.getByTestId("hovered-tile").innerText()) === "—") break;
    await page.mouse.wheel(deltaX, deltaY);
    await page.waitForTimeout(80);
    await canvas.hover({ position: samplePoint });
  }
  await expect(page.getByTestId("hovered-tile")).toHaveText("—");

  const color = await sampleCanvasPixel(page, samplePoint);
  expect(color.r).toBeGreaterThan(color.g);
  expect(color.g).toBeGreaterThan(color.b);
  expect(distance(color, { r: 156, g: 168, b: 145 })).toBeGreaterThan(35);
});

test("S-03 固定相机不响应旋转键且保留当前预览落格", async ({ page }) => {
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await page.getByRole("button", { name: "住宅" }).click();
  const canvas = page.getByTestId("game-canvas");
  await canvas.hover({ position: { x: 700, y: 360 } });
  const tileBeforeRotation = await page.getByTestId("hovered-tile").innerText();

  await page.keyboard.press("KeyE");

  await expect(page.getByTestId("camera-state")).toHaveText("方位 0°");
  await expect(page.getByTestId("hovered-tile")).toHaveText(tileBeforeRotation);
});

test("S-03 拖拽相机不会误建造", async ({ page }) => {
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await page.getByRole("button", { name: "住宅" }).click();
  const canvas = page.getByTestId("game-canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;

  const initialHeading = await page.getByTestId("camera-state").innerText();
  await page.mouse.move(x, y);
  const initialTile = await page.getByTestId("hovered-tile").innerText();
  for (const button of ["left", "middle", "right"] as const) {
    await page.mouse.move(x, y);
    await page.mouse.down({ button });
    await page.mouse.move(x + 160, y + 96, { steps: 6 });
    await page.mouse.up({ button });
    await expect(page.getByTestId("camera-state")).toHaveText(initialHeading);
  }
  await page.mouse.move(x, y);
  await expect(page.getByTestId("hovered-tile")).not.toHaveText(initialTile);

  await expect(page.getByTestId("building-count")).toHaveText("0");
});

test("S-04 与 S-08 重叠或双击最终最多建造一座住宅", async ({ page }) => {
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  const buildButton = page.getByRole("button", { name: "住宅" });
  await expect(buildButton).toBeEnabled();
  await buildButton.click();
  const canvas = page.getByTestId("game-canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  await canvas.dblclick({
    position: { x: box!.width / 2, y: box!.height / 2 },
  });

  await expect(page.getByTestId("building-count")).toHaveText("1");
  await expect(page.getByTestId("feedback")).toHaveText("该位置已被占用");
});

test("S-05 地图边界外不能产生建筑", async ({ page }) => {
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  const buildButton = page.getByRole("button", { name: "住宅" });
  await expect(buildButton).toBeEnabled();
  await buildButton.click();
  const canvas = page.getByTestId("game-canvas");

  await canvas.focus();
  for (let index = 0; index < 47; index += 1) {
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
  }
  await expect(page.getByTestId("keyboard-tile")).toHaveText(
    "键盘选中地格 63,63",
  );
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("building-count")).toHaveText("0");
  await expect(page.getByTestId("feedback")).toHaveText("建筑不能超出地图边界");
});

test("S-06 成功建造会在刷新后恢复", async ({ page }) => {
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  const buildButton = page.getByRole("button", { name: "住宅" });
  await expect(buildButton).toBeEnabled();
  await buildButton.click();
  const canvas = page.getByTestId("game-canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({ position: { x: box!.width / 2, y: box!.height / 2 } });
  await expect(page.getByTestId("save-status")).toHaveText("已保存");

  await page.reload();

  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await expect(page.getByTestId("building-count")).toHaveText("1");
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
});

test("S-07 损坏或不兼容的存档不会造成白屏", async ({ page }) => {
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("empire-game");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("saves", "readwrite");
      transaction.objectStore("saves").put({
        id: "autosave",
        envelope: {
          saveFormatVersion: 1,
          world: {
            map: { width: 32, height: 32 },
            tick: 0,
            revision: 1,
            buildings: [
              {
                id: 1,
                typeId: "house",
                x: 31,
                y: 31,
                rotation: 0,
                footprint: { width: 2, height: 2 },
              },
            ],
          },
        },
        savedAt: new Date().toISOString(),
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });

  await page.reload();

  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await expect(page.getByTestId("building-count")).toHaveText("0");
  await expect(page.getByTestId("feedback")).toHaveText(
    "旧存档无法读取，已为你创建新游戏",
  );
  const databaseState = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("empire-game");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return await new Promise<{ activeCount: number; quarantineCount: number }>(
      (resolve, reject) => {
        const transaction = database.transaction(
          ["saves", "quarantine"],
          "readonly",
        );
        const activeRequest = transaction.objectStore("saves").count();
        const quarantineRequest = transaction.objectStore("quarantine").count();
        transaction.oncomplete = () => {
          const state = {
            activeCount: activeRequest.result,
            quarantineCount: quarantineRequest.result,
          };
          database.close();
          resolve(state);
        };
        transaction.onerror = () => reject(transaction.error);
      },
    );
  });
  expect(databaseState).toEqual({ activeCount: 0, quarantineCount: 1 });
});

async function sampleCanvasPixel(page: Page, point: { x: number; y: number }) {
  return await page.evaluate(async ({ x, y }) => {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    const source = document.querySelector<HTMLCanvasElement>(
      '[data-testid="game-canvas"]',
    );
    if (!source) throw new Error("game canvas not found");
    const image = new Image();
    image.src = source.toDataURL("image/png");
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2d canvas unavailable");
    context.drawImage(image, 0, 0);
    const scaleX = image.naturalWidth / source.clientWidth;
    const scaleY = image.naturalHeight / source.clientHeight;
    const centerX = Math.round(x * scaleX);
    const centerY = Math.round(y * scaleY);
    const radius = 3;
    const data = context.getImageData(
      centerX - radius,
      centerY - radius,
      radius * 2 + 1,
      radius * 2 + 1,
    ).data;
    let r = 0;
    let g = 0;
    let b = 0;
    const count = data.length / 4;
    for (let index = 0; index < data.length; index += 4) {
      r += data[index] ?? 0;
      g += data[index + 1] ?? 0;
      b += data[index + 2] ?? 0;
    }
    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count),
    };
  }, point);
}

function distance(
  left: { r: number; g: number; b: number },
  right: { r: number; g: number; b: number },
) {
  return (
    Math.abs(left.r - right.r) +
    Math.abs(left.g - right.g) +
    Math.abs(left.b - right.b)
  );
}
