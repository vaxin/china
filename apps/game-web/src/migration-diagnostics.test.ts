import { describe, expect, it } from "vitest";
import type { WorldSnapshot } from "@empire/protocol";

import { constructionDiagnostic } from "./migration-diagnostics";

function world(overrides: Partial<WorldSnapshot> = {}): WorldSnapshot {
  const base: WorldSnapshot = {
    map: { width: 32, height: 32 },
    tick: 1,
    revision: 1,
    buildings: [
      {
        id: 1,
        typeId: "house",
        x: 2,
        y: 13,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        level: 1,
        constructionStage: 0,
      },
    ],
    roads: [],
    households: [],
    migrants: [],
    economy: {
      treasury: 500,
      taxRate: "standard",
      lastTaxRevenue: 0,
      lastPayroll: 0,
      taxableHouses: 0,
      sentiment: 50,
      lastTradeRevenue: 0,
    },
  };
  return { ...base, ...overrides };
}

describe("宅基地迁入诊断", () => {
  it("迁引不足时明确提示停迁，而不是笼统等待", () => {
    expect(
      constructionDiagnostic(
        world({
          economy: {
            treasury: 500,
            taxRate: "standard",
            lastTaxRevenue: 0,
            lastPayroll: 0,
            taxableHouses: 0,
            sentiment: 35,
            lastTradeRevenue: 0,
          },
        }),
      ),
    ).toContain("迁引 35 停迁");
  });

  it("缺少城门入口格时指出精确坐标", () => {
    expect(constructionDiagnostic(world())).toContain("城门入口 (0,15) 未铺路");
  });

  it("道路未贴宅基地时指出仍待接路的数量", () => {
    expect(
      constructionDiagnostic(
        world({
          roads: [
            { x: 0, y: 15 },
            { x: 1, y: 15 },
          ],
        }),
      ),
    ).toContain("1 处宅基地未贴城门连通道路");
  });

  it("条件齐全时说明等待下一月流民出发", () => {
    expect(
      constructionDiagnostic(
        world({
          roads: [
            { x: 0, y: 15 },
            { x: 1, y: 15 },
            { x: 2, y: 15 },
          ],
        }),
      ),
    ).toContain("条件已满足，等待下一月流民出发");
  });
});
