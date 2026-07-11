# Runtime Pack v01 · Image Gen 提示词记录

生成方式：Codex built-in Image Gen。日期：2026-07-10。所有成品先生成到 `$CODEX_HOME/generated_images`，再复制到项目、去除洋红底、逐格切分和透明边缘收缩；运行时不读取源图集。

## 公共建筑与道路图集

参考：`anchors/style_anchor_city_v01.png`。

> Production sprite source sheet for an isometric 2.5D web city-building game. Match the mature hand-painted realism, historical Chinese materials, 45-degree camera, realistic proportions, warm late-afternoon light, muted earth colors and blue-gray roof tiles of the reference. On a perfectly flat solid #ff00ff chroma-key background, arrange exactly six isolated assets in a 3×2 atlas: fortified stone-and-timber city gate, traditional stone well, fenced vegetable/wheat farm, raised round timber granary, open timber market with faded vermilion canopy, and a packed-earth/irregular-stone road tile. Consistent scale and light; no people, text, UI, borders, watermark, shadows or magenta inside assets.

## 住宅五阶段图集

参考：`concepts/residential_construction_reference_v01.png`、`anchors/style_anchor_city_v01.png`。

> Production sprite source sheet for five construction states of the same 2×2-tile northern Chinese courtyard residence. On flat #ff00ff, arrange a 3×2 atlas: surveyed rope-stake plot, low gray-stone foundation, dark timber frame with bamboo scaffolding, plaster walls with partially installed blue-gray roof, completed lime-plaster courtyard home with dark wood and restrained vermilion; leave the sixth cell empty. Identical isometric camera, footprint, ground anchor, scale and light. High-detail mature hand-painted strategy art; no people, text, UI, border, watermark, shadow or magenta inside assets.

## 流民四帧图集

参考：`concepts/villager_action_reference_v01.png`、`anchors/style_anchor_city_v01.png`。

> Production character sprite sheet preserving one adult male villager identity: dusty blue cross-collar tunic, brown trousers, cloth shoes, tied hair and weathered face. On flat #ff00ff, arrange four full-body sprites in a 2×2 atlas: walking with bundle left step, walking with bundle right step, raising a wooden mallet, striking the mallet. Consistent three-quarter isometric camera, scale, foot anchor and light; realistic adult proportions, not cartoon or chibi; no scenery, text, UI, border, watermark, shadow or magenta inside the character.

## 夯土地表

参考：`concepts/material_palette_reference_v01.png`、`anchors/style_anchor_city_v01.png`。

> One square, perfectly top-down orthographic, seamless tileable packed-loess terrain texture. Fine irregular soil grain, sparse tiny pebbles, subtle dry footprints and compacted patches, low contrast, warm muted ochre-brown. Edge-to-edge, uniform scale and lighting; no perspective, horizon, grid, roads, large grass, buildings, people, text, border, watermark, directional shadow, horizontal stripes or vignette.

## 后处理参数

```text
remove_chroma_key.py
--auto-key border
--soft-matte
--transparent-threshold 28
--opaque-threshold 180
--despill
--edge-contract 1
```

公共建筑、住宅和人物分别按 3×2、3×2、2×2 网格切分；每格再按 alpha 边界 trim 并加透明 padding。道路菱形切片经透视逆变换为 512×512 顶视贴图。最终运行文件位于 `apps/game-web/public/assets/runtime/v1/`。
