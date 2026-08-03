# Music Universe — 新会话 Agent Handoff

> 日期：2026-08-01  
> 仓库：`Music_Universe_Interface_Kit`  
> 当前分支：`agent/external-assets-outline`  
> 当前 HEAD：`624969ea964c03ad2883ff26ae5900e5de7060ab`  
> HEAD 标题：`ci: deploy research builds to GitHub Pages`

## 1. 新会话先做什么

先完整阅读仓库根目录 `AGENTS.md`，然后按其要求阅读：

1. `docs/music-universe-roadmap.md`；
2. `NOW.md`；
3. `docs/development-workflow.md`；
4. `docs/memory-journey-vertical-slice.md`；
5. `docs/world-development-tooling.md`；
6. `docs/experience-direction-rubric.md`。

随后只做只读检查：

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git diff --check
```

不要 reset、checkout、清理或覆盖当前工作树。当前大量修改与新增文件是本轮尚未提交的有效成果。

## 2. 产品方向

当前仍处于 Roadmap Phase 0：baseline and reliability。目标是做出一个连贯、可理解、可编辑、性能可接受的 3–5 分钟 Memory Journey 垂直切片。

这不是通用 3D 桌面、游戏引擎展示或世界模型平台。当前不要扩展 AI 生成、社区、多人、WebGPU、编辑器、ECS 或推测性后端。

体验主题已经确定：

> 穿过一座安静、被遗忘的聆听站，让它逐渐重新学会歌唱。

情绪路径：

```text
好奇 -> 定向 -> 发现 -> 世界苏醒 -> 音乐释放 -> 平静收束
```

Agent 对下一轮场景的美术、节奏和交互方案负主要设计责任。用户反馈用于校准体验和审美，不要求用户给出具体模型、颜色、特效或参数。

## 3. 本轮完成了什么

### 3.1 首轮用户反馈修复

用户反馈包括：画面粗糙、岩石偶发不显示、房屋穿模、雨雪颗粒悬停、缺少任务引导与交互反馈、内容单调。

当前工作树已经完成：

- 雨滴从同步运动改为独立运动；
- 稳定 instanced rocks 的可见性并增加岩石碰撞；
- 建筑模型与物理碰撞共享 reviewed visual profiles；
- Memory Archive 的交互半径扩展到实体碰撞体外，避免必须穿模才能交互；
- 增加三阶段世界内光路、目的地信标和显式目标切换反馈；
- 增加 Listener Guide、Memory Grove，以及 Archive 恢复后的世界反应；
- 研究版本默认隐藏开发控制，并压缩闲置音乐播放器；
- 保留音量、静音、字幕、键盘焦点与 reduced-effects 支持；
- 提供 `?physicsDebug=1` 物理碰撞可视化；
- 提供 `?e2e=1` 机器可读世界探针。

### 3.2 一键自主旅程回归

新增命令：

```bash
npm run journey:regression
```

它会依次：

1. 构建和验证资产；
2. 用相对路径构建生产版本；
3. 启动隔离 Chromium；
4. 生成并加载 4 秒合成 WAV；
5. 自动执行 Guide -> Archive -> Gate -> Replay；
6. 检查真实 Rapier 碰撞、目标切换、条件旗标、音频 cue、完成状态和回放重建；
7. 输出 JSON 报告与五张阶段截图。

关键实现：

- `scripts/run-journey-regression.mjs`；
- `src/runtime/WorldInspectionProbe.tsx`；
- `src/player/PlayerController.tsx` 中的 E2E `drivePlayer`；
- `src/interaction/visualProfiles.ts`；
- `src/runtime/worldStartup.ts` 中仅对 `?e2e=1` 放行软件 WebGL renderer。

注意：生产普通访问仍使用严格 WebGL 能力检测。软件 renderer 放行只用于 E2E，不能扩大到普通产品访问。

### 3.3 已修复的回归脚本问题

此前错误：

```text
Timed out waiting for world inspection probes
```

原因与修复：

- Headless Chromium 的软件 WebGL 被启动探针拒绝：仅为 `?e2e=1` 允许 software renderer；
- 非安全虚拟 origin 缺少 `crypto.randomUUID`：虚拟 origin 改成 `http://localhost`；
- 音轨加载发生在 Guide/Archive 后，产品按正确语义重置旅程旗标，导致 Gate 条件丢失：测试音轨现在在旅程开始前加载；
- 固定等待容易产生快照竞争：关键阶段改成等待语义状态。

不要把产品的“替换音轨时重置 session”行为删掉来迎合测试；测试顺序已经按真实产品生命周期修正。

## 4. 最新验收证据

2026-08-01 完整执行：

```text
npm run journey:regression
```

结果：

```text
Validated assets: 15
Generated assets: 240.60 kB
Production build: passed
Journey checks: 22 passed
Screenshots: 5
Browser runtime errors: 0
```

另外已执行：

```text
npm run lint  passed
npm test      51 passed, 0 failed
```

报告与截图位于：

```text
output/playwright/journey-regression/report.json
output/playwright/journey-regression/00-spawn.png
output/playwright/journey-regression/01-guide-complete.png
output/playwright/journey-regression/02-archive-complete.png
output/playwright/journey-regression/03-gate-complete.png
output/playwright/journey-regression/04-replay-reset.png
```

当前生产拆包：

```text
ExperienceRoot app code   38.48 kB / 12.17 kB gzip
PhysicsWorld app code      48.30 kB / 15.32 kB gzip
Three runtime             732.43 kB / 189.75 kB gzip
Rapier runtime          2,260.70 kB / 838.08 kB gzip
```

Rapier 仍是主要传输成本；不要把它误判为应用 chunk 回归。真实目标设备仍需校准。

## 5. 当前工作树归属

以下是本轮有效的未提交工作，应该作为一个整体理解，但提交时可以按可审查边界拆分：

```text
M  NOW.md
M  package.json
M  src/App.tsx
M  src/content/demoScene.ts
M  src/interaction/InteractionPoint.tsx
M  src/interaction/visualRegistry.tsx
M  src/music/player/MusicPlayerHUD.tsx
M  src/player/PlayerController.tsx
M  src/runtime/worldStartup.test.ts
M  src/runtime/worldStartup.ts
M  src/ui/ActionDock.tsx
M  src/ui/JourneyRuntimeHUD.tsx
M  src/world/EnvironmentScenery.tsx
M  src/world/MusicReactiveWorld.tsx
M  src/world/PhysicsWorld.tsx
M  src/world/WorldScene.tsx
M  src/world/environmentLayout.test.ts
M  src/world/environmentLayout.ts
?? docs/experience-direction-rubric.md
?? docs/world-development-tooling.md
?? scripts/run-journey-regression.mjs
?? src/interaction/visualProfiles.test.ts
?? src/interaction/visualProfiles.ts
?? src/runtime/WorldInspectionProbe.tsx
?? src/world/JourneyWorldGuide.tsx
```

本 handoff 文件本身也将是新增文件。

`Music_Universe_PR7_Local_Agent_Handoff_2026-07-17.md` 是用户原有的历史未跟踪文件。本轮没有修改它。不要顺手删除、覆盖或纳入当前功能提交；如需归档，应单独处理。

`output/playwright/` 是验收产物，不要在没有仓库策略的情况下整目录提交。

## 6. 下一会话建议任务

优先做下一轮 authored scene pass，不要先堆更多素材。最小端到端目标：让 Guide -> Archive -> Gate 三段在画面、运动、声音和导航上形成明显递进，并继续由现有回归保护语义与碰撞。

按以下顺序推进：

1. 修正 arrival composition：Guide 应成为进入世界后的清晰视觉焦点，建筑不能抢占大部分画面；
2. 重做 Guide 到 Archive 的路线构图：光路绕开实体碰撞，避免视觉上引导玩家撞墙；
3. 设计 Archive awakening：交互后至少同时改变灯光/碎片运动/环境音或导航中的两个通道；
4. 强化 Gate anticipation 和 opening climax；
5. 修正 replay 截图的明显俯视机位，并验证回放后的镜头、目标与世界状态都回到可理解的起点；
6. 降低重复地表块和紫色尖锥的视觉噪声，用层次、尺度变化和有目的的分组替代均匀散布；
7. 完成后重新运行回归并逐张检查五张截图；
8. 再进行 3–5 名首次用户观察，而不是让用户充当逐项视觉 QA。

从现有截图得出的设计风险：

- Archive 正面占屏过大，构图封闭且路线意图弱；
- replay 阶段镜头明显偏俯视，虽然语义状态已正确重建，但视觉起点不够稳定；
- 地表模块和紫色尖锥重复度高，容易读成临时关卡块；
- UI 信息已经明显改善，但世界本身的环境叙事仍弱于面板；
- Gate 完成态的模态反馈清楚，但高潮前的空间铺垫仍不够强。

## 7. 后续验证要求

场景或交互改动至少执行：

```bash
npm test
npm run lint
npm run journey:regression
```

涉及普通生产构建行为时再明确执行：

```bash
npm run build
```

验收不能只看 JSON。必须顺序检查五张截图，并做一次短的第一人称浏览器体验，关注：

- 镜头遮挡；
- 建筑与岩石碰撞；
- 雨滴是否自然；
- Guide/Archive/Gate 的可读性；
- 音频播放、seek、自然结束与 replay；
- 键盘焦点、字幕和 reduced effects。

## 8. 当前不需要等待用户决定的事项

新 Agent 可以自主提出并实现一套连贯的场景候选，包括构图、色彩、灯光、天气密度、环境响应和交互奖励；随后用固定截图、真实浏览器体验和用户观察验证。

只有在以下情况下才需要先停下询问：

- 要改变 Memory Journey 的产品主题或当前 roadmap phase；
- 要引入大型依赖或更换物理/渲染架构；
- 要提交、推送、删除或覆盖用户拥有的未跟踪/未提交文件；
- 要扩展到社区、多人、AI 生成、编辑器或后端。

## 9. 建议给新会话的首句任务

可以直接发送：

> 请先阅读 AGENTS.md、NOW.md、roadmap、development workflow，以及 `Music_Universe_Agent_Handoff_2026-08-01.md`。保持当前未提交工作不丢失，先检查现有回归报告和五张截图，然后自主设计并实现下一轮 Memory Journey 场景统一化：修正 arrival/Archive/replay 构图，增强 Archive awakening 与 Gate climax，减少重复环境噪声。完成后运行测试、lint 和 `npm run journey:regression`，并用证据汇报。
