import React from 'react';
import { BarChart3, BookOpen, BrainCircuit, Command, GraduationCap, LayoutDashboard, Search, Settings, UserRound, X } from 'lucide-react';

type CommandPaletteProps = {
  isOpen: boolean;
  lang: 'ar' | 'en';
  onOpen: () => void;
  onClose: () => void;
  onNavigate: (tab: string) => void;
};

type PaletteCommand = { id: string; tab: string; icon: React.ComponentType<{ className?: string }>; ar: string; en: string; hint: string };

const COMMANDS: PaletteCommand[] = [
  { id: 'home', tab: 'landing', icon: LayoutDashboard, ar: 'لوحة البداية', en: 'Dashboard', hint: 'G H' },
  { id: 'create', tab: 'create', icon: BrainCircuit, ar: 'إنشاء اختبار بالذكاء الاصطناعي', en: 'Create an AI quiz', hint: 'G C' },
  { id: 'quizzes', tab: 'my-quizzes', icon: BookOpen, ar: 'اختباراتي', en: 'My quizzes', hint: 'G Q' },
  { id: 'analytics', tab: 'analytics', icon: BarChart3, ar: 'التقدم والتحليلات', en: 'Progress & analytics', hint: 'G A' },
  { id: 'profile', tab: 'profile', icon: UserRound, ar: 'الملف الشخصي', en: 'Profile', hint: 'G P' },
  { id: 'settings', tab: 'settings', icon: Settings, ar: 'الإعدادات', en: 'Settings', hint: 'G S' },
];

export default function CommandPalette({ isOpen, lang, onOpen, onClose, onNavigate }: CommandPaletteProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const isAr = lang === 'ar';
  const filtered = React.useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return COMMANDS;
    return COMMANDS.filter((command) => `${command.ar} ${command.en}`.toLocaleLowerCase().includes(needle));
  }, [query]);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    setQuery('');
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const select = (command: PaletteCommand | undefined) => {
    if (!command) return;
    onNavigate(command.tab);
    onClose();
  };

  if (!isOpen) return <button type="button" onClick={onOpen} className="fixed bottom-5 end-5 z-[11000] inline-flex min-h-11 items-center gap-2 rounded-2xl border border-violet-200 bg-white/95 px-3 text-xs font-black text-violet-700 shadow-lg shadow-violet-950/10 backdrop-blur transition hover:-translate-y-0.5 hover:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-violet-800/60 dark:bg-slate-950/95 dark:text-violet-200" aria-label={isAr ? 'فتح التنقل السريع' : 'Open quick navigation'}><Command className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">{isAr ? 'تنقل سريع' : 'Quick nav'}</span><kbd className="hidden rounded border border-current/20 px-1.5 py-0.5 text-[9px] sm:inline">⌘K</kbd></button>;
  return (
    <div className="fixed inset-0 z-[12000] flex items-start justify-center bg-slate-950/45 px-4 pt-[12vh] backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-xl overflow-hidden rounded-[1.5rem] border border-violet-200 bg-white shadow-2xl shadow-violet-950/25 dark:border-violet-800/50 dark:bg-slate-950" dir={isAr ? 'rtl' : 'ltr'} role="dialog" aria-modal="true" aria-labelledby="command-palette-title">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
          <Search className="h-5 w-5 shrink-0 text-violet-500" aria-hidden="true" />
          <label id="command-palette-title" htmlFor="command-palette-input" className="sr-only">{isAr ? 'البحث في الأوامر' : 'Search commands'}</label>
          <input ref={inputRef} id="command-palette-input" value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={(event) => {
            if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0))); }
            if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
            if (event.key === 'Enter') { event.preventDefault(); select(filtered[activeIndex]); }
          }} placeholder={isAr ? 'إلى أين تريد الذهاب؟' : 'Where do you want to go?'} className="h-14 min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white" autoComplete="off" />
          <kbd className="hidden rounded-md border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-500 sm:inline-flex">ESC</kbd>
          <button type="button" onClick={onClose} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:hover:bg-slate-800" aria-label={isAr ? 'إغلاق' : 'Close'}><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[min(420px,55dvh)] overflow-y-auto p-2" role="listbox" aria-label={isAr ? 'الأوامر المتاحة' : 'Available commands'}>
          {filtered.length ? filtered.map((command, index) => {
            const Icon = command.icon;
            const active = index === activeIndex;
            return <button key={command.id} type="button" role="option" aria-selected={active} onMouseEnter={() => setActiveIndex(index)} onClick={() => select(command)} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-start transition ${active ? 'bg-violet-50 text-violet-900 dark:bg-violet-500/15 dark:text-violet-100' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}><Icon className="h-4 w-4" aria-hidden="true" /></span><span className="min-w-0 flex-1 text-sm font-black">{isAr ? command.ar : command.en}</span><kbd className="hidden text-[10px] font-black text-slate-400 sm:inline">{command.hint}</kbd></button>;
          }) : <div className="px-4 py-10 text-center text-sm font-bold text-slate-500"><GraduationCap className="mx-auto mb-2 h-7 w-7 text-violet-400" />{isAr ? 'لا توجد أوامر مطابقة.' : 'No matching commands.'}</div>}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-[10px] font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400"><span><Command className="mr-1 inline h-3 w-3" aria-hidden="true" />{isAr ? 'اختصار سريع' : 'Quick access'}</span><span>{isAr ? '↑↓ للتنقل · Enter للاختيار' : '↑↓ navigate · Enter select'}</span></div>
      </div>
    </div>
  );
}
