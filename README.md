# AniVault

AniVault 是一个基于 Tauri + Vue 3 开发的桌面端动漫视频播放客户端。项目围绕本地桌面使用体验、播放状态管理、多数据源扩展、HLS 播放和播放历史记录进行设计，目标是构建一个轻量、可扩展、可打包发布的视频内容管理与播放工具。

> 当前项目仍处于开发阶段，部分数据源、解析能力和桌面端能力会持续迭代。

## 功能特性

- 桌面端应用：基于 Tauri 2 构建，面向 Windows 桌面使用场景。
- 首页浏览：提供内容入口、推荐展示和快速导航。
- 搜索功能：支持关键词搜索内容，并进入详情页查看信息。
- 详情页面：展示条目基础信息、剧集列表和播放入口。
- 视频播放：基于 hls.js 支持 HLS 视频流播放。
- 多播放源切换：支持不同来源之间切换播放地址。
- 播放状态管理：记录当前条目、当前剧集、播放源、音量、倍速、全屏等状态。
- 播放历史：保存观看记录，方便继续观看。
- 数据源管理：提供数据源配置与扩展入口，为后续插件化解析预留空间。
- Live2D 展示：集成 oh-my-live2d，用于桌面端视觉展示。
- 测试覆盖：使用 Vitest 和 Playwright 覆盖核心状态逻辑与主要页面流程。

## 技术栈

### 前端

- Vue 3
- Vite 6
- Vue Router
- Pinia
- Axios
- hls.js
- oh-my-live2d

### 桌面端

- Tauri 2
- Rust
- Tauri HTTP Plugin
- Tauri Shell Plugin

### 测试

- Vitest
- Playwright
- Vue Test Utils
- jsdom

## 项目结构

```text
AniVault
├─ src
│  ├─ api                 # 请求封装、数据源客户端、Worker 客户端
│  ├─ components          # 通用组件、布局组件、播放组件、Live2D 组件
│  ├─ router              # 页面路由
│  ├─ store               # Pinia 状态管理
│  ├─ styles              # 全局样式、变量、动画
│  ├─ utils               # 缓存、图片代理、请求工具、通用方法
│  └─ views               # 首页、搜索、详情、播放、历史、数据源等页面
├─ src-tauri              # Tauri 桌面端配置与 Rust 入口
├─ csp-engine             # 内容源解析相关服务与插件
├─ worker                 # 辅助 Worker 服务
├─ tests                  # 单元测试与端到端测试
├─ scripts                # 资源下载与构建辅助脚本
└─ public                 # 静态资源
```

## 快速开始

### 环境要求

- Node.js 18+
- npm
- Rust 环境
- Tauri 2 运行环境

### 安装依赖

```bash
npm install
```

### 启动 Web 开发环境

```bash
npm run dev
```

### 启动 Tauri 桌面端

```bash
npm run tauri dev
```

### 构建前端

```bash
npm run build
```

### 运行测试

```bash
npm run test
```

## 核心模块说明

### 播放器状态

播放器状态由 `src/store/usePlayerStore.js` 管理，包含：

- 当前播放条目
- 当前剧集
- 当前播放源
- 播放进度
- 音量与静音状态
- 倍速
- 全屏状态
- 本地状态持久化

### 数据源管理

项目预留了数据源扩展能力，相关代码位于：

- `src/views/Sources.vue`
- `src/store/useSourceStore.js`
- `src/api/source-client.js`
- `src/api/sub-client.js`
- `csp-engine/plugins`

后续可继续扩展不同来源的搜索、详情解析和播放地址解析能力。

### 桌面端能力

桌面端配置位于 `src-tauri/tauri.conf.json`，包含应用窗口、权限、资源打包和构建命令等配置。项目通过 Tauri 将 Vue 前端封装为桌面客户端。

## 开发说明

- `node_modules`、`dist`、`src-tauri/target` 等构建产物不会提交到仓库。
- `src-tauri/resources/node` 为本地运行时资源目录，不建议直接提交到 Git。
- 如果需要桌面端打包，请先确认 Tauri、Rust 和相关系统依赖已安装完成。
- 当前项目包含部分本地静态模型资源，公开仓库时请注意素材授权问题。

## 后续计划

- 优化播放器 UI 和桌面端交互体验。
- 增强数据源插件化能力。
- 完善播放失败、跨源加载、资源不可用等异常处理。
- 增加下载、收藏、继续观看等功能。
- 优化测试覆盖与打包发布流程。

## License

当前项目仅用于学习、开发实践与作品展示。若后续正式发布，请补充明确的开源协议与第三方资源授权说明。

