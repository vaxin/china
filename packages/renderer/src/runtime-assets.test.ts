import { describe, expect, it } from "vitest";

import {
  COMMERCE_ASSETS,
  CITIZEN_ASSETS,
  CITIZEN_WORK_ASSETS,
  ENTERTAINMENT_ASSETS,
  GOVERNMENT_ASSETS,
  ROAD_AUTOTILE_ASSETS,
  INDUSTRY_ASSETS,
  MILITARY_ASSETS,
  RUNTIME_ASSETS,
  assetForBuilding,
  assetForCitizen,
  assetForFarmCrop,
  assetForHouseStage,
  assetForMigrant,
  assetForRoadMask,
} from "./runtime-assets";

describe("真实运行素材清单", () => {
  it("覆盖地表、道路、城门、五阶段住宅、公共建筑和人物动作", () => {
    expect(Object.keys(RUNTIME_ASSETS).sort()).toEqual(
      [
        "building.farm",
        "building.granary",
        "building.market",
        "building.well",
        "gate.main",
        "house.complete",
        "house.foundation",
        "house.frame",
        "house.plot",
        "house.roof",
        "terrain.loess",
        "villager.build.a",
        "villager.build.b",
        "villager.walk.a",
        "villager.walk.b",
      ].sort(),
    );
  });

  it("所有可见素材来自版本化运行目录并声明有效尺寸和脚点", () => {
    for (const asset of Object.values(RUNTIME_ASSETS)) {
      expect(asset.url).toMatch(/^\/assets\/runtime\/v1\/.+\.png$/);
      expect(asset.pixelWidth).toBeGreaterThan(0);
      expect(asset.pixelHeight).toBeGreaterThan(0);
      expect(asset.worldHeight).toBeGreaterThan(0);
      expect(asset.anchorY).toBeGreaterThanOrEqual(0);
      expect(asset.anchorY).toBeLessThanOrEqual(1);
    }
  });

  it("按权威状态选择住宅、建筑和人物帧", () => {
    expect(assetForHouseStage(0).url).toContain("/house/plot.png");
    expect(assetForHouseStage(4).url).toContain("/house/complete.png");
    expect(assetForBuilding("well").url).toContain("/buildings/well.png");
    expect(assetForMigrant("walking", 0).url).toContain("/walk-a.png");
    expect(assetForMigrant("walking", 1).url).toContain("/walk-b.png");
    expect(assetForMigrant("building", 0).url).toContain("/build-a.png");
    expect(assetForCitizen("farmer", "walking", 1).url).toContain(
      "/runtime/v4/people/farmer-walk-1.png",
    );
    expect(assetForCitizen("artisan", "working", 0).url).toContain(
      "/runtime/v4/people/artisan-work-0.png",
    );
  });

  it("四类职业人物各有两帧独立的 v4 高保真素材", () => {
    for (const [role, assets] of Object.entries(CITIZEN_ASSETS)) {
      expect(assets).toHaveLength(2);
      expect(new Set(assets.map((asset) => asset.url)).size).toBe(2);
      for (const asset of assets) {
        expect(asset.url).toContain(`/runtime/v4/people/${role}-walk-`);
        expect(asset.pixelHeight).toBeGreaterThan(700);
        expect(asset.worldHeight).toBeGreaterThan(2);
      }
    }
    for (const [role, assets] of Object.entries(CITIZEN_WORK_ASSETS)) {
      expect(assets).toHaveLength(2);
      expect(new Set(assets.map((asset) => asset.url)).size).toBe(2);
      for (const asset of assets) {
        expect(asset.url).toContain(`/runtime/v4/people/${role}-work-`);
        expect(asset.pixelHeight).toBeGreaterThan(650);
      }
    }
  });

  it.each(["wheat", "soybean", "rice", "millet", "cabbage"] as const)(
    "为 %s 农场返回独立透明作物素材",
    (cropType) => {
      const asset = assetForFarmCrop(cropType);
      expect(asset.url).toContain(`/runtime/v3/crops/${cropType}.png`);
      expect(asset.anchorY).toBeGreaterThan(0);
    },
  );

  it("麻田和织坊使用独立 v3 产业素材", () => {
    expect(INDUSTRY_ASSETS["hemp-farm"].url).toContain(
      "/runtime/v3/industry/hemp-farm.png",
    );
    expect(assetForBuilding("weaver").url).toContain(
      "/runtime/v3/industry/weaver.png",
    );
  });

  it("兵器作坊和步兵营使用独立 v3 军事素材", () => {
    expect(MILITARY_ASSETS.weaponsmith.url).toContain(
      "/runtime/v3/military/weaponsmith.png",
    );
    expect(assetForBuilding("infantry-fort").url).toContain(
      "/runtime/v3/military/infantry-fort.png",
    );
  });

  it("政府、娱乐与贸易建筑各自使用独立 v3 高保真素材", () => {
    expect(GOVERNMENT_ASSETS["tax-office"].url).toBe(
      "/assets/runtime/v3/government/tax-office.png",
    );
    expect(ENTERTAINMENT_ASSETS["music-school"].url).toBe(
      "/assets/runtime/v3/entertainment/music-school.png",
    );
    expect(COMMERCE_ASSETS["trading-post"].url).toBe(
      "/assets/runtime/v3/commerce/trading-post.png",
    );
    for (const asset of [
      ...Object.values(GOVERNMENT_ASSETS),
      ...Object.values(ENTERTAINMENT_ASSETS),
      ...Object.values(COMMERCE_ASSETS),
    ]) {
      expect(asset.pixelWidth).toBeGreaterThan(1000);
      // 横向等距建筑的画幅可以比传统近方形建筑更矮；仍要求足够的原生细节。
      expect(asset.pixelHeight).toBeGreaterThan(800);
      expect(asset.worldHeight).toBeGreaterThan(8);
      expect(asset.anchorY).toBeGreaterThan(0);
      expect(asset.groundingFootprint).toBeGreaterThan(0);
    }
  });

  it("城门使用独立地面锚点，避免入口和道路错位", () => {
    expect(RUNTIME_ASSETS["gate.main"].groundingFootprint).toBeGreaterThan(0);
    expect(RUNTIME_ASSETS["gate.main"].groundingFootprint).toBeLessThan(1);
  });

  it("道路 0～15 四邻接掩码一一对应 16 张 v2 真实贴图", () => {
    expect(ROAD_AUTOTILE_ASSETS).toHaveLength(16);
    expect(new Set(ROAD_AUTOTILE_ASSETS.map((asset) => asset.url)).size).toBe(
      16,
    );
    expect(assetForRoadMask(0).url).toContain("/v2/roads/00-isolated.png");
    expect(assetForRoadMask(3).url).toContain("/v2/roads/03-ne.png");
    expect(assetForRoadMask(15).url).toContain("/v2/roads/0f-nesw.png");
    for (const asset of ROAD_AUTOTILE_ASSETS) {
      expect(asset.url).toMatch(/^\/assets\/runtime\/v2\/roads\/.+\.png$/);
      expect(asset.pixelWidth).toBe(512);
      expect(asset.pixelHeight).toBe(512);
    }
  });
});
