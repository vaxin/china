import { expect, test } from "@playwright/test";

test("LAYOUT-01 紧凑顶部、右侧指挥栏与中央属性窗形成 RTS 层级", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");

  const resourceBar = page.getByLabel("城市核心资源");
  const rail = page.getByLabel("建造工具");
  await expect(resourceBar).toBeInViewport();
  await expect(rail).toBeInViewport();
  await expect(resourceBar.getByText("人口", { exact: true })).toBeVisible();
  await expect(resourceBar.getByText("粮食", { exact: true })).toBeVisible();
  await expect(resourceBar.getByText("钱粮", { exact: true })).toBeVisible();

  const resourceBox = await resourceBar.boundingBox();
  const railBox = await rail.boundingBox();
  expect(resourceBox).not.toBeNull();
  expect(railBox).not.toBeNull();
  expect(resourceBox!.height).toBeLessThanOrEqual(40);
  expect(railBox!.width).toBeLessThanOrEqual(286);
  expect(railBox!.x).toBeGreaterThan(900);

  const minimap = rail.getByLabel("实时城域图");
  const minimapBox = await minimap.boundingBox();
  const primaryTabsBox = await rail.getByLabel("指挥栏分区").boundingBox();
  expect(minimapBox).not.toBeNull();
  expect(primaryTabsBox).not.toBeNull();
  expect(minimapBox!.height).toBe(94);
  expect(minimapBox!.y + minimapBox!.height).toBeLessThan(primaryTabsBox!.y);
  await expect(rail.locator(".command-rail-actions")).toHaveCount(0);

  const buildTabBox = await rail
    .getByRole("button", { name: "建造", exact: true })
    .boundingBox();
  const categoryToolbarBox = await rail
    .locator(".build-catalogue-toolbar")
    .boundingBox();
  expect(buildTabBox).not.toBeNull();
  expect(categoryToolbarBox).not.toBeNull();
  expect(buildTabBox!.height).toBe(26);
  expect(buildTabBox!.y + buildTabBox!.height).toBeLessThan(
    categoryToolbarBox!.y,
  );

  const categoryGeometry = await rail
    .getByRole("button", { name: "民生", exact: true })
    .evaluate((button) => {
      const styles = getComputedStyle(button);
      return {
        height: button.getBoundingClientRect().height,
        fontSize: styles.fontSize,
        alignItems: styles.alignItems,
        justifyContent: styles.justifyContent,
      };
    });
  expect(categoryGeometry).toEqual({
    height: 20,
    fontSize: "9px",
    alignItems: "center",
    justifyContent: "center",
  });

  await rail.getByRole("button", { name: "产业", exact: true }).click();
  await expect(rail.getByRole("button", { name: /麻田 2×2 Q/ })).toBeVisible();
  await expect(rail.getByRole("button", { name: /住宅 2×2 Q/ })).toBeHidden();
  await expect(rail.locator(".build-card:visible img")).toHaveCount(4);

  await rail.getByRole("button", { name: "政令", exact: true }).click();
  await expect(page.getByLabel("劳动力政策")).toBeVisible();
  await expect(page.getByLabel("政府税收")).toBeVisible();

  await rail.getByRole("button", { name: "城情", exact: true }).click();
  await page.getByRole("button", { name: "查看房屋列表" }).click();
  const houseList = page.getByRole("complementary", { name: "住宅列表" });
  await expect(houseList).toBeVisible();

  const modalBox = await houseList.boundingBox();
  expect(modalBox).not.toBeNull();
  expect(modalBox!.x + modalBox!.width).toBeLessThanOrEqual(1000);
  await expect(houseList).toContainText("暂无住宅");
});

test("LAYOUT-02 狭屏保持窄顶栏与分组式右栏", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");

  const rail = page.getByLabel("建造工具");
  const railBox = await rail.boundingBox();
  expect(railBox).not.toBeNull();
  expect(railBox!.width).toBeLessThanOrEqual(218);
  expect(railBox!.x + railBox!.width).toBeLessThanOrEqual(720);

  await expect(page.getByLabel("城市核心资源")).toBeInViewport();
  await rail.getByRole("button", { name: "城务", exact: true }).click();

  const taxOffice = await rail
    .getByRole("button", { name: /税务署 2×2 Q/ })
    .boundingBox();
  const musicSchool = await rail
    .getByRole("button", { name: /音乐学校 2×2 W/ })
    .boundingBox();
  expect(taxOffice).not.toBeNull();
  expect(musicSchool).not.toBeNull();
  expect(Math.abs(taxOffice!.y - musicSchool!.y)).toBeLessThan(4);
});

test("LAYOUT-03 农场作物选择器留在右栏且保持紧凑", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");

  const rail = page.getByLabel("建造工具");
  await rail.getByRole("button", { name: /农场 2×2 E/ }).click();

  const cropPicker = rail.getByLabel("选择农作物");
  await expect(cropPicker).toBeVisible();
  await expect(cropPicker.getByRole("button")).toHaveCount(5);

  const farmBox = await rail
    .getByRole("button", { name: /农场 2×2 E/ })
    .boundingBox();
  const railBox = await rail.boundingBox();
  const pickerBox = await cropPicker.boundingBox();
  expect(farmBox).not.toBeNull();
  expect(railBox).not.toBeNull();
  expect(pickerBox).not.toBeNull();
  expect(pickerBox!.x).toBeGreaterThanOrEqual(railBox!.x);
  expect(pickerBox!.x + pickerBox!.width).toBeLessThanOrEqual(
    railBox!.x + railBox!.width,
  );
  expect(pickerBox!.height).toBeLessThanOrEqual(38);
  expect(pickerBox!.y).toBeGreaterThan(farmBox!.y);
  expect(
    Math.abs(pickerBox!.y - (farmBox!.y + farmBox!.height)),
  ).toBeLessThanOrEqual(3);

  const geometry = await cropPicker.evaluate((element) => ({
    position: getComputedStyle(element).position,
    horizontalOverflow: element.scrollWidth - element.clientWidth,
    verticalOverflow: element.scrollHeight - element.clientHeight,
    buttonHeights: Array.from(
      element.querySelectorAll("button"),
      (button) => button.getBoundingClientRect().height,
    ),
  }));
  expect(geometry).toEqual({
    position: "static",
    horizontalOverflow: 0,
    verticalOverflow: 0,
    buttonHeights: [32, 32, 32, 32, 32],
  });

  await cropPicker.getByRole("button", { name: "大豆 9月" }).click();
  await expect(
    cropPicker.getByRole("button", { name: "大豆 9月" }),
  ).toHaveAttribute("aria-pressed", "true");

  await rail.getByRole("button", { name: "政令", exact: true }).click();
  await expect(cropPicker).toBeHidden();
});

test("LAYOUT-04 城情统计固定在右栏且可滚动查看", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");

  const rail = page.getByLabel("建造工具");
  await rail.getByRole("button", { name: "城情", exact: true }).click();

  const cityOverview = page.getByLabel("运行状态");
  await expect(cityOverview).toBeVisible();
  await expect(cityOverview.locator(":scope > div")).toHaveCount(43);

  const railBox = await rail.boundingBox();
  const overviewBox = await cityOverview.boundingBox();
  expect(railBox).not.toBeNull();
  expect(overviewBox).not.toBeNull();
  expect(overviewBox!.x).toBeGreaterThanOrEqual(railBox!.x);
  expect(overviewBox!.x + overviewBox!.width).toBeLessThanOrEqual(
    railBox!.x + railBox!.width,
  );

  const geometry = await cityOverview.evaluate((element) => ({
    position: getComputedStyle(element).position,
    scrollable: element.scrollHeight > element.clientHeight,
  }));
  expect(geometry).toEqual({ position: "fixed", scrollable: true });

  const populationEntry = page
    .getByLabel("城市核心资源")
    .getByRole("button", { name: "查看人口详情" });
  await expect(populationEntry).toBeVisible();
  await populationEntry.click();
  await expect(
    page.getByRole("complementary", { name: "人口详情" }),
  ).toBeVisible();
});

test("LAYOUT-05 右侧指挥栏可收起并保留当前页签", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("game-status")).toHaveText("游戏已就绪");

  const rail = page.getByLabel("建造工具");
  await rail.getByRole("button", { name: "城情", exact: true }).click();
  const cityOverview = page.getByLabel("运行状态");
  await expect(cityOverview).toBeVisible();

  const collapse = page.getByRole("button", {
    name: "收起右侧指挥栏",
    exact: true,
  });
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  await collapse.click();

  const expand = page.getByRole("button", {
    name: "展开右侧指挥栏",
    exact: true,
  });
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(cityOverview).toBeHidden();
  await page.waitForTimeout(200);

  const collapsedRailBox = await rail.boundingBox();
  const expandedTopBarBox = await page.locator(".top-bar").boundingBox();
  expect(collapsedRailBox).not.toBeNull();
  expect(expandedTopBarBox).not.toBeNull();
  expect(collapsedRailBox!.x).toBeGreaterThanOrEqual(1240);
  expect(expandedTopBarBox!.width).toBeGreaterThan(1200);

  await expand.click();
  await expect(cityOverview).toBeVisible();
  await expect(
    page.getByRole("button", { name: "收起右侧指挥栏", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
});
