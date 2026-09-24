import { describe, expect, it } from "vitest";

import {
  DEFAULT_TERRAIN_CONTRACT,
  isFootprintBuildableOnTerrain,
  isTileInsideTerrain,
  sampleTerrain,
  sampleTerrainCover,
  terrainTileKey,
} from "./index";

describe("共享地形拓扑", () => {
  it("保留原 32×32 城区坐标并把可玩土地扩展到 96×96", () => {
    expect(DEFAULT_TERRAIN_CONTRACT).toEqual({
      originX: -32,
      originY: -32,
      width: 96,
      height: 96,
      seed: 0x28_07_14,
      maxBuildableSlope: 0.12,
    });
    expect(isTileInsideTerrain({ x: -32, y: -32 })).toBe(true);
    expect(isTileInsideTerrain({ x: 63, y: 63 })).toBe(true);
    expect(isTileInsideTerrain({ x: -33, y: 0 })).toBe(false);
    expect(isTileInsideTerrain({ x: 64, y: 0 })).toBe(false);
  });

  it("城区保持纯土地，郊区形成连续且可复现的草地、灌草与碎石斑块", () => {
    const contract = DEFAULT_TERRAIN_CONTRACT;
    for (let y = 0; y < 32; y += 1) {
      for (let x = 0; x < 32; x += 1) {
        expect(sampleTerrainCover(x + 0.5, y + 0.5, contract)).toEqual({
          kind: "dirt",
          grassBlend: 0,
          stoneBlend: 0,
          vegetationObstacle: false,
        });
      }
    }

    const counts = new Map<string, number>();
    let adjacentDifferenceTotal = 0;
    let adjacentPairs = 0;
    for (
      let y = contract.originY;
      y < contract.originY + contract.height;
      y += 1
    ) {
      for (
        let x = contract.originX;
        x < contract.originX + contract.width;
        x += 1
      ) {
        if (x >= 0 && x < 32 && y >= 0 && y < 32) continue;
        const sample = sampleTerrainCover(x + 0.5, y + 0.5, contract);
        counts.set(sample.kind, (counts.get(sample.kind) ?? 0) + 1);
        expect(sample).toEqual(sampleTerrainCover(x + 0.5, y + 0.5, contract));
        if (x + 1 < contract.originX + contract.width) {
          adjacentDifferenceTotal += Math.abs(
            sample.grassBlend -
              sampleTerrainCover(x + 1.5, y + 0.5, contract).grassBlend,
          );
          adjacentPairs += 1;
        }
      }
    }

    expect(counts.get("meadow")).toBeGreaterThan(600);
    expect(counts.get("scrub")).toBeGreaterThan(300);
    expect(counts.get("stone")).toBeGreaterThan(100);
    expect(counts.get("dirt")).toBeGreaterThan(1000);
    expect(adjacentDifferenceTotal / adjacentPairs).toBeLessThan(0.08);

    let nearestObstacle: { x: number; y: number; distance: number } | undefined;
    for (
      let y = contract.originY;
      y < contract.originY + contract.height;
      y += 1
    ) {
      for (
        let x = contract.originX;
        x < contract.originX + contract.width;
        x += 1
      ) {
        if (!sampleTerrainCover(x + 0.5, y + 0.5, contract).vegetationObstacle)
          continue;
        const distance = Math.hypot(x - 4, y - 16);
        if (!nearestObstacle || distance < nearestObstacle.distance) {
          nearestObstacle = { x, y, distance };
        }
      }
    }
    expect(nearestObstacle).toMatchObject({ x: -3, y: 21 });
  });

  it("负坐标与原城区坐标不会产生格键碰撞", () => {
    const coordinates = [
      { x: -32, y: -32 },
      { x: 0, y: 0 },
      { x: 31, y: 31 },
      { x: 63, y: 63 },
    ];
    expect(new Set(coordinates.map(terrainTileKey)).size).toBe(
      coordinates.length,
    );
  });

  it("平坦土地可建设，坡地不可建设，高而平的土地不因海拔被拒绝", () => {
    const contract = DEFAULT_TERRAIN_CONTRACT;
    const samples = [];
    for (
      let y = contract.originY;
      y < contract.originY + contract.height;
      y += 1
    ) {
      for (
        let x = contract.originX;
        x < contract.originX + contract.width;
        x += 1
      ) {
        samples.push({ x, y, ...sampleTerrain(x + 0.5, y + 0.5, contract) });
      }
    }
    const steep = samples.find(
      (sample) => sample.slope > contract.maxBuildableSlope,
    );
    const highAndFlat = samples.find(
      (sample) =>
        sample.elevation >= 4 && sample.slope <= contract.maxBuildableSlope,
    );

    expect(steep).toBeDefined();
    expect(highAndFlat).toBeDefined();
    expect(isFootprintBuildableOnTerrain(-20, 15, 1, 1, contract)).toBe(true);
    expect(
      isFootprintBuildableOnTerrain(steep!.x, steep!.y, 1, 1, contract),
    ).toBe(false);
    expect(
      isFootprintBuildableOnTerrain(
        highAndFlat!.x,
        highAndFlat!.y,
        1,
        1,
        contract,
      ),
    ).toBe(true);
  });
});
