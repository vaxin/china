# 四方向八帧人物行走切图

本目录保留了 4×8 人物 sprite 的生成、返工和自动验收记录。最终运行时成品位于：

- `apps/game-web/public/assets/runtime/v5/people/farmer-walk-4x8.png`
- `apps/game-web/public/assets/runtime/v5/people/artisan-walk-4x8.png`
- `apps/game-web/public/assets/runtime/v5/people/merchant-walk-4x8.png`
- `apps/game-web/public/assets/runtime/v5/people/official-walk-4x8.png`

## 固定规格

- 整图：2048×1024，透明 PNG
- 网格：4 行 × 8 列；单格 256×256
- 行方向：south-east、south-west、north-west、north-east
- 列动作：接触、下沉、经过、抬起、反脚接触、反脚下沉、反脚经过、反脚抬起
- 所有格子的脚底基线相同；人物身份、服饰、比例、光线固定
- 前后方向必须分别绘制；仅允许在角色装备左右对称且人工复核通过时复用左右镜像

## 最终提示词模板

使用 `walk-4x8-pose-guide-v2.png` 作为构图控制图，并按职业替换方括号内容：

> Create one production-ready 4 rows by 8 columns sprite sheet for a single [PROFESSION] in an ancient Chinese farming settlement game. Preserve exactly the guide image's 32-cell grid, body placement, foot baseline, pose progression, and direction order. Row 1 faces south-east/front-right. Row 2 faces south-west/front-left. Row 3 faces north-west/back-left. Row 4 faces north-east/back-right. Across every row, columns 1–8 are one seamless walk cycle: left-foot contact, recoil, passing, high point, right-foot contact, recoil, passing, high point. Both legs must visibly alternate; arms counter-swing naturally; the torso and head remain stable. Keep the same adult character, face, hairstyle, body proportions, clothing, equipment, camera angle, scale, lighting, palette, and exact foot baseline in all 32 cells. Full body visible in every cell with generous transparent margin. Traditional hand-painted isometric Chinese strategy-game sprite art, crisp silhouette, subtle ink-and-gouache texture, no modern objects. Flat vivid chroma-green background only, with no grid lines, labels, text, shadows, floor, scenery, props detached from the body, duplicated limbs, extra people, cropped feet, or merged cells.

职业约束：

- farmer：深蓝灰短褐、棕裤、绑腿、布鞋，空手
- artisan：暗红短褐、棕裤、腰间小工具袋，不持工具
- merchant：蓝灰短褐、棕裤，背负固定在身体上的对称圆竹篓
- official：低调青绿色长袍、深色腰带、布鞋，不持物

## 自动处理与验收

1. `build-walk-pose-guide.py` 生成无标记姿态控制图。
2. 内置图像生成根据控制图生成候选；不合格时只针对方向顺序、肢体交替或碎片问题改写提示词重试。
3. `normalize-person-sprite-sheet.py` 去色键、统一尺寸和脚底基线，并清除与主体分离的小碎片；使用 `--align-body-axis` 将每格经过裁剪的躯干/骨盆轴对齐到 `x=128`，避免手脚摆动改变外接框时产生误对齐。
4. 对四个方向做人物头部、胸背朝向的视觉审计；本批生成结果的两个背面方向行曾被生成器互换，发布前已统一交换为 `south-east / south-west / north-west / north-east`。
5. `verify-person-sprite-sheet.py` 检查 2048×1024 尺寸、32 格占用、脚底基线、身体轴漂移、身高漂移、断裂组件、近重复帧、方向差异和相邻动作变化，并输出逐方向 GIF、联系表和 JSON 报告。身体轴最大允许误差为 2px，本批成品最大误差为 0.63px。

最终四套运行时资源均为 `passed: true`，无 errors、无 warnings；汇总见 `qa-runtime/summary.json`。
