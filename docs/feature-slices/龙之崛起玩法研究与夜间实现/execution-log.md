# 《皇帝：龙之崛起》玩法研究与夜间实现验收：执行记录

对应验收文档：[acceptance.md](./acceptance.md)

| 时间 | 实际路径或来源 | 本轮用途 |
| --- | --- | --- |
| 2026-07-10 | `/Users/bytedance/.codex/skills/acceptance-tdd-full-cycle/SKILL.md` 及 TDD、WHAT、反模式、ATDD 模板引用 | 夜间持续任务的验收外循环与逐切片红绿纪律 |
| 2026-07-10 | `/Users/bytedance/.codex/plugins/cache/openai-primary-runtime/pdf/26.709.11516/skills/pdf/SKILL.md` | 官方手册 PDF 保存、抽取和视觉核对规则；源站拒绝命令行下载后改用可检索镜像 |
| 2026-07-10 | `https://manualzilla.com/doc/5892188/emperor-manual` | 原作手册农业、食物品质、劳动力、产业、贸易、税收、宗教、美观、娱乐、军事和建筑表 |
| 2026-07-10 | `https://sierrachest.com/gfx/games/Emperor/box/02_manual2.pdf` | Sierra 原始手册 PDF 索引与页码基线；本地下载返回 403，未伪装为已保存文件 |
| 2026-07-10 | `https://gamefaqs.gamespot.com/pc/553878-emperor-rise-of-the-middle-kingdom/faqs/19423` | 2002 综合攻略的实战农业、产业、价格和战役细节 |
| 2026-07-10 | `https://gamefaqs.gamespot.com/pc/553878-emperor-rise-of-the-middle-kingdom/faqs/54453` | 随机行者、供需、积压与仓储边界行为 |
| 2026-07-10 | `https://en.wikipedia.org/wiki/Emperor%3A_Rise_of_the_Middle_Kingdom` | 跨朝代、外交军事、纪念建筑和战役目标概览 |
| 2026-07-10 | `packages/protocol/src/index.ts`、`packages/simulation/src/index.ts`、`apps/game-web/src/App.tsx` | 识别当前单一 `foodStock`、固定 3 tick 产粮与 UI/存档改造边界 |
| 2026-07-11 00:19 | `packages/simulation/src/crop-calendar.ts`、`multi-crop-production.test.ts`、既有物流/市场/Worker 回归 | 完成五种作物月份与季节收获 TDD；全量 190 个既有测试恢复通过 |
| 2026-07-11 00:32 | `assets/source/imagegen/crops/*-chroma.png`、`apps/game-web/public/assets/runtime/v3/crops/*.png` | 使用内置 ImageGen 和既有农田风格锚点生成五种独立农田，再以本地 chroma-key 工具转为透明运行素材 |
| 2026-07-11 00:40 | `packages/renderer/src/runtime-assets.ts`、`apps/game-web/src/crop-catalog.ts`、`apps/game-web/src/App.tsx` | 接入作物材质、作物选择条、历法 HUD、种植构成和按作物建造命令 |
| 2026-07-11 00:45 | `apps/game-web/e2e/ninth-vertical-slice.spec.ts`、`/tmp/empire-ninth-five-crops.png` | Chromium 验收五作物选择/渲染/七月收获/存档恢复/相机旋转，1/1 通过 |
| 2026-07-11 01:21 | `packages/simulation/src/food-quality.ts`、`food-diversity-logistics.test.ts`、协议与持久化回归 | 完成分品类粮食守恒、旧总粮迁移、市场补齐品类与住户实际配送品质；208/208 通过 |
| 2026-07-11 01:29 | `apps/game-web/src/App.tsx`、`apps/game-web/e2e/ninth-vertical-slice.spec.ts` | HUD 接入市供/住膳；两种作物季节入市、普通品质与刷新恢复 Chromium 通过 |
| 2026-07-11 01:32 | 全量 Chromium 27 用例 | 首轮 26/27；唯一旧固定周期用例被季节制正确击中，改为等待小麦下一年七月后单测 1/1 通过 |
| 2026-07-11 01:43 | `packages/simulation/src/labor-economy.ts`、`labor-policy-command.test.ts`、协议策略命令 | 完成季节岗位、工资参与率、薪耗、行业优先分配与可选存档策略；核心测试通过 |
| 2026-07-11 01:50 | `apps/game-web/e2e/tenth-vertical-slice.spec.ts` | Chromium 验证白菜八月农忙、服务优先、节俭工资、缺工变化和刷新恢复，1/1 通过 |
| 2026-07-11 02:02 | `packages/simulation/src/hemp-industry.test.ts`、产业建筑协议与物流 | 九月收麻、织坊加工、市场满仓、断路积压/修复及住宅衣物配送 TDD 通过 |
| 2026-07-11 02:15 | `assets/source/imagegen/industry/*`、`runtime/v3/industry/*` | 使用既有农田/市场风格锚点生成麻田与织坊真实透明素材并接入渲染器 |
| 2026-07-11 02:19 | `apps/game-web/e2e/eleventh-vertical-slice.spec.ts`、`/tmp/empire-eleventh-hemp-industry.png` | Chromium 验证麻田→织坊→市场、素材、旋转和存档恢复，1/1 通过 |
| 2026-07-11 02:33 | `packages/simulation/src/military-logistics.test.ts`、军事建筑协议与物流 | 武器三 tick 生产、逐兵训练、满营积压、城门部署/断路恢复 TDD 通过 |
| 2026-07-11 02:42 | `assets/source/imagegen/military/*`、`runtime/v3/military/*` | 生成兵器作坊与步兵营真实透明素材并接入渲染器 |
| 2026-07-11 02:46 | `apps/game-web/e2e/twelfth-vertical-slice.spec.ts`、`/tmp/empire-twelfth-city-defense.png` | Chromium 验证兵器成军、城门断路取消部署、补路与存档恢复，1/1 通过 |
| 2026-07-11 02:54 | `packages/simulation/src/era-capabilities.ts`、`era-tick-revision.test.ts` | 建立四阶段能力表并让 12 tick 跨年产生可持久化 revision |
| 2026-07-11 03:00 | `apps/game-web/e2e/thirteenth-vertical-slice.spec.ts` | Chromium 验证元年→二年、纸张政务节点、自动保存与刷新恢复，1/1 通过 |
| 2026-07-11 03:03 | 全量 Chromium | 31/31 通过，新增 HUD、加长建造栏、季节物流、产业/军事/年代与旧切片同时回归 |
| 2026-07-11 03:17 | `packages/simulation/src/granary-policy.test.ts`、`fourteenth-vertical-slice.spec.ts` | 粮仓按品类接收/拒收、积压、自愈、存档；核心 239 测试与 Chromium 1/1 通过 |
| 2026-07-11 03:29 | `packages/simulation/src/shennong-offering.test.ts`、`fifteenth-vertical-slice.spec.ts` | 真实扣粮供奉、好感农业加成、跨年衰减与网页恢复；核心 243 测试与 Chromium 1/1 通过 |
| 2026-07-11 03:43 | `packages/simulation/src/diplomacy.test.ts`、`sixteenth-vertical-slice.spec.ts` | 外交礼物扣库、三 tick 使者、关系门槛通商与途中/结果存档；核心 246 测试与 Chromium 1/1 通过 |
| 2026-07-11 03:55 | `packages/simulation/src/feng-shui.ts`、`feng-shui.test.ts`、`seventeenth-vertical-slice.spec.ts` | 五行地格、建筑相生相克与独立宜居来源解释；浏览器验证建井实时改变相邻地块宜居，单切片 1/1 通过 |
| 2026-07-11 04:02 | `https://sierrachest.com/gfx/games/GEC3/box/01_manual6.pdf` | 复核原作按月入账、税率、住宅等级/宜居度和行政缺工影响税收，以及征税降低 popularity 的政府规则 |
| 2026-07-11 04:21 | `government-economy.ts`、`government-economy-integration.test.ts`、`eighteenth-vertical-slice.spec.ts`、`runtime/v3/government/tax-office.png` | 税务署道路覆盖、按户税基、缺工效率、税率、工资/税收同账本与存档闭环；核心 255 测试、Chromium 1/1 通过 |
| 2026-07-11 04:28 | `https://sierrachest.com/gfx/games/GEC3/box/01_manual6.pdf` | 复核音乐学校产生乐师、市场/戏台作为演出场所、娱乐依赖覆盖与行者而非全城增益 |
| 2026-07-11 04:46 | `entertainment-walker.test.ts`、`nineteenth-vertical-slice.spec.ts`、`runtime/v3/entertainment/music-school.png` | 乐师逐格走向市场、仅覆盖经过住宅、断路消失与覆盖过期；独立 Chromium 1/1 通过 |
| 2026-07-11 04:49 | `https://sierrachest.com/gfx/games/GEC3/box/01_manual6.pdf` | 复核贸易伙伴独立商站、进出口开关/价格、商站存储和商队单次最多 8 载荷规则 |
| 2026-07-11 05:01 | `trade-export.test.ts`、`twentieth-vertical-slice.spec.ts`、`runtime/v3/commerce/trading-post.png` | 通商/连路/劳力/实物四重门槛、三月商队、衣物守恒与国库入账；核心 263 测试、Chromium 1/1 通过 |
| 2026-07-11 05:12 | `new-year-festival.test.ts`、`twenty-first-vertical-slice.spec.ts` | 二月时节、娱乐建筑、实粮、国库四重门槛；成功扣粮 1/钱 20、民心 +10，同年防重；单切片 Chromium 1/1 通过 |
| 2026-07-11 05:16 | `twenty-second-vertical-slice.spec.ts` | 暂停冻结 Worker tick、4× 权威推进；Chromium 1/1 通过 |
| 2026-07-11 05:42 | `migration-attractiveness.test.ts`、`labor-economy.ts` | 民心与三档工资共同控制新流民迁入门槛；纯函数和宅基地集成 2/2 通过 |
| 2026-07-11 05:46 | `twenty-third-vertical-slice.spec.ts` | 35 民心常薪停迁、优厚工资迁引升至 55 后流民出现；Chromium 1/1 通过 |
| 2026-07-11 09:34 | `packages/protocol/src/game-protocol.test.ts` | 乐师存档引用/道路/唯一性校验与早期 v6 财政字段默认迁移；协议 74/74 通过 |
| 2026-07-11 09:35 | 全仓静态与单元门禁 | Prettier、ESLint、TypeScript、生产构建通过；Vitest 40 文件、278/278 通过 |
| 2026-07-11 09:37 | 全量 Chromium 回归 | 41/41 通过，覆盖二十三条纵向切片及跨切片断路、自愈、旋转、存档和权威时间行为 |
| 2026-07-11 09:37 | Firefox / WebKit 烟测 | 两浏览器的首次 3D 沙盘加载与相机移动旋转后准确建造，共 4/4 通过 |
