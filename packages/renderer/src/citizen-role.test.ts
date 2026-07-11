import { describe, expect, it } from "vitest";

import { citizenVisualRole } from "./citizen-role";

describe("市民职业视觉角色", () => {
  it.each([
    ["farm", "farmer"],
    ["hemp-farm", "farmer"],
    ["weaver", "artisan"],
    ["weaponsmith", "artisan"],
    ["granary", "merchant"],
    ["market", "merchant"],
    ["trading-post", "merchant"],
    ["well", "official"],
    ["tax-office", "official"],
    ["music-school", "official"],
    [null, "resident"],
  ] as const)("岗位 %s 显示为 %s", (buildingType, expected) => {
    expect(citizenVisualRole(buildingType)).toBe(expected);
  });
});
