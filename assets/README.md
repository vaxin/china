# Empire 美术资产

本目录按 [美术素材生成与程序切分规范](../docs/standards/美术素材生成与程序切分规范.md) 管理。

- `source/anchors/`：已选风格与角色锚点。
- `source/concepts/`：建模、绑定、动画和材质评审稿，不由运行时代码直接读取。
- `source/generated/`：Image Gen 原始图集和地表生成源，不由运行时代码直接读取。
- `source/prompts/`：生成提示词和版本记录。
- `../apps/game-web/public/assets/runtime/v1/`：通过运行时验收、由浏览器实际请求的透明 PNG 与地表纹理。

任何运行时资产都必须另行通过透明边缘、脚点、世界比例、加载失败和跨浏览器验收；多对象源图集必须先切分成独立文件，不能由游戏临时裁切。
