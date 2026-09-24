# 第二十八垂直切片：城墙与城门连接执行记录

对应验收文档：[acceptance.md](./acceptance.md)

| 时间       | 实际路径                                                                                                                                                                                                                                                                | 本会话用途                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 2026-07-14 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/SKILL.md`                                                                                                                                                                                                     | 任务规划、ATDD 确认闸门、TDD 红绿与执行记录约定                     |
| 2026-07-14 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/tdd-core.md`、`/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/testing-style-observable-behavior.md`、`/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/testing-anti-patterns.md` | 先红后绿、WHAT 断言与 Mock 禁区                                     |
| 2026-07-14 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/atdd-checklist-template.md`、`acceptance-dimensions-general-index.md`、`domain-system-focus-areas.md`、`cross-cutting-coverage-dimensions.md`                                                      | 验收主表、待确认假设、领域判定、恢复和 UX 查漏                      |
| 2026-07-14 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/acceptance-general-ui-pages.md`、`acceptance-general-user-interactions.md`                                                                                                                         | 放置预览、鼠标/键盘一致性、反馈与刷新恢复判据                       |
| 2026-07-14 | `packages/protocol/src/index.ts`、`packages/protocol/src/game-protocol.test.ts`                                                                                                                                                                                         | 对照 v6 快照、建造/道路/拆除命令、城门占地保护与旧档迁移            |
| 2026-07-14 | `packages/simulation/src/index.ts`、`packages/simulation/src/road-population.test.ts`、`packages/simulation/src/demolition.test.ts`、`packages/simulation/src/worker-runtime.test.ts`                                                                                   | 对照权威放置、道路路径原子性、拆除、城门道路服务与 Worker 快照      |
| 2026-07-14 | `packages/renderer/src/index.ts`、`packages/renderer/src/runtime-assets.ts`、`packages/renderer/src/road-autotile.ts`、`packages/renderer/src/road-autotile.test.ts`、`packages/renderer/src/sprite-grounding.ts`                                                       | 对照城门半格视觉偏移、四邻接拼接、运行素材、四向相机接地和 1×1 预览 |
| 2026-07-14 | `apps/game-web/src/App.tsx`、`apps/game-web/e2e/*.spec.ts`、`apps/game-web/public/assets/runtime/v1/buildings/gate.png`                                                                                                                                                 | 对照建造栏、反馈文案、鼠标/键盘入口、E2E 选择器与城门实际视觉       |
| 2026-07-14 | `第二十七垂直切片-人物活动时钟与连续动画-验收.md`、`第二十七垂直切片-人物活动时钟与连续动画-结构设计.md`、`第二十七垂直切片-人物活动时钟与连续动画-验收.execution-log.md`                                                                                               | 对齐当前迭代编号、文档结构、人物通行回归与审计写法                  |
| 2026-07-14 | `第八垂直切片-真实运行素材验收.md`、`美术素材生成与程序切分规范.md`、`龙之崛起玩法研究与夜间实现验收.md`                                                                                                                                                                | 对齐真实手绘运行素材纪律、城墙/攻城路线和当前明确未完成范围         |
| 2026-07-14 | `/Users/bytedance/.codex/skills/frontend-design/SKILL.md`                                                                                                                                                                                                               | 城门延展轮廓、建造入口、视觉记忆点和实现后截图自审                  |
| 2026-07-14 | `/Users/bytedance/.codex/skills/.system/imagegen/SKILL.md`                                                                                                                                                                                                              | 版本化墙体透明运行素材的生成、去背、验证与项目落盘流程              |

## 当前诊断结论

- 城墙适合成为与道路平行的独立坐标集合，而不是有全局实体 ID 的普通建筑：它按格连续、需要四邻接换形，也不应消耗建筑 ID。
- 城门入口位于地图西侧 `(0,15)`，因此本轮连接点应是同一边界上的 `(0,14)` 与 `(0,16)`；入口格继续只承载道路。
- 存档应升级到 v7 并为 v1～v6 补空墙集合，避免把新持久化字段静默塞进既有版本含义。
- 项目已明确可见世界使用版本化手绘素材，城墙实现不能以 Babylon 盒体作为最终可见主体。

## 验收闸门记录

- 2026-07-14：验收主表成稿后交付用户；用户回复“可以了，继续”，成功、失败/边界、数据状态与外层测试四项闸门全部通过，可以进入结构设计与 TDD。

## 红绿与实现记录

| 阶段     | 证据                                                                                                                                | 结果                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 协议红灯 | `packages/protocol/src/wall-protocol.test.ts`                                                                                       | v7、`walls` 与 `build-wall-path` 实现前失败                               |
| 模拟红灯 | `packages/simulation/src/wall-building.test.ts`                                                                                     | 路径原子性、互斥、拆墙和 revision 上限实现前失败                          |
| 渲染红灯 | `packages/renderer/src/wall-autotile.test.ts`、`runtime-assets.test.ts`                                                             | 城门虚拟邻接、相机旋转和图集掩码实现前失败                                |
| 绿灯实现 | `packages/protocol/src/index.ts`、`packages/simulation/src/index.ts`、`packages/renderer/src/index.ts`、`apps/game-web/src/App.tsx` | 墙层、命令、持久化、自动拼接、营造栏、预览、统计与反馈贯通                |
| 真实素材 | `apps/game-web/public/assets/runtime/v6/defense/wall-autotiles-4x4.png`                                                             | Image Gen 生成灰砖夯土 4×4 图集，去背后作为运行素材，按 16 种连接掩码校准 |
| 端到端   | `apps/game-web/e2e/twenty-eighth-wall.spec.ts`                                                                                      | 城门两侧修墙、门洞铺路、刷新恢复、墙路互斥与拆墙通过                      |

## 阶段验证记录

- 2026-07-14：协议、持久化与 Worker 回归 102 项通过。
- 2026-07-14：城墙协议、模拟、自动拼接、图集和持久化专测 54 项通过。
- 2026-07-14：Chromium 生产构建 E2E 4 项通过，覆盖鼠标、键盘、城门保护、刷新恢复与素材失败降级。
- 2026-07-14：生产画面截图自审通过；城墙与城门同材质、同高度，沿地图轴线连接，门洞保持开放，无占位框或底色。
- 2026-07-14：类型检查、目标文件 Lint、目标文件 Prettier 与生产构建通过；排除既有范围外失败文件后，全仓 55 个测试文件、372 项通过。
- 2026-07-14：全仓基线残留 11 条范围外 Lint 错误（郊野地形、建筑详情、民心、劳动力）和 1 条范围外迁引诊断文案单测失败；为保护用户并行改动未擅自修复。
