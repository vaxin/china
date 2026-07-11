import { describe, expect, it } from "vitest";

import { eraStateAtTick } from "./era-capabilities";

describe("年代能力表", () => {
  it("元年包含当前农业、纺织和步兵基础能力", () => {
    expect(eraStateAtTick(0)).toMatchObject({
      year: 1,
      eraName: "聚落奠基",
      unlocked: ["food-variety", "hemp-textiles", "bronze-infantry"],
      nextUnlock: { year: 2, capability: "paper-administration" },
    });
  });

  it.each([
    [11, 1, "聚落奠基", false],
    [12, 2, "文书初兴", true],
    [24, 3, "百家并立", true],
    [36, 4, "丝路盛世", true],
  ] as const)(
    "tick %i 映射到第 %i 年 %s",
    (tick, year, eraName, hasAdvancedAbility) => {
      const state = eraStateAtTick(tick);
      expect(state.year).toBe(year);
      expect(state.eraName).toBe(eraName);
      expect(state.unlocked.includes("paper-administration")).toBe(
        hasAdvancedAbility,
      );
    },
  );

  it("同一 tick 重算结果完全确定且返回值不可被调用方污染", () => {
    const first = eraStateAtTick(24);
    first.unlocked.push("cavalry");
    expect(eraStateAtTick(24).unlocked).not.toContain("cavalry");
  });
});
