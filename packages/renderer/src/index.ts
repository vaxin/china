import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera.js";
import { Camera } from "@babylonjs/core/Cameras/camera.js";
import "@babylonjs/core/Culling/ray.js";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents.js";
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
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { Scene } from "@babylonjs/core/scene.js";
import {
  CITY_GATE_TILE,
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
  type WorldSnapshot,
} from "@empire/protocol";
import {
  ROAD_AUTOTILE_ASSETS,
  FARM_CROP_ASSETS,
  INDUSTRY_ASSETS,
  MILITARY_ASSETS,
  GOVERNMENT_ASSETS,
  ENTERTAINMENT_ASSETS,
  COMMERCE_ASSETS,
  CITIZEN_ASSETS,
  CITIZEN_WORK_ASSETS,
  RUNTIME_ASSETS,
  assetForBuilding,
  assetForCitizen,
  assetForFarmCrop,
  assetForHouseStage,
  assetForMigrant,
  assetForRoadMask,
  type RuntimeAsset,
} from "./runtime-assets";
import { citizenVisualRole, type CitizenVisualRole } from "./citizen-role";
import { roadConnectionMasks } from "./road-autotile";
import { spriteMirrorForHeading } from "./sprite-facing";
import { groundSpritePosition } from "./sprite-grounding";

const TILE_SIZE = 4;
const WORLD_SIZE = MAP_SIZE * TILE_SIZE;
const TERRAIN_REPEAT_WORLD_SIZE = WORLD_SIZE / 8;
const OUTER_TERRAIN_SIZE = WORLD_SIZE * 32;

export interface CityRenderer {
  backend: string;
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
  "hidden" | "valid" | "occupied" | "empty" | "out-of-bounds";

export interface CityRendererCallbacks {
  onHoverTile?(tile: TileCoordinate | null): void;
  onGroundClick?(tile: TileCoordinate): void;
  onInspectTile?(tile: TileCoordinate): void;
  onCameraHeadingChange?(heading: number): void;
}

function createGridLines(scene: Scene) {
  const half = WORLD_SIZE / 2;
  const lines: Vector3[][] = [];
  for (let index = 0; index <= MAP_SIZE; index += 1) {
    const offset = -half + index * TILE_SIZE;
    lines.push([
      new Vector3(-half, 0.035, offset),
      new Vector3(half, 0.035, offset),
    ]);
    lines.push([
      new Vector3(offset, 0.035, -half),
      new Vector3(offset, 0.035, half),
    ]);
  }

  const grid = CreateLineSystem("city-grid", { lines }, scene);
  grid.color = new Color3(0.3, 0.25, 0.16);
  grid.visibility = 0.17;
  grid.isPickable = false;
}

function tileCenter(tile: TileCoordinate, footprint = 1): Vector3 {
  const half = WORLD_SIZE / 2;
  return new Vector3(
    -half + (tile.x + footprint / 2) * TILE_SIZE,
    0,
    -half + (tile.y + footprint / 2) * TILE_SIZE,
  );
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

  const camera = new ArcRotateCamera(
    "city-camera",
    -Math.PI / 4,
    Math.PI / 3.2,
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

  let orthographicHeight = 56;
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
    options: { invertY?: boolean } = {},
  ) => {
    const cacheKey = `${asset.url}:${options.invertY ?? true}`;
    const cached = materialCache.get(cacheKey);
    if (cached) return cached;
    const material = new StandardMaterial(`asset:${asset.url}`, scene);
    material.diffuseColor = new Color3(0.54, 0.45, 0.3);
    material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.useAlphaFromDiffuseTexture = true;
    material.transparencyMode = Material.MATERIAL_ALPHATEST;
    material.alphaCutOff = 0.08;
    material.diffuseTexture = textureFor(asset, options);
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
    material.diffuseColor = new Color3(0.72, 0.61, 0.43);
    material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
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

  const ground = CreateGround(
    "city-ground",
    { width: WORLD_SIZE, height: WORLD_SIZE, subdivisions: 1 },
    scene,
  );
  ground.material = createLoessMaterial("ground-material", 8);
  createGridLines(scene);

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

  const gateCenter = tileCenter(CITY_GATE_TILE);
  const gateSprite = createSprite(
    "runtime-asset:gate.main",
    RUNTIME_ASSETS["gate.main"],
    gateCenter,
    RUNTIME_ASSETS["gate.main"].groundingFootprint,
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
  for (const assets of Object.values(CITIZEN_ASSETS)) {
    for (const asset of assets) materialFor(asset);
  }
  for (const assets of Object.values(CITIZEN_WORK_ASSETS)) {
    for (const asset of assets) materialFor(asset);
  }
  for (const asset of ROAD_AUTOTILE_ASSETS) {
    materialFor(asset, { invertY: false });
  }

  const buildingMeshes = new Map<
    number,
    { signature: string; meshes: AbstractMesh[] }
  >();
  const roadMeshes = new Map<number, { mask: number; mesh: AbstractMesh }>();
  type PersonAction = "walking" | "working" | "idle";
  interface PersonSprite {
    root: TransformNode;
    sprite: Mesh;
    role: CitizenVisualRole;
    action: PersonAction;
    source: "migrant" | "citizen" | "performer";
    frame: number;
    from: Vector3;
    target: Vector3;
    transitionStartedAt: number;
    lastFrameAt: number;
  }
  const personSprites = new Map<string, PersonSprite>();
  let buildTool: BuildTool = null;

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
    directionalSprites.add(sprite);
    sprite.onDisposeObservable.addOnce(() => directionalSprites.delete(sprite));
    applySpriteAsset(sprite, asset);
    const position = tileCenter(person);
    position.y = 0.1;
    root.position.copyFrom(position);
    return {
      root,
      sprite,
      role: person.role,
      action: person.action,
      source: person.source,
      frame: 0,
      from: position.clone(),
      target: position.clone(),
      transitionStartedAt: performance.now(),
      lastFrameAt: performance.now(),
    };
  };

  const personAnimationObserver = scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    for (const person of personSprites.values()) {
      const transition = Math.min(1, (now - person.transitionStartedAt) / 760);
      const eased = transition * transition * (3 - 2 * transition);
      Vector3.LerpToRef(
        person.from,
        person.target,
        eased,
        person.root.position,
      );
      person.root.position.y =
        0.1 +
        (person.action === "walking"
          ? Math.abs(Math.sin(now / 170)) * 0.05
          : 0);
      const frameDuration = person.action === "walking" ? 270 : 360;
      if (now - person.lastFrameAt >= frameDuration) {
        person.frame = person.frame === 0 ? 1 : 0;
        person.lastFrameAt = now;
        applySpriteAsset(
          person.sprite,
          person.source === "migrant"
            ? assetForMigrant(
                person.action === "working" ? "building" : "walking",
                person.frame,
              )
            : assetForCitizen(person.role, person.action, person.frame),
        );
      }
    }
  });

  const pickedTile = (): TileCoordinate | null => {
    const pick = scene.pick(
      scene.pointerX,
      scene.pointerY,
      (mesh) => mesh === ground,
    );
    const point = pick?.pickedPoint;
    if (!point) return null;
    const half = WORLD_SIZE / 2;
    const x = Math.floor((point.x + half) / TILE_SIZE);
    const y = Math.floor((point.z + half) / TILE_SIZE);
    if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return null;
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
      } else if (
        pointerInfo.event.button === 0 &&
        primaryClickStart !== null
      ) {
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
    setBuildTool(tool) {
      buildTool = tool;
      primaryClickStart = null;
      dragPan = null;
      if (!tool) preview.setEnabled(false);
    },
    setPlacementPreview(tile, status) {
      if (!tile || status === "hidden") {
        preview.setEnabled(false);
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
      preview.scaling.x = footprint / HOUSE_FOOTPRINT;
      preview.scaling.z = footprint / HOUSE_FOOTPRINT;
      preview.position.copyFrom(tileCenter(tile, footprint));
      preview.position.y = 0.19;
      preview.material =
        status === "valid"
          ? buildTool === "demolish"
            ? demolitionPreviewMaterial
            : validPreviewMaterial
          : invalidPreviewMaterial;
      preview.setEnabled(true);
    },
    syncWorld(snapshot) {
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
        target.y = 0.1;
        let rendered = personSprites.get(person.key);
        if (!rendered) {
          rendered = createPersonSprite(person);
          personSprites.set(person.key, rendered);
        } else if (!rendered.target.equalsWithEpsilon(target, 0.001)) {
          rendered.from.copyFrom(rendered.root.position);
          rendered.from.y = 0.1;
          rendered.target.copyFrom(target);
          rendered.transitionStartedAt = performance.now();
        }
        if (
          rendered.action !== person.action ||
          rendered.role !== person.role
        ) {
          rendered.action = person.action;
          rendered.role = person.role;
          rendered.source = person.source;
          rendered.frame = 0;
          rendered.lastFrameAt = performance.now();
          applySpriteAsset(rendered.sprite, assetForPerson(person, 0));
        }
      }

      const activeRoadKeys = new Set(
        snapshot.roads.map((road) => road.y * MAP_SIZE + road.x),
      );
      const roadMasks = roadConnectionMasks(snapshot.roads, {
        width: MAP_SIZE,
        height: MAP_SIZE,
      });
      for (const [key, rendered] of roadMeshes) {
        if (activeRoadKeys.has(key)) continue;
        rendered.mesh.dispose();
        roadMeshes.delete(key);
      }
      for (const road of snapshot.roads) {
        const key = road.y * MAP_SIZE + road.x;
        const mask = roadMasks.get(key) ?? 0;
        const rendered = roadMeshes.get(key);
        if (rendered) {
          if (rendered.mask !== mask) {
            rendered.mask = mask;
            rendered.mesh.material = materialFor(assetForRoadMask(mask), {
              invertY: false,
            });
          }
          continue;
        }
        const mesh = CreateGround(
          `runtime-asset:road:${road.x}:${road.y}:${mask.toString(16)}`,
          { width: TILE_SIZE * 1.03, height: TILE_SIZE * 1.03 },
          scene,
        );
        mesh.position.copyFrom(tileCenter(road));
        mesh.position.y = 0.055;
        mesh.material = materialFor(assetForRoadMask(mask), { invertY: false });
        mesh.isPickable = false;
        roadMeshes.set(key, { mask, mesh });
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
      window.removeEventListener("resize", handleResize);
      scene.dispose();
      engine.dispose();
    },
  };
}
