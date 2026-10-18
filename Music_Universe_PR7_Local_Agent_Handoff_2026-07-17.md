# Music Universe Interface Kit — PR #7 本地开发 Handoff

**日期：** 2026-07-17  
**仓库：** https://github.com/CRF2004/Music_Universe_Interface_Kit  
**PR：** https://github.com/CRF2004/Music_Universe_Interface_Kit/pull/7  
**PR 标题：** `Music Universe cinematic runtime integration`

---

# 1. 当前状态

PR #7 当前状态：

- Open
- Draft
- 未 merge
- 未 Ready for review
- GitHub 显示 mergeable

目标分支：

```text
feature/music-universe-pr7-cinematic-runtime
```

Base：

```text
main
```

当前已确认的 PR head：

```text
6fbb4a781db6637b1ea9ce0d964d85059b6842fe
```

当前 PR 统计：

```text
commits: 21
changed files: 5
additions: 77
deletions: 14
```

最终验证过的 GitHub Actions：

```text
CI #79

Install dependencies ✅
Type-check ✅
Build ✅
```

当前 CI workflow 已恢复为正常版本，没有保留临时诊断 artifact 步骤。

---

# 2. 本地 Agent 的第一步

进入本地仓库后先执行：

```bash
git status
git remote -v
git branch --show-current
git fetch origin
git checkout feature/music-universe-pr7-cinematic-runtime
git pull --ff-only origin feature/music-universe-pr7-cinematic-runtime
git rev-parse HEAD
```

预期 HEAD：

```text
6fbb4a781db6637b1ea9ce0d964d85059b6842fe
```

然后安装依赖并验证当前基线：

```bash
npm install
npm run lint
npm run build
```

预期结果：

```text
npm run lint  ✅
npm run build ✅
```

如果本地 HEAD 不等于上述 SHA，先检查远端 PR 分支是否有新提交，不要直接 reset 或覆盖其他人的改动。

---

# 3. 已完成的核心架构

## 3.1 音乐播放时钟

当前设计原则：

```text
HTMLAudioElement
      |
      v
audio.currentTime
      |
      v
useAudioPlayerStore.currentTime
      |
      v
MusicRuntimeController
      |
      v
timeline replay
      |
      v
MusicRuntimeStore
```

`HTMLAudioElement` 是 authoritative clock。

不要另建独立的动画计时器替代音频时钟，否则暂停、seek、重新播放后容易与音乐不同步。

相关文件：

```text
src/player/useAudioPlayerStore.ts
src/music/runtime/MusicRuntimeController.tsx
```

`useAudioPlayerStore` 当前通过实际 audio element 事件同步：

```text
loadedmetadata
durationchange
timeupdate
play
pause
ended
error
```

---

## 3.2 Timeline 编译与 replay

Timeline 来源：

```text
src/music/runtime/defaultMusicTimeline.ts
```

虽然文件名是 `defaultMusicTimeline.ts`，导出名称仍为：

```ts
defaultNormalizedMusicTimeline
```

编译入口：

```ts
compileNormalizedMusicTimeline(
  defaultNormalizedMusicTimeline,
  durationSeconds
)
```

Replay 入口：

```ts
replayMusicTimeline(cues, currentTime)
```

相关文件：

```text
src/music/musicTimeline.ts
src/music/runtime/defaultMusicTimeline.ts
src/music/runtime/musicExperienceRuntime.ts
```

当前控制器暂时使用固定时长：

```ts
300
```

这是后续需要处理的重要技术债务。应优先改成真实音频 duration，而不是长期保留 300 秒。

---

# 4. MusicRuntimeStore

文件：

```text
src/music/runtime/useMusicRuntimeStore.ts
```

当前 runtime state：

```ts
export interface MusicRuntimeState {
  environment: Partial<NarrativeEnvironmentState>;
  cameraMode?: string;
  narration?: string;
  portals: Record<string, boolean>;
}
```

Store 接口：

```ts
interface MusicRuntimeStore extends MusicRuntimeState {
  setRuntime: (runtime: MusicRuntimeState) => void;
}
```

当前更新方式采用新的对象：

```ts
set(() => ({
  ...runtime,
}))
```

目的：

- 避免 store 继续引用外部可变对象
- 保留 Zustand store 中现有 action
- 让 consumer 只读取稳定的 runtime snapshot

不要将它改回依赖外部对象 mutation 的写法。

后续可考虑进一步把 runtime schema 变成完整、非 optional、可直接消费的结构，但应先确认 timeline 的默认状态设计。

---

# 5. React Runtime Controller

文件：

```text
src/music/runtime/MusicRuntimeController.tsx
```

注意：这个文件不能再命名为：

```text
MusicWorldController.tsx
```

原因是仓库中已经存在：

```text
src/music/runtime/MusicWorldController.ts
```

该文件导出的是一个 class：

```ts
export class MusicWorldController
```

TypeScript 在无扩展名 import 时会优先解析同名 `.ts`，导致 React 组件 import 实际拿到 class，出现 JSX 构造错误。

因此当前明确区分：

```text
MusicWorldController.ts   -> 旧的 class runtime/controller
MusicRuntimeController.tsx -> React timeline bridge component
```

不要重新引入同名 `.ts` / `.tsx` 文件冲突。

当前 React controller 职责：

1. 读取 `useAudioPlayerStore.currentTime`
2. 编译 normalized timeline
3. replay 当前时间之前的 cues
4. 写入 `useMusicRuntimeStore`
5. 校验 camera mode
6. 写入 `useWorldStore.setCameraMode`

CameraMode guard 当前禁止使用强制 cast：

```ts
function isCameraMode(value: unknown): value is CameraMode {
  return (
    value === 'explore' ||
    value === 'interaction' ||
    value === 'cinematic' ||
    value === 'inspection' ||
    value === 'ui-safe'
  );
}
```

禁止重新写成：

```ts
value as CameraMode
```

或：

```ts
runtime.cameraMode as CameraMode
```

---

# 6. Camera timeline 接入

真正的 CameraMode 类型：

```text
src/camera/cameraTypes.ts
```

当前 union：

```ts
type CameraMode =
  | 'explore'
  | 'interaction'
  | 'cinematic'
  | 'inspection'
  | 'ui-safe';
```

World store：

```text
src/state/useWorldStore.ts
```

当前 runtime controller 已执行：

```ts
if (isCameraMode(runtime.cameraMode)) {
  setCameraMode(runtime.cameraMode);
}
```

因此 timeline 中的：

```ts
{ type: 'set-camera', payload: { mode: 'cinematic' } }
```

会影响：

```ts
useWorldStore.currentCameraMode
```

后续手工验收必须确认相机系统确实消费 `currentCameraMode`，而不是仅确认 store 中值发生变化。

---

# 7. Environment 接入

文件：

```text
src/world/MusicEnvironmentController.tsx
```

当前 store 引用必须保持为：

```ts
import { useMusicRuntimeStore } from '../music/runtime/useMusicRuntimeStore';
```

之前曾错误引用：

```text
./music/runtime/useMusicRuntimeStore
```

该错误路径导致仓库中出现重复目录：

```text
src/world/music/runtime/
```

重复目录已经删除，不要恢复。

当前 controller 消费：

```ts
environment.bloomIntensity
environment.rainIntensity
```

并通过 canvas CSS brightness 做最小视觉反馈：

```ts
root.style.filter =
  `brightness(${1 + bloom * 0.05 + rain * 0.02})`;
```

这只是当前最小接入，不是最终环境系统。

后续可继续扩展：

```text
skyColor
groundColor
fogColor
fogDensity
stars
bloomIntensity
rainIntensity
```

更合理的方向是直接控制 Three.js scene、fog、lights、postprocessing 和 weather particles，而不是长期依赖 canvas CSS filter。

`MusicEnvironmentController` 使用 `useFrame`，必须继续挂载在 `<Canvas>` 内部。

---

# 8. WorldScene 挂载

文件：

```text
src/world/WorldScene.tsx
```

当前挂载：

```tsx
<CurvedWorld />
<MusicRuntimeController />
<MusicEnvironmentController />
<MusicReactiveWorld />
<PlayerController />
<InteractionSystem />
```

当前 import：

```ts
import MusicRuntimeController from '../music/runtime/MusicRuntimeController';
```

这已经避开 `MusicWorldController.ts` class 的命名冲突。

---

# 9. 本轮已修复的问题

## 9.1 错误重复目录

已删除：

```text
src/world/music/runtime/MusicWorldController.tsx
src/world/music/runtime/useMusicRuntimeStore.ts
```

这些文件的相对 import 全部错误，会产生：

```text
TS2307 Cannot find module
```

不要重新创建 `src/world/music/runtime`。

---

## 9.2 Environment store 路径错误

已从：

```ts
./music/runtime/useMusicRuntimeStore
```

改成：

```ts
../music/runtime/useMusicRuntimeStore
```

---

## 9.3 同名 .ts / .tsx 模块冲突

原 React 文件：

```text
src/music/runtime/MusicWorldController.tsx
```

与已有 class 文件：

```text
src/music/runtime/MusicWorldController.ts
```

发生冲突。

最终处理：

```text
React component -> MusicRuntimeController.tsx
class controller -> MusicWorldController.ts
```

---

## 9.4 CameraMode 类型绕过

旧实现使用：

```ts
CAMERA_MODES.has(value as CameraMode)
```

现已改成不含 cast 的显式 type guard。

---

## 9.5 Camera runtime 未写入 world store

现已增加：

```ts
useWorldStore(state => state.setCameraMode)
```

timeline camera cue 可以同步到世界相机状态。

---

## 9.6 CI 日志截断问题

GitHub Actions 原日志接口多次只返回前半段。

曾临时修改 `.github/workflows/ci.yml`：

1. 将 type-check 输出写入文件
2. 上传 artifact
3. 下载 artifact 获取完整 TS 错误

问题定位完成后，临时步骤已全部移除。

当前 `.github/workflows/ci.yml` 已恢复原始流程：

```text
npm install
npm run lint
npm run build
```

---

# 10. 当前未完成事项

以下事项尚未完成，不应因为 CI 通过而视为 PR 完成。

## 10.1 使用真实音频 duration

当前代码编译 timeline 时仍使用：

```ts
300
```

应改为：

```ts
useAudioPlayerStore.duration
```

需要处理：

- duration 为 0
- metadata 尚未加载
- 更换音乐文件
- seek
- 音乐结束
- duration 变化
- timeline 是否需要 memoize

建议行为：

```text
duration <= 0
  -> 使用安全初始 runtime，或暂不 replay

duration > 0
  -> compile normalized timeline
  -> replay currentTime
```

不要在每次 `timeupdate` 时无条件重复排序和编译相同 cues；建议根据 duration memoize 编译结果。

---

## 10.2 Timeline replay 性能

当前每次 currentTime 更新都会：

1. 编译完整 timeline
2. 从头 replay 所有已发生 cues
3. 写入完整 runtime state

对于当前少量 cue 没问题，但后续 timeline 变大后会产生额外开销。

可选方向：

- `useMemo` 按 duration 编译 cues
- 基于 cue index 做增量执行
- seek 时重新 replay
- normal playback 时只执行跨过的 cue
- 避免相同 runtime snapshot 重复触发 Zustand update

在实现增量 timeline 前必须保证：

```text
seek backward
seek forward
restart
new track
pause/resume
```

结果仍然确定且可重放。

---

## 10.3 Narration HUD

Runtime 已提供：

```ts
MusicRuntimeState.narration
```

但尚未确认仓库是否已有 narration/subtitle/story HUD。

继续搜索：

```bash
rg -n "narration|subtitle|story|narrative|activeCue|cue" src
```

原则：

- 如果已有 HUD，改为读取 `useMusicRuntimeStore(state => state.narration)`
- 不要新建重复 narration state
- 不要在没有充分搜索前创建第二套 HUD
- 如果确实不存在，再新增最小 HUD

---

## 10.4 Portals

Runtime 已保存：

```ts
portals: Record<string, boolean>
```

默认 timeline 中包含：

```ts
{ type: 'set-portal', payload: { id: 'departure', open: true } }
```

但目前尚未确认世界中的 portal component 是否消费 runtime store。

继续搜索：

```bash
rg -n "portal|departure|set-portal|portals" src
```

应把现有 portal 可见性或开放状态接入 runtime，避免新建重复 portal registry。

---

## 10.5 Landmark actions

Timeline 中已有：

```ts
{ type: 'set-landmark', payload: { id: 'memory-tree', visible: true } }
{ type: 'set-landmark', payload: { id: 'light-path', visible: true } }
```

但当前 `MusicRuntimeState` 没有 landmark state，`applyAction()` 也没有处理 `set-landmark`。

这是明确的 schema 缺口。

建议先搜索现有 landmark/world visibility state：

```bash
rg -n "landmark|memory-tree|light-path|visible" src
```

然后决定：

```ts
landmarks: Record<string, boolean>
```

是否应该加入 `MusicRuntimeState`。

不要默默忽略 timeline action。至少应：

- 实现它
- 或从默认 timeline 移除
- 或明确标记 unsupported action

优先推荐实现并接入现有世界对象。

---

## 10.6 Environment 真正视觉效果

目前 environment 只通过 brightness 间接反馈。

后续需要验证并逐步接入：

- scene background / sky
- ground material
- fog color
- fog density
- star count/intensity
- bloom postprocessing
- rain particle system
- atmosphere transitions

避免所有 environment cue 同时瞬间跳变；可以在 consumer 层进行平滑插值，但 runtime store 本身应保存 timeline 的目标状态。

---

## 10.7 Manual validation

由于之前执行环境只能通过 GitHub connector 修改代码，无法打开应用进行浏览器交互验收。

因此以下项目仍未验证：

### Music upload

- 上传音频文件
- object URL 创建
- metadata 正常读取
- 替换音乐时旧 URL 是否 revoke
- 不支持格式错误提示

### Play / Pause

播放时：

```text
audio.currentTime 持续推进
runtime 持续更新
```

暂停时：

```text
currentTime 停止变化
runtime 冻结
```

### Seek

- 向前 seek 后正确 replay
- 向后 seek 后旧 cue 状态被撤销
- seek 到 0 后回到初始 runtime

### Camera

- `explore`
- `cinematic`
- `ui-safe`

实际相机视角有变化。

### Environment

- bloom cue 可感知
- rain cue 可感知
- brightness 不异常累积
- canvas filter 不覆盖其他系统已有 filter

### Narration

- cue 文本显示
- 新 narration 替换旧 narration
- 无 narration 时是否隐藏
- seek backward 后内容正确恢复

### Portals

- `departure` portal 在 84% timeline 位置打开
- seek backward 后关闭

### Ended / Replay

- 音乐结束状态正确
- replay 从 0 开始
- runtime 回到初始并重新触发

---

# 11. 推荐开发顺序

本地 agent 建议严格按以下顺序推进。

## Step 1：建立本地基线

```bash
npm install
npm run lint
npm run build
npm run dev
```

先确认当前 PR 在本机可运行。

---

## Step 2：真实 duration

修改 `MusicRuntimeController.tsx`：

- 读取 `duration`
- 使用 `useMemo` 编译 timeline
- duration 未就绪时采用确定的初始行为

完成后验证：

```bash
npm run lint
npm run build
```

---

## Step 3：手工播放生命周期

验证：

```text
upload
play
pause
seek
ended
replay
replace track
```

优先修复所有 authoritative clock 问题。

---

## Step 4：Narration / Portal / Landmark 搜索

先全面搜索现有 consumer，再接入 runtime。

禁止一上来创建平行状态系统。

---

## Step 5：Environment 深化

把 environment 从 canvas CSS brightness 逐步接入真实 Three.js 世界。

每完成一个环境字段，都进行实际视觉验收。

---

## Step 6：自动化测试

建议至少增加 runtime 层单元测试：

```text
compileNormalizedMusicTimeline
replayMusicTimeline
camera mode validation
seek backward reconstruction
portal reconstruction
landmark reconstruction
```

重点测试 replay 的确定性，而不是只测试 React render。

---

## Step 7：最终 CI 与 PR

每轮修改：

```bash
npm run lint
npm run build
git status
git diff
```

提交示例：

```bash
git add <files>
git commit -m "feat: complete music timeline runtime integration"
git push origin feature/music-universe-pr7-cinematic-runtime
```

检查：

```bash
gh pr checks 7
```

只有满足以下条件才允许 Ready for review：

```text
lint ✅
build ✅
manual playback validation ✅
camera validation ✅
environment validation ✅
narration/portal/landmark validation ✅
```

然后：

```bash
gh pr ready 7
```

不要 merge。

---

# 12. 架构约束

后续开发应保持以下约束。

## 必须保持

- `HTMLAudioElement` 是 authoritative clock
- timeline runtime 可由任意时间点确定性 replay
- CameraMode 必须通过 type guard 或更强 schema 校验
- Zustand store 不依赖外部对象后续 mutation
- React runtime component 不与 class controller 同名
- `useFrame` consumer 必须位于 `<Canvas>` 内
- CI 必须同时通过 Type-check 和 Build

## 禁止

- `runtime.cameraMode as CameraMode`
- 新建 `src/world/music/runtime`
- 再创建 `MusicWorldController.tsx`
- 建立第二套 narration state
- 建立第二套 portal state
- 用 `setInterval` 代替 audio clock
- CI 未通过时设置 Ready
- 未做手工验收时设置 Ready
- merge PR #7

---

# 13. 建议检查的关键文件

```text
.github/workflows/ci.yml

src/player/LocalAudioPlayer.ts
src/player/useAudioPlayerStore.ts

src/music/musicTimeline.ts
src/music/runtime/defaultMusicTimeline.ts
src/music/runtime/musicExperienceRuntime.ts
src/music/runtime/useMusicRuntimeStore.ts
src/music/runtime/MusicRuntimeController.tsx

src/music/runtime/MusicWorldController.ts
src/music/runtime/MusicClock.ts
src/music/runtime/MusicTimelineExecutor.ts

src/narrative/narrativeTypes.ts
src/camera/cameraTypes.ts

src/state/useWorldStore.ts
src/world/MusicEnvironmentController.tsx
src/world/MusicReactiveWorld.tsx
src/world/WorldScene.tsx
```

---

# 14. 建议搜索命令

```bash
rg -n "MusicRuntimeState" src
rg -n "useMusicRuntimeStore" src
rg -n "MusicRuntimeController" src
rg -n "MusicWorldController" src

rg -n "CameraMode|currentCameraMode|setCameraMode" src

rg -n "narration|subtitle|story|narrative|activeCue" src
rg -n "portal|departure|set-portal|portals" src
rg -n "landmark|memory-tree|light-path|set-landmark" src

rg -n "bloomIntensity|rainIntensity|fogDensity|skyColor|stars" src

rg -n "currentTime|duration|playing|ended|seek|timeupdate" src/player src/music
```

---

# 15. 安全事项

此前 GitHub personal access token 曾被直接发送到聊天中。

该 token 应视为已经泄露，不应继续使用。请在 GitHub 中：

1. 立即 revoke 旧 token
2. 创建新的 fine-grained token
3. 仅授予此仓库需要的最小权限
4. 通过本地 credential manager、环境变量或 `gh auth login` 使用
5. 不要把 token 写入 handoff、源码、commit、终端历史或 agent prompt

本 handoff 不包含该 token。

---

# 16. 最终目标

```text
真实 audio duration
        |
        v
确定性 timeline runtime
        |
        +-- camera
        +-- environment
        +-- narration
        +-- portals
        +-- landmarks
        |
        v
浏览器手工验收
        |
        v
Type-check ✅
Build ✅
        |
        v
PR #7 Ready for review
```

最终仍然：

```text
不要 merge
```
