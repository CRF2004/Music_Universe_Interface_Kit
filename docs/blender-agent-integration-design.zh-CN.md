# music_universe：Blender Agent 集成设计笔记

> 状态：设计输入，不做实现决策
> 信息截至：2026 年 10 月（软件版本细节可能随更新变化）
> 约束：不写 bpy 脚本、不安装软件、不连接/操作任何服务器；不确定的结论标「待验证」，不编造

## 0. 为什么写这份笔记

三条公开信息在 2026 年 10 月交汇，正好决定了 music_universe 的 agentic Blender 世界骨架该走哪条路：

1. **Blender 官方 MCP**（Blender Lab 项目，5.1+ 实验版）——官方的 agent 接入通道存在了；
2. **Blender 5.3 原生支持 Gaussian splat**（预计 2026-11-10 发布）——新的资产形态进场；
3. **Gemini 4 Argon 的 Blender agent 演示**（2026-10-13，Google Antigravity）——"单 prompt → Blender 建世界"的完整范式被演示出来。

本笔记只回答三件事：MCP 侧哪些动作真实可用、render-and-verify 闭环怎么运转、Blender 和 Tripo 的活怎么分。**呈现路线选项和取舍，不替你拍板选型。**

## 1. 与仓库现状的对齐

- **Schema 层**：`schemas/music-world-project.schema.json`（MusicWorldProject v2），`scene` 节含 `windGarden / environment / objects` 三块，`worldBible`、`timeline`、`assets` 独立成节。**结论：`scene` 节是 bpy 编译的天然输入源**，`worldBible` 是 VLM 验收的意图基准。
- **Adapter 架构**：世界生成走可插拔 adapter（Marble / HY-World）。Blender 应作为新的 adapter 接入，而不是旁路——`scene` → bpy 与 `scene` → Tripo prompt 是同一抽象的两套编译后端。
- **Tripo 现状**（`docs/tripo-asset-generation.md`）：dev-only 创作工具，候选进 `output/tripo-candidates/` 暂存，**永不自动进 manifest**，需 rights review；商用条款限制需另行授权。B1 轮测 Tripo P1 / Rodin / Meshy，Rodin 暂列优先候选。
- **工程哲学**：仓库已有"截图验收"传统（Playwright 真机检查 + 截图留证）。render-and-verify 是同一哲学在 Blender 侧的复用：**render = 截图，VLM = 评审员**。
- **产品红线**（AGENTS.md）：不做通用 3D 桌面/引擎 demo。Blender 产出必须服务于"一首歌 → 一个可交互世界"，最终以 glTF 进 Three.js 运行时——**Blender → glTF → Web 是硬约束**，任何在 Blender 里好看但导不出 glTF 的东西都是死路。

---

## 2. 第一节：可用 MCP 动作清单

### 2.1 先分清"两个 Blender MCP"（重要，易混）

| | 官方 Blender Lab MCP Server | 社区 mcp-for-blender（原 blender-mcp） |
|---|---|---|
| 出品 | Blender Lab（实验项目，**非** Blender 核心路线图） | Siddharth Ahuja 个人，MIT |
| 版本 | v1.0.0（2026-04-27），v1.0.3（2026-09 至今） | 持续更新，~28.7k stars（2026-09） |
| 协议 | GPL-3.0-or-later，免费 | MIT，免费 |
| Blender 版本 | **5.1+** | 3.0+ |
| 安装 | 拖拽 add-on，无 uv 依赖 | 需 uv；Blender 内开 TCP 9876 |
| 定位 | 场景分析、调试、批量脚本、文档检索 | 场景检查、建模、材质、资产拉取 |
| 谁在用 | Anthropic 官方 Claude Blender connector 即基于此 | 绝大多数第三方 demo 用的这个 |

来源：[strayspark 官方 MCP 对比（2026）](https://www.strayspark.studio/blog/official-blender-mcp-server-comparison-2026)、[neural4d 指南](https://blog.neural4d.com/user-guide/gpt-6-astra-blender-mcp/)。

### 2.2 官方 Server：真实可用的动作（有公开依据）

- 场景检查：遍历 objects / materials / data-blocks，做多边形/材质审计（如"找出屏幕占比小但面数高的物体"、"查某个材质被谁引用"）；
- 执行任意 Python 代码（**无 guard**，官方明确建议放 VM 里跑）；
- 渲染出图；
- 导航 Blender 界面；
- 内置完整 Python API 参考 + 用户手册，模型可实时查文档。

来源：[windowsforum 综述](https://windowsforum.com/news/blender-mcp-server-on-windows-claude-ai-setup-animation-tips-and-security-risks.446210/)。官方示例**不演示**从零建动画/世界——它的强项是分析与排错，不是生成。

### 2.3 社区 Server：真实可用的动作（有公开依据）

- 场景检查、物体创建/移动、材质灯光控制；
- 执行任意 Python；
- 资产拉取：Poly Haven、Sketchfab、Poly Pizza、Hyper3D Rodin、Hunyuan3D（一部分需各自账号/授权）。

来源同上。注意：它的 telemetry 默认开启，正式用之前关掉。

### 2.4 对 music_universe 的结论

- **要"从 schema 长出世界骨架"（生成侧）**：社区 server 的动作面更对口（建模+材质+资产）。
- **要"检查/调试已生成的 .blend"（验收侧）**：官方 server 更对口（审计+文档），且是 Anthropic 官方背书的稳定选择。
- **安全**：两个都会执行模型写的任意代码，**必须跑在隔离环境**（你有 yunzhan-crf，但注意约束：本笔记不涉及任何服务器操作，环境搭建是实现阶段的事）。
- 「待验证」：官方 server v1.0.3 的**穷尽工具列表**（公开资料只给了类别）；社区 server 在 headless（`blender -b`）模式下的稳定性（多数 demo 是 GUI 模式）；两者与 dsh/Codex 等 harness 的实际连通性（MCP 协议通用，理论上都通，未实测）。

---

## 3. 第二节：render-and-verify 循环设计

### 3.1 参考范式：Gemini 4 Argon 演示（2026-10-13）

Google Antigravity 团队放出的视频里，Argon 从**一张 Nano Banana 概念图**出发，经 Blender MCP：摆相机 → 建哥特式建筑/多层宝塔 → 布光（含音频反应灯光）→ **多 agent 视觉 critique 循环** → 成品。来源：[dev.to 解析](https://dev.to/alifar/gemini-4-argon-shows-how-autonomous-3d-world-building-could-change-design-workflows-3g9c)、[the-decoder](https://the-decoder.com/gemini-4-argon-is-now-available-worldwide-as-googles-most-capable-frontier-model/)。

**必须打的折扣**（来源：[orcarouter 评述](https://www.orcarouter.ai/blog/gemini-4-release-date)）：这是**厂商演示**——无第三方复现、无可靠性数据、**未披露耗时/算力/迭代次数**。它证明的是"这条路走得通"，不是"这条路便宜/可靠"。本节的设计借它的**结构**（plan → act → render → critique → refine），不借它的任何数字承诺。

### 3.2 给 music_universe 的闭环设计

```
MusicWorldProject v2 (scene/worldBible/timeline)
        │ ① 编译
        ▼
bpy 脚本（版本化，可重放）
        │ ② 执行
        ▼
blender -b headless 执行
        │ ③ 渲染
        ▼
EEVEE 出图（固定机位 × N，速度优先）
        │ ④ 验收
        ├─ 确定性检查（先）：物体数量/命名/包围盒/无 NaN/可导出 glTF
        └─ VLM 评审（后）：对照 worldBible 意图打分，指出具体修改点
        │ ⑤ 迭代或接受
        ▼
通过 → 导出 glTF → 进 Three.js 运行时走现有 Playwright 验收
```

设计要点：

1. **音乐时间是权威**（仓库产品不变量）：bpy 生成的参数化几何必须绑定 timeline cue 点；render 验收时按 cue 点时刻出图，而非随机时刻。
2. **确定性检查先于 VLM**：数量、命名、包围盒、glTF 可导出性是机器可判的，便宜且稳定；VLM 只做审美/意图对齐，避免拿昂贵的模型调用做计数活。
3. **产物全部版本化**：bpy 脚本 + 每次 render 图 + VLM 评审记录，三者同版本绑定。失败的迭代也是资产（下次 prompt 的负例）。
4. **收敛条件要写死**：最大迭代次数、VLM 评分阈值、超时。Argon 演示没披露迭代次数——我们不能学它不设上限。
5. **.blend 是中间产物，glTF 是交付物**：闭环的出口是"能进 Three.js 的 glTF + 通过现有浏览器验收"，不是"Blender 里好看"。

### 3.3 「待验证」

- EEVEE headless 在目标机器上的出图速度（决定迭代成本）；
- VLM 对"世界骨架是否符合 worldBible 意图"的评分稳定性（建议先拿 Echo Garden 现有截图做离线标定）；
- 长 bpy 脚本的单次成功率（Argon 用多 agent 分工，单 agent 一次写完大概率翻车——分步生成可能是必选项）。

---

## 4. 第三节：Blender / Tripo 分工边界

### 4.1 原则

- **Blender（agentic）：世界骨架**——地形/岛屿基底、建筑结构（亭、塔、桥）、布局（来自 `scene.environment`）、音乐驱动的参数化几何、拓扑干净、原生可编辑。产出 `.blend`（可改）+ glTF（可用）。
- **Tripo（generative）：有机点缀**——树、岩石、生物、难以参数化的异形 hero 道具。沿用现有管线：dev-only、暂存、rights review、不自动进 manifest。
- **分界线**：凡是"能用尺寸/数量/位置描述清楚"的归 Blender（呼应你定的建模语言偏好：具体数字 > 意象）；凡是"长什么样靠感觉"的归 Tripo。

### 4.2 第三条路：Gaussian splat（Blender 5.3，观察位）

- 5.3 原生支持导入 PLY / SPZ splat，Workbench / EEVEE / Cycles 均可渲染；**无导出**；已知问题：性能一般、线性空间渲染不完全正确、Apply Transform 对 scale/rotation/SH 处理错误。来源：[80.lv](https://80.lv/articles/blender-5-3-is-getting-native-3d-gaussian-splat-support)、[gamesbyai 实测](https://gamesbyai.win/blog/gaussian-splatting-game-with-blender/)。
- 对 music_universe 的意义：splat 本质是点云+命名属性，**Geometry Nodes 可写属性、可切换类型**——理论上 agent 可程序化生成 splat 做氛围层（如星空、光尘）。但无导出 = 进不了 Three.js 运行时，**现阶段只能做 Blender 内预览，不进管线**。标为观察项，不排期。

### 4.3 管线示意

```
scene (schema)
 ├─ bpy 编译 → Blender agentic → 骨架 .blend → glTF
 └─ Tripo prompt 编译 → Tripo → 候选 → 审核 → glTF（现有流程）
                                            ↓
                                   Three.js 运行时（现有验收）
```

两套编译后端，同一份 schema，同一个 glTF 出口，同一套浏览器验收。

---

## 5. 路线选项与取舍（不拍板）

| 路线 | 走法 | 优点 | 代价/风险 |
|---|---|---|---|
| **A. MCP 优先** | 用社区 mcp-for-blender（生成动作多），harness 经 MCP 驱动 | 工具现成，demo 生态大；与 Argon 范式同构 | 社区项目维护风险；telemetry 默认开；headless 稳定性待验证 |
| **B. bpy 优先** | harness 直接写 bpy，`blender -b` 执行；MCP 只做检查/调试（官方 server） | 脚本完全版本化、可重放；不依赖第三方 server 质量 | harness 要自己写"编译器"（schema→bpy），前期投入大 |
| **C. 观望** | 等 Blender 5.3 LTS（2026-11-10）+ 官方 MCP 迭代后再动 | 风险最低，splat/导出等问题可能随版本解决 | 慢；Argon 已经演示了范式，等的过程就是被拉开的过程 |

取舍维度：你要的是**可控性**（B）还是**速度**（A）。两者不互斥——A 跑通首个世界、沉淀出 prompt 模式后，可以逐步把高频模式固化成 B 的编译器。

## 6. 待验证清单（汇总）

1. 官方 MCP v1.0.3 穷尽工具列表；
2. 社区 MCP 在 headless 模式下的稳定性；
3. MCP server 与 dsh/Codex 的实际连通性；
4. EEVEE headless 出图速度与迭代成本；
5. VLM 评审 worldBible 对齐度的评分稳定性（可用 Echo Garden 截图先做离线标定）；
6. 长 bpy 单次生成成功率（可能需要分步生成）；
7. Blender 5.3 正式版是否解决 splat 导出与 Apply Transform 问题（2026-11-10 见）。

## 7. 信息时效

- 本笔记基于 2026 年 10 月 19 日前的公开信息；Blender 5.3、官方 MCP、dsh 均为快速迭代中的项目，**实现前请刷新** 2.1–2.3 节的版本与动作清单。
- 与本笔记冲突时，以仓库 `AGENTS.md` 的产品红线与 `docs/music-universe-roadmap.md` 的阶段门为准。
