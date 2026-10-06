export type PosterEvent = { id: string; date: string; time: string; title: string; categoryId: string; childId: string };
export type PosterChild = { id: string; name: string; color: string };
export type PosterCategory = { id: string; name: string; color: string };
export type PosterSuggestion = { eventId: string; text: string };

const width = 1536;
const margin = 88;
const gap = 24;
const font = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const koreanDays = ["일", "월", "화", "수", "목", "금", "토"];

function roundBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, radius = 28) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
}

function dateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${koreanDays[date.getDay()]})`;
}

function localDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function drawChildFace(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffe0c6";
  ctx.beginPath(); ctx.arc(x, y + 3, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5d3e35";
  ctx.beginPath(); ctx.arc(x, y - 6, 23, Math.PI, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 7, y + 4, 2, 0, Math.PI * 2); ctx.arc(x + 7, y + 4, 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#9f5c56"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y + 9, 6, 0.12, Math.PI - 0.12); ctx.stroke();
  ctx.fillStyle = "#f2a69c";
  ctx.beginPath(); ctx.arc(x - 14, y + 11, 4, 0, Math.PI * 2); ctx.arc(x + 14, y + 11, 4, 0, Math.PI * 2); ctx.fill();
}

function shortLines(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, maxLines = 2) {
  const chars = Array.from(value);
  const lines: string[] = [];
  let line = "";
  for (const char of chars) {
    if (ctx.measureText(line + char).width > maxWidth && line) {
      lines.push(line);
      line = char;
      if (lines.length === maxLines) break;
    } else line += char;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.join("").length < chars.length && lines.length) {
    let last = lines.length - 1;
    while (lines[last] && ctx.measureText(lines[last] + "…").width > maxWidth) lines[last] = lines[last].slice(0, -1);
    lines[last] += "…";
  }
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("배경 이미지를 읽지 못했습니다."));
    image.src = src;
  });
}

export async function drawIllustratedPoster(
  dates: Date[],
  events: PosterEvent[],
  children: PosterChild[],
  categories: PosterCategory[],
  suggestions: PosterSuggestion[],
  background: string,
) {
  const image = await loadImage(background);
  const ordered = [...events].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const groups = children.filter(child => ordered.some(event => event.childId === child.id)).map(child => ({ id: child.id, name: child.name, color: child.color, events: ordered.filter(event => event.childId === child.id) }));
  const commonEvents = ordered.filter(event => !children.some(child => child.id === event.childId));
  if (commonEvents.length) groups.push({ id: "common", name: "가족 공통", color: "#a978bd", events: commonEvents });
  const columns = groups.length === 1 ? 1 : 2;
  const rows = Array.from({ length: Math.ceil(groups.length / columns) }, (_, index) => groups.slice(index * columns, index * columns + columns));
  const rowHeights = rows.map(row => Math.max(...row.map(group => Math.max(260, 122 + group.events.length * 108))));
  const suggestionsHeight = suggestions.length ? 110 + Math.ceil(suggestions.length / 2) * 62 : 0;
  const contentHeight = 224 + rowHeights.reduce((sum, height) => sum + height + gap, 0) + suggestionsHeight + (suggestions.length ? gap : 0) + 100;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.max(1024, contentHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 만들 수 없습니다.");

  ctx.fillStyle = "#fff7f0";
  ctx.fillRect(0, 0, width, canvas.height);
  ctx.drawImage(image, 0, 0, width, Math.min(1024, canvas.height));
  if (canvas.height > 1024) {
    const fade = ctx.createLinearGradient(0, 820, 0, 1080);
    fade.addColorStop(0, "rgba(255,247,240,0)");
    fade.addColorStop(1, "#fff7f0");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 820, width, 260);
  }

  roundBox(ctx, 205, 40, width - 410, 142, "rgba(255,253,249,.91)", 42);
  ctx.textAlign = "center";
  ctx.fillStyle = "#573b35";
  ctx.font = `900 64px ${font}`;
  ctx.fillText("우리 아이들 주간 일정", width / 2, 112);
  ctx.font = `700 28px ${font}`;
  ctx.fillStyle = "#886b62";
  ctx.fillText(`${dateLabel(localDate(dates[0]))}  ~  ${dateLabel(localDate(dates[6]))}`, width / 2, 157);
  ctx.textAlign = "left";

  const cardWidth = (width - margin * 2 - (columns - 1) * gap) / columns;
  let rowTop = 224;
  rows.forEach((row, rowIndex) => {
    row.forEach((group, columnIndex) => {
      const x = margin + columnIndex * (cardWidth + gap);
      const height = rowHeights[rowIndex];
      ctx.shadowColor = "rgba(112,71,61,.13)";
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 8;
      roundBox(ctx, x, rowTop, cardWidth, height, "rgba(255,255,255,.95)", 30);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      roundBox(ctx, x, rowTop, cardWidth, 12, group.color, 6);
      drawChildFace(ctx, x + 69, rowTop + 61, group.color);
      ctx.fillStyle = group.color;
      ctx.font = `900 ${columns === 1 ? 52 : 46}px ${font}`;
      ctx.fillText(group.name, x + 111, rowTop + 78, cardWidth - 285);
      ctx.font = `700 24px ${font}`;
      ctx.fillStyle = "#8c7772";
      ctx.textAlign = "right";
      ctx.fillText(`${group.events.length}개 일정`, x + cardWidth - 34, rowTop + 73);
      ctx.textAlign = "left";

      group.events.forEach((event, index) => {
        const itemY = rowTop + 105 + index * 108;
        const category = categories.find(item => item.id === event.categoryId);
        roundBox(ctx, x + 28, itemY, cardWidth - 56, 96, index % 2 ? "#f8f4f1" : "#f4f8f9", 18);
        roundBox(ctx, x + 28, itemY, 8, 96, category?.color || group.color, 4);
        ctx.font = `700 22px ${font}`;
        ctx.fillStyle = "#8c6766";
        const when = `${dateLabel(event.date)}${event.time ? `  ·  ${event.time}` : ""}`;
        ctx.fillText(when, x + 51, itemY + 31, cardWidth - 100);
        ctx.font = `800 27px ${font}`;
        ctx.fillStyle = "#513b37";
        const prefix = category ? `${category.name} · ` : "";
        const lines = shortLines(ctx, prefix + event.title, cardWidth - 100, 2);
        lines.forEach((line, lineIndex) => ctx.fillText(line, x + 51, itemY + 66 + lineIndex * 27));
      });
    });
    rowTop += rowHeights[rowIndex] + gap;
  });

  if (suggestions.length) {
    roundBox(ctx, margin, rowTop, width - margin * 2, suggestionsHeight, "rgba(255,250,235,.96)", 28);
    ctx.fillStyle = "#6a493b";
    ctx.font = `900 34px ${font}`;
    ctx.fillText("✦ 이번 주 챙길 일", margin + 34, rowTop + 53);
    ctx.font = `600 23px ${font}`;
    suggestions.forEach((suggestion, index) => {
      const event = events.find(item => item.id === suggestion.eventId);
      const child = children.find(item => item.id === event?.childId);
      const col = index % 2;
      const line = Math.floor(index / 2);
      const x = margin + 34 + col * 680;
      const y = rowTop + 96 + line * 62;
      ctx.fillStyle = "#765c4f";
      ctx.fillText(`□ ${child?.name || "공통"} · ${suggestion.text}`, x, y, 635);
    });
  }

  ctx.textAlign = "right";
  ctx.font = `700 20px ${font}`;
  ctx.fillStyle = "#a3867c";
  ctx.fillText("JuniHani ♡", width - margin, canvas.height - 43);
  return canvas.toDataURL("image/png");
}
