import { env } from "cloudflare:workers";

const cookieName = "junihani_family";
const githubPagesOrigin = "https://polos0117.github.io";
const encoder = new TextEncoder();

function accessCode() {
  const code = env.FAMILY_ACCESS_CODE;
  if (!code || code.length < 20) throw new Error("Family access code is not configured");
  return code;
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}

async function sessionToken() {
  const key = await crypto.subtle.importKey("raw", encoder.encode(accessCode()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode("JuniHani family session v1")));
  return Array.from(signature, byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function isValidFamilyCode(code: unknown) {
  if (typeof code !== "string" || code.length > 128) return false;
  return equalBytes(await digest(code.trim()), await digest(accessCode()));
}

export async function isFamilyAuthorized(request: Request) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9_-]{20,128})$/);
  if (bearer) return isValidFamilyCode(bearer[1]);
  const rawCookie = request.headers.get("cookie") || "";
  const token = rawCookie.split(";").map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  return equalBytes(await digest(token), await digest(await sessionToken()));
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export function allowedFamilyOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin || origin === githubPagesOrigin;
}

export function withFamilyCors(request: Request, response: Response) {
  response.headers.set("Cache-Control", "no-store");
  if (request.headers.get("origin") === githubPagesOrigin) {
    response.headers.set("Access-Control-Allow-Origin", githubPagesOrigin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.headers.set("Access-Control-Max-Age", "600");
    response.headers.append("Vary", "Origin");
  }
  return response;
}

export function familyPreflight(request: Request) {
  if (request.headers.get("origin") !== githubPagesOrigin) return Response.json({ error: "요청을 확인해 주세요." }, { status: 403 });
  return withFamilyCors(request, new Response(null, { status: 204 }));
}

export function familyCookie(request: Request, token: string, maxAge: number) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=${maxAge}`;
}

export async function makeFamilySessionCookie(request: Request) {
  return familyCookie(request, await sessionToken(), 60 * 60 * 24 * 30);
}

export function unauthorized() {
  return Response.json({ error: "가족 공유 코드를 입력해 주세요." }, { status: 401, headers: { "Cache-Control": "no-store" } });
}
