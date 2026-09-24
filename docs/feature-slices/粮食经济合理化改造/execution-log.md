# 粮食经济合理化改造验收执行记录

对应验收文档：[acceptance.md](./acceptance.md)。本文件记录本会话实际阅读、并用于形成验收口径的资料；主验收稿不重复维护引用大表。

| 时间       | 路径                                                                                                         | 本会话用途                               |
| ---------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| 2026-07-15 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/SKILL.md`                                          | 采用 ATDD 闸门、任务规划和红绿纪律       |
| 2026-07-15 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/atdd-checklist-template.md`             | 验收表、确认闸门与执行记录格式           |
| 2026-07-15 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/tdd-core.md`                            | TDD 红绿验证规则                         |
| 2026-07-15 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/testing-style-observable-behavior.md`              | 以可观察结果书写断言                     |
| 2026-07-15 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/testing-anti-patterns.md`                          | 避免 mock 与实现细节断言                 |
| 2026-07-15 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/acceptance-dimensions-general-index.md` | 验收维度查漏                             |
| 2026-07-15 | `packages/simulation/src/index.ts`                                                                           | 现有生产、物流、订单、救济与财政结算顺序 |
| 2026-07-15 | `packages/simulation/src/labor-economy.ts`                                                                   | 现有岗位需求和分配限制                   |
| 2026-07-15 | `packages/protocol/src/index.ts`                                                                             | 当前库存、家庭与存档契约                 |
| 2026-07-15 | `packages/simulation/src/food-quality.ts`                                                                    | 作物多样性与食品品质规则                 |
| 2026-07-15 | `家庭生计闭环-结构设计.md`                                                                                   | 当前家庭订单、托管与账本设计             |
| 2026-07-15 | `自动运转世界-系统闭环与演进基线.md`                                                                         | 长期的订单、企业与守恒方向               |
| 2026-07-15 | 用户确认“确认”                                                                                               | 验收闸门通过，可进入结构设计与实现       |
| 2026-07-15 | `packages/simulation/src/food-economy-rationalization.test.ts`                                              | 三条新行为测试先红后绿：缺工停产、十人户双倍耗粮、货款归市场 |
| 2026-07-15 | `packages/protocol/src/household-livelihood-protocol.test.ts`                                               | 订单/账本协议回归通过 |
| 2026-07-15 | `packages/protocol`、`packages/simulation`、`apps/game-web` 的 TypeScript 配置                            | 三个受影响工作区均通过类型检查 |
| 2026-07-15 | 既有粮食物流、市场与家庭集成测试                                                                            | 旧断言仍固定旧机制（无人生产、每户一单位、市场容量 4、自动救济），需按 S-F01～S-F09 更新后再作为总回归门禁 |
| 2026-07-19 | 用户反馈“农田每次只产出一份，太少了，不够吃”                                                                | 补充 F-07 与 S-F10～S-F11：提高满编农田收获量并同步校准仓储上限 |
| 2026-07-19 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/SKILL.md` 与 TDD/测试风格参考                    | 本次产量校准沿用 ATDD 确认闸门与先红后绿验证 |
