"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Download, ImagePlus, Plus, Sparkles, Trash2 } from "lucide-react";
import { drawIllustratedPoster } from "@/lib/illustrated-poster";

type CategoryItem = { id: string; name: string; color: string };
type Child = { id: string; name: string; color: string };
type EventItem = { id: string; date: string; time: string; title: string; categoryId: string; childId: string };
type Suggestion = { eventId: string; text: string };
const weekNames = ["일", "월", "화", "수", "목", "금", "토"];
const initialCategories: CategoryItem[] = [{ id: "hospital", name: "병원", color: "#ed856f" }, { id: "daycare", name: "어린이집", color: "#35969c" }, { id: "family", name: "가족", color: "#d9a14b" }];
const categoryColors = ["#ed856f", "#35969c", "#d9a14b", "#7a6ac5", "#477db8", "#c46b97", "#348b79", "#9b7955"];
const childColors = ["#7a6ac5", "#d77392", "#348b79", "#c27b37", "#477db8", "#ae6971"];
const iso = (d: Date) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
const dateOf = (v: string) => new Date(v + "T12:00:00");
const label = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
function datesInWeek(value: string) {
  const start = dateOf(value);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
}
function drawPng(dates: Date[], events: EventItem[], children: Child[], categories: CategoryItem[]) {
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
  ctx.fillStyle = "#f3f7f8"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  box(42, 42, 1116, canvas.height - 84, "#ffffff");
  ctx.fillStyle = "#173b47"; ctx.font = "700 58px sans-serif"; ctx.fillText("아이들 주간 계획", 82, 137);
  ctx.fillStyle = "#5d7078"; ctx.font = "500 28px sans-serif";
  ctx.fillText(`${dates[0].getFullYear()}. ${label(dates[0])} – ${label(dates[6])}`, 82, 188);
  let y = 242;
  dates.forEach((date, i) => {
    const items = groups[i], height = heights[i];
    box(82, y, 1026, height, "#eef4f5");
    ctx.fillStyle = "#173b47"; ctx.font = "700 28px sans-serif"; ctx.fillText(weekNames[date.getDay()] + "요일", 106, y + 43);
    ctx.fillStyle = "#657a81"; ctx.font = "500 20px sans-serif"; ctx.fillText(label(date), 244, y + 42);
    if (!items.length) { ctx.fillStyle = "#9aaeb2"; ctx.font = "400 22px sans-serif"; ctx.fillText("일정 없음", 106, y + 79); }
    items.forEach((item, n) => {
      const child = children.find(child => child.id === item.childId);
      const category = categories.find(category => category.id === item.categoryId);
      box(106, y + 55 + n * 43, 9, 27, child?.color || category?.color || "#9baeb2");
      ctx.fillStyle = "#173b47"; ctx.font = "600 23px sans-serif";
      const text = `[${child?.name || "공통"} · ${category?.name || "기타"}] ` + (item.time ? item.time + "  " : "") + item.title;
      ctx.fillText(text, 131, y + 77 + n * 43, 944);
    });
    y += height + 13;
  });
  return canvas.toDataURL("image/png");
}

export default function Home() {
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
    if (!illustration || !events.some(item => item.date >= start && item.date <= end)) { setPosterUrl(""); return; }
    let active = true;
    drawIllustratedPoster(dates, events.filter(item => item.date >= start && item.date <= end), children, illustration)
      .then(url => { if (active) setPosterUrl(url); })
      .catch(() => { if (active) setNotice("일러스트 이미지를 표시하지 못했습니다. 다시 만들어 주세요."); });
    return () => { active = false; };
  }, [illustration, events, children, dates, start, end]);
  function addCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) { setNotice("일정 종류의 이름을 입력해 주세요."); return; }
    if (categories.length >= categoryColors.length) { setNotice("일정 종류는 8개까지 만들 수 있습니다."); return; }
    if (categories.some(category => category.name === name)) { setNotice("이미 있는 일정 종류입니다."); return; }
    const category = { id: crypto.randomUUID(), name, color: categoryColors.find(color => !categories.some(item => item.color === color)) || categoryColors[0] };
    setCategories(previous => [...previous, category]); setCategoryName(""); setNotice("");
  }
  function removeCategory(id: string) {
    if (events.some(event => event.categoryId === id)) { setNotice("이 종류에 속한 일정이 남아 있어 삭제할 수 없습니다. 해당 일정을 먼저 삭제해 주세요."); return; }
    if (categories.length === 1) { setNotice("일정 종류는 하나 이상 필요합니다."); return; }
    const remaining = categories.filter(category => category.id !== id);
    setCategories(remaining);
    setForm(previous => ({ ...previous, categoryId: previous.categoryId === id ? remaining[0].id : previous.categoryId }));
    setNotice("");
  }
  function addChild(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = childName.trim();
    if (!name) { setNotice("아이 이름이나 별명을 입력해 주세요."); return; }
    if (children.length >= childColors.length) { setNotice("아이는 6명까지 등록할 수 있습니다."); return; }
    if (children.some(child => child.name === name)) { setNotice("이미 등록된 이름입니다."); return; }
    const child = { id: crypto.randomUUID(), name, color: childColors.find(color => !children.some(item => item.color === color)) || childColors[0] };
    setChildren(previous => [...previous, child]);
    setForm(previous => ({ ...previous, childId: previous.childId || child.id }));
    setChildName(""); setNotice("");
  }
  function removeChild(id: string) {
    if (events.some(event => event.childId === id)) { setNotice("이 아이의 일정이 남아 있어 삭제할 수 없습니다. 해당 일정을 먼저 삭제해 주세요."); return; }
    setChildren(previous => previous.filter(child => child.id !== id));
    setForm(previous => ({ ...previous, childId: previous.childId === id ? "" : previous.childId }));
    setNotice("");
  }
  function shiftWeek(amount: number) {
    const d = new Date(dates[0]); d.setDate(d.getDate() + amount * 7);
    setWeek(iso(d)); setForm(previous => ({ ...previous, date: "" })); setSuggestions([]); setNotice("");
  }
  function addEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.date || !form.title.trim()) { setNotice("날짜와 일정 이름을 입력해 주세요."); return; }
    if (currentEvents.length >= 30) { setNotice("한 주에는 일정을 30개까지 입력할 수 있습니다."); return; }
    setEvents(previous => [...previous, { ...form, title: form.title.trim(), id: crypto.randomUUID() }]);
    setForm(previous => ({ ...previous, title: "", time: "" })); setSuggestions([]); setNotice("");
  }
  async function askAi() {
    if (!currentEvents.length) { setNotice("먼저 일정을 입력해 주세요."); return; }
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ events: currentEvents.map(item => ({ ...item, childName: childFor(item.childId)?.name || "공통", categoryName: categoryFor(item.categoryId)?.name || "기타" })) }) });
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
      const response = await fetch("/api/illustration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ style: imageStyle.trim() }), cache: "no-store" });
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
    setIllustration("/illustrated-background.png");
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
      const url = drawPng(dates, currentEvents, children, categories);
      const link = document.createElement("a"); link.href = url; link.download = `아이들-주간계획-${start}.png`;
      document.body.appendChild(link); link.click(); link.remove();
      setNotice("PNG 이미지가 저장되었습니다.");
    } catch { setNotice("이미지를 저장하지 못했습니다."); }
  }
  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark"><CalendarDays size={22} /></span><span><strong>JuniHani</strong><small>우리 가족 주간 플래너</small></span></div><span className="topbar-note">일정부터 준비까지, 한곳에서</span></header>
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
          <details className="manage-panel"><summary><span>아이 관리</span><span className="manage-count">{children.length}명</span></summary>
        <div className="children-editor"><h2>아이 구분</h2><p>이름이나 별명을 등록하고 일정마다 선택하세요.</p><form onSubmit={addChild} className="child-add"><input aria-label="아이 이름 또는 별명" maxLength={16} placeholder="아이 이름 또는 별명" value={childName} onChange={e => setChildName(e.target.value)} /><button type="submit" disabled={children.length >= childColors.length}><Plus size={17} /> 추가</button></form>{children.length > 0 && <ul className="child-list">{children.map(child => <li key={child.id}><span className="child-dot" style={{ backgroundColor: child.color }} /><input aria-label={`${child.name} 이름 수정`} maxLength={16} value={child.name} onFocus={e => { e.currentTarget.dataset.originalName = child.name; }} onChange={e => { const name = e.target.value; setChildren(previous => previous.map(item => item.id === child.id ? { ...item, name } : item)); setSuggestions([]); }} onBlur={e => { const name = e.target.value.trim(); const valid = name && !children.some(item => item.id !== child.id && item.name === name); const original = e.currentTarget.dataset.originalName || "아이"; setChildren(previous => previous.map(item => item.id === child.id ? { ...item, name: valid ? name : original } : item)); if (!valid) setNotice("아이 이름은 비어 있거나 중복될 수 없습니다."); }} /><button type="button" aria-label={`${child.name} 삭제`} title="이 아이의 일정이 있으면 삭제할 수 없습니다" onClick={() => removeChild(child.id)}><Trash2 size={16} /></button></li>)}</ul>}</div>
          </details>
          <details className="manage-panel"><summary><span>일정 종류</span><span className="manage-count">{categories.length}개</span></summary>
        <div className="children-editor"><h2>일정 종류 관리</h2><p>필요한 종류를 추가하고 이름을 바꿀 수 있습니다.</p><form onSubmit={addCategory} className="child-add"><input aria-label="새 일정 종류" maxLength={16} placeholder="예: 학원, 예방접종" value={categoryName} onChange={e => setCategoryName(e.target.value)} /><button type="submit" disabled={categories.length >= categoryColors.length}><Plus size={17} /> 추가</button></form><ul className="child-list">{categories.map(category => <li key={category.id}><span className="child-dot" style={{ backgroundColor: category.color }} /><input aria-label={`${category.name} 종류 이름 수정`} maxLength={16} value={category.name} onFocus={e => { e.currentTarget.dataset.originalName = category.name; }} onChange={e => { const name = e.target.value; setCategories(previous => previous.map(item => item.id === category.id ? { ...item, name } : item)); setSuggestions([]); }} onBlur={e => { const name = e.target.value.trim(); const valid = name && !categories.some(item => item.id !== category.id && item.name === name); const original = e.currentTarget.dataset.originalName || "기타"; setCategories(previous => previous.map(item => item.id === category.id ? { ...item, name: valid ? name : original } : item)); if (!valid) setNotice("종류 이름은 비어 있거나 중복될 수 없습니다."); }} /><button type="button" aria-label={`${category.name} 종류 삭제`} title="이 종류의 일정이 있으면 삭제할 수 없습니다" onClick={() => removeCategory(category.id)}><Trash2 size={16} /></button></li>)}</ul></div>
          </details>
        </div>
        <p className="privacy-note">일정은 현재 화면에만 유지됩니다. 이미지는 기기에 저장할 수 있습니다.</p>
      </section>
      <section className="preview" aria-labelledby="preview-title">
        <div className="preview-head"><div><p className="eyebrow">주간 미리보기</p><h2 id="preview-title">이번 주 일정</h2><p>{label(dates[0])}부터 {label(dates[6])}까지</p></div><button className="download-button" type="button" onClick={download}><Download size={17} /> PNG 저장</button></div>
        <div className="week-summary"><span><strong>{currentEvents.length}</strong>개의 일정</span><span><strong>{children.length}</strong>명의 아이</span><span>월요일부터 일요일까지</span></div>
        <div className="week-grid">{dates.map(d => {
          const dayEvents = currentEvents.filter(item => item.date === iso(d)).sort((a, b) => a.time.localeCompare(b.time));
          return <div className={`day-card ${dayEvents.length ? "has-events" : ""}`} key={iso(d)}><div className="day-heading"><strong>{weekNames[d.getDay()]}요일</strong><span>{label(d)}</span></div>{dayEvents.length ? <ul>{dayEvents.map(item => <li key={item.id}><span className="child-badge" style={{ borderColor: childFor(item.childId)?.color || "#9baeb2" }}>{childFor(item.childId)?.name || "공통"}</span><span className="category" style={{ backgroundColor: (categoryFor(item.categoryId)?.color || "#9baeb2") + "33" }}>{categoryFor(item.categoryId)?.name || "기타"}</span><span className="event-text">{item.time && <time>{item.time} </time>}{item.title}</span><button type="button" onClick={() => { setEvents(previous => previous.filter(e => e.id !== item.id)); setSuggestions(previous => previous.filter(s => s.eventId !== item.id)); }} aria-label={`${item.title} 삭제`}><Trash2 size={17} /></button></li>)}</ul> : <p className="empty-day">아직 일정이 없어요</p>}</div>;
        })}</div>
        <div className="suggestions"><div className="suggestions-head"><div><span className="sparkle-icon"><Sparkles size={19} /></span><span><h3>준비할 일</h3><small>일정을 바탕으로 챙길 일을 정리해요</small></span></div><button type="button" onClick={askAi} disabled={busy}>{busy ? "정리 중…" : "AI로 정리하기"}</button></div>{suggestions.length ? <ul>{suggestions.map((item, i) => { const event = currentEvents.find(event => event.id === item.eventId); return <li key={item.eventId + i}><span className="checkbox" aria-hidden="true" /><span><strong>{childFor(event?.childId || "")?.name || "공통"}</strong> {item.text}</span></li>; })}</ul> : <p>일정을 입력한 뒤 AI로 준비할 일을 정리할 수 있습니다.</p>}</div>
        <div className="illustration-panel"><div className="illustration-heading"><span className="illustration-icon" aria-hidden="true"><ImagePlus size={22} /></span><div><h3>동화 일러스트 이미지</h3><p>아이별 일정을 작은 말풍선에 담아 배경 그림과 함께 보여줘요.</p></div></div><label className="illustration-style" htmlFor="illustration-style">원하는 꾸밈 분위기 <span>(선택)</span></label><input id="illustration-style" className="illustration-style-input" type="text" value={imageStyle} onChange={event => setImageStyle(event.target.value)} maxLength={160} placeholder="예: 분홍 꽃과 토끼, 파란 하늘과 별" disabled={imageBusy} /><div className="illustration-actions"><button className="illustration-create" type="button" onClick={generateIllustration} disabled={imageBusy || !currentEvents.length}>{imageBusy ? "이미지 만드는 중…" : "AI로 새 배경 만들기"}</button><button className="illustration-template" type="button" onClick={useStaticIllustration} disabled={imageBusy || !currentEvents.length}>기본 일러스트 사용</button>{posterUrl && <button className="illustration-save" type="button" onClick={downloadIllustration}><Download size={17} /> 일러스트 PNG 저장</button>}</div><p className="illustration-privacy">AI는 꾸밈 배경만 생성하고, 아이 이름과 일정은 기기에서 한글로 넣습니다. 저장 이미지에는 챙길 일 목록이 포함되지 않습니다.</p>{posterUrl && <div className="illustration-preview"><img src={posterUrl} alt="아이별 일정이 말풍선에 적힌 동화풍 주간 일정표 미리보기" /></div>}</div>
        {notice && <p className="notice" role="status">{notice}</p>}
      </section>
    </div>
  </main>;
}
