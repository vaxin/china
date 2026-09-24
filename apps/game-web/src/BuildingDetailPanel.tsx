import type { BuildingView, WorldSnapshot } from "@empire/protocol";
import {
  ArrowLeft,
  Bank,
  Buildings,
  Drop,
  Hammer,
  Handshake,
  House,
  MusicNotes,
  Plant,
  Shield,
  Storefront,
  Warehouse,
  X,
  Yarn,
  type Icon,
} from "@phosphor-icons/react";
import {
  CROP_TYPES,
  CITY_GATE_TILE,
  type CropType,
  type GranaryBuildingView,
  type MarketBuildingView,
  type FarmBuildingView,
  type HempFarmBuildingView,
  type WeaverBuildingView,
  type WeaponsmithBuildingView,
  type InfantryFortBuildingView,
  type TradingPostBuildingView,
  type TaxOfficeBuildingView,
  type MusicSchoolBuildingView,
} from "@empire/protocol";
import {
  elementAtTile,
  fengShuiAtSite,
  deployedSoldiers,
  foodQualityForStocks,
} from "@empire/simulation";
import { connectedRoadKeys } from "./migration-diagnostics";

// ---- labels ----

const buildingTypeLabel: Record<string, string> = {
  house: "住宅",
  road: "道路",
  well: "水井",
  farm: "农场",
  granary: "粮仓",
  "hemp-farm": "麻田",
  weaver: "织坊",
  weaponsmith: "兵器坊",
  "infantry-fort": "步兵营",
  "tax-office": "税务署",
  "music-school": "音乐学校",
  "trading-post": "贸易站",
  market: "市场",
};

const cropLabel: Record<CropType, string> = {
  wheat: "小麦",
  soybean: "大豆",
  rice: "水稻",
  millet: "粟",
  cabbage: "白菜",
};

const elementLabels: Record<string, string> = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水",
};

const foodQualityLabel: Record<string, string> = {
  none: "缺粮",
  bland: "清淡",
  plain: "普通",
  tasty: "可口",
  delicious: "美味",
};

// ---- helpers ----

function tileKey(tile: { x: number; y: number }): string {
  return `${tile.x},${tile.y}`;
}

function footprintBorderConnected(
  building: BuildingView,
  connected: Set<string>,
): boolean {
  for (let dx = building.x; dx < building.x + building.footprint.width; dx++) {
    for (
      let dy = building.y;
      dy < building.y + building.footprint.height;
      dy++
    ) {
      const neighbors = [
        { x: dx - 1, y: dy },
        { x: dx + 1, y: dy },
        { x: dx, y: dy - 1 },
        { x: dx, y: dy + 1 },
      ];
      for (const n of neighbors) {
        if (
          n.x < building.x ||
          n.x >= building.x + building.footprint.width ||
          n.y < building.y ||
          n.y >= building.y + building.footprint.height
        ) {
          if (connected.has(tileKey(n))) return true;
        }
      }
    }
  }
  return false;
}

// ---- types ----

interface BuildingDetailPanelProps {
  building: BuildingView;
  snapshot: WorldSnapshot;
  onClose: () => void;
  onBack?: () => void;
}

// ---- main ----

export function BuildingDetailPanel({
  building,
  snapshot,
  onClose,
  onBack,
}: BuildingDetailPanelProps) {
  const connected = connectedRoadKeys(snapshot);
  const borderConnected = footprintBorderConnected(building, connected);
  const element = elementAtTile(building.x, building.y);
  const fengShui = fengShuiAtSite(building.typeId, building.x, building.y);

  const typeLabel = buildingTypeLabel[building.typeId] ?? building.typeId;

  return (
    <aside className="population-panel" aria-label={`${typeLabel}详情`}>
      <button
        type="button"
        className="population-panel-close"
        onClick={onClose}
        aria-label={`关闭${typeLabel}详情`}
      >
        <X size={16} weight="bold" aria-hidden="true" />
      </button>
      <div className="population-panel-inner">
        {onBack && (
          <button
            type="button"
            className="population-back-btn"
            onClick={onBack}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            返回
          </button>
        )}

        <div className="entity-detail">
          <h2 className="entity-detail-title">
            <span className="population-card-icon" aria-hidden="true">
              {buildingTypeIcon(building.typeId)}
            </span>
            {typeLabel} #{building.id}
          </h2>

          <DetailRow label="位置" value={`${building.x}, ${building.y}`} />
          <DetailRow
            label="占地"
            value={`${building.footprint.width}×${building.footprint.height}`}
          />

          <DetailRule />
          <div className="detail-condition-list">
            <ConditionRow
              label="道路连通"
              ok={borderConnected}
              okText="已连通"
              failText="未连通"
            />
            <ConditionRow
              label="五行元素"
              value={elementLabels[element] ?? element}
            />
            <ConditionRow
              label="风水格局"
              value={`${
                {
                  harmonious: "吉 · 相合",
                  neutral: "平",
                  conflicting: "凶 · 相克",
                }[fengShui.status]
              }`}
            />
          </div>

          {renderBuildingSpecifics(building, snapshot)}
        </div>
      </div>
    </aside>
  );
}

// ---- Type-specific sections ----

function buildingTypeIcon(typeId: string) {
  const icons: Record<string, Icon> = {
    well: Drop,
    farm: Plant,
    granary: Warehouse,
    market: Storefront,
    "hemp-farm": Plant,
    weaver: Yarn,
    weaponsmith: Hammer,
    "infantry-fort": Shield,
    "tax-office": Bank,
    "music-school": MusicNotes,
    "trading-post": Handshake,
    house: House,
  };
  const BuildingIcon = icons[typeId] ?? Buildings;
  return <BuildingIcon size={18} weight="duotone" aria-hidden="true" />;
}

function renderBuildingSpecifics(
  building: BuildingView,
  snapshot: WorldSnapshot,
) {
  switch (building.typeId) {
    case "farm":
      return <FarmDetail building={building as FarmBuildingView} />;
    case "hemp-farm":
      return <HempFarmDetail building={building as HempFarmBuildingView} />;
    case "granary":
      return <GranaryDetail building={building as GranaryBuildingView} />;
    case "market":
      return (
        <MarketDetail
          building={building as MarketBuildingView}
          snapshot={snapshot}
        />
      );
    case "weaver":
      return <WeaverDetail building={building as WeaverBuildingView} />;
    case "weaponsmith":
      return (
        <WeaponsmithDetail building={building as WeaponsmithBuildingView} />
      );
    case "infantry-fort":
      return (
        <InfantryFortDetail building={building as InfantryFortBuildingView} />
      );
    case "tax-office":
      return <TaxOfficeDetail building={building as TaxOfficeBuildingView} />;
    case "music-school":
      return (
        <MusicSchoolDetail building={building as MusicSchoolBuildingView} />
      );
    case "trading-post":
      return (
        <TradingPostDetail building={building as TradingPostBuildingView} />
      );
    case "well":
      return <WellDetail />;
    default:
      return null;
  }
}

// ---- Individual building details ----

function FarmDetail({ building }: { building: FarmBuildingView }) {
  const hasCrop = building.cropType !== undefined;
  return (
    <>
      <DetailRule />
      <h3 className="entity-detail-subtitle">农场运作</h3>
      <DetailRow
        label="种植作物"
        value={
          hasCrop
            ? (cropLabel[building.cropType!] ?? building.cropType!)
            : "休耕中"
        }
      />
      {building.foodStock !== undefined && (
        <DetailRow label="产量库存" value={`${building.foodStock}`} />
      )}
      <FoodBusinessEconomy building={building} />
    </>
  );
}

function HempFarmDetail({ building }: { building: HempFarmBuildingView }) {
  return (
    <>
      <DetailRule />
      <h3 className="entity-detail-subtitle">麻田产出</h3>
      <DetailRow label="麻产量" value={`${building.hempStock}`} />
    </>
  );
}

function GranaryDetail({ building }: { building: GranaryBuildingView }) {
  const total = CROP_TYPES.reduce(
    (sum, crop) => sum + building.foodStocks[crop],
    0,
  );
  const accepted = building.acceptedCrops;
  return (
    <>
      <DetailRule />
      <h3 className="entity-detail-subtitle">粮仓库存 ({total})</h3>
      {CROP_TYPES.map((crop) => (
        <DetailRow
          key={crop}
          label={cropLabel[crop]}
          value={`${building.foodStocks[crop]} ${
            accepted && !accepted.includes(crop) ? "· 拒收" : ""
          }`}
        />
      ))}
      <FoodBusinessEconomy building={building} />
    </>
  );
}

function MarketDetail({
  building,
  snapshot,
}: {
  building: MarketBuildingView;
  snapshot: WorldSnapshot;
}) {
  const total = CROP_TYPES.reduce(
    (sum, crop) => sum + building.foodStocks[crop],
    0,
  );
  const quality = foodQualityForStocks(building.foodStocks);
  const clothingStock = building.clothingStock ?? 0;

  return (
    <>
      <DetailRule />
      <h3 className="entity-detail-subtitle">市场库存</h3>
      <DetailRow label="粮食总库存" value={`${total}`} />
      {CROP_TYPES.map((crop) => (
        <DetailRow
          key={crop}
          label={`└ ${cropLabel[crop]}`}
          value={`${building.foodStocks[crop]}`}
        />
      ))}
      <DetailRow
        label="粮食品质"
        value={foodQualityLabel[quality] ?? quality}
      />
      <FoodBusinessEconomy building={building} />
      {clothingStock > 0 && (
        <DetailRow label="衣物库存" value={`${clothingStock}`} />
      )}
    </>
  );
}

function FoodBusinessEconomy({
  building,
}: {
  building: FarmBuildingView | GranaryBuildingView | MarketBuildingView;
}) {
  const workers = building.staffedWorkers ?? 0;
  return (
    <>
      <DetailRow
        label="经营余额"
        value={`${building.operatingCash ?? 12} 钱`}
      />
      <DetailRow
        label="当月人手"
        value={workers > 0 ? `${workers} 人` : "缺工"}
      />
      {(building.wageArrears ?? 0) > 0 && (
        <DetailRow label="累计欠薪" value={`${building.wageArrears} 钱`} />
      )}
    </>
  );
}

function WeaverDetail({ building }: { building: WeaverBuildingView }) {
  return (
    <>
      <DetailRule />
      <h3 className="entity-detail-subtitle">织坊运作</h3>
      <DetailRow label="麻原料" value={`${building.hempStock}`} />
      <DetailRow label="衣物产出" value={`${building.clothingStock}`} />
    </>
  );
}

function WeaponsmithDetail({
  building,
}: {
  building: WeaponsmithBuildingView;
}) {
  return (
    <>
      <DetailRule />
      <h3 className="entity-detail-subtitle">兵器坊产出</h3>
      <DetailRow label="武器库存" value={`${building.weaponStock}`} />
    </>
  );
}

function InfantryFortDetail({
  building,
}: {
  building: InfantryFortBuildingView;
}) {
  return (
    <>
      <DetailRule />
      <h3 className="entity-detail-subtitle">步兵营军备</h3>
      <DetailRow label="武器库存" value={`${building.weaponStock}`} />
      <DetailRow label="已装备士兵" value={`${building.soldiers ?? 0}`} />
    </>
  );
}

function TaxOfficeDetail({ building }: { building: TaxOfficeBuildingView }) {
  return (
    <>
      <DetailRule />
      <h3 className="entity-detail-subtitle">税务署</h3>
      <DetailRow label="状态" value="工作中" />
    </>
  );
}

function MusicSchoolDetail({
  building,
}: {
  building: MusicSchoolBuildingView;
}) {
  return (
    <>
      <DetailRule />
      <h3 className="entity-detail-subtitle">音乐学校</h3>
      <DetailRow label="状态" value="培养乐师" />
    </>
  );
}

function TradingPostDetail({
  building,
}: {
  building: TradingPostBuildingView;
}) {
  return (
    <>
      <DetailRule />
      <h3 className="entity-detail-subtitle">贸易站</h3>
      <DetailRow label="衣物库存" value={`${building.clothingStock ?? 0}`} />
    </>
  );
}

function WellDetail() {
  return (
    <>
      <DetailRule />
      <h3 className="entity-detail-subtitle">供水服务</h3>
      <DetailRow label="覆盖范围" value="8 格" />
    </>
  );
}

// ---- Shared Components ----

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="population-row detail-row">
      <span className="population-row-label">{label}</span>
      <span className="population-row-value">{value}</span>
    </div>
  );
}

function DetailRule() {
  return <hr className="detail-rule" />;
}

function ConditionRow({
  label,
  ok,
  okText,
  failText,
  value,
}: {
  label: string;
  ok?: boolean;
  okText?: string;
  failText?: string;
  value?: string;
}) {
  if (value !== undefined) {
    return (
      <div className="condition-row">
        <span className="condition-label">{label}</span>
        <span className="condition-value">{value}</span>
      </div>
    );
  }
  return (
    <div className={`condition-row ${ok ? "condition-ok" : "condition-fail"}`}>
      <span className="condition-label">{label}</span>
      <span className="condition-status">
        {ok ? (okText ?? "✓") : (failText ?? "✗")}
      </span>
    </div>
  );
}
