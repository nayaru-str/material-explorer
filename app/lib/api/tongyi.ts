/**
 * 通义万相 Qwen-Image-2.0 API 封装
 * Docs: https://help.aliyun.com/zh/model-studio/qwen-image-edit-api
 *
 * 正确 endpoint: POST /api/v1/services/aigc/multimodal-generation/generation
 * 模型: qwen-image-2.0-pro
 */

export interface GenerateImageOptions {
  /** 产品原图（URL 或 Base64，data:image/...;base64,...） */
  productImage: string;
  /** 材质参考图（可选） */
  materialImage?: string;
  /** 目标颜色（HEX，可选） */
  targetColor?: string;
  /** 编辑指令 / 提示词 */
  prompt: string;
  /** 局部替换掩码（Base64 PNG，可选） */
  maskBase64?: string;
  /** 生成数量（默认 1，最大 6） */
  n?: number;
  /** 输出尺寸 */
  size?: string;
  /** API Key（优先；不传则从 localStorage 读取） */
  apiKey?: string;
}

// ─── API Key 管理 ────────────────────────────────────────────────────────────

export function hasApiKey(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("qwen-api-key");
}

export function saveApiKey(key: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("qwen-api-key", key.trim());
  }
}

export function clearApiKey(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("qwen-api-key");
  }
}

function getApiKey(apiKey?: string): string {
  return apiKey || (typeof window !== "undefined" ? localStorage.getItem("qwen-api-key") || "" : "");
}

// ─── 响应类型 ────────────────────────────────────────────────────────────────

interface ApiContentItem {
  image?: string;
  text?: string;
  revised_prompt?: string;
}

interface ApiMessage {
  role: string;
  content: ApiContentItem[];
}

interface ApiChoice {
  message: ApiMessage;
}

interface ApiOutput {
  choices: ApiChoice[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    images?: number;
  };
}

interface ApiResponse {
  output?: ApiOutput;
  request_id?: string;
  code?: string;
  message?: string;
}

interface ApiError {
  code?: string;
  message?: string;
  request_id?: string;
}

// ─── 请求核心 ────────────────────────────────────────────────────────────────

const BASE_URL = "https://dashscope.aliyuncs.com/api/v1";

async function requestQwen<T>(
  endpoint: string,
  body: unknown,
  apiKey?: string
): Promise<T> {
  const key = getApiKey(apiKey);
  if (!key) {
    throw new Error("请先在设置中配置通义万相 API Key");
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok || data.code) {
    const err = data as ApiError;
    throw new Error(
      err.message || err.code || `API 请求失败 (${response.status})`
    );
  }

  return data as T;
}

// ─── 核心生成函数 ────────────────────────────────────────────────────────────

export interface GeneratedImage {
  url: string;
  revisedPrompt?: string;
}

export interface GenerateResult {
  images: GeneratedImage[];
  requestId: string;
}

export async function generateWithQwen(
  options: GenerateImageOptions
): Promise<GenerateResult> {
  const {
    productImage,
    materialImage,
    targetColor,
    prompt,
    maskBase64,
    n = 1,
    size = "1024*1024",
  } = options;

  // 构建文本指令
  let text = prompt.trim();
  if (targetColor) {
    text = `目标颜色为 ${targetColor}，${text}`;
  }
  if (maskBase64) {
    text += "（请仅替换涂抹区域，保留其他部分）";
  }

  // 构建 messages content
  const content: ApiContentItem[] = [];

  // 产品原图（必须）
  content.push({ image: productImage });

  // 材质参考图（可选）
  if (materialImage) {
    content.push({ image: materialImage });
  }

  // 编辑指令（必须，最后一项）
  content.push({ text });

  const requestBody = {
    model: "qwen-image-2.0-pro",
    input: {
      messages: [
        {
          role: "user",
          content,
        },
      ],
    },
    parameters: {
      n: Math.min(Math.max(n, 1), 6),
      size,
      watermark: false,
      prompt_extend: true,
    },
  };

  const data = await requestQwen<ApiResponse>(
    "/services/aigc/multimodal-generation/generation",
    requestBody,
    options.apiKey
  );

  const choices = data.output?.choices ?? [];
  const images: GeneratedImage[] = [];

  for (const choice of choices) {
    const imgItems = choice.message?.content ?? [];
    for (const item of imgItems) {
      if (item.image) {
        images.push({
          url: item.image,
          revisedPrompt: item.revised_prompt,
        });
      }
    }
  }

  return {
    images,
    requestId: data.request_id ?? "",
  };
}

// ─── 工具函数 ────────────────────────────────────────────────────────────────

/**
 * 将 File/Blob 转成 data URL（包含 MIME 前缀）
 * 用于直接传给 API
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 将 File/Blob 转成纯 Base64（不含前缀）
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return fileToDataUrl(file).then((dataUrl) => dataUrl.split(",")[1]);
}

/**
 * 将 URL 转成 data URL（用于跨域图片）
 */
export async function urlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`图片加载失败: ${response.status}`);
  const blob = await response.blob();
  return fileToDataUrl(blob);
}

/**
 * 判断字符串是否为 data URL
 */
export function isDataUrl(str: string): boolean {
  return str.startsWith("data:");
}
