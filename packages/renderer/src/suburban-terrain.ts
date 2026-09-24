import {
  DEFAULT_TERRAIN_CONTRACT,
  sampleTerrainCover,
  sampleTerrain,
  terrainNormalAt,
  type TerrainRegion,
  type TerrainSample as SharedTerrainSample,
} from "@empire/protocol";

export type SuburbanTerrainRegion = TerrainRegion;

export type TerrainSample = SharedTerrainSample;

export interface SuburbanTerrainGeometry {
  positions: number[];
  indices: number[];
  normals: number[];
  uvs: number[];
  colors: number[];
}

export interface SuburbanTerraceField {
  minimumTile: number;
  verticesPerSide: number;
  levels: number[];
}

export interface SuburbanTerraceGeometry {
  tops: SuburbanTerrainGeometry;
  slopes: SuburbanTerrainGeometry;
  stats: {
    topTriangles: number;
    slopeTriangles: number;
    maximumLevel: number;
  };
}

export interface SuburbanRoadSurface {
  positions: number[];
  indices: number[];
  normals: number[];
  uvs: number[];
  isSlope: boolean;
}

export interface TerrainLinePoint {
  x: number;
  y: number;
  z: number;
}

export type TerrainContourLine = readonly [TerrainLinePoint, TerrainLinePoint];

const CITY_SIZE = 32;
const SUBURBAN_MARGIN = 32;
const TILE_SIZE_METERS = 4;
const TERRACE_QUANTIZATION_METERS = 2;
const TERRACE_HEIGHT_METERS = 3;
const MAXIMUM_TERRACE_LEVEL = 4;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const normalized = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
}

function gaussian(
  tileX: number,
  tileY: number,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
) {
  const x = (tileX - centerX) / radiusX;
  const y = (tileY - centerY) / radiusY;
  return Math.exp(-(x * x + y * y) * 1.45);
}

function latticeValue(x: number, y: number, seed: number) {
  let value = Math.imul(x, 0x1f12_3bb5) ^ Math.imul(y, 0x5f35_6495);
  value = Math.imul(value ^ (seed | 0), 0x45d9_f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 0xffff_ffff;
}

function valueNoise(tileX: number, tileY: number, seed: number) {
  const x0 = Math.floor(tileX);
  const y0 = Math.floor(tileY);
  const blendX = smoothstep(0, 1, tileX - x0);
  const blendY = smoothstep(0, 1, tileY - y0);
  const northWest = latticeValue(x0, y0, seed);
  const northEast = latticeValue(x0 + 1, y0, seed);
  const southWest = latticeValue(x0, y0 + 1, seed);
  const southEast = latticeValue(x0 + 1, y0 + 1, seed);
  const north = northWest + (northEast - northWest) * blendX;
  const south = southWest + (southEast - southWest) * blendX;
  return north + (south - north) * blendY;
}

function terrainNoise(tileX: number, tileY: number, seed: number) {
  let amplitude = 0.58;
  let frequency = 0.055;
  let total = 0;
  let totalAmplitude = 0;
  for (let octave = 0; octave < 4; octave += 1) {
    total +=
      valueNoise(tileX * frequency, tileY * frequency, seed + octave * 7919) *
      amplitude;
    totalAmplitude += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return total / totalAmplitude;
}

function distanceOutsideCity(tileX: number, tileY: number) {
  const x = tileX < 0 ? -tileX : tileX > CITY_SIZE ? tileX - CITY_SIZE : 0;
  const y = tileY < 0 ? -tileY : tileY > CITY_SIZE ? tileY - CITY_SIZE : 0;
  return Math.hypot(x, y);
}

function elevationAt(tileX: number, tileY: number, seed: number) {
  if (!Number.isFinite(tileX) || !Number.isFinite(tileY)) return 0;
  if (tileX >= 0 && tileX <= CITY_SIZE && tileY >= 0 && tileY <= CITY_SIZE) {
    return 0;
  }

  const ringMinimum = -SUBURBAN_MARGIN;
  const ringMaximum = CITY_SIZE + SUBURBAN_MARGIN;
  const distanceToRingEdge = Math.min(
    tileX - ringMinimum,
    ringMaximum - tileX,
    tileY - ringMinimum,
    ringMaximum - tileY,
  );
  if (distanceToRingEdge <= 0) return 0;

  const cityFade = smoothstep(1.5, 10, distanceOutsideCity(tileX, tileY));
  const outerFade = smoothstep(0, 6, distanceToRingEdge);
  const northHighland = gaussian(tileX, tileY, 14, -20, 27, 15);
  const southEastHighland = gaussian(tileX, tileY, 48, 48, 19, 20);
  const southernHills = gaussian(tileX, tileY, 12, 48, 27, 19);
  const northWestHills = gaussian(tileX, tileY, -18, -10, 18, 19);
  const easternShoulder = gaussian(tileX, tileY, 50, 8, 18, 24);
  const noise = terrainNoise(tileX, tileY, seed);
  const ridge = 1 - Math.abs(noise * 2 - 1);
  const composition =
    2.4 +
    northHighland * 10.6 +
    southEastHighland * 10.2 +
    southernHills * 4.8 +
    northWestHills * 3.8 +
    easternShoulder * 3.2;
  const shaped = composition * (0.72 + noise * 0.38) + ridge * 0.9;

  let elevation = clamp(shaped * cityFade * outerFade, 0, 14);
  if (tileX <= 0) {
    const distanceFromGateAxis = Math.abs(tileY - 15.5);
    if (distanceFromGateAxis <= 4) {
      const valleyCeiling = 0.5 + smoothstep(0, 4, distanceFromGateAxis) * 3.5;
      elevation = Math.min(elevation, valleyCeiling);
    }
  }
  return elevation;
}

export function sampleSuburbanTerrain(
  tileX: number,
  tileY: number,
  seed: number,
): TerrainSample {
  return sampleTerrain(tileX, tileY, {
    ...DEFAULT_TERRAIN_CONTRACT,
    seed,
  });
}

function validateTerrainSeed(seed: number) {
  if (!Number.isFinite(seed)) {
    throw new Error("郊野地形种子必须是有限数值");
  }
}

export function createSuburbanTerraceField(options: {
  seed: number;
}): SuburbanTerraceField {
  validateTerrainSeed(options.seed);
  const cellsPerSide = CITY_SIZE + SUBURBAN_MARGIN * 2;
  const verticesPerSide = cellsPerSide + 1;
  const minimumTile = -SUBURBAN_MARGIN;
  const rawLevels: number[] = [];

  for (let row = 0; row < verticesPerSide; row += 1) {
    const tileY = minimumTile + row;
    for (let column = 0; column < verticesPerSide; column += 1) {
      const tileX = minimumTile + column;
      const insideCity =
        tileX >= 0 && tileX <= CITY_SIZE && tileY >= 0 && tileY <= CITY_SIZE;
      const elevation = sampleSuburbanTerrain(
        tileX,
        tileY,
        options.seed,
      ).elevation;
      rawLevels.push(
        insideCity
          ? 0
          : clamp(
              Math.round(elevation / TERRACE_QUANTIZATION_METERS),
              0,
              MAXIMUM_TERRACE_LEVEL,
            ),
      );
    }
  }

  let levels = rawLevels;
  for (let iteration = 0; iteration < MAXIMUM_TERRACE_LEVEL; iteration += 1) {
    const previous = levels;
    levels = previous.map((level, index) => {
      const row = Math.floor(index / verticesPerSide);
      const column = index % verticesPerSide;
      let maximumAllowed = rawLevels[index];
      if (column > 0)
        maximumAllowed = Math.min(maximumAllowed, previous[index - 1] + 1);
      if (column + 1 < verticesPerSide) {
        maximumAllowed = Math.min(maximumAllowed, previous[index + 1] + 1);
      }
      if (row > 0) {
        maximumAllowed = Math.min(
          maximumAllowed,
          previous[index - verticesPerSide] + 1,
        );
      }
      if (row + 1 < verticesPerSide) {
        maximumAllowed = Math.min(
          maximumAllowed,
          previous[index + verticesPerSide] + 1,
        );
      }
      return Math.min(level, maximumAllowed);
    });
  }

  return { minimumTile, verticesPerSide, levels };
}

function terraceLevelAt(
  field: SuburbanTerraceField,
  tileX: number,
  tileY: number,
) {
  const column = tileX - field.minimumTile;
  const row = tileY - field.minimumTile;
  if (
    !Number.isInteger(column) ||
    !Number.isInteger(row) ||
    column < 0 ||
    row < 0 ||
    column >= field.verticesPerSide ||
    row >= field.verticesPerSide
  ) {
    throw new Error(`道路地格 ${tileX},${tileY} 超出台地范围`);
  }
  return field.levels[row * field.verticesPerSide + column];
}

export function suburbanTerraceElevationAt(
  field: SuburbanTerraceField,
  tileX: number,
  tileY: number,
) {
  return terraceLevelAt(field, tileX, tileY) * TERRACE_HEIGHT_METERS;
}

export function createSuburbanRoadSurface(
  field: SuburbanTerraceField,
  tileX: number,
  tileY: number,
  lift = 0.055,
): SuburbanRoadSurface {
  const west = (tileX - CITY_SIZE / 2) * TILE_SIZE_METERS;
  const east = west + TILE_SIZE_METERS;
  const north = (tileY - CITY_SIZE / 2) * TILE_SIZE_METERS;
  const south = north + TILE_SIZE_METERS;
  const heightAt = (x: number, y: number) =>
    suburbanTerraceElevationAt(field, x, y) + lift;
  const heights = [
    heightAt(tileX, tileY + 1),
    heightAt(tileX + 1, tileY + 1),
    heightAt(tileX, tileY),
    heightAt(tileX + 1, tileY),
  ];
  const positions = [
    west,
    heights[0],
    south,
    east,
    heights[1],
    south,
    west,
    heights[2],
    north,
    east,
    heights[3],
    north,
  ];
  const indices = [3, 1, 0, 2, 3, 0];
  const normals = Array<number>(positions.length).fill(0);
  for (let offset = 0; offset < indices.length; offset += 3) {
    const first = indices[offset];
    const second = indices[offset + 1];
    const third = indices[offset + 2];
    const edgeA = [
      positions[second * 3] - positions[first * 3],
      positions[second * 3 + 1] - positions[first * 3 + 1],
      positions[second * 3 + 2] - positions[first * 3 + 2],
    ];
    const edgeB = [
      positions[third * 3] - positions[first * 3],
      positions[third * 3 + 1] - positions[first * 3 + 1],
      positions[third * 3 + 2] - positions[first * 3 + 2],
    ];
    const normal = [
      edgeA[1] * edgeB[2] - edgeA[2] * edgeB[1],
      edgeA[2] * edgeB[0] - edgeA[0] * edgeB[2],
      edgeA[0] * edgeB[1] - edgeA[1] * edgeB[0],
    ];
    if (normal[1] < 0)
      normal.forEach((value, index) => (normal[index] = -value));
    for (const vertex of [first, second, third]) {
      normals[vertex * 3] += normal[0];
      normals[vertex * 3 + 1] += normal[1];
      normals[vertex * 3 + 2] += normal[2];
    }
  }
  for (let vertex = 0; vertex < 4; vertex += 1) {
    const offset = vertex * 3;
    const length =
      Math.hypot(normals[offset], normals[offset + 1], normals[offset + 2]) ||
      1;
    normals[offset] /= length;
    normals[offset + 1] /= length;
    normals[offset + 2] /= length;
  }
  return {
    positions,
    indices,
    normals,
    uvs: [0, 1, 1, 1, 0, 0, 1, 0],
    isSlope: new Set(heights).size > 1,
  };
}

function emptyGeometry(): SuburbanTerrainGeometry {
  return { positions: [], indices: [], normals: [], uvs: [], colors: [] };
}

function appendTerraceTriangle(
  geometry: SuburbanTerrainGeometry,
  points: ReadonlyArray<readonly [number, number, number]>,
  isSlope: boolean,
  seed: number,
) {
  const vertexOffset = geometry.positions.length / 3;
  const [first, second, third] = points;
  const firstEdge = [
    second[0] - first[0],
    second[1] - first[1],
    second[2] - first[2],
  ];
  const secondEdge = [
    third[0] - first[0],
    third[1] - first[1],
    third[2] - first[2],
  ];
  const cross = [
    firstEdge[1] * secondEdge[2] - firstEdge[2] * secondEdge[1],
    firstEdge[2] * secondEdge[0] - firstEdge[0] * secondEdge[2],
    firstEdge[0] * secondEdge[1] - firstEdge[1] * secondEdge[0],
  ];
  const normalLength = Math.hypot(...cross) || 1;
  const normal = cross.map((value) => value / normalLength);

  for (const [worldX, elevation, worldZ] of points) {
    const tileX = worldX / TILE_SIZE_METERS + CITY_SIZE / 2;
    const tileY = worldZ / TILE_SIZE_METERS + CITY_SIZE / 2;
    const cover = sampleTerrainCover(tileX, tileY, {
      ...DEFAULT_TERRAIN_CONTRACT,
      seed,
    });
    const patchVariation =
      0.76 + terrainNoise(tileX + 211, tileY - 137, seed ^ 0x48d2_16f3) * 0.24;
    const soilVariation =
      0.95 + terrainNoise(tileX - 173, tileY + 89, seed ^ 0x713a_9c2d) * 0.08;
    const grassTint = cover.grassBlend * patchVariation;
    const color = isSlope
      ? ([0.92, 0.76, 0.52, 1] as const)
      : ([
          (1 - grassTint * 0.23 - cover.stoneBlend * 0.12) * soilVariation,
          (0.96 - grassTint * 0.06 - cover.stoneBlend * 0.12) * soilVariation,
          (0.86 - grassTint * 0.27 - cover.stoneBlend * 0.06) * soilVariation,
          1,
        ] as const);
    geometry.positions.push(worldX, elevation, worldZ);
    geometry.normals.push(...normal);
    geometry.colors.push(...color);
    geometry.uvs.push(
      isSlope ? (worldX - worldZ) / 8 : worldX / 16,
      isSlope ? elevation / TERRACE_HEIGHT_METERS : worldZ / 16,
    );
  }
  geometry.indices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2);
}

export function createSuburbanTerraceGeometry(options: {
  seed: number;
}): SuburbanTerraceGeometry {
  const field = createSuburbanTerraceField(options);
  const tops = emptyGeometry();
  const slopes = emptyGeometry();
  const cellsPerSide = field.verticesPerSide - 1;
  let topTriangles = 0;
  let slopeTriangles = 0;

  const point = (row: number, column: number) => {
    const tileX = field.minimumTile + column;
    const tileY = field.minimumTile + row;
    const level = field.levels[row * field.verticesPerSide + column];
    return [
      (tileX - CITY_SIZE / 2) * TILE_SIZE_METERS,
      level * TERRACE_HEIGHT_METERS,
      (tileY - CITY_SIZE / 2) * TILE_SIZE_METERS,
    ] as const;
  };

  for (let row = 0; row < cellsPerSide; row += 1) {
    const tileY = field.minimumTile + row;
    for (let column = 0; column < cellsPerSide; column += 1) {
      const tileX = field.minimumTile + column;
      if (tileX >= 0 && tileX < CITY_SIZE && tileY >= 0 && tileY < CITY_SIZE) {
        continue;
      }
      const northWest = point(row, column);
      const northEast = point(row, column + 1);
      const southWest = point(row + 1, column);
      const southEast = point(row + 1, column + 1);
      for (const triangle of [
        [northWest, southWest, northEast],
        [northEast, southWest, southEast],
      ] as const) {
        const isSlope = new Set(triangle.map((vertex) => vertex[1])).size > 1;
        appendTerraceTriangle(
          isSlope ? slopes : tops,
          triangle,
          isSlope,
          options.seed,
        );
        if (isSlope) slopeTriangles += 1;
        else topTriangles += 1;
      }
    }
  }

  return {
    tops,
    slopes,
    stats: {
      topTriangles,
      slopeTriangles,
      maximumLevel: Math.max(...field.levels),
    },
  };
}

function normalAt(tileX: number, tileY: number, seed: number) {
  return terrainNormalAt(tileX, tileY, {
    ...DEFAULT_TERRAIN_CONTRACT,
    seed,
  });
}

export function createSuburbanTerrainGeometry(options: {
  seed: number;
}): SuburbanTerrainGeometry {
  if (!Number.isFinite(options.seed)) {
    throw new Error("郊野地形种子必须是有限数值");
  }

  const cellsPerSide = CITY_SIZE + SUBURBAN_MARGIN * 2;
  const verticesPerSide = cellsPerSide + 1;
  const minimumTile = -SUBURBAN_MARGIN;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row < verticesPerSide; row += 1) {
    const tileY = minimumTile + row;
    for (let column = 0; column < verticesPerSide; column += 1) {
      const tileX = minimumTile + column;
      const sample = sampleSuburbanTerrain(tileX, tileY, options.seed);
      const worldX = (tileX - CITY_SIZE / 2) * TILE_SIZE_METERS;
      const worldZ = (tileY - CITY_SIZE / 2) * TILE_SIZE_METERS;
      positions.push(worldX, sample.elevation, worldZ);
      const normal = normalAt(tileX, tileY, options.seed);
      normals.push(...normal);
      uvs.push(worldX / 16, worldZ / 16);

      const heightBlend = sample.elevation / 14;
      const slopeBlend = clamp(sample.slope / 0.75, 0, 1);
      const lightLength = Math.hypot(-0.55, 1, 0.35);
      const directionalLight = Math.max(
        0,
        (normal[0] * -0.55 + normal[1] + normal[2] * 0.35) / lightLength,
      );
      const shade = 0.92 + directionalLight * 0.08;
      colors.push(
        clamp((0.96 + heightBlend * 0.12 - slopeBlend * 0.14) * shade, 0, 1),
        clamp((0.91 + heightBlend * 0.09 - slopeBlend * 0.17) * shade, 0, 1),
        clamp((0.82 + heightBlend * 0.06 - slopeBlend * 0.16) * shade, 0, 1),
        1,
      );
    }
  }

  for (let row = 0; row < cellsPerSide; row += 1) {
    const tileY = minimumTile + row;
    for (let column = 0; column < cellsPerSide; column += 1) {
      const tileX = minimumTile + column;
      const insideCity =
        tileX >= 0 && tileX < CITY_SIZE && tileY >= 0 && tileY < CITY_SIZE;
      if (insideCity) continue;
      const northWest = row * verticesPerSide + column;
      const northEast = northWest + 1;
      const southWest = northWest + verticesPerSide;
      const southEast = southWest + 1;
      indices.push(
        northWest,
        southWest,
        northEast,
        northEast,
        southWest,
        southEast,
      );
    }
  }

  return { positions, indices, normals, uvs, colors };
}

export function createSuburbanTerrainContourLines(options: {
  seed: number;
}): TerrainContourLine[] {
  if (!Number.isFinite(options.seed)) {
    throw new Error("郊野地形种子必须是有限数值");
  }

  const lines: TerrainContourLine[] = [];
  const minimumTile = -SUBURBAN_MARGIN;
  const maximumTile = CITY_SIZE + SUBURBAN_MARGIN;
  const contourLevels = [2, 4, 6, 8, 10, 12] as const;
  const pointAt = (
    startX: number,
    startY: number,
    startElevation: number,
    endX: number,
    endY: number,
    endElevation: number,
    level: number,
  ): TerrainLinePoint => {
    const difference = endElevation - startElevation;
    const amount =
      difference === 0 ? 0.5 : (level - startElevation) / difference;
    const tileX = startX + (endX - startX) * amount;
    const tileY = startY + (endY - startY) * amount;
    return {
      x: (tileX - CITY_SIZE / 2) * TILE_SIZE_METERS,
      y: level + 0.08,
      z: (tileY - CITY_SIZE / 2) * TILE_SIZE_METERS,
    };
  };
  const crosses = (start: number, end: number, level: number) =>
    (start < level && end >= level) || (end < level && start >= level);

  for (const level of contourLevels) {
    for (let tileY = minimumTile; tileY < maximumTile; tileY += 1) {
      for (let tileX = minimumTile; tileX < maximumTile; tileX += 1) {
        const insideCity =
          tileX >= 0 && tileX < CITY_SIZE && tileY >= 0 && tileY < CITY_SIZE;
        if (insideCity) continue;

        const northWest = elevationAt(tileX, tileY, options.seed);
        const northEast = elevationAt(tileX + 1, tileY, options.seed);
        const southEast = elevationAt(tileX + 1, tileY + 1, options.seed);
        const southWest = elevationAt(tileX, tileY + 1, options.seed);
        const intersections: TerrainLinePoint[] = [];
        if (crosses(northWest, northEast, level)) {
          intersections.push(
            pointAt(
              tileX,
              tileY,
              northWest,
              tileX + 1,
              tileY,
              northEast,
              level,
            ),
          );
        }
        if (crosses(northEast, southEast, level)) {
          intersections.push(
            pointAt(
              tileX + 1,
              tileY,
              northEast,
              tileX + 1,
              tileY + 1,
              southEast,
              level,
            ),
          );
        }
        if (crosses(southEast, southWest, level)) {
          intersections.push(
            pointAt(
              tileX + 1,
              tileY + 1,
              southEast,
              tileX,
              tileY + 1,
              southWest,
              level,
            ),
          );
        }
        if (crosses(southWest, northWest, level)) {
          intersections.push(
            pointAt(
              tileX,
              tileY + 1,
              southWest,
              tileX,
              tileY,
              northWest,
              level,
            ),
          );
        }
        for (let index = 0; index + 1 < intersections.length; index += 2) {
          lines.push([intersections[index], intersections[index + 1]]);
        }
      }
    }
  }

  return lines;
}
