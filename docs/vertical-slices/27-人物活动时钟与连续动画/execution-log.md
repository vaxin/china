# 第二十七垂直切片：人物活动时钟与连续动画执行记录

对应验收文档：[acceptance.md](./acceptance.md)

| 时间       | 实际路径                                                                                                                                                                                                           | 本会话用途                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 2026-07-13 | `/Users/bytedance/.codex/skills/frontend-design/SKILL.md`                                                                                                                                                          | 连续人物表演、动作节奏、单一视觉记忆点与视觉自审约束                          |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/SKILL.md`                                                                                                                                                | 任务计划、ATDD 闸门、TDD 红绿与执行记录约定                                   |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/tdd-core.md`、`testing-style-observable-behavior.md`、`testing-anti-patterns.md`                                                              | 先红后绿、WHAT 断言与 Mock 禁区                                               |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/acceptance-dimensions-general-index.md`、`domain-system-focus-areas.md`、`cross-cutting-coverage-dimensions.md`、`atdd-checklist-template.md` | 验收表、领域判定、UX/恢复查漏与确认格式                                       |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/acceptance-general-user-interactions.md`、`acceptance-general-ui-pages.md`、`acceptance-domain-messaging-async.md`                            | 暂停交互、页面数据流、定时脉冲积压与恢复判据                                  |
| 2026-07-13 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/cceptance-domain-live-realtime.md`                                                                                                            | 实时延迟与降级判据；技能索引文件名存在漏写首字母，已按实际路径读取            |
| 2026-07-13 | `第二十四垂直切片-城市人物连续生命线-验收.md`、`第二十四垂直切片-城市人物连续生命线-结构设计.md`、`第二十四垂直切片-城市人物连续生命线-验收.execution-log.md`                                                      | 对照原人物切片承诺、760ms 插值、双帧职业素材与已暴露的月度耦合缺陷            |
| 2026-07-13 | `美术素材生成与程序切分规范.md`                                                                                                                                                                                    | 对照人物脚底锚点、原地动作与世界位移分工、动作关键帧规范                      |
| 2026-07-13 | `packages/simulation/src/index.ts`、`packages/protocol/src/index.ts`                                                                                                                                               | 定位市民、流民、乐师都只在月度 reconcile 中推进道路格；确认状态与停留拍数契约 |
| 2026-07-13 | `packages/renderer/src/index.ts`、`packages/renderer/src/runtime-assets.ts`、`packages/renderer/src/sprite-facing.ts`、`packages/renderer/src/sprite-grounding.ts`                                                 | 定位 760ms 插值、双帧循环、休息过滤、动作即时切换和朝向仅跟相机的表现层问题   |
| 2026-07-13 | `apps/game-web/src/App.tsx`、`apps/game-web/src/simulation-clock.ts`、`apps/game-web/e2e/twenty-second-vertical-slice.spec.ts`                                                                                     | 对照刚调整的 10 秒/月世界时钟与 Worker 定时命令入口                           |
| 2026-07-13 | `packages/renderer/src/runtime-assets.test.ts`、`apps/game-web/e2e/twenty-fourth-vertical-slice.spec.ts`                                                                                                           | 对照当前素材只验证双帧存在、旧 E2E 依赖月度推进且无法验证连续动作的问题       |
| 2026-07-13 | `apps/game-web/public/assets/runtime/v4/people/*`、`assets/source/imagegen/people/farmer-walk-alpha.png`                                                                                                           | 实际查看步行关键帧，确认两帧姿势差异过小、缺少明确接地/跨步阶段               |

## 当前诊断结论

- Babylon 动作帧循环已经独立于月度时钟，但道路目标只在月度快照到来时更新，因此人物约 0.76 秒移动、其余约 9 秒原地踏步。
- 修复不能只把插值时长改成 10 秒；那会让 4 米道路格以不自然的慢动作滑过。需要 Worker 独立人物活动脉冲 + Renderer 帧间连续表现。
- 当前步行素材和程序动作细节都需改：关键帧姿势差异、行进朝向、重心/脚底、到达后的动作延迟切换缺一不可。

## 验收闸门记录

- 2026-07-13：用户在实际运行旧版本后追问“人正常走了么”并再次明确要求解决长时间不动、突然移动的问题；确认第二十七切片目标并要求立即实施，验收闸门通过。

## 实施与验证记录

- 协议新增严格 `advance-activity` 命令，`pulses` 仅接受 1～10 的整数；先运行协议红灯，再完成解析与联合类型实现。
- 模拟层将市民、流民与乐师的道路移动从月度 `reconcileTick` 拆出；月度 tick 不再移动或倒数人物，独立活动脉冲不改变月份和经济结算。
- 市民通勤、工作 6 拍、休息 3 拍与无岗位巡视改由活动脉冲驱动；巡视沿真实道路确定性向外三步再折返。
- Web 端以 2400ms 单飞定时器发送活动脉冲，不追赶后台积压、不逐步写存档；暂停同时冻结权威活动和渲染相位。
- Renderer 将一步铺满 2200ms，移动时强制保持步行动作，抵达后才切工作/待机；补充位移朝向镜像、脚步双帧、身体起伏、重心摆动、工作循环、休息可见与减少动效分支。
- 针对协议、模拟、旧迁徙/市民/乐师闭环和渲染动作共运行 126 项相关测试，全部通过；全仓类型检查、定向 ESLint 与生产构建通过。
- Chromium E2E `twenty-seventh-person-activity.spec.ts` 通过：月历 tick 未变时画面帧持续变化，市民完成最后通勤步并切换为工作。
- 在用户现有 36 户存档的本地页面中实测连续帧和跨活动脉冲画面均发生变化，暂停/恢复后恢复到 1×；浏览器控制台无错误。
- 完整单元套件现为 342/343 通过；唯一失败是任务开始前已存在的 `migration-diagnostics.test.ts`“迁引不足提示优先级”，与人物活动改造无关。

## 二次视觉验收与修正

- 2026-07-13：用户提供真实游戏截图，证明第一版虽已连续位移，但同屏人物仍保持同一姿势，远景表现仍是贴纸滑行；MOVE-09 视觉验收判定失败并回到 TDD 修复。
- 对照实际 16 张职业步行素材后确认左右跨步原画存在，根因是所有人物共用动画起始相位、240ms 切帧过快，且步态与地面位移没有承重脚定植关系。
- 步行关键姿势保持时间调整为 420ms，远景身体起伏与压步伸缩增强；为每个稳定人物键生成确定性的动画相位，使同屏人群同时呈现左右跨步，不再整齐换腿。
- 每个半步加入屏幕空间反向脚底定植补偿：人物根节点前进时，当前承重脚短暂反向抵消位移，换腿时释放，削弱脚底打滑观感。
- 新增“人群不锁步”“姿势可读时长”“压步伸缩”“脚底定植”红绿测试；渲染、素材与人物活动 25 项相关测试、全仓类型检查、定向 ESLint、生产构建通过。
- Chromium P27 E2E 再次通过；因页面新增实时城域图画布，验收选择器同步收窄至 `game-canvas`。开发服务已重启在 4173，用户存档页面已刷新且控制台无错误。

## 四方向 sprite sheet 决议

- 2026-07-13：用户明确指出不同道路方向需要不同步态，并确认“每个职业做成一张 sprite 切图”。MOVE-09 修订为四职业各一张 4 行 × 8 列 sheet，共 4 张源图、128 个逻辑步行帧；该结论取代此前“两张散帧 + 程序补偿”的完成口径。
- 图像生成以现有 `farmer/artisan/merchant/official-walk-0/1.png` 为职业身份和古代中国手绘写实风格参考；先生成统一洋红键色背景的规则 sheet，再去背、切片 QA 并接入 UV 播放。
