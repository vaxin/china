import { describe, expect, it } from "vitest";

import { desirabilityAtSite, elementAtTile, fengShuiAtSite } from "./feng-shui";

describe("风水与宜居度解释层", () => {
  it("地格五行完全确定且覆盖五种元素", () => {
    const elements = new Set(
      Array.from({ length: 10 }, (_, x) => elementAtTile(x, 0)),
    );
    expect(elements).toEqual(
      new Set(["wood", "fire", "earth", "metal", "water"]),
    );
    expect(elementAtTile(7, 9)).toBe(elementAtTile(7, 9));
  });

  it("建筑风水说明地格元素、偏好元素与生克结果", () => {
    expect(fengShuiAtSite("well", 0, 0)).toEqual({
      siteElement: "wood",
      preferredElement: "water",
      status: "harmonious",
      reason: "水生木，地气相生",
    });
    expect(fengShuiAtSite("weaponsmith", 0, 0)).toMatchObject({
      preferredElement: "metal",
      status: "conflicting",
    });
    expect(fengShuiAtSite("well", 16, 16)).toMatchObject({
      siteElement: "metal",
      preferredElement: "water",
      status: "harmonious",
      reason: "金生水，地气相生",
    });
  });

  it("宜居度只看服务与污染，不因五行状态偷偷改分", () => {
    const buildings = [
      { typeId: "well", x: 5, y: 5 },
      { typeId: "market", x: 6, y: 5 },
      { typeId: "weaponsmith", x: 12, y: 12 },
    ];
    expect(desirabilityAtSite(buildings, 5, 6)).toEqual({
      score: 3,
      reasons: ["近水井 +1", "近市场 +2"],
    });
    expect(desirabilityAtSite(buildings, 12, 11)).toEqual({
      score: -2,
      reasons: ["近兵器作坊 -2"],
    });
  });
});
