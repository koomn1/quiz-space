import React, { useState, useEffect, useRef } from 'react';
import { 
  getAllProfiles, 
  getDirectMessages, 
  sendDirectMessage, 
  markMessagesAsRead,
  createNotification 
} from '../lib/db';
import { MessageSquare, Send, Search, Sparkles, User, RefreshCw, Star, ArrowRight, BellRing } from 'lucide-react';
import { TelegramBadge } from './ProfileStatsView';
import { playChimeSound } from './ExtraFeatures';
import { UserBadge } from './UserBadge';

interface MessageInboxProps {
  lang: 'ar' | 'en';
  userId: string;
  userName: string;
}

interface Chat {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  text: string;
  createdAt: string;
  isRead: boolean;
}

interface Member {
  uid: string;
  name: string;
  email?: string;
  bio?: string;
  badgeSymbol?: string;
  badgeColor?: string;
  isPremium?: boolean;
}

export default function MessageInbox({ lang, userId, userName }: MessageInboxProps) {
  const isAr = lang === 'ar';
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<Member | null>(null);
  const [messages, setMessages] = useState<Chat[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [lastMessageTimes, setLastMessageTimes] = useState<Record<string, string>>({});
  const [unreadCountsBySender, setUnreadCountsBySender] = useState<Record<string, number>>({});

  // Fetch registered site members to start/view chats
  useEffect(() => {
    async function fetchMembers() {
      try {
        const profiles = await getAllProfiles();
        const usersList: Member[] = [];
        
        profiles.forEach((p) => {
          if (p.uid && p.uid !== userId) {
            usersList.push({
              uid: p.uid,
              name: p.name || (isAr ? 'عضو أكاديمي' : 'Scholar'),
              email: p.email || '',
              bio: p.bio || '',
              badgeSymbol: p.badgeSymbol || '',
              badgeColor: p.badgeColor || '',
              isPremium: p.isPremium || false
            });
          }
        });

        // Add default admin/teacher if empty
        if (usersList.length === 0) {
          usersList.push({
            uid: 'admin-cosmo',
            name: 'المساعد كوزمو',
            bio: 'المساعد الذكي لكافة استفساراتك',
            badgeSymbol: '✔',
            badgeColor: 'text-sky-400',
            isPremium: true
          });
        }

        setMembers(usersList);
        setFilteredMembers(usersList);
      } catch (err) {
        console.error('Failed to load portal members:', err);
      } finally {
        setIsLoadingMembers(false);
      }
    }

    if (userId) {
      fetchMembers();
    }
  }, [userId, isAr]);

  // Poll in-memory messages metrics to establish unread badges and order
  useEffect(() => {
    if (!userId) return;

    const computeMetrics = async () => {
      try {
        const rawMsgs = await getDirectMessages(userId);
        const times: Record<string, string> = {};
        const unreads: Record<string, number> = {};

        rawMsgs.forEach((msg) => {
          const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;

          // Keep the latest message timestamp
          if (!times[otherUserId] || new Date(msg.createdAt).getTime() > new Date(times[otherUserId]).getTime()) {
            times[otherUserId] = msg.createdAt;
          }

          // Count unread messages received from this sender
          if (msg.receiverId === userId && !msg.isRead) {
            unreads[msg.senderId] = (unreads[msg.senderId] || 0) + 1;
          }
        });

        setLastMessageTimes(times);
        setUnreadCountsBySender(unreads);
      } catch (err) {
        console.warn('Error fetching badges in Inbox:', err);
      }
    };

    computeMetrics();
    const interval = setInterval(computeMetrics, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  // Filter and sort members list in real-time:
  // 1. Members with active unread counts float highest
  // 2. Members with most recent message active exchange float higher
  // 3. Fallback to normal alphabetical sorting
  useEffect(() => {
    let sorted = [...members];
    sorted.sort((a, b) => {
      const aUnread = unreadCountsBySender[a.uid] || 0;
      const bUnread = unreadCountsBySender[b.uid] || 0;

      if (aUnread !== bUnread) {
        return bUnread - aUnread; // Floats unread highest
      }

      const aTime = lastMessageTimes[a.uid] ? new Date(lastMessageTimes[a.uid]).getTime() : 0;
      const bTime = lastMessageTimes[b.uid] ? new Date(lastMessageTimes[b.uid]).getTime() : 0;

      if (aTime !== bTime) {
        return bTime - aTime; // Floats most recent chat highest
      }

      return a.name.localeCompare(b.name);
    });

    if (!searchQuery.trim()) {
      setFilteredMembers(sorted);
    } else {
      const q = searchQuery.toLowerCase().trim();
      setFilteredMembers(
        sorted.filter(m => 
          m.name.toLowerCase().includes(q) || 
          (m.email && m.email.toLowerCase().includes(q))
        )
      );
    }
  }, [searchQuery, members, lastMessageTimes, unreadCountsBySender]);

  // Live Chat listener (polling for active conversation)
  useEffect(() => {
    if (!userId || !selectedRecipient) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);

    const loadConversation = async () => {
      try {
        const rawMsgs = await getDirectMessages(userId);
        const filtered = rawMsgs.filter(m => 
          (m.senderId === userId && m.receiverId === selectedRecipient.uid) ||
          (m.senderId === selectedRecipient.uid && m.receiverId === userId)
        );

        // Sort messages by creation date ascending
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        setMessages(filtered);
        setIsLoadingMessages(false);

        // Mark incoming messages as read instantly
        const unreads = filtered.filter(m => m.receiverId === userId && m.senderId === selectedRecipient.uid && !m.isRead);
        if (unreads.length > 0) {
          await markMessagesAsRead(userId, selectedRecipient.uid);
        }
      } catch (err) {
        console.error('Error listing private chats:', err);
        setIsLoadingMessages(false);
      }
    };

    loadConversation();
    const interval = setInterval(loadConversation, 8000);
    return () => clearInterval(interval);
  }, [userId, selectedRecipient]);

  // Smooth scroll to bottom when messages list updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send Direct Message
  const handleSendMessage = async () => {
    if (!inputText.trim() || !userId || !selectedRecipient) return;
    const msgText = inputText.trim();
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    playChimeSound('click');

    try {
      const senderNameText = userName || (isAr ? 'طالب متميز' : 'Bright Scholar');
      const sentMsg = await sendDirectMessage(
        userId,
        senderNameText,
        selectedRecipient.uid,
        selectedRecipient.name,
        msgText
      );

      if (sentMsg) {
        setMessages(prev => [...prev, sentMsg]);
      }

      await createNotification(
        isAr ? 'رسالة مباشرة جديدة 📩' : 'New Direct Message 📩',
        isAr 
          ? `أرسل لك ${userName} رسالة: "${msgText.substring(0, 50)}${msgText.length > 50 ? '...' : ''}"`
          : `${userName} sent you a message: "${msgText.substring(0, 50)}${msgText.length > 50 ? '...' : ''}"`,
        userName,
        'direct_message'
      );
    } catch (e) {
      console.error('Failed to dispatch direct message:', e);
    }
  };

  return (
    <div className="space-y-6" style={{ textAlign: isAr ? 'right' : 'left' }}>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>📩</span>
          <span>{isAr ? 'صندوق الرسائل والمحادثات المباشرة' : 'Direct Messages & Inbox'}</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {isAr ? 'تواصل مباشرة مع زملائك ومعلمي المنصة لتبادل الحلول ومناقشة الاختبارات.' : 'Connect directly with classmates and teachers to exchange hints and discuss academic quizzes.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-0 bg-[#080c14] border border-slate-800/60 rounded-3xl overflow-hidden h-[calc(100dvh-140px)] min-h-[550px] shadow-2xl">
        
        {/* Chat Sidebar / User Search (4 Cols) */}
        <div className="md:col-span-4 border-b md:border-b-0 md:border-l border-slate-800/60 p-5 space-y-4 flex flex-col bg-[#0b0f19] h-full overflow-hidden">
          <div className="relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث عن زميل أو معلم...' : 'Search members...'}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2.5 pl-4 pr-10 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-primary/50 transition-all text-right"
              style={{ direction: isAr ? 'rtl' : 'ltr' }}
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute top-3 right-3" />
          </div>

          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right pr-1">
            {isAr ? 'الزملاء والمعلمون المتاحون' : 'AVAILABLE CONTACTS'}
          </h4>

          <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
            {isLoadingMembers ? (
              <div className="flex items-center justify-center p-8 text-slate-500 gap-2 flex-row-reverse text-xs">
                <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                <span>{isAr ? 'جاري تحميل قائمة الأعضاء...' : 'Loading portal members...'}</span>
              </div>
            ) : filteredMembers.length === 0 ? (
              <p className="text-[11px] text-slate-500 text-center py-12 font-medium">
                {isAr ? 'لم يتم العثور على أعضاء.' : 'No active members found.'}
              </p>
            ) : (
              filteredMembers.map((member) => (
                <button
                  key={member.uid}
                  onClick={() => setSelectedRecipient(member)}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer border ${
                    selectedRecipient?.uid === member.uid 
                      ? 'bg-primary/10 border-primary/30 text-white font-bold' 
                      : 'hover:bg-slate-800/30 bg-transparent border-transparent text-slate-300'
                  }`}
                  style={{ direction: isAr ? 'rtl' : 'ltr' }}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center text-xs font-bold uppercase shrink-0 text-slate-200">
                    {member.name.substring(0, 1)}
                  </div>
                  <div className="flex-1 text-right overflow-hidden">
                    <div className="flex items-center gap-1.5 flex-row-reverse justify-end">
                      <span className="truncate text-xs font-semibold">{member.name}</span>
                      <UserBadge 
                        tier={
                          member.uid === 'admin-cosmo' || member.badgeSymbol === '🤖' ? 'enterprise' :
                          member.badgeSymbol === '✔' ? 'pro' :
                          member.isPremium ? 'premium' : 'free'
                        } 
                        size="sm" 
                        showTooltip={false} 
                      />
                    </div>
                    <p className={`text-[9px] truncate mt-0.5 ${selectedRecipient?.uid === member.uid ? 'text-indigo-200' : 'text-slate-500'} leading-snug`}>
                      {member.bio || (isAr ? 'طالب متميز في أكاديمية كويز' : 'Enthusiastic Quiz Space member')}
                    </p>
                  </div>
                  {unreadCountsBySender[member.uid] > 0 && selectedRecipient?.uid !== member.uid && (
                    <span className="bg-red-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full animate-pulse shrink-0">
                      {unreadCountsBySender[member.uid]}
                    </span>
                  )}
                  {member.isPremium && (
                    <span className="text-[8px] bg-amber-400/10 text-amber-300 border border-amber-400/20 px-1 py-0.5 rounded-md font-bold self-start mt-0.5">VIP</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Window (8 Cols) */}
        <div className="md:col-span-8 flex flex-col bg-[#060911] h-full overflow-hidden relative">
          {selectedRecipient ? (
            <div className="flex flex-col h-full relative">
              {/* Header */}
              <header className="shrink-0 p-4 border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md flex items-center justify-between z-10" dir={isAr ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-3 text-right">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-white uppercase">
                    {selectedRecipient.name.substring(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-white">{selectedRecipient.name}</h3>
                      <UserBadge 
                        tier={
                          selectedRecipient.uid === 'admin-cosmo' || selectedRecipient.badgeSymbol === '🤖' ? 'enterprise' :
                          selectedRecipient.badgeSymbol === '✔' ? 'pro' :
                          selectedRecipient.isPremium ? 'premium' : 'free'
                        } 
                        size="sm" 
                        showTooltip={false} 
                      />
                    </div>
                    <p className="text-[9.5px] text-slate-400 mt-0.5">{selectedRecipient.bio || (isAr ? 'متصل ومستعد للمناقشة' : 'Available to chat')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span className="text-[10px] text-slate-400">{isAr ? 'نشط الآن' : 'Active'}</span>
                </div>
              </header>

              {/* Chat history */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 scrollbar-thin">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full py-20 text-slate-500 gap-1.5 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    <span>{isAr ? 'جاري تحميل الرسائل...' : 'Loading messages...'}</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 select-none">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400">{isAr ? 'اكتب أول رسالة!' : 'Say hello!'}</p>
                      <p className="text-[10px] text-slate-500">{isAr ? 'أرسل رسالة للبدء في تبادل النصائح والأفكار.' : 'Send a message to start sharing hints.'}</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.senderId === userId;
                    return (
                      <div 
                        key={msg.id}
                        className={`flex gap-3 sm:gap-4 w-full ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isOwn && (
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-800 border border-slate-700/50 text-slate-300 shadow-xs text-xs font-bold uppercase">
                            {selectedRecipient.name.substring(0, 1)}
                          </div>
                        )}

                        <div className={`flex flex-col gap-1 ${isOwn ? 'max-w-[75%]' : 'flex-1'}`}>
                          {isOwn ? (
                            <div 
                              className="bg-indigo-600 dark:bg-indigo-900 text-white px-4 py-2.5 rounded-2xl text-[14px] sm:text-[15px] leading-[1.7]"
                              style={{ textAlign: isAr ? 'right' : 'left' }}
                            >
                              <p className="whitespace-pre-line">{msg.text}</p>
                            </div>
                          ) : (
                            <div className="text-right max-w-none flex flex-col gap-2" style={{ textAlign: isAr ? 'right' : 'left' }}>
                              <p className="text-[14px] sm:text-[15px] leading-[1.7] text-slate-200 whitespace-pre-line">
                                {msg.text}
                              </p>
                            </div>
                          )}

                          <p className={`text-[9px] text-slate-400 dark:text-slate-500 font-bold px-1.5 ${isOwn ? 'text-left' : 'text-right'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        {isOwn && (
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 bg-indigo-950/60 border border-indigo-900/50 shadow-xs text-xs">
                            👤
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="sticky bottom-0 z-20 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-[#060911] via-[#060911]/95 to-transparent shrink-0"
              >
                <div className="max-w-3xl mx-auto flex items-end gap-2 bg-slate-900 border border-slate-800 rounded-3xl shadow-lg px-2 py-2 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={isAr ? 'اكتب رسالتك المباشرة هنا...' : 'Type your message here...'}
                    className="flex-1 resize-none bg-transparent outline-none text-sm py-2 max-h-40 leading-relaxed text-white placeholder-slate-500"
                    style={{ direction: isAr ? 'rtl' : 'ltr' }}
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="p-2.5 rounded-full bg-primary hover:bg-primary-hover disabled:bg-slate-800 disabled:text-slate-600 text-white shrink-0 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 select-none">
              <div className="w-12 h-12 rounded-xl bg-slate-900/60 border border-slate-800/60 flex items-center justify-center text-slate-400">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h3 className="text-xs font-bold text-white">{isAr ? 'المحادثات المباشرة الآمنة' : 'Secure Direct Conversations'}</h3>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {isAr ? 'حدد أي مستخدم من القائمة الجانبية لبدء التراسل المباشر ومناقشة تفاصيل الاختبارات والواجبات.' : 'Select any active scholar from the left sidebar to start exchanging direct answers, hints or questions.'}
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
