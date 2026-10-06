import { env } from "cloudflare:workers";
import { generateIllustration, ImageGenerationError } from "@/lib/image-generation";

export const runtime = "edge";

export async function POST(request: Request) {
  let style = "";
  try {
    const raw = await request.text();
    if (raw) {
      const body = JSON.parse(raw) as { style?: unknown };
      if (!body || typeof body !== "object" || (body.style !== undefined && typeof body.style !== "string")) {
        return Response.json({ error: "꾸밈 설명의 형식을 확인해 주세요." }, { status: 400 });
      }
      style = body.style || "";
    }
  } catch {
    return Response.json({ error: "꾸밈 설명의 형식을 확인해 주세요." }, { status: 400 });
  }

  try {
    const image = await generateIllustration({ apiKey: env.OPENAI_API_KEY, style });
    return Response.json({ image }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ImageGenerationError) {
      console.error("Image generation failed", { status: error.status, reason: error.message });
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected image generation failure");
    return Response.json({ error: "이미지 생성에 실패했습니다. 다시 시도해 주세요." }, { status: 502 });
  }
}
