# SAM 画笔分割实施计划

## 方案选择：方式一（本地 Python 服务）

SAM 模型部署在你自己的电脑上作为 HTTP 服务，前端通过 `app/lib/api/sam.ts` 调用。

```
你的电脑（本地部署）
┌─────────────────────────────────────────────┐
│  Python 服务 (localhost:8080)                │
│  SAM 模型 (PyTorch)                          │
│  监听 /sam/predict                          │
└─────────────────────────────────────────────┘
            ↑ HTTP 请求
前端浏览器 ──┘
```

---

## 实施任务清单

### 第一部分：Python SAM 服务（新建）

#### 1. `scripts/sam_server.py` — SAM HTTP 服务
- 基于 Flask + segment-anything
- 支持两种 prompt 方式：**点选**（point_coords + point_labels）和**框选**（box）
- 返回：多张候选 mask（Base64 PNG）、最佳 bbox、scores
- 首次运行自动下载模型（vit_h，约 2.4GB）
- 优先使用 GPU（CUDA），无 GPU 则用 CPU

### 第二部分：前端 SAM 集成（修改现有文件）

#### 2. `app/components/nodes/PreviewNode.tsx` — 画笔交互 UI
在预览节点中嵌入 `<SAMCanvas>` 交互组件：
- 进入分割模式：点击节点内的"分割"按钮
- 显示产品图片，点击绘制正样本（绿点）/ 负样本（红点）
- 点击"分割"按钮 → 调用 SAM API
- 显示 SAM 返回的多张候选 mask 供选择
- 确认后：`setSelectedMask(previewNodeId, selectedMaskBase64)`

#### 3. `app/components/canvas/SAMCanvas.tsx`（新建）— 画布交互组件
- 在产品图上叠加透明 canvas，监听 click 事件
- 支持添加正样本（绿）/ 负样本（红）点击点
- 调用 `segmentWithSAM()` 获取 mask
- 显示多张候选 mask overlay
- 支持清除、重置操作

#### 4. `app/hooks/useWorkflowStore.ts` — 已有 `segmentWithSAM` 集成
`generateImage` 逻辑已正确：将 `previewNode?.data.selectedMask` 传给通义万相 API，无需修改。

#### 5. `app/components/nodes/ProductImageNode.tsx` — 添加分割入口
- 添加"分割"按钮
- 点击后弹出一个 Modal/Overlay，内嵌 SAMCanvas
- 分割完成后将 mask 存储在产品图节点：`updateNodeData(productNodeId, { selectedMask: maskBase64 })`

### 第三部分：使用说明

#### 6. `scripts/README.md` — SAM 服务使用说明
- 环境准备（Python 依赖安装）
- 模型下载说明
- 启动命令
- API 接口说明

---

## 关键架构说明

```
用户点击"分割"
    ↓
ProductImageNode 打开分割 Modal
    ↓
SAMCanvas 显示产品图 + 叠加 canvas
    ↓
用户点击添加正/负样本点
    ↓
用户点击"运行分割"
    ↓
segmentWithSAM({ image: dataUrl, point_coords, point_labels })
    ↓
POST localhost:8080/sam/predict
    ↓
Python SAM 服务返回 masks[]
    ↓
SAMCanvas 显示多张候选 mask，用户选择
    ↓
selectedMask 存入 ProductImageNode.data.selectedMask
    ↓
generateImage 时，generateImage 查找上游 productNode
    读取 productNode.data.selectedMask 传给通义万相 API
```

---

## 文件变更汇总

| 文件 | 操作 |
|---|---|
| `scripts/sam_server.py` | 新建 |
| `scripts/README.md` | 新建 |
| `app/components/canvas/SAMCanvas.tsx` | 新建 |
| `app/components/nodes/ProductImageNode.tsx` | 修改（添加分割入口）|
| `app/components/nodes/PreviewNode.tsx` | 小改（添加分割状态 UI）|
| `app/lib/types.ts` | 可能需要扩展类型 |
