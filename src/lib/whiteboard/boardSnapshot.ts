/** Rasterize the whiteboard svg (lesson layer + learner freehand strokes) to a PNG data URL for the vision model. */

export async function captureBoardPng(svg: SVGSVGElement, canvasSize: { width: number; height: number }): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
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
