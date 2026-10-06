import { allowedFamilyOrigin, familyPreflight, isFamilyAuthorized, unauthorized, withFamilyCors } from "@/lib/family-auth";
import { changeFamilyState, FamilyInputError, readFamilyState } from "@/lib/family-state";

export const runtime = "edge";
const noStore = { "Cache-Control": "no-store" };

export function OPTIONS(request: Request) { return familyPreflight(request); }

export async function GET(request: Request) {
  return withFamilyCors(request, await getFamily(request));
}

async function getFamily(request: Request) {
  try {
    if (!await isFamilyAuthorized(request)) return unauthorized();
    return Response.json(await readFamilyState(), { headers: noStore });
  } catch (error) {
    console.error("Could not load family schedule", error);
    return Response.json({ error: "공유 일정을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 503, headers: noStore });
  }
}

export async function POST(request: Request) {
  return withFamilyCors(request, await saveFamily(request));
}

async function saveFamily(request: Request) {
  if (!allowedFamilyOrigin(request)) return Response.json({ error: "요청을 확인해 주세요." }, { status: 403, headers: noStore });
  try {
    if (!await isFamilyAuthorized(request)) return unauthorized();
    const raw = await request.text();
    if (raw.length > 2048) return Response.json({ error: "저장할 내용이 너무 깁니다." }, { status: 413, headers: noStore });
    const operation = JSON.parse(raw) as unknown;
    return Response.json(await changeFamilyState(operation), { headers: noStore });
  } catch (error) {
    if (error instanceof FamilyInputError) return Response.json({ error: error.message }, { status: 400, headers: noStore });
    if (error instanceof SyntaxError) return Response.json({ error: "저장할 내용을 확인해 주세요." }, { status: 400, headers: noStore });
    console.error("Could not save family schedule", error);
    return Response.json({ error: "공유 일정을 저장하지 못했습니다. 다시 시도해 주세요." }, { status: 503, headers: noStore });
  }
}
