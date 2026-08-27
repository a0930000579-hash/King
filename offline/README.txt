君主之刃 · 离线版
================

文件结构：
  index.html      主页面
  styles.css      样式表
  game.js         游戏逻辑（784 个图片 URL 中 635 个已替换为本地 assets/）
  lang.js         语言文件
  assets/         635 张本地图片（aka.doubaocdn.com 来源）

未离线化的资源：
  - 149 个 /spark/ 路径的静态资源（图标、UI 等），
    这些需要联网才能加载。它们的 CDN 域名在沙箱环境无法访问，
    保留了原始相对路径。如需完全离线，请自行从浏览器访问后另存。
  - Google Fonts 字体（Noto Serif SC + ZCOOL XiaoWei），
    已保留 miaoda.feishu.cn 镜像链接。

启动方式：
  在 offline/ 目录下用任意静态服务器启动，例如：
    python3 -m http.server 8000
  然后浏览器打开 http://localhost:8000
