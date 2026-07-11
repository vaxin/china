# 道路自动拼接素材 v2

## Image Gen 母材提示词

```text
Use case: stylized-concept
Asset type: source texture for a tile-based historical city-building game road autotile system
Input images: Image 1 is the material and brushwork reference for the existing dirt-and-stone road; Image 2 is the locked visual style reference for palette, lighting, and painterly realism.
Primary request: create one perfectly top-down orthographic straight ancient Chinese compacted-earth road segment that runs vertically from the exact center of the top edge to the exact center of the bottom edge. The road must be only 42% of the canvas width, with worn wheel ruts, a few irregular embedded stones, sparse restrained grass and tiny muted wildflowers along both sides. It must connect seamlessly across the top and bottom boundaries and have no endpoint caps.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for local background removal.
Style/medium: high-fidelity hand-painted realistic game texture, matching the references; warm loess earth, weathered gray stones, restrained green vegetation.
Composition/framing: square tile, exact orthographic top-down view, road centered, generous transparent-side margins after key removal.
Lighting/mood: neutral diffuse daylight, no directional cast shadow.
Constraints: background must be one uniform #ff00ff; road touches top and bottom edges exactly; crisp usable alpha boundary after keying; no text or watermark; do not use magenta in the road.
Avoid: isometric perspective, diagonal road, endpoint, junction, bend, building, person, vehicle, large rocks, dramatic shadow, frame, labels.
```

## 确定性后处理

- `road-base-chroma.png`：Image Gen 原始母材。
- `road-base-alpha.png`：使用内置 Image Gen skill 的 chroma-key 脚本去底。
- `build-road-autotiles.sh`：以 N/E/S/W 四位掩码生成 16 个 512×512 运行贴图；模型不负责猜测出口位置。
