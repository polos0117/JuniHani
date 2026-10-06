const basePrompt = `Create a landscape 3:2 decorative background for a Korean family weekly planner poster.
Visual direction: irresistibly cute hand-drawn children's storybook illustration, soft watercolor and colored pencil texture, rounded friendly shapes, pastel sky blue and blush pink with warm ivory, smiling clouds, hanging gold stars, little teddy bears, tiny flowers, friendly child-safe doctor and kindergarten motifs near the edges.
Composition: keep the central 75% of the artwork extremely light, plain, and open so that a separate application can place large Korean text and schedule cards over it. Concentrate details in the top 18%, outer 8% border, and bottom corners. Avoid strong lines behind the central content. Balanced left and right decoration. Premium polished stationery illustration, warm and cheerful.`;

export class ImageGenerationError extends Error {
  /** @param {string} message @param {number} status */
  constructor(message, status = 502) {
    super(message);
    this.name = "ImageGenerationError";
    this.status = status;
  }
}

/** @param {string} style */
export function createIllustrationPrompt(style = "") {
  if (typeof style !== "string" || style.length > 160) {
    throw new ImageGenerationError("꾸밈 설명은 160자 이내로 입력해 주세요.", 400);
  }
  const motif = style.trim();
  return `${basePrompt}${motif ? `\nOptional decorative motif requested by the user: ${motif}` : ""}
Absolutely no text, letters, numbers, logos, watermarks, captions, signs, calendars, or written labels of any kind. No identifiable real people. Do not draw any schedule details.`;
}

/**
 * Generate a decorative PNG background. The API key stays on the server.
 * @param {{apiKey: string | undefined, style?: string, fetchImpl?: typeof fetch}} options
 * @returns {Promise<string>} PNG data URL
 */
export async function generateIllustration({ apiKey, style = "", fetchImpl = fetch }) {
  if (!apiKey?.trim()) {
    throw new ImageGenerationError("이미지 생성 기능의 연결 설정을 확인해 주세요.", 503);
  }
  const prompt = createIllustrationPrompt(style);
  let upstream;
  try {
    upstream = await fetchImpl("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-2.5-flare",
        prompt,
        n: 1,
        size: "1536x1024",
        quality: "medium",
        output_format: "png",
      }),
    });
  } catch {
    throw new ImageGenerationError("이미지 API에 연결하지 못했습니다. 다시 시도해 주세요.");
  }

  if (!upstream.ok) {
    const failure = await upstream.json().catch(() => null);
    const code = failure?.error?.code;
    const type = failure?.error?.type;
    if (code === "credit_balance_exhausted" || code === "insufficient_quota" || type === "insufficient_quota") {
      throw new ImageGenerationError("OpenAI API 크레딧이 소진되어 이미지를 만들 수 없습니다. 결제 잔액을 확인해 주세요.", 503);
    }
    if (upstream.status === 429 || code === "rate_limit_exceeded") {
      throw new ImageGenerationError("이미지 요청이 잠시 많습니다. 잠시 뒤 다시 시도해 주세요.", 429);
    }
    if (upstream.status === 401 || code === "invalid_api_key") {
      throw new ImageGenerationError("이미지 생성 연결 설정을 확인해 주세요.", 503);
    }
    if (upstream.status === 403 || code === "model_not_found") {
      throw new ImageGenerationError("현재 API 계정에서 이미지 모델을 사용할 수 없습니다. 모델 접근 권한을 확인해 주세요.", 503);
    }
    throw new ImageGenerationError("이미지 생성에 실패했습니다. 잠시 뒤 다시 시도해 주세요.");
  }

  const result = await upstream.json().catch(() => null);
  const encoded = result?.data?.[0]?.b64_json;
  if (typeof encoded !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded) || !encoded) {
    throw new ImageGenerationError("이미지 응답을 처리하지 못했습니다. 다시 시도해 주세요.");
  }
  return `data:image/png;base64,${encoded}`;
}
