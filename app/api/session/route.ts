import { familyCookie, isFamilyAuthorized, isValidFamilyCode, makeFamilySessionCookie, sameOrigin } from "@/lib/family-auth";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    return Response.json({ authorized: await isFamilyAuthorized(request) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "가족 공유 설정을 확인해 주세요." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "요청을 확인해 주세요." }, { status: 403 });
  let code: unknown;
  try { code = (await request.json() as { code?: unknown }).code; }
  catch { return Response.json({ error: "공유 코드를 입력해 주세요." }, { status: 400 }); }
  try {
    if (!await isValidFamilyCode(code)) return Response.json({ error: "공유 코드가 맞지 않습니다." }, { status: 401 });
    return Response.json({ authorized: true }, { headers: { "Set-Cookie": await makeFamilySessionCookie(request), "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "가족 공유 설정을 확인해 주세요." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "요청을 확인해 주세요." }, { status: 403 });
  return Response.json({ authorized: false }, { headers: { "Set-Cookie": familyCookie(request, "", 0), "Cache-Control": "no-store" } });
}
