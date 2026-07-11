import { useState } from "react";
import type {
  CitizenState,
  CitizenView,
  ConstructionStage,
  HouseholdView,
  HouseBuildingView,
  MigrantState,
  MigrantView,
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

// ---- labels ----

const citizenStateLabel: Record<CitizenState, string> = {
  commuting: "通勤上工",
  working: "在岗工作",
  returning: "返家途中",
  resting: "在家休息",
  strolling: "宅旁闲逛",
  waiting: "断路等候",
};

const migrantStateLabel: Record<MigrantState, string> = {
  walking: "赶路中",
  building: "施工中",
};

const constructionStageLabel: Record<ConstructionStage, string> = {
  0: "宅基地",
  1: "打地基",
  2: "立木架",
  3: "封顶",
  4: "成屋",
};

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

const foodQualityLabel: Record<string, string> = {
  none: "缺粮",
  bland: "清淡",
  plain: "普通",
  tasty: "可口",
  delicious: "美味",
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

type SelectedEntity =
  | { kind: "migrant"; migrant: MigrantView; house: HouseBuildingView | null }
  | {
      kind: "citizen";
      citizen: CitizenView;
      house: HouseBuildingView | null;
      workplace: { id: number; typeId: string } | null;
    }
  | {
      kind: "household";
      household: HouseholdView;
      house: HouseBuildingView | null;
    }
  | {
      kind: "house";
      house: HouseBuildingView;
      household: HouseholdView | null;
    };

interface PopulationDetailPanelProps {
  snapshot: WorldSnapshot;
  onClose: () => void;
}

// ---- main ----

export function PopulationDetailPanel({
  snapshot,
  onClose,
}: PopulationDetailPanelProps) {
  const [selected, setSelected] = useState<SelectedEntity | null>(null);

  if (selected) {
    return (
      <aside className="population-panel" aria-label="人口详情">
        <button
          type="button"
          className="population-panel-close"
          onClick={onClose}
          aria-label="关闭人口详情"
        >
          ✕
        </button>
        <div className="population-panel-inner">
          <button
            type="button"
            className="population-back-btn"
            onClick={() => setSelected(null)}
          >
            ← 返回列表
          </button>
          <EntityDetail entity={selected} snapshot={snapshot} />
        </div>
      </aside>
    );
  }

  const migrants = snapshot.migrants;
  const citizens = snapshot.citizens ?? [];
  const households = snapshot.households;
  const buildings = snapshot.buildings;

  const housesById = new Map(
    buildings
      .filter((b): b is HouseBuildingView => b.typeId === "house")
      .map((h) => [h.id, h]),
  );
  const buildingsById = new Map(buildings.map((b) => [b.id, b]));
  const householdsByHouse = new Map(
    households.map((h) => [h.houseId, h]),
  );

  return (
    <aside className="population-panel" aria-label="人口详情">
      <button
        type="button"
        className="population-panel-close"
        onClick={onClose}
        aria-label="关闭人口详情"
      >
        ✕
      </button>
      <div className="population-panel-inner">
        {/* Migrants */}
        <section className="population-section">
          <h2 className="population-section-title">
            流民
            <span className="population-section-count">{migrants.length}</span>
          </h2>
          {migrants.length === 0 ? (
            <p className="population-empty">暂无流民</p>
          ) : (
            <ul className="population-list">
              {migrants
                .sort((a, b) => a.houseId - b.houseId)
                .map((migrant) => (
                  <MigrantCard
                    key={migrant.houseId}
                    migrant={migrant}
                    house={housesById.get(migrant.houseId)}
                    onClick={() =>
                      setSelected({
                        kind: "migrant",
                        migrant,
                        house: housesById.get(migrant.houseId) ?? null,
                      })
                    }
                  />
                ))}
            </ul>
          )}
        </section>

        {/* Citizens */}
        <section className="population-section">
          <h2 className="population-section-title">
            市民
            <span className="population-section-count">{citizens.length}</span>
          </h2>
          {citizens.length === 0 ? (
            <p className="population-empty">暂无市民</p>
          ) : (
            <ul className="population-list">
              {citizens
                .sort((a, b) => a.id - b.id)
                .map((citizen) => (
                  <CitizenCard
                    key={citizen.id}
                    citizen={citizen}
                    house={housesById.get(citizen.houseId)}
                    workplace={
                      citizen.workplaceId !== null
                        ? buildingsById.get(citizen.workplaceId) ?? null
                        : null
                    }
                    onClick={() =>
                      setSelected({
                        kind: "citizen",
                        citizen,
                        house: housesById.get(citizen.houseId) ?? null,
                        workplace:
                          citizen.workplaceId !== null
                            ? buildingsById.get(citizen.workplaceId) ?? null
                            : null,
                      })
                    }
                  />
                ))}
            </ul>
          )}
        </section>

        {/* Households */}
        <section className="population-section">
          <h2 className="population-section-title">
            住户
            <span className="population-section-count">
              {households.length}
            </span>
          </h2>
          {households.length === 0 ? (
            <p className="population-empty">暂无住户</p>
          ) : (
            <ul className="population-list">
              {households
                .sort((a, b) => a.houseId - b.houseId)
                .map((household) => (
                  <HouseholdCard
                    key={household.houseId}
                    household={household}
                    house={housesById.get(household.houseId)}
                    onClick={() =>
                      setSelected({
                        kind: "household",
                        household,
                        house: housesById.get(household.houseId) ?? null,
                      })
                    }
                  />
                ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}

// ---- Entity Detail View ----

function EntityDetail({
  entity,
  snapshot,
}: {
  entity: SelectedEntity;
  snapshot: WorldSnapshot;
}) {
  switch (entity.kind) {
    case "migrant":
      return <MigrantDetail migrant={entity.migrant} house={entity.house} />;
    case "citizen":
      return (
        <CitizenDetail
          citizen={entity.citizen}
          house={entity.house}
          workplace={entity.workplace}
        />
      );
    case "household":
      return (
        <HouseholdDetail
          household={entity.household}
          house={entity.house}
          snapshot={snapshot}
        />
      );
    case "house":
      return (
        <HouseDetail
          house={entity.house}
          household={entity.household}
          snapshot={snapshot}
        />
      );
  }
}

// ---- Migrant Detail ----

function MigrantDetail({
  migrant,
  house,
}: {
  migrant: MigrantView;
  house: HouseBuildingView | null;
}) {
  return (
    <div className="entity-detail">
      <h2 className="entity-detail-title">
        <span className="population-card-icon" aria-hidden="true">🚶</span>
        流民 · 住宅 #{migrant.houseId}
      </h2>
      <DetailRow label="状态" value={migrantStateLabel[migrant.state]} />
      <DetailRow label="当前位置" value={`${migrant.x}, ${migrant.y}`} />
      {house && (
        <>
          <DetailRow label="住宅位置" value={`${house.x}, ${house.y}`} />
          <DetailRow
            label="施工阶段"
            value={constructionStageLabel[house.constructionStage]}
          />
          <DetailRow
            label="等级"
            value={`${house.level} 级`}
          />
        </>
      )}
    </div>
  );
}

// ---- Citizen Detail ----

function CitizenDetail({
  citizen,
  house,
  workplace,
}: {
  citizen: CitizenView;
  house: HouseBuildingView | null;
  workplace: { id: number; typeId: string } | null;
}) {
  return (
    <div className="entity-detail">
      <h2 className="entity-detail-title">
        <span className="population-card-icon" aria-hidden="true">👤</span>
        市民 #{citizen.id}
      </h2>
      <DetailRow label="状态" value={citizenStateLabel[citizen.state]} />
      <DetailRow label="当前位置" value={`${citizen.x}, ${citizen.y}`} />
      {(citizen.state === "working" || citizen.state === "resting") && (
        <DetailRow label="停留计时" value={`${citizen.dwellTicks}/2 tick`} />
      )}
      <DetailRow
        label="所属住宅"
        value={house ? `#${house.id} (${house.x}, ${house.y})` : `#${citizen.houseId}`}
      />
      {house && (
        <>
          <DetailRow label="住宅等级" value={`${house.level} 级`} />
          <DetailRow
            label="施工阶段"
            value={constructionStageLabel[house.constructionStage]}
          />
        </>
      )}
      <DetailRule />
      <DetailRow
        label="工作岗位"
        value={
          workplace
            ? `${buildingTypeLabel[workplace.typeId] ?? workplace.typeId} #${workplace.id}`
            : "无业"
        }
      />
    </div>
  );
}

// ---- Household Detail ----

function HouseholdDetail({
  household,
  house,
  snapshot,
}: {
  household: HouseholdView;
  house: HouseBuildingView | null;
  snapshot: WorldSnapshot;
}) {
  const migrationInfo =
    house && house.constructionStage === 0
      ? computeMigrationConditions(snapshot, house)
      : null;

  return (
    <div className="entity-detail">
      <h2 className="entity-detail-title">
        <span className="population-card-icon" aria-hidden="true">🏠</span>
        住户 #{household.houseId}
      </h2>
      <DetailRow label="人口" value={`${household.residents} 人`} />
      <DetailRow
        label="口粮剩余"
        value={
          household.foodReserveTicks > 0
            ? `${household.foodReserveTicks} tick`
            : "耗尽"
        }
      />
      <DetailRow
        label="膳食品质"
        value={foodQualityLabel[household.foodQuality] ?? household.foodQuality}
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
      {house && (
        <>
          <DetailRule />
          <DetailRow label="住宅位置" value={`${house.x}, ${house.y}`} />
          <DetailRow label="等级" value={`${house.level} 级`} />
          <DetailRow
            label="施工阶段"
            value={constructionStageLabel[house.constructionStage]}
          />
        </>
      )}
      {migrationInfo && <MigrationConditions info={migrationInfo} />}
    </div>
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
  const borderConnected = houseBorderTiles(house, snapshot.map).some((tile) =>
    connected.has(tileKey(tile)),
  );

  const element = elementAtTile(house.x, house.y);
  const fengShui = fengShuiAtSite("house", house.x, house.y);
  const desirability = desirabilityAtSite(snapshot.buildings, house.x, house.y);

  return (
    <div className="entity-detail">
      <h2 className="entity-detail-title">
        <span className="population-card-icon" aria-hidden="true">🏠</span>
        住宅 #{house.id}
      </h2>

      <DetailRow label="位置" value={`${house.x}, ${house.y}`} />
      <DetailRow label="等级" value={`${house.level} 级 (${house.level === 2 ? "10" : "5"}人容量)`} />
      <DetailRow
        label="施工阶段"
        value={constructionStageLabel[house.constructionStage]}
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
          value={elementLabels[element]}
        />
        <ConditionRow
          label="风水格局"
          value={`${fengShui.preferredElement} · ${{
            harmonious: "吉 · 相合",
            neutral: "平",
            conflicting: "凶 · 相克",
          }[fengShui.status]}`}
        />
        <ConditionRow
          label="宜居度"
          value={`${desirability.score}`}
        />
      </div>

      {household && (
        <>
          <DetailRule />
          <h3 className="entity-detail-subtitle">当前住户</h3>
          <DetailRow label="人口" value={`${household.residents} 人`} />
          <DetailRow
            label="口粮剩余"
            value={
              household.foodReserveTicks > 0
                ? `${household.foodReserveTicks} tick`
                : "耗尽"
            }
          />
          <DetailRow
            label="膳食品质"
            value={foodQualityLabel[household.foodQuality] ?? household.foodQuality}
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
        <DetailRow label="工资" value={wageLabel[info.wageLevel] ?? info.wageLevel} />
      </div>
      {!info.canMigrate && (
        <p className="detail-hint">
          提高工资或改善民心可恢复迁入
        </p>
      )}
    </div>
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

// ---- Card Components ----

function MigrantCard({
  migrant,
  house,
  onClick,
}: {
  migrant: MigrantView;
  house?: HouseBuildingView;
  onClick: () => void;
}) {
  return (
    <li
      className="population-card migrant-card clickable-card"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`流民 住宅 ${migrant.houseId} ${migrantStateLabel[migrant.state]}`}
    >
      <div className="population-card-header">
        <span className="population-card-icon" aria-hidden="true">
          🚶
        </span>
        <span className="population-card-label">住宅 #{migrant.houseId}</span>
        <span className={`population-card-state ${migrant.state}`}>
          {migrantStateLabel[migrant.state]}
        </span>
      </div>
      <div className="population-card-body">
        <Row label="位置" value={`${migrant.x}, ${migrant.y}`} />
        <Row
          label="宅基地阶段"
          value={
            house
              ? constructionStageLabel[house.constructionStage]
              : "—"
          }
        />
      </div>
    </li>
  );
}

function CitizenCard({
  citizen,
  house,
  workplace,
  onClick,
}: {
  citizen: CitizenView;
  house?: HouseBuildingView;
  workplace: { id: number; typeId: string } | null;
  onClick: () => void;
}) {
  return (
    <li
      className="population-card citizen-card clickable-card"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`市民 ${citizen.id} ${citizenStateLabel[citizen.state]}`}
    >
      <div className="population-card-header">
        <span className="population-card-icon" aria-hidden="true">
          👤
        </span>
        <span className="population-card-label">市民 #{citizen.id}</span>
        <span className={`population-card-state ${citizen.state}`}>
          {citizenStateLabel[citizen.state]}
        </span>
      </div>
      <div className="population-card-body">
        <Row label="位置" value={`${citizen.x}, ${citizen.y}`} />
        <Row
          label="工作"
          value={
            workplace
              ? `${buildingTypeLabel[workplace.typeId] ?? workplace.typeId} #${workplace.id}`
              : "无业"
          }
        />
      </div>
    </li>
  );
}

function HouseholdCard({
  household,
  house,
  onClick,
}: {
  household: HouseholdView;
  house?: HouseBuildingView;
  onClick: () => void;
}) {
  return (
    <li
      className="population-card household-card clickable-card"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`住户 ${household.houseId} ${household.residents} 人`}
    >
      <div className="population-card-header">
        <span className="population-card-icon" aria-hidden="true">
          🏠
        </span>
        <span className="population-card-label">住户 #{household.houseId}</span>
        <span className="population-card-state">
          {household.residents} 口人
        </span>
      </div>
      <div className="population-card-body">
        <Row label="口粮" value={foodQualityLabel[household.foodQuality] ?? "—"} />
        <Row
          label="位置"
          value={house ? `${house.x}, ${house.y}` : "—"}
        />
      </div>
    </li>
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
