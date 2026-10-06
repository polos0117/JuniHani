import { env } from "cloudflare:workers";
import { isFamilyAuthorized, sameOrigin, unauthorized } from "@/lib/family-auth";

export const runtime = "edge";
type InputEvent = { id: string; date: string; time: string; title: string; categoryName: string; childName: string };
const schema = {
  type: "object",
  properties: { suggestions: { type: "array", items: {
    type: "object",
    properties: { eventId: { type: "string" }, text: { type: "string" } },
    required: ["eventId", "text"],
    additionalProperties: false,
  } } },
  required: ["suggestions"],
  additionalProperties: false,
};

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "요청을 확인해 주세요." }, { status: 403 });
  if (!await isFamilyAuthorized(request)) return unauthorized();
  const key = env.OPENAI_API_KEY;
  if (!key) return Response.json({ error: "AI 기능을 연결하는 중입니다. 일정 이미지 저장은 바로 사용할 수 있습니다." }, { status: 503 });
  let events: InputEvent[];
  try {
    const body = await request.json() as { events?: InputEvent[] };
    if (!Array.isArray(body.events) || body.events.length < 1 || body.events.length > 30) throw new Error();
    events = body.events;
    if (events.some(item =>
      typeof item.id !== "string" || item.id.length > 80 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
      typeof item.title !== "string" || item.title.length > 80 ||
      typeof item.childName !== "string" || !item.childName.trim() || item.childName.length > 16 ||
      typeof item.categoryName !== "string" || !item.categoryName.trim() || item.categoryName.length > 16 ||
      typeof item.time !== "string" || (item.time && !/^\d{2}:\d{2}$/.test(item.time))
    )) throw new Error();
  } catch { return Response.json({ error: "일정 형식을 확인해 주세요." }, { status: 400 }); }

  const instructions = "아이들의 확정된 주간 일정에 필요한 준비를 도와주세요. childName은 해당 일정의 아이 이름 또는 공통 일정 표시이고 categoryName은 사용자가 정한 일정 종류입니다. 아이와 종류를 혼동하지 말고 각 제안을 맞는 event id 하나에 연결하세요. 입력된 일정의 날짜, 시간, 장소, 이름을 바꾸거나 새로운 사실을 만들지 마세요. 한국어로 짧은 준비할 일만 최대 6개 제안하세요. 병원 관련 일정에는 의료 조언 대신 예약 확인이나 준비물 확인 같은 일반적인 준비만 제안하세요. 중복은 피하세요.";
  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-6-luna", reasoning: { effort: "low" }, store: false,
        instructions, input: JSON.stringify(events), max_output_tokens: 1000,
        text: { format: { type: "json_schema", name: "weekly_tasks", strict: true, schema } },
      }),
    });
    if (!upstream.ok) {
      const failure = await upstream.json().catch(() => null) as { error?: { code?: string; type?: string } } | null;
      const code = failure?.error?.code;
      const type = failure?.error?.type;
      if (code === "credit_balance_exhausted" || code === "insufficient_quota" || type === "insufficient_quota") {
        return Response.json({ error: "OpenAI API 크레딧이 소진되었습니다. 계정의 결제 잔액을 확인해 주세요." }, { status: 503 });
      }
      if (code === "rate_limit_exceeded") {
        return Response.json({ error: "AI 요청이 잠시 많습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 429 });
      }
      if (upstream.status === 401 || code === "invalid_api_key") {
        return Response.json({ error: "AI 연결 설정을 확인해야 합니다." }, { status: 503 });
      }
      return Response.json({ error: "AI 추천을 가져오지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
    }
    const response = await upstream.json() as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const text = response.output?.flatMap(item => item.content || []).find(item => item.type === "output_text")?.text;
    if (!text) throw new Error("empty");
    const parsed = JSON.parse(text) as { suggestions?: Array<{ eventId?: string; text?: string }> };
    const ids = new Set(events.map(item => item.id));
    const suggestions = (parsed.suggestions || [])
      .filter(item => item && typeof item.eventId === "string" && ids.has(item.eventId) && typeof item.text === "string" && item.text.trim().length > 0 && item.text.length <= 90)
      .slice(0, 6).map(item => ({ eventId: item.eventId, text: item.text!.trim() }));
    return Response.json({ suggestions });
  } catch { return Response.json({ error: "AI 응답을 읽지 못했습니다. 다시 시도해 주세요." }, { status: 502 }); }
}
