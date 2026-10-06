export type PosterEvent = { id: string; date: string; time: string; title: string; categoryId: string; childId: string };
export type PosterChild = { id: string; name: string; color: string };

const width = 1536;
const bubbleWidth = 560;
const bubbleGap = 150;
const rowGap = 78;
const firstRowTop = 225;
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
    const last = lines.length - 1;
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

type Group = { id: string; name: string; color: string; events: PosterEvent[] };
type EventLine = { event: PosterEvent; lines: string[]; height: number };
type Bubble = { group: Group; lines: EventLine[]; height: number };

function measureBubble(ctx: CanvasRenderingContext2D, group: Group): Bubble {
  ctx.font = `800 27px ${font}`;
  const lines = group.events.map(event => {
    const titleLines = shortLines(ctx, event.title, bubbleWidth - 102);
    return { event, lines: titleLines, height: 48 + titleLines.length * 36 };
  });
  return { group, lines, height: 112 + lines.reduce((sum, item) => sum + item.height, 0) };
}

function drawBubble(ctx: CanvasRenderingContext2D, bubble: Bubble, x: number, y: number, column: number) {
  const { group, lines, height } = bubble;
  const tailX = column === 0 ? x + 148 : x + bubbleWidth - 148;
  ctx.shadowColor = "rgba(92, 62, 52, .18)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  roundBox(ctx, x, y, bubbleWidth, height, "rgba(255, 253, 249, .88)", 36);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = "rgba(255, 253, 249, .88)";
  ctx.beginPath();
  ctx.moveTo(tailX - 32, y + height - 2);
  ctx.lineTo(tailX, y + height + 34);
  ctx.lineTo(tailX + 32, y + height - 2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = group.color;
  ctx.globalAlpha = .62;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, bubbleWidth, height, 36);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = group.color;
  ctx.font = `900 39px ${font}`;
  ctx.fillText(group.name, x + 34, y + 62, bubbleWidth - 68);
  ctx.strokeStyle = "rgba(103, 76, 65, .15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 34, y + 82);
  ctx.lineTo(x + bubbleWidth - 34, y + 82);
  ctx.stroke();

  let eventTop = y + 102;
  lines.forEach((item, index) => {
    ctx.fillStyle = group.color;
    ctx.beginPath();
    ctx.arc(x + 43, eventTop + 15, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#725c56";
    ctx.font = `700 21px ${font}`;
    const when = `${dateLabel(item.event.date)}${item.event.time ? ` · ${item.event.time}` : ""}`;
    ctx.fillText(when, x + 61, eventTop + 23, bubbleWidth - 95);
    ctx.fillStyle = "#4d3733";
    ctx.font = `800 27px ${font}`;
    item.lines.forEach((line, lineIndex) => ctx.fillText(line, x + 61, eventTop + 60 + lineIndex * 36));
    eventTop += item.height;
    if (index < lines.length - 1) {
      ctx.strokeStyle = "rgba(103, 76, 65, .12)";
      ctx.beginPath();
      ctx.moveTo(x + 61, eventTop - 9);
      ctx.lineTo(x + bubbleWidth - 34, eventTop - 9);
      ctx.stroke();
    }
  });
}

export async function drawIllustratedPoster(
  dates: Date[],
  events: PosterEvent[],
  children: PosterChild[],
  background: string,
) {
  const image = await loadImage(background);
  const ordered = [...events].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const groups: Group[] = children
    .filter(child => ordered.some(event => event.childId === child.id))
    .map(child => ({ id: child.id, name: child.name, color: child.color, events: ordered.filter(event => event.childId === child.id) }));
  const commonEvents = ordered.filter(event => !children.some(child => child.id === event.childId));
  if (commonEvents.length) groups.push({ id: "common", name: "가족 공통", color: "#a978bd", events: commonEvents });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 1024;
  let ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 만들 수 없습니다.");
  const rows = Array.from({ length: Math.ceil(groups.length / 2) }, (_, index) =>
    groups.slice(index * 2, index * 2 + 2).map(group => measureBubble(ctx!, group))
  );
  const rowHeights = rows.map(row => Math.max(...row.map(bubble => bubble.height)));
  const contentBottom = firstRowTop + rowHeights.reduce((sum, height) => sum + height + rowGap, 0) + 90;
  canvas.height = Math.max(1024, contentBottom);
  ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 만들 수 없습니다.");

  ctx.fillStyle = "#fff9f0";
  ctx.fillRect(0, 0, width, canvas.height);
  ctx.drawImage(image, 0, 0, width, 1024);
  if (canvas.height > 1024) {
    const fade = ctx.createLinearGradient(0, 820, 0, 1080);
    fade.addColorStop(0, "rgba(255, 249, 240, 0)");
    fade.addColorStop(1, "#fff9f0");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 820, width, 260);
  }

  roundBox(ctx, 322, 45, 892, 126, "rgba(255, 253, 249, .82)", 44);
  ctx.textAlign = "center";
  ctx.fillStyle = "#573b35";
  ctx.font = `900 54px ${font}`;
  ctx.fillText("우리 아이들 주간 일정", width / 2, 105);
  ctx.font = `700 25px ${font}`;
  ctx.fillStyle = "#80665d";
  ctx.fillText(`${dateLabel(localDate(dates[0]))}  ~  ${dateLabel(localDate(dates[6]))}`, width / 2, 148);
  ctx.textAlign = "left";

  let rowTop = firstRowTop;
  rows.forEach((row, rowIndex) => {
    const startX = row.length === 1 ? (width - bubbleWidth) / 2 : (width - bubbleWidth * 2 - bubbleGap) / 2;
    row.forEach((bubble, column) => drawBubble(ctx!, bubble, startX + column * (bubbleWidth + bubbleGap), rowTop, column));
    rowTop += rowHeights[rowIndex] + rowGap;
  });

  ctx.textAlign = "right";
  ctx.font = `700 19px ${font}`;
  ctx.fillStyle = "#8a736d";
  ctx.fillText("JuniHani ♡", width - 68, canvas.height - 35);
  return canvas.toDataURL("image/png");
}
