# 风车样片 GitHub Pages 试玩发布

日期：2026-10-19。用户授权将当前 demo 发布到现有 GitHub 网站，邀请朋友试玩。

- 用户结果：可直接分享的 HTTPS 试玩链接，进入风车样片。
- 阶段门槛：当前音乐玩法样片的真人观察；沿用既有工程发布流程，无新增分享平台。
- 最小闭环：保存已验证源码快照 → GitHub Pages 构建/发布 → 线上真实歌曲、移动、E 操作、完成/重走检查 → 分享链接。
- 范围外：账号、上传托管、反馈数据库、多人或移动端改造。
- 性能/无障碍/权利：保留曲目署名、静音/轻量模式和桌面输入限制；沿用授权资产管线。
- 回退：现有 Pages 可选择旧版提交建立回退分支并按既有规则发布；本轮源码先保存在独立分支，再通过 PR 合入 main。原本地工作区和已有项目不清理。

发布范围是当前已验证的花园/风车运行时、所需音乐/模型、项目格式与相关创作依赖。此前本地已有改动保留。远程 main 新增 HTML 导出研究文档保留；不覆盖远程路线图中的研究记录。

## 试玩入口

试玩入口：`https://crf2004.github.io/Music_Universe_Interface_Kit/?study=coastal&play=wind-v1&release=wind-m1-20261019`。

使用电脑 Chrome 或 Edge，键盘 WASD 移动、E 操作；手机触屏操作尚未支持。站点不收集试玩反馈，反馈由邀请人另行整理。

## 发布前验证

此前同一行为版本：129 项测试、类型检查、资产校验/构建通过；Chrome/Edge 各 18 项风车流程，原花园 Chrome 35 项回归通过。详见 [M1 记录](childhood-wind-m1-2026-10-19.md)。本轮额外核查 GitHub Pages 子目录路径与线上部署。

## 发布结果

- 源码快照：`3c426bf3c7d0f736e5e4f63149fb65bdaf3d4b00`，分支 `codex/childhood-wind-playtest-2026-10-19`。远程 main 独有的 HTML 研究文档与路线图记录保留，原工作区和真实暂存区未重置。
- 首次分支发布的构建成功，部署被 github-pages 环境的分支规则拒绝（run `39215889348`）。未修改环境保护；通过 [PR #17](https://github.com/CRF2004/Music_Universe_Interface_Kit/pull/17) 的检查后按正常流程合入 main。
- PR CI `39216183158` 成功；发布合并提交 `062f1860578f8e4d4593d4a1058e2cd8290e3fed` 的源码树与已验证快照一致。
- [GitHub Pages 发布任务](https://github.com/CRF2004/Music_Universe_Interface_Kit/actions/runs/39216400962) 构建与部署均成功。
- 本地 Pages 子目录构建通过，额外 18 项 Chrome 流程通过。构建日志 `output/wind-pages-build.log`，浏览器日志 `output/wind-pages-local-browser.log`。
- 线上 Chrome 完整 18 项试玩检查通过，包含真实音乐、WASD/E、路径通关、seek、重玩、自然结束后补做、静音/轻量、小窗口和刷新；无 pageerror。报告 `output/playwright/wind-online-chrome/report.json`，日志 `output/wind-online-browser.log`。已查看线上入口截图。

当前为桌面玩法观察样片，最终美术、细分乐句编排与目标设备受控性能验收保持待办。发布没有新增费用服务、数据收集或触屏能力。
