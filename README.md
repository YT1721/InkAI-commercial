# InkAI (inkai-1.14)

## 🎨 项目概述
**InkAI** 是一个由 AI 赋能的无限创意工作室。它采用基于节点的所见即所得（WYSIWYG）工作流编辑器，深度集成 **Google Gemini (Pro/Flash/Veo)** 等前沿多模态模型，帮助创作者打破技术壁垒，通过直观的拖拽与连接，完成从灵感构思、剧本创作、分镜绘制到长视频生成的全流程创作。

## 🚀 核心功能亮点

### 1. ⚡️ 无限节点工作流 (Infinite Node Studio)
*   **拖拽式创作**：像搭积木一样构建您的创意流水线。
*   **多模态节点**：
    *   **📝 剧本大师 (Script Master)**：智能创作、改编剧本，支持从视频反推剧本。
    *   **🎨 图片生成 (Image Gen)**：搭载 Gemini Imagen 3，支持文生图、参考图控制。
    *   **🎬 视频生成 (Video Gen)**：集成 **Google Veo** 模型，支持文生视频、图生视频。
    *   **📼 视频分析 (Video Analyze)**：深度理解视频内容、运镜与风格。
    *   **🎼 灵感音乐 (Sonic Studio)**：独立的音频创作节点，支持文生音效/配乐。
    *   **🖌️ 图像编辑 (Sketch Editor)**：内置画板，支持手绘草图生图（In-painting/Img2Img）。

### 2. 🎞️ 智能多帧序列 (Smart Sequence Dock)
**解决 AI 视频“连贯性”难题的杀手级功能。**
*   **分段连续生成**：自动将多张关键帧拆解为 A->B, B->C 的连续片段，确保每一帧都被精确还原。
*   **智能过渡 (Smart Transition)**：支持为每一段过渡单独设置运镜提示词（如“快速推镜头”、“淡入淡出”）。
*   **单段重绘 (Regenerate Segment)**：不满意的片段可单独重新生成，无需重跑整个流程，极大提升创作效率。
*   **无缝播放器**：内置播放器支持多片段无缝衔接预览、全屏查看及分段下载。

### 3. 🎵 智能配乐系统 (Smart Soundtrack)
*   **上下文感知**：一键分析当前生成的视频内容与运镜风格。
*   **自动生成**：调用 Gemini Audio 模型生成契合氛围的背景音乐 (BGM)。
*   **音画同步**：生成的音乐自动与视频绑定，播放时完美同步。

### 4. 🌍 国际化与本地化
*   支持 **中/英** 双语界面切换。
*   内置 API 代理服务，解决 Google API 资源在国内网络环境下的跨域与加载问题。

## 🛠 技术栈

### 核心框架
*   **框架**: [Next.js 14](https://nextjs.org/) (App Router, SSR/RSC)
*   **语言**: TypeScript 5.4+
*   **构建工具**: Turbopack (Dev) / Webpack (Build)
*   **部署平台**: Vercel (推荐) / Docker / Node.js Server

### 前端技术
*   **样式方案**: Tailwind CSS + clsx + tailwind-merge
*   **图标库**: Lucide React
*   **动画库**: Framer Motion
*   **画布交互**: 自研节点引擎 (SVG + React State)
*   **状态管理**: React Hooks (局部) + Zustand (全局) + Context API
*   **数据持久化**: IndexedDB (idb-keyval, 本地存储大量媒体资源)

### AI 与后端服务
*   **多模态模型**: Google Gemini (Pro 1.5, Flash 1.5, Veo, Imagen 3)
*   **SDK**: `@google/genai` (官方 SDK)
*   **API 代理**: Next.js Route Handlers (`/api/proxy-file`) - 处理跨域流式传输
*   **国际化**: `next-intl` (中间件路由策略)

## 🏗️ 架构设计与部署指南

### 架构概览
InkAI 采用 **"重前端，轻后端" (Thick Client, Thin Server)** 的架构模式，充分利用现代浏览器的计算能力和 IndexedDB 的存储能力，最大限度降低服务器成本。

1.  **客户端 (Client)**:
    *   承载所有 UI 交互、画布逻辑和状态管理。
    *   直接与 Google Gemini API 通信（在配置了客户端 Key 的情况下），或通过后端代理中转。
    *   使用 IndexedDB 本地存储用户生成的图片、视频大文件，保护用户隐私并减少带宽消耗。

2.  **服务端 (Server - Next.js)**:
    *   **页面渲染 (SSR)**: 提供首屏 HTML，优化 SEO 和加载速度。
    *   **API 代理**: 提供 `/api/proxy-file` 接口，用于中转 Google 存储桶的媒体文件，解决浏览器直接访问的 CORS 限制，并隐藏服务端 API Key（如果配置了）。
    *   **路由中间件**: 处理 `/zh`, `/en` 等国际化路由重定向。

## 💎 商用化路线图 (Commercial Roadmap)

为支持未来商用化部署，本项目规划了以下核心商业模块：

### 1. 🔐 用户系统 (User System)
*   **多端身份认证**：集成 Clerk 或 NextAuth.js，支持 GitHub、Google、微信及手机号登录。
*   **云端工作流同步**：将本地工作流（Zustand + IndexedDB）异步同步至云端数据库（PostgreSQL/Supabase），实现跨设备创作。
*   **个人资产库**：用户生成的图片、视频云端托管，支持分类管理与永久分享链接。

### 2. 💳 计费与配额 (Billing & Quota)
*   **Token 计费引擎**：实时计算 Gemini API 的消耗，并转化为内部“创意点数 (Credits)”。
*   **会员订阅体系**：设计不同等级的订阅计划（Free/Pro/Team），限制生成时长、分辨率及存储空间。
*   **支付网关**：集成 Stripe (国际) 或 微信/支付宝 (国内) 支付。

### 3. 🛡️ 后台管理系统 (Admin Dashboard)
*   **用户运营看板**：监控活跃用户 (DAU)、生成任务量及 API 成功率。
*   **计费管理**：手动调整用户配额、查看流水账单、处理退款。
*   **模型路由管理**：动态切换 API Key 负载均衡，设置不同模型的调用优先级。
*   **社区模版审核**：管理用户分享到“公开市场”的工作流模版。

### 部署建议 (Vercel)

本项目针对 **Vercel** 进行了深度优化，推荐使用 Vercel 进行一键部署。

1.  **环境变量配置**:
    在 Vercel 后台配置以下环境变量：
    *   `GEMINI_API_KEY`: 您的 Google Gemini API Key (服务端生成用)。
    *   `NEXT_PUBLIC_DEFAULT_LOCALE`: 默认语言 (如 `zh`)。

2.  **构建命令**:
    *   Build Command: `next build`
    *   Install Command: `npm install`
    *   Output Directory: `.next`

3.  **注意事项**:
    *   由于视频生成涉及较长时间的 API 等待，建议在 Vercel 中配置较大的 **Serverless Function Timeout** (如 60s+)，或者优先引导用户在前端填入自己的 API Key 以使用客户端直接生成模式。

## 📦 快速开始

### 前置要求
*   Node.js 18+
*   Google Gemini API Key (需支持 Veo/Imagen 权限)

### 安装与运行

```bash
# 1. 克隆项目
git clone https://github.com/your-repo/inkai.git
cd inkai

# 2. 安装依赖
npm install

# 3. 配置环境变量
# 复制 .env.example 为 .env.local 并填入您的 API Key
cp .env.example .env.local

# 4. 启动开发服务器
npm run dev
```

访问 `http://localhost:3000` 即可开始创作。

## 🗺️ 项目结构

```
/src
  /app
    /api/proxy-file      # 媒体资源代理服务 (解决CORS)
    /[locale]/studio     # 核心编辑器页面
  /components
    /SmartSequenceDock   # 智能序列与配乐核心组件
    /SonicStudio         # 音频工作室组件
    /nodes               # 各类功能节点组件
  /services
    geminiService.ts     # AI 模型调用封装 (含分段生成逻辑)
```

## 📝 开发状态
| 功能模块 | 状态 | 备注 |
| :--- | :---: | :--- |
| **基础画布与节点** | ✅ 完成 | 支持缩放、平移、连线、**批量移动** |
| **Google Veo 视频** | ✅ 完成 | 支持 1080p 生成、**运镜控制** |
| **智能多帧序列** | ✅ 完成 | 支持分段重绘、过渡微调 |
| **智能配乐** | ✅ 完成 | 视听同步 |
| **音频工作室** | ✅ 完成 | 独立音效生成、**可视化波形** |
| **资产管理** | ✅ 完成 | **一致性角色库**、历史素材库 |
| **数据安全** | ✅ 完成 | **工作流导出/导入 (JSON)**、备份/清理 |
| **管理后台** | 🛠 预览 | **商用原型监控面板**、模型路由 |
| **代理服务** | ✅ 完成 | 解决资源跨域问题 |

---
*InkAI - Empowering Creativity with Intelligence.*
