/** Rasterize the whiteboard svg (lesson layer + learner freehand strokes) to a PNG data URL for the vision model. */

let fontCssPromise: Promise<string> | null = null;
/** The board fonts as data-URL @font-face rules; an <img>-rendered svg loads no external fonts. */
function boardFontCss(): Promise<string> {
  if (!fontCssPromise) {
    const toB64 = async (url: string) => {
      const buf = await (await fetch(url)).arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    };
    const face = (family: string, weight: number, url: string) =>
      toB64(url).then(b => `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/ttf;base64,${b}) format('truetype');}`).catch(() => '');
    fontCssPromise = Promise.all([
      face('Molhim', 700, '/fonts/Molhim-Bold.ttf'),
      face('Aref Ruqaa', 400, '/fonts/ArefRuqaa-Regular.ttf'),
      face('Aref Ruqaa', 700, '/fonts/ArefRuqaa-Bold.ttf'),
    ]).then(parts => parts.join(''));
  }
  return fontCssPromise;
}

export async function captureBoardPng(svg: SVGSVGElement, canvasSize: { width: number; height: number }): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const fontCss = await boardFontCss();
  if (fontCss) {
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = fontCss;
    clone.insertBefore(style, clone.firstChild);
  }
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(canvasSize.width));
  clone.setAttribute('height', String(canvasSize.height));
  // The svg inherits its font from the page; a detached clone needs it inline.
  if (typeof getComputedStyle === 'function') clone.style.fontFamily = getComputedStyle(svg).fontFamily;
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('board snapshot failed')); img.src = url; });
    const c = document.createElement('canvas');
    c.width = canvasSize.width;
    c.height = canvasSize.height;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    // The paper color lives on the wrapping div, so paint it under the svg.
    ctx.fillStyle = '#fdfcf8';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}
