# Music Universe：3D 工具与研究筛选

核对日期：2026-10-02。用途：技术选型参考。采纳顺序见 [3D 工具采纳计划](../3d-tools-adoption-plan.zh-CN.md)，当前任务顺序以 NOW.md 为准。

## 结论

优先复用现有 Three.js / React Three Fiber / Rapier 技术栈中的编辑组件，再比较可导出普通模型的生成工具。世界生成值得做独立小样验证。供应商宣传的质量、速度和成本尚未在本项目实测。

本次只做官方文档、仓库、论文和项目现状核对。未调用付费生成、安装依赖、导入新资产、运行工具样例或修改产品代码。以下“建议”均为分析判断。

## 1. 当前最直接的编辑轮子

### Drei PivotControls / TransformControls

- 官方能力：平移、旋转和缩放操作柄；PivotControls 提供拖拽开始、过程、结束回调及受控矩阵模式。
- 本项目已有 @react-three/drei；具体安装版本的行为仍须验证。
- 建议用途：直接拖动 Memory Archive，保留坐标输入供精确编辑和键盘操作。
- 接入条件：结果写回 MusicWorldProject；一次完整拖动形成一次撤销记录；渲染与碰撞同时更新。
- 来源：[PivotControls](https://drei.docs.pmnd.rs/gizmos/pivot-controls)、[TransformControls](https://drei.docs.pmnd.rs/gizmos/transform-controls)。

### Triplex

- 官方能力：可视化编辑 React / R3F 组件，属性驱动面板，保存回实际源码。
- 建议用途：开发者摆场景、调组件和搭原型。
- 边界：它编辑源码；面向音乐人的产品编辑器需要保存项目数据。评估其交互设计与组件模式有价值。
- 来源：[官网](https://triplex.dev/)。

### Theatre.js

- 官方能力：关键帧序列与音频同步，允许提供自己的音频图。
- 建议用途：研究镜头、灯光和颜色曲线的创作界面。
- 接入成本：现有项目已有音频生命周期及统一时间线；须解决数据转换和时间权威，避免两个播放系统各自推进。
- 来源：[音频同步](https://www.theatrejs.com/docs/latest/manual/audio)、[Sequence API](https://www.theatrejs.com/docs/latest/api/core)。

## 2. 单体模型生成：优先比较低模输出

### Tripo P2 / H3.1

- 当前官方文档列出 P2-20260801；P2 可控制面数，三角面范围 48–50,000，四边面范围 48–25,000。
- H3.1 文档提供文本、图片、多视图输入及 Mesh + PBR 输出；高精度与低模应分别比较。
- 本项目已有 Tripo 内部候选生成脚本，文档示例使用 P1-20260311。评估 P2 可复用现有候选审核流程；本次未检查全部请求参数兼容性。
- 建议用途：记忆树、终端、档案馆等主角道具。固定风格参考图，再生成模型，能让比较更明确。
- 来源：[P Series 图生模型](https://developers.tripo3d.ai/en/docs/generation-image-to-model/p)、[H3.1](https://developers.tripo3d.ai/en/models/v3-1)、[API 能力](https://developers.tripo3d.ai/en/docs/introduction)。

### Meshy 7.1 / Smart Topology

- 当前 API 文档将 latest 指向 Meshy 7.1，并将 meshy-7 标为弃用。
- Smart Topology 使用 meshy-t2，支持分离部件和指定面数，范围 100–15,000；此外提供低模、贴图、重拓扑、骨骼和动画流程。
- 建议用途：与 Tripo 同图对比，尤其检查模型是否便于修改、角色是否便于绑定骨骼。
- 比较时分别标记标准模型和 Smart Topology，避免把两种输出能力混为一谈。面数参数属于目标值，实际输出须检测。
- 来源：[Image to 3D API](https://docs.meshy.ai/en/api/image-to-3d)、[API 概览](https://www.meshy.ai/api)。

### TRELLIS.2

- 官方提供代码与权重；图生 3D、PBR 材质和复杂几何是其重点。模型与代码采用 MIT，依赖存在单独许可。
- 官方安装条件：仅在 Linux 测试，需要至少 24 GB 显存的 NVIDIA GPU，已验证 A100/H100。
- 建议用途：云端或离线高质量资产候选。RTX 4050 支持档的网页性能结果不能用作本地生成能力证据。
- 来源：[官方仓库与安装条件](https://github.com/microsoft/TRELLIS.2)、[微软中文介绍，2026-01-22](https://www.microsoft.com/en-us/research/articles/trellis-2/)。

## 3. 整体场景生成与高斯场景工具

高斯场景通过大量带颜色的空间点重建视觉。它的可见表面、可编辑对象和碰撞几何需要分别检查。

### Marble + Spark

- Marble 支持生成、编辑、扩展和组合世界；官方描述可导出高斯场景、视觉网格和粗碰撞网格。
- Spark 是面向 Three.js 的高斯渲染库，可以与现有网页 3D 场景结合。
- 建议用途：先验证一个远景或小型记忆空间，保持交互地标为独立模型。
- 验证问题：体积、帧率、近看质量、光照变化、交互物体遮挡、碰撞贴合度及项目再导入后的可重现性。
- 已有资产构建管线主要接受普通模型；高斯格式接入需要额外资产类型与预算处理。
- 来源：[Marble 官方说明](https://www.worldlabs.ai/blog/marble-world-model)、[产品入口](https://marble.worldlabs.ai/)、[Spark](https://sparkjs.dev/)。

### HY-World 2.0 / 2.1

- 官方仓库记录：2026-05-18 发布世界生成推理代码及 WorldStereo 2.0 权重；2026 年 7 月产品更新到 2.1。
- 接受文本、图像、多视图或视频，产生网格或高斯表示。可参考其全景、轨迹规划、场景扩展与组合流程。
- 建议用途：与 Marble 对比小型场景。开源代码与权重、产品版本和商用许可须各自核对，仓库采用自定义许可。
- 来源：[官方仓库](https://github.com/Tencent-Hunyuan/HY-World-2.0)。

### SuperSplat 3.0

- 免费开源高斯场景编辑工具，可检查、裁剪、调色、优化和导出。
- 官方 3.0 发布说明：编辑器重写为 WebGPU，提供流式导出；2.x 分支仍保留。
- 建议用途：外部资产制作和清理。它的编辑器运行要求无需传递给 Music Universe 的播放器。
- 来源：[官方文档](https://developer.playcanvas.com/user-manual/gaussian-splatting/editing/supersplat/)、[3.0 更新说明](https://blog.playcanvas.com/new-in-supersplat-editor-3-0-rebuilt-on-webgpu/)。

### Atlas

- World Labs 于 2026-09-01 发布，统一处理文本、图像、视频和 3D，研究生成、重建与模拟。
- 核对时 Marble 首页仍展示 Atlas 等待名单。暂未据此确认本项目可调用的稳定生产接口。
- 建议用途：观察后续开放情况，近期实验采用已能导出的 Marble 路径。
- 来源：[官方发布](https://www.worldlabs.ai/blog/atlas)、[产品入口](https://marble.worldlabs.ai/)。

## 4. 角色、动画和特效组件

### ecctrl / BVHEcctrl

- ecctrl 基于 R3F + Rapier，提供角色控制、坡面/平台支持、动画状态和触控模块。当前仓库还扩展了车辆、无人机和自定义重力。
- BVHEcctrl 使用 three-mesh-bvh 处理三角面碰撞，可在无完整物理引擎时运行。
- 建议：ecctrl 可作为角色控制参考；只有加载体积或碰撞问题成为明确瓶颈时，才验证 BVH 替代方案。
- 已有角色控制和完整物理生命周期的迁移成本须算入；BVH 无法直接替代全部动态刚体行为。车辆和球形重力不进入当前任务。
- 来源：[ecctrl](https://github.com/pmndrs/ecctrl)、[BVHEcctrl](https://github.com/pmndrs/BVHEcctrl)。

### Quaternius Universal Animation Library 2

- 2026 年 1 月资产包，130+ 人形动画，页面提供 FBX / GLB / Blend 并标注 CC0。
- 页面同时区分免费版和 Source 版；130+ 是完整包描述，不能认定全部内容免费获取。
- 建议用途：步行、转身和互动动作。须确认选定版本包含需要的动画，再做骨骼重定向。
- 来源：[原始资产页](https://quaternius.com/packs/universalanimationlibrary2.html)。

### Wawa VFX

- MIT；提供 Three.js 和 R3F 粒子组件、实例化渲染、发射器和多种粒子显示模式。
- 建议用途：记忆粒子、门的开启反馈、终端确认效果。
- 接入条件：粒子从音乐时间重建；跳转和重播结果稳定；减少效果模式有替代反馈。官方优化描述仍需目标设备实测。
- 来源：[作者仓库](https://github.com/wass08/wawa-vfx)。

### ARDY

- NVIDIA / ETH Zürich 的 SIGGRAPH 2026 研究，支持文本、路径、关键帧约束下的交互式人体动作生成，项目页提供代码和模型链接。
- 建议用途：未来离线生成特色动作并烘焙为动画。浏览器部署、导出适配和许可尚未验证。
- 来源：[官方项目页](https://research.nvidia.com/labs/sil/projects/ardy/)。

## 5. 设计产出与可借鉴方法

### Asset Forge / Spline

- Asset Forge 用现成积木组合模型，可导出 glTF；官方允许作品商用，适合当前低模风格的快速设计。
- Spline 可导出 GLB/glTF，支持几何、基础颜色/贴图和变换动画；物理、事件、交互、环境及多种材质效果不能通过该格式完整导出。
- 建议用途：Asset Forge 制作可控场景道具；Spline 做构图与交互概念，导出前逐项检查保真度。
- 来源：[Asset Forge](https://kenney.nl/tools/asset-forge-deluxe)、[Spline 导出说明](https://docs.spline.design/exporting-your-scene/files/exporting-as-gtlf-glb)。

### WorldClaw / Buffalo / Scenethesis

- WorldClaw：2026 年 8 月研究，将语义布局、地形、复用资产、局部生成和渲染检查组合成大场景；强调实例级可编辑资产。
- Buffalo：2026 年 8 月研究，统一 3D 理解、生成、自然语言编辑和部件生成。
- 核对时两个官方仓库主要列出 README 与展示素材，未见完整可运行推理实现或权重交付。将它们列为方法参考。
- Scenethesis：先规划，再生成视觉布局和资产，然后做物理布局优化，最后检查空间一致性。
- 可借鉴流程：音乐段落与创作者意图 → 路线和地标草图 → 复用资产并生成少数重点道具 → 校验遮挡和碰撞 → 写入 MusicWorldProject → 播放截图评审。
- 上述流程是针对本项目的推论；尚未证明这些论文可以自动产出本项目格式。
- 来源：[WorldClaw 论文](https://arxiv.org/abs/2608.05248)、[官方仓库](https://github.com/Tencent-Hunyuan/Hunyuan3D-WorldClaw)、[Buffalo 项目](https://tencent-hunyuan.github.io/Hunyuan3D-Buffalo1.0/)、[Buffalo 仓库](https://github.com/Tencent-Hunyuan/Hunyuan3D-Buffalo1.0)、[Scenethesis](https://research.nvidia.com/labs/dir/scenethesis/)。

## 6. 建议实验顺序与通过标准

以下是提案，尚未执行。当前 Phase 2 优先级继续以 NOW.md 为准。

1. **可撤销的直接拖动编辑**：接入现有 Drei 操作柄，完成 Archive 拖动 → 撤销/重做 → 自动保存 → 刷新 → 导出/再导入。位置、碰撞和项目数据一致；坐标输入与键盘仍可使用。
2. **同图模型对比**：授权参考图、同一造型与相近输出预算，对比 Tripo P2 和 Meshy Smart Topology。记录成功率、花费、人工整理时间、几何/材质、优化后体积和实际截图；不凭单次最佳结果判断胜负。
3. **单个动画或特效验证**：选择一种能改善现有旅程反馈的效果，测试暂停、跳转、重播、减少效果和性能。
4. **一个场景的小样**：在独立预览中比较 Marble / HY-World 的视觉与碰撞。记录加载时间、体积、帧率和再导入一致性；通过后再提正式接入方案。

项目当前资产预算：生成后模型 10 MiB/个，纹理 2 MiB/个，总输出 50 MiB；模型 1K/2K 贴图优先。普通场景和高斯场景分别计量。

资产采纳时记录来源、生成输入授权、模型/服务版本、费用与许可快照，走现有构建和视觉验证流程。开源代码许可、模型权重许可、服务条款和输出资产权利分别记录。

2026-10-02 用户要求更新计划，以上建议已整理到 [3D 工具采纳计划](../3d-tools-adoption-plan.zh-CN.md)。当前优先推进可撤销编辑；工具比较和场景实验按该计划的阶段与执行条件进入后续工作。
