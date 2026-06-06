"""
SAM (Segment Anything Model) 本地 HTTP 服务
用法: python sam_server.py [--port 8080] [--model vit_h|vit_b|vit_l]
默认使用 vit_h (最大最准，约 2.4GB)，首次运行会自动下载
"""

import argparse
import io
import base64
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify, abort
from flask_cors import CORS

from segment_anything import sam_model_registry, SamPredictor
import torch

app = Flask(__name__)
CORS(app)

predictor: SamPredictor | None = None


def load_model(model_type: str = "vit_h", checkpoint_path: str | None = None):
    """加载 SAM 模型"""
    global predictor
    if predictor is not None:
        return

    print(f"[SAM] 正在加载模型: {model_type}")
    sam = sam_model_registry[model_type](checkpoint=checkpoint_path)

    if torch.cuda.is_available():
        sam.to(device="cuda")
        print("[SAM] 使用 GPU (CUDA)")
    else:
        sam.to(device="cpu")
        print("[SAM] 使用 CPU")

    predictor = SamPredictor(sam)
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

    predictor.set_image(image)
    h, w = image.shape[:2]
    multimask_output = data.get("multimask_output", True)

    if "box" in data:
        x1, y1, x2, y2 = data["box"]
        box = np.array([
            [x1 * w, y1 * h],
            [x2 * w, y2 * h],
        ], dtype=np.float32)
        masks, scores, _ = predictor.predict(
            point_coords=None,
            point_labels=None,
            box=box,
            multimask_output=multimask_output,
        )
    elif "point_coords" in data:
        raw_points = np.array(data["point_coords"], dtype=np.float32)
        labels = np.array(data.get("point_labels", [1] * len(raw_points)), dtype=np.int32)
        point_coords = raw_points * np.array([[w, h]], dtype=np.float32)
        masks, scores, _ = predictor.predict(
            point_coords=point_coords,
            point_labels=labels,
            multimask_output=multimask_output,
        )
    else:
        abort(400, description="请提供 point_coords 或 box")

    masks_b64 = [numpy_to_base64(m.astype(bool)) for m in masks]
    best_idx = int(np.argmax(scores))
    best_bbox = mask_to_bbox(masks[best_idx].astype(bool))

    return jsonify({
        "masks": masks_b64,
        "bbox": best_bbox,
        "scores": scores.tolist(),
        "best_index": best_idx,
    })


@app.route("/sam/status", methods=["GET"])
def status():
    return jsonify({
        "status": "ok",
        "model_loaded": predictor is not None,
    })


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SAM HTTP Service")
    parser.add_argument("--port", type=int, default=8080, help="服务端口 (默认 8080)")
    parser.add_argument(
        "--model",
        choices=["vit_h", "vit_b", "vit_l"],
        default="vit_h",
        help="SAM 模型大小 (默认 vit_h)",
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        default=None,
        help="本地模型权重路径 (默认自动下载)",
    )
    args = parser.parse_args()

    load_model(model_type=args.model, checkpoint_path=args.checkpoint)

    print(f"[SAM Server] 启动于 http://localhost:{args.port}")
    print(f"[SAM Server] POST /sam/predict — 分割接口")
    print(f"[SAM Server] GET  /sam/status   — 状态检查")

    app.run(host="0.0.0.0", port=args.port, threaded=True, debug=False)
