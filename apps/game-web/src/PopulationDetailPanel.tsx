import type {
  CitizenState,
  CitizenView,
  HouseholdView,
  HouseBuildingView,
  MigrantState,
  MigrantView,
  WorldSnapshot,
} from "@empire/protocol";

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

const constructionStageLabel = [
  "宅基地",
  "打地基",
  "立木架",
  "封顶",
  "成屋",
] as const;

const buildingTypeLabel: Record<string, string> = {
  house: "住宅",
  road: "道路",
  well: "水井",
  farm: "农场",
  granary: "粮仓",
  market: "市场",
  "hemp-farm": "麻田",
  weaver: "织坊",
  weaponsmith: "兵器坊",
  "infantry-fort": "步兵营",
  "tax-office": "税务署",
  "music-school": "音乐学校",
  "trading-post": "贸易站",
};

const foodQualityLabel: Record<string, string> = {
  none: "缺粮",
  bland: "清淡",
  plain: "普通",
  tasty: "可口",
  delicious: "美味",
};

interface PopulationDetailPanelProps {
  snapshot: WorldSnapshot;
}

export function PopulationDetailPanel({
  snapshot,
}: PopulationDetailPanelProps) {
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

  return (
    <aside className="population-panel" aria-label="人口详情">
      <div className="population-panel-inner">
        {/* 流民 */}
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
                  />
                ))}
            </ul>
          )}
        </section>

        {/* 市民 */}
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
                  />
                ))}
            </ul>
          )}
        </section>

        {/* 住户 */}
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
                  />
                ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}

function MigrantCard({
  migrant,
  house,
}: {
  migrant: MigrantView;
  house?: HouseBuildingView;
}) {
  return (
    <li className="population-card migrant-card">
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
        <Row label="住宅位置" value={house ? `${house.x}, ${house.y}` : "—"} />
      </div>
    </li>
  );
}

function CitizenCard({
  citizen,
  house,
  workplace,
}: {
  citizen: CitizenView;
  house?: HouseBuildingView;
  workplace: { id: number; typeId: string } | null;
}) {
  const stateClass = citizen.state;

  return (
    <li className="population-card citizen-card">
      <div className="population-card-header">
        <span className="population-card-icon" aria-hidden="true">
          👤
        </span>
        <span className="population-card-label">市民 #{citizen.id}</span>
        <span className={`population-card-state ${stateClass}`}>
          {citizenStateLabel[citizen.state]}
        </span>
      </div>
      <div className="population-card-body">
        <Row label="所属住宅" value={`#${citizen.houseId}`} />
        <Row
          label="工作岗位"
          value={
            workplace
              ? `${buildingTypeLabel[workplace.typeId] ?? workplace.typeId} #${workplace.id}`
              : "无业"
          }
        />
        <Row label="当前位置" value={`${citizen.x}, ${citizen.y}`} />
        {citizen.state === "working" || citizen.state === "resting" ? (
          <Row
            label="停留计时"
            value={`${citizen.dwellTicks}/2 tick`}
          />
        ) : null}
        <Row
          label="住宅位置"
          value={house ? `${house.x}, ${house.y}` : "—"}
        />
        <Row
          label="住宅等级"
          value={house ? `${house.level} 级 (${house.level === 2 ? 10 : 5}人)` : "—"}
        />
      </div>
    </li>
  );
}

function HouseholdCard({
  household,
  house,
}: {
  household: HouseholdView;
  house?: HouseBuildingView;
}) {
  return (
    <li className="population-card household-card">
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
        <Row label="位置" value={house ? `${house.x}, ${house.y}` : "—"} />
        <Row label="人口" value={`${household.residents} 人`} />
        <Row
          label="口粮剩余"
          value={
            household.foodReserveTicks > 0
              ? `${household.foodReserveTicks} tick`
              : "耗尽"
          }
        />
        <Row
          label="膳食品质"
          value={foodQualityLabel[household.foodQuality] ?? household.foodQuality}
        />
        {household.clothingReserveTicks !== undefined ? (
          <Row
            label="衣物储备"
            value={`${household.clothingReserveTicks} tick`}
          />
        ) : null}
        {household.entertainmentReserveTicks !== undefined ? (
          <Row
            label="娱乐覆盖"
            value={`${household.entertainmentReserveTicks} tick`}
          />
        ) : null}
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
