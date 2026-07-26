# Music Universe 免费素材资产库索引

> 最后核验：2026-07-26  
> 适用项目：Music Universe Interface Kit（React Three Fiber / Three.js / WebGL）  
> 本文是素材“来源索引”，不是对库内每个素材的批量授权。真正下载的每一项资产仍须写入
> `assets/asset-manifest.json`，保留作者、原始页面、许可证和下载日期。

## 1. 项目适配结论

当前项目的运行时管线接受：

- 3D：`.glb` / `.gltf`，米制、Y-up、朝向 `-Z`；构建时使用 Meshopt，并将内嵌纹理转为 WebP。
- 纹理：PNG、JPG、WebP、TIFF、SVG；构建时缩放并转 WebP。
- 音频：WAV、FLAC、AIFF、MP3、M4A、OGG；构建时归一化到 `-16 LUFS` 并转 Ogg Vorbis。
- 单个生成后模型上限 10 MiB、纹理 2 MiB、音频 12 MiB；总输出上限 50 MiB。

因此应优先选低模、glTF/GLB、1K/2K PBR 纹理和可裁剪的无损音频。4K/8K 素材只适合作为
源文件，不应不经处理直接进入网页运行时。

## 2. 已核验、优先使用

这些库的整库或明确系列具有稳定且清晰的许可，适合直接作为设计选材入口。

| 资产库 | 类型与项目用途 | 授权与署名 | 可用性结论 | 使用建议 |
|---|---|---|---|---|
| [Poly Haven](https://polyhaven.com/) | 高质量 PBR 纹理、HDRI、写实 3D 模型；适合地面、岩石、建筑表面和环境光 | [全站资产 CC0](https://polyhaven.com/license)，可商用、可修改、无需署名 | **优先**。无需账号即可浏览下载，多分辨率、多格式 | Web 首选 1K/2K；HDRI 先降到 1K–2K，并考虑转 KTX2；写实模型需先减面 |
| [ambientCG](https://ambientcg.com/) | 大量无缝 PBR 材质、HDRI、少量模型；适合曲面世界与场景铺装 | [全站资产 CC0](https://ambientcg.com/)，可商用、可修改、无需署名 | **优先**。直接下载，常含完整 PBR 通道 | 下载 JPG/PNG 1K–2K；浏览器端通常不需要 displacement，避免无效负载 |
| [Kenney](https://kenney.nl/assets) | 风格统一的低模 3D、UI、粒子、音效；很适合当前漫画/低模视觉 | [资产页均为 CC0](https://kenney.nl/support)，商业使用与修改均允许，无需署名 | **强烈推荐**。可免费继续下载，无需购买 All-in-1 | 优先看 [Nature Kit](https://kenney.nl/assets/nature-kit)、[Space Kit](https://kenney.nl/assets/space-kit)、[UI Audio](https://kenney.nl/assets/ui-audio)、[Sci-fi Sounds](https://kenney.nl/assets/sci-fi-sounds) |
| [Quaternius](https://quaternius.com/) | 大型低模 3D 套装、角色、环境、动画；适合快速搭建叙事世界 | [全部模型 CC0](https://quaternius.com/faq.html)，可商用、可修改、无需署名 | **强烈推荐**。提供 Blender/FBX 等格式，部分包有动画 | 导入 Blender 后统一比例、轴向、材质，再导出 GLB；Atlas 材质对 Web 很友好 |
| [Sonniss #GameAudioGDC](https://gdc.sonniss.com/gdc-game-audio-bundle/) | 专业游戏音效合集；环境、机械、科幻、拟音和过场声音 | [专用 GDC Bundle License](https://sonniss.com/gdc-bundle-license/)：可用于商业游戏和交互项目，可修改、免版税、无需署名；不得将原始音效作为音效库转售/再分发 | **优先**。质量高，但整包很大 | 只下载/保留实际使用片段；manifest 的 `spdx` 应记录为 `LicenseRef-Sonniss-GDC-Bundle`，并在仓库保留许可文本快照 |
| [Freesound](https://freesound.org/) | 超大社区音效库；适合寻找特定环境声、脚步、机械、城市与抽象声 | [逐条为 CC0、CC BY 或 CC BY-NC](https://freesound.org/help/faq/) | **有条件推荐**：仅接受 CC0 或 CC BY；禁止 CC BY-NC | 搜索时启用 “Free Cultural Works” 过滤；下载页截图/许可文本与作者信息一并留档 |

### 推荐的首批搜索词

结合现有 Memory Tree、Departure Portal、Light Path 和音乐响应世界，建议先搜索：

- 3D：`low poly nature`、`stylized tree`、`portal`、`crystal`、`floating island`、
  `speaker`、`headphones`、`music studio props`、`sci-fi terminal`。
- 材质/HDRI：`night sky`、`studio`、`forest`、`concrete`、`painted metal`、
  `emissive panel`、`ground`。
- 音效：`portal hum`、`energy pulse`、`UI confirm`、`UI hover`、`footstep grass`、
  `forest ambience`、`wind loop`、`memory`、`dreamy transition`。

## 3. 可用，但必须逐项复核

这些网站确有免费优质内容，但授权不是整库统一，或使用专有许可。未经单项记录不可进入正式资产。

| 资产库 | 免费内容 | 风险点 | 准入规则 |
|---|---|---|---|
| [Sketchfab Free Models](https://sketchfab.com/features/free-3d-models) | 大量可下载模型，通常可取得 glTF | 免费模型混合 CC0、CC BY、NC、ND、SA；下载需要账号。官方说明只有 CC0 无需署名 | 仅收 CC0 / CC BY；排除 NC、ND、SA 和 Editorial；记录模型页、作者、许可版本，并检查商标/人物/建筑权利 |
| [Poly Pizza](https://poly.pizza/) | 风格化低模模型，常提供 glTF | 平台内容为用户上传，必须遵守下载时显示的具体 CC 许可，[服务条款](https://poly.pizza/docs/tos)并非整库 CC0 声明 | 仅收明确标记 CC0 / CC BY 的单项；保存下载时的许可证据 |
| [Mixkit Sound Effects](https://mixkit.co/free-sound-effects/) | 免费 UI、环境、转场、自然等音效 | 使用 [Mixkit Free License](https://mixkit.co/license/)，不是 CC0；可用于商业/非商业项目，但不可当库存素材重新分发 | 可用于成品，但 manifest 使用 `LicenseRef-Mixkit-Free-License`；保留素材页和许可快照 |
| [Pixabay Sound Effects](https://pixabay.com/sound-effects/) | 音效和音乐数量大，下载方便 | [Pixabay Content License](https://pixabay.com/service/license-summary/) 是专有许可；禁止独立销售/分发原素材，商标、人物等另有约束；音乐还可能触发 Content ID | 音效可作为备选；音乐谨慎使用。记录素材链接、文件名、作者、下载日期和许可摘要；发布前做 Content ID 检查 |
| [OpenGameArt](https://opengameart.org/) | 2D、3D、纹理、音乐、音效 | 单项可能为 CC0、CC BY、CC BY-SA、GPL 等，组合包还可能多许可；[官方 FAQ](https://opengameart.org/content/faq)说明义务差异较大 | 只接收单一 CC0 / CC BY 且来源明确的素材；不接收 GPL、SA、NC 或许可混合不清的条目 |
| [Openverse](https://openverse.org/) | 聚合 Creative Commons / 公有领域图片和音频 | 它是搜索引擎，不是原始权利方；元数据可能有误 | 只用于发现素材，必须回到原始托管页核对作者、许可和下载文件 |

## 4. UI、图标与字体

| 资产库 | 授权 | 项目建议 |
|---|---|---|
| [Lucide](https://lucide.dev/) | ISC，可商用、可修改 | 项目已安装 `lucide-react`，应作为默认 UI 图标库，避免重复引入其他图标包 |
| [Material Symbols](https://developers.google.com/fonts/docs/material_icons) | Apache-2.0，可商用、可修改，署名非强制 | 仅在 Lucide 缺少填充/可变轴图标时补充；优先下载单个 SVG，避免加载完整字体 |
| [Google Fonts](https://fonts.google.com/) | 开源字体；具体字体通常为 OFL-1.1 或 Apache-2.0，需看字体详情页 | 可用于 Web/商业项目；建议自托管 WOFF2，保留字体包内 LICENSE，并只打包实际字重和字符集 |

## 5. 明确不作为默认来源

- 搜索引擎图片、Pinterest、社交媒体、壁纸站：没有可靠的原始作者和许可链。
- “Royalty-free”但未展示许可全文的资源站：免版税不等于免费、可修改或可再分发。
- 仅限个人使用、仅限非商业（NC）、禁止修改（ND）的素材。
- 带知名品牌、影视/游戏角色、真实艺人肖像或明显受保护产品造型的模型，即使上传者标注 CC0，
  也不能据此推定商标、外观设计或肖像权已获授权。
- BBC Sound Effects 等明确限制商业使用的库，不进入本项目默认清单。

## 6. 单项资产准入流程

每次采用外部素材，按以下顺序执行：

1. 从本索引进入原始素材页，不使用第三方转载包。
2. 确认免费下载按钮仍有效；确认允许商业使用和修改。
3. 优先级：`CC0-1.0` → `CC-BY-4.0` → 已审阅的专有商业许可。
4. 排除 `NC`、`ND`、`SA`、Editorial、GPL 以及许可不明素材。
5. 检查模型/录音中是否含品牌、肖像、艺术品、受保护建筑或其他第三方权利。
6. 保存原始 URL、作者名、素材名、许可版本、下载日期；专有许可另存许可文本或 PDF 快照。
7. 本地检查文件安全性、格式、面数、贴图尺寸、动画和音频循环点。
8. 转为项目标准格式并运行 `npm run assets:validate`、`npm run assets:build`。
9. 视觉资产在目标设备检查帧率与显存；音频检查响度、无爆音、循环接缝及耳机/扬声器表现。

### 建议的 manifest 记录

```json
{
  "id": "portal-hum-example",
  "type": "audio",
  "source": "audio/portal-hum-example.wav",
  "license": {
    "spdx": "CC-BY-4.0",
    "author": "原作者账号",
    "provenance": "https://原始素材详情页（accessed 2026-07-26）"
  },
  "build": {
    "loudnessLufs": -16,
    "format": "ogg",
    "quality": 5
  }
}
```

使用专有许可时，不要伪写成 CC0。使用 SPDX 的自定义许可引用，例如
`LicenseRef-Sonniss-GDC-Bundle`，并将对应许可文本随项目归档。

## 7. 项目优先采购顺序

1. **风格化场景与道具**：Kenney、Quaternius。
2. **地表、材质、天空与环境光**：Poly Haven、ambientCG。
3. **UI 与交互音效**：Kenney Audio（先用 CC0）。
4. **高质量环境与叙事音效**：Sonniss GDC。
5. **缺口搜索**：Freesound 的 CC0 / CC BY 单项。
6. **非常规或特定模型**：Sketchfab / Poly Pizza，逐项完成权利核验。

这套顺序能让绝大多数资产保持 CC0，减少署名 UI、许可变更和发布审核的长期成本。

