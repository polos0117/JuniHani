import { env } from "cloudflare:workers";

export type Child = { id: string; name: string; color: string };
export type Category = { id: string; name: string; color: string };
export type FamilyEvent = { id: string; date: string; time: string; title: string; categoryId: string; childId: string };
export type FamilyState = { children: Child[]; categories: Category[]; events: FamilyEvent[] };

const categoryColors = ["#ed856f", "#35969c", "#d9a14b", "#7a6ac5", "#477db8", "#c46b97", "#348b79", "#9b7955"];
const childColors = ["#7a6ac5", "#d77392", "#348b79", "#c27b37", "#477db8", "#ae6971"];
const initialState: FamilyState = {
  children: [], events: [], categories: [
    { id: "hospital", name: "병원", color: categoryColors[0] },
    { id: "daycare", name: "어린이집", color: categoryColors[1] },
    { id: "family", name: "가족", color: categoryColors[2] },
  ],
};

export class FamilyInputError extends Error {}

function db() {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

function fail(message: string): never { throw new FamilyInputError(message); }
function id(value: unknown) {
  if (typeof value !== "string" || !value || value.length > 80) fail("항목을 확인해 주세요.");
  return value;
}
function name(value: unknown, label: string) {
  if (typeof value !== "string") fail(`${label}을 입력해 주세요.`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 16) fail(`${label}은 1~16자로 입력해 주세요.`);
  return trimmed;
}
function unusedColor<T extends { color: string }>(items: T[], palette: string[]) {
  return palette.find(color => !items.some(item => item.color === color)) || palette[0];
}
function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function weekStart(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function applyOperation(state: FamilyState, raw: unknown): FamilyState {
  if (!raw || typeof raw !== "object") fail("저장할 내용을 확인해 주세요.");
  const op = raw as Record<string, unknown>;
  const next: FamilyState = {
    children: [...state.children], categories: [...state.categories], events: [...state.events],
  };
  switch (op.type) {
    case "child.add": {
      const value = name(op.name, "아이 이름");
      if (next.children.length >= 6) fail("아이는 6명까지 등록할 수 있습니다.");
      if (next.children.some(item => item.name === value)) fail("이미 등록된 아이 이름입니다.");
      next.children.push({ id: crypto.randomUUID(), name: value, color: unusedColor(next.children, childColors) });
      break;
    }
    case "child.rename": {
      const key = id(op.id), value = name(op.name, "아이 이름");
      if (next.children.some(item => item.id !== key && item.name === value)) fail("이미 등록된 아이 이름입니다.");
      const item = next.children.find(item => item.id === key);
      if (!item) fail("아이를 찾지 못했습니다. 새로고침해 주세요.");
      next.children = next.children.map(item => item.id === key ? { ...item, name: value } : item);
      break;
    }
    case "child.remove": {
      const key = id(op.id);
      if (next.events.some(item => item.childId === key)) fail("이 아이의 일정이 남아 있어 삭제할 수 없습니다.");
      next.children = next.children.filter(item => item.id !== key);
      break;
    }
    case "category.add": {
      const value = name(op.name, "일정 종류 이름");
      if (next.categories.length >= 8) fail("일정 종류는 8개까지 만들 수 있습니다.");
      if (next.categories.some(item => item.name === value)) fail("이미 있는 일정 종류입니다.");
      next.categories.push({ id: crypto.randomUUID(), name: value, color: unusedColor(next.categories, categoryColors) });
      break;
    }
    case "category.rename": {
      const key = id(op.id), value = name(op.name, "일정 종류 이름");
      if (next.categories.some(item => item.id !== key && item.name === value)) fail("이미 있는 일정 종류입니다.");
      if (!next.categories.some(item => item.id === key)) fail("일정 종류를 찾지 못했습니다. 새로고침해 주세요.");
      next.categories = next.categories.map(item => item.id === key ? { ...item, name: value } : item);
      break;
    }
    case "category.remove": {
      const key = id(op.id);
      if (next.categories.length <= 1) fail("일정 종류는 하나 이상 필요합니다.");
      if (next.events.some(item => item.categoryId === key)) fail("이 종류에 속한 일정이 남아 있어 삭제할 수 없습니다.");
      next.categories = next.categories.filter(item => item.id !== key);
      break;
    }
    case "event.add": {
      if (!validDate(op.date)) fail("날짜를 확인해 주세요.");
      if (typeof op.time !== "string" || (op.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(op.time))) fail("시간을 확인해 주세요.");
      if (typeof op.title !== "string" || !op.title.trim() || op.title.trim().length > 80) fail("일정 이름은 1~80자로 입력해 주세요.");
      const categoryId = id(op.categoryId);
      if (!next.categories.some(item => item.id === categoryId)) fail("일정 종류를 확인해 주세요.");
      const childId = op.childId === "" ? "" : id(op.childId);
      if (childId && !next.children.some(item => item.id === childId)) fail("아이를 확인해 주세요.");
      const start = weekStart(op.date);
      if (next.events.filter(item => weekStart(item.date) === start).length >= 30) fail("한 주에는 일정을 30개까지 입력할 수 있습니다.");
      next.events.push({ id: crypto.randomUUID(), date: op.date, time: op.time, title: op.title.trim(), categoryId, childId });
      break;
    }
    case "event.remove": {
      const key = id(op.id);
      next.events = next.events.filter(item => item.id !== key);
      break;
    }
    default: fail("지원하지 않는 저장 요청입니다.");
  }
  return next;
}

type StateRow = { payload: string; revision: number };

async function readRow() {
  const binding = db();
  await binding.prepare("INSERT OR IGNORE INTO family_state (id, payload, revision) VALUES (1, ?, 0)")
    .bind(JSON.stringify(initialState)).run();
  const row = await binding.prepare("SELECT payload, revision FROM family_state WHERE id = 1").first<StateRow>();
  if (!row) throw new Error("Family state is unavailable");
  return row;
}

export async function readFamilyState(): Promise<FamilyState> {
  const row = await readRow();
  return JSON.parse(row.payload) as FamilyState;
}

export async function changeFamilyState(operation: unknown): Promise<FamilyState> {
  const binding = db();
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await readRow();
    const updated = applyOperation(JSON.parse(row.payload) as FamilyState, operation);
    const result = await binding.prepare("UPDATE family_state SET payload = ?, revision = revision + 1 WHERE id = 1 AND revision = ?")
      .bind(JSON.stringify(updated), row.revision).run();
    if (result.meta.changes === 1) return updated;
  }
  throw new Error("Concurrent family update could not be saved");
}
