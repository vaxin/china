import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera.js";
import { Camera } from "@babylonjs/core/Cameras/camera.js";
import "@babylonjs/core/Culling/ray.js";
import "@babylonjs/core/Meshes/instancedMesh.js";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents.js";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { Material } from "@babylonjs/core/Materials/material.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Texture } from "@babylonjs/core/Materials/Textures/texture.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder.js";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder.js";
import { CreateLineSystem } from "@babylonjs/core/Meshes/Builders/linesBuilder.js";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { Scene } from "@babylonjs/core/scene.js";
import {
  CITY_GATE_TILE,
  DEFAULT_TERRAIN_CONTRACT,
  FARM_FOOTPRINT,
  GRANARY_FOOTPRINT,
  HEMP_FARM_FOOTPRINT,
  INFANTRY_FORT_FOOTPRINT,
  HOUSE_FOOTPRINT,
  MAP_SIZE,
  MARKET_FOOTPRINT,
  MUSIC_SCHOOL_FOOTPRINT,
  TAX_OFFICE_FOOTPRINT,
  TRADING_POST_FOOTPRINT,
  WEAVER_FOOTPRINT,
  WEAPONSMITH_FOOTPRINT,
  isTileInsideTerrain,
  sampleTerrain,
  sampleTerrainCover,
  type TerrainCoverKind,
  type TerrainContract,
  type WorldSnapshot,
} from "@empire/protocol";
import {
  ROAD_AUTOTILE_ASSETS,
  FARM_CROP_ASSETS,
  INDUSTRY_ASSETS,
  MILITARY_ASSETS,
  GOVERNMENT_ASSETS,
  GROUND_COVER_ATLAS,
  ENTERTAINMENT_ASSETS,
  COMMERCE_ASSETS,
  CITIZEN_WALK_ASSETS,
  CITIZEN_WORK_ASSETS,
  RUNTIME_ASSETS,
  WALL_AUTOTILE_ASSET,
  WALL_JUNCTION_ASSETS,
  assetForBuilding,
  assetForCitizen,
  assetForFarmCrop,
  assetForHouseStage,
  assetForMigrant,
  assetForRoadMask,
  wallVisualForMask,
  type RuntimeAsset,
  type RuntimeSpriteSheetAsset,
} from "./runtime-assets";
import { citizenVisualRole, type CitizenVisualRole } from "./citizen-role";
import { roadConnectionMasks } from "./road-autotile";
import { rotateWallMaskForHeading, wallConnectionMasks } from "./wall-autotile";
import { spriteMirrorForHeading } from "./sprite-facing";
import { groundSpritePosition } from "./sprite-grounding";
import {
  createSuburbanRoadSurface,
  createSuburbanTerraceField,
  createSuburbanTerraceGeometry,
  suburbanTerraceElevationAt,
  type SuburbanTerraceField,
  type SuburbanTerrainGeometry,
} from "./suburban-terrain";
import {
  PERSON_STEP_TRANSITION_MS,
  personAnimationPhase,
  personPoseAt,
  presentedPersonAction,
  spriteDirectionRowForMovement,
  spriteMirrorForMovement,
  spriteSheetVOffset,
  type PersonAction,
} from "./person-motion";

export { PERSON_ACTIVITY_PULSE_MS } from "./person-motion";

const TILE_SIZE = 4;
const WORLD_SIZE = MAP_SIZE * TILE_SIZE;
const TERRAIN_REPEAT_WORLD_SIZE = WORLD_SIZE / 8;
const OUTER_TERRAIN_SIZE = WORLD_SIZE * 32;
const SUBURBAN_TERRAIN_SEED = 0x28_07_14;

type GroundCoverVariant = "dense-weeds" | "meadow" | "dry-scrub" | "stone";

function groundCoverVariation(x: number, y: number, salt: number) {
  let value = Math.imul(x ^ salt, 0x45d9_f3b) ^ Math.imul(y, 0x119d_e1f3);
  value ^= value >>> 16;
  return (value >>> 0) / 0xffff_ffff;
}

function groundCoverVariant(
  kind: TerrainCoverKind,
  grassBlend: number,
  x: number,
  y: number,
): GroundCoverVariant | null {
  const scatter = groundCoverVariation(x, y, 131);
  if (kind === "meadow") {
    if (scatter < 0.52) return null;
    return grassBlend > 0.78 && groundCoverVariation(x, y, 17) > 0.42
      ? "dense-weeds"
      : "meadow";
  }
  if (kind === "scrub") {
    if (scatter < 0.38) return null;
    return grassBlend > 0.45 ? "dense-weeds" : "dry-scrub";
  }
  return kind === "stone" && scatter >= 0.6 ? "stone" : null;
}

export interface CityRenderer {
  backend: string;
  setAnimationPaused(paused: boolean): void;
  setBuildTool(tool: BuildTool): void;
  setPlacementPreview(
    tile: TileCoordinate | null,
    status: PlacementVisualStatus,
  ): void;
  syncWorld(snapshot: WorldSnapshot): void;
  dispose(): void;
}

export type BuildTool =
  | "house"
  | "road"
  | "wall"
  | "well"
  | "farm"
  | "granary"
  | "market"
  | "hemp-farm"
  | "weaver"
  | "weaponsmith"
  | "infantry-fort"
  | "tax-office"
  | "music-school"
  | "trading-post"
  | "demolish"
  | null;

export interface TileCoordinate {
  x: number;
  y: number;
}

export type PlacementVisualStatus =
  | "hidden"
  | "valid"
  | "occupied"
  | "vegetation"
  | "empty"
  | "out-of-bounds"
  | "steep-slope";

export interface CityRendererCallbacks {
  onHoverTile?(tile: TileCoordinate | null): void;
  onGroundClick?(tile: TileCoordinate): void;
  onInspectTile?(tile: TileCoordinate): void;
  onCameraHeadingChange?(heading: number): void;
}

function createGridLines(
  scene: Scene,
  terraceField: SuburbanTerraceField | null,
) {
  const half = WORLD_SIZE / 2;
  const lines: Vector3[][] = [];
  const terrain = DEFAULT_TERRAIN_CONTRACT;
  const maxX = terrain.originX + terrain.width;
  const maxY = terrain.originY + terrain.height;
  const elevationAt = (x: number, y: number) =>
    terraceField
      ? suburbanTerraceElevationAt(terraceField, x, y)
      : sampleTerrain(x, y, terrain).elevation;
  for (let y = terrain.originY; y <= maxY; y += 1) {
    const line: Vector3[] = [];
    for (let x = terrain.originX; x <= maxX; x += 1) {
      line.push(
        new Vector3(
          -half + x * TILE_SIZE,
          elevationAt(x, y) + 0.025,
          -half + y * TILE_SIZE,
        ),
      );
    }
    lines.push(line);
  }
  for (let x = terrain.originX; x <= maxX; x += 1) {
    const line: Vector3[] = [];
    for (let y = terrain.originY; y <= maxY; y += 1) {
      line.push(
        new Vector3(
          -half + x * TILE_SIZE,
          elevationAt(x, y) + 0.025,
          -half + y * TILE_SIZE,
        ),
      );
    }
    lines.push(line);
  }

  const grid = CreateLineSystem("city-grid", { lines }, scene);
  grid.color = new Color3(0.3, 0.25, 0.16);
  grid.visibility = 0.075;
  grid.isPickable = false;
  grid.setEnabled(false);
  return grid;
}

function tileCenter(tile: TileCoordinate, footprint = 1): Vector3 {
  const half = WORLD_SIZE / 2;
  const centerX = tile.x + footprint / 2;
  const centerY = tile.y + footprint / 2;
  return new Vector3(
    -half + centerX * TILE_SIZE,
    sampleTerrain(centerX, centerY, DEFAULT_TERRAIN_CONTRACT).elevation,
    -half + centerY * TILE_SIZE,
  );
}

function terrainTileKey(tile: TileCoordinate, terrain: TerrainContract) {
  return (tile.y - terrain.originY) * terrain.width + tile.x - terrain.originX;
}

function footprintForBuilding(building: WorldSnapshot["buildings"][number]) {
  if (building.typeId === "well") return 1;
  if (building.typeId === "farm") return FARM_FOOTPRINT;
  if (building.typeId === "granary") return GRANARY_FOOTPRINT;
  if (building.typeId === "market") return MARKET_FOOTPRINT;
  if (building.typeId === "hemp-farm") return HEMP_FARM_FOOTPRINT;
  if (building.typeId === "weaver") return WEAVER_FOOTPRINT;
  if (building.typeId === "weaponsmith") return WEAPONSMITH_FOOTPRINT;
  if (building.typeId === "infantry-fort") return INFANTRY_FORT_FOOTPRINT;
  if (building.typeId === "tax-office") return TAX_OFFICE_FOOTPRINT;
  if (building.typeId === "music-school") return MUSIC_SCHOOL_FOOTPRINT;
  if (building.typeId === "trading-post") return TRADING_POST_FOOTPRINT;
  return HOUSE_FOOTPRINT;
}

export async function createCityRenderer(
  canvas: HTMLCanvasElement,
  callbacks: CityRendererCallbacks = {},
): Promise<CityRenderer> {
  const engine = new Engine(canvas, true, {
    disableWebGL2Support: false,
    failIfMajorPerformanceCaveat: false,
    preserveDrawingBuffer: true,
    premultipliedAlpha: false,
    alpha: false,
    stencil: true,
  });
  if (engine.webGLVersion < 2) {
    engine.dispose();
    throw new Error("当前浏览器或显卡不支持 WebGL2");
  }

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.61, 0.66, 0.57, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0024;
  scene.fogColor = new Color3(0.61, 0.66, 0.57);

  const ambientLight = new HemisphericLight(
    "terrain-ambient-light",
    new Vector3(0, 1, 0),
    scene,
  );
  ambientLight.intensity = 0.52;
  ambientLight.diffuse = new Color3(0.92, 0.91, 0.82);
  ambientLight.groundColor = new Color3(0.22, 0.18, 0.12);
  const terrainSun = new DirectionalLight(
    "terrain-directional-light",
    new Vector3(-0.7, -1, 0.45),
    scene,
  );
  terrainSun.intensity = 0.72;
  terrainSun.diffuse = new Color3(1, 0.88, 0.68);

  const camera = new ArcRotateCamera(
    "city-camera",
    -Math.PI / 4,
    Math.PI / 3,
    160,
    new Vector3(-46, 0, 0),
    scene,
  );
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.lowerAlphaLimit = camera.alpha;
  camera.upperAlphaLimit = camera.alpha;
  camera.lowerBetaLimit = camera.beta;
  camera.upperBetaLimit = camera.beta;
  camera.inputs.removeByType("ArcRotateCameraMouseWheelInput");
  camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
  camera.attachControl(canvas, true);
  const initialCameraAlpha = camera.alpha;
  const cameraHeading = () =>
    ((Math.round(((initialCameraAlpha - camera.alpha) * 180) / Math.PI) % 360) +
      360) %
    360;

  const orthographicHeight = 56;
  const updateOrthographicBounds = () => {
    const aspect =
      Math.max(canvas.clientWidth, 1) / Math.max(canvas.clientHeight, 1);
    camera.orthoTop = orthographicHeight / 2;
    camera.orthoBottom = -orthographicHeight / 2;
    camera.orthoLeft = (-orthographicHeight * aspect) / 2;
    camera.orthoRight = (orthographicHeight * aspect) / 2;
  };

  const materialCache = new Map<string, StandardMaterial>();
  const textureFor = (
    asset: RuntimeAsset,
    options: { tiled?: boolean; invertY?: boolean } = {},
  ) => {
    const texture = new Texture(
      asset.url,
      scene,
      true,
      options.invertY ?? true,
      Texture.TRILINEAR_SAMPLINGMODE,
      undefined,
      (message, exception) => {
        console.error(
          `[runtime-asset] 加载失败: ${asset.url}${message ? ` (${message})` : ""}`,
          exception,
        );
      },
    );
    texture.hasAlpha = !options.tiled;
    if (options.tiled) {
      texture.wrapU = Texture.WRAP_ADDRESSMODE;
      texture.wrapV = Texture.WRAP_ADDRESSMODE;
    }
    return texture;
  };
  const materialFor = (
    asset: RuntimeAsset,
    options: { invertY?: boolean; lit?: boolean } = {},
  ) => {
    const cacheKey = `${asset.url}:${options.invertY ?? true}:${options.lit ?? false}`;
    const cached = materialCache.get(cacheKey);
    if (cached) return cached;
    const material = new StandardMaterial(`asset:${asset.url}`, scene);
    material.diffuseColor = options.lit
      ? Color3.White()
      : new Color3(0.54, 0.45, 0.3);
    material.emissiveColor = options.lit
      ? new Color3(0.05, 0.04, 0.025)
      : Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = !options.lit;
    material.backFaceCulling = false;
    material.useAlphaFromDiffuseTexture = true;
    material.transparencyMode = Material.MATERIAL_ALPHATEST;
    material.alphaCutOff = 0.08;
    material.diffuseTexture = textureFor(asset, options);
    materialCache.set(cacheKey, material);
    return material;
  };
  const materialForSpriteSheetFrame = (
    asset: RuntimeSpriteSheetAsset,
    row: number,
    column: number,
  ) => {
    const safeRow = ((row % asset.rows) + asset.rows) % asset.rows;
    const safeColumn =
      ((column % asset.columns) + asset.columns) % asset.columns;
    const cacheKey = `${asset.url}:sheet:${safeRow}:${safeColumn}`;
    const cached = materialCache.get(cacheKey);
    if (cached) return cached;
    const material = new StandardMaterial(cacheKey, scene);
    material.diffuseColor = new Color3(0.54, 0.45, 0.3);
    material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.useAlphaFromDiffuseTexture = true;
    material.transparencyMode = Material.MATERIAL_ALPHATEST;
    material.alphaCutOff = 0.08;
    const texture = textureFor(asset);
    texture.uScale = 1 / asset.columns;
    texture.vScale = 1 / asset.rows;
    texture.uOffset = safeColumn / asset.columns;
    texture.vOffset = spriteSheetVOffset(safeRow, asset.rows);
    material.diffuseTexture = texture;
    materialCache.set(cacheKey, material);
    return material;
  };
  const directionalSprites = new Set<Mesh>();
  const updateDirectionalSprites = () => {
    const scaleSign = spriteMirrorForHeading(cameraHeading()) ? -1 : 1;
    for (const sprite of directionalSprites) {
      sprite.scaling.x = Math.abs(sprite.scaling.x) * scaleSign;
    }
  };
  const groundedSprites = new Set<{
    mesh: Mesh;
    logicalCenter: Vector3;
    footprintTiles: number;
  }>();
  const updateGroundedSprite = (grounded: {
    mesh: Mesh;
    logicalCenter: Vector3;
    footprintTiles: number;
  }) => {
    const position = groundSpritePosition(
      grounded.logicalCenter,
      camera.position,
      camera.target,
      grounded.footprintTiles,
      TILE_SIZE,
    );
    grounded.mesh.position.x = position.x;
    grounded.mesh.position.z = position.z;
  };
  const updateGroundedSprites = () => {
    for (const grounded of groundedSprites) updateGroundedSprite(grounded);
  };
  const applySpriteAsset = (mesh: Mesh, asset: RuntimeAsset) => {
    const width = asset.worldHeight * (asset.pixelWidth / asset.pixelHeight);
    mesh.scaling.set(width, asset.worldHeight, 1);
    mesh.position.y = asset.worldHeight * (0.5 - asset.anchorY);
    mesh.material = materialFor(asset);
  };
  const createSprite = (
    name: string,
    asset: RuntimeAsset,
    center: Vector3,
    footprintTiles?: number,
  ) => {
    const sprite = CreatePlane(
      name,
      { size: 1, sideOrientation: Mesh.DOUBLESIDE },
      scene,
    );
    sprite.position.copyFrom(center);
    applySpriteAsset(sprite, asset);
    sprite.position.y += center.y;
    sprite.billboardMode = Mesh.BILLBOARDMODE_Y;
    sprite.isPickable = false;
    directionalSprites.add(sprite);
    sprite.onDisposeObservable.addOnce(() => directionalSprites.delete(sprite));
    if (footprintTiles !== undefined) {
      const grounded = {
        mesh: sprite,
        logicalCenter: center.clone(),
        footprintTiles: asset.groundingFootprint ?? footprintTiles,
      };
      groundedSprites.add(grounded);
      updateGroundedSprite(grounded);
      sprite.onDisposeObservable.addOnce(() =>
        groundedSprites.delete(grounded),
      );
    }
    updateDirectionalSprites();
    return sprite;
  };

  const createLoessMaterial = (
    name: string,
    uScale: number,
    vScale = uScale,
  ) => {
    const material = new StandardMaterial(name, scene);
    material.diffuseColor = Color3.White();
    material.emissiveColor = new Color3(0.06, 0.05, 0.035);
    material.specularColor = Color3.Black();
    material.disableLighting = false;
    const texture = textureFor(RUNTIME_ASSETS["terrain.loess"], {
      tiled: true,
    });
    texture.uScale = uScale;
    texture.vScale = vScale;
    material.diffuseTexture = texture;
    return material;
  };

  const outerTerrain = CreateGround(
    "outer-terrain",
    { width: OUTER_TERRAIN_SIZE, height: OUTER_TERRAIN_SIZE, subdivisions: 1 },
    scene,
  );
  outerTerrain.position.y = -0.04;
  outerTerrain.isPickable = false;
  outerTerrain.material = createLoessMaterial(
    "outer-terrain-material",
    OUTER_TERRAIN_SIZE / TERRAIN_REPEAT_WORLD_SIZE,
  );
  const updateOuterTerrain = () => {
    outerTerrain.position.x =
      Math.round(camera.target.x / TERRAIN_REPEAT_WORLD_SIZE) *
      TERRAIN_REPEAT_WORLD_SIZE;
    outerTerrain.position.z =
      Math.round(camera.target.z / TERRAIN_REPEAT_WORLD_SIZE) *
      TERRAIN_REPEAT_WORLD_SIZE;
  };
  updateOuterTerrain();

  let suburbanTerrain: Mesh | null = null;
  let suburbanSlopeTerrain: Mesh | null = null;
  let suburbanTerraceField: SuburbanTerraceField | null = null;
  try {
    suburbanTerraceField = createSuburbanTerraceField({
      seed: SUBURBAN_TERRAIN_SEED,
    });
    const terrain = createSuburbanTerraceGeometry({
      seed: SUBURBAN_TERRAIN_SEED,
    });
    const createTerrainMesh = (
      name: string,
      geometry: SuburbanTerrainGeometry,
    ) => {
      const mesh = new Mesh(name, scene);
      const vertexData = new VertexData();
      vertexData.positions = geometry.positions;
      vertexData.indices = geometry.indices;
      vertexData.normals = geometry.normals;
      vertexData.uvs = geometry.uvs;
      vertexData.colors = geometry.colors;
      vertexData.applyToMesh(mesh);
      mesh.isPickable = false;
      mesh.useVertexColors = true;
      mesh.freezeWorldMatrix();
      return mesh;
    };

    suburbanTerrain = createTerrainMesh("suburban-terrace-tops", terrain.tops);
    suburbanSlopeTerrain = createTerrainMesh(
      "suburban-terrace-slopes",
      terrain.slopes,
    );

    const suburbanMaterial = createLoessMaterial(
      "suburban-terrace-top-material",
      1,
    );
    suburbanMaterial.backFaceCulling = false;
    suburbanTerrain.material = suburbanMaterial;

    const slopeMaterial = new StandardMaterial(
      "suburban-terrace-slope-material",
      scene,
    );
    slopeMaterial.diffuseColor = Color3.White();
    slopeMaterial.emissiveColor = new Color3(0.04, 0.03, 0.02);
    slopeMaterial.specularColor = Color3.Black();
    slopeMaterial.disableLighting = false;
    slopeMaterial.backFaceCulling = false;
    const slopeTexture = textureFor(
      RUNTIME_ASSETS["terrain.loess-slope-face"],
      { tiled: true },
    );
    slopeTexture.uScale = 1;
    slopeTexture.vScale = 1;
    slopeMaterial.diffuseTexture = slopeTexture;
    suburbanSlopeTerrain.material = slopeMaterial;

    console.info(
      `[terrain] 郊野台地已就绪：${terrain.stats.topTriangles} 顶面三角，${terrain.stats.slopeTriangles} 土坡三角`,
    );
  } catch (error) {
    console.warn("[terrain] 郊野高地生成失败，已降级为平地", error);
  }

  const ground = CreateGround(
    "city-ground",
    { width: WORLD_SIZE, height: WORLD_SIZE, subdivisions: 1 },
    scene,
  );
  ground.material = createLoessMaterial("ground-material", 8);
  const grid = createGridLines(scene, suburbanTerraceField);

  const preview = CreateBox(
    "placement-preview",
    {
      width: TILE_SIZE * HOUSE_FOOTPRINT * 0.96,
      depth: TILE_SIZE * HOUSE_FOOTPRINT * 0.96,
      height: 0.35,
    },
    scene,
  );
  preview.position.y = 0.19;
  preview.isPickable = false;
  preview.setEnabled(false);
  const terrainPreview = new Mesh("terrain-placement-preview", scene);
  terrainPreview.isPickable = false;
  terrainPreview.setEnabled(false);
  const validPreviewMaterial = new StandardMaterial("valid-preview", scene);
  validPreviewMaterial.diffuseColor = new Color3(0.38, 0.88, 0.48);
  validPreviewMaterial.emissiveColor = new Color3(0.08, 0.28, 0.12);
  validPreviewMaterial.alpha = 0.48;
  const invalidPreviewMaterial = new StandardMaterial("invalid-preview", scene);
  invalidPreviewMaterial.diffuseColor = new Color3(0.92, 0.24, 0.18);
  invalidPreviewMaterial.emissiveColor = new Color3(0.3, 0.03, 0.02);
  invalidPreviewMaterial.alpha = 0.55;
  const demolitionPreviewMaterial = new StandardMaterial(
    "demolition-preview",
    scene,
  );
  demolitionPreviewMaterial.diffuseColor = new Color3(0.95, 0.62, 0.16);
  demolitionPreviewMaterial.emissiveColor = new Color3(0.3, 0.12, 0.01);
  demolitionPreviewMaterial.alpha = 0.58;

  const gateAsset = RUNTIME_ASSETS["gate.main"];
  const gateCenter = tileCenter(CITY_GATE_TILE);
  gateCenter.x += (gateAsset.placementOffsetTiles?.x ?? 0) * TILE_SIZE;
  gateCenter.z += (gateAsset.placementOffsetTiles?.z ?? 0) * TILE_SIZE;
  const gateScreenLeft = camera.getDirection(new Vector3(-1, 0, 0));
  const gateScreenDown = camera.getDirection(new Vector3(0, -1, 0));
  gateScreenLeft.y = 0;
  gateScreenDown.y = 0;
  gateScreenLeft.normalize();
  gateScreenDown.normalize();
  gateCenter.addInPlace(
    gateScreenLeft
      .addInPlace(gateScreenDown)
      .normalize()
      .scaleInPlace(TILE_SIZE * 0.5),
  );
  const gateSprite = createSprite(
    "runtime-asset:gate.main",
    gateAsset,
    gateCenter,
    gateAsset.groundingFootprint,
  );
  gateSprite.position.y += 0.02;

  // Preload every stage and animation frame before exposing a ready renderer.
  // This avoids a GPU texture upload landing in the middle of a construction
  // transition, which can produce incomplete WebGL compositor tiles.
  for (const asset of Object.values(RUNTIME_ASSETS)) materialFor(asset);
  for (const asset of Object.values(FARM_CROP_ASSETS)) materialFor(asset);
  for (const asset of Object.values(INDUSTRY_ASSETS)) materialFor(asset);
  for (const asset of Object.values(MILITARY_ASSETS)) materialFor(asset);
  for (const asset of Object.values(GOVERNMENT_ASSETS)) materialFor(asset);
  for (const asset of Object.values(ENTERTAINMENT_ASSETS)) materialFor(asset);
  for (const asset of Object.values(COMMERCE_ASSETS)) materialFor(asset);
  for (const asset of Object.values(CITIZEN_WALK_ASSETS)) {
    for (let row = 0; row < asset.rows; row += 1) {
      for (let column = 0; column < asset.columns; column += 1) {
        materialForSpriteSheetFrame(asset, row, column);
      }
    }
  }
  for (const assets of Object.values(CITIZEN_WORK_ASSETS)) {
    for (const asset of assets) materialFor(asset);
  }
  for (const asset of ROAD_AUTOTILE_ASSETS) {
    materialFor(asset, { invertY: false, lit: true });
  }
  for (const asset of Object.values(WALL_JUNCTION_ASSETS)) {
    materialFor(asset);
  }
  for (let mask = 0; mask < 16; mask += 1) {
    const visual = wallVisualForMask(mask);
    if (visual.kind === "atlas") {
      materialForSpriteSheetFrame(
        visual.asset,
        visual.frame.row,
        visual.frame.column,
      );
    }
  }
  for (let row = 0; row < GROUND_COVER_ATLAS.rows; row += 1) {
    for (let column = 0; column < GROUND_COVER_ATLAS.columns; column += 1) {
      materialForSpriteSheetFrame(GROUND_COVER_ATLAS, row, column);
    }
  }

  const coverFrame = {
    "dense-weeds": { row: 0, column: 0, scaleY: 1 },
    meadow: { row: 0, column: 1, scaleY: 0.72 },
    "dry-scrub": { row: 1, column: 0, scaleY: 0.82 },
    stone: { row: 1, column: 1, scaleY: 0.84 },
  } as const;
  const groundCoverSources = new Map<GroundCoverVariant, Mesh>();
  for (const [variant, frame] of Object.entries(coverFrame) as Array<
    [GroundCoverVariant, (typeof coverFrame)[GroundCoverVariant]]
  >) {
    const source = CreatePlane(
      `runtime-asset:ground-cover-source:${variant}`,
      { width: TILE_SIZE * 1.28, height: GROUND_COVER_ATLAS.worldHeight },
      scene,
    );
    source.material = materialForSpriteSheetFrame(
      GROUND_COVER_ATLAS,
      frame.row,
      frame.column,
    );
    source.position.set(-10_000, -10_000, -10_000);
    source.billboardMode = Mesh.BILLBOARDMODE_Y;
    source.isPickable = false;
    groundCoverSources.set(variant, source);
  }

  const naturalGroundCover = (() => {
    const cover: Array<{
      x: number;
      y: number;
      variant: GroundCoverVariant;
    }> = [];
    const terrain = DEFAULT_TERRAIN_CONTRACT;
    for (
      let y = terrain.originY;
      y < terrain.originY + terrain.height;
      y += 1
    ) {
      for (
        let x = terrain.originX;
        x < terrain.originX + terrain.width;
        x += 1
      ) {
        if (
          suburbanTerraceField &&
          createSuburbanRoadSurface(suburbanTerraceField, x, y, 0).isSlope
        ) {
          continue;
        }
        const sample = sampleTerrainCover(x + 0.5, y + 0.5, terrain);
        const variant = groundCoverVariant(
          sample.kind,
          sample.grassBlend,
          x,
          y,
        );
        if (variant) cover.push({ x, y, variant });
      }
    }
    return cover;
  })();
  const clearedGroundMaterial = createLoessMaterial(
    "cleared-vegetation-ground-material",
    1,
  );
  clearedGroundMaterial.backFaceCulling = false;

  const buildingMeshes = new Map<
    number,
    { signature: string; meshes: AbstractMesh[] }
  >();
  const roadMeshes = new Map<number, { mask: number; mesh: AbstractMesh }>();
  const groundCoverMeshes = new Map<
    number,
    { variant: GroundCoverVariant; mesh: AbstractMesh }
  >();
  const clearedGroundMeshes = new Map<number, Mesh>();
  const wallMeshes = new Map<number, { worldMask: number; mesh: Mesh }>();
  const applyWallFrame = (wall: { worldMask: number; mesh: Mesh }) => {
    const presentationMask = rotateWallMaskForHeading(
      wall.worldMask,
      cameraHeading(),
    );
    const visual = wallVisualForMask(presentationMask);
    wall.mesh.material =
      visual.kind === "asset"
        ? materialFor(visual.asset)
        : materialForSpriteSheetFrame(
            visual.asset,
            visual.frame.row,
            visual.frame.column,
          );
    wall.mesh.scaling.x = Math.abs(wall.mesh.scaling.x);
  };
  const updateWallSprites = () => {
    for (const wall of wallMeshes.values()) applyWallFrame(wall);
  };
  interface PersonSprite {
    root: TransformNode;
    sprite: Mesh;
    role: CitizenVisualRole;
    action: PersonAction;
    desiredAction: PersonAction;
    source: "migrant" | "citizen" | "performer";
    frame: number;
    from: Vector3;
    target: Vector3;
    transitionStartedAt: number;
    animationStartedAt: number;
    animationPhase: number;
    mirror: boolean;
    directionRow: 0 | 1 | 2 | 3;
    baseScaleX: number;
    baseScaleY: number;
  }
  const personSprites = new Map<string, PersonSprite>();
  let buildTool: BuildTool = null;
  const reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  let reducedMotion = reducedMotionQuery.matches;
  const handleReducedMotionChange = (event: MediaQueryListEvent) => {
    reducedMotion = event.matches;
  };
  reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
  let animationPaused = false;
  let animationPausedAt = 0;

  const createBuildingVisual = (
    building: WorldSnapshot["buildings"][number],
  ): AbstractMesh[] => {
    const asset =
      building.typeId === "house"
        ? assetForHouseStage(building.constructionStage)
        : building.typeId === "farm"
          ? assetForFarmCrop(building.cropType)
          : assetForBuilding(building.typeId);
    const center = tileCenter(building, footprintForBuilding(building));
    const sprite = createSprite(
      `runtime-asset:${building.typeId}:${building.id}`,
      asset,
      center,
      footprintForBuilding(building),
    );
    return [sprite];
  };

  interface RenderPerson {
    key: string;
    x: number;
    y: number;
    role: CitizenVisualRole;
    action: PersonAction;
    source: "migrant" | "citizen" | "performer";
  }
  const assetForPerson = (person: RenderPerson, frame: number) =>
    person.source === "migrant"
      ? assetForMigrant(
          person.action === "working" ? "building" : "walking",
          frame,
        )
      : assetForCitizen(person.role, person.action, frame);

  const createPersonSprite = (person: RenderPerson): PersonSprite => {
    const root = new TransformNode(`${person.key}-root`, scene);
    const asset = assetForPerson(person, 0);
    const sprite = CreatePlane(
      `runtime-asset:person:${person.key}`,
      { size: 1, sideOrientation: Mesh.DOUBLESIDE },
      scene,
    );
    sprite.parent = root;
    sprite.billboardMode = Mesh.BILLBOARDMODE_Y;
    sprite.isPickable = false;
    sprite.renderingGroupId = 1;
    applySpriteAsset(sprite, asset);
    const position = tileCenter(person);
    position.y = 0.1;
    root.position.copyFrom(position);
    const created: PersonSprite = {
      root,
      sprite,
      role: person.role,
      action: person.action,
      desiredAction: person.action,
      source: person.source,
      frame: 0,
      from: position.clone(),
      target: position.clone(),
      transitionStartedAt: performance.now(),
      animationStartedAt: performance.now(),
      animationPhase: personAnimationPhase(person.key),
      mirror: false,
      directionRow: 0,
      baseScaleX: Math.abs(sprite.scaling.x),
      baseScaleY: sprite.scaling.y,
    };
    applyPersonFrame(created);
    return created;
  };

  const applyPersonFrame = (person: PersonSprite) => {
    const asset =
      person.source === "migrant"
        ? assetForMigrant(
            person.action === "working" ? "building" : "walking",
            person.frame,
          )
        : assetForCitizen(person.role, person.action, person.frame);
    applySpriteAsset(person.sprite, asset);
    const usesWalkSheet =
      person.source !== "migrant" &&
      person.role !== "resident" &&
      person.action !== "working";
    if (usesWalkSheet && person.role !== "resident") {
      person.sprite.material = materialForSpriteSheetFrame(
        CITIZEN_WALK_ASSETS[person.role],
        person.directionRow,
        person.action === "idle" ? 0 : person.frame,
      );
    }
    person.baseScaleX = Math.abs(person.sprite.scaling.x);
    person.baseScaleY = person.sprite.scaling.y;
    person.sprite.scaling.x =
      Math.abs(person.sprite.scaling.x) *
      (!usesWalkSheet && person.mirror ? -1 : 1);
  };

  const setPersonAction = (
    person: PersonSprite,
    action: PersonAction,
    now: number,
  ) => {
    if (person.action === action) return;
    person.action = action;
    person.frame = 0;
    person.animationStartedAt = now;
    applyPersonFrame(person);
  };

  const personAnimationObserver = scene.onBeforeRenderObservable.add(() => {
    if (animationPaused) return;
    const now = performance.now();
    for (const person of personSprites.values()) {
      const transition = Math.min(
        1,
        (now - person.transitionStartedAt) / PERSON_STEP_TRANSITION_MS,
      );
      Vector3.LerpToRef(
        person.from,
        person.target,
        transition,
        person.root.position,
      );
      if (transition === 1) {
        setPersonAction(person, person.desiredAction, now);
      }
      const pose = personPoseAt(
        person.action,
        now - person.animationStartedAt + person.animationPhase,
        reducedMotion,
      );
      if (pose.frame !== person.frame) {
        person.frame = pose.frame;
        applyPersonFrame(person);
      }
      person.root.position.y = person.target.y + pose.bob;
      person.sprite.position.x =
        person.source === "migrant"
          ? pose.footPlant * 0.16 * (person.mirror ? -1 : 1)
          : 0;
      person.sprite.rotation.z = pose.sway;
      person.sprite.scaling.x =
        person.baseScaleX *
        (1 - pose.stretch * 0.45) *
        (person.mirror ? -1 : 1);
      person.sprite.scaling.y =
        person.baseScaleY * (1 + pose.breathe + pose.stretch);
    }
  });

  const pickedTile = (): TileCoordinate | null => {
    const pick = scene.pick(
      scene.pointerX,
      scene.pointerY,
      (mesh) =>
        mesh === ground ||
        mesh === suburbanTerrain ||
        mesh === suburbanSlopeTerrain,
    );
    const point = pick?.pickedPoint;
    if (!point) return null;
    const half = WORLD_SIZE / 2;
    const x = Math.floor((point.x + half) / TILE_SIZE);
    const y = Math.floor((point.z + half) / TILE_SIZE);
    if (!isTileInsideTerrain({ x, y }, DEFAULT_TERRAIN_CONTRACT)) return null;
    return { x, y };
  };

  let hoverRefreshFrame: number | null = null;
  const scheduleHoverRefresh = () => {
    if (!buildTool || hoverRefreshFrame !== null) return;
    hoverRefreshFrame = window.requestAnimationFrame(() => {
      hoverRefreshFrame = null;
      callbacks.onHoverTile?.(pickedTile());
    });
  };
  let lastReportedHeading = 0;
  const reportCameraHeading = () => {
    const heading = cameraHeading();
    if (heading === lastReportedHeading) return;
    lastReportedHeading = heading;
    callbacks.onCameraHeadingChange?.(heading);
  };
  const cameraViewObserver = camera.onViewMatrixChangedObservable.add(() => {
    updateOuterTerrain();
    updateGroundedSprites();
    updateDirectionalSprites();
    updateWallSprites();
    scheduleHoverRefresh();
    reportCameraHeading();
  });
  let primaryClickStart: { x: number; y: number } | null = null;
  let dragPan: { x: number; y: number } | null = null;

  const panCameraByScreenDelta = (deltaX: number, deltaY: number) => {
    if (deltaX === 0 && deltaY === 0) return;
    const worldUnitsPerPixel =
      orthographicHeight / Math.max(canvas.clientHeight, 1);
    const screenRight = camera.getDirection(new Vector3(1, 0, 0));
    const screenUp = camera.getDirection(new Vector3(0, 1, 0));
    screenRight.y = 0;
    screenUp.y = 0;
    if (screenRight.lengthSquared() > 0.000_001) screenRight.normalize();
    if (screenUp.lengthSquared() > 0.000_001) screenUp.normalize();
    camera.target.addInPlace(
      screenRight
        .scale(deltaX * worldUnitsPerPixel)
        .addInPlace(screenUp.scale(-deltaY * worldUnitsPerPixel)),
    );
    updateOuterTerrain();
    scheduleHoverRefresh();
  };

  const pointerObserver = scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
      if (dragPan) {
        const deltaX = pointerInfo.event.clientX - dragPan.x;
        const deltaY = pointerInfo.event.clientY - dragPan.y;
        panCameraByScreenDelta(-deltaX, -deltaY);
        dragPan = {
          ...dragPan,
          x: pointerInfo.event.clientX,
          y: pointerInfo.event.clientY,
        };
      }
      callbacks.onHoverTile?.(pickedTile());
      if (primaryClickStart) {
        const deltaX = pointerInfo.event.clientX - primaryClickStart.x;
        const deltaY = pointerInfo.event.clientY - primaryClickStart.y;
        if (deltaX * deltaX + deltaY * deltaY > 36) primaryClickStart = null;
      }
    }
    if (
      pointerInfo.type === PointerEventTypes.POINTERDOWN &&
      (pointerInfo.event.button === 0 ||
        pointerInfo.event.button === 1 ||
        pointerInfo.event.button === 2)
    ) {
      dragPan = {
        x: pointerInfo.event.clientX,
        y: pointerInfo.event.clientY,
      };
      if (pointerInfo.event.button === 0) {
        primaryClickStart = {
          x: pointerInfo.event.clientX,
          y: pointerInfo.event.clientY,
        };
      }
    }
    if (
      pointerInfo.type === PointerEventTypes.POINTERUP &&
      (pointerInfo.event.button === 0 ||
        pointerInfo.event.button === 1 ||
        pointerInfo.event.button === 2)
    ) {
      dragPan = null;
      const shouldBuild =
        pointerInfo.event.button === 0 &&
        buildTool !== null &&
        primaryClickStart !== null;
      if (shouldBuild) {
        const tile = pickedTile();
        if (tile) callbacks.onGroundClick?.(tile);
      } else if (pointerInfo.event.button === 0 && primaryClickStart !== null) {
        const tile = pickedTile();
        if (tile) callbacks.onInspectTile?.(tile);
      }
      if (pointerInfo.event.button === 0) primaryClickStart = null;
    }
  });

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    const unit =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? Math.max(canvas.clientHeight, 1)
          : 1;
    const deltaX = event.deltaX * unit;
    const deltaY = event.deltaY * unit;
    panCameraByScreenDelta(deltaX, deltaY);
  };
  const preventContextMenu = (event: MouseEvent) => event.preventDefault();
  canvas.addEventListener("wheel", handleWheel, { passive: false });
  canvas.addEventListener("contextmenu", preventContextMenu);

  updateOrthographicBounds();
  const handleResize = () => {
    engine.resize();
    updateOrthographicBounds();
    scheduleHoverRefresh();
  };
  window.addEventListener("resize", handleResize);
  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(canvas);

  engine.runRenderLoop(() => scene.render());
  await scene.whenReadyAsync();
  await new Promise<void>((resolve) => {
    scene.onAfterRenderObservable.addOnce(() => resolve());
  });

  return {
    backend: `WebGL${engine.webGLVersion}`,
    setAnimationPaused(paused) {
      if (paused === animationPaused) return;
      const now = performance.now();
      if (paused) {
        animationPaused = true;
        animationPausedAt = now;
        return;
      }
      const pausedDuration = now - animationPausedAt;
      for (const person of personSprites.values()) {
        person.transitionStartedAt += pausedDuration;
        person.animationStartedAt += pausedDuration;
      }
      animationPaused = false;
    },
    setBuildTool(tool) {
      buildTool = tool;
      primaryClickStart = null;
      dragPan = null;
      grid.setEnabled(tool !== null);
      if (!tool) {
        preview.setEnabled(false);
        terrainPreview.setEnabled(false);
      }
    },
    setPlacementPreview(tile, status) {
      if (!tile || status === "hidden") {
        preview.setEnabled(false);
        terrainPreview.setEnabled(false);
        return;
      }
      const footprint =
        buildTool === "house"
          ? HOUSE_FOOTPRINT
          : buildTool === "farm"
            ? FARM_FOOTPRINT
            : buildTool === "granary"
              ? GRANARY_FOOTPRINT
              : buildTool === "market"
                ? MARKET_FOOTPRINT
                : buildTool === "hemp-farm"
                  ? HEMP_FARM_FOOTPRINT
                  : buildTool === "weaver"
                    ? WEAVER_FOOTPRINT
                    : buildTool === "weaponsmith"
                      ? WEAPONSMITH_FOOTPRINT
                      : buildTool === "infantry-fort"
                        ? INFANTRY_FORT_FOOTPRINT
                        : buildTool === "tax-office"
                          ? TAX_OFFICE_FOOTPRINT
                          : buildTool === "music-school"
                            ? MUSIC_SCHOOL_FOOTPRINT
                            : buildTool === "trading-post"
                              ? TRADING_POST_FOOTPRINT
                              : 1;
      const previewMaterial =
        status === "valid"
          ? buildTool === "demolish"
            ? demolitionPreviewMaterial
            : validPreviewMaterial
          : invalidPreviewMaterial;
      if (buildTool === "road" && suburbanTerraceField) {
        const surface = createSuburbanRoadSurface(
          suburbanTerraceField,
          tile.x,
          tile.y,
          0.11,
        );
        const vertexData = new VertexData();
        vertexData.positions = surface.positions;
        vertexData.indices = surface.indices;
        vertexData.normals = surface.normals;
        vertexData.uvs = surface.uvs;
        vertexData.applyToMesh(terrainPreview, true);
        terrainPreview.material = previewMaterial;
        preview.setEnabled(false);
        terrainPreview.setEnabled(true);
        return;
      }
      terrainPreview.setEnabled(false);
      preview.scaling.x = footprint / HOUSE_FOOTPRINT;
      preview.scaling.z = footprint / HOUSE_FOOTPRINT;
      preview.position.copyFrom(tileCenter(tile, footprint));
      preview.position.y =
        (suburbanTerraceField
          ? suburbanTerraceElevationAt(suburbanTerraceField, tile.x, tile.y)
          : preview.position.y) + 0.19;
      preview.material = previewMaterial;
      preview.setEnabled(true);
    },
    syncWorld(snapshot) {
      const terrain = snapshot.terrain ?? DEFAULT_TERRAIN_CONTRACT;
      const clearedCoverKeys = new Set(
        (snapshot.clearedVegetation ?? []).map((tile) =>
          terrainTileKey(tile, terrain),
        ),
      );
      for (const tile of snapshot.clearedVegetation ?? []) {
        const key = terrainTileKey(tile, terrain);
        if (clearedGroundMeshes.has(key) || !suburbanTerraceField) continue;
        const surface = createSuburbanRoadSurface(
          suburbanTerraceField,
          tile.x,
          tile.y,
          0.022,
        );
        const mesh = new Mesh(
          `runtime-asset:cleared-vegetation:${tile.x}:${tile.y}`,
          scene,
        );
        const vertexData = new VertexData();
        vertexData.positions = surface.positions;
        vertexData.indices = surface.indices;
        vertexData.normals = surface.normals;
        vertexData.uvs = surface.uvs;
        vertexData.applyToMesh(mesh);
        mesh.material = clearedGroundMaterial;
        mesh.isPickable = false;
        clearedGroundMeshes.set(key, mesh);
      }
      for (const [key, mesh] of clearedGroundMeshes) {
        if (clearedCoverKeys.has(key)) continue;
        mesh.dispose();
        clearedGroundMeshes.delete(key);
      }
      const occupiedCoverKeys = new Set<number>();
      for (const tile of [...snapshot.roads, ...(snapshot.walls ?? [])]) {
        occupiedCoverKeys.add(terrainTileKey(tile, terrain));
      }
      for (const building of snapshot.buildings) {
        for (
          let offsetY = 0;
          offsetY < building.footprint.height;
          offsetY += 1
        ) {
          for (
            let offsetX = 0;
            offsetX < building.footprint.width;
            offsetX += 1
          ) {
            occupiedCoverKeys.add(
              terrainTileKey(
                { x: building.x + offsetX, y: building.y + offsetY },
                terrain,
              ),
            );
          }
        }
      }
      const activeCoverKeys = new Set<number>();
      for (const cover of naturalGroundCover) {
        const key = terrainTileKey(cover, terrain);
        if (clearedCoverKeys.has(key) || occupiedCoverKeys.has(key)) continue;
        activeCoverKeys.add(key);
        const rendered = groundCoverMeshes.get(key);
        if (rendered?.variant === cover.variant) continue;
        rendered?.mesh.dispose();
        const source = groundCoverSources.get(cover.variant);
        if (!source || !suburbanTerraceField) continue;
        const mesh = source.createInstance(
          `runtime-asset:ground-cover:${cover.variant}:${cover.x}:${cover.y}`,
        );
        const surface = createSuburbanRoadSurface(
          suburbanTerraceField,
          cover.x,
          cover.y,
          0,
        );
        const elevation = [0, 1, 2, 3].reduce(
          (total, vertex) => total + surface.positions[vertex * 3 + 1] / 4,
          0,
        );
        const scale = 0.76 + groundCoverVariation(cover.x, cover.y, 41) * 0.48;
        const frame = coverFrame[cover.variant];
        const position = tileCenter(cover);
        position.x += (groundCoverVariation(cover.x, cover.y, 73) - 0.5) * 2.2;
        position.z += (groundCoverVariation(cover.x, cover.y, 97) - 0.5) * 2.2;
        position.y =
          elevation +
          GROUND_COVER_ATLAS.worldHeight * frame.scaleY * scale * 0.42;
        mesh.position.copyFrom(position);
        mesh.scaling.set(scale, scale * frame.scaleY, scale);
        mesh.rotation.z =
          (groundCoverVariation(cover.x, cover.y, 109) - 0.5) * 0.12;
        mesh.billboardMode = Mesh.BILLBOARDMODE_Y;
        mesh.isPickable = false;
        groundCoverMeshes.set(key, { variant: cover.variant, mesh });
      }
      for (const [key, rendered] of groundCoverMeshes) {
        if (activeCoverKeys.has(key)) continue;
        rendered.mesh.dispose();
        groundCoverMeshes.delete(key);
      }

      const activeIds = new Set(
        snapshot.buildings.map((building) => building.id),
      );
      for (const [entityId, rendered] of buildingMeshes) {
        if (activeIds.has(entityId)) continue;
        for (const mesh of rendered.meshes) mesh.dispose();
        buildingMeshes.delete(entityId);
      }
      for (const building of snapshot.buildings) {
        const signature =
          building.typeId === "house"
            ? `house-${building.constructionStage}-${building.level}-${building.rotation}`
            : building.typeId === "farm"
              ? `farm-${building.cropType}`
              : building.typeId;
        const rendered = buildingMeshes.get(building.id);
        if (rendered?.signature === signature) continue;
        if (rendered) {
          for (const mesh of rendered.meshes) mesh.dispose();
        }
        buildingMeshes.set(building.id, {
          signature,
          meshes: createBuildingVisual(building),
        });
      }

      const buildingsById = new Map(
        snapshot.buildings.map((building) => [building.id, building]),
      );
      const movingPeople: RenderPerson[] = [
        ...snapshot.migrants.map((migrant) => ({
          key: `migrant:${migrant.houseId}`,
          x: migrant.x,
          y: migrant.y,
          role: "resident" as const,
          action:
            migrant.state === "building"
              ? ("working" as const)
              : ("walking" as const),
          source: "migrant" as const,
        })),
        ...(snapshot.performers ?? []).map((performer) => ({
          key: `performer:${performer.schoolId}`,
          x: performer.x,
          y: performer.y,
          role: "official" as const,
          action: "walking" as const,
          source: "performer" as const,
        })),
        ...(snapshot.citizens ?? []).map((citizen) => ({
          key: `citizen:${citizen.id}`,
          x: citizen.x,
          y: citizen.y,
          role: citizenVisualRole(
            citizen.workplaceId === null
              ? null
              : (buildingsById.get(citizen.workplaceId)?.typeId ?? null),
          ),
          action:
            citizen.state === "working"
              ? ("working" as const)
              : citizen.state === "resting" || citizen.state === "waiting"
                ? ("idle" as const)
                : ("walking" as const),
          source: "citizen" as const,
        })),
      ];
      const activePersonKeys = new Set(
        movingPeople.map((person) => person.key),
      );
      for (const [key, person] of personSprites) {
        if (activePersonKeys.has(key)) continue;
        person.sprite.dispose();
        person.root.dispose();
        personSprites.delete(key);
      }
      for (const person of movingPeople) {
        const target = tileCenter(person);
        target.y += 0.1;
        let rendered = personSprites.get(person.key);
        if (!rendered) {
          rendered = createPersonSprite(person);
          personSprites.set(person.key, rendered);
        } else if (!rendered.target.equalsWithEpsilon(target, 0.001)) {
          const deltaX = target.x - rendered.target.x;
          const deltaY = target.z - rendered.target.z;
          rendered.from.copyFrom(rendered.root.position);
          rendered.target.copyFrom(target);
          rendered.transitionStartedAt = performance.now();
          rendered.mirror =
            person.source === "migrant"
              ? spriteMirrorForMovement(deltaX, deltaY, cameraHeading())
              : false;
          rendered.directionRow = spriteDirectionRowForMovement(
            deltaX,
            deltaY,
            cameraHeading(),
          );
          rendered.desiredAction = person.action;
          rendered.role = person.role;
          rendered.source = person.source;
          setPersonAction(
            rendered,
            presentedPersonAction(person.action, true),
            performance.now(),
          );
          applyPersonFrame(rendered);
        }
        if (
          rendered.desiredAction !== person.action ||
          rendered.role !== person.role
        ) {
          rendered.desiredAction = person.action;
          rendered.role = person.role;
          rendered.source = person.source;
          const isMoving =
            performance.now() - rendered.transitionStartedAt <
            PERSON_STEP_TRANSITION_MS;
          setPersonAction(
            rendered,
            presentedPersonAction(person.action, isMoving),
            performance.now(),
          );
        }
      }

      const activeRoadKeys = new Set(
        snapshot.roads.map((road) => terrainTileKey(road, terrain)),
      );
      const roadMasks = roadConnectionMasks(snapshot.roads, {
        ...terrain,
      });
      for (const [key, rendered] of roadMeshes) {
        if (activeRoadKeys.has(key)) continue;
        rendered.mesh.dispose();
        roadMeshes.delete(key);
      }
      for (const road of snapshot.roads) {
        const key = terrainTileKey(road, terrain);
        const mask = roadMasks.get(key) ?? 0;
        const rendered = roadMeshes.get(key);
        if (rendered) {
          if (rendered.mask !== mask) {
            rendered.mask = mask;
            rendered.mesh.material = materialFor(assetForRoadMask(mask), {
              invertY: false,
              lit: true,
            });
          }
          continue;
        }
        const mesh = new Mesh(
          `runtime-asset:road:${road.x}:${road.y}:${mask.toString(16)}`,
          scene,
        );
        if (suburbanTerraceField) {
          const surface = createSuburbanRoadSurface(
            suburbanTerraceField,
            road.x,
            road.y,
          );
          const vertexData = new VertexData();
          vertexData.positions = surface.positions;
          vertexData.indices = surface.indices;
          vertexData.normals = surface.normals;
          vertexData.uvs = surface.uvs;
          vertexData.applyToMesh(mesh);
        } else {
          const fallback = VertexData.CreateGround({
            width: TILE_SIZE,
            height: TILE_SIZE,
          });
          fallback.applyToMesh(mesh);
          mesh.position.copyFrom(tileCenter(road));
          mesh.position.y += 0.055;
        }
        mesh.material = materialFor(assetForRoadMask(mask), {
          invertY: false,
          lit: true,
        });
        mesh.isPickable = false;
        roadMeshes.set(key, { mask, mesh });
      }

      const walls = snapshot.walls ?? [];
      const activeWallKeys = new Set(
        walls.map((wall) => terrainTileKey(wall, terrain)),
      );
      const wallMasks = wallConnectionMasks(walls, terrain, CITY_GATE_TILE);
      for (const [key, rendered] of wallMeshes) {
        if (activeWallKeys.has(key)) continue;
        rendered.mesh.dispose();
        wallMeshes.delete(key);
      }
      for (const wall of walls) {
        const key = terrainTileKey(wall, terrain);
        const worldMask = wallMasks.get(key) ?? 0;
        const rendered = wallMeshes.get(key);
        if (rendered) {
          if (rendered.worldMask !== worldMask) {
            rendered.worldMask = worldMask;
            applyWallFrame(rendered);
          }
          continue;
        }
        const mesh = createSprite(
          `runtime-asset:wall:${wall.x}:${wall.y}`,
          WALL_AUTOTILE_ASSET,
          tileCenter(wall),
          1,
        );
        directionalSprites.delete(mesh);
        const created = { worldMask, mesh };
        wallMeshes.set(key, created);
        applyWallFrame(created);
      }
    },
    dispose() {
      scene.onPointerObservable.remove(pointerObserver);
      camera.onViewMatrixChangedObservable.remove(cameraViewObserver);
      scene.onBeforeRenderObservable.remove(personAnimationObserver);
      if (hoverRefreshFrame !== null) {
        window.cancelAnimationFrame(hoverRefreshFrame);
      }
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("contextmenu", preventContextMenu);
      resizeObserver.disconnect();
      reducedMotionQuery.removeEventListener(
        "change",
        handleReducedMotionChange,
      );
      window.removeEventListener("resize", handleResize);
      scene.dispose();
      engine.dispose();
    },
  };
}
