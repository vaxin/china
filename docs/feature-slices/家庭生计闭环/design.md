# 家庭生计闭环结构设计

## 决策

家庭生计仍属于 Worker 内的权威确定性模拟。前端仅展示快照，不自行计算工资、订单、缺粮原因或余额。

本轮不升级存档大版本。v6 快照新增字段使用 schema 预处理补默认值，从而读取旧 v6；新一次自动保存会写入完整生计数据。

## 模块边界

### `packages/protocol`

- 定义家庭账户、缺粮归因、生计流水和在途口粮订单的快照契约。
- 旧家庭缺省为 12 钱、0 就业、0 欠薪、0 税欠、空流水。
- 严格校验非负安全整数、流水上限、唯一在途订单以及家庭/市场引用。

### `packages/simulation/household-livelihood.ts`

新纯函数模块，负责：

- 把已分配工人按家庭可用劳动人口和稳定 ID 分配；
- 在国库可支配资金范围内支付工资并记录欠薪；
- 记录最多 12 条流水；
- 为 UI 导出可稳定测试的生计状态汇总纯函数。

该模块不读写全局单例，不知道 React/Babylon/Dexie。

### `packages/simulation/index.ts`

作为世界协调器，负责：

- 在新家庭入住时初始化生计档案；
- 根据真实道路距离创建订单与到达 tick；
- 预留/释放市场作物库存；
- 在到达时复验道路和引用，然后交付或原子退款；
- 将应纳税额分解到家庭，只把实付加入国库；
- 按固定阶段协调生产、消费、订单、建造、劳动和财政。

### `apps/game-web`

- `App`：从快照派生城市总现金、有工户、断粮户和主阻塞，不存另一份权威状态。
- `PopulationDetailPanel` / `HouseListPanel`：共用生计展示组件，避免两套余额、订单和流水文案漂移。
- `HouseholdLivelihoodView`：展示四站生计链、当前阻塞和近 12 笔账本。

## 快照形状

```ts
type FoodShortageReason =
  | "none"
  | "delivery-pending"
  | "unaffordable"
  | "out-of-stock"
  | "disconnected"
  | "no-market";

type LivelihoodLedgerKind =
  | "arrival-funds"
  | "wage"
  | "wage-arrears"
  | "tax"
  | "tax-arrears"
  | "food-order"
  | "food-delivery"
  | "food-refund";

interface HouseholdLivelihoodLedgerEntryView {
  id: string;        // `${tick}:${kind}:${ordinal}`
  tick: number;
  kind: LivelihoodLedgerKind;
  amount: number;    // 收入为正，支出为负，非现金事件为 0
  balanceAfter: number;
}

interface HouseholdFoodOrderView {
  houseId: number;
  marketId: number;
  cropType: CropType;
  price: 1;
  placedAtTick: number;
  arrivesAtTick: number;
}
```

`HouseholdView` 新增余额、就业人数、本月收入、本月粮食支出、欠薪、税欠、缺粮归因与有界流水。在途订单位于世界顶层，因为它同时引用家庭和市场。

## 月度 tick 顺序

1. 推进农业、粮仓与市场补货。
2. 既有家庭消耗一个月口粮。
3. 处理上月在途订单：到达或退款还库；因此当月消费先发生，到货再补至 3 月上限。
4. 处理紧急粮仓救济、建造和新家庭入住。
5. 根据当月人口与岗位分配劳动，国库先留住已付订单的可退款托管金，再发工资。
6. 计算应纳税并从家庭实际余额征收。
7. 为口粮剩余不足且无在途订单的家庭尝试下单，并更新归因。
8. 生成快照、城市汇总与可视化数据。

订单支付已经进入国库，但在交付前记入 `foodOrderEscrow`。工资只能使用 `treasury - foodOrderEscrow`，从而保证任何在途订单都能全额退款。

## 守恒与幂等

- 新家庭的 12 钱以 `arrival-funds` 流水明确标注为城外流入。
- 工资、税、购粮与退款都同时修改两个对手账户；任一余额不得为负。
- 市场库存在下单时预留，交付不再扣一次；取消只还一次。
- 同一家庭仅一笔在途订单；订单以家庭 ID 作幂等键。
- 流水 ID 包含 tick、类型和当 tick 序号，schema 拒绝重复 ID。
- 流水只保留最新 12 条；裁剪不影响账户真实余额。

## 可视化结构

`HouseholdLivelihoodView` 分为三层：

1. **生计结论**：“尚可度日 / 运粮中 / 无力购粮 / 运路不通 / 市场缺货”。
2. **四站生计流**：劳作、钱袋、采办、粮瓮；只当前环节有一处强调。
3. **近 12 笔流水**：月份、类型、金额和交易后余额。

住户列表只显示快速识别所需的余额、本月收入、口粮与结论，不在卡片里复制整本账本。

## 测试分层

- 纯函数单元：就业分配、工资/欠薪、流水裁剪、城市汇总。
- 模拟集成：完整工资、税、下单、到货、断路退款、缺粮归因与 20 年确定性。
- 协议/持久化：旧 v6 默认值、非法快照、在途订单引用、存档往返。
- E2E：HUD 汇总、住户卡、四站生计流、账本、键盘和刷新恢复。
- 手工视觉：桌面/狭屏屏幕截图、状态不只靠颜色、`prefers-reduced-motion`。
