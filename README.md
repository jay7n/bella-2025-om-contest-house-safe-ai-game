家庭安全巡查官 · Phaser 3 骨架

简介
- Phaser 3 驱动的 2D 俯视“找隐患”小游戏骨架，离线可运行。
- 场景架构：Boot → Menu → Level → Result。

目录结构
- `public/index.html` — 宿主页面，引入 `vendor/phaser.min.js` 与样式。
- `public/styles.css` — 基础样式与 HUD。
- `public/vendor/` — 放置本地 `phaser.min.js`（需自行下载）。
- `src/main.js` — 游戏配置与场景注册。
- `src/scenes/BootScene.js` — 预加载与引导。
- `src/scenes/MenuScene.js` — 菜单与开始入口。
- `src/scenes/LevelScene.js` — 关卡（占位版：热区判定、计时/提示/评分）。
- `src/scenes/ResultScene.js` — 结算与返回。
- `src/state/levels.js` — 关卡配置示例（教学关）。

依赖
- 使用 npm 方式引入 Phaser（`package.json` 已包含 `phaser`）。

运行（NPM + Vite）
1) 安装依赖：`npm install`
2) 放置 Phaser：下载 `phaser.min.js` 到 `public/vendor/`
3) 开发服务器：`npm run dev`（默认 http://localhost:5173 自动打开）
4) 生产构建：`npm run build` → 产物在 `dist/`
5) 预览构建：`npm run preview`

下一步开发建议
- 将关卡背景替换为真实资源（Tiled 地图或静态图），把 `levels.js` 中的 hazards 坐标调整为实际百分比位置。
- 增加提示次数限制、错误扣时阈值与评级阈值配置。
- 扩展第二关（客厅+阳台）与第三关（浴室），使用相同的数据结构快速复用。
