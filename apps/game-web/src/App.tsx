import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { GameSaveStore, RevisionSaveQueue } from "@empire/persistence";
import type {
  CropType,
  GameCommand,
  LaborPolicyView,
  LaborSector,
  TaxRate,
  WageLevel,
  WorldSnapshot,
} from "@empire/protocol";
import {
  createCityRenderer,
  type BuildTool,
  type CityRenderer,
  type PlacementVisualStatus,
  type TileCoordinate,
} from "@empire/renderer";
import {
  evaluateDemolition,
  evaluateFarmPlacement,
  evaluateGranaryPlacement,
  evaluateHempFarmPlacement,
  evaluateInfantryFortPlacement,
  evaluateTaxOfficePlacement,
  evaluateTradingPostPlacement,
  evaluateHousePlacement,
  evaluateMarketPlacement,
  evaluateMusicSchoolPlacement,
  evaluateRoadPlacement,
  evaluateWellPlacement,
  evaluateWeaverPlacement,
  evaluateWeaponsmithPlacement,
  emptyFoodStocks,
  foodQualityForStocks,
  calculateLaborReport,
  DEFAULT_LABOR_POLICY,
  desirabilityAtSite,
  deployedSoldiers,
  elementAtTile,
  eraStateAtTick,
  fengShuiAtSite,
  nextCitySentiment,
  migrationAttractiveness,
} from "@empire/simulation";

import { SimulationWorkerClient } from "./worker-bridge";
import {
  CROP_LABELS,
  CROP_OPTIONS,
  FOOD_QUALITY_LABELS,
  calendarLabel,
} from "./crop-catalog";
import { constructionDiagnostic } from "./migration-diagnostics";
import { PopulationDetailPanel } from "./PopulationDetailPanel";
import { HouseListPanel } from "./HouseListPanel";
import { BuildingDetailPanel } from "./BuildingDetailPanel";

type GameStatus = "正在载入城市…" | "游戏已就绪" | "无法启动游戏";
type SaveStatus =
  "尚未保存" | "保存中" | "已保存" | "已恢复" | "保存失败" | "存档冲突";

const rejectionMessages = {
  occupied: "该位置已被占用",
  "out-of-bounds": "建筑不能超出地图边界",
  "invalid-path": "道路路径必须连续且不能重复",
  "nothing-to-demolish": "这里没有可拆除的对象",
  "not-found": "目标对象不存在",
  "insufficient-stock": "库存不足",
  "insufficient-funds": "国库不足",
  "requirements-not-met": "举办条件尚未满足",
  "counter-exhausted": "城市计数已达上限，不能继续操作",
} as const;

const constructionSuccessMessages = {
  house: "宅基地已划定，等待流民营造",
  road: "道路铺设完成",
  well: "水井建造完成",
  farm: "农场建造完成",
  granary: "粮仓建造完成",
  market: "市场建造完成",
  "hemp-farm": "麻田开垦完成",
  weaver: "织坊建造完成",
  weaponsmith: "兵器作坊建造完成",
  "infantry-fort": "步兵营建造完成",
  "tax-office": "税务署建造完成",
  "music-school": "音乐学校建造完成",
  "trading-post": "贸易站建造完成",
} satisfies Record<Exclude<BuildTool, null | "demolish">, string>;

const constructionSaveFailureMessages = {
  house: "宅基地已划定，但自动保存失败",
  road: "道路已铺设，但自动保存失败",
  well: "水井已建成，但自动保存失败",
  farm: "农场已建成，但自动保存失败",
  granary: "粮仓已建成，但自动保存失败",
  market: "市场已建成，但自动保存失败",
  "hemp-farm": "麻田已开垦，但自动保存失败",
  weaver: "织坊已建成，但自动保存失败",
  weaponsmith: "兵器作坊已建成，但自动保存失败",
  "infantry-fort": "步兵营已建成，但自动保存失败",
  "tax-office": "税务署已建成，但自动保存失败",
  "music-school": "音乐学校已建成，但自动保存失败",
  "trading-post": "贸易站已建成，但自动保存失败",
} satisfies Record<Exclude<BuildTool, null | "demolish">, string>;

const demolitionSuccessMessages = {
  road: "道路已拆除",
  house: "住宅已拆除",
  well: "水井已拆除",
  farm: "农场已拆除",
  granary: "粮仓已拆除",
  market: "市场已拆除",
  "hemp-farm": "麻田已拆除",
  weaver: "织坊已拆除",
  weaponsmith: "兵器作坊已拆除",
  "infantry-fort": "步兵营已拆除",
  "tax-office": "税务署已拆除",
  "music-school": "音乐学校已拆除",
  "trading-post": "贸易站已拆除",
} as const;

const toolInstructions = {
  house: "住宅营造：选择一块 2×2 空地",
  road: "道路营造：选择一个 1×1 空地",
  well: "水井营造：选择一个 1×1 空地",
  farm: "农场营造：选择一块 2×2 空地",
  granary: "粮仓营造：选择一块 2×2 空地",
  market: "市场营造：选择一块 2×2 空地",
  "hemp-farm": "麻田营造：选择一块 2×2 空地，九月收麻",
  weaver: "织坊营造：选择一块 2×2 空地",
  weaponsmith: "兵器作坊营造：选择一块 2×2 空地",
  "infantry-fort": "步兵营营造：连路城门后守军方可部署",
  "tax-office": "税务署营造：连接住宅道路后按月征税",
  "music-school": "音乐学校营造：须沿路连接市场演出场所",
  "trading-post": "贸易站营造：通商后沿路收货，每三个月迎接商队",
  demolish: "拆除：选择道路或建筑占地",
} satisfies Record<Exclude<BuildTool, null>, string>;

const capabilityLabels = {
  "food-variety": "五谷轮作",
  "hemp-textiles": "麻纺",
  "bronze-infantry": "青铜步兵",
  "paper-administration": "纸张政务",
  "schools-and-rites": "学校礼制",
  cavalry: "骑兵",
} as const;

const elementLabels = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水",
} as const;

const fengShuiStatusLabels = {
  harmonious: "相生",
  neutral: "平",
  conflicting: "相克",
} as const;

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CityRenderer | null>(null);
  const snapshotRef = useRef<WorldSnapshot | null>(null);
  const buildToolRef = useRef<BuildTool>(null);
  const selectedCropRef = useRef<CropType>("wheat");
  const sequenceRef = useRef(0);
  const keyboardBuildRef = useRef<((tile: TileCoordinate) => void) | null>(
    null,
  );
  const refreshPreviewRef = useRef<
    ((tile: TileCoordinate | null) => void) | null
  >(null);
  const keyboardTileRef = useRef<TileCoordinate>({ x: 16, y: 16 });
  const simulationSpeedRef = useRef<0 | 1 | 2 | 4>(1);
  const inspectTileRef = useRef<((tile: TileCoordinate) => void) | null>(null);
  const applyLaborPolicyRef = useRef<
    ((policy: LaborPolicyView) => void) | null
  >(null);
  const applyGranaryPolicyRef = useRef<
    ((granaryId: number, cropType: CropType, accept: boolean) => void) | null
  >(null);
  const makeOfferingRef = useRef<
    ((granaryId: number, cropType: CropType) => void) | null
  >(null);
  const sendGiftRef = useRef<
    ((granaryId: number, cropType: CropType) => void) | null
  >(null);
  const setTaxRateRef = useRef<((taxRate: TaxRate) => void) | null>(null);
  const holdFestivalRef = useRef<(() => void) | null>(null);

  const [gameStatus, setGameStatus] = useState<GameStatus>("正在载入城市…");
  const [rendererName, setRendererName] = useState("检测中");
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState("正在准备沙盘…");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("尚未保存");
  const [buildingCount, setBuildingCount] = useState(0);
  const [constructionCount, setConstructionCount] = useState(0);
  const [migrantCount, setMigrantCount] = useState(0);
  const [citizenActivity, setCitizenActivity] = useState("0 · 工0");
  const [wellCount, setWellCount] = useState(0);
  const [farmCount, setFarmCount] = useState(0);
  const [farmCropSummary, setFarmCropSummary] = useState("—");
  const [granaryCount, setGranaryCount] = useState(0);
  const [granaryFoodCount, setGranaryFoodCount] = useState(0);
  const [granaryPolicy, setGranaryPolicy] = useState<{
    id: number | null;
    accepted: CropType[];
  }>({ id: null, accepted: CROP_OPTIONS.map((option) => option.type) });
  const [shennongFavor, setShennongFavor] = useState(0);
  const [offeringTarget, setOfferingTarget] = useState<{
    granaryId: number;
    cropType: CropType;
  } | null>(null);
  const [diplomacyStatus, setDiplomacyStatus] = useState("关系 0 · 未通商");
  const [envoyCount, setEnvoyCount] = useState(0);
  const [taxOfficeCount, setTaxOfficeCount] = useState(0);
  const [treasury, setTreasury] = useState(500);
  const [taxRate, setTaxRate] = useState<TaxRate>("standard");
  const [taxRevenue, setTaxRevenue] = useState(0);
  const [taxableHouses, setTaxableHouses] = useState(0);
  const [citySentiment, setCitySentiment] = useState(50);
  const [sentimentReasons, setSentimentReasons] = useState("尚无居民");
  const [musicSchoolCount, setMusicSchoolCount] = useState(0);
  const [performerCount, setPerformerCount] = useState(0);
  const [entertainmentService, setEntertainmentService] = useState("—");
  const [tradingPostCount, setTradingPostCount] = useState(0);
  const [tradeStock, setTradeStock] = useState(0);
  const [tradeRevenue, setTradeRevenue] = useState(0);
  const [festivalAvailable, setFestivalAvailable] = useState(false);
  const [lastFestivalYear, setLastFestivalYear] = useState<number | null>(null);
  const [migrationAppeal, setMigrationAppeal] = useState("50 · 可迁");
  const [migrationDiagnostic, setMigrationDiagnostic] = useState("营造 —");
  const [marketCount, setMarketCount] = useState(0);
  const [marketFoodCount, setMarketFoodCount] = useState(0);
  const [hempFarmCount, setHempFarmCount] = useState(0);
  const [weaverCount, setWeaverCount] = useState(0);
  const [clothingCount, setClothingCount] = useState(0);
  const [clothingService, setClothingService] = useState("—");
  const [weaponsmithCount, setWeaponsmithCount] = useState(0);
  const [fortCount, setFortCount] = useState(0);
  const [soldierCount, setSoldierCount] = useState(0);
  const [deployedCount, setDeployedCount] = useState(0);
  const [marketFoodQuality, setMarketFoodQuality] = useState("无粮");
  const [householdFoodQuality, setHouseholdFoodQuality] = useState("—");
  const [foodSupplyStatus, setFoodSupplyStatus] = useState("供粮 —");
  const [roadCount, setRoadCount] = useState(0);
  const [populationCount, setPopulationCount] = useState(0);
  const [populationPanelOpen, setPopulationPanelOpen] = useState(false);
  const populationPanelOpenRef = useRef(false);
  const [populationPanelData, setPopulationPanelData] = useState<WorldSnapshot | null>(null);
  const [housePanelOpen, setHousePanelOpen] = useState(false);
  const housePanelOpenRef = useRef(false);
  const [housePanelData, setHousePanelData] = useState<WorldSnapshot | null>(null);
  const [housePanelFocusId, setHousePanelFocusId] = useState<number | null>(null);
  const [buildingPanelOpen, setBuildingPanelOpen] = useState(false);
  const buildingPanelOpenRef = useRef(false);
  const [buildingPanelData, setBuildingPanelData] = useState<{ snapshot: WorldSnapshot; buildingId: number } | null>(null);
  const [simulationTick, setSimulationTick] = useState(0);
  const [simulationSpeed, setSimulationSpeed] = useState<0 | 1 | 2 | 4>(1);
  const [eraName, setEraName] = useState("聚落奠基");
  const [nextTechnology, setNextTechnology] = useState("二年 · 纸张政务");
  const [laborPolicy, setLaborPolicy] = useState<LaborPolicyView>({
    ...DEFAULT_LABOR_POLICY,
    priorities: [...DEFAULT_LABOR_POLICY.priorities],
  });
  const [laborAssigned, setLaborAssigned] = useState(0);
  const [laborDemand, setLaborDemand] = useState(0);
  const [laborVacancies, setLaborVacancies] = useState(0);
  const [laborPayroll, setLaborPayroll] = useState(0);
  const [laborSectors, setLaborSectors] = useState({
    agriculture: "0/0",
    commerce: "0/0",
    services: "0/0",
  });
  const [cameraHeading, setCameraHeading] = useState(0);
  const [hoveredTile, setHoveredTile] = useState<TileCoordinate | null>(null);
  const [placementStatus, setPlacementStatus] =
    useState<PlacementVisualStatus>("hidden");
  const [siteElement, setSiteElement] = useState("地格 —");
  const [siteFengShui, setSiteFengShui] = useState("风水 —");
  const [siteDesirability, setSiteDesirability] = useState("宜居 —");
  const [buildTool, setBuildTool] = useState<BuildTool>(null);
  const [selectedCrop, setSelectedCrop] = useState<CropType>("wheat");
  const [keyboardTile, setKeyboardTile] = useState<TileCoordinate>({
    x: 16,
    y: 16,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: CityRenderer | undefined;
    let cancelled = false;
    let tickTimer: number | undefined;
    let tickPending = false;
    const saveStore = new GameSaveStore();
    const saveQueue = new RevisionSaveQueue(saveStore);
    const workerClient = new SimulationWorkerClient();

    const applySnapshot = (snapshot: WorldSnapshot) => {
      snapshotRef.current = snapshot;
      rendererRef.current?.syncWorld(snapshot);
      setBuildingCount(
        snapshot.buildings.filter((building) => building.typeId === "house")
          .length,
      );
      setConstructionCount(
        snapshot.buildings.filter(
          (building) =>
            building.typeId === "house" && building.constructionStage < 4,
        ).length,
      );
      setMigrantCount(snapshot.migrants.length);
      setMigrationDiagnostic(constructionDiagnostic(snapshot));
      const citizens = snapshot.citizens ?? [];
      setCitizenActivity(
        `${citizens.length} · 工${citizens.filter((citizen) => citizen.state === "working").length}`,
      );
      setWellCount(
        snapshot.buildings.filter((building) => building.typeId === "well")
          .length,
      );
      setFarmCount(
        snapshot.buildings.filter((building) => building.typeId === "farm")
          .length,
      );
      const cropCounts = new Map<CropType, number>();
      for (const building of snapshot.buildings) {
        if (building.typeId !== "farm") continue;
        cropCounts.set(
          building.cropType,
          (cropCounts.get(building.cropType) ?? 0) + 1,
        );
      }
      setFarmCropSummary(
        CROP_OPTIONS.flatMap((option) => {
          const count = cropCounts.get(option.type) ?? 0;
          return count > 0 ? [`${option.label}${count}`] : [];
        }).join(" · ") || "—",
      );
      setGranaryCount(
        snapshot.buildings.filter((building) => building.typeId === "granary")
          .length,
      );
      setGranaryFoodCount(
        snapshot.buildings.reduce(
          (total, building) =>
            building.typeId === "granary" ? total + building.foodStock : total,
          0,
        ),
      );
      const firstGranary = snapshot.buildings.find(
        (building) => building.typeId === "granary",
      );
      setGranaryPolicy(
        firstGranary?.typeId === "granary"
          ? {
              id: firstGranary.id,
              accepted: [
                ...(firstGranary.acceptedCrops ??
                  CROP_OPTIONS.map((option) => option.type)),
              ],
            }
          : {
              id: null,
              accepted: CROP_OPTIONS.map((option) => option.type),
            },
      );
      setShennongFavor(snapshot.shennongFavor ?? 0);
      const offeringGranary = snapshot.buildings.find(
        (building) =>
          building.typeId === "granary" &&
          CROP_OPTIONS.some((option) => building.foodStocks[option.type] > 0),
      );
      const offeringCrop =
        offeringGranary?.typeId === "granary"
          ? CROP_OPTIONS.find(
              (option) => offeringGranary.foodStocks[option.type] > 0,
            )?.type
          : undefined;
      setOfferingTarget(
        offeringGranary?.typeId === "granary" && offeringCrop
          ? { granaryId: offeringGranary.id, cropType: offeringCrop }
          : null,
      );
      const diplomacy = snapshot.diplomacy;
      setDiplomacyStatus(
        `关系 ${diplomacy?.relation ?? 0} · ${diplomacy?.tradeOpen ? "已通商" : "未通商"}`,
      );
      setEnvoyCount(diplomacy?.envoys.length ?? 0);
      setTaxOfficeCount(
        snapshot.buildings.filter(
          (building) => building.typeId === "tax-office",
        ).length,
      );
      const economy = snapshot.economy ?? {
        treasury: 500,
        taxRate: "standard" as const,
        lastTaxRevenue: 0,
        lastPayroll: 0,
        taxableHouses: 0,
        sentiment: 50,
        lastTradeRevenue: 0,
      };
      setTreasury(economy.treasury);
      setTaxRate(economy.taxRate);
      setTaxRevenue(economy.lastTaxRevenue);
      setTradeRevenue(economy.lastTradeRevenue);
      setTaxableHouses(economy.taxableHouses);
      setCitySentiment(economy.sentiment);
      const previewSentiment = nextCitySentiment(economy.sentiment, {
        taxRate: economy.taxRate,
        wageLevel: snapshot.laborPolicy?.wageLevel ?? "standard",
        households: snapshot.households.length,
        hungryHouseholds: snapshot.households.filter(
          (household) => household.foodReserveTicks === 0,
        ).length,
      });
      setSentimentReasons(previewSentiment.reasons.join("、"));
      const appeal = migrationAttractiveness(
        economy.sentiment,
        snapshot.laborPolicy?.wageLevel ?? "standard",
      );
      setMigrationAppeal(
        `${appeal.score} · ${appeal.canMigrate ? "可迁" : "停迁"}`,
      );
      setMusicSchoolCount(
        snapshot.buildings.filter(
          (building) => building.typeId === "music-school",
        ).length,
      );
      setPerformerCount(snapshot.performers?.length ?? 0);
      const entertained = snapshot.households.filter(
        (household) => (household.entertainmentReserveTicks ?? 0) > 0,
      ).length;
      setEntertainmentService(
        snapshot.households.length === 0
          ? "—"
          : `${entertained}/${snapshot.households.length}`,
      );
      setTradingPostCount(
        snapshot.buildings.filter(
          (building) => building.typeId === "trading-post",
        ).length,
      );
      setTradeStock(
        snapshot.buildings.reduce(
          (total, building) =>
            building.typeId === "trading-post"
              ? total + building.clothingStock
              : total,
          0,
        ),
      );
      const currentYear = Math.floor(snapshot.tick / 12) + 1;
      const currentMonth = (snapshot.tick % 12) + 1;
      setLastFestivalYear(economy.lastFestivalYear ?? null);
      setFestivalAvailable(
        currentMonth === 2 &&
          economy.lastFestivalYear !== currentYear &&
          economy.treasury >= 20 &&
          snapshot.buildings.some(
            (building) => building.typeId === "music-school",
          ) &&
          snapshot.buildings.some(
            (building) =>
              building.typeId === "granary" && building.foodStock > 0,
          ),
      );
      setMarketCount(
        snapshot.buildings.filter((building) => building.typeId === "market")
          .length,
      );
      setHempFarmCount(
        snapshot.buildings.filter((building) => building.typeId === "hemp-farm")
          .length,
      );
      setWeaverCount(
        snapshot.buildings.filter((building) => building.typeId === "weaver")
          .length,
      );
      setClothingCount(
        snapshot.buildings.reduce(
          (total, building) =>
            building.typeId === "market"
              ? total + (building.clothingStock ?? 0)
              : total,
          0,
        ),
      );
      const clothedHouseholds = snapshot.households.filter(
        (household) => (household.clothingReserveTicks ?? 0) > 0,
      ).length;
      setClothingService(
        snapshot.households.length === 0
          ? "—"
          : `${clothedHouseholds}/${snapshot.households.length}`,
      );
      setWeaponsmithCount(
        snapshot.buildings.filter(
          (building) => building.typeId === "weaponsmith",
        ).length,
      );
      setFortCount(
        snapshot.buildings.filter(
          (building) => building.typeId === "infantry-fort",
        ).length,
      );
      setSoldierCount(
        snapshot.buildings.reduce(
          (total, building) =>
            building.typeId === "infantry-fort"
              ? total + building.soldiers
              : total,
          0,
        ),
      );
      setDeployedCount(deployedSoldiers(snapshot));
      setMarketFoodCount(
        snapshot.buildings.reduce(
          (total, building) =>
            building.typeId === "market" ? total + building.foodStock : total,
          0,
        ),
      );
      const marketStocks = emptyFoodStocks();
      for (const building of snapshot.buildings) {
        if (building.typeId !== "market") continue;
        for (const crop of CROP_OPTIONS) {
          marketStocks[crop.type] += building.foodStocks[crop.type];
        }
      }
      setMarketFoodQuality(
        FOOD_QUALITY_LABELS[foodQualityForStocks(marketStocks)],
      );
      const householdQualities = [
        ...new Set(
          snapshot.households.map(
            (household) => FOOD_QUALITY_LABELS[household.foodQuality],
          ),
        ),
      ];
      setHouseholdFoodQuality(householdQualities.join(" · ") || "—");
      const hungryHouseholds = snapshot.households.filter(
        (household) => household.foodReserveTicks === 0,
      ).length;
      setFoodSupplyStatus(
        snapshot.households.length === 0
          ? "供粮 —"
          : hungryHouseholds > 0
            ? `缺粮 ${hungryHouseholds} 户`
            : `供粮 ${snapshot.households.length}/${snapshot.households.length}`,
      );
      setRoadCount(snapshot.roads.length);
      setPopulationCount(
        snapshot.households.reduce(
          (total, household) => total + household.residents,
          0,
        ),
      );
      if (populationPanelOpenRef.current) {
        setPopulationPanelData(snapshot);
      }
      if (housePanelOpenRef.current) {
        setHousePanelData(snapshot);
      }
      setSimulationTick(snapshot.tick);
      const era = eraStateAtTick(snapshot.tick);
      setEraName(era.eraName);
      setNextTechnology(
        era.nextUnlock
          ? `${era.nextUnlock.year}年 · ${capabilityLabels[era.nextUnlock.capability]}`
          : "已达当前上限",
      );
      const nextLaborPolicy = snapshot.laborPolicy ?? DEFAULT_LABOR_POLICY;
      setLaborPolicy({
        ...nextLaborPolicy,
        priorities: [...nextLaborPolicy.priorities],
      });
      const labor = calculateLaborReport(snapshot, nextLaborPolicy);
      setLaborAssigned(
        Object.values(labor.assigned).reduce(
          (total, count) => total + count,
          0,
        ),
      );
      setLaborDemand(
        Object.values(labor.demand).reduce((total, count) => total + count, 0),
      );
      setLaborVacancies(
        Object.values(labor.vacancies).reduce(
          (total, count) => total + count,
          0,
        ),
      );
      setLaborPayroll(labor.payroll);
      setLaborSectors({
        agriculture: `${labor.assigned.agriculture}/${labor.demand.agriculture}`,
        commerce: `${labor.assigned.commerce}/${labor.demand.commerce}`,
        services: `${labor.assigned.services}/${labor.demand.services}`,
      });
    };

    const persistSnapshot = async (
      snapshot: WorldSnapshot,
      failureMessage?: string,
    ) => {
      const scheduledRevision = snapshot.revision;
      setSaveStatus("保存中");
      try {
        const result = await saveQueue.enqueue(snapshot);
        if (
          !cancelled &&
          scheduledRevision === saveQueue.latestScheduledRevision
        ) {
          if (result.status === "conflict") {
            setSaveStatus("存档冲突");
            setFeedback("另一个页面已修改城市，请刷新后继续");
          } else {
            setSaveStatus("已保存");
          }
        }
      } catch {
        if (
          !cancelled &&
          scheduledRevision === saveQueue.latestScheduledRevision
        ) {
          setSaveStatus("保存失败");
          if (failureMessage) setFeedback(failureMessage);
        }
      }
    };

    const refreshPreview = (tile: TileCoordinate | null) => {
      setHoveredTile(tile);
      const snapshot = snapshotRef.current;
      const tool = buildToolRef.current;
      if (tile) {
        const element = elementAtTile(tile.x, tile.y);
        setSiteElement(`地格 ${elementLabels[element]}`);
      } else {
        setSiteElement("地格 —");
      }
      if (tile && snapshot) {
        const desirability = desirabilityAtSite(
          snapshot.buildings,
          tile.x,
          tile.y,
        );
        const detail = desirability.reasons.join("、") || "周边无影响";
        setSiteDesirability(
          `宜居 ${desirability.score >= 0 ? "+" : ""}${desirability.score} · ${detail}`,
        );
      } else {
        setSiteDesirability("宜居 —");
      }
      if (tool && tool !== "road" && tool !== "demolish" && tile) {
        const assessment = fengShuiAtSite(tool, tile.x, tile.y);
        setSiteFengShui(
          `风水 ${fengShuiStatusLabels[assessment.status]} · ${assessment.reason}`,
        );
      } else {
        setSiteFengShui("风水 —");
      }
      if (!tool || !tile || !snapshot) {
        setPlacementStatus("hidden");
        rendererRef.current?.setPlacementPreview(null, "hidden");
        return;
      }
      let status: PlacementVisualStatus;
      switch (tool) {
        case "house":
          status = evaluateHousePlacement(snapshot, tile.x, tile.y);
          break;
        case "road":
          status = evaluateRoadPlacement(snapshot, tile.x, tile.y);
          break;
        case "well":
          status = evaluateWellPlacement(snapshot, tile.x, tile.y);
          break;
        case "farm":
          status = evaluateFarmPlacement(snapshot, tile.x, tile.y);
          break;
        case "granary":
          status = evaluateGranaryPlacement(snapshot, tile.x, tile.y);
          break;
        case "market":
          status = evaluateMarketPlacement(snapshot, tile.x, tile.y);
          break;
        case "hemp-farm":
          status = evaluateHempFarmPlacement(snapshot, tile.x, tile.y);
          break;
        case "weaver":
          status = evaluateWeaverPlacement(snapshot, tile.x, tile.y);
          break;
        case "weaponsmith":
          status = evaluateWeaponsmithPlacement(snapshot, tile.x, tile.y);
          break;
        case "infantry-fort":
          status = evaluateInfantryFortPlacement(snapshot, tile.x, tile.y);
          break;
        case "tax-office":
          status = evaluateTaxOfficePlacement(snapshot, tile.x, tile.y);
          break;
        case "music-school":
          status = evaluateMusicSchoolPlacement(snapshot, tile.x, tile.y);
          break;
        case "trading-post":
          status = evaluateTradingPostPlacement(snapshot, tile.x, tile.y);
          break;
        case "demolish":
          status = evaluateDemolition(snapshot, tile.x, tile.y);
          break;
      }
      setPlacementStatus(status);
      rendererRef.current?.setPlacementPreview(tile, status);
    };

    const buildAt = async (tile: TileCoordinate) => {
      const tool = buildToolRef.current;
      if (!tool || !snapshotRef.current || cancelled) return;
      const currentSnapshot = snapshotRef.current;
      const demolitionBuilding =
        tool === "demolish"
          ? currentSnapshot.buildings.find(
              (building) =>
                tile.x >= building.x &&
                tile.x < building.x + building.footprint.width &&
                tile.y >= building.y &&
                tile.y < building.y + building.footprint.height,
            )
          : undefined;
      const demolitionTarget =
        tool === "demolish"
          ? currentSnapshot.roads.some(
              (road) => road.x === tile.x && road.y === tile.y,
            )
            ? "road"
            : (demolitionBuilding?.typeId ?? null)
          : null;
      const seq = ++sequenceRef.current;
      const farmCrop = selectedCropRef.current;
      let command: GameCommand;
      switch (tool) {
        case "house":
        case "well":
        case "farm":
        case "granary":
        case "market":
        case "hemp-farm":
        case "weaver":
        case "weaponsmith":
        case "infantry-fort":
        case "tax-office":
        case "music-school":
        case "trading-post":
          command = {
            seq,
            type: "build",
            buildingTypeId: tool,
            x: tile.x,
            y: tile.y,
            rotation: 0,
            ...(tool === "farm" ? { cropType: farmCrop } : {}),
          };
          break;
        case "road":
          command = {
            seq,
            type: "build-road-path",
            tiles: [{ x: tile.x, y: tile.y }],
          };
          break;
        case "demolish":
          command = {
            seq,
            type: "demolish",
            x: tile.x,
            y: tile.y,
          };
          break;
      }
      try {
        const response = await workerClient.command(command);
        if (cancelled) return;
        applySnapshot(response.snapshot);

        if (!response.result.accepted) {
          setFeedback(rejectionMessages[response.result.reasonCode]);
          refreshPreview(tile);
          return;
        }

        const successMessage =
          tool === "demolish"
            ? demolitionTarget
              ? demolitionSuccessMessages[demolitionTarget]
              : "拆除完成"
            : constructionSuccessMessages[tool];
        setFeedback(successMessage);
        refreshPreview(tile);
        await persistSnapshot(
          response.snapshot,
          tool === "demolish"
            ? "拆除已生效，但自动保存失败"
            : constructionSaveFailureMessages[tool],
        );
      } catch (error) {
        if (!cancelled) {
          setFeedback(
            error instanceof Error ? error.message : "建造命令执行失败",
          );
        }
      }
    };

    const advanceOneTick = async () => {
      if (tickPending || cancelled || !snapshotRef.current) return;
      const ticks = simulationSpeedRef.current;
      if (ticks === 0) return;
      tickPending = true;
      const previousRevision = snapshotRef.current.revision;
      try {
        const response = await workerClient.command({
          seq: ++sequenceRef.current,
          type: "advance-time",
          ticks,
        });
        if (cancelled) return;
        applySnapshot(response.snapshot);
        if (
          response.result.accepted &&
          response.snapshot.revision > previousRevision
        ) {
          await persistSnapshot(
            response.snapshot,
            "模拟状态变化已生效，但自动保存失败",
          );
        }
      } catch (error) {
        if (!cancelled) {
          setFeedback(
            error instanceof Error ? error.message : "模拟时间推进失败",
          );
        }
      } finally {
        tickPending = false;
      }
    };

    const applyLaborPolicy = async (policy: LaborPolicyView) => {
      if (cancelled || !snapshotRef.current) return;
      try {
        const response = await workerClient.command({
          seq: ++sequenceRef.current,
          type: "set-labor-policy",
          wageLevel: policy.wageLevel,
          priorities: [...policy.priorities],
        });
        if (cancelled) return;
        applySnapshot(response.snapshot);
        if (!response.result.accepted) {
          setFeedback("劳动力政策调整失败");
          return;
        }
        setFeedback("劳动力政策已生效");
        await persistSnapshot(response.snapshot, "政策已生效，但自动保存失败");
      } catch (error) {
        if (!cancelled) {
          setFeedback(error instanceof Error ? error.message : "政策调整失败");
        }
      }
    };

    const applyGranaryPolicy = async (
      granaryId: number,
      cropType: CropType,
      accept: boolean,
    ) => {
      if (cancelled || !snapshotRef.current) return;
      try {
        const response = await workerClient.command({
          seq: ++sequenceRef.current,
          type: "set-granary-policy",
          granaryId,
          cropType,
          accept,
        });
        if (cancelled) return;
        applySnapshot(response.snapshot);
        if (!response.result.accepted) {
          setFeedback(rejectionMessages[response.result.reasonCode]);
          return;
        }
        setFeedback(
          `${CROP_LABELS[cropType]}${accept ? "接收" : "拒收"}策略已生效`,
        );
        await persistSnapshot(
          response.snapshot,
          "粮仓策略已生效，但自动保存失败",
        );
      } catch (error) {
        if (!cancelled) {
          setFeedback(
            error instanceof Error ? error.message : "粮仓策略调整失败",
          );
        }
      }
    };

    const makeOffering = async (granaryId: number, cropType: CropType) => {
      if (cancelled || !snapshotRef.current) return;
      try {
        const response = await workerClient.command({
          seq: ++sequenceRef.current,
          type: "make-offering",
          granaryId,
          cropType,
        });
        if (cancelled) return;
        applySnapshot(response.snapshot);
        if (!response.result.accepted) {
          setFeedback(rejectionMessages[response.result.reasonCode]);
          return;
        }
        setFeedback(`已向神农供奉一份${CROP_LABELS[cropType]}`);
        await persistSnapshot(response.snapshot, "供奉已生效，但自动保存失败");
      } catch (error) {
        if (!cancelled) {
          setFeedback(error instanceof Error ? error.message : "供奉失败");
        }
      }
    };

    const sendGift = async (granaryId: number, cropType: CropType) => {
      if (cancelled || !snapshotRef.current) return;
      try {
        const response = await workerClient.command({
          seq: ++sequenceRef.current,
          type: "send-gift",
          granaryId,
          cropType,
        });
        if (cancelled) return;
        applySnapshot(response.snapshot);
        if (!response.result.accepted) {
          setFeedback(rejectionMessages[response.result.reasonCode]);
          return;
        }
        setFeedback(`已派使者携${CROP_LABELS[cropType]}出城，三个月后抵达`);
        await persistSnapshot(response.snapshot, "使者已出发，但自动保存失败");
      } catch (error) {
        if (!cancelled) {
          setFeedback(
            error instanceof Error ? error.message : "赠礼使者派遣失败",
          );
        }
      }
    };

    const applyTaxRate = async (taxRate: TaxRate) => {
      if (cancelled || !snapshotRef.current) return;
      try {
        const response = await workerClient.command({
          seq: ++sequenceRef.current,
          type: "set-tax-rate",
          taxRate,
        });
        if (cancelled) return;
        applySnapshot(response.snapshot);
        if (!response.result.accepted) {
          setFeedback("税率调整失败");
          return;
        }
        setFeedback("税率已生效；高税率将降低后续民心");
        await persistSnapshot(response.snapshot, "税率已生效，但自动保存失败");
      } catch (error) {
        if (!cancelled) {
          setFeedback(error instanceof Error ? error.message : "税率调整失败");
        }
      }
    };

    const holdNewYearFestival = async () => {
      if (cancelled || !snapshotRef.current) return;
      try {
        const response = await workerClient.command({
          seq: ++sequenceRef.current,
          type: "hold-new-year-festival",
        });
        if (cancelled) return;
        applySnapshot(response.snapshot);
        if (!response.result.accepted) {
          setFeedback(rejectionMessages[response.result.reasonCode]);
          return;
        }
        setFeedback("新年祭已举办：耗粮 1、国库 20、民心 +10");
        await persistSnapshot(
          response.snapshot,
          "新年祭已生效，但自动保存失败",
        );
      } catch (error) {
        if (!cancelled) {
          setFeedback(
            error instanceof Error ? error.message : "新年祭举办失败",
          );
        }
      }
    };

    refreshPreviewRef.current = refreshPreview;
    keyboardBuildRef.current = (tile) => void buildAt(tile);
    applyLaborPolicyRef.current = (policy) => void applyLaborPolicy(policy);
    applyGranaryPolicyRef.current = (granaryId, cropType, accept) =>
      void applyGranaryPolicy(granaryId, cropType, accept);
    makeOfferingRef.current = (granaryId, cropType) =>
      void makeOffering(granaryId, cropType);
    sendGiftRef.current = (granaryId, cropType) =>
      void sendGift(granaryId, cropType);
    setTaxRateRef.current = (nextTaxRate) => void applyTaxRate(nextTaxRate);
    holdFestivalRef.current = () => void holdNewYearFestival();

    void (async () => {
      try {
        const loadResult = await saveStore.load();
        if (cancelled) return;
        let restoredSnapshot: WorldSnapshot | undefined;
        if (loadResult.status === "loaded") {
          restoredSnapshot = loadResult.snapshot;
          setSaveStatus("已恢复");
        } else if (loadResult.status === "recovered-from-corrupt-save") {
          setFeedback("旧存档无法读取，已为你创建新游戏");
        }

        renderer = await createCityRenderer(canvas, {
          onHoverTile: refreshPreview,
          onGroundClick: (tile) => void buildAt(tile),
          onInspectTile: (tile) => inspectTileRef.current?.(tile),
          onCameraHeadingChange: setCameraHeading,
        });
        if (cancelled) {
          renderer.dispose();
          return;
        }
        rendererRef.current = renderer;
        renderer.setBuildTool(buildToolRef.current);
        const ready = await workerClient.initialize(restoredSnapshot);
        if (cancelled) return;
        applySnapshot(ready.snapshot);
        setRendererName(renderer.backend);
        setGameStatus("游戏已就绪");
        if (loadResult.status === "empty") {
          setFeedback("选择建造项目，开始营造城市");
        } else if (loadResult.status === "loaded") {
          setFeedback("已恢复上次营造进度");
        }
        tickTimer = window.setInterval(() => void advanceOneTick(), 1_000);
      } catch (error: unknown) {
        if (cancelled) return;
        setGameStatus("无法启动游戏");
        setErrorMessage(
          error instanceof Error ? error.message : "未知启动错误",
        );
        setFeedback("游戏启动失败，请检查浏览器图形支持");
      }
    })();

    return () => {
      cancelled = true;
      if (tickTimer !== undefined) window.clearInterval(tickTimer);
      rendererRef.current = null;
      snapshotRef.current = null;
      refreshPreviewRef.current = null;
      keyboardBuildRef.current = null;
      applyLaborPolicyRef.current = null;
      applyGranaryPolicyRef.current = null;
      makeOfferingRef.current = null;
      sendGiftRef.current = null;
      setTaxRateRef.current = null;
      holdFestivalRef.current = null;
      renderer?.dispose();
      workerClient.dispose();
      void saveQueue.flush().finally(() => saveStore.close());
    };
  }, []);

  const toggleBuildTool = (tool: Exclude<BuildTool, null>) => {
    const nextTool = buildToolRef.current === tool ? null : tool;
    buildToolRef.current = nextTool;
    setBuildTool(nextTool);
    rendererRef.current?.setBuildTool(nextTool);
    if (nextTool) {
      setFeedback(
        nextTool === "farm"
          ? `${CROP_LABELS[selectedCropRef.current]}农场营造：选择一块 2×2 空地`
          : toolInstructions[nextTool],
      );
    } else {
      setFeedback("已退出营造模式");
      rendererRef.current?.setPlacementPreview(null, "hidden");
      setPlacementStatus("hidden");
    }
  };

  const togglePopulationPanel = () => {
    const nextOpen = !populationPanelOpenRef.current;
    populationPanelOpenRef.current = nextOpen;
    setPopulationPanelOpen(nextOpen);
    if (nextOpen) {
      const snapshot = snapshotRef.current;
      if (snapshot) setPopulationPanelData(snapshot);
    }
  };

  const toggleHousePanel = (focusHouseId?: number | null) => {
    const nextOpen = focusHouseId !== undefined || !housePanelOpenRef.current;
    housePanelOpenRef.current = nextOpen;
    setHousePanelOpen(nextOpen);
    if (nextOpen) {
      setHousePanelFocusId(focusHouseId ?? null);
      const snapshot = snapshotRef.current;
      if (snapshot) setHousePanelData(snapshot);
    }
  };

  const handleInspectTile = (tile: TileCoordinate) => {
    const snapshot = snapshotRef.current;
    if (!snapshot) return;
    const building = snapshot.buildings.find(
      (b) =>
        tile.x >= b.x &&
        tile.x < b.x + b.footprint.width &&
        tile.y >= b.y &&
        tile.y < b.y + b.footprint.height,
    );
    if (!building) return;

    if (building.typeId === "house") {
      // Close population panel, open house detail
      populationPanelOpenRef.current = false;
      setPopulationPanelOpen(false);
      toggleHousePanel(building.id);
    } else {
      // Open generic building panel
      populationPanelOpenRef.current = false;
      setPopulationPanelOpen(false);
      housePanelOpenRef.current = false;
      setHousePanelOpen(false);
      buildingPanelOpenRef.current = true;
      setBuildingPanelOpen(true);
      setBuildingPanelData({ snapshot, buildingId: building.id });
    }
  };

  inspectTileRef.current = handleInspectTile;

  const closeBuildingPanel = () => {
    buildingPanelOpenRef.current = false;
    setBuildingPanelOpen(false);
    setBuildingPanelData(null);
  };

  const selectCrop = (cropType: CropType) => {
    selectedCropRef.current = cropType;
    setSelectedCrop(cropType);
    if (buildToolRef.current === "farm") {
      setFeedback(`${CROP_LABELS[cropType]}农场营造：选择一块 2×2 空地`);
    }
  };

  const updateWage = (wageLevel: WageLevel) => {
    applyLaborPolicyRef.current?.({ ...laborPolicy, wageLevel });
  };

  const prioritizeSector = (sector: LaborSector) => {
    const priorities = [
      sector,
      ...laborPolicy.priorities.filter((candidate) => candidate !== sector),
    ] as LaborPolicyView["priorities"];
    applyLaborPolicyRef.current?.({ ...laborPolicy, priorities });
  };

  const toggleGranaryCrop = (cropType: CropType) => {
    if (granaryPolicy.id === null) return;
    applyGranaryPolicyRef.current?.(
      granaryPolicy.id,
      cropType,
      !granaryPolicy.accepted.includes(cropType),
    );
  };

  const offerToShennong = () => {
    if (!offeringTarget) return;
    makeOfferingRef.current?.(
      offeringTarget.granaryId,
      offeringTarget.cropType,
    );
  };

  const sendDiplomaticGift = () => {
    if (!offeringTarget) return;
    sendGiftRef.current?.(offeringTarget.granaryId, offeringTarget.cropType);
  };

  const updateTaxRate = (nextTaxRate: TaxRate) => {
    setTaxRateRef.current?.(nextTaxRate);
  };

  const updateSimulationSpeed = (speed: 0 | 1 | 2 | 4) => {
    simulationSpeedRef.current = speed;
    setSimulationSpeed(speed);
    setFeedback(speed === 0 ? "模拟已暂停" : `模拟速度已设为 ${speed}×`);
  };

  const holdFestival = () => holdFestivalRef.current?.();

  const handleCanvasKeyDown = (
    event: ReactKeyboardEvent<HTMLCanvasElement>,
  ) => {
    const directions: Partial<Record<string, TileCoordinate>> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const direction = directions[event.key];
    if (direction) {
      event.preventDefault();
      event.stopPropagation();
      const nextTile = {
        x: Math.min(31, Math.max(0, keyboardTileRef.current.x + direction.x)),
        y: Math.min(31, Math.max(0, keyboardTileRef.current.y + direction.y)),
      };
      keyboardTileRef.current = nextTile;
      setKeyboardTile(nextTile);
      refreshPreviewRef.current?.(nextTile);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && buildToolRef.current) {
      event.preventDefault();
      event.stopPropagation();
      keyboardBuildRef.current?.(keyboardTileRef.current);
    }
  };

  return (
    <main className="game-shell">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        data-testid="game-canvas"
        aria-label="32×32 城市沙盘"
        aria-describedby="canvas-help"
        tabIndex={0}
        onFocus={() => refreshPreviewRef.current?.(keyboardTileRef.current)}
        onKeyDown={handleCanvasKeyDown}
      />
      <p id="canvas-help" className="sr-only">
        使用方向键选择地格，回车或空格确认当前建造工具，滚动平移视角。
      </p>
      <span
        className="sr-only"
        data-testid="keyboard-tile"
        aria-live="polite"
        aria-atomic="true"
      >
        键盘选中地格 {keyboardTile.x},{keyboardTile.y}
      </span>

      <header className="top-bar">
        <div>
          <p className="eyebrow">古城营造司 · 民生簿</p>
          <h1>河洛原</h1>
        </div>
        <dl className="hud" aria-label="运行状态">
          <div>
            <dt>状态</dt>
            <dd data-testid="game-status">{gameStatus}</dd>
          </div>
          <div>
            <dt>渲染</dt>
            <dd data-testid="renderer-name">{rendererName}</dd>
          </div>
          <div
            className={`stat-clickable${housePanelOpen ? " active" : ""}`}
            onClick={() => toggleHousePanel()}
            role="button"
            tabIndex={0}
            aria-expanded={housePanelOpen}
            aria-label="查看住宅列表"
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleHousePanel();
              }
            }}
          >
            <dt>住宅</dt>
            <dd data-testid="building-count">{buildingCount}</dd>
          </div>
          <div>
            <dt>流民</dt>
            <dd data-testid="migrant-count">{migrantCount}</dd>
          </div>
          <div>
            <dt>人流</dt>
            <dd data-testid="citizen-activity">{citizenActivity}</dd>
          </div>
          <div>
            <dt>水井</dt>
            <dd data-testid="well-count">{wellCount}</dd>
          </div>
          <div>
            <dt>农场</dt>
            <dd data-testid="farm-count">{farmCount}</dd>
          </div>
          <div>
            <dt>种植</dt>
            <dd data-testid="farm-crop-summary">{farmCropSummary}</dd>
          </div>
          <div>
            <dt>粮仓</dt>
            <dd data-testid="granary-count">{granaryCount}</dd>
          </div>
          <div>
            <dt>市场</dt>
            <dd data-testid="market-count">{marketCount}</dd>
          </div>
          <div>
            <dt>仓粮</dt>
            <dd data-testid="granary-food-count">{granaryFoodCount}</dd>
          </div>
          <div>
            <dt>市粮</dt>
            <dd data-testid="market-food-count">{marketFoodCount}</dd>
          </div>
          <div>
            <dt>市供</dt>
            <dd data-testid="market-food-quality">{marketFoodQuality}</dd>
          </div>
          <div>
            <dt>麻田</dt>
            <dd data-testid="hemp-farm-count">{hempFarmCount}</dd>
          </div>
          <div>
            <dt>织坊</dt>
            <dd data-testid="weaver-count">{weaverCount}</dd>
          </div>
          <div>
            <dt>市衣</dt>
            <dd data-testid="clothing-count">{clothingCount}</dd>
          </div>
          <div>
            <dt>衣户</dt>
            <dd data-testid="clothing-service">{clothingService}</dd>
          </div>
          <div>
            <dt>兵坊</dt>
            <dd data-testid="weaponsmith-count">{weaponsmithCount}</dd>
          </div>
          <div>
            <dt>步营</dt>
            <dd data-testid="fort-count">{fortCount}</dd>
          </div>
          <div>
            <dt>兵力</dt>
            <dd data-testid="soldier-count">{soldierCount}</dd>
          </div>
          <div>
            <dt>守军</dt>
            <dd data-testid="deployed-count">{deployedCount}</dd>
          </div>
          <div>
            <dt>税署</dt>
            <dd data-testid="tax-office-count">{taxOfficeCount}</dd>
          </div>
          <div>
            <dt>国库</dt>
            <dd data-testid="treasury">{treasury}</dd>
          </div>
          <div>
            <dt>月税</dt>
            <dd data-testid="tax-revenue">+{taxRevenue}</dd>
          </div>
          <div>
            <dt>民心</dt>
            <dd data-testid="city-sentiment">{citySentiment}</dd>
          </div>
          <div>
            <dt>乐学</dt>
            <dd data-testid="music-school-count">{musicSchoolCount}</dd>
          </div>
          <div>
            <dt>乐师</dt>
            <dd data-testid="performer-count">{performerCount}</dd>
          </div>
          <div>
            <dt>乐户</dt>
            <dd data-testid="entertainment-service">{entertainmentService}</dd>
          </div>
          <div>
            <dt>商站</dt>
            <dd data-testid="trading-post-count">{tradingPostCount}</dd>
          </div>
          <div>
            <dt>待贸</dt>
            <dd data-testid="trade-stock">{tradeStock}</dd>
          </div>
          <div>
            <dt>贸入</dt>
            <dd data-testid="trade-revenue">+{tradeRevenue}</dd>
          </div>
          <div>
            <dt>住膳</dt>
            <dd data-testid="household-food-quality">{householdFoodQuality}</dd>
          </div>
          <div>
            <dt>道路</dt>
            <dd data-testid="road-count">{roadCount}</dd>
          </div>
          <div
            className={`stat-clickable${populationPanelOpen ? " active" : ""}`}
            onClick={togglePopulationPanel}
            role="button"
            tabIndex={0}
            aria-expanded={populationPanelOpen}
            aria-label="查看人口详情"
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                togglePopulationPanel();
              }
            }}
          >
            <dt>人口</dt>
            <dd data-testid="population-count">{populationCount}</dd>
          </div>
          <div>
            <dt>劳力</dt>
            <dd data-testid="labor-assignment">
              {laborAssigned}/{laborDemand}
            </dd>
          </div>
          <div>
            <dt>缺工</dt>
            <dd data-testid="labor-vacancies">{laborVacancies}</dd>
          </div>
          <div>
            <dt>薪耗</dt>
            <dd data-testid="labor-payroll">{laborPayroll}</dd>
          </div>
          <div>
            <dt>模拟</dt>
            <dd data-testid="simulation-tick">tick {simulationTick}</dd>
          </div>
          <div>
            <dt>历法</dt>
            <dd data-testid="calendar-state">
              {calendarLabel(simulationTick)}
            </dd>
          </div>
          <div>
            <dt>时代</dt>
            <dd data-testid="era-state">{eraName}</dd>
          </div>
          <div>
            <dt>下启</dt>
            <dd data-testid="next-technology">{nextTechnology}</dd>
          </div>
        </dl>
      </header>

      {populationPanelOpen && populationPanelData && (
        <PopulationDetailPanel
          snapshot={populationPanelData}
          onClose={togglePopulationPanel}
        />
      )}

      {housePanelOpen && housePanelData && (
        <HouseListPanel
          snapshot={housePanelData}
          onClose={() => toggleHousePanel()}
          focusHouseId={housePanelFocusId}
        />
      )}

      {buildingPanelOpen && buildingPanelData && (() => {
        const building = buildingPanelData.snapshot.buildings.find(
          (b) => b.id === buildingPanelData.buildingId,
        );
        if (!building) return null;
        return (
          <BuildingDetailPanel
            building={building}
            snapshot={buildingPanelData.snapshot}
            onClose={closeBuildingPanel}
          />
        );
      })()}

      <aside className="build-dock" aria-label="建造工具">
        <span className="dock-label">民生</span>
        <button
          type="button"
          className={buildTool === "house" ? "active" : undefined}
          disabled={gameStatus !== "游戏已就绪"}
          aria-pressed={buildTool === "house"}
          onClick={() => toggleBuildTool("house")}
        >
          <span className="building-glyph" aria-hidden="true">
            舍
          </span>
          住宅
        </button>
        <button
          type="button"
          className={buildTool === "road" ? "active" : undefined}
          disabled={gameStatus !== "游戏已就绪"}
          aria-pressed={buildTool === "road"}
          onClick={() => toggleBuildTool("road")}
        >
          <span className="building-glyph" aria-hidden="true">
            路
          </span>
          道路
        </button>
        <button
          type="button"
          className={`well-tool${buildTool === "well" ? " active" : ""}`}
          disabled={gameStatus !== "游戏已就绪"}
          aria-pressed={buildTool === "well"}
          onClick={() => toggleBuildTool("well")}
        >
          <span className="building-glyph" aria-hidden="true">
            井
          </span>
          水井
        </button>
        <button
          type="button"
          className={`market-tool${buildTool === "market" ? " active" : ""}`}
          disabled={gameStatus !== "游戏已就绪"}
          aria-pressed={buildTool === "market"}
          onClick={() => toggleBuildTool("market")}
        >
          <span className="building-glyph" aria-hidden="true">
            市
          </span>
          市场
        </button>
        <button
          type="button"
          className={`farm-tool${buildTool === "farm" ? " active" : ""}`}
          disabled={gameStatus !== "游戏已就绪"}
          aria-pressed={buildTool === "farm"}
          onClick={() => toggleBuildTool("farm")}
        >
          <span className="building-glyph" aria-hidden="true">
            田
          </span>
          农场
        </button>
        <button
          type="button"
          className={`granary-tool${buildTool === "granary" ? " active" : ""}`}
          disabled={gameStatus !== "游戏已就绪"}
          aria-pressed={buildTool === "granary"}
          onClick={() => toggleBuildTool("granary")}
        >
          <span className="building-glyph" aria-hidden="true">
            仓
          </span>
          粮仓
        </button>
        <button
          type="button"
          className={`hemp-tool${buildTool === "hemp-farm" ? " active" : ""}`}
          disabled={gameStatus !== "游戏已就绪"}
          aria-pressed={buildTool === "hemp-farm"}
          onClick={() => toggleBuildTool("hemp-farm")}
        >
          <span className="building-glyph" aria-hidden="true">
            麻
          </span>
          麻田
        </button>
        <button
          type="button"
          className={`weaver-tool${buildTool === "weaver" ? " active" : ""}`}
          disabled={gameStatus !== "游戏已就绪"}
          aria-pressed={buildTool === "weaver"}
          onClick={() => toggleBuildTool("weaver")}
        >
          <span className="building-glyph" aria-hidden="true">
            织
          </span>
          织坊
        </button>
        <button
          type="button"
          className={`weaponsmith-tool${buildTool === "weaponsmith" ? " active" : ""}`}
          disabled={gameStatus !== "游戏已就绪"}
          aria-pressed={buildTool === "weaponsmith"}
          onClick={() => toggleBuildTool("weaponsmith")}
        >
          <span className="building-glyph" aria-hidden="true">
            兵
          </span>
          兵器坊
        </button>
        <button
          type="button"
          className={`fort-tool${buildTool === "infantry-fort" ? " active" : ""}`}
          disabled={gameStatus !== "游戏已就绪"}
          aria-pressed={buildTool === "infantry-fort"}
          onClick={() => toggleBuildTool("infantry-fort")}
        >
          <span className="building-glyph" aria-hidden="true">
            戍
          </span>
          步兵营
        </button>
        <button
          type="button"
          className={`tax-tool${buildTool === "tax-office" ? " active" : ""}`}
          disabled={gameStatus !== "游戏已就绪"}
          aria-pressed={buildTool === "tax-office"}
          onClick={() => toggleBuildTool("tax-office")}
        >
          <span className="building-glyph" aria-hidden="true">
            税
          </span>
          税务署
        </button>
        <button
          type="button"
          className={`music-tool${buildTool === "music-school" ? " active" : ""}`}
          disabled={gameStatus !== "游戏已就绪"}
          aria-pressed={buildTool === "music-school"}
          onClick={() => toggleBuildTool("music-school")}
        >
          <span className="building-glyph" aria-hidden="true">
            乐
          </span>
          音乐学校
        </button>
        <button
          type="button"
          className={`trade-tool${buildTool === "trading-post" ? " active" : ""}`}
          disabled={gameStatus !== "游戏已就绪"}
          aria-pressed={buildTool === "trading-post"}
          onClick={() => toggleBuildTool("trading-post")}
        >
          <span className="building-glyph" aria-hidden="true">
            商
          </span>
          贸易站
        </button>
        <button
          type="button"
          className={`demolish-tool${buildTool === "demolish" ? " active" : ""}`}
          disabled={gameStatus !== "游戏已就绪"}
          aria-pressed={buildTool === "demolish"}
          onClick={() => toggleBuildTool("demolish")}
        >
          <span className="building-glyph" aria-hidden="true">
            拆
          </span>
          拆除
        </button>
      </aside>

      {buildTool === "farm" ? (
        <section className="crop-picker" aria-label="选择农作物">
          <span className="crop-picker-title">本季播种</span>
          {CROP_OPTIONS.map((option) => (
            <button
              key={option.type}
              type="button"
              className={selectedCrop === option.type ? "active" : undefined}
              aria-pressed={selectedCrop === option.type}
              data-testid={`crop-${option.type}`}
              onClick={() => selectCrop(option.type)}
            >
              <span>{option.label}</span>
              <small>{option.harvestMonth} 月收</small>
            </button>
          ))}
        </section>
      ) : null}

      <section className="speed-panel" aria-label="模拟速度">
        {([0, 1, 2, 4] as const).map((speed) => (
          <button
            key={speed}
            type="button"
            className={simulationSpeed === speed ? "active" : undefined}
            data-testid={`speed-${speed}`}
            aria-pressed={simulationSpeed === speed}
            onClick={() => updateSimulationSpeed(speed)}
          >
            {speed === 0 ? "暂停" : `${speed}×`}
          </button>
        ))}
      </section>

      <section className="labor-panel" aria-label="劳动力政策">
        <span>工资</span>
        {(["low", "standard", "high"] as const).map((wageLevel) => (
          <button
            key={wageLevel}
            type="button"
            className={
              laborPolicy.wageLevel === wageLevel ? "active" : undefined
            }
            disabled={gameStatus !== "游戏已就绪"}
            data-testid={`wage-${wageLevel}`}
            aria-pressed={laborPolicy.wageLevel === wageLevel}
            onClick={() => updateWage(wageLevel)}
          >
            {wageLevel === "low"
              ? "节俭"
              : wageLevel === "standard"
                ? "常例"
                : "优厚"}
          </button>
        ))}
        <span>优先</span>
        {(
          [
            ["agriculture", "农"],
            ["commerce", "商"],
            ["services", "役"],
          ] as const
        ).map(([sector, label]) => (
          <button
            key={sector}
            type="button"
            className={
              laborPolicy.priorities[0] === sector ? "active" : undefined
            }
            disabled={gameStatus !== "游戏已就绪"}
            data-testid={`priority-${sector}`}
            aria-pressed={laborPolicy.priorities[0] === sector}
            onClick={() => prioritizeSector(sector)}
          >
            {label} {laborSectors[sector]}
          </button>
        ))}
      </section>

      <section className="tax-panel" aria-label="政府税收">
        <span data-testid="tax-summary">
          国库 {treasury} · 征 {taxableHouses} 户 · 月税 +{taxRevenue} · 薪 -
          {laborPayroll} · 贸易 +{tradeRevenue}
        </span>
        <span data-testid="sentiment-reasons">
          民心 {citySentiment} · {sentimentReasons}
        </span>
        <span data-testid="migration-attractiveness">
          迁引 {migrationAppeal}
        </span>
        <span data-testid="migration-diagnostic">{migrationDiagnostic}</span>
        {(["low", "standard", "high"] as const).map((rate) => (
          <button
            key={rate}
            type="button"
            className={taxRate === rate ? "active" : undefined}
            disabled={gameStatus !== "游戏已就绪"}
            data-testid={`tax-rate-${rate}`}
            aria-pressed={taxRate === rate}
            onClick={() => updateTaxRate(rate)}
          >
            {rate === "low" ? "轻税" : rate === "standard" ? "常税" : "重税"}
          </button>
        ))}
      </section>

      {granaryPolicy.id !== null ? (
        <section className="storage-panel" aria-label="粮仓接收策略">
          <span>粮仓 #{granaryPolicy.id}</span>
          {CROP_OPTIONS.map((option) => {
            const accepted = granaryPolicy.accepted.includes(option.type);
            return (
              <button
                key={option.type}
                type="button"
                className={accepted ? "active" : undefined}
                aria-pressed={accepted}
                data-testid={`granary-accept-${option.type}`}
                onClick={() => toggleGranaryCrop(option.type)}
              >
                {option.label}
              </button>
            );
          })}
        </section>
      ) : null}

      <section className="religion-panel" aria-label="神农供奉">
        <span data-testid="shennong-favor">神农 {shennongFavor}/3</span>
        <button
          type="button"
          disabled={!offeringTarget || gameStatus !== "游戏已就绪"}
          data-testid="make-offering"
          onClick={offerToShennong}
        >
          {offeringTarget
            ? `供奉${CROP_LABELS[offeringTarget.cropType]}`
            : "暂无供品"}
        </button>
        <button
          type="button"
          disabled={!festivalAvailable || gameStatus !== "游戏已就绪"}
          data-testid="hold-festival"
          onClick={holdFestival}
        >
          举办新年祭
        </button>
        <span data-testid="last-festival">
          {lastFestivalYear ? `${lastFestivalYear}年已办` : "尚未举办"}
        </span>
      </section>

      <section className="diplomacy-panel" aria-label="外交使者">
        <span data-testid="diplomacy-status">{diplomacyStatus}</span>
        <span data-testid="envoy-count">使者 {envoyCount}</span>
        <button
          type="button"
          disabled={!offeringTarget || gameStatus !== "游戏已就绪"}
          data-testid="send-gift"
          onClick={sendDiplomaticGift}
        >
          {offeringTarget
            ? `赠送${CROP_LABELS[offeringTarget.cropType]}`
            : "暂无礼物"}
        </button>
      </section>

      <section className="status-ribbon">
        <span
          data-testid="feedback"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {errorMessage || feedback}
        </span>
        <span data-testid="save-status">{saveStatus}</span>
        <span
          className={
            foodSupplyStatus.startsWith("缺粮")
              ? "food-shortage"
              : "food-supply"
          }
          data-testid="food-supply-status"
        >
          {foodSupplyStatus}
        </span>
        <span data-testid="camera-state">方位 {cameraHeading}°</span>
        <span data-testid="construction-status">
          {constructionCount === 0 ? "营造 —" : `营造 ${constructionCount} 处`}
        </span>
        <span data-testid="hovered-tile">
          {hoveredTile ? `${hoveredTile.x},${hoveredTile.y}` : "—"}
        </span>
        <span data-testid="site-element">{siteElement}</span>
        <span data-testid="site-feng-shui">{siteFengShui}</span>
        <span data-testid="site-desirability">{siteDesirability}</span>
        <span data-testid="placement-status">
          {placementStatus === "hidden" ? "—" : placementStatus}
        </span>
      </section>
    </main>
  );
}
