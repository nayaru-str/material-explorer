# SAM 本地服务使用说明

## 方案一：pip 直接安装（推荐国内用户）

由于 GitHub 访问受限，推荐使用国内镜像安装：

```bash
# 设置 pip 镜像
pip install pip -U
pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/

# 安装依赖
pip install torch torchvision --extra-index-url https://download.pytorch.org/whl/cpu
pip install flask flask-cors
pip install numpy pillow

# 安装 segment-anything（从 PyPI 或镜像）
pip install segment-anything
```

如果 PyPI 上找不到，尝试其他镜像：
```bash
pip install segment-anything -i https://pypi.tuna.tsinghua.edu.cn/simple/
```

---

## 方案二：使用 Gitee 镜像手动安装

如果 pip 安装也失败，手动克隆 Gitee 镜像：

```bash
# 克隆 SAM 仓库（使用 Gitee 镜像）
git clone https://gitee.com/mirrors/segment-anything.git

# 进入目录安装
cd segment-anything
pip install -e .
```

如果 Gitee 也没有镜像，可以找朋友帮忙从 GitHub 下载后传过来。

---

## 方案三：仅下载 SAM 模型（不需要包）

如果只想用 SAM 推理（不需要源码），可以从 HuggingFace 下载：

```bash
pip install transformers
```

然后在 Python 中：
```python
from transformers import SamProcessor, SamModel

processor = SamProcessor.from_pretrained("facebook/sam-vit-huge")
model = SamModel.from_pretrained("facebook/sam-vit-huge")
```

---

## 模型下载（SAM 模型权重）

首次运行服务时会自动下载模型。如果下载失败（GitHub/官方 CDN 访问不了），手动下载：

### 官方下载地址（可能需要代理）

| 模型 | 下载地址 |
|---|---|
| vit_h (2.4 GB) | https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4ec893100.pth |
| vit_l (1.2 GB) | https://dl.fbaipublicfiles.com/segment_anything/sam_vit_l_0b3195.pth |
| vit_b (375 MB) | https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth |

### 国内镜像（推荐）

从 Modelscope 下载：
```bash
# 安装魔搭下载工具
pip install modelscope

# 下载模型
python -c "from modelscope.hub.snapshot_download import snapshot_download; snapshot_download('iic/sam-vit-huge', cache_dir='./sam_models')"
```

或者直接访问：https://www.modelscope.cn/models/iic/sam-vit-huge

下载后将 `.pth` 文件放到本地，用 `--checkpoint` 参数指定：
```bash
python sam_server.py --checkpoint ./sam_vit_h_4ec893100.pth --model vit_h
```

---

## 启动服务

```bash
cd scripts
python sam_server.py
```

### 参数说明

| 参数 | 默认值 | 说明 |
|---|---|---|
| `--port 8080` | 8080 | 服务端口 |
| `--model vit_h` | vit_h | 模型大小 (vit_h/vit_l/vit_b) |
| `--checkpoint 路径` | 自动下载 | 本地模型权重路径 |

### 验证服务是否正常运行

```bash
curl http://localhost:8080/sam/status
```

返回 `{"status": "ok", "model_loaded": true}` 即成功。

---

## 接口说明

### POST `/sam/predict`

**请求体 (JSON):**

```json
{
  "image": "base64字符串 或 http URL",
  "point_coords": [[0.3, 0.5], [0.7, 0.6]],
  "point_labels": [1, 0],
  "multimask_output": true
}
```

- `image`: 图片（Base64 / Data URL / HTTP URL）
- `point_coords`: 点击坐标（**归一化 0-1**）
- `point_labels`: `1` = 正样本（要选），`0` = 负样本（不要）
- `box`: 可选，代替点选 `[x1, y1, x2, y2]`（归一化 0-1）

**返回:**

```json
{
  "masks": ["base64_png_1", "base64_png_2", "base64_png_3"],
  "bbox": {"x": 100, "y": 50, "width": 300, "height": 200},
  "scores": [0.95, 0.87, 0.82],
  "best_index": 0
}
```

### GET `/sam/status`

健康检查：
```json
{"status": "ok", "model_loaded": true}
```

---

## 常见问题

**Q: pip 安装报 SSL 错误**
A: 国内网络问题，切换镜像源后重试：
```bash
pip install xxx -i https://mirrors.aliyun.com/pypi/simple/
```

**Q: 模型下载太慢/失败**
A: 使用 Modelscope 国内镜像下载（见上方「模型下载」部分）

**Q: 显存不足（OOM）**
A: 换用更小的模型：`python sam_server.py --model vit_b`

**Q: 端口被占用**
A: 换一个端口：`python sam_server.py --port 8081`
