# 第三十垂直切片：郊野建设范围与城墙方向修正验收执行记录

**对应验收文档**：[acceptance.md](./acceptance.md)

本文件只记录真实执行过的审阅、红绿测试、实现与验收证据；主验收文档保留稳定的产品口径和 Given/When/Then。

| 时间       | 路径 / 命令                                                                                                                                                                                                        | 本会话用途                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| 2026-07-15 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/SKILL.md`                                                                                                                                                | 执行验收闸门、ATDD/TDD 红绿和收工自审规则                                       |
| 2026-07-15 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/tdd-core.md`、`testing-style-observable-behavior.md`、`testing-anti-patterns.md`                                                              | 约束生产代码先见红、只断言可观察行为且不引入 test-only API                      |
| 2026-07-15 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/atdd-checklist-template.md`、`acceptance-dimensions-general-index.md`、`domain-system-focus-areas.md`、`cross-cutting-coverage-dimensions.md` | 对照验收主表、闸门、领域 N/A、恢复与 UX 查漏                                    |
| 2026-07-15 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/acceptance-general-ui-pages.md`、`acceptance-general-user-interactions.md`                                                                    | 对照 IndexedDB 刷新、鼠标键盘、预览和错误反馈                                   |
| 2026-07-15 | `/Users/bytedance/.codex/skills/frontend-design/SKILL.md`                                                                                                                                                          | 依据截图检查墙体轴线、连续垛口、地形网格与反馈克制                              |
| 2026-07-15 | `/Users/bytedance/.codex/skills/.system/imagegen/SKILL.md`                                                                                                                                                         | 为原图集缺失的左右拐角生成同类石墙素材，并按规范透明化、保留版本化产物          |
| 2026-07-15 | `/Users/bytedance/.codex/skills/.system/imagegen/references/prompting.md`、`sample-prompts.md`                                                                                                                     | 按 style-transfer / precise-object-edit 约束参考图角色、不变量与透明背景流程    |
| 2026-07-15 | `第二十九垂直切片-郊野高地与土坡-验收.md`、`第二十九垂直切片-郊野高地与土坡-结构设计.md`、`第二十九垂直切片-郊野高地与土坡-验收.execution-log.md`                                                                  | 确认上一切片刻意把 96×96 郊野设为视觉层，本轮正式提升为可玩法地形               |
| 2026-07-15 | `packages/renderer/src/suburban-terrain.ts`、`suburban-terrain.test.ts`、`packages/renderer/src/index.ts`                                                                                                          | 审计高度/坡度采样、96×96 环形 mesh、不可拾取限制、中央网格和对象 Y=0 假设       |
| 2026-07-15 | `packages/protocol/src/index.ts`、`packages/simulation/src/index.ts`、`apps/game-web/src/App.tsx`                                                                                                                  | 审计 0...31 坐标 schema、路径 key、Worker 放置规则、键盘边界和坡地错误码缺口    |
| 2026-07-15 | `packages/renderer/src/wall-autotile.ts`、`runtime-assets.ts`、用户截图 `codex-clipboard-ed1cb796-c202-46eb-bf1e-6364d5185b25.png`                                                                                 | 定位直墙世界轴与图集实际画面方向不一致，导致斜向墙网显示成横板阶梯              |
| 2026-07-15 | 用户回复“确认”                                                                                                                                                                                                     | 成功、失败/边界、数据状态与外层测试四项验收闸门通过，可以进入结构设计与产码 TDD |

## 2026-07-15 红灯：共享地形与城墙方向

- 新增 `packages/protocol/src/terrain-topology.test.ts`，覆盖 96×96 边界、负坐标键、平地/坡地/高平地。
- 扩展 `packages/simulation/src/placement-preview.test.ts`，覆盖郊野建造、越界与 `steep-slope`。
- 收紧 `packages/renderer/src/runtime-assets.test.ts` 的直墙图集帧期望。
- 执行：`pnpm exec vitest run packages/protocol/src/terrain-topology.test.ts packages/simulation/src/placement-preview.test.ts packages/renderer/src/runtime-assets.test.ts`
- 结果：3 个测试文件失败；20 项中 5 项失败，失败原因分别为共享地形 API 尚不存在、模拟仍限于 32×32、直墙仍映射到错误帧。红灯有效。

## 2026-07-15 绿灯：实现与分层回归

- 协议新增共享 `terrain-topology`，固定原点 `(-32,-32)`、96×96、seed 与最大可建坡度；存档升级为 v8，v1～v7 解码时补默认地形且不平移旧城坐标。
- 模拟将建筑、道路、城墙、拆除和路径图扩展到地形边界；建筑完整 footprint、道路/墙单格统一检查坡度，新增权威 `steep-slope`。
- 渲染将郊野 mesh 设为可拾取，网格延伸到完整地形，并让预览、建筑、道路、墙和人物按共享高度接地；小地图与键盘同步扩为 96×96。
- 城墙图集修正 N↔S、E↔W 两条直墙映射：不再选用正面横板帧，改用与等距投影轴一致的两张斜向直墙帧；相机旋转仍先变换掩码再选帧。
- `pnpm exec vitest run packages/protocol/src/terrain-topology.test.ts packages/simulation/src/placement-preview.test.ts packages/renderer/src/runtime-assets.test.ts`：3 文件、20 项全绿。
- `pnpm exec vitest run packages/protocol/src/game-protocol.test.ts packages/protocol/src/wall-protocol.test.ts packages/simulation/src/wall-building.test.ts packages/simulation/src/world-hydration.test.ts`：4 文件、99 项全绿。
- `pnpm exec vitest run packages/persistence/src`：2 文件、20 项全绿，覆盖自动保存、刷新恢复和旧档原位迁移。
- 范围回归（排除会话前已存在的 `migration-diagnostics.test.ts` 失败）：56 文件、380 项全绿。
- 未排除的全量回归：55 文件中 54 绿、360/361 项通过；唯一失败仍为既有 `migration-diagnostics.test.ts` 的“迁引 35 停迁”文案期望，与本次地形/城墙改动无关。
- `pnpm typecheck`：通过；`pnpm build`：通过；本次修改文件 ESLint 与 Prettier 检查通过；`git diff --check` 通过。
- Chromium E2E：`twenty-eighth-wall.spec.ts` 4 项全绿；`twenty-ninth-suburban-terrain.spec.ts` 1 项全绿，实测外城 `(-20,15)` 建路、v8 保存刷新恢复、坡地 `(1,-32)` 红色拒绝以及郊野鼠标拾取。
- 生产截图 `/tmp/empire-suburban-highlands.png` 已目检：完整郊野网格可见，坡地 2×2 预览为红色，HUD 显示 96×96。

## 2026-07-15 影响面审计

- 按 `code-impact-regression` 技能调用一次自动流水线；技能自带 `run_pipeline.py` 第 46 行存在缩进错误，执行在分析前失败，未生成 `summary.json` 或额外报告。
- 已用工程内分层回归替代其证据收集：协议/迁移、IndexedDB、模拟放置与路径、图集映射、UI 键盘/拾取、Chromium 保存恢复均有直接自动化覆盖。

## 2026-07-15 城墙直墙轴二次校正

- 用户新截图显示：穿过城门的 N↔S 墙网拓扑已连接，但每段仍沿相反的屏幕斜轴延伸。
- 重新对照 `wall-autotiles-4x4.png` 与正式相机投影后确认：N↔S 应取 row 0 / column 1（屏幕左下→右上），E↔W 应取 row 0 / column 2；上次实现把两张斜向直墙帧对调。
- 红灯：先修改 `runtime-assets.test.ts`，新增“城门南北轴取左下到右上的直墙帧”断言；17 项中 2 项按预期失败，实际 N↔S 返回 column 2。
- 绿灯：只交换 mask `0101` 与 `1010` 的直墙帧映射；`runtime-assets.test.ts`、`wall-autotile.test.ts`、`wall-protocol.test.ts`、`wall-building.test.ts` 共 4 文件 39 项全绿。
- 新增 Chromium `WALL-13 城门南北直墙沿同一屏幕轴连续延伸`；墙体 E2E 共 5 项全绿。
- 正式截图 `/tmp/empire-wall-direction-fixed.png` 已目检：城门两侧 8 段墙体、墙面和垛口沿同一屏幕轴连续，无横板阶梯。

## 2026-07-15 四向拐角素材补齐

- 用户闭合矩形截图进一步证明四种拐角中仅上、下两个正确；按世界坐标到屏幕的等距投影核对后，错误的是 `ES (0110)` 左侧 `>` 角与 `NW (1001)` 右侧 `<` 角。
- 逐帧检查原始 `wall-autotiles-4x4.png` 后确认，现有 4×4 图集没有这两种侧向轮廓；仅交换 frame 4 / 7 无法得到正确结果，因此保留 `NE (0011)`、`SW (1100)` 两个已正确图集帧，只为缺失方向增加独立 v7 素材。
- 使用内置图像生成模型，以 v6 图集作为材质、光照、垛口和等距视角参考，分别生成“顶点在左、两臂向右”的 `wall-corner-es.png` 与“顶点在右、两臂向左”的 `wall-corner-nw.png`；随后用 imagegen 技能自带 `remove_chroma_key.py` 去除绿色背景并收缩 1 px 边缘。两张最终 PNG 均为 1254×1254、带 alpha，存入 `apps/game-web/public/assets/runtime/v7/defense/`，未覆盖原图集。
- 红灯：先在 `runtime-assets.test.ts` 增加 `wallVisualForMask` 的四角验收断言；18 项中 1 项按预期失败，报错为 `wallVisualForMask is not a function`。
- 绿灯：新增 `WALL_SIDE_CORNER_ASSETS` 与 `wallVisualForMask`，渲染器只在旋转后的掩码为 `0110` / `1001` 时切到独立素材，其余 14 种掩码继续使用原图集。`runtime-assets.test.ts`、`wall-autotile.test.ts`、`sprite-grounding.test.ts`、`person-motion.test.ts` 共 4 文件、35 项全绿。
- 新增 Chromium `WALL-14 闭合城墙的四个拐角朝向墙体内部连接`；`twenty-eighth-wall.spec.ts` 现有 6 项全部通过（53.7s），包含保存恢复、墙路互斥、键盘修墙、直墙轴、闭合四角和素材失败降级。
- `packages/renderer` 与 `apps/game-web` TypeScript 检查通过；本次 4 个 TypeScript 文件 ESLint 与 Prettier 检查通过。
- 正式截图 `/tmp/empire-wall-corners-fixed.png` 已目检：闭合矩形的左、右角分别朝相邻两段墙体收口，上、下角保持原来的正确方向，无外翻和断接。

## 2026-07-15 左右拐角素材一致性返修

- 用户近景截图 `codex-clipboard-1a38e1bf-b32e-4f57-85f7-009ce8173ba5.png` 作为本轮视觉红灯：左右角方向已正确，但 v7 素材的砖块更细、垛口更密、墙臂过长且明暗/描边与 v6 直墙不一致，闭合墙网两侧出现明显“低矮长条”。
- 用户反馈已明确实现方向，无新增阻塞项；WALL-DIR-05 的 Then 收紧为近景可观察的一致性合同：墙高、墙厚、砖块尺度、垛口数量与间距、描边、黄灰色阶和单格臂长均须匹配 v6。
- 先按 imagegen 内置模式做 style-transfer 与 precise-object-edit 候选：以 v6 图集为唯一风格参考、v7 为轮廓参考，并要求 313×313 单帧密度与半格墙臂。透明化和近景接入后，候选虽比 v7 接近，但仍重新解释砖块且长臂遮挡相邻直墙，因此未作为最终素材交付。
- 又验证了“左右角退化为 v6 原生角柱”的同源方案；自动化通过，但正式截图显示角柱与相邻墙仍有半格断口，视觉验收不通过，未保留该实现。
- 最终结构改为同源像素拼接：`assets/source/scripts/assemble-wall-side-corners.mjs` 在浏览器 Canvas 中直接截取 v6 两张斜向直墙的左/右半帧，以相反遮挡顺序合成 314×314 的 `>` / `<` 角。最终 PNG 的墙砖、垛口、描边、色阶和像素密度均逐像素来自 v6，不再依赖生成模型重绘；产物写入 `apps/game-web/public/assets/runtime/v8/defense/`。
- TDD 红灯：先把 `runtime-assets.test.ts` 改为要求 v8 同源拼接素材；19 项中 1 项按预期失败，实际仍返回 v6 角柱 atlas frame。绿灯后相关 4 文件、36 项全绿。
- Chromium `twenty-eighth-wall.spec.ts` 6 项全部通过（1.2m）；WALL-14 扩大为 8×7、26 段闭合墙网，正式截图 `/tmp/empire-wall-corners-fixed.png` 和近景裁图 `/tmp/empire-wall-corners-v8-composite-crop.png` 已目检：左右角方向保持正确，与相邻直墙连续，材质/垛口不再跳变。
- `packages/renderer` 与 `apps/game-web` TypeScript 检查通过；本轮 TypeScript、E2E、素材脚本和测试配置的 ESLint / Prettier 检查通过。

## 2026-07-15 墙体交汇锚点与分叉拓扑返修

- 用户近景反馈作为新的视觉红灯：同源材质已基本一致，但转角和相邻直墙仍有明显错位，且墙网缺少可辨识的 T 字形与十字形设计。
- 图集审计确认当前 `1110` 掩码误取普通拐角 frame 9，`1111` 也未取图集中最完整的十字 frame 15；同时所有帧仍按透明画布外框中心放置，没有声明墙轴交汇点，导致不同轮廓的内部连接中心发生跳位。
- WALL-DIR-02 收紧为四种 T 形与十字形的专用轮廓合同；新增 WALL-DIR-06，要求所有墙体拓扑以逻辑地格中心为共同交汇锚点。Chromium 新增 `WALL-02、15` 近景布置，固定展示四种 T 形和一个十字形。
- TDD 红灯：`runtime-assets.test.ts` 先要求九种多臂掩码使用独立同源拼接素材，并把 `1110` / `1111` 的图集兜底帧修正为 frame 14 / 15；20 项中 3 项按预期失败，分别暴露素材集合缺失、旧侧角路径仍在使用以及错误帧号。
- 绿灯：扩展 `assemble-wall-side-corners.mjs`，把 v6 两张斜向直墙按 N/E/S/W 裁成四个半墙臂，所有半墙都终止于 314×314 画布中心；确定性生成四角、四 T 与十字共 9 张 `wall-junction-*.png`。`wallVisualForMask` 对九种多臂掩码统一选用该集合，孤立/端点/直墙仍沿用 v6 图集。
- 相关单元回归 4 文件、42 项全绿；renderer 与 game-web TypeScript、ESLint、Prettier 均通过。Chromium 城墙完整回归 7 项全绿（1.4m），覆盖城门连接/门洞道路、墙路互斥、键盘连续修墙、两轴直墙、闭合四角、四种 T/十字以及素材失败降级。
- 正式截图 `/tmp/empire-wall-corners-fixed.png`、`/tmp/empire-wall-junctions.png` 和近景 `/tmp/empire-wall-junctions-crop.png` 已目检：闭环四角的墙脚/垛口线连续，四种 T 均呈三条独立墙臂，十字中心四臂在同一点闭合。
