import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import {
  FileText,
  ShieldCheck,
  Pencil,
  Sparkles,
  Check,
  Copy,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import ProfileAvatar from '../ProfileAvatar';
import { CosmoPalette } from './CosmoPalette';
import { AssistantAvatar } from './CosmoAvatar';
import { FormattedText } from './CosmoMarkdown';
import { QuizShowcaseCard, CreatedQuizMeta } from './CosmoQuizShowcase';
import { CosmoMode } from './CosmoModes';

const ASSISTANT_NAME_AR = 'كوزمو AI';
const ACCENT = '#007472';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  image?: string;
  attachmentName?: string;
  attachmentSize?: string;
  timestamp: string;
  createdQuiz?: CreatedQuizMeta;
  mode?: CosmoMode;
}

export function MessageRow({
  msg,
  index,
  copiedMsgId,
  onCopy,
  onStartQuiz,
  onRegenerate,
  onEditMessage,
  userPhoto,
  userInitial,
  theme,
  isAr,
}: {
  msg: Message;
  index: number;
  copiedMsgId: string | null;
  onCopy: (m: Message) => void;
  onStartQuiz?: (quizId: string) => void;
  onRegenerate?: (msg: Message) => void;
  onEditMessage?: (msg: Message) => void;
  userPhoto?: string;
  userInitial: string;
  theme: CosmoPalette;
  isAr: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<'liked' | 'disliked' | null>(null);

  useEffect(() => {
    if (!rowRef.current) return;
    gsap.from(rowRef.current, { y: 16, opacity: 0, duration: 0.35, ease: 'power2.out' });
  }, [index]);

  return (
    <div ref={rowRef} data-index={index} className="w-full">
      {msg.role === 'user' ? (
        <div className="group flex items-end justify-end gap-3 max-w-2xl ml-auto">
          <div
            className="px-4 py-3 rounded-2xl rounded-br-sm text-[15px] leading-7 shadow-sm border max-w-full"
            style={{
              background: theme.USER_BUBBLE_BG,
              borderColor: theme.USER_BUBBLE_BORDER,
              color: theme.FG,
            }}
          >
            {msg.image && (
              <div className="rounded-xl overflow-hidden mb-3 border max-w-sm" style={{ borderColor: theme.BORDER_SOFT }}>
                <img src={msg.image} alt="Upload" className="w-full max-h-60 object-cover rounded-lg" />
              </div>
            )}
            {msg.attachmentName && (
              <div
                className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl text-xs font-semibold border shadow-xs"
                style={{
                  background: theme.IS_DARK ? 'rgba(0,116,114,0.18)' : 'rgba(0,116,114,0.08)',
                  borderColor: 'rgba(0,116,114,0.3)',
                  color: ACCENT,
                }}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-[200px]">{msg.attachmentName}</span>
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  {isAr ? 'مؤقت محلي ' : 'Local Temp '}
                </span>
              </div>
            )}
            <div className="whitespace-pre-wrap select-text">{msg.text}</div>
            <div className="flex items-center justify-end gap-2 mt-1.5">
              {onEditMessage && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onEditMessage(msg);
                  }}
                  className="p-1 rounded-md transition-colors cursor-pointer opacity-0 group-hover:opacity-100 hover:bg-[#007472]/15"
                  style={{ color: theme.MUTED }}
                  title={isAr ? 'تعديل الرسالة' : 'Edit message'}
                  aria-label={isAr ? 'تعديل الرسالة' : 'Edit message'}
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              <p className="text-[10px] font-medium opacity-60" style={{ color: theme.MUTED }}>
                {msg.timestamp}
              </p>
            </div>
          </div>
          <ProfileAvatar
            src={userPhoto}
            alt={userInitial}
            fallback={userInitial}
            className="h-8 w-8 rounded-full flex-shrink-0 border border-[#2AC3BB]/30 shadow-sm"
            imageClassName="h-full w-full object-cover"
            fallbackClassName="text-sm font-semibold text-white"
          />
        </div>
      ) : (
        <div className="flex items-start gap-3.5 max-w-3xl">
          <AssistantAvatar />
          <div className="flex-1 min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-bold tracking-wide" style={{ color: theme.FG }}>
                {ASSISTANT_NAME_AR}
              </span>
              <span
                className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shadow-sm"
                style={{
                  background: theme.IS_DARK ? 'rgba(0,116,114,0.15)' : 'rgba(0,116,114,0.08)',
                  borderColor: theme.IS_DARK ? 'rgba(0,116,114,0.3)' : 'rgba(0,116,114,0.2)',
                  color: ACCENT,
                }}
              >
                <Sparkles className="w-2.5 h-2.5" />
                {isAr ? 'مساعد دراسي' : 'Study assistant'}
              </span>
            </div>
            <div
              className="p-5 rounded-2xl border shadow-sm"
              style={{
                background: theme.SURFACE,
                borderColor: theme.BORDER,
              }}
            >
              <FormattedText text={msg.text} fg={theme.FG} theme={theme} />

              {/* If message generated a Quiz, render the Interactive Quiz Showcase */}
              {msg.createdQuiz && (
                <QuizShowcaseCard quiz={msg.createdQuiz} onStartQuiz={onStartQuiz} theme={theme} isAr={isAr} />
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-1.5 mt-2 px-1 flex-wrap">
              <button
                onClick={() => onCopy(msg)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = theme.HOVER)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                style={{ color: copiedMsgId === msg.id ? '#10B981' : theme.MUTED }}
                title="نسخ الرد"
                aria-label="نسخ الرد"
              >
                {copiedMsgId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMsgId === msg.id ? 'تم النسخ' : 'نسخ'}</span>
              </button>
              {onRegenerate && (
                <button
                  onClick={() => onRegenerate(msg)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = theme.HOVER)}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  style={{ color: theme.MUTED }}
                  title={isAr ? 'إعادة التوليد' : 'Regenerate'}
                  aria-label={isAr ? 'إعادة التوليد' : 'Regenerate'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isAr ? 'إعادة توليد' : 'Retry'}</span>
                </button>
              )}
              <button
                onClick={() => setFeedback(f => (f === 'liked' ? null : 'liked'))}
                className="p-1.5 rounded-lg transition-colors cursor-pointer"
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = theme.HOVER)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                style={{ color: feedback === 'liked' ? ACCENT : theme.MUTED }}
                title="مفيد"
                aria-label="مفيد"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setFeedback(f => (f === 'disliked' ? null : 'disliked'))}
                className="p-1.5 rounded-lg transition-colors cursor-pointer"
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = theme.HOVER)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                style={{ color: feedback === 'disliked' ? '#EF4444' : theme.MUTED }}
                title="غير مفيد"
                aria-label="غير مفيد"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MessageRow;
