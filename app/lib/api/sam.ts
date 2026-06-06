export interface SegmentResult {
  maskBase64: string; // Base64 PNG
  bbox: { x: number; y: number; width: number; height: number };
  score: number;
}

/**
 * 调用本地 SAM 分割服务，将点提示转换为 mask
 */
export async function segmentWithPoints({
  image,
  points,
}: {
  image: string;
  points: Array<{ x: number; y: number; label: 1 | 0 }>;
}): Promise<SegmentResult[]> {
  // 将 blob/data URL 转为 base64（Python SAM 服务无法访问浏览器 blob URL）
  const imageBase64 = await imageUrlToBase64(image);

  const res = await fetch("http://localhost:8080/sam/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: imageBase64,
      point_coords: points.map((p) => [p.x, p.y]),
      point_labels: points.map((p) => p.label),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { description?: string }).description ?? `SAM 分割失败: ${res.status}`);
  }

  const data = await res.json();
  return (data.masks as string[]).map((mask: string, i: number) => ({
    maskBase64: mask,
    bbox: data.bbox as { x: number; y: number; width: number; height: number },
    score: (data.scores as number[])[i] ?? 1,
  }));
}

/**
 * 将图片 URL/blob 转换为 Base64 data URL
 * 用于发送给无法访问 blob URL 的外部服务（如本地 Python SAM 服务）
 */
export async function imageUrlToBase64(imageUrl: string): Promise<string> {
  if (!imageUrl) return "";

  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return imageUrl; // fallback: 尝试直接用原 URL
  }
}
