export const skins = [
  { id: "mint", name: "포근한 민트", color: "#286f73", light: "#dcefea" },
  { id: "pink", name: "연한 핑크", color: "#9b4b6a", light: "#f9e1eb" },
  { id: "sky", name: "맑은 하늘", color: "#32658d", light: "#e0eefb" },
] as const;

export type SkinId = (typeof skins)[number]["id"];

export function isSkinId(value: string | null): value is SkinId {
  return skins.some(skin => skin.id === value);
}

export const pngSkinColors: Record<SkinId, { background: string; card: string; day: string; ink: string; muted: string; empty: string }> = {
  mint: { background: "#f3f7f8", card: "#ffffff", day: "#eef4f5", ink: "#173b47", muted: "#5d7078", empty: "#789096" },
  pink: { background: "#fff1f6", card: "#ffffff", day: "#fff5f8", ink: "#533445", muted: "#806473", empty: "#987e8c" },
  sky: { background: "#eef6fc", card: "#ffffff", day: "#f3f9ff", ink: "#25445e", muted: "#617b91", empty: "#7e97aa" },
};
