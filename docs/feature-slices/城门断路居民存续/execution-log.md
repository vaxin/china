# 城门断路居民存续验收执行记录

对应验收文档：[acceptance.md](./acceptance.md)

| 时间 | 实际路径 | 用途 |
| --- | --- | --- |
| 2026-07-12 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/SKILL.md` | ATDD 主表、验收闸门与 TDD 流程 |
| 2026-07-12 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/tdd-core.md`、`testing-style-observable-behavior.md`、`testing-anti-patterns.md` | 先红后绿、面向可观察快照断言与 Mock 禁区 |
| 2026-07-12 | `packages/simulation/src/index.ts`、`packages/simulation/src/demolition.test.ts`、`packages/simulation/src/citizen-life.test.ts`、`packages/simulation/src/worker-runtime.test.ts` | 定位入口连通误用于本地道路服务，并覆盖拆除快照及后续 tick |
| 2026-07-12 | `packages/simulation/src/demolition.test.ts` | 先运行新增 GATE-01，确认旧行为在住宅仍有本地道路时错误清空住户；修复后复验 |

## 执行结果

- 🔴 GATE-01 初次运行失败：拆除 `(0,15)` 后仍有 `(1,15)`～`(6,15)` 的本地道路，但 `households` 被错误清空。
- 🟢 修复后：`pnpm vitest run packages/simulation/src/demolition.test.ts packages/simulation/src/citizen-life.test.ts packages/simulation/src/worker-runtime.test.ts`，17/17 通过。
- 🟢 模拟层全量：`pnpm vitest run packages/simulation/src`，32 文件、161/161 通过。
- 🟢 静态与构建：`pnpm typecheck`、`pnpm build` 通过；本次触及的模拟文件 ESLint 通过。
- ⚠️ 仓库全量 `pnpm test` 仍有一个既有的、与本次道路/人物逻辑无关的失败：`apps/game-web/src/migration-diagnostics.test.ts` 对“迁引不足”文案的预期与当前入口未铺路诊断不一致（305/306 通过）。
