import React from 'react';
import {
  SquarePen,
  PanelLeftClose,
  Search,
  X,
  Sparkles,
  Copy,
  Pencil,
  Trash2,
  HardDrive,
} from 'lucide-react';
import { AIChatConversation } from '../../lib/db';
import { CosmoPalette } from './CosmoPalette';
import { formatBytes } from '../../services/tempFileStorage';
import { formatChatCode } from '../../utils/chatCode';

export function groupLabel(conv: AIChatConversation): string {
  const d = new Date(conv.createdAt || 0);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return 'اليوم';
  if (diff < 172800000) return 'أمس';
  if (diff < 7 * 86400000) return 'آخر 7 أيام';
  return 'سابقاً';
}

export function CosmoSidebar({
  sidebarOpen,
  sidebarRef,
  theme,
  isAr,
  conversations,
  activeConversationId,
  convSearchQuery,
  renamingConvId,
  renameValue,
  tempStats,
  userName,
  userPhoto,
  userInitial,
  planName,
  isPremium,
  onStartNewChat,
  onCloseSidebar,
  onSearchChange,
  onSelectConversation,
  onStartRename,
  onRenameChange,
  onCommitRename,
  onCancelRename,
  onDeleteConversation,
  onCopyChatCode,
  onClearTempStorage,
}: {
  sidebarOpen: boolean;
  sidebarRef: React.RefObject<HTMLElement | null>;
  theme: CosmoPalette;
  isAr: boolean;
  conversations: AIChatConversation[];
  activeConversationId: string | null;
  convSearchQuery: string;
  renamingConvId: string | null;
  renameValue: string;
  tempStats: { count: number; totalBytes: number };
  userName?: string;
  userPhoto?: string;
  userInitial: string;
  planName: string;
  isPremium: boolean;
  onStartNewChat: () => void;
  onCloseSidebar: () => void;
  onSearchChange: (value: string) => void;
  onSelectConversation: (id: string) => void;
  onStartRename: (conv: AIChatConversation) => void;
  onRenameChange: (value: string) => void;
  onCommitRename: (id: string) => void;
  onCancelRename: () => void;
  onDeleteConversation: (id: string) => void;
  onCopyChatCode: (code: string) => void;
  onClearTempStorage: () => void;
}) {
  const convGroups = [...new Set(conversations.map(groupLabel))];

  return (
    <aside
      ref={sidebarRef}
      className="absolute md:relative inset-y-0 right-0 z-30 flex flex-shrink-0 flex-col overflow-hidden shadow-2xl md:shadow-none transition-all duration-300 border-l"
      style={{
        width: sidebarOpen ? '280px' : '0px',
        background: theme.SIDEBAR,
        borderColor: theme.BORDER_SOFT,
      }}
    >
      <div className="flex flex-col h-full w-[280px] p-3">
        {/* New Chat Button */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={onStartNewChat}
            className="flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all border shadow-xs cursor-pointer group"
            style={{
              background: theme.IS_DARK ? 'rgba(0,116,114,0.12)' : 'rgba(0,116,114,0.08)',
              borderColor: 'rgba(0,116,114,0.25)',
              color: theme.FG,
            }}
          >
            <div className="flex items-center gap-2.5">
              <SquarePen className="w-4 h-4 text-[#2AC3BB] group-hover:rotate-6 transition-transform" />
              <span>{isAr ? 'محادثة جديدة' : 'New chat'}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-normal opacity-60 bg-slate-800 text-slate-300">
              Ctrl+K
            </span>
          </button>
          <button
            onClick={onCloseSidebar}
            className="p-2 rounded-xl transition-colors md:hidden text-slate-400 hover:text-white"
            aria-label="Close sidebar"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
          <input
            value={convSearchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={isAr ? 'ابحث بالاسم أو كود المحادثة...' : 'Search by name or code...'}
            className="w-full pl-3 pr-8 py-2 rounded-xl text-xs outline-none border transition-colors focus:border-[#2AC3BB]/50"
            style={{
              background: theme.IS_DARK ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderColor: theme.BORDER,
              color: theme.FG,
            }}
            dir={isAr ? 'rtl' : 'ltr'}
          />
          {convSearchQuery && (
            <button
              onClick={() => onSearchChange('')}
              aria-label="مسح البحث"
              className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          {conversations.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-[#2AC3BB]/40" />
              <p className="text-xs font-medium" style={{ color: theme.MUTED }}>
                {convSearchQuery
                  ? isAr
                    ? 'لم يتم العثور على محادثات مطابقة'
                    : 'No matching chats'
                  : isAr
                  ? 'لا توجد محادثات سابقة'
                  : 'No past conversations'}
              </p>
            </div>
          ) : (
            convGroups.map(group => (
              <div key={group} className="space-y-1">
                <p className="text-[11px] font-bold px-2 py-1 text-slate-400/80 tracking-wide">{group}</p>
                {conversations
                  .filter(c => groupLabel(c) === group)
                  .map(c => {
                    const isActive = activeConversationId === c.id;
                    const code = formatChatCode(c.id);
                    return (
                      <div
                        key={c.id}
                        className="group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all cursor-pointer border"
                        style={{
                          background: isActive
                            ? theme.IS_DARK
                              ? 'rgba(0,116,114,0.18)'
                              : 'rgba(0,116,114,0.1)'
                            : 'transparent',
                          borderColor: isActive ? 'rgba(0,116,114,0.35)' : 'transparent',
                          color: isActive ? theme.FG : theme.MUTED,
                        }}
                        onClick={() => onSelectConversation(c.id)}
                      >
                        <div className="flex-1 min-w-0 pr-1">
                          {renamingConvId === c.id ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={e => onRenameChange(e.target.value)}
                              onBlur={() => onCommitRename(c.id)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') onCommitRename(c.id);
                                if (e.key === 'Escape') onCancelRename();
                              }}
                              className="w-full bg-transparent outline-none font-medium border-b border-[#2AC3BB]"
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <>
                              <p className="font-semibold truncate text-[13px]">{c.title}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px] text-[#2AC3BB]/70">
                                <span>#{code}</span>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="hidden group-hover:flex items-center gap-1 bg-slate-900/90 rounded-lg p-1 shadow-sm border border-slate-700">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onCopyChatCode(code);
                            }}
                            className="p-1 hover:text-[#2AC3BB]"
                            title="نسخ كود المحادثة"
                            aria-label="نسخ كود المحادثة"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onStartRename(c);
                            }}
                            className="p-1 hover:text-amber-300"
                            title="إعادة تسمية"
                            aria-label="إعادة تسمية"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onDeleteConversation(c.id);
                            }}
                            className="p-1 hover:text-rose-400"
                            title="حذف"
                            aria-label="حذف المحادثة"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="mt-auto pt-3 border-t space-y-2" style={{ borderColor: theme.BORDER_SOFT }}>
          <div
            className="p-2.5 rounded-xl border flex items-center justify-between text-[11px]"
            style={{
              background: theme.IS_DARK ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              borderColor: theme.BORDER_SOFT,
            }}
          >
            <div className="flex items-center gap-1.5 text-slate-400">
              <HardDrive className="w-3.5 h-3.5 text-[#2AC3BB]" />
              <span>
                الملفات المؤقتة: {tempStats.count} ({formatBytes(tempStats.totalBytes)})
              </span>
            </div>
            {tempStats.count > 0 && (
              <button
                onClick={onClearTempStorage}
                className="text-[10px] font-semibold text-rose-400 hover:underline cursor-pointer"
                title="مسح الملفات المؤقتة من الجهاز"
                aria-label="مسح الملفات المؤقتة"
              >
                مسح
              </button>
            )}
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl" style={{ background: theme.CARD }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[#007472] flex items-center justify-center text-white font-bold text-xs">
                {userPhoto ? (
                  <img src={userPhoto} alt={userName || ''} className="w-full h-full object-cover" />
                ) : (
                  userInitial
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: theme.FG }}>
                  {userName || (isAr ? 'طالب متميز' : 'Student')}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{planName || 'الخطة القياسية'}</p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#007472]/10 text-[#007472] dark:bg-[#2AC3BB]/10 dark:text-[#2AC3BB] border border-[#2AC3BB]/20">
              {isPremium ? 'VIP' : 'PRO'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default CosmoSidebar;
