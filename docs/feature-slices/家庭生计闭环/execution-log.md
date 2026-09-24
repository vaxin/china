# 家庭生计闭环验收执行记录

对应验收文档：[acceptance.md](./acceptance.md)

本文仅记录本轮真实打开并对照过的资源；后续实质修订验收主稿时继续追加。

| 时间 | 实际路径 | 本会话用途 |
| --- | --- | --- |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/SKILL.md` | 任务规划、ATDD 主表、验收闸门与执行记录约定 |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/atdd-checklist-template.md` | 验收主稿、待确认问题、映射和确认表格式 |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/acceptance-dimensions-general-index.md` | 通用验收维度入口 |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/domain-system-focus-areas.md` | 判定交易、订单、库存、异步和 UI 领域形态 |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/cross-cutting-coverage-dimensions.md` | 查漏恢复、数字、UX 与观测维度 |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/tdd-core.md` | 后续产码的红→验红→绿→验绿纪律 |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/testing-style-observable-behavior.md` | 将 Then 收敛为快照、余额、库存、流水与 UI 等可观察结果 |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/testing-anti-patterns.md` | 避免 mock 调用次数、test-only API 与实现细节断言 |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/acceptance-general-ui-pages.md` | 查漏空态、数据刷新、恢复后一致性 |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/acceptance-general-user-interactions.md` | 查漏卡片热区、键盘、焦点和可观察反馈 |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/acceptance-domain-commerce-payment.md` | 预扣、退款、安全整数、幂等与对账判据 |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/acceptance-domain-order-fulfillment.md` | 在途订单、延时交付、取消与库存释放判据 |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/acceptance-domain-inventory-warehouse.md` | 库存预留、还库、不超售和引用校验 |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/acceptance-domain-messaging-async.md` | tick 延时、重复处理、失败补偿与可追溯 |
| 2026-07-13 | `/Users/bytedance/.codex/skills/frontend-design/SKILL.md` | 可视化主题、单一任务、四站生计流和响应式/减少动效约束 |
| 2026-07-13 | `自动运转世界-系统闭环与演进基线.md` | 家庭生计里程碑的范围、守恒和自治验收目标 |
| 2026-07-13 | `城门断路居民存续-验收.md`、`城门断路居民存续-验收.execution-log.md` | 识别当前在制切片及本地道路/城门连通语义，避免覆盖 |
| 2026-07-13 | `packages/simulation/src/labor-economy.ts`、`packages/simulation/src/government-economy.ts`、`packages/simulation/src/index.ts` | 对照现有劳动人数、薪资、国库、税收、市场配送与 tick 结算 |
| 2026-07-13 | `packages/protocol/src/index.ts` | 对照家庭快照、存档版本、严格 schema 与 Worker 边界 |
| 2026-07-13 | `apps/game-web/src/PopulationDetailPanel.tsx`、`apps/game-web/src/HouseListPanel.tsx`、`apps/game-web/src/App.tsx`、`apps/game-web/src/styles.css` | 对照现有住户/住宅详情、HUD 数据流与视觉组件 |

## 验收闸门记录

- 2026-07-13：用户回复“好，开始实现吧”，确认整份 Given/When/Then 验收口径，可进入结构设计与产码。

## 实现与验证记录

| 验证层级 | 命令/证据 | 结果 |
| --- | --- | --- |
| 家庭规则、协议、视图模型 | `pnpm exec vitest run packages/protocol/src/household-livelihood-protocol.test.ts packages/simulation/src/household-livelihood.test.ts packages/simulation/src/household-livelihood-integration.test.ts apps/game-web/src/livelihood-view-model.test.ts` | 18/18 通过；覆盖欠薪、税欠、三类采购阻塞、延时到货、断路退款、旧快照、非法欠款/超长流水/托管不平与 20 年确定性 |
| 持久化往返 | `pnpm exec vitest run packages/persistence/src/save-store.integration.test.ts packages/protocol/src/household-livelihood-protocol.test.ts` | 24/24 通过；非默认钱袋、流水、在途订单和托管金可随 v6 自动存档完整恢复 |
| 全量单元/集成 | `pnpm test` | 324/325 通过；唯一失败为既有 `migration-diagnostics.test.ts` 的“城门入口未铺路”与“迁引 35 停迁”诊断优先级冲突，与家庭生计无共享改动 |
| 类型检查 | `pnpm typecheck` | 通过 |
| 本轮文件 lint | 对本轮新增/修改的 TS/TSX 文件执行 ESLint | 通过 |
| 全仓 lint / 格式 | `pnpm lint`、`pnpm format:check` | 基线未全绿：`BuildingDetailPanel.tsx`、`renderer/index.ts`、`city-sentiment.ts`、`labor-economy.ts` 存在既有未使用项或格式问题；本轮文件无新增告警 |
| 生产构建 | `pnpm build` | 通过；仅保留既有大 chunk 警告 |
| 本轮 Chromium E2E | `pnpm exec playwright test apps/game-web/e2e/twenty-sixth-household-livelihood.spec.ts --project=chromium` | 1/1 通过；覆盖 HUD、卡片、四站链、账本、键盘、狭屏和减少动效 |
| 全量 Chromium E2E | `pnpm exec playwright test --project=chromium` | 本轮用例通过；全仓 26/48 通过。20 个既有用例受“住宅”工具与“查看住宅列表”宽松可访问名称冲突影响，另有市民通勤与迁引基线失败，均非本轮家庭生计断言 |
| 手工视觉自审 | 桌面与 620px 狭屏真实页面截图 | 四站链桌面横向、狭屏纵向；当前采办站以文字、青瓷色和菱形状态共同表达；减少动效时光点隐藏；流水正负号不依赖颜色 |

视觉证据：

- `/Users/bytedance/.codex/visualizations/2026/07/13/019f598f-7fd5-7dd3-9f65-15d67d1ba3dd/household-livelihood-desktop.png`
- `/Users/bytedance/.codex/visualizations/2026/07/13/019f598f-7fd5-7dd3-9f65-15d67d1ba3dd/household-livelihood-narrow.png`
