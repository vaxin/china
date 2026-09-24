import type { TileCoordinate } from "./index";

export interface TerrainContract {
  originX: number;
  originY: number;
  width: number;
  height: number;
  seed: number;
  maxBuildableSlope: number;
}

export type TerrainRegion =
  "city-apron" | "gate-valley" | "rolling-hills" | "highland";

export interface TerrainSample {
  elevation: number;
  slope: number;
  region: TerrainRegion;
}

export type TerrainCoverKind = "dirt" | "meadow" | "scrub" | "stone";

export interface TerrainCoverSample {
  kind: TerrainCoverKind;
  grassBlend: number;
  stoneBlend: number;
  vegetationObstacle: boolean;
}

export const DEFAULT_TERRAIN_CONTRACT: TerrainContract = Object.freeze({
  originX: -32,
  originY: -32,
  width: 96,
  height: 96,
  seed: 0x28_07_14,
  maxBuildableSlope: 0.12,
});

const CITY_SIZE = 32;
const TILE_SIZE_METERS = 4;

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

export function terrainElevationAt(
  tileX: number,
  tileY: number,
  contract: TerrainContract = DEFAULT_TERRAIN_CONTRACT,
) {
  if (!Number.isFinite(tileX) || !Number.isFinite(tileY)) return 0;
  if (tileX >= 0 && tileX <= CITY_SIZE && tileY >= 0 && tileY <= CITY_SIZE) {
    return 0;
  }

  const ringMaximumX = contract.originX + contract.width;
  const ringMaximumY = contract.originY + contract.height;
  const distanceToRingEdge = Math.min(
    tileX - contract.originX,
    ringMaximumX - tileX,
    tileY - contract.originY,
    ringMaximumY - tileY,
  );
  if (distanceToRingEdge <= 0) return 0;

  const cityFade = smoothstep(1.5, 10, distanceOutsideCity(tileX, tileY));
  const outerFade = smoothstep(0, 6, distanceToRingEdge);
  const noise = terrainNoise(tileX, tileY, contract.seed);
  const ridge = 1 - Math.abs(noise * 2 - 1);
  const composition =
    2.4 +
    gaussian(tileX, tileY, 14, -20, 27, 15) * 10.6 +
    gaussian(tileX, tileY, 48, 48, 19, 20) * 10.2 +
    gaussian(tileX, tileY, 12, 48, 27, 19) * 4.8 +
    gaussian(tileX, tileY, -18, -10, 18, 19) * 3.8 +
    gaussian(tileX, tileY, 50, 8, 18, 24) * 3.2;
  let elevation = clamp(
    (composition * (0.72 + noise * 0.38) + ridge * 0.9) * cityFade * outerFade,
    0,
    14,
  );
  if (tileX <= 0 && Math.abs(tileY - 15.5) <= 4) {
    const distanceFromGateAxis = Math.abs(tileY - 15.5);
    elevation = Math.min(
      elevation,
      0.5 + smoothstep(0, 4, distanceFromGateAxis) * 3.5,
    );
  }
  return elevation;
}

export function sampleTerrain(
  tileX: number,
  tileY: number,
  contract: TerrainContract = DEFAULT_TERRAIN_CONTRACT,
): TerrainSample {
  const elevation = terrainElevationAt(tileX, tileY, contract);
  const heightWest = terrainElevationAt(tileX - 0.5, tileY, contract);
  const heightEast = terrainElevationAt(tileX + 0.5, tileY, contract);
  const heightNorth = terrainElevationAt(tileX, tileY - 0.5, contract);
  const heightSouth = terrainElevationAt(tileX, tileY + 0.5, contract);
  const slope = Math.hypot(
    (heightEast - heightWest) / TILE_SIZE_METERS,
    (heightSouth - heightNorth) / TILE_SIZE_METERS,
  );
  const outsideDistance = distanceOutsideCity(tileX, tileY);
  const insideCity =
    tileX >= 0 && tileX <= CITY_SIZE && tileY >= 0 && tileY <= CITY_SIZE;
  return {
    elevation,
    slope,
    region:
      insideCity || outsideDistance <= 2
        ? "city-apron"
        : tileX <= 0 && Math.abs(tileY - 15.5) <= 4
          ? "gate-valley"
          : elevation >= 6
            ? "highland"
            : "rolling-hills",
  };
}

export function sampleTerrainCover(
  tileX: number,
  tileY: number,
  contract: TerrainContract = DEFAULT_TERRAIN_CONTRACT,
): TerrainCoverSample {
  const insideCity =
    tileX >= 0 && tileX <= CITY_SIZE && tileY >= 0 && tileY <= CITY_SIZE;
  if (insideCity || !Number.isFinite(tileX) || !Number.isFinite(tileY)) {
    return {
      kind: "dirt",
      grassBlend: 0,
      stoneBlend: 0,
      vegetationObstacle: false,
    };
  }

  const suburbanFade = smoothstep(0.35, 4.5, distanceOutsideCity(tileX, tileY));
  const moisture = terrainNoise(
    tileX + 117.5,
    tileY - 83.25,
    contract.seed ^ 0x5a17_31c9,
  );
  const geology = terrainNoise(
    tileX - 61.75,
    tileY + 94.5,
    contract.seed ^ 0x2d8f_4b61,
  );
  const grassBlend = smoothstep(0.36, 0.72, moisture) * suburbanFade;
  const stoneBlend =
    smoothstep(0.68, 0.88, geology) * (1 - grassBlend * 0.72) * suburbanFade;
  const kind: TerrainCoverKind =
    grassBlend >= 0.58
      ? "meadow"
      : grassBlend >= 0.27
        ? "scrub"
        : stoneBlend >= 0.38
          ? "stone"
          : "dirt";
  return {
    kind,
    grassBlend,
    stoneBlend,
    vegetationObstacle: kind === "meadow" || kind === "scrub",
  };
}

export function terrainNormalAt(
  tileX: number,
  tileY: number,
  contract: TerrainContract = DEFAULT_TERRAIN_CONTRACT,
) {
  const gradientX =
    (terrainElevationAt(tileX + 0.5, tileY, contract) -
      terrainElevationAt(tileX - 0.5, tileY, contract)) /
    TILE_SIZE_METERS;
  const gradientZ =
    (terrainElevationAt(tileX, tileY + 0.5, contract) -
      terrainElevationAt(tileX, tileY - 0.5, contract)) /
    TILE_SIZE_METERS;
  const length = Math.hypot(gradientX, 1, gradientZ);
  return [-gradientX / length, 1 / length, -gradientZ / length] as const;
}

export function isTileInsideTerrain(
  tile: TileCoordinate,
  contract: TerrainContract = DEFAULT_TERRAIN_CONTRACT,
) {
  return (
    Number.isInteger(tile.x) &&
    Number.isInteger(tile.y) &&
    tile.x >= contract.originX &&
    tile.y >= contract.originY &&
    tile.x < contract.originX + contract.width &&
    tile.y < contract.originY + contract.height
  );
}

export function terrainTileKey(tile: TileCoordinate): string {
  return `${tile.x},${tile.y}`;
}

export function isTerrainTileBuildable(
  tile: TileCoordinate,
  contract: TerrainContract = DEFAULT_TERRAIN_CONTRACT,
) {
  return (
    isTileInsideTerrain(tile, contract) &&
    sampleTerrain(tile.x + 0.5, tile.y + 0.5, contract).slope <=
      contract.maxBuildableSlope
  );
}

export function isFootprintBuildableOnTerrain(
  x: number,
  y: number,
  width: number,
  height: number,
  contract: TerrainContract = DEFAULT_TERRAIN_CONTRACT,
) {
  for (let offsetY = 0; offsetY < height; offsetY += 1) {
    for (let offsetX = 0; offsetX < width; offsetX += 1) {
      if (
        !isTerrainTileBuildable({ x: x + offsetX, y: y + offsetY }, contract)
      ) {
        return false;
      }
    }
  }
  return true;
}
