"""
SAM (Segment Anything Model) 本地 HTTP 服务 - HuggingFace 版本
使用 transformers 库，pip 安装更简单

用法: python sam_server_hf.py [--port 8080]
会自动从 HuggingFace 下载模型（约 2.4GB）
"""

import argparse
import io
import base64
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify, abort
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

predictor = None
device = "cuda"  # will auto-set


def load_model():
    """加载 SAM 模型"""
    global predictor, device

    if predictor is not None:
        return

    import torch
    from transformers import SamProcessor, SamModel

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[SAM] 使用设备: {device.upper()}")

    print("[SAM] 正在下载/加载模型...")
    processor = SamProcessor.from_pretrained("facebook/sam-vit-huge")
    model = SamModel.from_pretrained("facebook/sam-vit-huge")
    model.to(device)
    model.eval()

    predictor = (processor, model)
    print("[SAM] 模型加载完成")


def numpy_to_base64(arr: np.ndarray) -> str:
    """bool mask → RGBA base64 PNG"""
    h, w = arr.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[arr] = [255, 255, 255, 200]
    pil_img = Image.fromarray(rgba, mode="RGBA")
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def mask_to_bbox(mask: np.ndarray) -> dict:
    rows = np.any(mask, axis=1)
    cols = np.any(mask, axis=0)
    if not np.any(rows) or not np.any(cols):
        return {"x": 0, "y": 0, "width": 0, "height": 0}
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    return {
        "x": int(cmin),
        "y": int(rmin),
        "width": int(cmax - cmin + 1),
        "height": int(rmax - rmin + 1),
    }


def decode_image(data: str) -> np.ndarray:
    if data.startswith("data:image"):
        data = data.split(",", 1)[1]
    raw = base64.b64decode(data)
    return np.array(Image.open(io.BytesIO(raw)).convert("RGB"))


def load_image_from_url(url: str) -> np.ndarray:
    import urllib.request
    with urllib.request.urlopen(url) as resp:
        raw = resp.read()
    return np.array(Image.open(io.BytesIO(raw)).convert("RGB"))


@app.route("/sam/predict", methods=["POST"])
def predict():
    global predictor
    if predictor is None:
        abort(503, description="SAM 模型未加载，请等待启动完成")

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
            image = np.array(Image.open(image_data).convert("RGB"))
    except Exception as e:
        abort(400, description=f"图片加载失败: {e}")

    processor, model = predictor
    import torch

    h, w = image.shape[:2]
    multimask_output = data.get("multimask_output", True)

    if "point_coords" in data:
        raw_points = np.array(data["point_coords"], dtype=np.float32)
        labels = np.array(data.get("point_labels", [1] * len(raw_points)), dtype=np.int32)

        # 归一化 → 像素坐标
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

        # 解析多张 mask
        masks = outputs.pred_masks.squeeze(1)  # [N, H, W]
        scores = [1.0] * len(masks)
        best_idx = 0

        masks_np = masks.cpu().numpy()
        best_mask = masks_np[best_idx] > 0.0

    elif "box" in data:
        abort(400, description="HuggingFace transformers 版本暂不支持 box，请使用点选")
    else:
        abort(400, description="请提供 point_coords")

    mask_b64 = numpy_to_base64(best_mask)
    best_bbox = mask_to_bbox(best_mask)

    return jsonify({
        "masks": [mask_b64],
        "bbox": best_bbox,
        "scores": scores,
        "best_index": best_idx,
    })


@app.route("/sam/status", methods=["GET"])
def status():
    return jsonify({
        "status": "ok",
        "model_loaded": predictor is not None,
    })


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SAM HTTP Service (HuggingFace)")
    parser.add_argument("--port", type=int, default=8080, help="服务端口 (默认 8080)")
    args = parser.parse_args()

    load_model()

    print(f"[SAM Server] 启动于 http://localhost:{args.port}")
    print(f"[SAM Server] POST /sam/predict — 分割接口")
    print(f"[SAM Server] GET  /sam/status   — 状态检查")

    app.run(host="0.0.0.0", port=args.port, threaded=True, debug=False)
