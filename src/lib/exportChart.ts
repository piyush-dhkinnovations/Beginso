// PNG export of a rendered chart with no library: the chart's own <svg> is cloned, its CSS variables are
// resolved to real colours (a standalone SVG image has no access to the page's custom properties), drawn onto
// a canvas, and a title and legend are painted around it.
const VAR_RE = /var\((--[\w-]+)\)/g;
const SCALE = 2;

function resolve(value: string, cs: CSSStyleDeclaration): string {
  let out = value;
  // A token can reference another through color-mix(...) - resolve until stable (bounded).
  for (let i = 0; i < 3 && out.includes('var('); i++) out = out.replace(VAR_RE, (_, name: string) => cs.getPropertyValue(name).trim() || 'currentColor');
  return out;
}

function inlineVars(root: Element, cs: CSSStyleDeclaration) {
  const all = [root, ...Array.from(root.querySelectorAll('*'))];
  for (const el of all) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.value.includes('var(')) el.setAttribute(attr.name, resolve(attr.value, cs));
    }
  }
}

export interface LegendItem {
  label: string;
  color: string;
  text: string;
}

function toImage(svgText: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Could not render the chart to an image.'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('PNG export failed.'))), 'image/png'));
}

export async function chartPng(opts: { svg?: SVGSVGElement | null; title: string; subtitle?: string; legend?: LegendItem[]; big?: string }): Promise<Blob> {
  const host = opts.svg ?? document.body;
  const cs = getComputedStyle(host);
  const bg = cs.getPropertyValue('--surface-card').trim() || '#ffffff';
  const ink = cs.getPropertyValue('--text-primary').trim() || '#111111';
  const muted = cs.getPropertyValue('--text-muted').trim() || '#666666';
  const font = cs.fontFamily || 'sans-serif';

  let img: HTMLImageElement | null = null;
  let w = 480;
  let h = 0;
  if (opts.svg) {
    const rect = opts.svg.getBoundingClientRect();
    w = Math.max(Math.round(rect.width), 240);
    h = Math.round(rect.height);
    const clone = opts.svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(w));
    clone.setAttribute('height', String(h));
    clone.style.fontFamily = font;
    clone.removeAttribute('class');
    inlineVars(clone, cs);
    img = await toImage(new XMLSerializer().serializeToString(clone));
  } else {
    h = 160;
  }

  const pad = 20;
  const legend = opts.legend ?? [];
  const legendRows = Math.ceil(legend.length / 2);
  const headH = opts.subtitle ? 64 : 44;
  const totalW = w + pad * 2;
  const totalH = headH + h + (legendRows ? legendRows * 22 + 12 : 0) + pad;

  const canvas = document.createElement('canvas');
  canvas.width = totalW * SCALE;
  canvas.height = totalH * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, totalW, totalH);
  ctx.fillStyle = ink;
  ctx.font = `600 16px ${font}`;
  ctx.fillText(opts.title.slice(0, 80), pad, pad + 14);
  if (opts.subtitle) {
    ctx.fillStyle = muted;
    ctx.font = `12px ${font}`;
    ctx.fillText(opts.subtitle, pad, pad + 36);
  }
  if (img) ctx.drawImage(img, pad, headH, w, h);
  if (opts.big) {
    ctx.fillStyle = ink;
    ctx.font = `700 56px ${font}`;
    ctx.textAlign = 'center';
    ctx.fillText(opts.big, totalW / 2, headH + 90);
    ctx.textAlign = 'left';
  }
  legend.forEach((item, i) => {
    const x = pad + (i % 2) * (w / 2);
    const y = headH + h + 20 + Math.floor(i / 2) * 22;
    ctx.fillStyle = resolve(item.color, cs);
    ctx.fillRect(x, y - 10, 12, 12);
    ctx.fillStyle = ink;
    ctx.font = `12px ${font}`;
    ctx.fillText(`${item.label.slice(0, 28)}  ${item.text}`, x + 18, y);
  });
  return canvasToBlob(canvas);
}
