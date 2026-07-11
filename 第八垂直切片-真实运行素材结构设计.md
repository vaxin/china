# 第八垂直切片：真实运行素材结构设计

## 模块边界

- `apps/game-web/public/assets/runtime/v1/`：浏览器直接请求的版本化 PNG/WebP 与清单。
- `packages/renderer/src/runtime-assets.ts`：强类型资产键、URL、尺寸、脚点锚点和显示比例，不包含模拟状态。
- `packages/renderer/src/index.ts`：根据快照选择资产，建立 billboard/plane；不可见 picking proxy 继续承载地格交互。
- `assets/source/`：仅保存生成源图、风格锚点和提示词，不被生产运行时直接请求。

## 可见层与交互层

```text
WorldSnapshot ──> asset key ──> textured plane / sprite（玩家可见）
       │
       └────────> invisible picking proxy（地格点击、占地、预览）
```

可见层不写回模拟；素材加载成功或失败都不得改变建筑 ID、道路坐标、施工阶段和流民位置。

## 资产键

- `terrain.loess`
- `road.earth`
- `gate.main`
- `house.plot|foundation|frame|roof|complete`
- `building.well|farm|granary|market`
- `villager.walk|build`

每个条目必须包含 URL、源像素尺寸、世界高度、脚点/地面锚点和透明通道要求。测试验证键完整性、URL 唯一性、数值有效性和文件存在性。

## 降级策略

纹理异步加载失败时保留低饱和单色轮廓代理并输出包含资产键和 URL 的错误；不移除拾取代理、不抛出未捕获异常，也不停止 Worker tick。正常路径下代理不可见，避免再次出现方块主体。
