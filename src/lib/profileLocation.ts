export function readLanyardVisibility(location: string | null | undefined): boolean {
  const value = String(location || '')
    .split('||')
    .find((chunk) => chunk.startsWith('lanyard:'))
    ?.slice('lanyard:'.length)
    .trim()
    .toLowerCase();

  return value === 'on';
}

export function writeLanyardVisibility(location: string | null | undefined, visible: boolean): string {
  const serialized = String(location || '');
  const nextValue = `lanyard:${visible ? 'on' : 'off'}`;
  const marker = /(^|\|\|)lanyard:(?:on|off)(?=\|\||$)/;

  if (marker.test(serialized)) {
    return serialized.replace(marker, (_match, prefix: string) => `${prefix}${nextValue}`);
  }

  return `${serialized}${serialized && !serialized.endsWith('||') ? '||' : ''}${nextValue}`;
}

export function getDisplayLocation(location: string | null | undefined): string | null {
  if (!location) return null;
  const raw = String(location).trim();
  const cleanChunks = raw
    .split('||')
    .map((c) => c.trim())
    .filter((c) => {
      if (!c) return false;
      const lower = c.toLowerCase();
      return (
        !lower.startsWith('lanyard:') &&
        !lower.startsWith('bg:') &&
        !lower.startsWith('custombg:') &&
        !lower.startsWith('covertext:') &&
        !lower.startsWith('cover:') &&
        !lower.startsWith('github:') &&
        !lower.startsWith('country:')
      );
    });

  const display = cleanChunks.join(', ').trim();
  return display.length > 0 ? display : null;
}

export const cleanLocationDisplay = getDisplayLocation;

