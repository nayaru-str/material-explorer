# Material Explorer

一款基于节点编辑界面的 CMF 材质替换工具，设计师通过可视化工作流组合产品图片、材质参考、颜色与提示词，快速生成多组材质方案。

**在线访问**：https://material-explorer-phi.vercel.app

---

## 快速上手

### 在线使用

直接访问 [https://material-explorer-phi.vercel.app](https://material-explorer-phi.vercel.app)，无需安装任何依赖。

> 注意：局部材质替换功能（SAM 分割）需要本地运行 SAM 服务，详见下方「本地 SAM 分割服务」。

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看效果。

---

## 功能介绍

- **产品图片节点**：上传产品图片，作为材质替换的基底
- **材质参考节点**：上传材质意象图，引导 AI 生成方向
- **颜色选择节点**：通过色相环 + 饱和度/明度面板选择精确颜色
- **提示词节点**：输入文字描述，增强生成效果
- **预览节点**：连接上游节点，点击生成最终效果图
- **项目面板**：多项目管理，支持切换、重命名、删除
- **局部替换（SAM）**：通过点选指定产品图片中需要替换的区域

---

## 本地 SAM 分割服务

局部材质替换依赖 SAM（Segment Anything）模型，需要在本地启动 Python 服务。

### 安装依赖

```bash
# 进入 service 目录
cd service

# 创建虚拟环境
python -m venv .venv

# 激活虚拟环境
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

# 安装 Python 依赖
pip install fastapi uvicorn pillow numpy torch torchvision ultralytics
```

### 启动服务

```bash
cd service
.venv\Scripts\python.exe sam_service.py
```

服务启动后监听 `http://localhost:8080`，前端自动识别并连接。

> SAM 模型首次运行时会自动下载（约 375MB）。如遇网络问题，可使用国内镜像或预先下载模型文件。

---

## 技术栈

| 分类 | 技术 |
|---|---|
| 框架 | Next.js 16 + React 19 |
| 样式 | Tailwind CSS 4 |
| 画布 | @xyflow/react (React Flow) |
| 状态管理 | Zustand |
| AI 生成 | 通义万相 qwen-image-2.0-pro API |
| 图像分割 | SAM (Segment Anything) |
| 部署 | Vercel |
