const siteOrigin = "https://kids-week-planner.jjshsin.chatgpt.site";
const sessionKey = "junihani-family-code";

export function isGithubPages() {
  return typeof window !== "undefined" && window.location.hostname === "polos0117.github.io";
}

export function storedFamilyCode() {
  return isGithubPages() ? window.sessionStorage.getItem(sessionKey) || "" : "";
}

export function rememberFamilyCode(code: string) {
  if (isGithubPages()) window.sessionStorage.setItem(sessionKey, code);
}

export function forgetFamilyCode() {
  if (isGithubPages()) window.sessionStorage.removeItem(sessionKey);
}

export function familyFetch(path: string, init: RequestInit = {}, temporaryCode?: string) {
  if (!isGithubPages()) return fetch(path, init);
  const headers = new Headers(init.headers);
  const code = temporaryCode ?? storedFamilyCode();
  if (code) headers.set("Authorization", `Bearer ${code}`);
  return fetch(`${siteOrigin}${path}`, { ...init, headers, credentials: "omit", mode: "cors" });
}
