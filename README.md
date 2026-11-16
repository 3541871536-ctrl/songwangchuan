# 顺风化吉 · 五幕电影化交互站

这是“送王船”主题网站的完整交互概念版本，保留参考站的核心滚动叙事方式并完成五幕内容：

- 新增王船燃烧视频封面：沿用全站宋体、墨金配色、朱印和题签，光标经过时局部揭示火光，“随船启程”点亮王船并进入原有香火叙事。
- 首屏多层视差、大字进入与香炉旋转。
- 三炷香随向下滚动持续缩短，香头、火星、烟羽和右侧 `00–100` 香火计量同步推进；香炉在首页与叙事页之间完成明显的大小与位置转场，进入终幕前自然熄灭淡出。
- 香枝从页面顶部开始计量，只有滚动到整页最底部才达到 `100`，中段阅读时仍保持可见长度。
- 三炷香上方由湍流烟团、横向风偏和膨胀消散组成的烟羽，移动端同步显示。
- 故事文字围绕中心器物自动让位。
- 标题、正文和说明采用更克制的小字号与更疏朗的行距，叠加杉浦康平式的非对称网格、竖排题记、超大描边字与冷暖套色。
- 故事正文按行分批从烟雾中显影，并对中英文句读执行避头规则；章节拱门交替从上下揭幕，并带有一道扫光；过渡段采用冷暖光带横穿；页脚加入缓慢潮线与链接光迹。
- “造舟、请王、巡境、送王”四章拱门裁切、三层画面视差和交替构图。
- “化吉”终幕改为宣纸手卷体验：卷轴从中央缩放、双轴展开，依次露出真实的“送王船”巡境影像、朱砂日轮、水墨远山、潮纹、竖排题记和“顺风化吉”朱印，最后以巨幅题字收束。
- 可横向浏览的仪式五程导航，以及桌面端固定章节轨道。
- 进入“一程一愿”后，造舟、请王、巡境、送王、化吉五枚节点自动依次点亮，暖金、朱红与冷青色光层沿流程线展开。
- 指针光晕、画面轻微倾斜、章节状态和页面滚动进度反馈。
- 可在浏览器本地保存的“祈愿”弹层，提交后触发香火粒子。
- 双主题仪式配乐：封面至巡境使用 Kevin MacLeod 的《Mountain Emperor》，进入“送王”后交叉淡入《Clash Defiant》，回看时自动淡回主主题；两段均使用完整授权曲目。
- 声景开关在封面阶段即可操作。香炉擦过正文时会发出轻扫纸面的颗粒声，五程节点依次触发木鱼，章节切换触发锣声，祈愿开启与提交分别触发深层锣音和清亮礼钟音。
- 桌面与手机响应式布局，并支持 `prefers-reduced-motion`。

## 运行

由于滚动帧通过 Canvas 加载，建议从本地 HTTP 服务打开：

```powershell
cd C:\Users\35418\Documents\Codex\2026-11-11\wo-2\outputs\shunfeng-huaji
node serve.mjs
```

然后访问 `http://127.0.0.1:4173`。

如果 `4173` 已被其他项目占用，可换端口：

```powershell
$env:PORT=4174
node serve.mjs
```

当前样片预览：`http://127.0.0.1:4174`。

## GitHub Pages

仓库已包含 `.github/workflows/pages.yml`。首次上传后，在仓库的
`Settings → Pages → Build and deployment` 中将 Source 设为 `GitHub Actions`。
之后每次推送 `main` 分支都会自动更新公开网址：

```text
https://<GitHub用户名>.github.io/shunfeng-huaji/
```

站点使用相对资源路径，因此可以直接部署在仓库子路径下。

## 当前素材说明

- 中心器物来自你提供的 FBX，已在 Blender 中重新打光，并输出为 96 张透明 WebP。
- 首页、造舟、化吉的场景是程序化三维概念占位图，用于确认构图、分层和交互。
- 正式上线前应替换为真实、获得授权的送王船摄影或经审核的定制画面。
- 当前网页不依赖任何外部字体、图片或 JavaScript CDN。

## 主要文件

- `index.html`：页面结构与中英文文案。
- `styles.css`：电影感排版、分层视差和响应式样式。
- `app.js`：帧序列、滚动控制、文字绕排和终幕动画。
- `assets/frames/`：香炉的 96 帧滚动序列。
- `assets/opening/`：王船封面底图、视频海报与循环燃烧视频。
- `assets/scenes/`：首页、四个章节和终幕的分层画面。
- `assets/audio/`：双主题仪式配乐及 7 组交互音效。
- `previews/`：桌面端与手机端渲染预览。

## 替换正式素材

保持文件名不变即可直接替换：

- `assets/scenes/hero-bg.webp`
- `assets/scenes/chapter-build-bg.webp`
- `assets/scenes/chapter-build-mid.webp`（透明）
- `assets/scenes/chapter-build-front.webp`（透明）
- `assets/scenes/chapter-invite-bg.webp`
- `assets/scenes/chapter-invite-mid.webp`（透明）
- `assets/scenes/chapter-invite-front.webp`（透明）
- `assets/scenes/chapter-procession-bg.webp`
- `assets/scenes/chapter-procession-mid.webp`（透明）
- `assets/scenes/chapter-procession-front.webp`（透明）
- `assets/scenes/chapter-sendoff-bg.webp`
- `assets/scenes/chapter-sendoff-mid.webp`（透明）
- `assets/scenes/chapter-sendoff-front.webp`（透明）
- `assets/scenes/homage-real-bg.webp`
- `assets/scenes/homage-real-incense-left.webp`（透明）
- `assets/scenes/homage-real-offering-right.webp`（透明）

真实照片的来源、处理方式和授权提示见 `ASSET_CREDITS.md`。

香炉帧需保持相同数量、尺寸、中心和命名。若正式帧数量不同，同时修改 `app.js` 顶部的 `FRAME_COUNT`。

## 祈愿数据

祈愿内容只写入浏览器 `localStorage`，不会发送到服务器。接入正式后端时可替换 `setupPrayerModal()` 中的保存逻辑，并补充隐私说明。
