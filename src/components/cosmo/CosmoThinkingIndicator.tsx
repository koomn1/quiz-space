import React from 'react';
import { Layers } from 'lucide-react';
import { ThinkingOrb as LibraryThinkingOrb, type OrbState } from 'thinking-orbs';
import { CosmoPalette } from './CosmoPalette';
import { AssistantAvatar } from './CosmoAvatar';
import { FormattedText } from './CosmoMarkdown';
import { CosmoTypewriter } from './CosmoTypewriter';

const ASSISTANT_NAME_AR = 'كوزمو AI';
const ACCENT = '#007472';
const ACCENT_CYAN = '#2AC3BB';

export type AgentStepStatus = 'pending' | 'active' | 'done' | 'error';

export interface AgentStep {
  id: string;
  titleAr: string;
  titleEn: string;
  detailAr?: string;
  detailEn?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  status: AgentStepStatus;
}

/* ─── Streaming response row ───────── */
export function StreamingRow({ text, theme }: { text: string; theme: CosmoPalette }) {
  return (
    <div className="flex items-start gap-4 max-w-3xl">
      <AssistantAvatar />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: theme.FG }}>
          <span>{ASSISTANT_NAME_AR}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-[#007472]/15 text-[#007472] dark:bg-[#2AC3BB]/15 dark:text-[#2AC3BB] border border-[#2AC3BB]/30 animate-pulse">
            جاري الكتابة...
          </span>
        </p>
        <div className="p-5 rounded-2xl border shadow-sm" style={{ background: theme.SURFACE, borderColor: theme.BORDER }}>
          <CosmoTypewriter fullText={text} theme={theme} isStreaming={true} />
        </div>
      </div>
    </div>
  );
}

/* ─── Thinking Row ──────────────────────────────────────── */
export function ThinkingRow({
  isAr,
  theme,
  state = 'working',
}: {
  isAr: boolean;
  theme: CosmoPalette;
  state?: OrbState;
}) {
  const labels: Record<OrbState, { ar: string; en: string }> = {
    working: { ar: 'كوزمو بيشتغل على طلبك...', en: 'Cosmo is working on your request...' },
    searching: { ar: 'كوزمو يبحث في الويب والمصادر الحية...', en: 'Cosmo is searching the web...' },
    solving: { ar: 'كوزمو يحلل ويستنتج الإجابة...', en: 'Cosmo is solving and reasoning...' },
    listening: { ar: 'كوزمو بيسمع سؤالك...', en: 'Cosmo is listening...' },
    connecting: { ar: 'كوزمو يربط المفاهيم التعليمية...', en: 'Cosmo is connecting ideas...' },
    weaving: { ar: 'كوزمو يصيغ الشرح المناسب...', en: 'Cosmo is weaving the answer...' },
    composing: { ar: 'كوزمو يكتب الرد الآن...', en: 'Cosmo is composing the reply...' },
    breathing: { ar: 'كوزمو يراجع دقة المعلومات...', en: 'Cosmo is reviewing the reply...' },
    shaping: { ar: 'كوزمو ينسق المخرجات...', en: 'Cosmo is shaping the answer...' },
  };

  return (
    <div className="flex items-start gap-4 max-w-3xl">
      <AssistantAvatar />
      <div className="flex-1">
        <p className="text-sm font-semibold mb-2" style={{ color: theme.FG }}>
          {ASSISTANT_NAME_AR}
        </p>
        <div
          className="flex items-center gap-3 p-4 rounded-2xl border"
          style={{ background: theme.SURFACE, borderColor: `${ACCENT}40` }}
        >
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: 64, height: 64, flexShrink: 0, background: theme.CARD }}
          >
            <LibraryThinkingOrb
              state={state}
              size={64}
              theme={theme.IS_DARK ? 'dark' : 'light'}
              aria-label="Cosmo thinking"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold" style={{ color: ACCENT }}>
              {isAr ? labels[state].ar : labels[state].en}
            </span>
            <span className="text-xs" style={{ color: theme.SUBTLE_TEXT }}>
              {isAr ? 'يعالج السياق التعليمي لتقديم إجابة موثوقة' : 'Processing context for maximum accuracy…'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Agent Execution Plan Row ──────────────────────────── */
export function AgentPlanRow({ steps, isAr, theme }: { steps: AgentStep[]; isAr: boolean; theme: CosmoPalette }) {
  if (!steps.length) return null;
  return (
    <div
      className="mt-3 rounded-2xl border p-3.5"
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ background: theme.CARD, borderColor: theme.BORDER }}
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4" style={{ color: ACCENT_CYAN }} />
          <span className="text-xs font-black" style={{ color: theme.FG }}>
            {isAr ? 'خطة التنفيذ والأدوات' : 'Execution plan & tools'}
          </span>
        </div>
        <span className="text-xs font-bold" style={{ color: theme.SUBTLE_TEXT }}>
          {isAr ? 'نتيجة قابلة للتتبع' : 'Traceable result'}
        </span>
      </div>
      <div className="space-y-2">
        {steps.map(step => {
          const Icon = step.icon;
          const title = isAr ? step.titleAr : step.titleEn;
          const detail = isAr ? step.detailAr : step.detailEn;
          const statusLabel =
            step.status === 'done'
              ? isAr
                ? 'تم'
                : 'Done'
              : step.status === 'error'
              ? isAr
                ? 'تعذر'
                : 'Failed'
              : step.status === 'active'
              ? isAr
                ? 'جارٍ'
                : 'Running'
              : isAr
              ? 'التالي'
              : 'Next';
          return (
            <div
              key={step.id}
              className="flex items-start gap-2.5 rounded-xl border px-2.5 py-2"
              style={{
                borderColor: step.status === 'active' ? `${step.color}66` : theme.BORDER_SOFT,
                background: step.status === 'active' ? `${step.color}12` : 'transparent',
              }}
            >
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ color: step.color, background: `${step.color}18` }}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold" style={{ color: theme.FG }}>
                    {title}
                  </p>
                  <span className="text-[9px] font-black" style={{ color: step.color }}>
                    {statusLabel}
                  </span>
                </div>
                {detail && (
                  <p className="mt-0.5 text-xs leading-5" style={{ color: theme.SUBTLE_TEXT }}>
                    {detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
