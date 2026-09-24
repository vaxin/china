import { describe, expect, it } from "vitest";

import {
  createSuburbanRoadSurface,
  createSuburbanTerraceField,
  createSuburbanTerraceGeometry,
  sampleSuburbanTerrain,
  suburbanTerraceElevationAt,
} from "./suburban-terrain";

describe("郊野高地高度采样", () => {
  it("同一种子可复现地貌且城域与城界严格为平地", () => {
    const coordinates = [
      { x: -18, y: -12 },
      { x: 16, y: -20 },
      { x: 48, y: 46 },
      { x: 16, y: 16 },
    ];

    expect(
      coordinates.map(({ x, y }) => sampleSuburbanTerrain(x, y, 0x28_07_14)),
    ).toEqual(
      coordinates.map(({ x, y }) => sampleSuburbanTerrain(x, y, 0x28_07_14)),
    );

    for (const { x, y } of [
      { x: 0, y: 0 },
      { x: 16, y: 16 },
      { x: 32, y: 32 },
      { x: 0, y: 15.5 },
      { x: 32, y: 8 },
    ]) {
      expect(sampleSuburbanTerrain(x, y, 1).elevation).toBe(0);
    }
  });

  it("固定构图在北侧与东南侧形成高塬并让种子改变次级起伏", () => {
    const seed = 0x28_07_14;
    const maxElevation = (coordinates: Array<{ x: number; y: number }>) =>
      Math.max(
        ...coordinates.map(
          ({ x, y }) => sampleSuburbanTerrain(x, y, seed).elevation,
        ),
      );
    const rectangle = (
      minX: number,
      maxX: number,
      minY: number,
      maxY: number,
    ) => {
      const coordinates: Array<{ x: number; y: number }> = [];
      for (let y = minY; y <= maxY; y += 2) {
        for (let x = minX; x <= maxX; x += 2) coordinates.push({ x, y });
      }
      return coordinates;
    };

    expect(maxElevation(rectangle(-4, 36, -28, -10))).toBeGreaterThanOrEqual(8);
    expect(maxElevation(rectangle(38, 60, 38, 60))).toBeGreaterThanOrEqual(8);
    expect(maxElevation(rectangle(0, 32, 38, 58))).toBeGreaterThanOrEqual(4);

    const landmark = { x: 14.25, y: -18.5 };
    expect(
      sampleSuburbanTerrain(landmark.x, landmark.y, seed).elevation,
    ).not.toBe(
      sampleSuburbanTerrain(landmark.x, landmark.y, seed + 1).elevation,
    );
  });

  it("西门低谷保持开阔且全郊野高度与坡度受限", () => {
    const seed = 0x28_07_14;
    for (let x = -31; x <= 0; x += 1) {
      expect(
        sampleSuburbanTerrain(x, 15.5, seed).elevation,
      ).toBeLessThanOrEqual(0.6);
      for (const y of [11.5, 19.5]) {
        expect(sampleSuburbanTerrain(x, y, seed).elevation).toBeLessThanOrEqual(
          4,
        );
      }
    }

    for (let y = -32; y <= 64; y += 1) {
      for (let x = -32; x <= 64; x += 1) {
        const sample = sampleSuburbanTerrain(x, y, seed);
        expect(Number.isFinite(sample.elevation)).toBe(true);
        expect(Number.isFinite(sample.slope)).toBe(true);
        expect(sample.elevation).toBeGreaterThanOrEqual(0);
        expect(sample.elevation).toBeLessThanOrEqual(14);
        expect(sample.slope).toBeLessThanOrEqual(0.75);
      }
    }
  });
});

describe("郊野离散台地", () => {
  it("把连续地貌量化为 0～4 级且相邻顶点最多跨一级", () => {
    const field = createSuburbanTerraceField({ seed: 0x28_07_14 });

    expect(field.verticesPerSide).toBe(97);
    expect(field.levels).toHaveLength(97 * 97);
    expect(new Set(field.levels)).toEqual(new Set([0, 1, 2, 3, 4]));

    for (let row = 0; row < field.verticesPerSide; row += 1) {
      for (let column = 0; column < field.verticesPerSide; column += 1) {
        const level = field.levels[row * field.verticesPerSide + column];
        expect(Number.isInteger(level)).toBe(true);
        expect(level).toBeGreaterThanOrEqual(0);
        expect(level).toBeLessThanOrEqual(4);
        if (column + 1 < field.verticesPerSide) {
          expect(
            Math.abs(
              level - field.levels[row * field.verticesPerSide + column + 1],
            ),
          ).toBeLessThanOrEqual(1);
        }
        if (row + 1 < field.verticesPerSide) {
          expect(
            Math.abs(
              level - field.levels[(row + 1) * field.verticesPerSide + column],
            ),
          ).toBeLessThanOrEqual(1);
        }
      }
    }

    const cityVertex = (tileX: number, tileY: number) =>
      field.levels[
        (tileY - field.minimumTile) * field.verticesPerSide +
          tileX -
          field.minimumTile
      ];
    expect(cityVertex(0, 0)).toBe(0);
    expect(cityVertex(16, 16)).toBe(0);
    expect(cityVertex(32, 32)).toBe(0);
  });

  it("把环形地形严格分成平坦顶面和有高差的土坡面", () => {
    const terrain = createSuburbanTerraceGeometry({ seed: 0x28_07_14 });
    const expectedTriangles = (96 * 96 - 32 * 32) * 2;

    expect(terrain.stats.topTriangles).toBeGreaterThan(0);
    expect(terrain.stats.slopeTriangles).toBeGreaterThan(400);
    expect(terrain.stats.topTriangles + terrain.stats.slopeTriangles).toBe(
      expectedTriangles,
    );
    expect(terrain.stats.maximumLevel).toBe(4);

    for (const geometry of [terrain.tops, terrain.slopes]) {
      expect(geometry.normals).toHaveLength(geometry.positions.length);
      expect(geometry.uvs).toHaveLength((geometry.positions.length / 3) * 2);
      expect(geometry.colors).toHaveLength((geometry.positions.length / 3) * 4);
      expect(geometry.positions.every(Number.isFinite)).toBe(true);
    }
    expect(
      new Set(terrain.tops.colors.map((value) => value.toFixed(3))).size,
    ).toBeGreaterThan(8);

    const triangleHeights = (
      geometry: (typeof terrain)["tops"],
      offset: number,
    ) =>
      geometry.indices
        .slice(offset, offset + 3)
        .map((vertexIndex) => geometry.positions[vertexIndex * 3 + 1]);
    for (let offset = 0; offset < terrain.tops.indices.length; offset += 3) {
      expect(new Set(triangleHeights(terrain.tops, offset)).size).toBe(1);
    }
    for (let offset = 0; offset < terrain.slopes.indices.length; offset += 3) {
      expect(
        new Set(triangleHeights(terrain.slopes, offset)).size,
      ).toBeGreaterThan(1);
    }
  });

  it("为坡地道路提供与台地完全一致的四角高度", () => {
    const field = createSuburbanTerraceField({ seed: 0x28_07_14 });
    let slopedRoad: ReturnType<typeof createSuburbanRoadSurface> | undefined;
    let slopedRoadTile: { x: number; y: number } | undefined;

    for (let tileY = -32; tileY < 64 && !slopedRoad; tileY += 1) {
      for (let tileX = -32; tileX < 64; tileX += 1) {
        const surface = createSuburbanRoadSurface(field, tileX, tileY);
        if (surface.isSlope) {
          slopedRoad = surface;
          slopedRoadTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(slopedRoad).toBeDefined();
    expect(slopedRoad!.positions).toHaveLength(12);
    expect(slopedRoad!.indices).toEqual([3, 1, 0, 2, 3, 0]);
    expect(slopedRoad!.uvs).toEqual([0, 1, 1, 1, 0, 0, 1, 0]);
    const slopeHeights = [0, 1, 2, 3].map(
      (vertex) => slopedRoad!.positions[vertex * 3 + 1],
    );
    expect(new Set(slopeHeights).size).toBeGreaterThan(1);
    expect(Math.max(...slopeHeights) - Math.min(...slopeHeights)).toBe(3);

    expect(slopedRoadTile).toEqual({ x: -25, y: -31 });

    expect(createSuburbanRoadSurface(field, -5, 17).isSlope).toBe(true);
    expect(sampleSuburbanTerrain(-4.5, 17.5, 0x28_07_14).slope).toBeGreaterThan(
      0.12,
    );

    const cityRoad = createSuburbanRoadSurface(field, 16, 16);
    expect(cityRoad.isSlope).toBe(false);
    expect(
      [0, 1, 2, 3].map((vertex) => cityRoad.positions[vertex * 3 + 1]),
    ).toEqual([0.055, 0.055, 0.055, 0.055]);
    expect(suburbanTerraceElevationAt(field, 16, 16)).toBe(0);
    expect(suburbanTerraceElevationAt(field, -5, 18)).toBe(3);
  });

  it("非法种子会明确失败以便渲染入口降级为平地", () => {
    expect(() => createSuburbanTerraceGeometry({ seed: Number.NaN })).toThrow(
      "郊野地形种子必须是有限数值",
    );
  });
});
