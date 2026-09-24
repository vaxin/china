# 城门半格视觉校正验收执行记录

对应验收文档：[acceptance.md](./acceptance.md)

| 时间 | 实际路径 | 用途 |
| --- | --- | --- |
| 2026-07-14 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/SKILL.md` | ATDD 验收表、闸门与 TDD 流程 |
| 2026-07-14 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/references/tdd-core.md`、`testing-style-observable-behavior.md`、`testing-anti-patterns.md` | 红绿顺序、面向可观察素材契约的断言与 Mock 禁区 |
| 2026-07-14 | `packages/renderer/src/index.ts`、`packages/renderer/src/runtime-assets.ts`、`packages/renderer/src/runtime-assets.test.ts`、`packages/renderer/src/sprite-grounding.ts`、`packages/renderer/src/sprite-grounding.test.ts` | 定位城门由固定格中心渲染，确认可在地面锚定前施加只影响视觉的偏移 |
| 2026-07-14 | `packages/renderer/src/runtime-assets.test.ts` | 先运行 GATE-VIS-01，确认城门缺少半格左移素材契约；补充偏移并复验 |

## 执行结果

- 🔴 初次测试失败：`gate.main` 不含 `placementOffsetTiles: { x: -0.5, z: 0 }`。
- 🟢 `pnpm vitest run packages/renderer/src/runtime-assets.test.ts packages/renderer/src/sprite-grounding.test.ts`：17/17 通过。
- 🟢 `pnpm typecheck` 与本次触及渲染文件的 ESLint 通过。
