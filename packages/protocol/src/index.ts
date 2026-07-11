import { z } from "zod";

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
export const MARKET_STOCK_CAPACITY = 4 as const;
export const FARM_PRODUCTION_INTERVAL = 3 as const;
export const FOOD_TRANSPORT_RANGE = 12 as const;
export const MARKET_RESTOCK_RANGE = 12 as const;
export const MARKET_SERVICE_RANGE = 8 as const;
export const HOUSEHOLD_FOOD_RESERVE_MAX = 3 as const;
export const CITY_GATE_TILE = { x: 0, y: 15 } as const;
export const SAVE_FORMAT_VERSION = 6 as const;

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

export interface AdvanceTimeCommand {
  seq: number;
  type: "advance-time";
  ticks: number;
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
  | AdvanceTimeCommand
  | DemolishCommand
  | SetLaborPolicyCommand
  | SetGranaryPolicyCommand
  | MakeOfferingCommand
  | SendGiftCommand
  | SetTaxRateCommand
  | HoldNewYearFestivalCommand;

export type BuildRejectionReason =
  | "occupied"
  | "out-of-bounds"
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

export type FarmFoodStock = 0 | 1 | 2 | 3;
export type GranaryFoodStock = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type MarketFoodStock = 0 | 1 | 2 | 3 | 4;
export type HouseholdFoodReserveTicks = 0 | 1 | 2 | 3;
export type FoodStocks = Record<CropType, number>;
export type FoodQuality = "none" | "bland" | "plain" | "appetizing" | "tasty";

export interface FarmBuildingView extends BuildingBase {
  typeId: "farm";
  rotation: 0;
  footprint: { width: 2; height: 2 };
  cropType: CropType;
  foodStock: FarmFoodStock;
}

export interface GranaryBuildingView extends BuildingBase {
  typeId: "granary";
  rotation: 0;
  footprint: { width: 2; height: 2 };
  foodStock: GranaryFoodStock;
  foodStocks: FoodStocks;
  acceptedCrops?: CropType[];
}

export interface MarketBuildingView extends BuildingBase {
  typeId: "market";
  rotation: 0;
  footprint: { width: 2; height: 2 };
  foodStock: MarketFoodStock;
  foodStocks: FoodStocks;
  clothingStock?: 0 | 1 | 2 | 3 | 4;
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
  foodQuality: FoodQuality;
  clothingReserveTicks?: HouseholdFoodReserveTicks;
  entertainmentReserveTicks?: HouseholdFoodReserveTicks;
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
  dwellTicks: 0 | 1;
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
  tick: number;
  revision: number;
  buildings: BuildingView[];
  roads: TileCoordinate[];
  households: HouseholdView[];
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

export type SaveEnvelope =
  | SaveEnvelopeV1
  | SaveEnvelopeV2
  | SaveEnvelopeV3
  | SaveEnvelopeV4
  | SaveEnvelopeV5
  | SaveEnvelopeV6;

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
      .max(MAP_SIZE * MAP_SIZE),
  })
  .strict();
const advanceTimeCommandSchema = z
  .object({
    seq: nonnegativeSafeIntegerSchema,
    type: z.literal("advance-time"),
    ticks: z.number().int().min(1).max(60),
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
  advanceTimeCommandSchema,
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
    foodStock: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(FARM_STOCK_CAPACITY),
    ]),
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
    foodStock: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
      z.literal(7),
      z.literal(8),
      z.literal(9),
      z.literal(GRANARY_STOCK_CAPACITY),
    ]),
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
    foodStock: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(MARKET_STOCK_CAPACITY),
    ]),
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
const buildingSchema = z.discriminatedUnion("typeId", [
  houseBuildingSchema,
  wellBuildingSchema,
  farmBuildingSchema,
  granaryBuildingSchema,
  marketBuildingSchema,
  hempFarmBuildingSchema,
  weaverBuildingSchema,
  weaponsmithBuildingSchema,
  infantryFortBuildingSchema,
  taxOfficeBuildingSchema,
  musicSchoolBuildingSchema,
  tradingPostBuildingSchema,
]);

const mapSchema = z
  .object({ width: z.literal(MAP_SIZE), height: z.literal(MAP_SIZE) })
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
      !("typeId" in building) ||
      (building.typeId !== "granary" && building.typeId !== "market") ||
      "foodStocks" in building
    ) {
      return building;
    }
    return {
      ...building,
      foodStocks: defaultFoodStocks(
        "foodStock" in building ? building.foodStock : 0,
      ),
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
            x: tileCoordinateSchema.shape.x,
            y: tileCoordinateSchema.shape.y,
            state: z.union([
              z.literal("commuting"),
              z.literal("working"),
              z.literal("returning"),
              z.literal("resting"),
              z.literal("strolling"),
              z.literal("waiting"),
            ]),
            dwellTicks: z.union([z.literal(0), z.literal(1)]),
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

function tileKey(tile: TileCoordinate): number {
  return tile.y * MAP_SIZE + tile.x;
}

function isInsideMap(tile: TileCoordinate): boolean {
  return tile.x >= 0 && tile.y >= 0 && tile.x < MAP_SIZE && tile.y < MAP_SIZE;
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

function waterRoadDistances(
  roads: TileCoordinate[],
  wells: FootprintBuilding[],
  serviceRange: number,
): Map<number, number> {
  const allRoadKeys = new Set(roads.map(tileKey));
  const tileByKey = new Map(roads.map((road) => [tileKey(road), road]));
  const distances = new Map<number, number>();
  const queue: number[] = [];
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
): void {
  const roadKeys = new Set<number>();
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
  }
}

function houseHasRoadService(
  house: FootprintBuilding,
  connected: Set<number>,
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
): void {
  validateBuildings(buildings, context);
  validateRoadLayer(roads, buildings, context);
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
    x: tileCoordinateSchema.shape.x,
    y: tileCoordinateSchema.shape.y,
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
    if (
      typeof household !== "object" ||
      household === null ||
      "foodQuality" in household
    ) {
      return household;
    }
    return {
      ...household,
      foodQuality:
        "foodReserveTicks" in household && household.foodReserveTicks === 0
          ? "none"
          : "bland",
    };
  });
}

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
    roads: z.array(tileCoordinateSchema),
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
          })
          .strict(),
      ),
    ),
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
    );
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

export const saveEnvelopeSchema = z.discriminatedUnion("saveFormatVersion", [
  saveEnvelopeV1Schema,
  saveEnvelopeV2Schema,
  saveEnvelopeV3Schema,
  saveEnvelopeV4Schema,
  saveEnvelopeV5Schema,
  saveEnvelopeV6Schema,
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

export function upgradeSaveEnvelope(envelope: SaveEnvelope): WorldSnapshot {
  switch (envelope.saveFormatVersion) {
    case 6:
      return worldSnapshotSchema.parse(envelope.world);
    case 5:
      return migrateV5WorldToV6(envelope.world);
    case 4:
      return migrateV5WorldToV6(migrateV4WorldToV5(envelope.world));
    case 3:
      return migrateV5WorldToV6(
        migrateV4WorldToV5(migrateV3WorldToV4(envelope.world)),
      );
    case 2:
      return migrateV5WorldToV6(
        migrateV4WorldToV5(
          migrateV3WorldToV4(migrateLegacyWorldToV3(envelope.world)),
        ),
      );
    case 1: {
      const legacyWorldV2: LegacyWorldSnapshotV2 = {
        ...envelope.world,
        roads: [],
        households: [],
      };
      return migrateV5WorldToV6(
        migrateV4WorldToV5(
          migrateV3WorldToV4(migrateLegacyWorldToV3(legacyWorldV2)),
        ),
      );
    }
  }
}

export function createSaveEnvelope(snapshot: WorldSnapshot): SaveEnvelopeV6 {
  return saveEnvelopeV6Schema.parse({
    saveFormatVersion: SAVE_FORMAT_VERSION,
    world: snapshot,
  });
}

export interface DecodedSaveEnvelope {
  sourceVersion: 1 | 2 | 3 | 4 | 5 | 6;
  snapshot: WorldSnapshot;
  envelope: SaveEnvelopeV6;
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
