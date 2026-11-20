// esbuild 0.25+ refuses regexes containing literal backticks, so strip
// fenced-code wrappers with plain string ops instead of a regex.
export function providerContentToText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(providerContentToText).filter(Boolean).join('');
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['text', 'content', 'output', 'result', 'data', 'response']) {
      const nested = providerContentToText(record[key]);
      if (nested) return nested;
    }
  }
  return '';
}

export function balancedJsonCandidates(value: string): string[] {
  const candidates: string[] = [];
  for (let start = 0; start < value.length; start += 1) {
    if (value[start] !== '{' && value[start] !== '[') continue;
    const stack: string[] = [];
    let inString = false;
    let escaped = false;
    for (let index = start; index < value.length; index += 1) {
      const char = value[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char.charCodeAt(0) === 92) escaped = true;
        else if (char === '\"') inString = false;
        continue;
      }
      if (char === '\"') { inString = true; continue; }
      if (char === '{' || char === '[') stack.push(char);
      else if (char === '}' || char === ']') {
        const expected = char === '}' ? '{' : '[';
        if (stack.pop() !== expected) break;
        if (stack.length === 0) {
          candidates.push(value.slice(start, index + 1));
          break;
        }
      }
    }
  }
  return candidates.filter((candidate, index, all) => all.indexOf(candidate) === index);
}

export function balancedJsonCandidate(value: string): string | null {
  return balancedJsonCandidates(value)[0] || null;
}

export function extractJson(text: string, depth = 0): unknown {
  if (depth > 6) throw new Error('AI returned excessively nested JSON.');
  const cleaned = String(text || '').trim();
  const candidates = [cleaned, ...balancedJsonCandidates(cleaned)].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);
  for (const item of candidates) {
    try {
      const parsed = JSON.parse(item) as unknown;
      if (typeof parsed === 'string') return extractJson(parsed, depth + 1);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const record = parsed as Record<string, unknown>;
        for (const key of ['result', 'data', 'text', 'content', 'output', 'response', 'body']) {
          if (key in record) {
            try { return extractJson(providerContentToText(record[key]), depth + 1); } catch { /* keep trying */ }
          }
        }
      }
      return parsed;
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error('AI provider returned invalid JSON.');
}
