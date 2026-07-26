# Product World Interface Kit

一个高张力的 3D 空间界面开发套件，基于 React Three Fiber、Rapier 物理引擎和自定义曲面世界着色器构建。专为构建空间化仪表盘、AI Agent 环境和产品探索世界而设计。

## 特性

- **曲面世界引擎**：独特的 "Route A" 视觉曲率着色器，在保持物理交互层稳定的同时营造风格化视觉效果
- **张力摄像机云台**：动态摄像机预设（探索、交互、检查、电影、UI 安全），支持朝向四元数插值与肩部偏移
- **交互调度器**：统一的交互系统，支持近距触发、点击、快捷键，带条件与冷却机制
- **可扩展注册表**：通过注册系统解耦视觉组件与 UI 面板
- **漫画风 UI**：清爽高对比度的视觉风格，配有自定义 Tailwind 主题 Token
- **自适应架构**：通过核心世界适配器轻松切换以连接不同的产品数据源
- **镜头后处理**：内置暗角、噪点、辉光、半色调网点等后期特效
- **调试面板**：集成 Leva 调试工具，支持实时调参

## 技术栈

- **React 19 + Vite 6**
- **Three.js / @react-three/fiber 9**
- **Rapier 物理引擎 / @react-three/rapier**
- **Ecctrl**：健壮的角色控制器
- **Zustand**：轻量级状态管理
- **Tailwind CSS v4**：主题驱动的样式方案
- **@react-three/postprocessing**：后处理特效
- **motion**：交互动画
- **lucide-react**：图标库
- **Leva**：实时调试面板

## 快速上手

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 操作指南

1. **移动**：WASD
2. **跳跃**：空格键
3. **交互**：靠近物体后按 **E** 或点击
4. **检查**：点击产品塔进入检查模式
5. **奔跑**：按住 Shift

## 架构

```
src/
├── world/           # 场景、地形与曲面着色器
│   ├── CurvedWorld.tsx     # 曲面地面（自定义着色器 + 物理碰撞体）
│   ├── WorldCanvas.tsx     # Canvas 主入口（物理、光照、后处理）
│   └── WorldScene.tsx      # 场景编排（组装各子系统）
├── interaction/     # 交互注册表、调度器与视觉组件
│   ├── InteractionDispatcher.ts  # 统一的事件派发引擎
│   ├── InteractionSystem.tsx     # 近距检测与快捷键监听
│   ├── InteractionPoint.tsx      # 交互点的 3D 视觉呈现
│   ├── visualRegistry.tsx        # 视觉对象注册表（NPC、电话亭等）
│   └── interactionTypes.ts       # 类型定义
├── player/          # 角色控制器与输入抽象
│   └── PlayerController.tsx      # 基于 Ecctrl 的角色控制
├── camera/          # 摄像机云台与预设
│   ├── CameraRig.tsx            # 动态摄像机跟踪与平滑
│   ├── cameraPresets.ts         # 五种摄像机预设配置
│   └── cameraTypes.ts           # 类型定义
├── adapters/        # 连接应用逻辑与空间交互的桥梁
│   ├── appAdapterTypes.ts       # AppAdapter 接口定义
│   └── demoAdapter.ts           # 演示适配器
├── content/         # 演示内容数据
│   ├── demoWorld.ts             # 演示世界定义
│   └── interactions/            # 交互点数据
├── ui/              # HTML 覆盖层系统（面板、提示条、工具栏）
│   ├── OverlayRoot.tsx          # UI 根组件
│   ├── PanelRenderer.tsx        # 面板渲染器
│   ├── panelRegistry.tsx        # 面板注册表
│   ├── Prompt.tsx               # 交互提示条
│   └── ActionDock.tsx           # 操作工具栏
└── state/           # Zustand 状态管理
    ├── useWorldStore.ts         # 世界状态（摄像机、调试模式）
    └── useInteractionStore.ts   # 交互状态（注册、触发、面板）
```

## 扩展指南

### 添加新的交互点

```ts
import { demoInteractions } from './content/interactions/demoInteractions';

// 在 demoInteractions 数组中新增条目
{
  id: 'my-feature',
  label: '新功能',
  kind: 'panel',
  position: [5, 0, -10],
  radius: 3,
  visual: { type: 'crate', colorToken: '#4adb7d' },
  triggers: [{ type: 'proximity' }, { type: 'click' }],
  actions: [{ id: 'open-panel', type: 'panel', target: 'my-panel' }]
}
```

### 注册新的 UI 面板

```ts
import { registerPanel } from './ui/panelRegistry';

registerPanel('my-panel', ({ onClose }) => (
  <div>
    <h2>我的面板</h2>
    <button onClick={onClose}>关闭</button>
  </div>
));
```

### 创建自定义适配器

```ts
import { AppAdapter } from './adapters/appAdapterTypes';

const myAdapter: AppAdapter = {
  id: 'my-app',
  name: '我的应用',
  version: '1.0.0',
  panels: { /* ... */ },
  commands: { /* ... */ }
};
```

## 摄像机预设

| 模式 | FOV | 距离 | 高度 | 用途 |
|---------|-----|----------|------|------|
| 探索 | 82° | 5.5 | 2.3 | 常规移动 |
| 交互 | 68° | 3.6 | 1.8 | 聚焦物体/NPC |
| 检查 | 45° | 3.0 | 1.5 | 仔细观察 |
| 电影 | 35° | 10 | 4.0 | 脚本化镜头 |
| UI 安全 | 56° | 6.2 | 2.6 | 阅读文本 |

## 环境变量

```env
APP_URL="https://your-app-url.com"
```

## 资产构建管线

运行时资产统一在 `assets/asset-manifest.json` 中声明：

```bash
npm run assets:validate
npm run assets:build
```

格式、体积预算、许可证字段和缓存策略请参阅
[`docs/asset-pipeline.md`](docs/asset-pipeline.md)。

免费 3D、PBR/HDRI、音效、字体与图标来源，以及逐项授权准入规则请参阅
[`docs/asset-library-index.zh-CN.md`](docs/asset-library-index.zh-CN.md)。

## License

MIT
