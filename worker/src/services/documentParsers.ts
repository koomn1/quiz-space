import JSZip from 'jszip';

export async function extractPowerPointText(data: Uint8Array): Promise<string> {
  const archive = await JSZip.loadAsync(data);
  const slideFiles = Object.keys(archive.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/i)?.[1] || 0) - Number(b.match(/slide(\d+)/i)?.[1] || 0));
  const decodeXml = (value: string) => value
    .replace(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi, '$1\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ').trim();
  const slides: string[] = [];
  for (const name of slideFiles) {
    const file = archive.file(name);
    if (!file) continue;
    const xml = await file.async('text');
    const text = decodeXml(xml);
    if (text) slides.push(text);
  }
  return slides.map((text, index) => `الشريحة ${index + 1}:\n${text}`).join('\n\n');
}

export function decodeBase64Utf8(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function escapeHtml(value: unknown): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
