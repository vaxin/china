# 第五垂直切片验收：执行记录

对应验收文档：[acceptance.md](./acceptance.md)

| 时间 | 实际路径 | 本轮用途 |
| --- | --- | --- |
| 2026-07-10 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/SKILL.md` | 自确认闸门与 TDD 红绿纪律 |
| 2026-07-10 | `实现启动计划.md` | 从既定七类建筑与粮食核心循环选择下一最小切片 |
| 2026-07-10 | `第五垂直切片-验收.md` | 用户持续授权下自确认的验收基线 |
| 2026-07-10 | 农场/粮仓模拟首轮目标测试 | 10 条新增测试中 9 条按预期失败，确认生产与运输尚未实现 |
| 2026-07-10 | v4 协议目标测试 | farm/granary 命令、v3→v4 与 v4 往返共 4 条按预期失败后修绿 |
| 2026-07-10 | persistence v4 回归 | 5 条底层版本断言按预期失败；更新迁移并补 frozen v3、库存往返与坏档隔离后修绿 |
| 2026-07-10 | 临界 revision 回归 | 批量 2 tick 与逐 tick 不等价先复现红灯，再以实际变化预演和原子提交修绿 |
| 2026-07-10 | `pnpm test` | 11 个测试文件、116 条用例通过 |
| 2026-07-10 | `pnpm exec playwright test --project=chromium` | 19 条 Chromium ATDD 全部通过 |
| 2026-07-10 | `pnpm exec playwright test --project=firefox --project=webkit --grep S-01` | Firefox、WebKit 冒烟各 1 条通过 |
| 2026-07-10 | `/tmp/empire-fifth-final.png` | 1280px 农场、粮仓、工具面板与 5×2 HUD 视觉复核 |
| 2026-07-10 | `pnpm typecheck && pnpm lint && pnpm format:check && pnpm build` | 类型、静态检查、格式和生产构建通过 |
| 2026-07-10 | `pnpm test:all` | 116 条单元/集成、19 条 Chromium、Firefox/WebKit 冒烟在同一最终门禁中全部通过 |
