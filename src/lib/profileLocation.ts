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
