"""
SAM 交互分割后端服务
启动方式: python service/sam_service.py

依赖安装:
  pip install fastapi uvicorn pillow numpy torch torchvision ultralytics

模型权重由 ultralytics 自动下载（约 40MB）。
"""

import io
import sys
import base64
import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="SAM Segmentation Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Model loading ───────────────────────────────────────────────
SAM_MODEL = None


def load_sam_model():
    global SAM_MODEL
    if SAM_MODEL is not None:
        return

    print("正在加载 SAM 模型，请稍候（首次运行会自动下载模型，约 40MB）...")

    try:
        from ultralytics import SAM

        # 走 ultralytics HUB 自动下载，不会访问 GitHub
        SAM_MODEL = SAM("mobile_sam.pt")
        print("SAM 模型加载成功!")

    except FileNotFoundError as e:
        print(f"模型文件未找到，自动下载失败: {e}")
        print("请手动下载模型权重:")
        print("  方式1 (HuggingFace):")
        print("    https://huggingface.co/dh2812-group/MobileSAM/resolve/main/mobile_sam.pt")
        print("  方式2 (百度网盘/微信群等): 搜索 'mobile_sam.pt' 手动下载")
        print("  下载后将文件放在项目根目录，再重启服务")
        SAM_MODEL = None  # 不再崩溃，服务仍可响应，但预测会失败

    except Exception as e:
        print(f"模型加载失败: {e}")
        SAM_MODEL = None


class PredictRequest(BaseModel):
    image: str  # base64 data URL 或纯 base64 字符串
    point_coords: list[list[float]]  # [[x, y], ...] 归一化 0-1 坐标
    point_labels: list[int]  # [1, 0, ...] 1=正样本, 0=负样本


@app.post("/sam/predict")
def predict(req: PredictRequest):
    if SAM_MODEL is None:
        try:
            load_sam_model()
        except Exception:
            pass
        if SAM_MODEL is None:
            raise HTTPException(
                status_code=503,
                detail="SAM 模型未就绪，请确保 mobile_sam.pt 已下载并放在项目根目录",
            )

    try:
        # ── 解析图片 ──────────────────────────────────────────────
        raw = req.image
        if raw.startswith("data:"):
            _, data = raw.split(",", 1)
            img_bytes = base64.b64decode(data)
        else:
            img_bytes = base64.b64decode(raw)

        image_pil = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        image_np = np.array(image_pil)
        orig_h, orig_w = image_np.shape[:2]

        # 前端传归一化 0-1 坐标 → 转像素坐标
        pixel_points = [[p[0] * orig_w, p[1] * orig_h] for p in req.point_coords]

        # ── 预测 ─────────────────────────────────────────────────
        results = SAM_MODEL.predict(
            source=image_np,
            points=pixel_points,
            labels=req.point_labels,
            device="cpu",
            verbose=False,
        )

        result = results[0]
        masks_data = result.masks

        if masks_data is None or len(masks_data) == 0:
            return {"masks": [], "bbox": {"x": 0, "y": 0, "width": 0, "height": 0}, "scores": []}

        masks_np = masks_data.data.cpu().numpy()  # (N, H, W)
        boxes = result.boxes
        n = masks_np.shape[0]
        confs = boxes.conf.cpu().numpy().tolist() if boxes is not None else [1.0] * n
        box_xyxy = boxes.xyxy.cpu().numpy().tolist() if boxes is not None else [[0, 0, 0, 0]] * n

        mask_list = []
        bbox_list = []

        for i in range(n):
            mask = masks_np[i].astype(bool)
            mask_uint8 = (mask.astype(np.uint8) * 255)
            pil_mask = Image.fromarray(mask_uint8, mode="L")
            buf = io.BytesIO()
            pil_mask.save(buf, format="PNG")
            mask_list.append(base64.b64encode(buf.getvalue()).decode("utf-8"))

            x1, y1, x2, y2 = box_xyxy[i]
            bbox_list.append({
                "x": int(x1),
                "y": int(y1),
                "width": int(x2 - x1),
                "height": int(y2 - y1),
            })

        return {
            "masks": mask_list,
            "bbox": bbox_list[0] if bbox_list else {"x": 0, "y": 0, "width": 0, "height": 0},
            "scores": confs,
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": SAM_MODEL is not None}


if __name__ == "__main__":
    print("=" * 50)
    print("  SAM Segmentation Service")
    print("  http://localhost:8080")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8080)
