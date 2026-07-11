# 第二垂直切片：结构设计

## 权威状态

- `protocol`：定义当前 v2 世界、旧 v1 存档、道路路径命令、推进时间命令和 Worker 消息边界。
- `simulation`：保存住宅、道路 tile layer、住户与 tick；以入口洪泛得到连通道路，再由住宅边界邻接计算入住。
- `persistence`：写 v2；读 v1 时迁移；保存队列按 revision 串行，拒绝旧 revision 回写。
- `renderer`：道路与入口只是 WorldSnapshot 的投影；拾取仍只命中统一 ground。
- `game-web`：选择住宅/道路工具、调度 1 秒 tick、展示道路数与人口，不自行计算连通或人口。

## 命令与状态流

```text
UI 单击道路格
  -> build-road-path(seq, [tile])
  -> Worker schema 校验
  -> simulation 原子占用检查
  -> revision + 1 / 整条拒绝
  -> renderer 同步 + revision 保存队列

UI 定时器
  -> advance-time(seq, 1)
  -> tick + 1
  -> 入口道路洪泛
  -> 住宅道路服务判定
  -> 住户变化时 revision + 1
  -> HUD 同步；仅 revision 变化时保存
```

## 不变量

1. 道路 tile 唯一、地图内、不能覆盖住宅。
2. 住宅仍保持 ID 唯一、地图内、互不重叠，也不能覆盖道路。
3. 路径只接受上下左右连续且自身不重复的 tile 序列。
4. 住户唯一引用已存在住宅，当前容量固定为 5。
5. 所有外部 Worker 请求与恢复快照先过结构和语义校验。
6. 自动保存只允许更高 revision 排在更低 revision 之后写入。

## TDD 顺序

1. 协议 v2 与 v1→v2 迁移。
2. 道路路径合法、越界、断裂、重叠的纯规则。
3. 入口连通、断开道路、住宅邻接与确定性 tick。
4. Worker 命令往返和保存保序。
5. 渲染道路/入口与 React HUD。
6. Chromium 用户路径、刷新恢复、Firefox/WebKit 启动冒烟。
