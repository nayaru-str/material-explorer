# Material Explorer - Node-Based CMF Design Tool

## 1. Concept & Vision

一个基于节点编辑界面的 AIGC 材质替换工具，让 CMF 设计师能够像搭建可视化工作流一样，直观地将产品图片、材质参考图、颜色选择和文字提示词组合在一起，快速探索多种材质方案。界面风格参考专业创意工具（如 Figma、Blender）的暗色主题，营造沉浸式创作氛围。

## 2. Design Language

### Aesthetic Direction
深色专业创意工具风格，参考 Blender Node Editor 和 Figma 的设计语言。低饱和度背景配合高对比度的节点卡片，营造专注的创作空间。

### Color Palette
- **Background**: `#0d0d0d` (主画布背景)
- **Surface**: `#1a1a1a` (节点卡片背景)
- **Surface Elevated**: `#242424` (侧边栏/面板)
- **Border**: `#2a2a2a` (默认边框)
- **Border Active**: `#404040` (悬停边框)
- **Primary**: `#60a5fa` (蓝色 - 主操作)
- **Accent Wood**: `#d97706` (橙色 - 木质材质节点)
- **Accent Metal**: `#71717a` (灰色 - 金属材质节点)
- **Accent Fabric**: `#a855f7` (紫色 - 织物材质节点)
- **Accent Plastic**: `#22d3ee` (青色 - 塑料材质节点)
- **Text Primary**: `#ffffff`
- **Text Secondary**: `#a1a1aa`
- **Text Muted**: `#52525b`
- **Success**: `#22c55e`
- **Error**: `#ef4444`

### Typography
- **Font**: Inter (Google Fonts), fallback: system-ui, sans-serif
- **Node Title**: 14px, font-weight: 600
- **Node Content**: 13px, font-weight: 400
- **Sidebar**: 12px
- **Labels**: 11px, uppercase, letter-spacing: 0.05em

### Spatial System
- **Grid**: 20px snapping grid (optional)
- **Node Width**: 240px (固定)
- **Node Padding**: 12px
- **Connection Handle Size**: 12px
- **Canvas Padding**: 40px
- **Border Radius**: 8px (节点), 12px (面板)

### Motion Philosophy
- **Node Drag**: 实时跟随，无延迟
- **Connections**: 贝塞尔曲线，动画跟随
- **Hover States**: 150ms ease-out
- **Panel Transitions**: 200ms ease-in-out
- **Loading States**: 脉冲动画

## 3. Layout & Structure

### Main Layout
```
┌─────────────────────────────────────────────────────────────────┐
│  Header: Logo + 项目名称 + 操作按钮                              │
├──────────┬─────────────────────────────────────────┬─────────────┤
│          │                                         │             │
│  左侧边栏 │            Canvas 工作区                 │  右侧面板   │
│  节点面板 │         (节点编辑画布)                   │  属性面板   │
│          │                                         │             │
│  - 图片   │    ┌─────────┐      ┌─────────┐        │ 选中节点    │
│  - 颜色   │    │  产品图  │──────▶│  预览   │        │ 详细配置    │
│  - 提示词 │    └─────────┘      └─────────┘        │             │
│  - 材质库 │                                         │             │
│          │    ┌─────────┐                          │             │
│          │    │ 材质图  │                          │             │
│          │    └─────────┘                          │             │
│          │                                         │             │
└──────────┴─────────────────────────────────────────┴─────────────┘
```

### Responsive Strategy
- 桌面优先设计（1280px+）
- 侧边栏可折叠
- Canvas 支持缩放和拖拽

## 4. Features & Interactions

### 节点类型

#### 4.1 产品图片节点 (Product Image Node)
- **输入**: 拖拽/上传图片
- **输出**: 图片数据流
- **功能**:
  - 点击上传或拖入图片
  - 显示缩略图预览
  - 支持删除/替换图片

#### 4.2 材质参考节点 (Material Reference Node)
- **输入**: 拖拽/上传图片
- **输出**: 材质纹理数据
- **功能**:
  - 上传材质意象图
  - 自动识别材质类型标签（木质/金属/织物/塑料/其他）

#### 4.3 颜色选择节点 (Color Picker Node)
- **输入**: 无
- **输出**: 颜色值
- **功能**:
  - 颜色选择器
  - 预设颜色面板
  - 支持 HEX/RGB 输入

#### 4.4 提示词节点 (Prompt Node)
- **输入**: 无
- **输出**: 文本描述
- **功能**:
  - 多行文本输入
  - 预设提示词模板
  - 常用材质描述快捷添加

#### 4.5 预览/分割节点 (Preview Node)
- **输入**: 产品图 + (材质图/颜色/提示词) 任意组合
- **输出**: 处理后图片
- **功能**:
  - SAM 交互式分割选择
  - 画笔/橡皮擦调整选区
  - 实时预览 mask
  - 点击生成按钮调用 API

#### 4.6 材质库节点 (Material Library Node)
- **输入**: 无
- **输出**: 预设材质
- **功能**:
  - 预设材质缩略图
  - 点击添加材质到工作流

### 连接规则
- 产品图片 → 预览节点（必需）
- 材质图/颜色/提示词 → 预览节点（至少一个）
- 材质库 → 材质图节点

### 操作
- **添加节点**: 从左侧面板拖入或双击
- **连接**: 从输出端口拖到输入端口
- **删除**: 选中后按 Delete 或点击删除按钮
- **复制**: Ctrl/Cmd + C/V
- **撤销/重做**: Ctrl/Cmd + Z/Y

## 5. Component Inventory

### Node Card
- **默认**: 深色卡片，白色标题，灰色描述
- **悬停**: 边框变亮，阴影加深
- **选中**: 蓝色边框，显示删除/复制按钮
- **错误**: 红色边框，显示错误提示
- **加载中**: 脉冲动画

### Connection Line
- **默认**: 灰色细线
- **悬停**: 线条加粗
- **有效连接**: 根据数据类型显示对应颜色
- **无效连接**: 红色，提示不兼容

### Sidebar Item
- **默认**: 透明背景
- **悬停**: 背景变亮
- **拖拽中**: 半透明，跟随鼠标

### Button
- **Primary**: 蓝色背景，白色文字
- **Secondary**: 透明背景，边框
- **Icon**: 透明背景，图标按钮
- **Disabled**: 降低透明度，禁止点击

### Color Swatch
- 圆形色块，支持点击选择
- 选中状态显示勾选标记

## 6. Technical Approach

### Framework
- Next.js 16 + React 19
- TypeScript
- Tailwind CSS 4

### Key Libraries
- `@xyflow/react` (React Flow) - 节点编辑器核心
- `lucide-react` - 图标库

### State Management
- React hooks + Context for workflow state
- Zustand (可选，用于复杂状态)

### API Integration
- SAM Model: 本地运行或云端 API
- Qwen-image-2.0: REST API 调用

### File Structure
```
app/
├── page.tsx                 # 主页面
├── layout.tsx               # 布局
├── globals.css              # 全局样式
├── components/
│   ├── canvas/
│   │   ├── WorkflowCanvas.tsx      # 主画布
│   │   ├── NodeWrapper.tsx          # 节点包装器
│   │   └── ConnectionLine.tsx       # 自定义连接线
│   ├── nodes/
│   │   ├── ProductImageNode.tsx    # 产品图节点
│   │   ├── MaterialRefNode.tsx      # 材质参考节点
│   │   ├── ColorPickerNode.tsx      # 颜色选择节点
│   │   ├── PromptNode.tsx           # 提示词节点
│   │   ├── PreviewNode.tsx           # 预览节点
│   │   └── MaterialLibraryNode.tsx  # 材质库节点
│   ├── ui/
│   │   ├── Sidebar.tsx              # 侧边栏
│   │   ├── PropertyPanel.tsx         # 属性面板
│   │   ├── Header.tsx               # 顶部栏
│   │   └── Button.tsx                # 按钮组件
│   └── icons/
│       └── NodeIcons.tsx             # 节点图标
├── hooks/
│   ├── useWorkflowStore.ts           # 工作流状态
│   └── useImageUpload.ts             # 图片上传
└── lib/
    ├── types.ts                      # 类型定义
    └── constants.ts                  # 常量配置
```
