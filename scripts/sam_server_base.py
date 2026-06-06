"""
SAM HTTP 服务 - sam-vit-base（最小模型，约 375MB）
适合网络不佳或只想快速体验的用户
"""

import os
import argparse
import io
import base64
import json
from flask import Flask, request, jsonify, abort
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

predictor = None


def load_model():
    global predictor
    if predictor is not None:
        return

    import torch
    from transformers import SamProcessor, SamModel

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[SAM] 使用设备: {device.upper()}")

    # 使用 vit_base（375MB，比 huge 的 2.56GB 小很多）
    hf_model_name = "facebook/sam-vit-base"

    print(f"[SAM] 正在下载模型 {hf_model_name}（约 375 MB）...")
    print("[SAM] 如需加速，可设置环境变量: $env:HF_ENDPOINT='https://hf-mirror.com'")

    processor = SamProcessor.from_pretrained(hf_model_name)
    model = SamModel.from_pretrained(hf_model_name)
    model.to(device)
    model.eval()
    predictor = (processor, model)
    print("[SAM] 模型加载完成")


def numpy_to_base64(arr) -> str:
    import numpy as np
    from PIL import Image
    h, w = arr.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[arr] = [255, 255, 255, 200]
    buf = io.BytesIO()
    Image.fromarray(rgba, mode="RGBA").save(buf, format="PNG")
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


@app.route("/sam/predict", methods=["POST"])
def predict():
    global predictor
    if predictor is None:
        abort(503, description="SAM 模型未加载，请先运行 python sam_server_base.py 等待下载完成")

    import torch
    import numpy as np
    from PIL import Image

    data = request.get_json()
    if not data or "image" not in data:
        abort(400, description="缺少 'image' 字段")

    image_data = data["image"]

    try:
        if image_data.startswith("http"):
            import urllib.request
            with urllib.request.urlopen(image_data) as resp:
                raw = resp.read()
            image = np.array(Image.open(io.BytesIO(raw)).convert("RGB"))
        elif image_data.startswith("data:image") or len(image_data) > 200:
            image = decode_image(image_data)
        else:
            image = np.array(Image.open(image_data).convert("RGB"))
    except Exception as e:
        abort(400, description=f"图片加载失败: {e}")

    processor, model = predictor
    h, w = image.shape[:2]

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

        masks_tensor = outputs.pred_masks.squeeze(1)
        if masks_tensor.dim() == 2:
            masks_tensor = masks_tensor.unsqueeze(0)

        masks_np = (masks_tensor.cpu().numpy() > 0.0)
        best_idx = 0
        best_mask = masks_np[best_idx]

        return jsonify({
            "masks": [numpy_to_base64(best_mask)],
            "bbox": mask_to_bbox(best_mask),
            "scores": [1.0],
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
    parser = argparse.ArgumentParser(description="SAM HTTP Service (vit_base)")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()

    load_model()
    print(f"[SAM Server] 启动于 http://localhost:{args.port}")
    app.run(host="0.0.0.0", port=args.port, threaded=True, debug=False)
