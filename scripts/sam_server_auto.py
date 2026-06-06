"""
SAM HTTP 服务 - 自动续传下载，支持国内镜像
用法: python sam_server_auto.py [--port 8080]
"""

import os
import sys
import argparse
import io
import base64
import json
from flask import Flask, request, jsonify, abort
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

predictor = None
device = None


def get_model_dir():
    base = os.path.expanduser("~/.cache/huggingface/hub")
    return base


def load_model():
    global predictor, device

    if predictor is not None:
        return

    import torch
    from transformers import SamProcessor, SamModel

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[SAM] 使用设备: {device.upper()}")

    hf_model_name = "facebook/sam-vit-huge"

    print(f"[SAM] 检查本地缓存: {hf_model_name}")
    try:
        print("[SAM] 尝试加载缓存模型...")
        processor = SamProcessor.from_pretrained(hf_model_name)
        model = SamModel.from_pretrained(hf_model_name)
        model.to(device)
        model.eval()
        predictor = (processor, model)
        print("[SAM] 模型加载完成")
        return
    except Exception as e:
        print(f"[SAM] 缓存未命中或加载失败: {e}")

    print("[SAM] 正在下载模型（可中断，再次运行会自动续传）...")
    print("[SAM] 模型约 2.56 GB，建议使用 idm/wget 等工具加速下载")
    print("[SAM] 备用下载方式（推荐）：")
    print("       1. 浏览器直接访问: https://hf-mirror.com/facebook/sam-vit-huge")
    print("       2. 使用 wget: wget -c https://hf-mirror.com/facebook/sam-vit-huge/resolve/main/model.safetensors -O ~/.cache/huggingface/hub/models--facebook--sam-vit-huge/snapshots/xxx/model.safetensors")
    print()

    # 设置镜像后重试
    os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
    try:
        print("[SAM] 使用镜像 https://hf-mirror.com 下载...")
        processor = SamProcessor.from_pretrained(hf_model_name)
        model = SamModel.from_pretrained(hf_model_name)
        model.to(device)
        model.eval()
        predictor = (processor, model)
        print("[SAM] 模型加载完成")
    except Exception as e2:
        print(f"[SAM] 镜像下载也失败: {e2}")
        print("[SAM] 请手动下载模型后放到缓存目录，或使用 wget 续传")
        raise


def numpy_to_base64(arr) -> str:
    import numpy as np
    from PIL import Image
    h, w = arr.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[arr] = [255, 255, 255, 200]
    pil_img = Image.fromarray(rgba, mode="RGBA")
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def mask_to_bbox(mask):
    import numpy as np
    rows = np.any(mask, axis=1)
    cols = np.any(mask, axis=0)
    if not np.any(rows) or not np.any(cols):
        return {"x": 0, "y": 0, "width": 0, "height": 0}
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    return {"x": int(cmin), "y": int(rmin), "width": int(cmax - cmin + 1), "height": int(rmax - rmin + 1)}


def decode_image(data: str):
    from PIL import Image
    import numpy as np
    if data.startswith("data:image"):
        data = data.split(",", 1)[1]
    raw = base64.b64decode(data)
    return np.array(Image.open(io.BytesIO(raw)).convert("RGB"))


def load_image_from_url(url: str):
    import urllib.request
    from PIL import Image
    import numpy as np
    with urllib.request.urlopen(url) as resp:
        raw = resp.read()
    return np.array(Image.open(io.BytesIO(raw)).convert("RGB"))


@app.route("/sam/predict", methods=["POST"])
def predict():
    global predictor
    if predictor is None:
        abort(503, description="SAM 模型未加载，请先运行 python sam_server_auto.py 等待模型下载完成")

    import torch
    import numpy as np

    data = request.get_json()
    if not data or "image" not in data:
        abort(400, description="缺少 'image' 字段")

    image_data = data["image"]

    try:
        if image_data.startswith("http"):
            image = load_image_from_url(image_data)
        elif image_data.startswith("data:image") or len(image_data) > 200:
            image = decode_image(image_data)
        else:
            from PIL import Image
            image = np.array(Image.open(image_data).convert("RGB"))
    except Exception as e:
        abort(400, description=f"图片加载失败: {e}")

    processor, model = predictor
    h, w = image.shape[:2]
    multimask_output = data.get("multimask_output", True)

    if "point_coords" in data:
        raw_points = np.array(data["point_coords"], dtype=np.float32)
        labels = np.array(data.get("point_labels", [1] * len(raw_points)), dtype=np.int32)
        point_coords = raw_points * np.array([[w, h]], dtype=np.float32)

        inputs = processor(
            image,
            input_points=[[point_coords.tolist()]],
            input_labels=[[labels.tolist()]],
            return_tensors="pt",
        )
        inputs = {k: v.to(model.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)

        masks_tensor = outputs.pred_masks.squeeze(1)  # [N, H, W]
        if masks_tensor.dim() == 2:
            masks_tensor = masks_tensor.unsqueeze(0)

        masks_np = (masks_tensor.cpu().numpy() > 0.0)
        scores = [1.0] * len(masks_np)
        best_idx = 0

        best_mask = masks_np[best_idx]
        mask_b64 = numpy_to_base64(best_mask)
        best_bbox = mask_to_bbox(best_mask)

        return jsonify({
            "masks": [mask_b64],
            "bbox": best_bbox,
            "scores": scores,
            "best_index": best_idx,
        })

    abort(400, description="请提供 point_coords")


@app.route("/sam/status", methods=["GET"])
def status():
    return jsonify({
        "status": "ok",
        "model_loaded": predictor is not None,
    })


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SAM HTTP Service (auto-download)")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()

    load_model()
    print(f"[SAM Server] 启动于 http://localhost:{args.port}")
    app.run(host="0.0.0.0", port=args.port, threaded=True, debug=False)
