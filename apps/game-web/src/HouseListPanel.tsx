import { useEffect, useState } from "react";
import { ArrowLeft, House, X } from "@phosphor-icons/react";
import type {
  HouseholdView,
  HouseBuildingView,
  WorldSnapshot,
} from "@empire/protocol";
import { CITY_GATE_TILE } from "@empire/protocol";
import {
  desirabilityAtSite,
  elementAtTile,
  fengShuiAtSite,
  migrationAttractiveness,
} from "@empire/simulation";
import { connectedRoadKeys, houseBorderTiles } from "./migration-diagnostics";
import { HouseholdLivelihoodView } from "./HouseholdLivelihoodView";
import {
  foodShortageLabel,
  householdLivelihoodView,
} from "./livelihood-view-model";

// ---- labels ----

const constructionStageLabel: Record<number, string> = {
  0: "宅基地",
  1: "打地基",
  2: "立木架",
  3: "封顶",
  4: "成屋",
};

const elementLabels: Record<string, string> = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水",
};

// ---- helpers ----

function tileKey(tile: { x: number; y: number }): string {
  return `${tile.x},${tile.y}`;
}

function houseHasWaterServiceOnMap(
  house: HouseBuildingView,
  snapshot: WorldSnapshot,
): boolean {
  const wells = snapshot.buildings.filter((b) => b.typeId === "well");
  for (const border of houseBorderTiles(house, snapshot.map)) {
    for (const well of wells) {
      const dist = Math.abs(border.x - well.x) + Math.abs(border.y - well.y);
      if (dist <= 8) return true;
    }
  }
  return false;
}

// ---- types ----

interface HouseListPanelProps {
  snapshot: WorldSnapshot;
  onClose: () => void;
  focusHouseId?: number | null;
}

// ---- main ----

export function HouseListPanel({
  snapshot,
  onClose,
  focusHouseId,
}: HouseListPanelProps) {
  const houses = snapshot.buildings
    .filter((b): b is HouseBuildingView => b.typeId === "house")
    .sort((a, b) => a.id - b.id);

  const householdsByHouse = new Map(
    snapshot.households.map((h) => [h.houseId, h]),
  );

  const [selectedHouseId, setSelectedHouseId] = useState<number | null>(
    focusHouseId ?? null,
  );

  useEffect(() => {
    if (focusHouseId !== undefined && focusHouseId !== null) {
      setSelectedHouseId(focusHouseId);
    }
  }, [focusHouseId]);

  if (selectedHouseId !== null) {
    const house = houses.find((h) => h.id === selectedHouseId);
    if (house) {
      return (
        <aside className="population-panel" aria-label="住宅详情">
          <button
            type="button"
            className="population-panel-close"
            onClick={onClose}
            aria-label="关闭住宅详情"
          >
            <X size={16} weight="bold" aria-hidden="true" />
          </button>
          <div className="population-panel-inner">
            <button
              type="button"
              className="population-back-btn"
              onClick={() => setSelectedHouseId(null)}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              返回列表
            </button>
            <HouseDetail
              house={house}
              household={householdsByHouse.get(house.id) ?? null}
              snapshot={snapshot}
            />
          </div>
        </aside>
      );
    }
    // house not found, go back to list
    return null;
  }

  return (
    <aside className="population-panel" aria-label="住宅列表">
      <button
        type="button"
        className="population-panel-close"
        onClick={onClose}
        aria-label="关闭住宅列表"
      >
        <X size={16} weight="bold" aria-hidden="true" />
      </button>
      <div className="population-panel-inner">
        <section className="population-section">
          <h2 className="population-section-title">
            住宅
            <span className="population-section-count">{houses.length}</span>
          </h2>
          {houses.length === 0 ? (
            <p className="population-empty">暂无住宅</p>
          ) : (
            <ul className="population-list">
              {houses.map((house) => (
                <HouseCard
                  key={house.id}
                  house={house}
                  household={householdsByHouse.get(house.id) ?? null}
                  onClick={() => setSelectedHouseId(house.id)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}

// ---- House Detail ----

function HouseDetail({
  house,
  household,
  snapshot,
}: {
  house: HouseBuildingView;
  household: HouseholdView | null;
  snapshot: WorldSnapshot;
}) {
  const migrationInfo =
    house.constructionStage === 0
      ? computeMigrationConditions(snapshot, house)
      : null;

  const hasWater = houseHasWaterServiceOnMap(house, snapshot);
  const connected = connectedRoadKeys(snapshot);
  const borderConnected = houseBorderTiles(house, snapshot.map).some((t) =>
    connected.has(tileKey(t)),
  );

  const element = elementAtTile(house.x, house.y);
  const fengShui = fengShuiAtSite("house", house.x, house.y);
  const desirability = desirabilityAtSite(snapshot.buildings, house.x, house.y);

  return (
    <div className="entity-detail">
      <h2 className="entity-detail-title">
        <span className="population-card-icon" aria-hidden="true">
          <House size={18} weight="duotone" />
        </span>
        住宅 #{house.id}
      </h2>

      <DetailRow label="位置" value={`${house.x}, ${house.y}`} />
      <DetailRow
        label="等级"
        value={`${house.level} 级 (${house.level === 2 ? "10" : "5"}人容量)`}
      />
      <DetailRow
        label="施工阶段"
        value={constructionStageLabel[house.constructionStage] ?? "—"}
      />

      <DetailRule />

      <div className="detail-condition-list">
        <ConditionRow
          label="道路连通"
          ok={borderConnected}
          okText="已连通"
          failText="未连通 — 宅基地周边无道路连接"
        />
        <ConditionRow
          label="供水服务"
          ok={hasWater}
          okText="已覆盖"
          failText="未覆盖 — 8格内无水井"
        />
        <ConditionRow
          label="五行元素"
          value={elementLabels[element] ?? element}
        />
        <ConditionRow
          label="风水格局"
          value={`${fengShui.preferredElement} · ${
            {
              harmonious: "吉 · 相合",
              neutral: "平",
              conflicting: "凶 · 相克",
            }[fengShui.status]
          }`}
        />
        <ConditionRow label="宜居度" value={`${desirability.score}`} />
      </div>

      {household && (
        <>
          <DetailRule />
          <h3 className="entity-detail-subtitle">当前住户</h3>
          <HouseholdLivelihoodView
            household={household}
            order={snapshot.householdFoodOrders?.find(
              (order) => order.houseId === household.houseId,
            )}
          />
          {household.clothingReserveTicks !== undefined && (
            <DetailRow
              label="衣物储备"
              value={`${household.clothingReserveTicks} tick`}
            />
          )}
          {household.entertainmentReserveTicks !== undefined && (
            <DetailRow
              label="娱乐覆盖"
              value={`${household.entertainmentReserveTicks} tick`}
            />
          )}
        </>
      )}

      {migrationInfo && <MigrationConditions info={migrationInfo} />}
    </div>
  );
}

// ---- Migration Conditions ----

interface MigrationInfo {
  gateConnected: boolean;
  roadConnected: boolean;
  canMigrate: boolean;
  sentiment: number;
  wageLevel: string;
  attractiveness: number;
}

function computeMigrationConditions(
  snapshot: WorldSnapshot,
  house: HouseBuildingView,
): MigrationInfo {
  const connected = connectedRoadKeys(snapshot);
  const gateConnected = connected.has(tileKey(CITY_GATE_TILE));
  const borderConnected = houseBorderTiles(house, snapshot.map).some((tile) =>
    connected.has(tileKey(tile)),
  );
  const economy = snapshot.economy ?? { sentiment: 50 };
  const wageLevel = snapshot.laborPolicy?.wageLevel ?? "standard";
  const attractiveness = migrationAttractiveness(economy.sentiment, wageLevel);

  return {
    gateConnected,
    roadConnected: borderConnected,
    canMigrate: attractiveness.canMigrate,
    sentiment: economy.sentiment,
    wageLevel,
    attractiveness: attractiveness.score,
  };
}

function MigrationConditions({ info }: { info: MigrationInfo }) {
  const wageLabel: Record<string, string> = {
    low: "低薪",
    standard: "标准",
    high: "高薪",
  };

  return (
    <div className="entity-detail-section">
      <DetailRule />
      <h3 className="entity-detail-subtitle">迁入条件</h3>
      <div className="detail-condition-list">
        <ConditionRow
          label="城门通路"
          ok={info.gateConnected}
          okText="已连通"
          failText="未连通 — 城门 (0,15) 无道路连接"
        />
        <ConditionRow
          label="宅基地通路"
          ok={info.roadConnected}
          okText="已连通"
          failText="未连通 — 宅基地周边无道路"
        />
        <ConditionRow
          label="迁入吸引力"
          ok={info.canMigrate}
          okText={`可迁入 (${info.attractiveness})`}
          failText={`不可迁入 (${info.attractiveness})`}
        />
      </div>
      <div className="detail-meta">
        <DetailRow label="民心" value={`${info.sentiment}`} />
        <DetailRow
          label="工资"
          value={wageLabel[info.wageLevel] ?? info.wageLevel}
        />
      </div>
      {!info.canMigrate && (
        <p className="detail-hint">提高工资或改善民心可恢复迁入</p>
      )}
    </div>
  );
}

// ---- House Card ----

function HouseCard({
  house,
  household,
  onClick,
}: {
  house: HouseBuildingView;
  household: HouseholdView | null;
  onClick: () => void;
}) {
  const livelihood = household ? householdLivelihoodView(household) : null;
  return (
    <li
      className="population-card clickable-card"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`住宅 ${house.id} ${constructionStageLabel[house.constructionStage] ?? ""}`}
    >
      <div className="population-card-header">
        <span className="population-card-icon" aria-hidden="true">
          <House size={18} weight="duotone" />
        </span>
        <span className="population-card-label">住宅 #{house.id}</span>
        <span
          className={`population-card-state ${house.constructionStage === 0 ? "waiting" : ""}`}
        >
          {house.constructionStage === 0
            ? "待迁入"
            : household
              ? foodShortageLabel(household.foodShortageReason)
              : (constructionStageLabel[house.constructionStage] ?? "—")}
        </span>
      </div>
      <div className="population-card-body">
        <Row
          label="阶段"
          value={constructionStageLabel[house.constructionStage] ?? "—"}
        />
        <Row label="位置" value={`${house.x}, ${house.y}`} />
        <Row label="等级" value={`${house.level} 级`} />
        {household && livelihood ? (
          <>
            <Row
              label="钱粮"
              value={`${household.cash ?? 12} 钱 · ${household.foodReserveTicks} 月粮`}
            />
            <Row label="生计" value={livelihood.conclusion} />
          </>
        ) : null}
      </div>
    </li>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="population-row">
      <span className="population-row-label">{label}</span>
      <span className="population-row-value">{value}</span>
    </div>
  );
}
