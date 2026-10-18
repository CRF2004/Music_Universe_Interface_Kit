# 3D 工具实验 — DMX 同图结果与 Marble 付费评估

日期：2026-10-03。接续[免费准备记录](3d-tool-pilots-2026-10-02.md)。

## 本轮边界

- 用户结果：用同一张自制传送门参考图，比较静态道具的造型、整理时间、费用和网页体积；判断 Marble 是否值得付费试验。
- 当前阶段门槛：Phase 2 创作工作流的资产制作评估；正式产品阶段保持 Phase 2。
- 最小完整切片：DMX Tripo P1、Hyper3D 各一个候选；Meshy 由用户使用免费额度生成；Marble 做免费样例技术评估和付费条件判断。
- 范围外：采购 Marble、正式场景接入、运行时生成服务、公开发布、P2 结果推断。
- 验收：已取得 DMX 两项原始/优化 GLB、任务与用量记录、四面与近看截图。人工修复、Meshy 对照、正式项目冷加载/FPS 和商用权审核保持待测。
- 性能/无障碍/权利：实验文件留在忽略目录；未修改产品 UI、依赖或资产清单。输出商用权仍需逐项审核。

用户授权 DMX 合计最多 ¥10，Tripo 与 Hyper3D 各先生成 1 个。Meshy 免费额度由用户操作；Marble 尚未授权购买。

## DMX 实际请求结果

| 候选 | 公示估算 | 已执行 | 结果 |
|---|---:|---|---|
| Tripo-P1.0，单图标准贴图 | ¥3.50 | 1 次图生提交，查询结果并下载 | SUCCEEDED；提交返回 35,000 output tokens |
| hyper3d-gen2-260112，PBR、2K、8,000 面目标 | ¥1.80 | 旧密钥 1 次拒绝，新密钥 1 次提交，查询并下载 | succeeded；提交返回 18,000 output tokens |
| 两个对应的 get 模型 | ¥0 | 结果查询 | 返回用量为 0；Hyper3D 首次查询超时，后续查询成功，生成未重复提交 |

费用合计估算 ¥5.30，来自 [DMX 公示定价](https://rmb.dmxapi.cn/)。实际人民币扣款需用户平台账单核验，当前凭据仅得到模型用量。免费传图返回 0 tokens。

旧密钥 Hyper3D 拒绝 request ID：`20261003023437694027823c14228f5RkZkd7gx`。用户随后提供新密钥；新密钥模型列表 HTTP 200，共 525 个，包含四个所需生成/查询模型。

Tripo 任务：`e693b55a-6dc1-4dc6-9bcc-d71bb1a9ce4a`。服务端开始至完成约 **73.48 秒**；本地提交至取得成功响应约 **169.98 秒**（含查询间隔）。Hyper3D 任务：`cgt-20261003103801-ps22n`，本地提交至取得成功响应约 **227.93 秒**；接口未提供内部排队/生成时间，不能拆分。

Tripo 使用 [P1 单图文档](https://doc.dmxapi.cn/Tripo-P1.0_Single_Image_to_3D_Model%28with%20Texture%29.html)，要求公网 HTTP/HTTPS 图片。本轮通过 [DMX 免费图片上传接口](https://doc.dmxapi.cn/paiwo_image_upload.html)取得网址；文件重新编码为 169,498 字节，哈希不同，但 Sharp 解码后 1024×1024 RGB 逐像素差异为 0（RMSE 0、最大差异 0）。Hyper3D 使用原图 Base64。两项参考图像素一致。

按 [DMX Hyper3D 文档](https://doc.dmxapi.cn/hyper3d-gen2-260112-image-to-3d.html)，该模型属于影眸 Rodin。本轮 8,000 面目标低于文档质量建议，比较结论只覆盖网页低面数设定。Tripo 接口未提供同等面数控制，实际面数单独记录。

请求工具在提交前持久化记录，已有记录禁止重复提交；结果查询免费，下载后校验 GLB 与哈希。旧密钥失败记录单独保留；新密钥各提交一次。密钥只存本地忽略文件，不写入报告或前端。

## 两个 DMX 候选的实测

采用现有管线参数：Meshopt、WebP、最高 2K、关闭 simplify。没有再减面；预览中将 Tripo 绕 Y 轴旋转 -90°，统一正面朝向并以相同包围盒尺寸展示。

| 项目 | Tripo P1 | Hyper3D Rodin |
|---|---:|---:|
| 原始 GLB 字节 | 2,083,584 | 8,350,112 |
| 网页 GLB 字节 | 329,160（321.45 KiB） | 405,776（396.27 KiB） |
| 渲染三角面 | 4,743 | 8,000 |
| 网格 / 材质 | 1 / 1 | 1 / 1 |
| 纹理 | 3 × 2048² | 3 × 2048² |
| CLI 各处理阶段累计 | 约 0.94 秒 | 约 0.66 秒 |
| 修复并达到正式美术标准的人工时间 | 未测 | 未测 |

处理阶段计时来自工具日志，不含进程启动、整体 I/O 或人工整理。两者都是单网格、单材质，环、门面、台座没有可直接独立编辑的分件。网页大小分别约为自制基线 31,820 字节的 10.3 / 12.8 倍，均低于候选单模型 10 MiB 和单纹理 2 MiB 限制。

视觉判断（本样本、低面数设置）：Hyper3D 的金色装饰更规整，门面颜色更接近参考；近看环内边缘有明显粗糙/材质斑驳。Tripo 的环边材质相对平滑，但金色装饰扭曲，门面起伏更明显。两者都把参考底座生成成凹凸尖角，丢失原本规整台阶。背面补全可见，仍需形状整理；原始与 WebP/Meshopt 版的代表视角检查未见新的明显造型损坏。

结论：两者可继续作为静态概念道具候选；本样本暂时更倾向 Hyper3D 的轮廓一致性。两者尚未达到正式替换标准，主力工具选择等待 Meshy 和人工修复时间。一次样本不能证明稳定性，也不能推出 P2 的效果。

Chrome 本地 WebGL 预览成功加载四个文件，完成正面/背面/侧面/近看截图。统一最终视口 1100×860、DPR 1。最后一轮 loadAsync + 首次渲染：Tripo raw 292.5 ms / web 247.5 ms；Hyper3D raw 681.6 ms / web 242.8 ms。该数字来自本地开发服务器与混合缓存，只作加载成功证据；正式冷加载与目标设备 FPS 未测。预览开发服务器有 HMR 连接和 favicon 噪声，未宣称零控制台错误。

原始 SHA-256：Tripo `7e8a637eaebf29816041a6a74ec6c12df82c06ddd523cae272dbc128e81bf85c`；Hyper3D `e07d6fa2e6a124d9256aad628129f21d57db749e986d7535fe2254ae950cc9a2`。

## Meshy 用户交接

参考图：`output/tool-pilots/2026-10-02/portal-reference.png`，1024×1024，175,068 字节，SHA-256 `73fcade46b5cba8e4a3b28cbaba0a8184db247336167c2890425e40391c403a5`。来源为项目 MIT 自制 Departure Portal。

用户已交回 `C:/Users/12879/Downloads/Meshy_AI_Celestial_Gateway_1003030218_texture.glb`，确认使用 **Meshy 6 Lite**，账号可看到 7.1，但此次只有 6 Lite 可免费下载。该信息按用户实际账号观察记录，不推广为全部账号规则。原定 Smart Topology / 7.1 质量对照保持待测。

Meshy 6 Lite 实测：原始 10,299,980 字节，158,870 三角面，1 网格 / 1 材质，3 张 2048² JPEG。相同 Meshopt/WebP 管线、关闭减面后为 1,408,048 字节（1.34 MiB），工具处理阶段合计约 1.24 秒，不含进程启动与人工整理。用户使用免费额度；实际消耗额度、平台生成时间和输出授权条款尚未取得。

为了靠近同一面数预算，额外做独立减面候选：在已 weld 的优化版本上 simplify，ratio 0.05035564、error 0.01，随后重新执行 Meshopt/WebP。达到 **8,000 三角面**，526,516 字节（514.18 KiB）。这是自动有损处理，不代表 Meshy 原生 8,000 面输出；正式整理时间仍未测。

Chrome 加载原始、常规优化、8k 三个版本成功，各保存正面/背面/侧面/近看。常规优化版保留整体轮廓，门面边缘存在明显锯齿，底座尖角/面板裂纹感和环边起伏可见；8k 版出现更多凹凸与装饰圆钝，近看下降。此次未达到正式英雄道具标准。

本样本的网页低面数制作顺序暂定：**Hyper3D Rodin 优先候选，Tripo P1 备选；Meshy 6 Lite 保留免费概念验证用途**。三者都需人工修复、分件与权利审核，尚未正式采纳。该结论仅覆盖本参考图和已测版本；Meshy 7.1 / Smart Topology、Tripo P2 保持独立待测。

Meshy 三次本地 loadAsync + 首帧分别 588.6 / 251.7 / 165.5 ms，缓存未隔离，仅用于加载成功证据。用户下载原文件保持完整，候选与 12 张新截图位于忽略目录。没有新增费用或正式运行时依赖。

## Marble 首次小房间提示词

用户自行做一次免费文本生成，固定以下英文提示词。尺寸是生成目标，需要靠视角和导出后测量核验。

> Create one compact, enclosed music memory room, approximately 8 by 8 meters with a 3.5-meter-high ceiling, viewed from a standing person's eye level near the entrance. Use a cohesive stylized fantasy aesthetic: matte dark-purple stone walls, a smooth continuous stone floor, soft cyan accent lighting, and warm gold details. Place one simple circular pedestal in the center, about 1.5 meters wide and 0.5 meters tall, with clear walking space all around it. Include one clearly visible open doorway, about 1.2 meters wide and 2.2 meters tall, leading to a short lit vestibule. Keep the layout simple, with only two small wall niches. Use solid opaque surfaces, clean architectural edges, subtle stone texture, and even lighting that reveals the walls, corners, floor, and doorway clearly. Keep the floor level and unobstructed. Exclude people, text, logos, stairs, mirrors, glass, fog, floating objects, and extra rooms. The entire room should feel coherent and easy to explore at close range.

观看顺序：入口 → 绕中央台座一圈 → 靠近四面墙和墙角 → 穿门洞再返回。重点观察地面连续、墙角是否融化、门洞是否真实通透、台座是否漂浮；平台预览只能评估视觉，导出前本项目碰撞/FPS 保持未测。

## Marble：当前建议先不付费

[官方导出说明](https://docs.worldlabs.ai/marble/export/mesh)明确：Standard 可以导出碰撞网格，Pro 才可导出高清纹理网格；高清转换最长约一小时，通常 100–200 MB，复杂或薄面可能存在破洞和浮点。[订阅说明](https://docs.worldlabs.ai/marble/support/account-billing)将商用权列在 Pro，免费档最多 4 次世界生成。当前订阅金额需以结账界面核验，说明页的价格例子未作为报价。

对[官方厨房样例](https://docs.worldlabs.ai/marble/export/specs)执行 HTTP HEAD，得到以下原始传输大小；全部 HTTP 200：

| 文件 | 字节 | MiB |
|---|---:|---:|
| 500k SPZ | 7,582,907 | 7.23 |
| 2m SPZ | 30,268,621 | 28.87 |
| Collider GLB | 2,976,256 | 2.84 |
| HQ GLB | 133,030,764 | 126.87 |

只下载碰撞 GLB 做结构检查：GLB v2、声明长度正确，1 个网格、114,183 三角面，0 材质、0 纹理。SHA-256 `38b9f692edeb671b7106f3e36cfe7f4c55be20e98fe90c014a8714b09874f6fa`。此样例仅供内部技术评估，未列入正式资产清单。

该样例 HQ GLB 原始体积约为本项目单模型 10 MiB 上限的 12.7 倍，也超过总资产 50 MiB 上限。低精度高斯加碰撞约 10.07 MiB，还需额外渲染器与目标设备采样。这只是一个官方样例的下载证据，不能替代自制小房间实测或优化后预算。

付费条件：先在[Marble 免费入口](https://marble.worldlabs.ai/)生成一个小房间，检查近墙、门洞、地面与台座；满意后再考虑短期 Standard 导出高斯/碰撞做内部验证。需要商用或高清网格时，再核对 Pro 条款与价格。当前优先评估远景或独立房间；完整场景仍需编辑、音乐状态重建、碰撞和帧率证据。

用户已提供本轮生成的 [Marble 房间](https://marble.worldlabs.ai/world/f827f17b-8aa0-45a4-8761-b28780b91660)。下述视觉检查替代先前“未创建自有世界”的状态；本项目碰撞、冷加载、FPS、显存和该房间导出大小仍未测。官方厨房文件大小仅作为技术参考，不能套用到用户房间。

## Marble 用户房间的实际观看结果

2026-10-03 使用 Playwright CLI / Chrome 打开公开世界，1440×900 视口；无需登录即可观看。网页读取工具无法解析该链接，真实浏览器成功展示。沿原始视角向门移动，并在台座左右平移，保存入口、门框近看、左右墙及穿出可见表面的截图。

- 视觉优点：封闭房间、连续地面、圆形台座、单个门洞和短前厅清楚；青色顶灯和金色边线基本保持一致。已观察范围的房间轮廓较稳定，未看到台座明显悬空。
- 视觉缺点：墙面接近灰褐色，深紫幻想风格弱；近看门框带拉伸/涂抹感；台座侧面和底部光带附近出现模糊、揉皱细节。整体较像粗糙石质展厅，音乐主题辨识度有限。
- 空间边界：按网页 W/D 移动继续前进或横移后，会进入黑区并看到表面背侧/边界。这里证明观看相机能够离开可见房间，不能据此断言导出的碰撞网格失效，也不能把黑区全部判作室内破洞。门洞通行、落地、台座阻挡需要独立碰撞测试。
- 操作证据：查看了官方 Controls（WASD、E/Q、0 返回原点）；下载菜单显示 Splats 和 Collider mesh 均禁用。本次会话未登录，禁用原因可能涉及账号、套餐或所有权，未推定用户账号必然不能导出。未购买、生成或下载该世界的付费产物。
- 平台控制台有对象搜索 HTTP 403、遥测 HTTP 429 和着色器警告；公开视觉仍成功展示。未把平台浏览器状态作为本项目性能验收。

**当前决策：保留独立房间视觉候选，继续不购买。** 本样本足以验证空间生成方向，但近看质量和风格一致性尚不足以推动付费接入。远景可进一步试用；独立房间还需导出、碰撞、网页预算与互动地标证据；完整场景继续延期。若用户后续已具备免费/现有订阅导出权限，可提供该世界 SPZ 和 Collider GLB，按隔离预览继续评估。

用户随后确认账号无法导出，并明确选择“先不付费”。本轮 Marble 到免费视觉评估为止，现金支出为 0；停止追问导出与付费。碰撞、项目 FPS 和该房间下载体积维持未测状态，不列为当前待办。仅在用户重新安排且具备导出条件后恢复技术实测。

证据：`output/tool-pilots/2026-10-03/marble-entry.png`、`marble-door-near.png`、`marble-left-wall.png`、`marble-right-wall.png`、`marble-door-through.png`、`marble-right-wall-close.png` 等。`marble-vestibule.png` 实际仍在门前，不作为成功穿门证据；`marble-pedestal-near.png` / `marble-other-wall.png` 未产生足够视角变化，未据其声称完成四墙/绕行验收。当前观察距离缺少米制标定。

## 验证与留档

证据保存在忽略目录 `output/tool-pilots/2026-10-03/`：两项生成/查询收据、旧密钥拒绝记录、图片上传与逐像素检查工具、模型结构检查、原始/网页 GLB、16 张最终截图、Marble 文件大小与碰撞结构记录。已执行隔离候选优化和 Chrome 纹理预览；未新增正式资产或应用代码，未重跑产品 test/lint/build 或正式 assets:validate/assets:build，因为候选尚未采纳。正式采纳时须完整资产/浏览器/权利验收。
