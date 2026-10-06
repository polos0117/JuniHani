"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Download, ImagePlus, Plus, Sparkles, Trash2 } from "lucide-react";
import { drawIllustratedPoster } from "@/lib/illustrated-poster";
import { familyFetch, forgetFamilyCode, isGithubPages, rememberFamilyCode, storedFamilyCode } from "@/lib/family-client";
import { isSkinId, pngSkinColors, skins, type SkinId } from "@/lib/skins";

type CategoryItem = { id: string; name: string; color: string };
type Child = { id: string; name: string; color: string };
type EventItem = { id: string; date: string; time: string; title: string; categoryId: string; childId: string };
type Suggestion = { eventId: string; text: string };
const weekNames = ["일", "월", "화", "수", "목", "금", "토"];
const initialCategories: CategoryItem[] = [{ id: "hospital", name: "병원", color: "#ed856f" }, { id: "daycare", name: "어린이집", color: "#35969c" }, { id: "family", name: "가족", color: "#d9a14b" }];
type SharedData = { children: Child[]; categories: CategoryItem[]; events: EventItem[]; error?: string };
const iso = (d: Date) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
const dateOf = (v: string) => new Date(v + "T12:00:00");
const label = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
function datesInWeek(value: string) {
  const start = dateOf(value);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
}
function drawPng(dates: Date[], events: EventItem[], children: Child[], categories: CategoryItem[], skin: SkinId) {
  const colors = pngSkinColors[skin];
  const canvas = document.createElement("canvas");
  const groups = dates.map(date => events.filter(item => item.date === iso(date)).sort((a, b) => a.time.localeCompare(b.time)));
  const heights = groups.map(items => Math.max(105, 62 + items.length * 43));
  canvas.width = 1200;
  canvas.height = 255 + heights.reduce((sum, height) => sum + height + 13, 0) + 80;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지를 만들 수 없습니다.");
  const ctx = context;
  function box(x: number, y: number, w: number, h: number, color: string) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, 24); ctx.fill();
  }
  ctx.fillStyle = colors.background; ctx.fillRect(0, 0, canvas.width, canvas.height);
  box(42, 42, 1116, canvas.height - 84, colors.card);
  ctx.fillStyle = colors.ink; ctx.font = "700 58px sans-serif"; ctx.fillText("아이들 주간 계획", 82, 137);
  ctx.fillStyle = colors.muted; ctx.font = "500 28px sans-serif";
  ctx.fillText(`${dates[0].getFullYear()}. ${label(dates[0])} – ${label(dates[6])}`, 82, 188);
  let y = 242;
  dates.forEach((date, i) => {
    const items = groups[i], height = heights[i];
    box(82, y, 1026, height, colors.day);
    ctx.fillStyle = colors.ink; ctx.font = "700 28px sans-serif"; ctx.fillText(weekNames[date.getDay()] + "요일", 106, y + 43);
    ctx.fillStyle = colors.muted; ctx.font = "500 20px sans-serif"; ctx.fillText(label(date), 244, y + 42);
    if (!items.length) { ctx.fillStyle = colors.empty; ctx.font = "400 22px sans-serif"; ctx.fillText("일정 없음", 106, y + 79); }
    items.forEach((item, n) => {
      const child = children.find(child => child.id === item.childId);
      const category = categories.find(category => category.id === item.categoryId);
      box(106, y + 55 + n * 43, 9, 27, child?.color || category?.color || "#9baeb2");
      ctx.fillStyle = colors.ink; ctx.font = "600 23px sans-serif";
      const text = `[${child?.name || "공통"} · ${category?.name || "기타"}] ` + (item.time ? item.time + "  " : "") + item.title;
      ctx.fillText(text, 131, y + 77 + n * 43, 944);
    });
    y += height + 13;
  });
  return canvas.toDataURL("image/png");
}

function SkinPicker({ selected, onSelect }: { selected: SkinId; onSelect: (skin: SkinId) => void }) {
  return <div className="skin-picker" aria-label="화면 색상">
    <p className="skin-picker-title">화면 색상</p>
    <div className="skin-options">{skins.map(skin => <button className={`skin-option skin-option-${skin.id}`} type="button" key={skin.id} aria-pressed={selected === skin.id} onClick={() => onSelect(skin.id)}>
      <span className="skin-swatch" aria-hidden="true" style={{ background: skin.light, borderColor: skin.color }}><span style={{ background: skin.color }} /></span>
      <span>{skin.name}</span>
    </button>)}</div>
  </div>;
}

export default function Home() {
  const [skin, setSkin] = useState<SkinId>("mint");
  const [access, setAccess] = useState<"loading" | "locked" | "ready" | "error">("loading");
  const [shareCode, setShareCode] = useState("");
  const [accessBusy, setAccessBusy] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saving = useRef(false);
  const [week, setWeek] = useState(() => iso(new Date()));
  const dates = useMemo(() => datesInWeek(week), [week]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [childName, setChildName] = useState("");
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [categoryName, setCategoryName] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [form, setForm] = useState({ date: "", time: "", title: "", categoryId: initialCategories[0].id, childId: "" });
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageStyle, setImageStyle] = useState("");
  const [illustration, setIllustration] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [notice, setNotice] = useState("");
  const start = iso(dates[0]), end = iso(dates[6]);
  const currentEvents = events.filter(item => item.date >= start && item.date <= end);
  const childFor = (id: string) => children.find(child => child.id === id);
  const categoryFor = (id: string) => categories.find(category => category.id === id);
  useEffect(() => {
    const saved = window.localStorage.getItem("junihani-skin");
    if (isSkinId(saved)) {
      setSkin(saved);
      document.documentElement.dataset.skin = saved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", skins.find(item => item.id === saved)?.color || "#286f73");
    }
  }, []);
  function selectSkin(next: SkinId) {
    setSkin(next);
    document.documentElement.dataset.skin = next;
    window.localStorage.setItem("junihani-skin", next);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", skins.find(item => item.id === next)?.color || "#286f73");
  }
  const applyShared = useCallback((data: SharedData) => {
    setChildren(data.children); setCategories(data.categories); setEvents(data.events);
    setForm(previous => ({ ...previous,
      categoryId: data.categories.some(item => item.id === previous.categoryId) ? previous.categoryId : data.categories[0]?.id || "",
      childId: data.children.some(item => item.id === previous.childId) ? previous.childId : "",
    }));
  }, []);
  const loadShared = useCallback(async () => {
    const response = await familyFetch("/api/family", { cache: "no-store" });
    const data = await response.json() as SharedData;
    if (response.status === 401) { forgetFamilyCode(); setAccess("locked"); throw new Error("가족 공유 코드를 다시 입력해 주세요."); }
    if (!response.ok) throw new Error(data.error || "공유 일정을 불러오지 못했습니다.");
    applyShared(data);
  }, [applyShared]);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (isGithubPages()) {
          if (!storedFamilyCode()) { setAccess("locked"); return; }
          await loadShared();
          if (active) setAccess("ready");
          return;
        }
        const response = await fetch("/api/session", { cache: "no-store" });
        const result = await response.json() as { authorized?: boolean; error?: string };
        if (!active) return;
        if (!response.ok) throw new Error(result.error || "접속 상태를 확인하지 못했습니다.");
        if (!result.authorized) { setAccess("locked"); return; }
        await loadShared();
        if (active) setAccess("ready");
      } catch (error) { if (active) { setAccess("error"); setAccessMessage(error instanceof Error ? error.message : "다시 시도해 주세요."); } }
    })();
    return () => { active = false; };
  }, [loadShared]);
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(new URL("sw.js", document.baseURI).href).catch(() => {});
    }
  }, []);
  useEffect(() => {
    if (access !== "ready") return;
    const refresh = () => {
      if (document.visibilityState !== "visible" || saving.current || document.activeElement?.matches("input, select, textarea")) return;
      loadShared().catch(error => setNotice(error instanceof Error ? error.message : "일정을 새로 고치지 못했습니다."));
    };
    const timer = window.setInterval(refresh, 20000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [access, loadShared]);
  async function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAccessBusy(true); setAccessMessage("");
    try {
      if (isGithubPages()) {
        const code = shareCode.trim();
        const response = await familyFetch("/api/family", { cache: "no-store" }, code);
        const result = await response.json() as SharedData;
        if (!response.ok) throw new Error(response.status === 401 ? "공유 코드가 맞지 않습니다." : result.error || "공유 일정을 열지 못했습니다.");
        rememberFamilyCode(code); applyShared(result); setShareCode(""); setAccess("ready");
        return;
      }
      const response = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: shareCode.trim() }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "공유 코드를 확인하지 못했습니다.");
      await loadShared(); setShareCode(""); setAccess("ready");
    } catch (error) { setAccessMessage(error instanceof Error ? error.message : "다시 시도해 주세요."); }
    finally { setAccessBusy(false); }
  }
  async function signOut() {
    if (isGithubPages()) forgetFamilyCode();
    else await fetch("/api/session", { method: "DELETE" });
    setAccess("locked"); setChildren([]); setEvents([]); setCategories(initialCategories); setSuggestions([]); setPosterUrl(""); setIllustration("");
  }
  async function persist(operation: Record<string, unknown>) {
    const next = saveQueue.current.then(async () => {
      saving.current = true;
      try {
        const response = await familyFetch("/api/family", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(operation) });
        const data = await response.json() as SharedData;
        if (response.status === 401) { setAccess("locked"); throw new Error("가족 공유 코드를 다시 입력해 주세요."); }
        if (!response.ok) throw new Error(data.error || "저장하지 못했습니다.");
        applyShared(data); setSuggestions([]); setNotice("가족 일정에 저장되었습니다.");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "일정을 저장하지 못했습니다.");
        await loadShared().catch(() => {});
        throw error;
      } finally { saving.current = false; }
    });
    saveQueue.current = next.catch(() => {});
    return next;
  }
  useEffect(() => {
    if (!illustration || !events.some(item => item.date >= start && item.date <= end)) {
      let active = true;
      queueMicrotask(() => { if (active) setPosterUrl(""); });
      return () => { active = false; };
    }
    let active = true;
    drawIllustratedPoster(dates, events.filter(item => item.date >= start && item.date <= end), children, illustration)
      .then(url => { if (active) setPosterUrl(url); })
      .catch(() => { if (active) setNotice("일러스트 이미지를 표시하지 못했습니다. 다시 만들어 주세요."); });
    return () => { active = false; };
  }, [illustration, events, children, dates, start, end]);
  async function addCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) { setNotice("일정 종류의 이름을 입력해 주세요."); return; }
    try { await persist({ type: "category.add", name }); setCategoryName(""); } catch {}
  }
  async function removeCategory(id: string) {
    try { await persist({ type: "category.remove", id }); } catch {}
  }
  async function addChild(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = childName.trim();
    if (!name) { setNotice("아이 이름이나 별명을 입력해 주세요."); return; }
    try { await persist({ type: "child.add", name }); setChildName(""); } catch {}
  }
  async function removeChild(id: string) {
    try { await persist({ type: "child.remove", id }); } catch {}
  }
  function shiftWeek(amount: number) {
    const d = new Date(dates[0]); d.setDate(d.getDate() + amount * 7);
    setWeek(iso(d)); setForm(previous => ({ ...previous, date: "" })); setSuggestions([]); setNotice("");
  }
  async function addEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.date || !form.title.trim()) { setNotice("날짜와 일정 이름을 입력해 주세요."); return; }
    if (currentEvents.length >= 30) { setNotice("한 주에는 일정을 30개까지 입력할 수 있습니다."); return; }
    try { await persist({ type: "event.add", ...form, title: form.title.trim() }); setForm(previous => ({ ...previous, title: "", time: "" })); } catch {}
  }
  async function askAi() {
    if (!currentEvents.length) { setNotice("먼저 일정을 입력해 주세요."); return; }
    setBusy(true); setNotice("");
    try {
      const response = await familyFetch("/api/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ events: currentEvents.map(item => ({ ...item, childName: childFor(item.childId)?.name || "공통", categoryName: categoryFor(item.categoryId)?.name || "기타" })) }) });
      const data = await response.json() as { error?: string; suggestions: Suggestion[] };
      if (!response.ok) throw new Error(data.error || "AI 추천을 가져오지 못했습니다.");
      setSuggestions(data.suggestions); setNotice("준비할 일을 확인해 주세요. 저장 이미지에는 일정만 표시됩니다.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "AI 연결에 실패했습니다."); }
    finally { setBusy(false); }
  }
  async function generateIllustration() {
    if (!currentEvents.length) { setNotice("이미지에 넣을 일정을 먼저 입력해 주세요."); return; }
    setImageBusy(true); setNotice("");
    try {
      const response = await familyFetch("/api/illustration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ style: imageStyle.trim() }), cache: "no-store" });
      const data = await response.json() as { image?: string; error?: string };
      if (!response.ok || !data.image?.startsWith("data:image/png;base64,")) throw new Error(data.error || "일러스트 이미지를 만들지 못했습니다.");
      setPosterUrl("");
      setIllustration(data.image);
      setNotice("일러스트가 완성되었습니다. 미리보기를 확인하고 PNG로 저장하세요.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "이미지 생성에 실패했습니다."); }
    finally { setImageBusy(false); }
  }
  function useStaticIllustration() {
    if (!currentEvents.length) { setNotice("이미지에 넣을 일정을 먼저 입력해 주세요."); return; }
    setPosterUrl("");
    setIllustration(new URL("illustrated-background.png", document.baseURI).href);
    setNotice("기본 동화 배경을 적용했습니다. 미리보기를 확인하고 PNG로 저장하세요.");
  }
  function downloadIllustration() {
    if (!posterUrl) { setNotice("일러스트가 준비되면 저장할 수 있습니다."); return; }
    const link = document.createElement("a"); link.href = posterUrl; link.download = `JuniHani-동화주간일정-${start}.png`;
    document.body.appendChild(link); link.click(); link.remove();
    setNotice("동화 주간 일정 PNG가 저장되었습니다.");
  }
  function download() {
    if (!currentEvents.length) { setNotice("이미지에 넣을 일정을 먼저 입력해 주세요."); return; }
    try {
      const url = drawPng(dates, currentEvents, children, categories, skin);
      const link = document.createElement("a"); link.href = url; link.download = `아이들-주간계획-${start}.png`;
      document.body.appendChild(link); link.click(); link.remove();
      setNotice("PNG 이미지가 저장되었습니다.");
    } catch { setNotice("이미지를 저장하지 못했습니다."); }
  }
  if (access !== "ready") return <main className="access-shell"><section className="access-card" aria-labelledby="access-title">
    <span className="access-icon"><CalendarDays size={30} /></span><p className="eyebrow">JuniHani 가족 공유</p><h1 id="access-title">우리 가족 일정 열기</h1>
    <p>계정 없이 가족 공유 코드로 접속하고, 두 분이 같은 일정을 저장할 수 있어요.</p>
    {access === "loading" ? <p role="status">일정을 확인하는 중…</p> : access === "error" ? <button className="primary-button" type="button" onClick={() => window.location.reload()}>다시 시도</button> :
      <form className="access-form" onSubmit={unlock}><label htmlFor="share-code">가족 공유 코드</label><input id="share-code" type="password" autoComplete="off" required value={shareCode} onChange={event => setShareCode(event.target.value)} placeholder="전달받은 코드를 입력하세요" /><button className="primary-button" disabled={accessBusy}>{accessBusy ? "확인 중…" : "일정 열기"}</button></form>}
    {accessMessage && <p className="access-error" role="alert">{accessMessage}</p>}
    <small>공유 코드를 받은 가족만 일정을 볼 수 있습니다. 휴대폰 브라우저 메뉴에서 홈 화면에 추가할 수 있어요.</small>
    <SkinPicker selected={skin} onSelect={selectSkin} />
  </section></main>;
  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark"><CalendarDays size={22} /></span><span><strong>JuniHani</strong><small>우리 가족 주간 플래너</small></span></div><button className="signout-button" type="button" onClick={signOut}>가족 일정 잠그기</button></header>
    <div className="page-intro"><div><p className="eyebrow">한 주를 한눈에</p><h1>아이들 일정, 한 주에 담아요</h1><p>병원부터 어린이집까지 챙길 일을 차분하게 정리해 보세요.</p></div><span className="intro-decoration" aria-hidden="true">✳</span></div>
    <div className="workspace">
      <section className="editor" aria-labelledby="editor-title">
        <div className="panel-heading"><div><p className="eyebrow">이번 주 계획</p><h2 id="editor-title">새 일정 등록</h2></div><span className="panel-icon" aria-hidden="true"><Plus size={21} /></span></div>
        <div className="week-picker"><button type="button" onClick={() => shiftWeek(-1)} aria-label="이전 주"><ChevronLeft size={20} /></button><div><strong>{label(dates[0])} – {label(dates[6])}</strong><span>{dates[0].getFullYear()}년</span></div><button type="button" onClick={() => shiftWeek(1)} aria-label="다음 주"><ChevronRight size={20} /></button></div>
        <form className="event-form" onSubmit={addEvent}>
          <div className="form-row"><label>날짜<select value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}><option value="">선택</option>{dates.map(d => <option key={iso(d)} value={iso(d)}>{weekNames[d.getDay()]} · {label(d)}</option>)}</select></label><label>시간<input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></label></div>
          <label>일정 이름<input type="text" maxLength={80} placeholder="예: 소아과 진료, 어린이집 상담" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
          <div className="form-row"><label>아이<select value={form.childId} onChange={e => setForm({ ...form, childId: e.target.value })}><option value="">공통 일정</option>{children.map(child => <option key={child.id} value={child.id}>{child.name || "이름 없음"}</option>)}</select></label><label>종류<select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>{categories.map(category => <option key={category.id} value={category.id}>{category.name || "이름 없음"}</option>)}</select></label></div><button className="primary-button" type="submit"><Plus size={18} /> 일정 추가</button>
        </form>
        <div className="settings-area"><p className="settings-label">관리 설정</p>
          <SkinPicker selected={skin} onSelect={selectSkin} />
          <details className="manage-panel"><summary><span>아이 관리</span><span className="manage-count">{children.length}명</span></summary>
        <div className="children-editor"><h2>아이 구분</h2><p>이름이나 별명을 등록하고 일정마다 선택하세요.</p><form onSubmit={addChild} className="child-add"><input aria-label="아이 이름 또는 별명" maxLength={16} placeholder="아이 이름 또는 별명" value={childName} onChange={e => setChildName(e.target.value)} /><button type="submit" disabled={children.length >= 6}><Plus size={17} /> 추가</button></form>{children.length > 0 && <ul className="child-list">{children.map(child => <li key={child.id}><span className="child-dot" style={{ backgroundColor: child.color }} /><input aria-label={`${child.name} 이름 수정`} maxLength={16} value={child.name} onFocus={e => { e.currentTarget.dataset.originalName = child.name; }} onChange={e => { const name = e.target.value; setChildren(previous => previous.map(item => item.id === child.id ? { ...item, name } : item)); setSuggestions([]); }} onBlur={e => { const name = e.target.value.trim(); if (name !== e.currentTarget.dataset.originalName) persist({ type: "child.rename", id: child.id, name }).catch(() => {}); }} /><button type="button" aria-label={`${child.name} 삭제`} title="이 아이의 일정이 있으면 삭제할 수 없습니다" onClick={() => removeChild(child.id)}><Trash2 size={16} /></button></li>)}</ul>}</div>
          </details>
          <details className="manage-panel"><summary><span>일정 종류</span><span className="manage-count">{categories.length}개</span></summary>
        <div className="children-editor"><h2>일정 종류 관리</h2><p>필요한 종류를 추가하고 이름을 바꿀 수 있습니다.</p><form onSubmit={addCategory} className="child-add"><input aria-label="새 일정 종류" maxLength={16} placeholder="예: 학원, 예방접종" value={categoryName} onChange={e => setCategoryName(e.target.value)} /><button type="submit" disabled={categories.length >= 8}><Plus size={17} /> 추가</button></form><ul className="child-list">{categories.map(category => <li key={category.id}><span className="child-dot" style={{ backgroundColor: category.color }} /><input aria-label={`${category.name} 종류 이름 수정`} maxLength={16} value={category.name} onFocus={e => { e.currentTarget.dataset.originalName = category.name; }} onChange={e => { const name = e.target.value; setCategories(previous => previous.map(item => item.id === category.id ? { ...item, name } : item)); setSuggestions([]); }} onBlur={e => { const name = e.target.value.trim(); if (name !== e.currentTarget.dataset.originalName) persist({ type: "category.rename", id: category.id, name }).catch(() => {}); }} /><button type="button" aria-label={`${category.name} 종류 삭제`} title="이 종류의 일정이 있으면 삭제할 수 없습니다" onClick={() => removeCategory(category.id)}><Trash2 size={16} /></button></li>)}</ul></div>
          </details>
        </div>
        <p className="privacy-note">아이와 일정은 가족 저장소에 자동으로 보관됩니다. 가족 공유 코드를 아는 사람만 열 수 있습니다.</p>
      </section>
      <section className="preview" aria-labelledby="preview-title">
        <div className="preview-head"><div><p className="eyebrow">주간 미리보기</p><h2 id="preview-title">이번 주 일정</h2><p>{label(dates[0])}부터 {label(dates[6])}까지</p></div><button className="download-button" type="button" onClick={download}><Download size={17} /> PNG 저장</button></div>
        <div className="week-summary"><span><strong>{currentEvents.length}</strong>개의 일정</span><span><strong>{children.length}</strong>명의 아이</span><span>월요일부터 일요일까지</span></div>
        <div className="week-grid">{dates.map(d => {
          const dayEvents = currentEvents.filter(item => item.date === iso(d)).sort((a, b) => a.time.localeCompare(b.time));
          return <div className={`day-card ${dayEvents.length ? "has-events" : ""}`} key={iso(d)}><div className="day-heading"><strong>{weekNames[d.getDay()]}요일</strong><span>{label(d)}</span></div>{dayEvents.length ? <ul>{dayEvents.map(item => <li key={item.id}><span className="child-badge" style={{ borderColor: childFor(item.childId)?.color || "#9baeb2" }}>{childFor(item.childId)?.name || "공통"}</span><span className="category" style={{ backgroundColor: (categoryFor(item.categoryId)?.color || "#9baeb2") + "33" }}>{categoryFor(item.categoryId)?.name || "기타"}</span><span className="event-text">{item.time && <time>{item.time} </time>}{item.title}</span><button type="button" onClick={() => persist({ type: "event.remove", id: item.id }).catch(() => {})} aria-label={`${item.title} 삭제`}><Trash2 size={17} /></button></li>)}</ul> : <p className="empty-day">아직 일정이 없어요</p>}</div>;
        })}</div>
        <div className="suggestions"><div className="suggestions-head"><div><span className="sparkle-icon"><Sparkles size={19} /></span><span><h3>준비할 일</h3><small>일정을 바탕으로 챙길 일을 정리해요</small></span></div><button type="button" onClick={askAi} disabled={busy}>{busy ? "정리 중…" : "AI로 정리하기"}</button></div>{suggestions.length ? <ul>{suggestions.map((item, i) => { const event = currentEvents.find(event => event.id === item.eventId); return <li key={item.eventId + i}><span className="checkbox" aria-hidden="true" /><span><strong>{childFor(event?.childId || "")?.name || "공통"}</strong> {item.text}</span></li>; })}</ul> : <p>일정을 입력한 뒤 AI로 준비할 일을 정리할 수 있습니다.</p>}</div>
        <div className="illustration-panel"><div className="illustration-heading"><span className="illustration-icon" aria-hidden="true"><ImagePlus size={22} /></span><div><h3>동화 일러스트 이미지</h3><p>아이별 일정을 작은 말풍선에 담아 배경 그림과 함께 보여줘요.</p></div></div><label className="illustration-style" htmlFor="illustration-style">원하는 꾸밈 분위기 <span>(선택)</span></label><input id="illustration-style" className="illustration-style-input" type="text" value={imageStyle} onChange={event => setImageStyle(event.target.value)} maxLength={160} placeholder="예: 분홍 꽃과 토끼, 파란 하늘과 별" disabled={imageBusy} /><div className="illustration-actions"><button className="illustration-create" type="button" onClick={generateIllustration} disabled={imageBusy || !currentEvents.length}>{imageBusy ? "이미지 만드는 중…" : "AI로 새 배경 만들기"}</button><button className="illustration-template" type="button" onClick={useStaticIllustration} disabled={imageBusy || !currentEvents.length}>기본 일러스트 사용</button>{posterUrl && <button className="illustration-save" type="button" onClick={downloadIllustration}><Download size={17} /> 일러스트 PNG 저장</button>}</div><p className="illustration-privacy">AI는 꾸밈 배경만 생성하고, 아이 이름과 일정은 기기에서 한글로 넣습니다. 저장 이미지에는 챙길 일 목록이 포함되지 않습니다.</p>{posterUrl && <div className="illustration-preview"><img src={posterUrl} alt="아이별 일정이 말풍선에 적힌 동화풍 주간 일정표 미리보기" /></div>}</div>
        {notice && <p className="notice" role="status">{notice}</p>}
      </section>
    </div>
  </main>;
}
