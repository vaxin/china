import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const runtimeErrors = new WeakMap<Page, string[]>();
const selectedTiles = new WeakMap<Page, { x: number; y: number }>();

test.beforeEach(async ({ page }) => {
  selectedTiles.set(page, { x: 16, y: 16 });
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page) ?? []).toEqual([]);
});

test("S7-01～S7-09 宅基地、流民、木架、成屋与刷新形成完整可见闭环", async ({
  page,
}) => {
  test.setTimeout(30_000);

  await page.getByRole("button", { name: "住宅" }).click();
  await moveSelection(page, { x: 1, y: 14 });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("building-count")).toHaveText("1");
  await expect(page.getByTestId("construction-status")).toHaveText("营造 1 处");
  await expect(page.getByTestId("population-count")).toHaveText("0");
  await expect(page.getByTestId("feedback")).toHaveText(
    "宅基地已划定，等待流民营造",
  );
  await page.waitForTimeout(600);
  const plotFrame = await captureSettledPage(
    page,
    "/tmp/empire-seventh-plot.png",
  );

  await page.getByRole("button", { name: "道路" }).click();
  await moveSelection(page, { x: 0, y: 15 });
  await page.keyboard.press("Enter");
  await expect
    .poll(() => readConstructionState(page), { timeout: 3_000 })
    .toMatchObject({ version: 6, stage: 0, migrantState: "walking" });
  await page.waitForTimeout(600);
  const migrantFrame = await captureSettledPage(
    page,
    "/tmp/empire-seventh-migrant.png",
  );
  expect(migrantFrame.equals(plotFrame)).toBe(false);

  await expect
    .poll(() => readConstructionState(page), { timeout: 5_000 })
    .toMatchObject({ version: 6, stage: 2, migrantState: "building" });
  await page.waitForTimeout(600);
  const frameFrame = await captureSettledPage(
    page,
    "/tmp/empire-seventh-frame.png",
  );
  expect(frameFrame.equals(migrantFrame)).toBe(false);

  await expect(page.getByTestId("population-count")).toHaveText("5", {
    timeout: 6_000,
  });
  await expect(page.getByTestId("construction-status")).toHaveText("营造 —");
  await expect(page.getByTestId("save-status")).toHaveText("已保存");
  await expect
    .poll(() => readConstructionState(page))
    .toEqual({
      version: 6,
      stage: 4,
      migrantState: null,
      residents: 5,
    });
  await page.waitForTimeout(600);
  const completedFrame = await captureSettledPage(
    page,
    "/tmp/empire-seventh-complete.png",
  );
  expect(completedFrame.equals(frameFrame)).toBe(false);

  await page.reload();
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await expect(page.getByTestId("building-count")).toHaveText("1");
  await expect(page.getByTestId("construction-status")).toHaveText("营造 —");
  await expect(page.getByTestId("population-count")).toHaveText("5");
  await expect(page.getByTestId("save-status")).toHaveText("已恢复");
});

async function moveSelection(page: Page, target: { x: number; y: number }) {
  const canvas = page.getByTestId("game-canvas");
  await canvas.focus();
  const selected = selectedTiles.get(page) ?? { x: 16, y: 16 };
  const horizontal = target.x < selected.x ? "ArrowLeft" : "ArrowRight";
  const vertical = target.y < selected.y ? "ArrowUp" : "ArrowDown";
  for (let index = 0; index < Math.abs(target.x - selected.x); index += 1) {
    await page.keyboard.press(horizontal, { delay: 4 });
  }
  for (let index = 0; index < Math.abs(target.y - selected.y); index += 1) {
    await page.keyboard.press(vertical, { delay: 4 });
  }
  selectedTiles.set(page, target);
  await expect(page.getByTestId("keyboard-tile")).toHaveText(
    `键盘选中地格 ${target.x},${target.y}`,
  );
}

async function captureSettledPage(page: Page, path: string) {
  const dataUrl = await page.evaluate(async () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const frame = await new Promise<string>((resolve) => {
        requestAnimationFrame(() => {
          const canvas = document.querySelector("canvas");
          canvas?.getContext("webgl2")?.finish();
          resolve(canvas?.toDataURL("image/png") ?? "");
        });
      });
      const image = new Image();
      image.src = frame;
      await image.decode();
      const probe = document.createElement("canvas");
      probe.width = 64;
      probe.height = 36;
      const context = probe.getContext("2d");
      context?.drawImage(image, 0, 0, probe.width, probe.height);
      const pixels = context?.getImageData(
        0,
        0,
        probe.width,
        probe.height,
      ).data;
      let blackPixels = 0;
      if (pixels) {
        for (let index = 0; index < pixels.length; index += 4) {
          if (
            pixels[index] < 4 &&
            pixels[index + 1] < 4 &&
            pixels[index + 2] < 4
          ) {
            blackPixels += 1;
          }
        }
      }
      if (!pixels || blackPixels / (probe.width * probe.height) < 0.01) {
        return frame;
      }
    }
    throw new Error("连续 WebGL 帧均含异常黑色 compositor tile");
  });
  const image = Buffer.from(
    dataUrl.replace(/^data:image\/png;base64,/, ""),
    "base64",
  );
  await writeFile(path, image);
  return image;
}

async function readConstructionState(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("empire-game");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<{
      version: number;
      stage: number;
      migrantState: string | null;
      residents?: number;
    }>((resolve, reject) => {
      const transaction = database.transaction("saves", "readonly");
      const request = transaction.objectStore("saves").get("autosave");
      transaction.oncomplete = () => {
        const envelope = request.result.envelope;
        const house = envelope.world.buildings.find(
          (building: { typeId: string }) => building.typeId === "house",
        );
        database.close();
        resolve({
          version: envelope.saveFormatVersion,
          stage: house.constructionStage,
          migrantState: envelope.world.migrants[0]?.state ?? null,
          ...(envelope.world.households[0]
            ? { residents: envelope.world.households[0].residents }
            : {}),
        });
      };
      transaction.onerror = () => reject(transaction.error);
    });
  });
}
