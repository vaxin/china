# 第三十垂直切片：郊野建设范围与城墙方向修正结构设计

## 决策

保留旧城中央坐标 `0...31` 和城门 `(0,15)` 不动，在当前快照增加独立 `terrain` 合同描述可玩法世界：原点 `(-32,-32)`、宽高 `96×96`、固定 seed 和最大可建坡度 `0.12`。这样 v1～v7 城市无需整体平移；新设施可以使用负坐标或 `32...63` 外城坐标。

高度与坡度采样从 renderer 提升到 protocol 的纯函数模块。simulation 用它做权威放置判断，renderer 用同一结果生成 mesh、拾取和对象 Y 坐标，Web 只展示 `valid / occupied / steep-slope / out-of-bounds`。存档升为 v8，旧档只补默认 `terrain`，其他状态不变。

墙体仍使用现有 4×4 手绘图集。修正点不是邻接算法，而是“世界掩码 → 屏幕轴 → 实际图集帧”的查表；直线帧按真实画面方向选择，不能再把 `N|S` 固定映射到截图中的横墙帧。

## 数据流

```text
鼠标 / 键盘命中郊野 mesh
        ↓
世界坐标 tile（-32...63）
        ↓
共享 terrain sample / footprint slope
  ├─ 跨界 → out-of-bounds
  ├─ 最大坡度 > 0.12 → steep-slope
  ├─ 墙路建筑冲突 → occupied
  └─ 合法 → Worker 原子提交
        ↓
WorldSnapshot v8（terrain + 原坐标对象）
        ↓
renderer 按 elevation 接地 / IndexedDB 保存
```

## 模块边界

### `packages/protocol`

- 保留 `MAP_SIZE = 32` 作为旧城中央台地尺寸；新增 `WORLD_MIN_TILE`、`WORLD_MAX_TILE_EXCLUSIVE`、`WORLD_TILE_SPAN`、`DEFAULT_TERRAIN_CONTRACT`。
- 新增共享 `terrain-topology.ts`：确定性高度、坡度、区域、世界边界、footprint 最大坡度与 tile key。
- 当前坐标 schema 扩到 `-32...63`，冻结 legacy v1～v7 的输入兼容；v8 必须显式携带 terrain。
- `BuildRejectionReason` 增加 `steep-slope`；v7→v8 只补默认地形合同。

### `packages/simulation`

- 所有建筑、道路、城墙和拆除边界使用 terrain bounds，不再把 32 当世界边界。
- 预览与命令共用 footprint 地形判定；路径中任一坡格使整段原子拒绝。
- tile key 使用带原点偏移的 96×96 唯一编码，避免负坐标与中央坐标碰撞。
- 路径、物流、通勤、迁入、乐师和守军继续使用正交 tile 图；坐标扩展不改变距离与业务规则。

### `packages/renderer`

- 郊野 mesh 改为可拾取；中央 ground 与郊野共用世界 tile 换算。
- 网格覆盖整片 96×96 地形，并按采样高度贴地；不再用中央矩形作为建设边界视觉。
- 预览、道路、墙体、建筑根节点和人物根节点读取地形 elevation；坡地预览保持红色。
- 墙体图集映射按直线/转角/T/十字的实际画面方向显式查表；相机 presentation mask 单元测试锁定。

### `apps/game-web`

- 键盘边界扩至 `-32...63`；画布/小地图坐标换算使用 terrain origin。
- `steep-slope` 显示“坡地不可营造”；HUD 继续显示真实世界坐标。
- 不新增地形开关或弹窗，玩家直接在平地营造。

### `packages/persistence`

- 不新增 IndexedDB 表；保存 v8 envelope。
- 覆盖 v7 原位升级、负坐标外城城市刷新恢复和旧城字段不变。

## 接地合同

- tile 高度使用格中心采样；建筑 footprint 取所有占用格中心与外边界角点的最大坡度。
- 道路/墙体的 mesh Y = tile 中心 elevation + 原有微偏移。
- 建筑 sprite 的逻辑脚点 Y = footprint 中心 elevation；只有完整 footprint 低坡度时允许落地，因此无需倾斜建筑。
- 人物在每段道路移动时对起终 tile elevation 线性插值；静止时使用当前 tile elevation。
- 中央 `0...32` 台地采样仍严格为 0，旧城视觉不变。

## 墙体方向修正

```text
世界 N/S 直线 ──相机投影──> 屏幕对角轴 A ──> 图集斜墙帧 A
世界 E/W 直线 ──相机投影──> 屏幕对角轴 B ──> 图集斜墙帧 B
```

端头沿所在轴复用直线帧；四个转角分别绑定四张转角图；T 和十字绑定对应轮廓。相机方位变化只重新选择帧，不修改 `walls` 和 world mask。

## TDD 拆解

1. protocol 红灯：负坐标命令、`steep-slope` 结果、v8 terrain、v7 无损迁移。
2. terrain 红灯：扩展 bounds、稳定 tile key、平谷/高塬/坡地 fixture、footprint 最大坡度。
3. simulation 红灯：外城合法建设、坡地原子拒绝、负坐标互斥/寻路、拆除和计数上限。
4. renderer 红灯：郊野拾取、扩展网格、对象 elevation、人物插值和两轴墙帧映射。
5. persistence 红灯：v8 负坐标保存恢复、v7 补 terrain。
6. E2E 外循环：平移外城修路/墙/建筑、坡地红色拒绝、键盘外城、刷新恢复、两轴直墙截图。

## 兼容与性能

- 不直接改写用户浏览器原存档；load 成功后才按既有事务原位写回 v8。
- 96×96 BFS 上限 9,216 格，仍在当前单 Worker 可控范围；路径 key 和集合查找保持 O(1)。
- 地形仍是一份静态 mesh；扩大拾取与网格不引入逐帧重建。
- 用户工作树存在并行修改，所有编辑局限于本切片文件与直接回归 fixture。
