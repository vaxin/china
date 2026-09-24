import { z } from "zod";
import {
  DEFAULT_TERRAIN_CONTRACT,
  isFootprintBuildableOnTerrain,
  isTileInsideTerrain,
  terrainTileKey,
  type TerrainContract,
} from "./terrain-topology";

export {
  DEFAULT_TERRAIN_CONTRACT,
  isFootprintBuildableOnTerrain,
  isTerrainTileBuildable,
  isTileInsideTerrain,
  sampleTerrain,
  sampleTerrainCover,
  terrainElevationAt,
  terrainNormalAt,
  terrainTileKey,
  type TerrainContract,
  type TerrainCoverKind,
  type TerrainCoverSample,
  type TerrainRegion,
  type TerrainSample,
} from "./terrain-topology";

export const MAP_SIZE = 32 as const;
export const HOUSE_FOOTPRINT = 2 as const;
export const WELL_FOOTPRINT = 1 as const;
export const FARM_FOOTPRINT = 2 as const;
export const GRANARY_FOOTPRINT = 2 as const;
export const MARKET_FOOTPRINT = 2 as const;
export const HEMP_FARM_FOOTPRINT = 2 as const;
export const WEAVER_FOOTPRINT = 2 as const;
export const WEAPONSMITH_FOOTPRINT = 2 as const;
export const INFANTRY_FORT_FOOTPRINT = 2 as const;
export const TAX_OFFICE_FOOTPRINT = 2 as const;
export const MUSIC_SCHOOL_FOOTPRINT = 2 as const;
export const TRADING_POST_FOOTPRINT = 3 as const;
export const HOUSE_CAPACITY = 5 as const;
export const UPGRADED_HOUSE_CAPACITY = 10 as const;
export const WELL_SERVICE_RANGE = 8 as const;
export const FARM_STOCK_CAPACITY = 3 as const;
export const GRANARY_STOCK_CAPACITY = 10 as const;
export const MARKET_STOCK_CAPACITY = 12 as const;
export const FARM_PRODUCTION_INTERVAL = 3 as const;
export const FOOD_TRANSPORT_RANGE = 12 as const;
export const MARKET_RESTOCK_RANGE = 12 as const;
export const MARKET_SERVICE_RANGE = 8 as const;
export const HOUSEHOLD_FOOD_RESERVE_MAX = 3 as const;
export const HOUSEHOLD_STARTING_CASH = 12 as const;
export const HOUSEHOLD_LEDGER_LIMIT = 12 as const;
export const HOUSEHOLD_FOOD_PRICE = 1 as const;
export const FOOD_UNITS_PER_FIVE_RESIDENTS = 1 as const;
export const FOOD_BUSINESS_STARTING_CASH = 12 as const;
export const CITY_GATE_TILE = { x: 0, y: 15 } as const;
export const SAVE_FORMAT_VERSION = 9 as const;

const LEGACY_V3_HOUSE_CAPACITY = 5 as const;
const LEGACY_V3_UPGRADED_HOUSE_CAPACITY = 10 as const;
const LEGACY_V3_WELL_SERVICE_RANGE = 8 as const;

export type QuarterTurn = 0 | 1 | 2 | 3;
export type HouseLevel = 1 | 2;
export type ConstructionStage = 0 | 1 | 2 | 3 | 4;
export type MigrantState = "walking" | "building";
export const CROP_TYPES = [
  "wheat",
  "soybean",
  "rice",
  "millet",
  "cabbage",
] as const;
export type CropType = (typeof CROP_TYPES)[number];
export const LABOR_SECTORS = ["agriculture", "commerce", "services"] as const;
export type LaborSector = (typeof LABOR_SECTORS)[number];
export type WageLevel = "low" | "standard" | "high";
export type TaxRate = "low" | "standard" | "high";

export interface LaborPolicyView {
  wageLevel: WageLevel;
  priorities: [LaborSector, LaborSector, LaborSector];
}

export interface TileCoordinate {
  x: number;
  y: number;
}

export interface BuildCommand {
  seq: number;
  type: "build";
  buildingTypeId:
    | "house"
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
    | "trading-post";
  x: number;
  y: number;
  rotation: QuarterTurn;
  cropType?: CropType;
}

export interface BuildRoadPathCommand {
  seq: number;
  type: "build-road-path";
  tiles: TileCoordinate[];
}

export interface BuildWallPathCommand {
  seq: number;
  type: "build-wall-path";
  tiles: TileCoordinate[];
}

export interface AdvanceTimeCommand {
  seq: number;
  type: "advance-time";
  ticks: number;
}

export interface AdvanceActivityCommand {
  seq: number;
  type: "advance-activity";
  pulses: number;
}

export interface DemolishCommand {
  seq: number;
  type: "demolish";
  x: number;
  y: number;
}

export interface SetLaborPolicyCommand {
  seq: number;
  type: "set-labor-policy";
  wageLevel: WageLevel;
  priorities: [LaborSector, LaborSector, LaborSector];
}

export interface SetGranaryPolicyCommand {
  seq: number;
  type: "set-granary-policy";
  granaryId: number;
  cropType: CropType;
  accept: boolean;
}

export interface MakeOfferingCommand {
  seq: number;
  type: "make-offering";
  granaryId: number;
  cropType: CropType;
}

export interface SendGiftCommand {
  seq: number;
  type: "send-gift";
  granaryId: number;
  cropType: CropType;
}

export interface SetTaxRateCommand {
  seq: number;
  type: "set-tax-rate";
  taxRate: TaxRate;
}

export interface HoldNewYearFestivalCommand {
  seq: number;
  type: "hold-new-year-festival";
}

export type GameCommand =
  | BuildCommand
  | BuildRoadPathCommand
  | BuildWallPathCommand
  | AdvanceTimeCommand
  | AdvanceActivityCommand
  | DemolishCommand
  | SetLaborPolicyCommand
  | SetGranaryPolicyCommand
  | MakeOfferingCommand
  | SendGiftCommand
  | SetTaxRateCommand
  | HoldNewYearFestivalCommand;

export type BuildRejectionReason =
  | "occupied"
  | "vegetation"
  | "out-of-bounds"
  | "steep-slope"
  | "invalid-path"
  | "nothing-to-demolish"
  | "not-found"
  | "insufficient-stock"
  | "insufficient-funds"
  | "requirements-not-met"
  | "counter-exhausted";

export type CommandResult =
  | {
      seq: number;
      accepted: true;
      appliedAtTick: number;
      revision: number;
    }
  | {
      seq: number;
      accepted: false;
      reasonCode: BuildRejectionReason;
    };

interface BuildingBase {
  id: number;
  x: number;
  y: number;
  rotation: QuarterTurn;
  footprint: { width: number; height: number };
}

export interface HouseBuildingView extends BuildingBase {
  typeId: "house";
  footprint: { width: 2; height: 2 };
  level: HouseLevel;
  constructionStage: ConstructionStage;
}

export interface WellBuildingView extends BuildingBase {
  typeId: "well";
  rotation: 0;
  footprint: { width: 1; height: 1 };
}

export type FarmFoodStock = number;
export type GranaryFoodStock = number;
export type MarketFoodStock = number;
export type HouseholdFoodReserveTicks = 0 | 1 | 2 | 3;
export type FoodStocks = Record<CropType, number>;
export type FoodQuality = "none" | "bland" | "plain" | "appetizing" | "tasty";

export interface FarmBuildingView extends BuildingBase {
  typeId: "farm";
  rotation: 0;
  footprint: { width: 2; height: 2 };
  cropType: CropType;
  foodStock: FarmFoodStock;
  operatingCash?: number;
  wageArrears?: number;
  staffedWorkers?: number;
}

export interface GranaryBuildingView extends BuildingBase {
  typeId: "granary";
  rotation: 0;
  footprint: { width: 2; height: 2 };
  foodStock: GranaryFoodStock;
  foodStocks: FoodStocks;
  acceptedCrops?: CropType[];
  operatingCash?: number;
  wageArrears?: number;
  staffedWorkers?: number;
}

export interface MarketBuildingView extends BuildingBase {
  typeId: "market";
  rotation: 0;
  footprint: { width: 2; height: 2 };
  foodStock: MarketFoodStock;
  foodStocks: FoodStocks;
  clothingStock?: 0 | 1 | 2 | 3 | 4;
  operatingCash?: number;
  wageArrears?: number;
  staffedWorkers?: number;
}

export interface HempFarmBuildingView extends BuildingBase {
  typeId: "hemp-farm";
  rotation: 0;
  footprint: { width: 2; height: 2 };
  hempStock: 0 | 1 | 2 | 3;
}

export interface WeaverBuildingView extends BuildingBase {
  typeId: "weaver";
  rotation: 0;
  footprint: { width: 2; height: 2 };
  hempStock: 0 | 1 | 2;
  clothingStock: 0 | 1 | 2;
}

export interface WeaponsmithBuildingView extends BuildingBase {
  typeId: "weaponsmith";
  rotation: 0;
  footprint: { width: 2; height: 2 };
  weaponStock: 0 | 1 | 2;
}

export interface InfantryFortBuildingView extends BuildingBase {
  typeId: "infantry-fort";
  rotation: 0;
  footprint: { width: 2; height: 2 };
  weaponStock: 0 | 1 | 2 | 3 | 4;
  soldiers: 0 | 1 | 2 | 3 | 4;
}

export interface TaxOfficeBuildingView extends BuildingBase {
  typeId: "tax-office";
  rotation: 0;
  footprint: { width: 2; height: 2 };
}

export interface MusicSchoolBuildingView extends BuildingBase {
  typeId: "music-school";
  rotation: 0;
  footprint: { width: 2; height: 2 };
}

export interface TradingPostBuildingView extends BuildingBase {
  typeId: "trading-post";
  rotation: 0;
  footprint: { width: 3; height: 3 };
  clothingStock: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

export type BuildingView =
  | HouseBuildingView
  | WellBuildingView
  | FarmBuildingView
  | GranaryBuildingView
  | MarketBuildingView
  | HempFarmBuildingView
  | WeaverBuildingView
  | WeaponsmithBuildingView
  | InfantryFortBuildingView
  | TaxOfficeBuildingView
  | MusicSchoolBuildingView
  | TradingPostBuildingView;

export interface HouseholdView {
  houseId: number;
  residents: 5 | 10;
  foodReserveTicks: HouseholdFoodReserveTicks;
  /** Real food units; omitted only by legacy fixtures and normalized at the boundary. */
  foodReserveUnits?: number;
  foodQuality: FoodQuality;
  clothingReserveTicks?: HouseholdFoodReserveTicks;
  entertainmentReserveTicks?: HouseholdFoodReserveTicks;
  /** Optional in TypeScript for legacy fixture compatibility; normalized by the protocol. */
  cash?: number;
  employedWorkers?: number;
  lastIncome?: number;
  lastFoodExpense?: number;
  wageArrears?: number;
  taxArrears?: number;
  foodShortageReason?: FoodShortageReason;
  livelihoodLedger?: HouseholdLivelihoodLedgerEntryView[];
}

export type FoodShortageReason =
  | "none"
  | "delivery-pending"
  | "unaffordable"
  | "out-of-stock"
  | "disconnected"
  | "no-market";

export type LivelihoodLedgerKind =
  | "arrival-funds"
  | "wage"
  | "wage-arrears"
  | "tax"
  | "tax-arrears"
  | "food-order"
  | "food-delivery"
  | "food-refund";

export interface HouseholdLivelihoodLedgerEntryView {
  id: string;
  tick: number;
  kind: LivelihoodLedgerKind;
  amount: number;
  balanceAfter: number;
}

export interface HouseholdFoodOrderView {
  houseId: number;
  marketId: number;
  cropType: CropType;
  foodQuality: FoodQuality;
  quantity?: number;
  price: number;
  placedAtTick: number;
  arrivesAtTick: number;
}

export interface PerformerView {
  schoolId: number;
  targetMarketId: number;
  x: number;
  y: number;
}

export type CitizenState =
  "commuting" | "working" | "returning" | "resting" | "strolling" | "waiting";

export interface CitizenView {
  id: number;
  houseId: number;
  workplaceId: number | null;
  x: number;
  y: number;
  state: CitizenState;
  dwellTicks: number;
}

export interface MigrantView {
  houseId: number;
  x: number;
  y: number;
  state: MigrantState;
}

export interface LegacyHouseBuildingV1V2 {
  id: number;
  typeId: "house";
  x: number;
  y: number;
  rotation: QuarterTurn;
  footprint: { width: 2; height: 2 };
}

export interface LegacyHouseholdV2 {
  houseId: number;
  residents: 5;
}

export interface LegacyHouseBuildingV3 {
  id: number;
  typeId: "house";
  x: number;
  y: number;
  rotation: QuarterTurn;
  footprint: { width: 2; height: 2 };
  level: HouseLevel;
}

export type LegacyHouseBuildingV5 = LegacyHouseBuildingV3;

export interface LegacyWellBuildingV3 {
  id: number;
  typeId: "well";
  x: number;
  y: number;
  rotation: 0;
  footprint: { width: 1; height: 1 };
}

export type LegacyBuildingV3 = LegacyHouseBuildingV3 | LegacyWellBuildingV3;

export interface LegacyHouseholdV3 {
  houseId: number;
  residents: 5 | 10;
}

export type LegacyBuildingV4 =
  | LegacyHouseBuildingV5
  | WellBuildingView
  | FarmBuildingView
  | LegacyGranaryBuildingV4;

export interface LegacyGranaryBuildingV4 extends BuildingBase {
  typeId: "granary";
  rotation: 0;
  footprint: { width: 2; height: 2 };
  foodStock: GranaryFoodStock;
}

export interface LegacyMarketBuildingV5 extends BuildingBase {
  typeId: "market";
  rotation: 0;
  footprint: { width: 2; height: 2 };
  foodStock: MarketFoodStock;
}

export type LegacyBuildingV5 = LegacyBuildingV4 | LegacyMarketBuildingV5;

export interface LegacyHouseholdV4 {
  houseId: number;
  residents: 5 | 10;
}

export interface LegacyHouseholdV5 extends LegacyHouseholdV4 {
  foodReserveTicks: HouseholdFoodReserveTicks;
}

export interface LegacyWorldSnapshotV1 {
  map: { width: number; height: number };
  tick: number;
  revision: number;
  buildings: LegacyHouseBuildingV1V2[];
}

export interface LegacyWorldSnapshotV2 extends LegacyWorldSnapshotV1 {
  roads: TileCoordinate[];
  households: LegacyHouseholdV2[];
}

export interface LegacyWorldSnapshotV3 {
  map: { width: number; height: number };
  tick: number;
  revision: number;
  buildings: LegacyBuildingV3[];
  roads: TileCoordinate[];
  households: LegacyHouseholdV3[];
}

export interface LegacyWorldSnapshotV4 {
  map: { width: number; height: number };
  tick: number;
  revision: number;
  buildings: LegacyBuildingV4[];
  roads: TileCoordinate[];
  households: LegacyHouseholdV4[];
}

export interface LegacyWorldSnapshotV5 {
  map: { width: number; height: number };
  tick: number;
  revision: number;
  buildings: LegacyBuildingV5[];
  roads: TileCoordinate[];
  households: LegacyHouseholdV5[];
}

export interface WorldSnapshot {
  map: { width: number; height: number };
  /** Optional for pre-v8 fixtures; save and simulation boundaries normalize it. */
  terrain?: TerrainContract;
  tick: number;
  revision: number;
  buildings: BuildingView[];
  roads: TileCoordinate[];
  /** Deterministic suburban vegetation tiles cleared by the player. */
  clearedVegetation?: TileCoordinate[];
  /** Optional in TypeScript for legacy fixtures; protocol boundaries normalize it to an array. */
  walls?: TileCoordinate[];
  households: HouseholdView[];
  householdFoodOrders?: HouseholdFoodOrderView[];
  migrants: MigrantView[];
  performers?: PerformerView[];
  citizens?: CitizenView[];
  laborPolicy?: LaborPolicyView;
  shennongFavor?: 1 | 2 | 3;
  diplomacy?: {
    relation: number;
    tradeOpen: boolean;
    envoys: Array<{
      missionId: number;
      arrivesAtTick: number;
      cropType: CropType;
    }>;
  };
  economy?: {
    treasury: number;
    taxRate: TaxRate;
    lastTaxRevenue: number;
    lastPayroll: number;
    taxableHouses: number;
    sentiment: number;
    lastTradeRevenue: number;
    lastFestivalYear?: number;
    foodOrderEscrow?: number;
  };
}

export interface SaveEnvelopeV1 {
  saveFormatVersion: 1;
  world: LegacyWorldSnapshotV1;
}

export interface SaveEnvelopeV2 {
  saveFormatVersion: 2;
  world: LegacyWorldSnapshotV2;
}

export interface SaveEnvelopeV3 {
  saveFormatVersion: 3;
  world: LegacyWorldSnapshotV3;
}

export interface SaveEnvelopeV4 {
  saveFormatVersion: 4;
  world: LegacyWorldSnapshotV4;
}

export interface SaveEnvelopeV5 {
  saveFormatVersion: 5;
  world: LegacyWorldSnapshotV5;
}

export interface SaveEnvelopeV6 {
  saveFormatVersion: 6;
  world: WorldSnapshot;
}

export interface SaveEnvelopeV7 {
  saveFormatVersion: 7;
  world: WorldSnapshot;
}

export interface SaveEnvelopeV8 {
  saveFormatVersion: 8;
  world: WorldSnapshot;
}

export interface SaveEnvelopeV9 {
  saveFormatVersion: 9;
  world: WorldSnapshot;
}

export type SaveEnvelope =
  | SaveEnvelopeV1
  | SaveEnvelopeV2
  | SaveEnvelopeV3
  | SaveEnvelopeV4
  | SaveEnvelopeV5
  | SaveEnvelopeV6
  | SaveEnvelopeV7
  | SaveEnvelopeV8
  | SaveEnvelopeV9;

export type WorkerRequest =
  | { type: "initialize"; snapshot?: WorldSnapshot }
  | { type: "command"; command: GameCommand };

export type WorkerResponse =
  | { type: "ready"; snapshot: WorldSnapshot }
  | { type: "command-result"; result: CommandResult; snapshot: WorldSnapshot }
  | {
      type: "protocol-error";
      reasonCode: "invalid-request";
      seq?: number;
    };

const quarterTurnSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);
const cropTypeSchema = z.enum(CROP_TYPES);
const laborSectorSchema = z.enum(LABOR_SECTORS);
const wageLevelSchema = z.union([
  z.literal("low"),
  z.literal("standard"),
  z.literal("high"),
]);
const laborPrioritiesSchema = z
  .tuple([laborSectorSchema, laborSectorSchema, laborSectorSchema])
  .refine((priorities) => new Set(priorities).size === LABOR_SECTORS.length, {
    message: "劳动力优先级必须完整且不重复",
  });
const laborPolicySchema = z
  .object({
    wageLevel: wageLevelSchema,
    priorities: laborPrioritiesSchema,
  })
  .strict();
const nonnegativeSafeIntegerSchema = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER);
const positiveSafeIntegerSchema = z
  .number()
  .int()
  .min(1)
  .max(Number.MAX_SAFE_INTEGER);
const safeCoordinateSchema = z
  .number()
  .int()
  .min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);

const commandTileCoordinateSchema = z
  .object({ x: safeCoordinateSchema, y: safeCoordinateSchema })
  .strict();
const worldTileCoordinateSchema = commandTileCoordinateSchema;
const tileCoordinateSchema = z
  .object({
    x: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - 1),
    y: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - 1),
  })
  .strict();

const buildCommandSchema = z
  .object({
    seq: nonnegativeSafeIntegerSchema,
    type: z.literal("build"),
    buildingTypeId: z.union([
      z.literal("house"),
      z.literal("well"),
      z.literal("farm"),
      z.literal("granary"),
      z.literal("market"),
      z.literal("hemp-farm"),
      z.literal("weaver"),
      z.literal("weaponsmith"),
      z.literal("infantry-fort"),
      z.literal("tax-office"),
      z.literal("music-school"),
      z.literal("trading-post"),
    ]),
    x: safeCoordinateSchema,
    y: safeCoordinateSchema,
    rotation: quarterTurnSchema,
    cropType: cropTypeSchema.optional(),
  })
  .strict()
  .superRefine((command, context) => {
    if (command.buildingTypeId !== "house" && command.rotation !== 0) {
      context.addIssue({
        code: "custom",
        message: "该建筑不支持旋转",
        path: ["rotation"],
      });
    }
    if (command.buildingTypeId !== "farm" && command.cropType !== undefined) {
      context.addIssue({
        code: "custom",
        message: "只有农场建造命令可以选择作物",
        path: ["cropType"],
      });
    }
  });

const buildRoadPathCommandSchema = z
  .object({
    seq: nonnegativeSafeIntegerSchema,
    type: z.literal("build-road-path"),
    tiles: z
      .array(commandTileCoordinateSchema)
      .min(1)
      .max(DEFAULT_TERRAIN_CONTRACT.width * DEFAULT_TERRAIN_CONTRACT.height),
  })
  .strict();
const buildWallPathCommandSchema = z
  .object({
    seq: nonnegativeSafeIntegerSchema,
    type: z.literal("build-wall-path"),
    tiles: z
      .array(commandTileCoordinateSchema)
      .min(1)
      .max(DEFAULT_TERRAIN_CONTRACT.width * DEFAULT_TERRAIN_CONTRACT.height),
  })
  .strict();
const advanceTimeCommandSchema = z
  .object({
    seq: nonnegativeSafeIntegerSchema,
    type: z.literal("advance-time"),
    ticks: z.number().int().min(1).max(60),
  })
  .strict();
const advanceActivityCommandSchema = z
  .object({
    seq: nonnegativeSafeIntegerSchema,
    type: z.literal("advance-activity"),
    pulses: z.number().int().min(1).max(10),
  })
  .strict();
const demolishCommandSchema = z
  .object({
    seq: nonnegativeSafeIntegerSchema,
    type: z.literal("demolish"),
    x: safeCoordinateSchema,
    y: safeCoordinateSchema,
  })
  .strict();
const setLaborPolicyCommandSchema = z
  .object({
    seq: nonnegativeSafeIntegerSchema,
    type: z.literal("set-labor-policy"),
    wageLevel: wageLevelSchema,
    priorities: laborPrioritiesSchema,
  })
  .strict();
const setGranaryPolicyCommandSchema = z
  .object({
    seq: nonnegativeSafeIntegerSchema,
    type: z.literal("set-granary-policy"),
    granaryId: positiveSafeIntegerSchema,
    cropType: cropTypeSchema,
    accept: z.boolean(),
  })
  .strict();
const makeOfferingCommandSchema = z
  .object({
    seq: nonnegativeSafeIntegerSchema,
    type: z.literal("make-offering"),
    granaryId: positiveSafeIntegerSchema,
    cropType: cropTypeSchema,
  })
  .strict();
const sendGiftCommandSchema = z
  .object({
    seq: nonnegativeSafeIntegerSchema,
    type: z.literal("send-gift"),
    granaryId: positiveSafeIntegerSchema,
    cropType: cropTypeSchema,
  })
  .strict();
const setTaxRateCommandSchema = z
  .object({
    seq: nonnegativeSafeIntegerSchema,
    type: z.literal("set-tax-rate"),
    taxRate: z.union([
      z.literal("low"),
      z.literal("standard"),
      z.literal("high"),
    ]),
  })
  .strict();
const holdNewYearFestivalCommandSchema = z
  .object({
    seq: nonnegativeSafeIntegerSchema,
    type: z.literal("hold-new-year-festival"),
  })
  .strict();

export const gameCommandSchema = z.discriminatedUnion("type", [
  buildCommandSchema,
  buildRoadPathCommandSchema,
  buildWallPathCommandSchema,
  advanceTimeCommandSchema,
  advanceActivityCommandSchema,
  demolishCommandSchema,
  setLaborPolicyCommandSchema,
  setGranaryPolicyCommandSchema,
  makeOfferingCommandSchema,
  sendGiftCommandSchema,
  setTaxRateCommandSchema,
  holdNewYearFestivalCommandSchema,
]);

const legacyHouseBuildingSchema = z
  .object({
    id: positiveSafeIntegerSchema,
    typeId: z.literal("house"),
    x: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - HOUSE_FOOTPRINT),
    y: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - HOUSE_FOOTPRINT),
    rotation: quarterTurnSchema,
    footprint: z
      .object({
        width: z.literal(HOUSE_FOOTPRINT),
        height: z.literal(HOUSE_FOOTPRINT),
      })
      .strict(),
  })
  .strict();
const legacyHouseBuildingV3Schema = legacyHouseBuildingSchema
  .extend({ level: z.union([z.literal(1), z.literal(2)]) })
  .strict();
const legacyWellBuildingV3Schema = z
  .object({
    id: positiveSafeIntegerSchema,
    typeId: z.literal("well"),
    x: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - WELL_FOOTPRINT),
    y: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - WELL_FOOTPRINT),
    rotation: z.literal(0),
    footprint: z
      .object({
        width: z.literal(WELL_FOOTPRINT),
        height: z.literal(WELL_FOOTPRINT),
      })
      .strict(),
  })
  .strict();
const legacyBuildingV3Schema = z.discriminatedUnion("typeId", [
  legacyHouseBuildingV3Schema,
  legacyWellBuildingV3Schema,
]);

const legacyHouseBuildingV5Schema = legacyHouseBuildingSchema
  .extend({ level: z.union([z.literal(1), z.literal(2)]) })
  .strict();
const constructionStageSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
const houseBuildingSchema = legacyHouseBuildingV5Schema
  .extend({ constructionStage: constructionStageSchema })
  .strict();
const wellBuildingSchema = z
  .object({
    id: positiveSafeIntegerSchema,
    typeId: z.literal("well"),
    x: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - WELL_FOOTPRINT),
    y: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - WELL_FOOTPRINT),
    rotation: z.literal(0),
    footprint: z
      .object({
        width: z.literal(WELL_FOOTPRINT),
        height: z.literal(WELL_FOOTPRINT),
      })
      .strict(),
  })
  .strict();
const farmBuildingSchema = z
  .object({
    id: positiveSafeIntegerSchema,
    typeId: z.literal("farm"),
    x: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - FARM_FOOTPRINT),
    y: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - FARM_FOOTPRINT),
    rotation: z.literal(0),
    footprint: z
      .object({
        width: z.literal(FARM_FOOTPRINT),
        height: z.literal(FARM_FOOTPRINT),
      })
      .strict(),
    cropType: cropTypeSchema.default("millet"),
    foodStock: z.number().int().min(0).max(FARM_STOCK_CAPACITY),
    operatingCash: nonnegativeSafeIntegerSchema.optional(),
    wageArrears: nonnegativeSafeIntegerSchema.optional(),
    staffedWorkers: nonnegativeSafeIntegerSchema.optional(),
  })
  .strict();
const legacyGranaryBuildingSchema = z
  .object({
    id: positiveSafeIntegerSchema,
    typeId: z.literal("granary"),
    x: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - GRANARY_FOOTPRINT),
    y: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - GRANARY_FOOTPRINT),
    rotation: z.literal(0),
    footprint: z
      .object({
        width: z.literal(GRANARY_FOOTPRINT),
        height: z.literal(GRANARY_FOOTPRINT),
      })
      .strict(),
    foodStock: z.number().int().min(0).max(GRANARY_STOCK_CAPACITY),
  })
  .strict();
const legacyBuildingV4Schema = z.discriminatedUnion("typeId", [
  legacyHouseBuildingV5Schema,
  wellBuildingSchema,
  farmBuildingSchema,
  legacyGranaryBuildingSchema,
]);
const legacyMarketBuildingSchema = z
  .object({
    id: positiveSafeIntegerSchema,
    typeId: z.literal("market"),
    x: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - MARKET_FOOTPRINT),
    y: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - MARKET_FOOTPRINT),
    rotation: z.literal(0),
    footprint: z
      .object({
        width: z.literal(MARKET_FOOTPRINT),
        height: z.literal(MARKET_FOOTPRINT),
      })
      .strict(),
    foodStock: z.number().int().min(0).max(MARKET_STOCK_CAPACITY),
  })
  .strict();
const legacyBuildingV5Schema = z.discriminatedUnion("typeId", [
  legacyHouseBuildingV5Schema,
  wellBuildingSchema,
  farmBuildingSchema,
  legacyGranaryBuildingSchema,
  legacyMarketBuildingSchema,
]);

const foodStocksSchema = z
  .object({
    wheat: z.number().int().min(0).max(GRANARY_STOCK_CAPACITY),
    soybean: z.number().int().min(0).max(GRANARY_STOCK_CAPACITY),
    rice: z.number().int().min(0).max(GRANARY_STOCK_CAPACITY),
    millet: z.number().int().min(0).max(GRANARY_STOCK_CAPACITY),
    cabbage: z.number().int().min(0).max(GRANARY_STOCK_CAPACITY),
  })
  .strict();

const granaryBuildingSchema = legacyGranaryBuildingSchema
  .extend({
    foodStocks: foodStocksSchema,
    acceptedCrops: z
      .array(cropTypeSchema)
      .max(CROP_TYPES.length)
      .refine((crops) => new Set(crops).size === crops.length, {
        message: "粮仓接收作物不能重复",
      })
      .optional(),
    operatingCash: nonnegativeSafeIntegerSchema.optional(),
    wageArrears: nonnegativeSafeIntegerSchema.optional(),
    staffedWorkers: nonnegativeSafeIntegerSchema.optional(),
  })
  .strict();
const marketBuildingSchema = legacyMarketBuildingSchema
  .extend({
    foodStocks: foodStocksSchema,
    clothingStock: z
      .union([
        z.literal(0),
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
      ])
      .optional(),
    operatingCash: nonnegativeSafeIntegerSchema.optional(),
    wageArrears: nonnegativeSafeIntegerSchema.optional(),
    staffedWorkers: nonnegativeSafeIntegerSchema.optional(),
  })
  .strict();
const hempFarmBuildingSchema = z
  .object({
    id: positiveSafeIntegerSchema,
    typeId: z.literal("hemp-farm"),
    x: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - HEMP_FARM_FOOTPRINT),
    y: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - HEMP_FARM_FOOTPRINT),
    rotation: z.literal(0),
    footprint: z
      .object({
        width: z.literal(HEMP_FARM_FOOTPRINT),
        height: z.literal(HEMP_FARM_FOOTPRINT),
      })
      .strict(),
    hempStock: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
    ]),
  })
  .strict();
const weaverBuildingSchema = z
  .object({
    id: positiveSafeIntegerSchema,
    typeId: z.literal("weaver"),
    x: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - WEAVER_FOOTPRINT),
    y: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - WEAVER_FOOTPRINT),
    rotation: z.literal(0),
    footprint: z
      .object({
        width: z.literal(WEAVER_FOOTPRINT),
        height: z.literal(WEAVER_FOOTPRINT),
      })
      .strict(),
    hempStock: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    clothingStock: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  })
  .strict();
const weaponsmithBuildingSchema = z
  .object({
    id: positiveSafeIntegerSchema,
    typeId: z.literal("weaponsmith"),
    x: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - WEAPONSMITH_FOOTPRINT),
    y: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - WEAPONSMITH_FOOTPRINT),
    rotation: z.literal(0),
    footprint: z
      .object({
        width: z.literal(WEAPONSMITH_FOOTPRINT),
        height: z.literal(WEAPONSMITH_FOOTPRINT),
      })
      .strict(),
    weaponStock: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  })
  .strict();
const infantryFortBuildingSchema = z
  .object({
    id: positiveSafeIntegerSchema,
    typeId: z.literal("infantry-fort"),
    x: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - INFANTRY_FORT_FOOTPRINT),
    y: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - INFANTRY_FORT_FOOTPRINT),
    rotation: z.literal(0),
    footprint: z
      .object({
        width: z.literal(INFANTRY_FORT_FOOTPRINT),
        height: z.literal(INFANTRY_FORT_FOOTPRINT),
      })
      .strict(),
    weaponStock: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
    ]),
    soldiers: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
    ]),
  })
  .strict();
const taxOfficeBuildingSchema = z
  .object({
    id: positiveSafeIntegerSchema,
    typeId: z.literal("tax-office"),
    x: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - TAX_OFFICE_FOOTPRINT),
    y: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - TAX_OFFICE_FOOTPRINT),
    rotation: z.literal(0),
    footprint: z
      .object({
        width: z.literal(TAX_OFFICE_FOOTPRINT),
        height: z.literal(TAX_OFFICE_FOOTPRINT),
      })
      .strict(),
  })
  .strict();
const musicSchoolBuildingSchema = z
  .object({
    id: positiveSafeIntegerSchema,
    typeId: z.literal("music-school"),
    x: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - MUSIC_SCHOOL_FOOTPRINT),
    y: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - MUSIC_SCHOOL_FOOTPRINT),
    rotation: z.literal(0),
    footprint: z
      .object({
        width: z.literal(MUSIC_SCHOOL_FOOTPRINT),
        height: z.literal(MUSIC_SCHOOL_FOOTPRINT),
      })
      .strict(),
  })
  .strict();
const tradingPostBuildingSchema = z
  .object({
    id: positiveSafeIntegerSchema,
    typeId: z.literal("trading-post"),
    x: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - TRADING_POST_FOOTPRINT),
    y: z
      .number()
      .int()
      .min(0)
      .max(MAP_SIZE - TRADING_POST_FOOTPRINT),
    rotation: z.literal(0),
    footprint: z
      .object({
        width: z.literal(TRADING_POST_FOOTPRINT),
        height: z.literal(TRADING_POST_FOOTPRINT),
      })
      .strict(),
    clothingStock: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
      z.literal(7),
      z.literal(8),
    ]),
  })
  .strict();
const currentBuildingCoordinates = {
  x: safeCoordinateSchema,
  y: safeCoordinateSchema,
};
const buildingSchema = z.discriminatedUnion("typeId", [
  houseBuildingSchema.extend(currentBuildingCoordinates).strict(),
  wellBuildingSchema.extend(currentBuildingCoordinates).strict(),
  farmBuildingSchema.extend(currentBuildingCoordinates).strict(),
  granaryBuildingSchema.extend(currentBuildingCoordinates).strict(),
  marketBuildingSchema.extend(currentBuildingCoordinates).strict(),
  hempFarmBuildingSchema.extend(currentBuildingCoordinates).strict(),
  weaverBuildingSchema.extend(currentBuildingCoordinates).strict(),
  weaponsmithBuildingSchema.extend(currentBuildingCoordinates).strict(),
  infantryFortBuildingSchema.extend(currentBuildingCoordinates).strict(),
  taxOfficeBuildingSchema.extend(currentBuildingCoordinates).strict(),
  musicSchoolBuildingSchema.extend(currentBuildingCoordinates).strict(),
  tradingPostBuildingSchema.extend(currentBuildingCoordinates).strict(),
]);

const mapSchema = z
  .object({ width: z.literal(MAP_SIZE), height: z.literal(MAP_SIZE) })
  .strict();
const terrainContractSchema = z
  .object({
    originX: safeCoordinateSchema,
    originY: safeCoordinateSchema,
    width: positiveSafeIntegerSchema,
    height: positiveSafeIntegerSchema,
    seed: safeCoordinateSchema,
    maxBuildableSlope: z.number().finite().min(0),
  })
  .strict();
const legacyWorldBaseSchema = z
  .object({
    map: mapSchema,
    tick: nonnegativeSafeIntegerSchema,
    revision: nonnegativeSafeIntegerSchema,
    buildings: z.array(legacyHouseBuildingSchema),
  })
  .strict();
const legacyWorldV3BaseSchema = z
  .object({
    map: mapSchema,
    tick: nonnegativeSafeIntegerSchema,
    revision: nonnegativeSafeIntegerSchema,
    buildings: z.array(legacyBuildingV3Schema),
  })
  .strict();
const legacyWorldV4BaseSchema = z
  .object({
    map: mapSchema,
    tick: nonnegativeSafeIntegerSchema,
    revision: nonnegativeSafeIntegerSchema,
    buildings: z.array(legacyBuildingV4Schema),
  })
  .strict();
const legacyWorldV5BaseSchema = z
  .object({
    map: mapSchema,
    tick: nonnegativeSafeIntegerSchema,
    revision: nonnegativeSafeIntegerSchema,
    buildings: z.array(legacyBuildingV5Schema),
  })
  .strict();

function defaultFoodStocks(foodStock: unknown) {
  return {
    wheat: 0,
    soybean: 0,
    rice: 0,
    millet: typeof foodStock === "number" ? foodStock : 0,
    cabbage: 0,
  };
}

function normalizeCurrentBuildings(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((building) => {
    if (
      typeof building !== "object" ||
      building === null ||
      !("typeId" in building)
    ) {
      return building;
    }
    const normalized = {
      ...building,
      ...((building.typeId === "granary" || building.typeId === "market") &&
      !("foodStocks" in building)
        ? {
            foodStocks: defaultFoodStocks(
              "foodStock" in building ? building.foodStock : 0,
            ),
          }
        : {}),
    };
    if (
      building.typeId !== "farm" &&
      building.typeId !== "granary" &&
      building.typeId !== "market"
    ) {
      return normalized;
    }
    return {
      operatingCash: FOOD_BUSINESS_STARTING_CASH,
      wageArrears: 0,
      staffedWorkers: 0,
      ...normalized,
    };
  });
}

function normalizeCurrentEconomy(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }
  return {
    sentiment: 50,
    lastTradeRevenue: 0,
    ...value,
  };
}

const worldBaseSchema = z
  .object({
    map: mapSchema,
    terrain: terrainContractSchema.optional(),
    tick: nonnegativeSafeIntegerSchema,
    revision: nonnegativeSafeIntegerSchema,
    buildings: z.preprocess(normalizeCurrentBuildings, z.array(buildingSchema)),
    laborPolicy: laborPolicySchema.optional(),
    shennongFavor: z
      .union([z.literal(1), z.literal(2), z.literal(3)])
      .optional(),
    diplomacy: z
      .object({
        relation: z.number().int().min(0).max(100),
        tradeOpen: z.boolean(),
        envoys: z.array(
          z
            .object({
              missionId: nonnegativeSafeIntegerSchema,
              arrivesAtTick: nonnegativeSafeIntegerSchema,
              cropType: cropTypeSchema,
            })
            .strict(),
        ),
      })
      .strict()
      .optional(),
    economy: z.preprocess(
      normalizeCurrentEconomy,
      z
        .object({
          treasury: z
            .number()
            .int()
            .min(Number.MIN_SAFE_INTEGER)
            .max(Number.MAX_SAFE_INTEGER),
          taxRate: z.union([
            z.literal("low"),
            z.literal("standard"),
            z.literal("high"),
          ]),
          lastTaxRevenue: nonnegativeSafeIntegerSchema,
          lastPayroll: nonnegativeSafeIntegerSchema,
          taxableHouses: nonnegativeSafeIntegerSchema,
          sentiment: z.number().int().min(0).max(100),
          lastTradeRevenue: nonnegativeSafeIntegerSchema,
          lastFestivalYear: positiveSafeIntegerSchema.optional(),
          foodOrderEscrow: nonnegativeSafeIntegerSchema.optional(),
        })
        .strict()
        .optional(),
    ),
    performers: z
      .array(
        z
          .object({
            schoolId: positiveSafeIntegerSchema,
            targetMarketId: positiveSafeIntegerSchema,
            x: safeCoordinateSchema,
            y: safeCoordinateSchema,
          })
          .strict(),
      )
      .optional(),
    citizens: z
      .array(
        z
          .object({
            id: positiveSafeIntegerSchema,
            houseId: positiveSafeIntegerSchema,
            workplaceId: positiveSafeIntegerSchema.nullable(),
            x: safeCoordinateSchema,
            y: safeCoordinateSchema,
            state: z.union([
              z.literal("commuting"),
              z.literal("working"),
              z.literal("returning"),
              z.literal("resting"),
              z.literal("strolling"),
              z.literal("waiting"),
            ]),
            dwellTicks: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

interface FootprintBuilding {
  id: number;
  typeId: string;
  x: number;
  y: number;
  footprint: { width: number; height: number };
}

function buildingsOverlap(left: FootprintBuilding, right: FootprintBuilding) {
  return (
    left.x < right.x + right.footprint.width &&
    left.x + left.footprint.width > right.x &&
    left.y < right.y + right.footprint.height &&
    left.y + left.footprint.height > right.y
  );
}

function tileIsInsideBuilding(
  tile: TileCoordinate,
  building: FootprintBuilding,
): boolean {
  return (
    tile.x >= building.x &&
    tile.x < building.x + building.footprint.width &&
    tile.y >= building.y &&
    tile.y < building.y + building.footprint.height
  );
}

function validateBuildings(
  buildings: FootprintBuilding[],
  context: z.RefinementCtx,
  reserveCityGate = true,
): void {
  const ids = new Set<number>();
  for (let index = 0; index < buildings.length; index += 1) {
    const building = buildings[index];
    if (ids.has(building.id)) {
      context.addIssue({
        code: "custom",
        message: "建筑实体 ID 必须唯一",
        path: ["buildings", index, "id"],
      });
    }
    ids.add(building.id);
    if (reserveCityGate && tileIsInsideBuilding(CITY_GATE_TILE, building)) {
      context.addIssue({
        code: "custom",
        message: "建筑不能占用城门格",
        path: ["buildings", index],
      });
    }
    for (let otherIndex = 0; otherIndex < index; otherIndex += 1) {
      if (buildingsOverlap(building, buildings[otherIndex])) {
        context.addIssue({
          code: "custom",
          message: "建筑占地不能互相重叠",
          path: ["buildings", index],
        });
      }
    }
  }
}

function validateFoodStockBreakdown(
  buildings: BuildingView[],
  context: z.RefinementCtx,
): void {
  for (let index = 0; index < buildings.length; index += 1) {
    const building = buildings[index];
    if (building.typeId !== "granary" && building.typeId !== "market") continue;
    const total = CROP_TYPES.reduce(
      (sum, cropType) => sum + building.foodStocks[cropType],
      0,
    );
    if (total !== building.foodStock) {
      context.addIssue({
        code: "custom",
        message: "分品类粮食库存之和必须等于总库存",
        path: ["buildings", index, "foodStocks"],
      });
    }
  }
}

function tileKey(tile: TileCoordinate): string {
  return terrainTileKey(tile);
}

function isInsideMap(tile: TileCoordinate): boolean {
  return isTileInsideTerrain(tile);
}

function orthogonalNeighbors(tile: TileCoordinate): TileCoordinate[] {
  return [
    { x: tile.x + 1, y: tile.y },
    { x: tile.x - 1, y: tile.y },
    { x: tile.x, y: tile.y + 1 },
    { x: tile.x, y: tile.y - 1 },
  ];
}

function footprintBorderTiles(building: FootprintBuilding): TileCoordinate[] {
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
  return tiles.filter((tile) => isInsideMap(tile));
}

function connectedRoadKeys(roads: TileCoordinate[]): Set<string> {
  const allRoadKeys = new Set(roads.map(tileKey));
  const entranceKey = tileKey(CITY_GATE_TILE);
  if (!allRoadKeys.has(entranceKey)) return new Set();
  const connected = new Set<string>([entranceKey]);
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

function waterRoadDistances(
  roads: TileCoordinate[],
  wells: FootprintBuilding[],
  serviceRange: number,
): Map<string, number> {
  const allRoadKeys = new Set(roads.map(tileKey));
  const tileByKey = new Map(roads.map((road) => [tileKey(road), road]));
  const distances = new Map<string, number>();
  const queue: string[] = [];
  for (const well of wells) {
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
    if (distance >= serviceRange) continue;
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

function validateRoadLayer(
  roads: TileCoordinate[],
  buildings: FootprintBuilding[],
  context: z.RefinementCtx,
  walls: TileCoordinate[] = [],
): void {
  const roadKeys = new Set<string>();
  const wallKeys = new Set(walls.map(tileKey));
  for (let index = 0; index < roads.length; index += 1) {
    const road = roads[index];
    const key = tileKey(road);
    if (roadKeys.has(key)) {
      context.addIssue({
        code: "custom",
        message: "道路格必须唯一",
        path: ["roads", index],
      });
    }
    roadKeys.add(key);
    if (buildings.some((building) => tileIsInsideBuilding(road, building))) {
      context.addIssue({
        code: "custom",
        message: "道路不能覆盖建筑",
        path: ["roads", index],
      });
    }
    if (wallKeys.has(key)) {
      context.addIssue({
        code: "custom",
        message: "道路不能覆盖城墙",
        path: ["roads", index],
      });
    }
  }
}

function validateWallLayer(
  walls: TileCoordinate[],
  roads: TileCoordinate[],
  buildings: FootprintBuilding[],
  context: z.RefinementCtx,
): void {
  const wallKeys = new Set<string>();
  const roadKeys = new Set(roads.map(tileKey));
  for (let index = 0; index < walls.length; index += 1) {
    const wall = walls[index];
    const key = tileKey(wall);
    if (wallKeys.has(key)) {
      context.addIssue({
        code: "custom",
        message: "城墙格必须唯一",
        path: ["walls", index],
      });
    }
    wallKeys.add(key);
    if (wall.x === CITY_GATE_TILE.x && wall.y === CITY_GATE_TILE.y) {
      context.addIssue({
        code: "custom",
        message: "城墙不能占用城门格",
        path: ["walls", index],
      });
    }
    if (roadKeys.has(key)) {
      context.addIssue({
        code: "custom",
        message: "城墙不能覆盖道路",
        path: ["walls", index],
      });
    }
    if (buildings.some((building) => tileIsInsideBuilding(wall, building))) {
      context.addIssue({
        code: "custom",
        message: "城墙不能覆盖建筑",
        path: ["walls", index],
      });
    }
  }
}

function houseHasRoadService(
  house: FootprintBuilding,
  connected: Set<string>,
): boolean {
  return footprintBorderTiles(house).some((tile) =>
    connected.has(tileKey(tile)),
  );
}

interface ResidentialHouseBuilding extends FootprintBuilding {
  typeId: "house";
  level: HouseLevel;
  constructionStage?: ConstructionStage;
}

interface HouseholdLike {
  houseId: number;
  residents: number;
  foodReserveTicks?: number;
}

interface ResidentialRuleConstants {
  houseCapacity: number;
  upgradedHouseCapacity: number;
  wellServiceRange: number;
  requireFoodReserve?: boolean;
}

function validateResidentialWorld(
  buildings: FootprintBuilding[],
  roads: TileCoordinate[],
  households: HouseholdLike[],
  context: z.RefinementCtx,
  constants: ResidentialRuleConstants,
  walls: TileCoordinate[] = [],
): void {
  validateBuildings(buildings, context);
  validateRoadLayer(roads, buildings, context, walls);
  const houses = buildings.filter(
    (building): building is ResidentialHouseBuilding =>
      building.typeId === "house" &&
      "level" in building &&
      (building.level === 1 || building.level === 2),
  );
  const wells = buildings.filter((building) => building.typeId === "well");
  const housesById = new Map(houses.map((house) => [house.id, house]));
  const connected = connectedRoadKeys(roads);
  const waterDistances = waterRoadDistances(
    roads,
    wells,
    constants.wellServiceRange,
  );
  const householdsByHouse = new Map<number, HouseholdLike>();

  for (let index = 0; index < households.length; index += 1) {
    const household = households[index];
    const house = housesById.get(household.houseId);
    if (!house) {
      context.addIssue({
        code: "custom",
        message: "住户必须引用已存在的住宅而非其他建筑",
        path: ["households", index, "houseId"],
      });
    } else {
      if (
        house.constructionStage !== undefined &&
        house.constructionStage < 4
      ) {
        context.addIssue({
          code: "custom",
          message: "未完工住宅不能有住户",
          path: ["households", index],
        });
      }
      if (!houseHasRoadService(house, connected)) {
        context.addIssue({
          code: "custom",
          message: "住户住宅必须具备入口道路服务",
          path: ["households", index],
        });
      }
      const expectedResidents =
        house.level === 2
          ? constants.upgradedHouseCapacity
          : constants.houseCapacity;
      if (household.residents !== expectedResidents) {
        context.addIssue({
          code: "custom",
          message: "住户人数必须与住宅等级容量一致",
          path: ["households", index, "residents"],
        });
      }
    }
    if (householdsByHouse.has(household.houseId)) {
      context.addIssue({
        code: "custom",
        message: "每座住宅最多一条住户记录",
        path: ["households", index, "houseId"],
      });
    }
    householdsByHouse.set(household.houseId, household);
  }

  for (const house of houses) {
    if (house.constructionStage !== undefined && house.constructionStage < 4) {
      if (house.level !== 1) {
        context.addIssue({
          code: "custom",
          message: "未完工住宅必须保持一级",
          path: ["buildings", buildings.indexOf(house), "level"],
        });
      }
      continue;
    }
    if (house.level !== 2) continue;
    const household = householdsByHouse.get(house.id);
    if (!household || household.residents !== constants.upgradedHouseCapacity) {
      context.addIssue({
        code: "custom",
        message: "二级住宅必须有 10 人住户",
        path: ["buildings", buildings.indexOf(house), "level"],
      });
    }
    const hasWater = footprintBorderTiles(house).some((tile) => {
      const distance = waterDistances.get(tileKey(tile));
      return distance !== undefined && distance <= constants.wellServiceRange;
    });
    if (!hasWater) {
      context.addIssue({
        code: "custom",
        message: "二级住宅必须具备有效水井服务",
        path: ["buildings", buildings.indexOf(house), "level"],
      });
    }
    if (
      constants.requireFoodReserve &&
      (!household ||
        household.foodReserveTicks === undefined ||
        household.foodReserveTicks <= 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "二级住宅必须有可用住户口粮",
        path: ["buildings", buildings.indexOf(house), "level"],
      });
    }
  }
}

export const legacyWorldSnapshotV1Schema = legacyWorldBaseSchema.superRefine(
  (world, context) => validateBuildings(world.buildings, context, false),
);

export const legacyWorldSnapshotV2Schema = legacyWorldBaseSchema
  .extend({
    roads: z.array(tileCoordinateSchema),
    households: z.array(
      z
        .object({
          houseId: positiveSafeIntegerSchema,
          residents: z.literal(5),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((world, context) => {
    validateBuildings(world.buildings, context, false);
    validateRoadLayer(world.roads, world.buildings, context);
    const housesById = new Map(
      world.buildings.map((building) => [building.id, building]),
    );
    const connected = connectedRoadKeys(world.roads);
    const referenced = new Set<number>();
    for (let index = 0; index < world.households.length; index += 1) {
      const household = world.households[index];
      const house = housesById.get(household.houseId);
      if (!house) {
        context.addIssue({
          code: "custom",
          message: "住户必须引用已存在的住宅",
          path: ["households", index, "houseId"],
        });
      } else if (!houseHasRoadService(house, connected)) {
        context.addIssue({
          code: "custom",
          message: "住户住宅必须具备入口道路服务",
          path: ["households", index],
        });
      }
      if (referenced.has(household.houseId)) {
        context.addIssue({
          code: "custom",
          message: "每座住宅最多一条住户记录",
          path: ["households", index, "houseId"],
        });
      }
      referenced.add(household.houseId);
    }
  });

export const legacyWorldSnapshotV3Schema = legacyWorldV3BaseSchema
  .extend({
    roads: z.array(tileCoordinateSchema),
    households: z.array(
      z
        .object({
          houseId: positiveSafeIntegerSchema,
          residents: z.union([z.literal(5), z.literal(10)]),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((world, context) => {
    validateResidentialWorld(
      world.buildings,
      world.roads,
      world.households,
      context,
      {
        houseCapacity: LEGACY_V3_HOUSE_CAPACITY,
        upgradedHouseCapacity: LEGACY_V3_UPGRADED_HOUSE_CAPACITY,
        wellServiceRange: LEGACY_V3_WELL_SERVICE_RANGE,
      },
    );
  });

export const legacyWorldSnapshotV4Schema = legacyWorldV4BaseSchema
  .extend({
    roads: z.array(tileCoordinateSchema),
    households: z.array(
      z
        .object({
          houseId: positiveSafeIntegerSchema,
          residents: z.union([z.literal(5), z.literal(10)]),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((world, context) => {
    validateResidentialWorld(
      world.buildings,
      world.roads,
      world.households,
      context,
      {
        houseCapacity: HOUSE_CAPACITY,
        upgradedHouseCapacity: UPGRADED_HOUSE_CAPACITY,
        wellServiceRange: WELL_SERVICE_RANGE,
      },
    );
  });

export const legacyWorldSnapshotV5Schema = legacyWorldV5BaseSchema
  .extend({
    roads: z.array(tileCoordinateSchema),
    households: z.array(
      z
        .object({
          houseId: positiveSafeIntegerSchema,
          residents: z.union([z.literal(5), z.literal(10)]),
          foodReserveTicks: z.union([
            z.literal(0),
            z.literal(1),
            z.literal(2),
            z.literal(HOUSEHOLD_FOOD_RESERVE_MAX),
          ]),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((world, context) => {
    validateResidentialWorld(
      world.buildings,
      world.roads,
      world.households,
      context,
      {
        houseCapacity: HOUSE_CAPACITY,
        upgradedHouseCapacity: UPGRADED_HOUSE_CAPACITY,
        wellServiceRange: WELL_SERVICE_RANGE,
        requireFoodReserve: true,
      },
    );
  });

const migrantSchema = z
  .object({
    houseId: positiveSafeIntegerSchema,
    x: safeCoordinateSchema,
    y: safeCoordinateSchema,
    state: z.union([z.literal("walking"), z.literal("building")]),
  })
  .strict();

const foodQualitySchema = z.union([
  z.literal("none"),
  z.literal("bland"),
  z.literal("plain"),
  z.literal("appetizing"),
  z.literal("tasty"),
]);

function normalizeCurrentHouseholds(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((household) => {
    if (typeof household !== "object" || household === null) {
      return household;
    }
    const foodReserveUnits =
      "foodReserveUnits" in household
        ? household.foodReserveUnits
        : typeof household.residents === "number" &&
            typeof household.foodReserveTicks === "number"
          ? Math.ceil(household.residents / 5) * household.foodReserveTicks
          : 0;
    const foodReserveTicks =
      typeof household.residents === "number" &&
      typeof foodReserveUnits === "number"
        ? Math.min(
            3,
            Math.floor(foodReserveUnits / Math.ceil(household.residents / 5)),
          )
        : 0;
    return {
      cash: HOUSEHOLD_STARTING_CASH,
      employedWorkers: 0,
      lastIncome: 0,
      lastFoodExpense: 0,
      wageArrears: 0,
      taxArrears: 0,
      foodShortageReason: "none",
      livelihoodLedger: [],
      ...household,
      foodReserveUnits,
      foodReserveTicks,
      ...(!("foodQuality" in household)
        ? {
            foodQuality:
              "foodReserveTicks" in household &&
              household.foodReserveTicks === 0
                ? "none"
                : "bland",
          }
        : {}),
    };
  });
}

const foodShortageReasonSchema = z.union([
  z.literal("none"),
  z.literal("delivery-pending"),
  z.literal("unaffordable"),
  z.literal("out-of-stock"),
  z.literal("disconnected"),
  z.literal("no-market"),
]);

const livelihoodLedgerKindSchema = z.union([
  z.literal("arrival-funds"),
  z.literal("wage"),
  z.literal("wage-arrears"),
  z.literal("tax"),
  z.literal("tax-arrears"),
  z.literal("food-order"),
  z.literal("food-delivery"),
  z.literal("food-refund"),
]);

const livelihoodLedgerEntrySchema = z
  .object({
    id: z.string().min(1),
    tick: nonnegativeSafeIntegerSchema,
    kind: livelihoodLedgerKindSchema,
    amount: z.number().int().safe(),
    balanceAfter: nonnegativeSafeIntegerSchema,
  })
  .strict();

const householdFoodOrderSchema = z
  .object({
    houseId: positiveSafeIntegerSchema,
    marketId: positiveSafeIntegerSchema,
    cropType: cropTypeSchema,
    foodQuality: foodQualitySchema,
    quantity: positiveSafeIntegerSchema.default(1),
    price: positiveSafeIntegerSchema,
    placedAtTick: nonnegativeSafeIntegerSchema,
    arrivesAtTick: nonnegativeSafeIntegerSchema,
  })
  .strict();

function validateConstructionMigrants(
  buildings: BuildingView[],
  roads: TileCoordinate[],
  migrants: MigrantView[],
  context: z.RefinementCtx,
): void {
  const houses = buildings.filter(
    (building): building is HouseBuildingView => building.typeId === "house",
  );
  const housesById = new Map(houses.map((house) => [house.id, house]));
  const roadKeys = new Set(roads.map(tileKey));
  const connected = connectedRoadKeys(roads);
  const migrantsByHouse = new Map<number, MigrantView>();

  for (let index = 0; index < migrants.length; index += 1) {
    const migrant = migrants[index];
    const house = housesById.get(migrant.houseId);
    if (!house || house.constructionStage === 4) {
      context.addIssue({
        code: "custom",
        message: "流民必须绑定未完工住宅",
        path: ["migrants", index, "houseId"],
      });
    } else {
      if (
        (migrant.state === "walking" && house.constructionStage !== 0) ||
        (migrant.state === "building" &&
          (house.constructionStage < 1 || house.constructionStage > 3))
      ) {
        context.addIssue({
          code: "custom",
          message: "流民状态必须与住宅施工阶段一致",
          path: ["migrants", index, "state"],
        });
      }
      const positionKey = tileKey(migrant);
      if (!roadKeys.has(positionKey)) {
        context.addIssue({
          code: "custom",
          message: "流民必须站在道路格上",
          path: ["migrants", index],
        });
      }
      if (migrant.state === "walking" && !connected.has(positionKey)) {
        context.addIssue({
          code: "custom",
          message: "步行流民必须位于城门连通道路",
          path: ["migrants", index],
        });
      }
      if (
        migrant.state === "building" &&
        !footprintBorderTiles(house).some(
          (tile) => tile.x === migrant.x && tile.y === migrant.y,
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "施工流民必须位于住宅相邻道路格",
          path: ["migrants", index],
        });
      }
    }
    if (migrantsByHouse.has(migrant.houseId)) {
      context.addIssue({
        code: "custom",
        message: "每座住宅最多一名流民",
        path: ["migrants", index, "houseId"],
      });
    }
    migrantsByHouse.set(migrant.houseId, migrant);
  }

  for (const house of houses) {
    if (
      house.constructionStage > 0 &&
      house.constructionStage < 4 &&
      !migrantsByHouse.has(house.id)
    ) {
      context.addIssue({
        code: "custom",
        message: "施工中的住宅必须有绑定流民",
        path: ["buildings", buildings.indexOf(house), "constructionStage"],
      });
    }
  }
}

function validatePerformers(
  buildings: BuildingView[],
  roads: TileCoordinate[],
  performers: PerformerView[],
  context: z.RefinementCtx,
): void {
  const schoolIds = new Set(
    buildings
      .filter((building) => building.typeId === "music-school")
      .map((building) => building.id),
  );
  const marketIds = new Set(
    buildings
      .filter((building) => building.typeId === "market")
      .map((building) => building.id),
  );
  const roadKeys = new Set(roads.map(tileKey));
  const occupiedSchools = new Set<number>();
  for (let index = 0; index < performers.length; index += 1) {
    const performer = performers[index];
    if (!schoolIds.has(performer.schoolId)) {
      context.addIssue({
        code: "custom",
        message: "乐师必须绑定现存音乐学校",
        path: ["performers", index, "schoolId"],
      });
    }
    if (!marketIds.has(performer.targetMarketId)) {
      context.addIssue({
        code: "custom",
        message: "乐师目标必须是现存市场",
        path: ["performers", index, "targetMarketId"],
      });
    }
    if (!roadKeys.has(tileKey(performer))) {
      context.addIssue({
        code: "custom",
        message: "乐师必须位于道路格",
        path: ["performers", index],
      });
    }
    if (occupiedSchools.has(performer.schoolId)) {
      context.addIssue({
        code: "custom",
        message: "每座音乐学校最多一名在途乐师",
        path: ["performers", index, "schoolId"],
      });
    }
    occupiedSchools.add(performer.schoolId);
  }
}

function validateCitizens(
  buildings: BuildingView[],
  roads: TileCoordinate[],
  households: HouseholdView[],
  citizens: CitizenView[],
  context: z.RefinementCtx,
): void {
  const householdHouseIds = new Set(
    households.map((household) => household.houseId),
  );
  const buildingsById = new Map(
    buildings.map((building) => [building.id, building]),
  );
  const roadKeys = new Set(roads.map(tileKey));
  const citizenIds = new Set<number>();
  const representedHouses = new Set<number>();

  for (let index = 0; index < citizens.length; index += 1) {
    const citizen = citizens[index];
    if (!householdHouseIds.has(citizen.houseId)) {
      context.addIssue({
        code: "custom",
        message: "市民必须绑定现存住户",
        path: ["citizens", index, "houseId"],
      });
    }
    if (
      citizen.workplaceId !== null &&
      (!buildingsById.has(citizen.workplaceId) ||
        buildingsById.get(citizen.workplaceId)?.typeId === "house")
    ) {
      context.addIssue({
        code: "custom",
        message: "市民岗位必须绑定现存非住宅建筑",
        path: ["citizens", index, "workplaceId"],
      });
    }
    if (!roadKeys.has(tileKey(citizen))) {
      context.addIssue({
        code: "custom",
        message: "市民必须位于道路格",
        path: ["citizens", index],
      });
    }
    if (
      citizen.workplaceId === null &&
      (citizen.state === "commuting" || citizen.state === "working")
    ) {
      context.addIssue({
        code: "custom",
        message: "无岗位市民不能处于通勤或工作状态",
        path: ["citizens", index, "state"],
      });
    }
    if (citizenIds.has(citizen.id)) {
      context.addIssue({
        code: "custom",
        message: "市民标识必须唯一",
        path: ["citizens", index, "id"],
      });
    }
    if (representedHouses.has(citizen.houseId)) {
      context.addIssue({
        code: "custom",
        message: "每户最多一名市民代表",
        path: ["citizens", index, "houseId"],
      });
    }
    citizenIds.add(citizen.id);
    representedHouses.add(citizen.houseId);
  }
}

export const worldSnapshotSchema = worldBaseSchema
  .extend({
    roads: z.array(worldTileCoordinateSchema),
    clearedVegetation: z.array(worldTileCoordinateSchema).optional(),
    walls: z.array(worldTileCoordinateSchema).optional(),
    households: z.preprocess(
      normalizeCurrentHouseholds,
      z.array(
        z
          .object({
            houseId: positiveSafeIntegerSchema,
            residents: z.union([z.literal(5), z.literal(10)]),
            foodReserveTicks: z.union([
              z.literal(0),
              z.literal(1),
              z.literal(2),
              z.literal(HOUSEHOLD_FOOD_RESERVE_MAX),
            ]),
            foodReserveUnits: nonnegativeSafeIntegerSchema,
            foodQuality: foodQualitySchema,
            clothingReserveTicks: z
              .union([
                z.literal(0),
                z.literal(1),
                z.literal(2),
                z.literal(HOUSEHOLD_FOOD_RESERVE_MAX),
              ])
              .optional(),
            entertainmentReserveTicks: z
              .union([
                z.literal(0),
                z.literal(1),
                z.literal(2),
                z.literal(HOUSEHOLD_FOOD_RESERVE_MAX),
              ])
              .optional(),
            cash: nonnegativeSafeIntegerSchema,
            employedWorkers: nonnegativeSafeIntegerSchema,
            lastIncome: nonnegativeSafeIntegerSchema,
            lastFoodExpense: nonnegativeSafeIntegerSchema,
            wageArrears: nonnegativeSafeIntegerSchema,
            taxArrears: nonnegativeSafeIntegerSchema,
            foodShortageReason: foodShortageReasonSchema,
            livelihoodLedger: z
              .array(livelihoodLedgerEntrySchema)
              .max(HOUSEHOLD_LEDGER_LIMIT),
          })
          .strict(),
      ),
    ),
    householdFoodOrders: z.array(householdFoodOrderSchema).optional(),
    migrants: z.array(migrantSchema),
  })
  .strict()
  .superRefine((world, context) => {
    validateResidentialWorld(
      world.buildings,
      world.roads,
      world.households,
      context,
      {
        houseCapacity: HOUSE_CAPACITY,
        upgradedHouseCapacity: UPGRADED_HOUSE_CAPACITY,
        wellServiceRange: WELL_SERVICE_RANGE,
        requireFoodReserve: true,
      },
      world.walls ?? [],
    );
    validateWallLayer(world.walls ?? [], world.roads, world.buildings, context);
    validateFoodStockBreakdown(world.buildings, context);
    validateConstructionMigrants(
      world.buildings,
      world.roads,
      world.migrants,
      context,
    );
    validatePerformers(
      world.buildings,
      world.roads,
      world.performers ?? [],
      context,
    );
    validateCitizens(
      world.buildings,
      world.roads,
      world.households,
      world.citizens ?? [],
      context,
    );
    const householdsById = new Set(
      world.households.map((household) => household.houseId),
    );
    const marketIds = new Set(
      world.buildings
        .filter((building) => building.typeId === "market")
        .map((market) => market.id),
    );
    const orderedHouseholds = new Set<number>();
    const expectedFoodOrderEscrow = (world.householdFoodOrders ?? []).reduce(
      (total, order) => total + order.price,
      0,
    );
    if ((world.economy?.foodOrderEscrow ?? 0) !== expectedFoodOrderEscrow) {
      context.addIssue({
        code: "custom",
        message: "口粮订单托管金必须与全部在途订单金额一致",
        path: ["economy", "foodOrderEscrow"],
      });
    }
    for (const [index, order] of (world.householdFoodOrders ?? []).entries()) {
      if (!householdsById.has(order.houseId)) {
        context.addIssue({
          code: "custom",
          message: "口粮订单必须引用现存家庭",
          path: ["householdFoodOrders", index, "houseId"],
        });
      }
      if (!marketIds.has(order.marketId)) {
        context.addIssue({
          code: "custom",
          message: "口粮订单必须引用现存市场",
          path: ["householdFoodOrders", index, "marketId"],
        });
      }
      if (orderedHouseholds.has(order.houseId)) {
        context.addIssue({
          code: "custom",
          message: "每户最多一笔在途口粮订单",
          path: ["householdFoodOrders", index, "houseId"],
        });
      }
      if (order.arrivesAtTick <= order.placedAtTick) {
        context.addIssue({
          code: "custom",
          message: "口粮订单到达时间必须晚于下单时间",
          path: ["householdFoodOrders", index, "arrivesAtTick"],
        });
      }
      orderedHouseholds.add(order.houseId);
    }
    for (const [householdIndex, household] of world.households.entries()) {
      const ledgerIds = new Set<string>();
      for (const [entryIndex, entry] of household.livelihoodLedger.entries()) {
        if (ledgerIds.has(entry.id)) {
          context.addIssue({
            code: "custom",
            message: "家庭生计流水标识必须唯一",
            path: [
              "households",
              householdIndex,
              "livelihoodLedger",
              entryIndex,
              "id",
            ],
          });
        }
        ledgerIds.add(entry.id);
      }
    }
  });

const saveEnvelopeV1Schema = z
  .object({
    saveFormatVersion: z.literal(1),
    world: legacyWorldSnapshotV1Schema,
  })
  .strict();
const saveEnvelopeV2Schema = z
  .object({
    saveFormatVersion: z.literal(2),
    world: legacyWorldSnapshotV2Schema,
  })
  .strict();
const saveEnvelopeV3Schema = z
  .object({
    saveFormatVersion: z.literal(3),
    world: legacyWorldSnapshotV3Schema,
  })
  .strict();
const saveEnvelopeV4Schema = z
  .object({
    saveFormatVersion: z.literal(4),
    world: legacyWorldSnapshotV4Schema,
  })
  .strict();
const saveEnvelopeV5Schema = z
  .object({
    saveFormatVersion: z.literal(5),
    world: legacyWorldSnapshotV5Schema,
  })
  .strict();
const saveEnvelopeV6Schema = z
  .object({
    saveFormatVersion: z.literal(6),
    world: worldSnapshotSchema,
  })
  .strict();
const worldSnapshotV7Schema = worldSnapshotSchema.superRefine(
  (world, context) => {
    if (world.walls === undefined) {
      context.addIssue({
        code: "custom",
        message: "v7 存档必须显式携带城墙层",
        path: ["walls"],
      });
    }
  },
);
const saveEnvelopeV7Schema = z
  .object({
    saveFormatVersion: z.literal(7),
    world: worldSnapshotV7Schema,
  })
  .strict();
const worldSnapshotV8Schema = worldSnapshotSchema.superRefine(
  (world, context) => {
    if (world.walls === undefined) {
      context.addIssue({
        code: "custom",
        message: "v8 存档必须显式携带城墙层",
        path: ["walls"],
      });
    }
    if (world.terrain === undefined) {
      context.addIssue({
        code: "custom",
        message: "v8 存档必须显式携带地形契约",
        path: ["terrain"],
      });
      return;
    }
    for (const [index, building] of world.buildings.entries()) {
      if (
        !isFootprintBuildableOnTerrain(
          building.x,
          building.y,
          building.footprint.width,
          building.footprint.height,
          world.terrain,
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "建筑必须完整位于可建设土地",
          path: ["buildings", index],
        });
      }
    }
    for (const layer of ["roads", "walls"] as const) {
      for (const [index, tile] of (world[layer] ?? []).entries()) {
        if (!isTileInsideTerrain(tile, world.terrain)) {
          context.addIssue({
            code: "custom",
            message: `${layer === "roads" ? "道路" : "城墙"}必须位于地形边界内`,
            path: [layer, index],
          });
        }
      }
    }
  },
);
const saveEnvelopeV8Schema = z
  .object({
    saveFormatVersion: z.literal(8),
    world: worldSnapshotV8Schema,
  })
  .strict();
const saveEnvelopeV9Schema = z
  .object({
    saveFormatVersion: z.literal(9),
    world: worldSnapshotV8Schema,
  })
  .strict();

export const saveEnvelopeSchema = z.discriminatedUnion("saveFormatVersion", [
  saveEnvelopeV1Schema,
  saveEnvelopeV2Schema,
  saveEnvelopeV3Schema,
  saveEnvelopeV4Schema,
  saveEnvelopeV5Schema,
  saveEnvelopeV6Schema,
  saveEnvelopeV7Schema,
  saveEnvelopeV8Schema,
  saveEnvelopeV9Schema,
]);

export const workerRequestSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("initialize"),
      snapshot: worldSnapshotSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("command"),
      command: gameCommandSchema,
    })
    .strict(),
]);

export function parseGameCommand(value: unknown): GameCommand {
  return gameCommandSchema.parse(value);
}

export function parseSaveEnvelope(value: unknown): SaveEnvelope {
  return saveEnvelopeSchema.parse(value);
}

function migrateLegacyBuildings(
  world: LegacyWorldSnapshotV2,
): LegacyHouseBuildingV3[] {
  const upgraded = world.buildings.map<LegacyHouseBuildingV3>((building) => ({
    ...building,
    footprint: { ...building.footprint },
    level: 1,
  }));
  const migrated: LegacyHouseBuildingV3[] = [];

  for (let index = 0; index < upgraded.length; index += 1) {
    const building = upgraded[index];
    if (!tileIsInsideBuilding(CITY_GATE_TILE, building)) {
      migrated.push(building);
      continue;
    }

    const obstacles = [...migrated, ...upgraded.slice(index + 1)];
    const candidates: Array<{ x: number; y: number }> = [];
    for (let y = 0; y <= MAP_SIZE - HOUSE_FOOTPRINT; y += 1) {
      for (let x = 0; x <= MAP_SIZE - HOUSE_FOOTPRINT; x += 1) {
        candidates.push({ x, y });
      }
    }
    candidates.sort((left, right) => {
      const leftDistance =
        Math.abs(left.x - building.x) + Math.abs(left.y - building.y);
      const rightDistance =
        Math.abs(right.x - building.x) + Math.abs(right.y - building.y);
      return (
        leftDistance - rightDistance ||
        Math.abs(left.y - building.y) - Math.abs(right.y - building.y) ||
        left.y - right.y ||
        left.x - right.x
      );
    });
    const destination = candidates.find((candidate) => {
      const relocated: LegacyHouseBuildingV3 = {
        ...building,
        x: candidate.x,
        y: candidate.y,
      };
      return (
        !tileIsInsideBuilding(CITY_GATE_TILE, relocated) &&
        !obstacles.some((other) => buildingsOverlap(relocated, other)) &&
        !world.roads.some((road) => tileIsInsideBuilding(road, relocated))
      );
    });
    if (!destination) {
      throw new Error("旧存档中占用城门的住宅没有可迁移空地");
    }
    migrated.push({ ...building, ...destination });
  }

  return migrated;
}

function migrateLegacyWorldToV3(
  legacyWorld: LegacyWorldSnapshotV2,
): LegacyWorldSnapshotV3 {
  return legacyWorldSnapshotV3Schema.parse({
    ...legacyWorld,
    buildings: migrateLegacyBuildings(legacyWorld),
    roads: legacyWorld.roads.map((road) => ({ ...road })),
    households: legacyWorld.households.map((household) => ({ ...household })),
  });
}

function migrateV3WorldToV4(
  world: LegacyWorldSnapshotV3,
): LegacyWorldSnapshotV4 {
  return legacyWorldSnapshotV4Schema.parse({
    map: { ...world.map },
    tick: world.tick,
    revision: world.revision,
    buildings: world.buildings.map((building) => ({
      ...building,
      footprint: { ...building.footprint },
    })),
    roads: world.roads.map((road) => ({ ...road })),
    households: world.households.map((household) => ({ ...household })),
  });
}

function migrateV4WorldToV5(
  world: LegacyWorldSnapshotV4,
): LegacyWorldSnapshotV5 {
  return legacyWorldSnapshotV5Schema.parse({
    map: { ...world.map },
    tick: world.tick,
    revision: world.revision,
    buildings: world.buildings.map((building) => ({
      ...building,
      footprint: { ...building.footprint },
    })),
    roads: world.roads.map((road) => ({ ...road })),
    households: world.households.map((household) => ({
      ...household,
      foodReserveTicks: HOUSEHOLD_FOOD_RESERVE_MAX,
    })),
  });
}

function migrateV5WorldToV6(world: LegacyWorldSnapshotV5): WorldSnapshot {
  return worldSnapshotSchema.parse({
    map: { ...world.map },
    tick: world.tick,
    revision: world.revision,
    buildings: world.buildings.map((building) =>
      building.typeId === "house"
        ? {
            ...building,
            footprint: { ...building.footprint },
            constructionStage: 4,
          }
        : { ...building, footprint: { ...building.footprint } },
    ),
    roads: world.roads.map((road) => ({ ...road })),
    households: world.households.map((household) => ({ ...household })),
    migrants: [],
  });
}

function migrateV6WorldToV7(world: WorldSnapshot): WorldSnapshot {
  return worldSnapshotSchema.parse({
    ...world,
    walls: [],
  });
}

function migrateV7WorldToV8(world: WorldSnapshot): WorldSnapshot {
  return worldSnapshotV8Schema.parse({
    ...world,
    walls: world.walls ?? [],
    terrain: world.terrain ?? { ...DEFAULT_TERRAIN_CONTRACT },
  });
}

export function upgradeSaveEnvelope(envelope: SaveEnvelope): WorldSnapshot {
  switch (envelope.saveFormatVersion) {
    case 9:
      return worldSnapshotV8Schema.parse(envelope.world);
    case 8:
      return worldSnapshotV8Schema.parse(envelope.world);
    case 7:
      return migrateV7WorldToV8(worldSnapshotSchema.parse(envelope.world));
    case 6:
      return migrateV7WorldToV8(migrateV6WorldToV7(envelope.world));
    case 5:
      return migrateV7WorldToV8(
        migrateV6WorldToV7(migrateV5WorldToV6(envelope.world)),
      );
    case 4:
      return migrateV7WorldToV8(
        migrateV6WorldToV7(
          migrateV5WorldToV6(migrateV4WorldToV5(envelope.world)),
        ),
      );
    case 3:
      return migrateV7WorldToV8(
        migrateV6WorldToV7(
          migrateV5WorldToV6(
            migrateV4WorldToV5(migrateV3WorldToV4(envelope.world)),
          ),
        ),
      );
    case 2:
      return migrateV7WorldToV8(
        migrateV6WorldToV7(
          migrateV5WorldToV6(
            migrateV4WorldToV5(
              migrateV3WorldToV4(migrateLegacyWorldToV3(envelope.world)),
            ),
          ),
        ),
      );
    case 1: {
      const legacyWorldV2: LegacyWorldSnapshotV2 = {
        ...envelope.world,
        roads: [],
        households: [],
      };
      return migrateV7WorldToV8(
        migrateV6WorldToV7(
          migrateV5WorldToV6(
            migrateV4WorldToV5(
              migrateV3WorldToV4(migrateLegacyWorldToV3(legacyWorldV2)),
            ),
          ),
        ),
      );
    }
  }
}

export function createSaveEnvelope(snapshot: WorldSnapshot): SaveEnvelopeV9 {
  return saveEnvelopeV9Schema.parse({
    saveFormatVersion: SAVE_FORMAT_VERSION,
    world: {
      ...snapshot,
      walls: snapshot.walls ?? [],
      terrain: snapshot.terrain ?? { ...DEFAULT_TERRAIN_CONTRACT },
    },
  });
}

export interface DecodedSaveEnvelope {
  sourceVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  snapshot: WorldSnapshot;
  envelope: SaveEnvelopeV9;
}

export function decodeSaveEnvelope(value: unknown): DecodedSaveEnvelope {
  const parsed = parseSaveEnvelope(value);
  const snapshot = upgradeSaveEnvelope(parsed);
  return {
    sourceVersion: parsed.saveFormatVersion,
    snapshot,
    envelope: createSaveEnvelope(snapshot),
  };
}

export function parseWorkerRequest(value: unknown): WorkerRequest {
  return workerRequestSchema.parse(value);
}
