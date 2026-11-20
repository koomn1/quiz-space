import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { CosmoPalette } from './CosmoPalette';

const ACCENT = '#007472';

/* ─── Markdown parser with Mac-style code blocks & rich tables ─── */
export function renderInlineMd(line: string, keyPrefix: string, theme: CosmoPalette): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const codeSplit = line.split(/(`[^`]+`)/g);
  codeSplit.forEach((chunk, ci) => {
    if (chunk.startsWith('`') && chunk.endsWith('`') && chunk.length > 1) {
      parts.push(
        <code
          key={`${keyPrefix}-code-${ci}`}
          dir="ltr"
          className="px-1.5 py-0.5 rounded-md text-[0.85em] font-mono border inline-block"
          style={{
            background: theme.IS_DARK ? 'rgba(0,116,114,0.15)' : 'rgba(0,116,114,0.08)',
            borderColor: 'rgba(42,195,187,0.25)',
            color: theme.IS_DARK ? '#2AC3BB' : '#007472',
          }}
        >
          {chunk.slice(1, -1)}
        </code>
      );
      return;
    }
    const boldItalicSplit = chunk.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g);
    boldItalicSplit.forEach((piece, pi) => {
      if (/^\*\*[^*]+\*\*$/.test(piece)) {
        parts.push(
          <strong key={`${keyPrefix}-b-${ci}-${pi}`} className="font-bold text-[#007472] dark:text-[#2AC3BB]">
            {piece.slice(2, -2)}
          </strong>
        );
      } else if (/^\*[^*]+\*$/.test(piece) || /^_[^_]+_$/.test(piece)) {
        parts.push(
          <em key={`${keyPrefix}-i-${ci}-${pi}`} className="italic">
            {piece.slice(1, -1)}
          </em>
        );
      } else if (piece) {
        parts.push(piece);
      }
    });
  });
  return parts;
}

export function CodeBlock({ content, lang, theme }: { content: string; lang?: string; theme: CosmoPalette }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      dir="ltr"
      className="relative my-3 rounded-2xl overflow-hidden border shadow-md"
      style={{ borderColor: theme.BORDER, background: '#0b0f19' }}
    >
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#111827' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded text-slate-400 bg-slate-800/80">{lang || 'code'}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(content).catch(() => {});
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
          aria-label={copied ? 'تم النسخ' : 'نسخ الكود'}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'تم النسخ' : 'نسخ الكود'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono text-slate-200">
        <code>{content}</code>
      </pre>
    </div>
  );
}

export function FormattedText({ text, fg, theme }: { text: string; fg: string; theme: CosmoPalette }) {
  const blocks: { type: 'code' | 'text'; content: string; lang?: string }[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = codeBlockRegex.exec(text)) !== null) {
    if (m.index > lastEnd) blocks.push({ type: 'text', content: text.slice(lastEnd, m.index) });
    blocks.push({ type: 'code', content: m[2].replace(/\n$/, ''), lang: m[1] || undefined });
    lastEnd = codeBlockRegex.lastIndex;
  }
  if (lastEnd < text.length) blocks.push({ type: 'text', content: text.slice(lastEnd) });

  return (
    <div className="space-y-2 leading-7 text-[15px]" style={{ color: fg }}>
      {blocks.map((block, blockIdx) => {
        if (block.type === 'code') {
          return <CodeBlock key={`code-${blockIdx}`} content={block.content} lang={block.lang} theme={theme} />;
        }

        const lines = block.content.split('\n');
        const rendered: React.ReactNode[] = [];
        let i = 0;
        while (i < lines.length) {
          const line = lines[i];
          if (!line) {
            rendered.push(<br key={`br-${blockIdx}-${i}`} />);
            i++;
            continue;
          }

          const isTableSeparator = (row: string | undefined) => {
            if (!row || !row.includes('|')) return false;
            const cells = row
              .trim()
              .replace(/^\||\|$/g, '')
              .split('|')
              .map(cell => cell.trim());
            return cells.length >= 2 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
          };

          if (line.includes('|') && isTableSeparator(lines[i + 1])) {
            const parseRow = (row: string) =>
              row
                .trim()
                .replace(/^\||\|$/g, '')
                .split('|')
                .map(c => c.trim());
            const header = parseRow(line);
            let r = i + 2;
            const rows: string[][] = [];
            while (r < lines.length && lines[r].includes('|')) {
              rows.push(parseRow(lines[r]));
              r++;
            }
            rendered.push(
              <div
                key={`table-${blockIdx}-${i}`}
                className="my-3 overflow-x-auto rounded-2xl border shadow-sm"
                style={{ borderColor: theme.BORDER }}
              >
                <table dir="rtl" className="w-full text-xs">
                  <thead style={{ background: theme.IS_DARK ? 'rgba(0,116,114,0.15)' : 'rgba(0,116,114,0.06)' }}>
                    <tr>
                      {header.map((h, hi) => (
                        <th key={hi} className="px-3.5 py-2.5 text-right font-bold" style={{ color: fg }}>
                          {renderInlineMd(h, `th-${i}-${hi}`, theme)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr
                        key={ri}
                        style={{
                          borderTop: `1px solid ${theme.BORDER_SOFT}`,
                          background:
                            ri % 2 === 1
                              ? theme.IS_DARK
                                ? 'rgba(255,255,255,0.02)'
                                : 'rgba(0,0,0,0.015)'
                              : 'transparent',
                        }}
                      >
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3.5 py-2.5" style={{ color: theme.MUTED }}>
                            {renderInlineMd(cell, `td-${i}-${ri}-${ci}`, theme)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            i = r;
            continue;
          }

          if (line.startsWith('### ')) {
            rendered.push(
              <h4 key={`h4-${i}`} className="text-sm font-bold mt-3 mb-1" style={{ color: fg }}>
                {renderInlineMd(line.replace('### ', ''), `h4-${i}`, theme)}
              </h4>
            );
            i++;
            continue;
          }
          if (line.startsWith('## ') || line.startsWith('# ')) {
            rendered.push(
              <h3
                key={`h3-${i}`}
                className="text-base font-bold mt-4 mb-1.5 pb-1 border-b"
                style={{ color: fg, borderColor: theme.BORDER_SOFT }}
              >
                {renderInlineMd(line.replace(/^##? /, ''), `h3-${i}`, theme)}
              </h3>
            );
            i++;
            continue;
          }

          const isBullet = line.startsWith('- ') || line.startsWith('* ');
          const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
          const cleanLine = isBullet ? line.substring(2) : numberedMatch ? numberedMatch[2] : line;
          const parts = renderInlineMd(cleanLine, `l-${i}`, theme);

          if (isBullet) {
            rendered.push(
              <div key={`li-${i}`} className="flex items-start gap-2 pr-1">
                <span className="mt-2 shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
                <p className="flex-1">{parts}</p>
              </div>
            );
          } else if (numberedMatch) {
            rendered.push(
              <div key={`nli-${i}`} className="flex items-start gap-2 pr-1">
                <span
                  className="shrink-0 font-bold text-xs px-1.5 py-0.5 rounded-md"
                  style={{ background: 'rgba(0,116,114,0.12)', color: ACCENT }}
                >
                  {numberedMatch[1]}
                </span>
                <p className="flex-1">{parts}</p>
              </div>
            );
          } else {
            rendered.push(<p key={`p-${i}`}>{parts}</p>);
          }
          i++;
        }
        return <React.Fragment key={`block-${blockIdx}`}>{rendered}</React.Fragment>;
      })}
    </div>
  );
}
