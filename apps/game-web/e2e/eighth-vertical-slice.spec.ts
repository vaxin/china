import { expect, test, type Page } from "@playwright/test";

const selectedTiles = new WeakMap<Page, { x: number; y: number }>();

test("S8-01～S8-06、S8-11～S8-12 真实素材加载且固定等距视角地面轴对齐", async ({
  page,
}) => {
  test.setTimeout(35_000);
  selectedTiles.set(page, { x: 16, y: 16 });
  const errors: string[] = [];
  const loadedAssets = new Set<string>();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    const pathname = new URL(response.url()).pathname;
    if (pathname.startsWith("/assets/runtime/")) {
      expect([200, 304]).toContain(response.status());
      loadedAssets.add(pathname);
    }
  });

  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");

  await buildAt(page, "住宅", { x: 1, y: 14 });
  await buildAt(page, "道路", { x: 0, y: 15 });
  await buildAt(page, "水井", { x: 4, y: 14 });
  await buildAt(page, "农场", { x: 6, y: 12 });

  await expect(page.getByTestId("farm-count")).toHaveText("1");
  await page.waitForTimeout(300);
  await settleWebGl(page);
  await moveSelection(page, { x: 5, y: 12 });
  await moveSelection(page, { x: 6, y: 12 });
  await expect(page.getByTestId("placement-status")).toHaveText("occupied");
  await expect(page.getByTestId("camera-state")).toHaveText("方位 0°");
  await page.screenshot({ path: "/tmp/empire-eighth-grounding-default.png" });
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(300);
  await settleWebGl(page);
  await moveSelection(page, { x: 5, y: 12 });
  await moveSelection(page, { x: 6, y: 12 });
  await expect(page.getByTestId("placement-status")).toHaveText("occupied");
  await expect(page.getByTestId("camera-state")).toHaveText("方位 0°");
  await settleWebGl(page);
  await page.screenshot({ path: "/tmp/empire-eighth-grounding-fixed.png" });

  await buildAt(page, "粮仓", { x: 9, y: 12 });
  await buildAt(page, "市场", { x: 12, y: 12 });

  await expect(page.getByTestId("population-count")).toHaveText("5", {
    timeout: 8_000,
  });
  await page.waitForTimeout(800);

  const requiredAssets = [
    "/assets/runtime/v1/terrain/loess.png",
    "/assets/runtime/v2/roads/00-isolated.png",
    "/assets/runtime/v2/roads/0f-nesw.png",
    "/assets/runtime/v1/buildings/gate.png",
    "/assets/runtime/v1/buildings/well.png",
    "/assets/runtime/v1/buildings/farm.png",
    "/assets/runtime/v1/buildings/granary.png",
    "/assets/runtime/v1/buildings/market.png",
    "/assets/runtime/v1/house/plot.png",
    "/assets/runtime/v1/house/frame.png",
    "/assets/runtime/v1/house/complete.png",
    "/assets/runtime/v1/villager/walk-a.png",
    "/assets/runtime/v1/villager/build-a.png",
  ];
  for (const asset of requiredAssets) expect(loadedAssets).toContain(asset);
  expect(loadedAssets).not.toContain("/assets/runtime/v1/terrain/road-top.png");
  expect(errors).toEqual([]);

  await settleWebGl(page);
  await page.screenshot({ path: "/tmp/empire-eighth-runtime-assets.png" });

  await page.keyboard.press("KeyE");
  await page.waitForTimeout(250);
  await settleWebGl(page);
  await expect(page.getByTestId("camera-state")).toHaveText("方位 0°");
  await page.screenshot({
    path: "/tmp/empire-eighth-runtime-assets-fixed.png",
  });
  expect(errors).toEqual([]);
});

test("S8-13 道路从孤立格动态形成十字并在拆路后退化为 T 形", async ({
  page,
}) => {
  selectedTiles.set(page, { x: 16, y: 16 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");
  await page.getByRole("button", { name: "道路" }).click();

  const cross = [
    { x: 6, y: 16 },
    { x: 6, y: 15 },
    { x: 7, y: 16 },
    { x: 6, y: 17 },
    { x: 5, y: 16 },
  ];
  for (const [index, tile] of cross.entries()) {
    await moveSelection(page, tile);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("road-count")).toHaveText(String(index + 1));
  }

  await page.mouse.wheel(0, -480);
  await settleWebGl(page);
  await page.screenshot({ path: "/tmp/empire-eighth-road-cross.png" });

  await page.getByRole("button", { name: "拆除" }).click();
  await moveSelection(page, { x: 6, y: 15 });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("road-count")).toHaveText("4");
  await page.getByRole("button", { name: "拆除" }).click();
  await settleWebGl(page);
  await page.screenshot({ path: "/tmp/empire-eighth-road-t-junction.png" });

  expect(errors).toEqual([]);
});

test("S8-14 直线道路不会把路口圆盘烘焙进贴图", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");

  const alpha = await page.evaluate(async () => {
    const sample = async (url: string, x: number, y: number) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      context?.drawImage(image, 0, 0);
      return context?.getImageData(x, y, 1, 1).data[3] ?? 255;
    };
    return {
      horizontalAboveLane: await sample(
        "/assets/runtime/v2/roads/0a-ew.png",
        256,
        145,
      ),
      verticalLeftOfLane: await sample(
        "/assets/runtime/v2/roads/05-ns.png",
        145,
        256,
      ),
    };
  });

  expect(alpha.horizontalAboveLane).toBe(0);
  expect(alpha.verticalLeftOfLane).toBe(0);
});

async function buildAt(
  page: Page,
  tool: "住宅" | "道路" | "水井" | "农场" | "粮仓" | "市场",
  target: { x: number; y: number },
) {
  await page.getByRole("button", { name: tool }).click();
  await moveSelection(page, target);
  await page.keyboard.press("Enter");
}

async function moveSelection(page: Page, target: { x: number; y: number }) {
  const canvas = page.getByTestId("game-canvas");
  await canvas.focus();
  const selected = selectedTiles.get(page) ?? { x: 16, y: 16 };
  const horizontal = target.x < selected.x ? "ArrowLeft" : "ArrowRight";
  const vertical = target.y < selected.y ? "ArrowUp" : "ArrowDown";
  for (let index = 0; index < Math.abs(target.x - selected.x); index += 1) {
    await page.keyboard.press(horizontal);
  }
  for (let index = 0; index < Math.abs(target.y - selected.y); index += 1) {
    await page.keyboard.press(vertical);
  }
  selectedTiles.set(page, target);
  await expect(page.getByTestId("keyboard-tile")).toHaveText(
    `键盘选中地格 ${target.x},${target.y}`,
  );
}

async function settleWebGl(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          document.querySelector("canvas")?.getContext("webgl2")?.finish();
          resolve();
        });
      }),
  );
}
