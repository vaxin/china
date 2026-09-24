import type {
  HouseholdFoodOrderView,
  HouseholdView,
  LivelihoodLedgerKind,
} from "@empire/protocol";

import { calendarLabel } from "./crop-catalog";
import { householdLivelihoodView } from "./livelihood-view-model";

const ledgerLabels: Record<LivelihoodLedgerKind, string> = {
  "arrival-funds": "安家本钱",
  wage: "工钱",
  "wage-arrears": "欠薪",
  tax: "税课",
  "tax-arrears": "税欠",
  "food-order": "买粮",
  "food-delivery": "粮到",
  "food-refund": "退粮款",
};

export function HouseholdLivelihoodView({
  household,
  order,
}: {
  household: HouseholdView;
  order?: HouseholdFoodOrderView;
}) {
  const view = householdLivelihoodView(household, order);
  const ledger = [...(household.livelihoodLedger ?? [])].reverse();
  const hasFlowMotion =
    order !== undefined ||
    (household.lastIncome ?? 0) > 0 ||
    (household.lastFoodExpense ?? 0) > 0;
  const stages = [
    { id: "labor", glyph: "作", label: "劳作", value: view.labor },
    { id: "wallet", glyph: "钱", label: "钱袋", value: view.wallet },
    { id: "provision", glyph: "运", label: "采办", value: view.provision },
    { id: "pantry", glyph: "粮", label: "粮瓮", value: view.pantry },
  ] as const;

  return (
    <section
      className={`livelihood-sheet livelihood-${view.tone}`}
      aria-label="家庭生计"
      data-testid={`household-livelihood-${household.houseId}`}
    >
      <div className="livelihood-heading">
        <div>
          <p className="livelihood-kicker">本户生计</p>
          <h3>{view.conclusion}</h3>
        </div>
        <span className="livelihood-balance">
          余 <strong>{household.cash ?? 12}</strong> 钱
        </span>
      </div>

      <ol
        className={`livelihood-flow${hasFlowMotion ? " has-motion" : ""}`}
        aria-label="劳作到口粮的生计流程"
      >
        {stages.map((stage) => (
          <li
            key={stage.id}
            className={
              view.activeStage === stage.id
                ? "livelihood-stage active"
                : "livelihood-stage"
            }
            data-stage={stage.id}
          >
            <span className="livelihood-seal" aria-hidden="true">
              {stage.glyph}
            </span>
            <span className="livelihood-stage-copy">
              <span>{stage.label}</span>
              <strong>{stage.value}</strong>
            </span>
          </li>
        ))}
      </ol>

      <div className="livelihood-obligations">
        <span>欠薪 {household.wageArrears ?? 0}</span>
        <span>税欠 {household.taxArrears ?? 0}</span>
        <span>
          本月 {household.lastIncome ?? 0} 入 / {household.lastFoodExpense ?? 0}{" "}
          粮
        </span>
      </div>

      <div className="livelihood-ledger">
        <h4>近 12 笔流水</h4>
        {ledger.length === 0 ? (
          <p className="livelihood-ledger-empty">尚无生计流水</p>
        ) : (
          <ol>
            {ledger.map((entry) => (
              <li key={entry.id}>
                <time>{calendarLabel(entry.tick)}</time>
                <span>{ledgerLabels[entry.kind]}</span>
                <strong className={entry.amount >= 0 ? "income" : "expense"}>
                  {entry.amount > 0 ? "+" : ""}
                  {entry.amount}
                </strong>
                <small>余 {entry.balanceAfter}</small>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
