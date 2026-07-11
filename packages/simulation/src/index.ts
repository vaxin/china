import type {
  BuildingView,
  CitizenView,
  CommandResult,
  CropType,
  FarmBuildingView,
  GameCommand,
  GranaryBuildingView,
  HempFarmBuildingView,
  HouseBuildingView,
  HouseholdView,
  LaborPolicyView,
  LaborSector,
  MarketBuildingView,
  MigrantView,
  MusicSchoolBuildingView,
  PerformerView,
  InfantryFortBuildingView,
  TaxOfficeBuildingView,
  TradingPostBuildingView,
  TileCoordinate,
  WellBuildingView,
  WeaverBuildingView,
  WeaponsmithBuildingView,
  WorldSnapshot,
  WorkerRequest,
  WorkerResponse,
} from "@empire/protocol";

export {
  desirabilityAtSite,
  elementAtTile,
  fengShuiAtSite,
  type FengShuiAssessment,
  type FengShuiStatus,
  type FiveElement,
  type NearbyBuilding,
} from "./feng-shui";
export {
  calculateMonthlyFiscalReport,
  nextTreasuryBalance,
  type MonthlyFiscalInput,
  type MonthlyFiscalReport,
  type TaxableHouse,
  type TaxRate,
} from "./government-economy";
export {
  nextCitySentiment,
  type SentimentFactors,
  type SentimentReport,
} from "./city-sentiment";
import {
  CITY_GATE_TILE,
  CROP_TYPES,
  FARM_FOOTPRINT,
  FARM_STOCK_CAPACITY,
  FOOD_TRANSPORT_RANGE,
  GRANARY_FOOTPRINT,
  GRANARY_STOCK_CAPACITY,
  HEMP_FARM_FOOTPRINT,
  INFANTRY_FORT_FOOTPRINT,
  HOUSE_CAPACITY,
  HOUSEHOLD_FOOD_RESERVE_MAX,
  HOUSE_FOOTPRINT,
  MAP_SIZE,
  MARKET_FOOTPRINT,
  MARKET_RESTOCK_RANGE,
  MARKET_SERVICE_RANGE,
  MARKET_STOCK_CAPACITY,
  MUSIC_SCHOOL_FOOTPRINT,
  TAX_OFFICE_FOOTPRINT,
  TRADING_POST_FOOTPRINT,
  UPGRADED_HOUSE_CAPACITY,
  WELL_FOOTPRINT,
  WELL_SERVICE_RANGE,
  WEAVER_FOOTPRINT,
  WEAPONSMITH_FOOTPRINT,
  workerRequestSchema,
} from "@empire/protocol";
import { cropPhaseAtTick } from "./crop-calendar";
import { nextCitySentiment } from "./city-sentiment";
import { emptyFoodStocks, foodQualityForStocks } from "./food-quality";
import { desirabilityAtSite } from "./feng-shui";
import {
  calculateMonthlyFiscalReport,
  nextTreasuryBalance,
} from "./government-economy";
import {
  calculateLaborReport,
  DEFAULT_LABOR_POLICY,
  migrationAttractiveness,
} from "./labor-economy";

export interface WorldState {
  readonly kind: "world-state";
  tick: number;
  revision: number;
  nextEntityId: number | null;
  buildings: BuildingView[];
  roads: TileCoordinate[];
  households: HouseholdView[];
  migrants: MigrantView[];
  performers: PerformerView[];
  citizens: CitizenView[];
  laborPolicy: LaborPolicyView;
  shennongFavor: 0 | 1 | 2 | 3;
  diplomacy: NonNullable<WorldSnapshot["diplomacy"]>;
  economy: NonNullable<WorldSnapshot["economy"]>;
}

export interface CommandApplication {
  result: CommandResult;
  snapshot: WorldSnapshot;
}

export type PlacementStatus = "valid" | "occupied" | "out-of-bounds";
export type DemolitionStatus = "valid" | "empty" | "out-of-bounds";

function isHouse(building: BuildingView): building is HouseBuildingView {
  return building.typeId === "house";
}

function isWell(building: BuildingView): building is WellBuildingView {
  return building.typeId === "well";
}

function isFarm(building: BuildingView): building is FarmBuildingView {
  return building.typeId === "farm";
}

function isGranary(building: BuildingView): building is GranaryBuildingView {
  return building.typeId === "granary";
}

function isMarket(building: BuildingView): building is MarketBuildingView {
  return building.typeId === "market";
}

function isHempFarm(building: BuildingView): building is HempFarmBuildingView {
  return building.typeId === "hemp-farm";
}

function isWeaver(building: BuildingView): building is WeaverBuildingView {
  return building.typeId === "weaver";
}

function isWeaponsmith(
  building: BuildingView,
): building is WeaponsmithBuildingView {
  return building.typeId === "weaponsmith";
}

function isInfantryFort(
  building: BuildingView,
): building is InfantryFortBuildingView {
  return building.typeId === "infantry-fort";
}

function isTaxOffice(
  building: BuildingView,
): building is TaxOfficeBuildingView {
  return building.typeId === "tax-office";
}

function isMusicSchool(
  building: BuildingView,
): building is MusicSchoolBuildingView {
  return building.typeId === "music-school";
}

function isTradingPost(
  building: BuildingView,
): building is TradingPostBuildingView {
  return building.typeId === "trading-post";
}

function cloneBuilding(building: BuildingView): BuildingView {
  if (isHouse(building)) {
    return {
      ...building,
      footprint: { width: HOUSE_FOOTPRINT, height: HOUSE_FOOTPRINT },
    };
  }
  if (isFarm(building)) {
    return {
      ...building,
      cropType: building.cropType ?? "millet",
      footprint: { width: FARM_FOOTPRINT, height: FARM_FOOTPRINT },
    };
  }
  if (isGranary(building)) {
    const foodStocks = building.foodStocks ?? {
      ...emptyFoodStocks(),
      millet: building.foodStock,
    };
    return {
      ...building,
      foodStocks: { ...foodStocks },
      ...(building.acceptedCrops
        ? { acceptedCrops: [...building.acceptedCrops] }
        : {}),
      footprint: { width: GRANARY_FOOTPRINT, height: GRANARY_FOOTPRINT },
    };
  }
  if (isMarket(building)) {
    const foodStocks = building.foodStocks ?? {
      ...emptyFoodStocks(),
      millet: building.foodStock,
    };
    return {
      ...building,
      foodStocks: { ...foodStocks },
      footprint: { width: MARKET_FOOTPRINT, height: MARKET_FOOTPRINT },
    };
  }
  if (isHempFarm(building)) {
    return {
      ...building,
      footprint: {
        width: HEMP_FARM_FOOTPRINT,
        height: HEMP_FARM_FOOTPRINT,
      },
    };
  }
  if (isWeaver(building)) {
    return {
      ...building,
      footprint: { width: WEAVER_FOOTPRINT, height: WEAVER_FOOTPRINT },
    };
  }
  if (isWeaponsmith(building)) {
    return {
      ...building,
      footprint: {
        width: WEAPONSMITH_FOOTPRINT,
        height: WEAPONSMITH_FOOTPRINT,
      },
    };
  }
  if (isInfantryFort(building)) {
    return {
      ...building,
      footprint: {
        width: INFANTRY_FORT_FOOTPRINT,
        height: INFANTRY_FORT_FOOTPRINT,
      },
    };
  }
  if (isTaxOffice(building)) {
    return {
      ...building,
      footprint: {
        width: TAX_OFFICE_FOOTPRINT,
        height: TAX_OFFICE_FOOTPRINT,
      },
    };
  }
  if (isMusicSchool(building)) {
    return {
      ...building,
      footprint: {
        width: MUSIC_SCHOOL_FOOTPRINT,
        height: MUSIC_SCHOOL_FOOTPRINT,
      },
    };
  }
  if (isTradingPost(building)) {
    return {
      ...building,
      footprint: {
        width: TRADING_POST_FOOTPRINT,
        height: TRADING_POST_FOOTPRINT,
      },
    };
  }
  return {
    ...building,
    footprint: { width: WELL_FOOTPRINT, height: WELL_FOOTPRINT },
  };
}

function tileKey(tile: TileCoordinate): number {
  return tile.y * MAP_SIZE + tile.x;
}

function isInsideMap(tile: TileCoordinate): boolean {
  return tile.x >= 0 && tile.y >= 0 && tile.x < MAP_SIZE && tile.y < MAP_SIZE;
}

type BuildingTypeId = Extract<GameCommand, { type: "build" }>["buildingTypeId"];

function footprintFor(typeId: BuildingTypeId): number {
  if (typeId === "house") return HOUSE_FOOTPRINT;
  if (typeId === "farm") return FARM_FOOTPRINT;
  if (typeId === "granary") return GRANARY_FOOTPRINT;
  if (typeId === "market") return MARKET_FOOTPRINT;
  if (typeId === "hemp-farm") return HEMP_FARM_FOOTPRINT;
  if (typeId === "weaver") return WEAVER_FOOTPRINT;
  if (typeId === "weaponsmith") return WEAPONSMITH_FOOTPRINT;
  if (typeId === "infantry-fort") return INFANTRY_FORT_FOOTPRINT;
  if (typeId === "tax-office") return TAX_OFFICE_FOOTPRINT;
  if (typeId === "music-school") return MUSIC_SCHOOL_FOOTPRINT;
  if (typeId === "trading-post") return TRADING_POST_FOOTPRINT;
  return WELL_FOOTPRINT;
}

function tileInsideBuilding(
  tile: TileCoordinate,
  building: BuildingView,
): boolean {
  return (
    tile.x >= building.x &&
    tile.x < building.x + building.footprint.width &&
    tile.y >= building.y &&
    tile.y < building.y + building.footprint.height
  );
}

function footprintsOverlap(
  x: number,
  y: number,
  footprint: number,
  building: BuildingView,
): boolean {
  return (
    x < building.x + building.footprint.width &&
    x + footprint > building.x &&
    y < building.y + building.footprint.height &&
    y + footprint > building.y
  );
}

function footprintContainsRoad(
  roads: TileCoordinate[],
  x: number,
  y: number,
  footprint: number,
): boolean {
  return roads.some(
    (road) =>
      road.x >= x &&
      road.x < x + footprint &&
      road.y >= y &&
      road.y < y + footprint,
  );
}

function evaluateBuildingPlacement(
  snapshot: Pick<WorldSnapshot, "map" | "buildings" | "roads">,
  typeId: BuildingTypeId,
  x: number,
  y: number,
): PlacementStatus {
  const footprint = footprintFor(typeId);
  if (
    x < 0 ||
    y < 0 ||
    x + footprint > snapshot.map.width ||
    y + footprint > snapshot.map.height
  ) {
    return "out-of-bounds";
  }
  const coversCityGate =
    CITY_GATE_TILE.x >= x &&
    CITY_GATE_TILE.x < x + footprint &&
    CITY_GATE_TILE.y >= y &&
    CITY_GATE_TILE.y < y + footprint;
  if (coversCityGate) return "occupied";
  if (
    snapshot.buildings.some((building) =>
      footprintsOverlap(x, y, footprint, building),
    ) ||
    footprintContainsRoad(snapshot.roads, x, y, footprint)
  ) {
    return "occupied";
  }
  return "valid";
}

export function evaluateHousePlacement(
  snapshot: WorldSnapshot,
  x: number,
  y: number,
): PlacementStatus {
  return evaluateBuildingPlacement(snapshot, "house", x, y);
}

export function evaluateWellPlacement(
  snapshot: WorldSnapshot,
  x: number,
  y: number,
): PlacementStatus {
  return evaluateBuildingPlacement(snapshot, "well", x, y);
}

export function evaluateFarmPlacement(
  snapshot: WorldSnapshot,
  x: number,
  y: number,
): PlacementStatus {
  return evaluateBuildingPlacement(snapshot, "farm", x, y);
}

export function evaluateGranaryPlacement(
  snapshot: WorldSnapshot,
  x: number,
  y: number,
): PlacementStatus {
  return evaluateBuildingPlacement(snapshot, "granary", x, y);
}

export function evaluateMarketPlacement(
  snapshot: WorldSnapshot,
  x: number,
  y: number,
): PlacementStatus {
  return evaluateBuildingPlacement(snapshot, "market", x, y);
}

export function evaluateHempFarmPlacement(
  snapshot: WorldSnapshot,
  x: number,
  y: number,
): PlacementStatus {
  return evaluateBuildingPlacement(snapshot, "hemp-farm", x, y);
}

export function evaluateWeaverPlacement(
  snapshot: WorldSnapshot,
  x: number,
  y: number,
): PlacementStatus {
  return evaluateBuildingPlacement(snapshot, "weaver", x, y);
}

export function evaluateWeaponsmithPlacement(
  snapshot: WorldSnapshot,
  x: number,
  y: number,
): PlacementStatus {
  return evaluateBuildingPlacement(snapshot, "weaponsmith", x, y);
}

export function evaluateInfantryFortPlacement(
  snapshot: WorldSnapshot,
  x: number,
  y: number,
): PlacementStatus {
  return evaluateBuildingPlacement(snapshot, "infantry-fort", x, y);
}

export function evaluateTaxOfficePlacement(
  snapshot: WorldSnapshot,
  x: number,
  y: number,
): PlacementStatus {
  return evaluateBuildingPlacement(snapshot, "tax-office", x, y);
}

export function evaluateMusicSchoolPlacement(
  snapshot: WorldSnapshot,
  x: number,
  y: number,
): PlacementStatus {
  return evaluateBuildingPlacement(snapshot, "music-school", x, y);
}

export function evaluateTradingPostPlacement(
  snapshot: WorldSnapshot,
  x: number,
  y: number,
): PlacementStatus {
  return evaluateBuildingPlacement(snapshot, "trading-post", x, y);
}

export function evaluateRoadPlacement(
  snapshot: WorldSnapshot,
  x: number,
  y: number,
): PlacementStatus {
  if (x < 0 || y < 0 || x >= snapshot.map.width || y >= snapshot.map.height) {
    return "out-of-bounds";
  }
  const tile = { x, y };
  if (
    snapshot.roads.some((road) => road.x === x && road.y === y) ||
    snapshot.buildings.some((building) => tileInsideBuilding(tile, building))
  ) {
    return "occupied";
  }
  return "valid";
}

export function evaluateDemolition(
  snapshot: WorldSnapshot,
  x: number,
  y: number,
): DemolitionStatus {
  if (x < 0 || y < 0 || x >= snapshot.map.width || y >= snapshot.map.height) {
    return "out-of-bounds";
  }
  const tile = { x, y };
  return snapshot.roads.some((road) => road.x === x && road.y === y) ||
    snapshot.buildings.some((building) => tileInsideBuilding(tile, building))
    ? "valid"
    : "empty";
}

export interface SimulationRuntime {
  handle(request: unknown): WorkerResponse;
}

function extractRequestSequence(request: unknown): number | undefined {
  if (typeof request !== "object" || request === null) return undefined;
  const command = Reflect.get(request, "command");
  if (typeof command !== "object" || command === null) return undefined;
  const seq = Reflect.get(command, "seq");
  return Number.isSafeInteger(seq) && Number(seq) >= 0
    ? Number(seq)
    : undefined;
}

export function createSimulationRuntime(): SimulationRuntime {
  let world = createWorld();
  return {
    handle(request) {
      const parsedRequest = workerRequestSchema.safeParse(request);
      if (!parsedRequest.success) {
        const seq = extractRequestSequence(request);
        return {
          type: "protocol-error",
          reasonCode: "invalid-request",
          ...(seq === undefined ? {} : { seq }),
        };
      }
      const validRequest: WorkerRequest = parsedRequest.data;
      if (validRequest.type === "initialize") {
        world = validRequest.snapshot
          ? hydrateWorld(validRequest.snapshot)
          : createWorld();
        return { type: "ready", snapshot: snapshotWorld(world) };
      }
      const application = applyCommand(world, validRequest.command);
      return {
        type: "command-result",
        result: application.result,
        snapshot: application.snapshot,
      };
    },
  };
}

export function createWorld(): WorldState {
  return {
    kind: "world-state",
    tick: 0,
    revision: 0,
    nextEntityId: 1,
    buildings: [],
    roads: [],
    households: [],
    migrants: [],
    performers: [],
    citizens: [],
    laborPolicy: {
      ...DEFAULT_LABOR_POLICY,
      priorities: [...DEFAULT_LABOR_POLICY.priorities],
    },
    shennongFavor: 0,
    diplomacy: { relation: 0, tradeOpen: false, envoys: [] },
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
}

export function hydrateWorld(snapshot: WorldSnapshot): WorldState {
  const buildings = snapshot.buildings
    .map(cloneBuilding)
    .sort((left, right) => left.id - right.id);
  const highestEntityId = buildings.reduce(
    (highest, building) => Math.max(highest, building.id),
    0,
  );
  return {
    kind: "world-state",
    tick: snapshot.tick,
    revision: snapshot.revision,
    nextEntityId:
      highestEntityId === Number.MAX_SAFE_INTEGER ? null : highestEntityId + 1,
    buildings,
    roads: snapshot.roads
      .map((road) => ({ ...road }))
      .sort((left, right) => tileKey(left) - tileKey(right)),
    households: snapshot.households
      .map((household) => ({ ...household }))
      .sort((left, right) => left.houseId - right.houseId),
    migrants: snapshot.migrants
      .map((migrant) => ({ ...migrant }))
      .sort((left, right) => left.houseId - right.houseId),
    performers: (snapshot.performers ?? [])
      .map((performer) => ({ ...performer }))
      .sort((left, right) => left.schoolId - right.schoolId),
    citizens: (snapshot.citizens ?? [])
      .map((citizen) => ({ ...citizen }))
      .sort((left, right) => left.id - right.id),
    laborPolicy: {
      ...(snapshot.laborPolicy ?? DEFAULT_LABOR_POLICY),
      priorities: [
        ...(snapshot.laborPolicy?.priorities ??
          DEFAULT_LABOR_POLICY.priorities),
      ],
    },
    shennongFavor: snapshot.shennongFavor ?? 0,
    diplomacy: snapshot.diplomacy
      ? {
          ...snapshot.diplomacy,
          envoys: snapshot.diplomacy.envoys.map((envoy) => ({ ...envoy })),
        }
      : { relation: 0, tradeOpen: false, envoys: [] },
    economy: snapshot.economy
      ? { ...snapshot.economy }
      : {
          treasury: 500,
          taxRate: "standard",
          lastTaxRevenue: 0,
          lastPayroll: 0,
          taxableHouses: 0,
          sentiment: 50,
          lastTradeRevenue: 0,
        },
  };
}

function cloneWorldState(world: WorldState): WorldState {
  return {
    kind: "world-state",
    tick: world.tick,
    revision: world.revision,
    nextEntityId: world.nextEntityId,
    buildings: world.buildings.map(cloneBuilding),
    roads: world.roads.map((road) => ({ ...road })),
    households: world.households.map((household) => ({ ...household })),
    migrants: world.migrants.map((migrant) => ({ ...migrant })),
    performers: world.performers.map((performer) => ({ ...performer })),
    citizens: world.citizens.map((citizen) => ({ ...citizen })),
    laborPolicy: {
      ...world.laborPolicy,
      priorities: [...world.laborPolicy.priorities],
    },
    shennongFavor: world.shennongFavor,
    diplomacy: {
      ...world.diplomacy,
      envoys: world.diplomacy.envoys.map((envoy) => ({ ...envoy })),
    },
    economy: { ...world.economy },
  };
}

function commitWorldState(target: WorldState, source: WorldState): void {
  target.tick = source.tick;
  target.revision = source.revision;
  target.nextEntityId = source.nextEntityId;
  target.buildings = source.buildings;
  target.roads = source.roads;
  target.households = source.households;
  target.migrants = source.migrants;
  target.performers = source.performers;
  target.citizens = source.citizens;
  target.laborPolicy = source.laborPolicy;
  target.shennongFavor = source.shennongFavor;
  target.diplomacy = source.diplomacy;
  target.economy = source.economy;
}

function rejected(
  world: WorldState,
  seq: number,
  reasonCode:
    | "occupied"
    | "out-of-bounds"
    | "invalid-path"
    | "nothing-to-demolish"
    | "not-found"
    | "insufficient-stock"
    | "insufficient-funds"
    | "requirements-not-met"
    | "counter-exhausted",
): CommandApplication {
  return {
    result: { seq, accepted: false, reasonCode },
    snapshot: snapshotWorld(world),
  };
}

function accepted(world: WorldState, seq: number): CommandApplication {
  return {
    result: {
      seq,
      accepted: true,
      appliedAtTick: world.tick,
      revision: world.revision,
    },
    snapshot: snapshotWorld(world),
  };
}

function applyBuildCommand(
  world: WorldState,
  command: Extract<GameCommand, { type: "build" }>,
): CommandApplication {
  const placement = evaluateBuildingPlacement(
    {
      map: { width: MAP_SIZE, height: MAP_SIZE },
      buildings: world.buildings,
      roads: world.roads,
    },
    command.buildingTypeId,
    command.x,
    command.y,
  );
  if (placement !== "valid") return rejected(world, command.seq, placement);
  if (
    world.nextEntityId === null ||
    world.revision === Number.MAX_SAFE_INTEGER
  ) {
    return rejected(world, command.seq, "counter-exhausted");
  }

  const entityId = world.nextEntityId;

  let building: BuildingView;
  if (command.buildingTypeId === "house") {
    building = {
      id: entityId,
      typeId: "house",
      x: command.x,
      y: command.y,
      rotation: command.rotation,
      footprint: { width: HOUSE_FOOTPRINT, height: HOUSE_FOOTPRINT },
      level: 1,
      constructionStage: 0,
    };
  } else if (command.buildingTypeId === "well") {
    building = {
      id: entityId,
      typeId: "well",
      x: command.x,
      y: command.y,
      rotation: 0,
      footprint: { width: WELL_FOOTPRINT, height: WELL_FOOTPRINT },
    };
  } else if (command.buildingTypeId === "farm") {
    building = {
      id: entityId,
      typeId: "farm",
      x: command.x,
      y: command.y,
      rotation: 0,
      footprint: { width: FARM_FOOTPRINT, height: FARM_FOOTPRINT },
      cropType: command.cropType ?? "millet",
      foodStock: 0,
    };
  } else if (command.buildingTypeId === "granary") {
    building = {
      id: entityId,
      typeId: "granary",
      x: command.x,
      y: command.y,
      rotation: 0,
      footprint: { width: GRANARY_FOOTPRINT, height: GRANARY_FOOTPRINT },
      foodStock: 0,
      foodStocks: emptyFoodStocks(),
    };
  } else if (command.buildingTypeId === "market") {
    building = {
      id: entityId,
      typeId: "market",
      x: command.x,
      y: command.y,
      rotation: 0,
      footprint: { width: MARKET_FOOTPRINT, height: MARKET_FOOTPRINT },
      foodStock: 0,
      foodStocks: emptyFoodStocks(),
      clothingStock: 0,
    };
  } else if (command.buildingTypeId === "hemp-farm") {
    building = {
      id: entityId,
      typeId: "hemp-farm",
      x: command.x,
      y: command.y,
      rotation: 0,
      footprint: {
        width: HEMP_FARM_FOOTPRINT,
        height: HEMP_FARM_FOOTPRINT,
      },
      hempStock: 0,
    };
  } else if (command.buildingTypeId === "weaver") {
    building = {
      id: entityId,
      typeId: "weaver",
      x: command.x,
      y: command.y,
      rotation: 0,
      footprint: { width: WEAVER_FOOTPRINT, height: WEAVER_FOOTPRINT },
      hempStock: 0,
      clothingStock: 0,
    };
  } else if (command.buildingTypeId === "weaponsmith") {
    building = {
      id: entityId,
      typeId: "weaponsmith",
      x: command.x,
      y: command.y,
      rotation: 0,
      footprint: {
        width: WEAPONSMITH_FOOTPRINT,
        height: WEAPONSMITH_FOOTPRINT,
      },
      weaponStock: 0,
    };
  } else if (command.buildingTypeId === "infantry-fort") {
    building = {
      id: entityId,
      typeId: "infantry-fort",
      x: command.x,
      y: command.y,
      rotation: 0,
      footprint: {
        width: INFANTRY_FORT_FOOTPRINT,
        height: INFANTRY_FORT_FOOTPRINT,
      },
      weaponStock: 0,
      soldiers: 0,
    };
  } else if (command.buildingTypeId === "tax-office") {
    building = {
      id: entityId,
      typeId: "tax-office",
      x: command.x,
      y: command.y,
      rotation: 0,
      footprint: {
        width: TAX_OFFICE_FOOTPRINT,
        height: TAX_OFFICE_FOOTPRINT,
      },
    };
  } else if (command.buildingTypeId === "music-school") {
    building = {
      id: entityId,
      typeId: "music-school",
      x: command.x,
      y: command.y,
      rotation: 0,
      footprint: {
        width: MUSIC_SCHOOL_FOOTPRINT,
        height: MUSIC_SCHOOL_FOOTPRINT,
      },
    };
  } else {
    building = {
      id: entityId,
      typeId: "trading-post",
      x: command.x,
      y: command.y,
      rotation: 0,
      footprint: {
        width: TRADING_POST_FOOTPRINT,
        height: TRADING_POST_FOOTPRINT,
      },
      clothingStock: 0,
    };
  }
  world.nextEntityId =
    entityId === Number.MAX_SAFE_INTEGER ? null : entityId + 1;
  world.revision += 1;
  world.buildings.push(building);
  world.buildings.sort((left, right) => left.id - right.id);
  return accepted(world, command.seq);
}

function applyRoadPathCommand(
  world: WorldState,
  command: Extract<GameCommand, { type: "build-road-path" }>,
): CommandApplication {
  if (command.tiles.length === 0) {
    return rejected(world, command.seq, "invalid-path");
  }
  const pathKeys = new Set<number>();
  const existingRoadKeys = new Set(world.roads.map(tileKey));
  for (let index = 0; index < command.tiles.length; index += 1) {
    const tile = command.tiles[index];
    if (
      !Number.isSafeInteger(tile.x) ||
      !Number.isSafeInteger(tile.y) ||
      tile.x < 0 ||
      tile.y < 0 ||
      tile.x >= MAP_SIZE ||
      tile.y >= MAP_SIZE
    ) {
      return rejected(world, command.seq, "out-of-bounds");
    }
    const key = tileKey(tile);
    if (pathKeys.has(key)) return rejected(world, command.seq, "invalid-path");
    pathKeys.add(key);
    const previous = command.tiles[index - 1];
    if (
      previous &&
      Math.abs(tile.x - previous.x) + Math.abs(tile.y - previous.y) !== 1
    ) {
      return rejected(world, command.seq, "invalid-path");
    }
    if (
      existingRoadKeys.has(key) ||
      world.buildings.some((building) => tileInsideBuilding(tile, building))
    ) {
      return rejected(world, command.seq, "occupied");
    }
  }
  if (world.revision === Number.MAX_SAFE_INTEGER) {
    return rejected(world, command.seq, "counter-exhausted");
  }
  world.roads.push(...command.tiles.map((tile) => ({ ...tile })));
  world.roads.sort((left, right) => tileKey(left) - tileKey(right));
  world.revision += 1;
  return accepted(world, command.seq);
}

function applyDemolishCommand(
  world: WorldState,
  command: Extract<GameCommand, { type: "demolish" }>,
): CommandApplication {
  if (
    command.x < 0 ||
    command.y < 0 ||
    command.x >= MAP_SIZE ||
    command.y >= MAP_SIZE
  ) {
    return rejected(world, command.seq, "out-of-bounds");
  }
  const roadIndex = world.roads.findIndex(
    (road) => road.x === command.x && road.y === command.y,
  );
  if (roadIndex >= 0) {
    if (world.revision === Number.MAX_SAFE_INTEGER) {
      return rejected(world, command.seq, "counter-exhausted");
    }
    world.roads.splice(roadIndex, 1);
    stabilizeAfterInfrastructureRemoval(world);
    world.revision += 1;
    return accepted(world, command.seq);
  }
  const tile = { x: command.x, y: command.y };
  const buildingIndex = world.buildings.findIndex((building) =>
    tileInsideBuilding(tile, building),
  );
  if (buildingIndex < 0) {
    return rejected(world, command.seq, "nothing-to-demolish");
  }
  if (world.revision === Number.MAX_SAFE_INTEGER) {
    return rejected(world, command.seq, "counter-exhausted");
  }
  const [removedBuilding] = world.buildings.splice(buildingIndex, 1);
  if (isHouse(removedBuilding)) {
    world.households = world.households.filter(
      (household) => household.houseId !== removedBuilding.id,
    );
    world.migrants = world.migrants.filter(
      (migrant) => migrant.houseId !== removedBuilding.id,
    );
    world.citizens = world.citizens.filter(
      (citizen) => citizen.houseId !== removedBuilding.id,
    );
  } else if (isWell(removedBuilding)) {
    stabilizeAfterInfrastructureRemoval(world);
  }
  if (isMusicSchool(removedBuilding)) {
    world.performers = world.performers.filter(
      (performer) => performer.schoolId !== removedBuilding.id,
    );
  }
  if (isMarket(removedBuilding)) {
    world.performers = world.performers.filter(
      (performer) => performer.targetMarketId !== removedBuilding.id,
    );
  }
  if (!isHouse(removedBuilding)) {
    for (const citizen of world.citizens) {
      if (citizen.workplaceId !== removedBuilding.id) continue;
      citizen.workplaceId = null;
      citizen.state = "returning";
      citizen.dwellTicks = 0;
    }
  }
  world.revision += 1;
  return accepted(world, command.seq);
}

export function applyCommand(
  world: WorldState,
  command: GameCommand,
): CommandApplication {
  if (command.type === "build") return applyBuildCommand(world, command);
  if (command.type === "build-road-path") {
    return applyRoadPathCommand(world, command);
  }
  if (command.type === "demolish") {
    return applyDemolishCommand(world, command);
  }
  if (command.type === "set-labor-policy") {
    const unchanged =
      world.laborPolicy.wageLevel === command.wageLevel &&
      world.laborPolicy.priorities.every(
        (sector, index) => sector === command.priorities[index],
      );
    if (unchanged) return accepted(world, command.seq);
    if (world.revision === Number.MAX_SAFE_INTEGER) {
      return rejected(world, command.seq, "counter-exhausted");
    }
    world.laborPolicy = {
      wageLevel: command.wageLevel,
      priorities: [...command.priorities],
    };
    world.revision += 1;
    return accepted(world, command.seq);
  }
  if (command.type === "set-granary-policy") {
    const granary = world.buildings.find(
      (building) =>
        building.id === command.granaryId && building.typeId === "granary",
    );
    if (!granary || granary.typeId !== "granary") {
      return rejected(world, command.seq, "not-found");
    }
    const acceptedCrops = new Set(granary.acceptedCrops ?? CROP_TYPES);
    const alreadyAccepted = acceptedCrops.has(command.cropType);
    if (alreadyAccepted === command.accept) return accepted(world, command.seq);
    if (world.revision === Number.MAX_SAFE_INTEGER) {
      return rejected(world, command.seq, "counter-exhausted");
    }
    if (command.accept) acceptedCrops.add(command.cropType);
    else acceptedCrops.delete(command.cropType);
    const normalized = CROP_TYPES.filter((crop) => acceptedCrops.has(crop));
    if (normalized.length === CROP_TYPES.length) delete granary.acceptedCrops;
    else granary.acceptedCrops = normalized;
    world.revision += 1;
    return accepted(world, command.seq);
  }
  if (command.type === "make-offering") {
    const granary = world.buildings.find(
      (building) =>
        building.id === command.granaryId && building.typeId === "granary",
    );
    if (!granary || granary.typeId !== "granary") {
      return rejected(world, command.seq, "not-found");
    }
    if (granary.foodStocks[command.cropType] <= 0) {
      return rejected(world, command.seq, "insufficient-stock");
    }
    if (world.revision === Number.MAX_SAFE_INTEGER) {
      return rejected(world, command.seq, "counter-exhausted");
    }
    granary.foodStocks[command.cropType] -= 1;
    granary.foodStock -= 1;
    world.shennongFavor = Math.min(3, world.shennongFavor + 1) as 1 | 2 | 3;
    world.revision += 1;
    return accepted(world, command.seq);
  }
  if (command.type === "send-gift") {
    const granary = world.buildings.find(
      (building) =>
        building.id === command.granaryId && building.typeId === "granary",
    );
    if (!granary || granary.typeId !== "granary") {
      return rejected(world, command.seq, "not-found");
    }
    if (granary.foodStocks[command.cropType] <= 0) {
      return rejected(world, command.seq, "insufficient-stock");
    }
    if (
      world.revision === Number.MAX_SAFE_INTEGER ||
      world.tick > Number.MAX_SAFE_INTEGER - 3
    ) {
      return rejected(world, command.seq, "counter-exhausted");
    }
    granary.foodStocks[command.cropType] -= 1;
    granary.foodStock -= 1;
    world.diplomacy.envoys.push({
      missionId: command.seq,
      arrivesAtTick: world.tick + 3,
      cropType: command.cropType,
    });
    world.diplomacy.envoys.sort(
      (left, right) => left.missionId - right.missionId,
    );
    world.revision += 1;
    return accepted(world, command.seq);
  }
  if (command.type === "set-tax-rate") {
    if (world.economy.taxRate === command.taxRate) {
      return accepted(world, command.seq);
    }
    if (world.revision === Number.MAX_SAFE_INTEGER) {
      return rejected(world, command.seq, "counter-exhausted");
    }
    world.economy.taxRate = command.taxRate;
    world.revision += 1;
    return accepted(world, command.seq);
  }
  if (command.type === "hold-new-year-festival") {
    const year = Math.floor(world.tick / 12) + 1;
    const month = (world.tick % 12) + 1;
    if (
      month !== 2 ||
      world.economy.lastFestivalYear === year ||
      !world.buildings.some(isMusicSchool)
    ) {
      return rejected(world, command.seq, "requirements-not-met");
    }
    if (world.economy.treasury < 20) {
      return rejected(world, command.seq, "insufficient-funds");
    }
    const granary = world.buildings
      .filter(isGranary)
      .sort((left, right) => left.id - right.id)
      .find((candidate) => candidate.foodStock > 0);
    const cropType = granary
      ? CROP_TYPES.find((crop) => granary.foodStocks[crop] > 0)
      : undefined;
    if (!granary || !cropType) {
      return rejected(world, command.seq, "insufficient-stock");
    }
    if (world.revision === Number.MAX_SAFE_INTEGER) {
      return rejected(world, command.seq, "counter-exhausted");
    }
    granary.foodStocks[cropType] -= 1;
    granary.foodStock -= 1;
    world.economy.treasury -= 20;
    world.economy.sentiment = Math.min(100, world.economy.sentiment + 10);
    world.economy.lastFestivalYear = year;
    world.revision += 1;
    return accepted(world, command.seq);
  }
  if (!advanceTicksAtomically(world, command.ticks)) {
    return rejected(world, command.seq, "counter-exhausted");
  }
  return accepted(world, command.seq);
}

function orthogonalNeighbors(tile: TileCoordinate): TileCoordinate[] {
  return [
    { x: tile.x + 1, y: tile.y },
    { x: tile.x - 1, y: tile.y },
    { x: tile.x, y: tile.y + 1 },
    { x: tile.x, y: tile.y - 1 },
  ];
}

function footprintBorderTiles(building: BuildingView): TileCoordinate[] {
  const tiles: TileCoordinate[] = [];
  for (let xOffset = 0; xOffset < building.footprint.width; xOffset += 1) {
    tiles.push(
      { x: building.x + xOffset, y: building.y - 1 },
      {
        x: building.x + xOffset,
        y: building.y + building.footprint.height,
      },
    );
  }
  for (let yOffset = 0; yOffset < building.footprint.height; yOffset += 1) {
    tiles.push(
      { x: building.x - 1, y: building.y + yOffset },
      {
        x: building.x + building.footprint.width,
        y: building.y + yOffset,
      },
    );
  }
  return tiles.filter(
    (tile) =>
      tile.x >= 0 && tile.y >= 0 && tile.x < MAP_SIZE && tile.y < MAP_SIZE,
  );
}

function connectedRoadKeys(roads: TileCoordinate[]): Set<number> {
  const allRoadKeys = new Set(roads.map(tileKey));
  const entranceKey = tileKey(CITY_GATE_TILE);
  if (!allRoadKeys.has(entranceKey)) return new Set();
  const connected = new Set<number>([entranceKey]);
  const queue: TileCoordinate[] = [{ ...CITY_GATE_TILE }];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    for (const neighbor of orthogonalNeighbors(current)) {
      if (!isInsideMap(neighbor)) continue;
      const key = tileKey(neighbor);
      if (allRoadKeys.has(key) && !connected.has(key)) {
        connected.add(key);
        queue.push(neighbor);
      }
    }
  }
  return connected;
}

function shortestRoadPathToHouse(
  world: Pick<WorldState, "roads">,
  start: TileCoordinate,
  house: BuildingView,
): TileCoordinate[] | null {
  const roadByKey = new Map(world.roads.map((road) => [tileKey(road), road]));
  const startKey = tileKey(start);
  if (!roadByKey.has(startKey)) return null;
  const destinationKeys = new Set(
    footprintBorderTiles(house)
      .map(tileKey)
      .filter((key) => roadByKey.has(key)),
  );
  if (destinationKeys.size === 0) return null;

  const queue = [startKey];
  const previous = new Map<number, number | null>([[startKey, null]]);
  let destinationKey: number | null = null;
  let head = 0;
  while (head < queue.length) {
    const key = queue[head];
    head += 1;
    if (destinationKeys.has(key)) {
      destinationKey = key;
      break;
    }
    const tile = roadByKey.get(key);
    if (!tile) continue;
    const neighbors = orthogonalNeighbors(tile)
      .filter(isInsideMap)
      .map(tileKey)
      .filter((neighborKey) => roadByKey.has(neighborKey))
      .sort((left, right) => left - right);
    for (const neighborKey of neighbors) {
      if (previous.has(neighborKey)) continue;
      previous.set(neighborKey, key);
      queue.push(neighborKey);
    }
  }
  if (destinationKey === null) return null;

  const reversedPath: TileCoordinate[] = [];
  let cursor: number | null = destinationKey;
  while (cursor !== null) {
    const tile = roadByKey.get(cursor);
    if (!tile) return null;
    reversedPath.push({ ...tile });
    cursor = previous.get(cursor) ?? null;
  }
  return reversedPath.reverse();
}

function waterRoadDistances(world: WorldState): Map<number, number> {
  const allRoadKeys = new Set(world.roads.map(tileKey));
  const tileByKey = new Map(world.roads.map((road) => [tileKey(road), road]));
  const distances = new Map<number, number>();
  const queue: number[] = [];
  for (const well of world.buildings.filter(isWell)) {
    for (const tile of footprintBorderTiles(well)) {
      const key = tileKey(tile);
      if (allRoadKeys.has(key) && !distances.has(key)) {
        distances.set(key, 0);
        queue.push(key);
      }
    }
  }
  let head = 0;
  while (head < queue.length) {
    const key = queue[head];
    head += 1;
    const distance = distances.get(key) ?? 0;
    if (distance >= WELL_SERVICE_RANGE) continue;
    const tile = tileByKey.get(key);
    if (!tile) continue;
    for (const neighbor of orthogonalNeighbors(tile)) {
      if (!isInsideMap(neighbor)) continue;
      const neighborKey = tileKey(neighbor);
      if (allRoadKeys.has(neighborKey) && !distances.has(neighborKey)) {
        distances.set(neighborKey, distance + 1);
        queue.push(neighborKey);
      }
    }
  }
  return distances;
}

function shortestRoadDistance(
  world: WorldState,
  source: BuildingView,
  destination: BuildingView,
  range: number,
): number | null {
  const roadByKey = new Map(world.roads.map((road) => [tileKey(road), road]));
  const destinationKeys = new Set(
    footprintBorderTiles(destination)
      .map(tileKey)
      .filter((key) => roadByKey.has(key)),
  );
  if (destinationKeys.size === 0) return null;

  const distances = new Map<number, number>();
  const queue: number[] = [];
  for (const tile of footprintBorderTiles(source)) {
    const key = tileKey(tile);
    if (roadByKey.has(key) && !distances.has(key)) {
      distances.set(key, 0);
      queue.push(key);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const key = queue[head];
    head += 1;
    const distance = distances.get(key) ?? 0;
    if (destinationKeys.has(key)) return distance;
    if (distance >= range) continue;
    const tile = roadByKey.get(key);
    if (!tile) continue;
    for (const neighbor of orthogonalNeighbors(tile)) {
      if (!isInsideMap(neighbor)) continue;
      const neighborKey = tileKey(neighbor);
      if (roadByKey.has(neighborKey) && !distances.has(neighborKey)) {
        distances.set(neighborKey, distance + 1);
        queue.push(neighborKey);
      }
    }
  }
  return null;
}

function reconcileFoodProductionAndTransport(world: WorldState): void {
  const farms = world.buildings
    .filter(isFarm)
    .sort((left, right) => left.id - right.id);
  const granaries = world.buildings
    .filter(isGranary)
    .sort((left, right) => left.id - right.id);

  if (
    farms.some(
      (farm) => cropPhaseAtTick(farm.cropType, world.tick) === "harvest",
    )
  ) {
    for (const farm of farms) {
      if (
        cropPhaseAtTick(farm.cropType, world.tick) === "harvest" &&
        farm.foodStock < FARM_STOCK_CAPACITY
      ) {
        farm.foodStock = Math.min(
          FARM_STOCK_CAPACITY,
          farm.foodStock + (world.shennongFavor >= 3 ? 2 : 1),
        ) as FarmBuildingView["foodStock"];
      }
    }
  }

  for (const granary of granaries) {
    if (granary.foodStock >= GRANARY_STOCK_CAPACITY) continue;
    const candidates = farms
      .filter(
        (farm) =>
          farm.foodStock > 0 &&
          (granary.acceptedCrops ?? CROP_TYPES).includes(farm.cropType),
      )
      .map((farm) => ({
        farm,
        distance: shortestRoadDistance(
          world,
          farm,
          granary,
          FOOD_TRANSPORT_RANGE,
        ),
      }))
      .filter(
        (
          candidate,
        ): candidate is { farm: FarmBuildingView; distance: number } =>
          candidate.distance !== null,
      )
      .sort(
        (left, right) =>
          left.distance - right.distance || left.farm.id - right.farm.id,
      );
    const source = candidates[0]?.farm;
    if (!source) continue;
    source.foodStock -= 1;
    granary.foodStock += 1;
    granary.foodStocks[source.cropType] += 1;
  }
}

function cropForMarketRestock(
  source: GranaryBuildingView,
  market: MarketBuildingView,
): CropType | null {
  return (
    CROP_TYPES.filter((cropType) => source.foodStocks[cropType] > 0).sort(
      (left, right) =>
        market.foodStocks[left] - market.foodStocks[right] ||
        CROP_TYPES.indexOf(left) - CROP_TYPES.indexOf(right),
    )[0] ?? null
  );
}

function reconcileMarketRestocking(world: WorldState): void {
  const granaries = world.buildings
    .filter(isGranary)
    .sort((left, right) => left.id - right.id);
  const markets = world.buildings
    .filter(isMarket)
    .sort((left, right) => left.id - right.id);

  for (const market of markets) {
    if (market.foodStock >= MARKET_STOCK_CAPACITY) continue;
    const candidates = granaries
      .filter((granary) => granary.foodStock > 0)
      .map((granary) => ({
        granary,
        distance: shortestRoadDistance(
          world,
          granary,
          market,
          MARKET_RESTOCK_RANGE,
        ),
      }))
      .filter(
        (
          candidate,
        ): candidate is { granary: GranaryBuildingView; distance: number } =>
          candidate.distance !== null,
      )
      .sort(
        (left, right) =>
          left.distance - right.distance || left.granary.id - right.granary.id,
      );
    const source = candidates[0]?.granary;
    if (!source) continue;
    const cropType = cropForMarketRestock(source, market);
    if (!cropType) continue;
    source.foodStock -= 1;
    source.foodStocks[cropType] -= 1;
    market.foodStock += 1;
    market.foodStocks[cropType] += 1;
  }
}

function reconcileHempIndustry(world: WorldState): void {
  const hempFarms = world.buildings
    .filter(isHempFarm)
    .sort((left, right) => left.id - right.id);
  const weavers = world.buildings
    .filter(isWeaver)
    .sort((left, right) => left.id - right.id);
  const markets = world.buildings
    .filter(isMarket)
    .sort((left, right) => left.id - right.id);

  if ((world.tick % 12) + 1 === 9) {
    for (const farm of hempFarms) {
      if (farm.hempStock < 3) farm.hempStock += 1;
    }
  }

  for (const weaver of weavers) {
    if (weaver.hempStock >= 2) continue;
    const source = hempFarms
      .filter((farm) => farm.hempStock > 0)
      .map((farm) => ({
        farm,
        distance: shortestRoadDistance(
          world,
          farm,
          weaver,
          FOOD_TRANSPORT_RANGE,
        ),
      }))
      .filter(
        (
          candidate,
        ): candidate is {
          farm: HempFarmBuildingView;
          distance: number;
        } => candidate.distance !== null,
      )
      .sort(
        (left, right) =>
          left.distance - right.distance || left.farm.id - right.farm.id,
      )[0]?.farm;
    if (source) {
      source.hempStock -= 1;
      weaver.hempStock += 1;
    }
    if (weaver.hempStock > 0 && weaver.clothingStock < 2) {
      weaver.hempStock -= 1;
      weaver.clothingStock += 1;
    }
  }

  for (const market of markets) {
    if ((market.clothingStock ?? 0) >= 4) continue;
    const source = weavers
      .filter((weaver) => weaver.clothingStock > 0)
      .map((weaver) => ({
        weaver,
        distance: shortestRoadDistance(
          world,
          weaver,
          market,
          MARKET_RESTOCK_RANGE,
        ),
      }))
      .filter(
        (
          candidate,
        ): candidate is {
          weaver: WeaverBuildingView;
          distance: number;
        } => candidate.distance !== null,
      )
      .sort(
        (left, right) =>
          left.distance - right.distance || left.weaver.id - right.weaver.id,
      )[0]?.weaver;
    if (!source) continue;
    source.clothingStock -= 1;
    market.clothingStock = ((market.clothingStock ?? 0) +
      1) as MarketBuildingView["clothingStock"];
  }
}

function reconcileMilitaryProduction(world: WorldState): void {
  const weaponsmiths = world.buildings
    .filter(isWeaponsmith)
    .sort((left, right) => left.id - right.id);
  const forts = world.buildings
    .filter(isInfantryFort)
    .sort((left, right) => left.id - right.id);
  if (world.tick % 3 === 0) {
    for (const smith of weaponsmiths) {
      if (smith.weaponStock < 2) smith.weaponStock += 1;
    }
  }
  for (const fort of forts) {
    if (fort.soldiers >= 4) continue;
    const source = weaponsmiths
      .filter((smith) => smith.weaponStock > 0)
      .map((smith) => ({
        smith,
        distance: shortestRoadDistance(
          world,
          smith,
          fort,
          FOOD_TRANSPORT_RANGE,
        ),
      }))
      .filter(
        (
          candidate,
        ): candidate is {
          smith: WeaponsmithBuildingView;
          distance: number;
        } => candidate.distance !== null,
      )
      .sort(
        (left, right) =>
          left.distance - right.distance || left.smith.id - right.smith.id,
      )[0]?.smith;
    if (!source) continue;
    source.weaponStock -= 1;
    fort.weaponStock += 1;
    fort.weaponStock -= 1;
    fort.soldiers += 1;
  }
}

export function deployedSoldiers(
  world: Pick<WorldState, "roads" | "buildings">,
): number {
  const connected = connectedRoadKeys(world.roads);
  return world.buildings
    .filter(isInfantryFort)
    .reduce(
      (total, fort) =>
        footprintBorderTiles(fort).some((tile) => connected.has(tileKey(tile)))
          ? total + fort.soldiers
          : total,
      0,
    );
}

function reconcileDiplomacy(world: WorldState): void {
  const arrived = world.diplomacy.envoys.filter(
    (envoy) => envoy.arrivesAtTick <= world.tick,
  );
  if (arrived.length === 0) return;
  world.diplomacy.envoys = world.diplomacy.envoys.filter(
    (envoy) => envoy.arrivesAtTick > world.tick,
  );
  world.diplomacy.relation = Math.min(
    100,
    world.diplomacy.relation + arrived.length * 25,
  );
  if (world.diplomacy.relation >= 50) world.diplomacy.tradeOpen = true;
}

function consumeHouseholdFood(
  existingHouseholds: Map<number, HouseholdView>,
): void {
  for (const household of existingHouseholds.values()) {
    if (household.foodReserveTicks > 0) {
      household.foodReserveTicks = (household.foodReserveTicks -
        1) as HouseholdView["foodReserveTicks"];
      if (household.foodReserveTicks === 0) household.foodQuality = "none";
    }
  }
}

function reconcileMarketDistribution(
  world: WorldState,
  existingHouseholds: Map<number, HouseholdView>,
): void {
  const housesById = new Map(
    world.buildings.filter(isHouse).map((house) => [house.id, house]),
  );
  const markets = world.buildings
    .filter(isMarket)
    .sort((left, right) => left.id - right.id);

  for (const market of markets) {
    if (market.foodStock <= 0) continue;
    const candidates = [...existingHouseholds.values()]
      .filter((household) => household.foodReserveTicks === 0)
      .map((household) => {
        const house = housesById.get(household.houseId);
        return house
          ? {
              household,
              house,
              distance: shortestRoadDistance(
                world,
                market,
                house,
                MARKET_SERVICE_RANGE,
              ),
            }
          : null;
      })
      .filter(
        (
          candidate,
        ): candidate is {
          household: HouseholdView;
          house: HouseBuildingView;
          distance: number;
        } => candidate !== null && candidate.distance !== null,
      )
      .sort(
        (left, right) =>
          left.distance - right.distance || left.house.id - right.house.id,
      );
    const target = candidates[0]?.household;
    if (!target) continue;
    const deliveredQuality = foodQualityForStocks(market.foodStocks);
    const cropType = CROP_TYPES.filter(
      (candidate) => market.foodStocks[candidate] > 0,
    ).sort(
      (left, right) =>
        market.foodStocks[right] - market.foodStocks[left] ||
        CROP_TYPES.indexOf(left) - CROP_TYPES.indexOf(right),
    )[0];
    if (!cropType) continue;
    market.foodStock -= 1;
    market.foodStocks[cropType] -= 1;
    target.foodReserveTicks = HOUSEHOLD_FOOD_RESERVE_MAX;
    target.foodQuality = deliveredQuality;
  }
}

function reconcileClothingDistribution(
  world: WorldState,
  existingHouseholds: Map<number, HouseholdView>,
): void {
  const housesById = new Map(
    world.buildings.filter(isHouse).map((house) => [house.id, house]),
  );
  for (const household of existingHouseholds.values()) {
    if ((household.clothingReserveTicks ?? 0) > 0) {
      household.clothingReserveTicks = ((household.clothingReserveTicks ?? 0) -
        1) as HouseholdView["clothingReserveTicks"];
    }
  }
  for (const market of world.buildings
    .filter(isMarket)
    .sort((a, b) => a.id - b.id)) {
    if ((market.clothingStock ?? 0) <= 0) continue;
    const target = [...existingHouseholds.values()]
      .filter((household) => (household.clothingReserveTicks ?? 0) === 0)
      .map((household) => {
        const house = housesById.get(household.houseId);
        return house
          ? {
              household,
              house,
              distance: shortestRoadDistance(
                world,
                market,
                house,
                MARKET_SERVICE_RANGE,
              ),
            }
          : null;
      })
      .filter(
        (
          candidate,
        ): candidate is {
          household: HouseholdView;
          house: HouseBuildingView;
          distance: number;
        } => candidate !== null && candidate.distance !== null,
      )
      .sort(
        (left, right) =>
          left.distance - right.distance || left.house.id - right.house.id,
      )[0]?.household;
    if (!target) continue;
    market.clothingStock = ((market.clothingStock ?? 0) -
      1) as MarketBuildingView["clothingStock"];
    target.clothingReserveTicks = HOUSEHOLD_FOOD_RESERVE_MAX;
  }
}

function houseHasRoadService(
  house: HouseBuildingView,
  connected: Set<number>,
): boolean {
  return footprintBorderTiles(house).some((tile) =>
    connected.has(tileKey(tile)),
  );
}

function houseHasWaterService(
  house: HouseBuildingView,
  distances: Map<number, number>,
): boolean {
  return footprintBorderTiles(house).some((tile) => {
    const distance = distances.get(tileKey(tile));
    return distance !== undefined && distance <= WELL_SERVICE_RANGE;
  });
}

function stabilizeAfterInfrastructureRemoval(world: WorldState): void {
  const connected = connectedRoadKeys(world.roads);
  const waterDistances = waterRoadDistances(world);
  const housesById = new Map(
    world.buildings.filter(isHouse).map((house) => [house.id, house]),
  );
  world.migrants = world.migrants.filter((migrant) => {
    if (migrant.state === "building") return true;
    const house = housesById.get(migrant.houseId);
    return (
      house !== undefined &&
      connected.has(tileKey(migrant)) &&
      shortestRoadPathToHouse(world, migrant, house) !== null
    );
  });
  const householdsByHouse = new Map(
    world.households.map((household) => [household.houseId, household]),
  );
  const nextHouseholds: HouseholdView[] = [];
  for (const house of world.buildings.filter(isHouse)) {
    if (house.constructionStage < 4) {
      house.level = 1;
      continue;
    }
    const household = householdsByHouse.get(house.id);
    if (!household || !houseHasRoadService(house, connected)) {
      house.level = 1;
      continue;
    }
    if (house.level === 2 && !houseHasWaterService(house, waterDistances)) {
      house.level = 1;
    }
    nextHouseholds.push({
      houseId: house.id,
      residents: house.level === 2 ? UPGRADED_HOUSE_CAPACITY : HOUSE_CAPACITY,
      foodReserveTicks: household.foodReserveTicks,
      foodQuality: household.foodQuality,
      ...(household.clothingReserveTicks !== undefined
        ? { clothingReserveTicks: household.clothingReserveTicks }
        : {}),
      ...(household.entertainmentReserveTicks !== undefined
        ? { entertainmentReserveTicks: household.entertainmentReserveTicks }
        : {}),
    });
  }
  world.households = nextHouseholds.sort(
    (left, right) => left.houseId - right.houseId,
  );
  const roadKeys = new Set(world.roads.map(tileKey));
  for (const citizen of world.citizens) {
    if (roadKeys.has(tileKey(citizen))) continue;
    const home = housesById.get(citizen.houseId);
    const homeRoad = home
      ? footprintBorderTiles(home)
          .filter((tile) => connected.has(tileKey(tile)))
          .sort((left, right) => tileKey(left) - tileKey(right))[0]
      : undefined;
    if (!homeRoad) continue;
    citizen.x = homeRoad.x;
    citizen.y = homeRoad.y;
    citizen.state = "waiting";
    citizen.dwellTicks = 0;
  }
}

function reconcileConstruction(
  world: WorldState,
  connected: Set<number>,
): void {
  const migrantsByHouse = new Map(
    world.migrants.map((migrant) => [migrant.houseId, migrant]),
  );
  const completedHouseIds = new Set<number>();

  for (const house of world.buildings.filter(isHouse)) {
    if (house.constructionStage === 4) continue;
    const migrant = migrantsByHouse.get(house.id);

    if (!migrant) {
      if (
        house.constructionStage === 0 &&
        migrationAttractiveness(
          world.economy.sentiment,
          world.laborPolicy.wageLevel,
        ).canMigrate &&
        connected.has(tileKey(CITY_GATE_TILE)) &&
        footprintBorderTiles(house).some((tile) => connected.has(tileKey(tile)))
      ) {
        const nextMigrant: MigrantView = {
          houseId: house.id,
          x: CITY_GATE_TILE.x,
          y: CITY_GATE_TILE.y,
          state: "walking",
        };
        world.migrants.push(nextMigrant);
        migrantsByHouse.set(house.id, nextMigrant);
      }
      continue;
    }

    if (migrant.state === "walking") {
      const path = shortestRoadPathToHouse(world, migrant, house);
      if (!path) {
        world.migrants = world.migrants.filter(
          (candidate) => candidate.houseId !== house.id,
        );
        migrantsByHouse.delete(house.id);
        continue;
      }
      if (path.length === 1) {
        migrant.state = "building";
        house.constructionStage = 1;
      } else {
        migrant.x = path[1].x;
        migrant.y = path[1].y;
      }
      continue;
    }

    house.constructionStage = (house.constructionStage +
      1) as HouseBuildingView["constructionStage"];
    if (house.constructionStage === 4) completedHouseIds.add(house.id);
  }

  if (completedHouseIds.size > 0) {
    world.migrants = world.migrants.filter(
      (migrant) => !completedHouseIds.has(migrant.houseId),
    );
  }
  world.migrants.sort((left, right) => left.houseId - right.houseId);
}

function laborSectorForBuilding(building: BuildingView): LaborSector | null {
  if (building.typeId === "farm" || building.typeId === "hemp-farm") {
    return "agriculture";
  }
  if (
    building.typeId === "granary" ||
    building.typeId === "market" ||
    building.typeId === "weaver" ||
    building.typeId === "weaponsmith" ||
    building.typeId === "trading-post"
  ) {
    return "commerce";
  }
  if (
    building.typeId === "well" ||
    building.typeId === "infantry-fort" ||
    building.typeId === "tax-office" ||
    building.typeId === "music-school"
  ) {
    return "services";
  }
  return null;
}

function staffedVisualWorkplaces(world: WorldState): BuildingView[] {
  const labor = calculateLaborReport(
    {
      tick: world.tick,
      buildings: world.buildings,
      households: world.households,
    },
    world.laborPolicy,
  );
  const remaining = { ...labor.assigned };
  const connected = connectedRoadKeys(world.roads);
  const candidates: BuildingView[] = [];
  for (const building of [...world.buildings].sort(
    (left, right) => left.id - right.id,
  )) {
    const sector = laborSectorForBuilding(building);
    if (!sector || remaining[sector] <= 0) continue;
    if (
      !footprintBorderTiles(building).some((tile) =>
        connected.has(tileKey(tile)),
      )
    ) {
      continue;
    }
    candidates.push(building);
    remaining[sector] -= 1;
  }
  return candidates;
}

function homeRoadForCitizen(
  world: WorldState,
  house: HouseBuildingView,
): TileCoordinate | null {
  const connected = connectedRoadKeys(world.roads);
  return (
    footprintBorderTiles(house)
      .filter((tile) => connected.has(tileKey(tile)))
      .sort((left, right) => tileKey(left) - tileKey(right))[0] ?? null
  );
}

function reconcileCitizens(world: WorldState): void {
  const householdsByHouse = new Map(
    world.households.map((household) => [household.houseId, household]),
  );
  const housesById = new Map(
    world.buildings.filter(isHouse).map((house) => [house.id, house]),
  );
  const workplaces = staffedVisualWorkplaces(world);
  const workplacesById = new Map(
    workplaces.map((building) => [building.id, building]),
  );
  world.citizens = world.citizens.filter(
    (citizen) =>
      householdsByHouse.has(citizen.houseId) && housesById.has(citizen.houseId),
  );

  const represented = new Set(world.citizens.map((citizen) => citizen.houseId));
  const newlyCreated = new Set<number>();
  for (const household of [...world.households].sort(
    (left, right) => left.houseId - right.houseId,
  )) {
    if (represented.has(household.houseId)) continue;
    const house = housesById.get(household.houseId);
    if (!house) continue;
    const homeRoad = homeRoadForCitizen(world, house);
    if (!homeRoad) continue;
    const citizen: CitizenView = {
      id: household.houseId,
      houseId: household.houseId,
      workplaceId: null,
      x: homeRoad.x,
      y: homeRoad.y,
      state: "strolling",
      dwellTicks: 0,
    };
    world.citizens.push(citizen);
    newlyCreated.add(citizen.id);
  }

  const occupiedWorkplaces = new Set<number>();
  for (const citizen of world.citizens) {
    if (
      citizen.workplaceId !== null &&
      workplacesById.has(citizen.workplaceId) &&
      !occupiedWorkplaces.has(citizen.workplaceId)
    ) {
      occupiedWorkplaces.add(citizen.workplaceId);
      continue;
    }
    if (citizen.workplaceId !== null) {
      citizen.workplaceId = null;
      citizen.state = "returning";
      citizen.dwellTicks = 0;
    }
  }
  for (const citizen of world.citizens) {
    if (citizen.workplaceId !== null) continue;
    const workplace = workplaces.find(
      (candidate) => !occupiedWorkplaces.has(candidate.id),
    );
    if (!workplace) continue;
    const path = shortestRoadPathToHouse(world, citizen, workplace);
    if (!path) continue;
    citizen.workplaceId = workplace.id;
    citizen.state = "commuting";
    citizen.dwellTicks = 0;
    occupiedWorkplaces.add(workplace.id);
  }

  for (const citizen of world.citizens) {
    if (newlyCreated.has(citizen.id)) continue;
    const house = housesById.get(citizen.houseId);
    if (!house) continue;
    const workplace =
      citizen.workplaceId === null
        ? null
        : (workplacesById.get(citizen.workplaceId) ?? null);

    if (citizen.state === "commuting") {
      const path = workplace
        ? shortestRoadPathToHouse(world, citizen, workplace)
        : null;
      if (!path) {
        citizen.state = "returning";
        citizen.workplaceId = null;
      } else {
        const next = path[1];
        if (next) {
          citizen.x = next.x;
          citizen.y = next.y;
        }
        if (path.length <= 2) {
          citizen.state = "working";
          citizen.dwellTicks = 1;
        }
        continue;
      }
    }

    if (citizen.state === "working") {
      if (!workplace) {
        citizen.state = "returning";
      } else if (citizen.dwellTicks > 0) {
        citizen.dwellTicks = 0;
        continue;
      } else {
        citizen.state = "returning";
      }
    }

    if (citizen.state === "returning" || citizen.state === "waiting") {
      const path = shortestRoadPathToHouse(world, citizen, house);
      if (!path) {
        citizen.state = "waiting";
        continue;
      }
      const next = path[1];
      if (next) {
        citizen.x = next.x;
        citizen.y = next.y;
      }
      if (path.length <= 2) {
        if (citizen.workplaceId === null) {
          citizen.state = "strolling";
          citizen.dwellTicks = 0;
        } else {
          citizen.state = "resting";
          citizen.dwellTicks = 1;
        }
      }
      continue;
    }

    if (citizen.state === "resting") {
      if (citizen.dwellTicks > 0) {
        citizen.dwellTicks = 0;
      } else {
        citizen.state = citizen.workplaceId ? "commuting" : "strolling";
      }
      continue;
    }

    if (citizen.state === "strolling") {
      const pathHome = shortestRoadPathToHouse(world, citizen, house);
      if (pathHome && pathHome.length > 1) {
        citizen.x = pathHome[1].x;
        citizen.y = pathHome[1].y;
        continue;
      }
      const roadKeys = new Set(world.roads.map(tileKey));
      const step = orthogonalNeighbors(citizen)
        .filter((tile) => roadKeys.has(tileKey(tile)))
        .sort((left, right) => tileKey(left) - tileKey(right))[0];
      if (step) {
        citizen.x = step.x;
        citizen.y = step.y;
      }
    }
  }
  world.citizens.sort((left, right) => left.id - right.id);
}

function reconcileGovernmentEconomy(world: WorldState): void {
  const labor = calculateLaborReport(
    {
      tick: world.tick,
      buildings: world.buildings,
      households: world.households,
    },
    world.laborPolicy,
  );
  const taxOffices = world.buildings
    .filter(isTaxOffice)
    .sort((left, right) => left.id - right.id);
  const taxOfficeDemand = taxOffices.length * 2;
  const taxOfficeWorkers = Math.min(taxOfficeDemand, labor.assigned.services);
  const householdsByHouse = new Map(
    world.households.map((household) => [household.houseId, household]),
  );
  const houses = world.buildings.filter(isHouse).flatMap((house) => {
    if (!householdsByHouse.has(house.id)) return [];
    const covered = taxOffices.some(
      (office) => shortestRoadDistance(world, office, house, 12) !== null,
    );
    return [
      {
        houseId: house.id,
        level: house.level,
        covered,
        desirability: desirabilityAtSite(world.buildings, house.x, house.y)
          .score,
      },
    ];
  });
  const report = calculateMonthlyFiscalReport({
    houses,
    taxRate: world.economy.taxRate,
    taxOfficeWorkers,
    taxOfficeDemand,
    payroll: labor.payroll,
  });
  const sentiment = nextCitySentiment(world.economy.sentiment, {
    taxRate: world.economy.taxRate,
    wageLevel: world.laborPolicy.wageLevel,
    households: world.households.length,
    hungryHouseholds: world.households.filter(
      (household) => household.foodReserveTicks === 0,
    ).length,
  });
  world.economy = {
    ...world.economy,
    treasury: nextTreasuryBalance(world.economy.treasury, report),
    lastTaxRevenue: report.taxRevenue,
    lastPayroll: report.payroll,
    taxableHouses: report.taxableHouses,
    sentiment: sentiment.value,
  };
}

function reconcileTradeExports(world: WorldState): void {
  if (world.tick % 3 === 0) world.economy.lastTradeRevenue = 0;
  if (!world.diplomacy.tradeOpen) return;
  const posts = world.buildings
    .filter(isTradingPost)
    .sort((left, right) => left.id - right.id);
  if (posts.length === 0) return;
  const labor = calculateLaborReport(
    {
      tick: world.tick,
      buildings: world.buildings,
      households: world.households,
    },
    world.laborPolicy,
  );
  const otherCommerceDemand = world.buildings.reduce(
    (total, building) =>
      building.typeId === "granary" ||
      building.typeId === "market" ||
      building.typeId === "weaver" ||
      building.typeId === "weaponsmith"
        ? total + 1
        : total,
    0,
  );
  let staffedPosts = Math.max(0, labor.assigned.commerce - otherCommerceDemand);
  for (const post of posts) {
    if (staffedPosts <= 0) break;
    if (post.clothingStock < 8) {
      const source = world.buildings
        .filter(
          (building): building is MarketBuildingView | WeaverBuildingView =>
            (isMarket(building) && (building.clothingStock ?? 0) > 0) ||
            (isWeaver(building) && building.clothingStock > 0),
        )
        .map((building) => ({
          building,
          distance: shortestRoadDistance(world, building, post, 12),
        }))
        .filter(
          (
            candidate,
          ): candidate is {
            building: MarketBuildingView | WeaverBuildingView;
            distance: number;
          } => candidate.distance !== null,
        )
        .sort(
          (left, right) =>
            left.distance - right.distance ||
            left.building.id - right.building.id,
        )[0]?.building;
      if (source) {
        if (isMarket(source)) {
          source.clothingStock = ((source.clothingStock ?? 0) -
            1) as MarketBuildingView["clothingStock"];
        } else {
          source.clothingStock = (source.clothingStock -
            1) as WeaverBuildingView["clothingStock"];
        }
        post.clothingStock = (post.clothingStock +
          1) as TradingPostBuildingView["clothingStock"];
      }
    }
    if (world.tick % 3 === 0 && post.clothingStock > 0) {
      post.clothingStock = (post.clothingStock -
        1) as TradingPostBuildingView["clothingStock"];
      world.economy.treasury = nextTreasuryBalance(world.economy.treasury, {
        taxRevenue: 12,
        payroll: 0,
      });
      world.economy.lastTradeRevenue += 12;
    }
    staffedPosts -= 1;
  }
}

function applyEntertainmentAtTile(
  world: WorldState,
  tile: TileCoordinate,
): void {
  const households = new Map(
    world.households.map((household) => [household.houseId, household]),
  );
  for (const house of world.buildings.filter(isHouse)) {
    const passed = footprintBorderTiles(house).some(
      (border) => border.x === tile.x && border.y === tile.y,
    );
    if (!passed) continue;
    const household = households.get(house.id);
    if (household) {
      household.entertainmentReserveTicks = HOUSEHOLD_FOOD_RESERVE_MAX;
    }
  }
}

function reconcileEntertainment(world: WorldState): void {
  for (const household of world.households) {
    if ((household.entertainmentReserveTicks ?? 0) > 0) {
      household.entertainmentReserveTicks =
        ((household.entertainmentReserveTicks ?? 0) -
          1) as HouseholdView["entertainmentReserveTicks"];
    }
  }
  const schools = new Map(
    world.buildings.filter(isMusicSchool).map((school) => [school.id, school]),
  );
  const markets = new Map(
    world.buildings.filter(isMarket).map((market) => [market.id, market]),
  );
  const moving: PerformerView[] = [];
  for (const performer of world.performers) {
    if (!schools.has(performer.schoolId)) continue;
    const market = markets.get(performer.targetMarketId);
    if (!market) continue;
    const path = shortestRoadPathToHouse(world, performer, market);
    if (!path) continue;
    const next = path[1] ?? path[0];
    performer.x = next.x;
    performer.y = next.y;
    applyEntertainmentAtTile(world, next);
    if (path.length > 1) moving.push(performer);
  }
  world.performers = moving;

  if (world.tick % 4 !== 0 || markets.size === 0) return;
  const labor = calculateLaborReport(
    {
      tick: world.tick,
      buildings: world.buildings,
      households: world.households,
    },
    world.laborPolicy,
  );
  const otherServiceDemand = world.buildings.reduce(
    (total, building) =>
      building.typeId === "well"
        ? total + 1
        : building.typeId === "infantry-fort" ||
            building.typeId === "tax-office"
          ? total + 2
          : total,
    0,
  );
  let staffedSchools = Math.max(
    0,
    labor.assigned.services - otherServiceDemand,
  );
  const connected = connectedRoadKeys(world.roads);
  for (const school of [...schools.values()].sort((a, b) => a.id - b.id)) {
    if (staffedSchools <= 0) break;
    if (
      world.performers.some((performer) => performer.schoolId === school.id)
    ) {
      continue;
    }
    const start = footprintBorderTiles(school)
      .filter((tile) => connected.has(tileKey(tile)))
      .sort((a, b) => tileKey(a) - tileKey(b))[0];
    if (!start) continue;
    const target = [...markets.values()]
      .map((market) => ({
        market,
        path: shortestRoadPathToHouse(world, start, market),
      }))
      .filter(
        (
          candidate,
        ): candidate is {
          market: MarketBuildingView;
          path: TileCoordinate[];
        } => candidate.path !== null,
      )
      .sort(
        (left, right) =>
          left.path.length - right.path.length ||
          left.market.id - right.market.id,
      )[0];
    if (!target) continue;
    const performer: PerformerView = {
      schoolId: school.id,
      targetMarketId: target.market.id,
      x: start.x,
      y: start.y,
    };
    world.performers.push(performer);
    applyEntertainmentAtTile(world, performer);
    staffedSchools -= 1;
  }
  world.performers.sort((a, b) => a.schoolId - b.schoolId);
}

function reconcileTick(world: WorldState): boolean {
  const connected = connectedRoadKeys(world.roads);
  const waterDistances = waterRoadDistances(world);
  const existingHouseholds = new Map(
    world.households.map((household) => [household.houseId, household]),
  );
  const before = JSON.stringify({
    shennongFavor: world.shennongFavor,
    diplomacy: world.diplomacy,
    economy: world.economy,
    houses: world.buildings.filter(isHouse).map((house) => ({
      id: house.id,
      level: house.level,
      constructionStage: house.constructionStage,
    })),
    foodStocks: world.buildings
      .filter(
        (building) =>
          isFarm(building) || isGranary(building) || isMarket(building),
      )
      .map((building) => ({
        id: building.id,
        foodStock: building.foodStock,
        foodStocks:
          isGranary(building) || isMarket(building)
            ? building.foodStocks
            : undefined,
      })),
    households: world.households,
    industryStocks: world.buildings
      .filter(
        (building) =>
          isHempFarm(building) || isWeaver(building) || isMarket(building),
      )
      .map((building) =>
        isHempFarm(building)
          ? { id: building.id, hempStock: building.hempStock }
          : isWeaver(building)
            ? {
                id: building.id,
                hempStock: building.hempStock,
                clothingStock: building.clothingStock,
              }
            : { id: building.id, clothingStock: building.clothingStock ?? 0 },
      ),
    militaryStocks: world.buildings
      .filter((building) => isWeaponsmith(building) || isInfantryFort(building))
      .map((building) =>
        isWeaponsmith(building)
          ? { id: building.id, weaponStock: building.weaponStock }
          : {
              id: building.id,
              weaponStock: building.weaponStock,
              soldiers: building.soldiers,
            },
      ),
    tradeStocks: world.buildings.filter(isTradingPost).map((post) => ({
      id: post.id,
      clothingStock: post.clothingStock,
    })),
    migrants: world.migrants,
    performers: world.performers,
    citizens: world.citizens,
  });
  reconcileFoodProductionAndTransport(world);
  reconcileMarketRestocking(world);
  reconcileHempIndustry(world);
  reconcileMilitaryProduction(world);
  reconcileDiplomacy(world);
  reconcileTradeExports(world);
  consumeHouseholdFood(existingHouseholds);
  reconcileMarketDistribution(world, existingHouseholds);
  reconcileClothingDistribution(world, existingHouseholds);
  reconcileConstruction(world, connected);
  if (world.tick % 12 === 0 && world.shennongFavor > 0) {
    world.shennongFavor = (world.shennongFavor - 1) as 0 | 1 | 2;
  }
  const nextHouseholds: HouseholdView[] = [];
  for (const house of world.buildings.filter(isHouse)) {
    if (house.constructionStage < 4) {
      house.level = 1;
      continue;
    }
    const existing = existingHouseholds.get(house.id);
    if (!houseHasRoadService(house, connected)) {
      house.level = 1;
      continue;
    }
    if (!existing) {
      house.level = 1;
      nextHouseholds.push({
        houseId: house.id,
        residents: HOUSE_CAPACITY,
        foodReserveTicks: HOUSEHOLD_FOOD_RESERVE_MAX,
        foodQuality: "bland",
      });
      continue;
    }
    house.level =
      houseHasWaterService(house, waterDistances) &&
      existing.foodReserveTicks > 0
        ? 2
        : 1;
    nextHouseholds.push({
      houseId: house.id,
      residents: house.level === 2 ? UPGRADED_HOUSE_CAPACITY : HOUSE_CAPACITY,
      foodReserveTicks: existing.foodReserveTicks,
      foodQuality: existing.foodQuality,
      ...(existing.clothingReserveTicks !== undefined
        ? { clothingReserveTicks: existing.clothingReserveTicks }
        : {}),
      ...(existing.entertainmentReserveTicks !== undefined
        ? { entertainmentReserveTicks: existing.entertainmentReserveTicks }
        : {}),
    });
  }
  world.households = nextHouseholds.sort(
    (left, right) => left.houseId - right.houseId,
  );
  reconcileCitizens(world);
  reconcileEntertainment(world);
  reconcileGovernmentEconomy(world);
  const after = JSON.stringify({
    shennongFavor: world.shennongFavor,
    diplomacy: world.diplomacy,
    economy: world.economy,
    houses: world.buildings.filter(isHouse).map((house) => ({
      id: house.id,
      level: house.level,
      constructionStage: house.constructionStage,
    })),
    foodStocks: world.buildings
      .filter(
        (building) =>
          isFarm(building) || isGranary(building) || isMarket(building),
      )
      .map((building) => ({
        id: building.id,
        foodStock: building.foodStock,
        foodStocks:
          isGranary(building) || isMarket(building)
            ? building.foodStocks
            : undefined,
      })),
    households: world.households,
    industryStocks: world.buildings
      .filter(
        (building) =>
          isHempFarm(building) || isWeaver(building) || isMarket(building),
      )
      .map((building) =>
        isHempFarm(building)
          ? { id: building.id, hempStock: building.hempStock }
          : isWeaver(building)
            ? {
                id: building.id,
                hempStock: building.hempStock,
                clothingStock: building.clothingStock,
              }
            : { id: building.id, clothingStock: building.clothingStock ?? 0 },
      ),
    militaryStocks: world.buildings
      .filter((building) => isWeaponsmith(building) || isInfantryFort(building))
      .map((building) =>
        isWeaponsmith(building)
          ? { id: building.id, weaponStock: building.weaponStock }
          : {
              id: building.id,
              weaponStock: building.weaponStock,
              soldiers: building.soldiers,
            },
      ),
    tradeStocks: world.buildings.filter(isTradingPost).map((post) => ({
      id: post.id,
      clothingStock: post.clothingStock,
    })),
    migrants: world.migrants,
    performers: world.performers,
    citizens: world.citizens,
  });
  return before !== after || world.tick % 12 === 0;
}

export function advanceTicks(world: WorldState, count: number): void {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error("推进 tick 数必须是正安全整数");
  }
  if (!advanceTicksAtomically(world, count)) {
    throw new Error("模拟计数已耗尽");
  }
}

function advanceTicksAtomically(world: WorldState, count: number): boolean {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error("推进 tick 数必须是正安全整数");
  }
  if (world.tick > Number.MAX_SAFE_INTEGER - count) return false;

  if (world.revision <= Number.MAX_SAFE_INTEGER - count) {
    for (let index = 0; index < count; index += 1) {
      world.tick += 1;
      if (reconcileTick(world)) world.revision += 1;
    }
    return true;
  }

  const draft = cloneWorldState(world);
  for (let index = 0; index < count; index += 1) {
    draft.tick += 1;
    if (reconcileTick(draft)) {
      if (draft.revision === Number.MAX_SAFE_INTEGER) return false;
      draft.revision += 1;
    }
  }
  commitWorldState(world, draft);
  return true;
}

export function snapshotWorld(world: WorldState): WorldSnapshot {
  const hasCustomLaborPolicy =
    world.laborPolicy.wageLevel !== DEFAULT_LABOR_POLICY.wageLevel ||
    world.laborPolicy.priorities.some(
      (sector, index) => sector !== DEFAULT_LABOR_POLICY.priorities[index],
    );
  return {
    map: { width: MAP_SIZE, height: MAP_SIZE },
    tick: world.tick,
    revision: world.revision,
    buildings: world.buildings
      .map(cloneBuilding)
      .sort((left, right) => left.id - right.id),
    roads: world.roads
      .map((road) => ({ ...road }))
      .sort((left, right) => tileKey(left) - tileKey(right)),
    households: world.households
      .map((household) => ({ ...household }))
      .sort((left, right) => left.houseId - right.houseId),
    migrants: world.migrants
      .map((migrant) => ({ ...migrant }))
      .sort((left, right) => left.houseId - right.houseId),
    ...(world.performers.length > 0
      ? {
          performers: world.performers
            .map((performer) => ({ ...performer }))
            .sort((left, right) => left.schoolId - right.schoolId),
        }
      : {}),
    ...(world.citizens.length > 0
      ? {
          citizens: world.citizens
            .map((citizen) => ({ ...citizen }))
            .sort((left, right) => left.id - right.id),
        }
      : {}),
    ...(hasCustomLaborPolicy
      ? {
          laborPolicy: {
            ...world.laborPolicy,
            priorities: [...world.laborPolicy.priorities],
          },
        }
      : {}),
    ...(world.shennongFavor > 0
      ? { shennongFavor: world.shennongFavor as 1 | 2 | 3 }
      : {}),
    ...(world.diplomacy.relation > 0 || world.diplomacy.envoys.length > 0
      ? {
          diplomacy: {
            ...world.diplomacy,
            envoys: world.diplomacy.envoys.map((envoy) => ({ ...envoy })),
          },
        }
      : {}),
    ...(world.economy.treasury !== 500 ||
    world.economy.taxRate !== "standard" ||
    world.economy.lastTaxRevenue > 0 ||
    world.economy.lastPayroll > 0 ||
    world.economy.taxableHouses > 0 ||
    world.economy.sentiment !== 50 ||
    world.economy.lastTradeRevenue > 0
      ? { economy: { ...world.economy } }
      : {}),
  };
}

export {
  emptyFoodStocks,
  foodQualityForStocks,
  foodStockTotal,
} from "./food-quality";
export {
  calculateLaborReport,
  DEFAULT_LABOR_POLICY,
  migrationAttractiveness,
} from "./labor-economy";
export { eraStateAtTick } from "./era-capabilities";
