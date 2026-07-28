import React, { useState, useEffect, useRef } from 'react';
import { getDirectMessages, sendDirectMessage, markMessagesAsRead } from '../lib/db';
import { MessageSquare, Send, Check, CheckCheck, Loader2, X, ChevronLeft, ArrowRight } from 'lucide-react';

interface HeaderMessagesProps {
  userId: string;
  userName: string;
  lang: 'ar' | 'en';
}

interface DBMessage {
  id?: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  text: string;
  createdAt: string;
  isRead: boolean;
}

interface Conversation {
  otherUserId: string;
  otherUserName: string;
  lastMessageText: string;
  lastMessageTime: string;
  messages: DBMessage[];
  unreadCount: number;
}

export default function HeaderMessages({ userId, userName, lang }: HeaderMessagesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isAr = lang === 'ar';
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Default admin recipient if user lists empty
  const defaultAdmin = {
    uid: 'admin-cosmo',
    name: isAr ? 'المساعد كوزمو' : 'Assistant Cosmo',
    role: isAr ? 'المساعد الذكي' : 'AI Assistant'
  };

  // Subscribe to real-time messages where current user is sender or receiver
  useEffect(() => {
    if (!userId) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        const rawMsgs = await getDirectMessages(userId);
        
        // Sort messages in-memory by createdAt ascending
        const sorted = [...rawMsgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        // Group into conversations by otherUserId
        const groupMap: Record<string, DBMessage[]> = {};
        sorted.forEach((msg) => {
          const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
          if (!groupMap[otherId]) {
            groupMap[otherId] = [];
          }
          groupMap[otherId].push(msg);
        });

        const list: Conversation[] = Object.keys(groupMap).map((otherId) => {
          const msgs = groupMap[otherId];
          const lastMsg = msgs[msgs.length - 1];
          // Discover the other user name dynamically
          let otherName = isAr ? 'طالب غامض' : 'Mysterious Scholar';
          const firstReceived = msgs.find(m => m.senderId === otherId);
          const firstSent = msgs.find(m => m.receiverId === otherId);
          if (firstReceived) {
            otherName = firstReceived.senderName;
          } else if (firstSent) {
            otherName = firstSent.receiverName;
          }

          const unreadCount = msgs.filter(m => m.receiverId === userId && !m.isRead).length;

          return {
            otherUserId: otherId,
            otherUserName: otherName,
            lastMessageText: lastMsg.text,
            lastMessageTime: lastMsg.createdAt,
            messages: msgs,
            unreadCount
          };
        });

        // Sort conversations by last message time descending
        list.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

        setConversations(list);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching conversations from Postgres REST endpoint:', err);
        setIsLoading(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [userId, isAr]);

  // Handle scroll to bottom of active conversation
  useEffect(() => {
    if (activePartnerId && chatEndRef.current) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    }
  }, [activePartnerId, conversations]);

  // Mark messages from active partner as read
  useEffect(() => {
    if (!isOpen || !activePartnerId || !userId) return;

    const currentConv = conversations.find(c => c.otherUserId === activePartnerId);
    if (!currentConv || currentConv.unreadCount === 0) return;

    const markAsRead = async () => {
      try {
        await markMessagesAsRead(userId, activePartnerId);
      } catch (err) {
        console.error('Error marking messages as read:', err);
      }
    };

    markAsRead();
  }, [isOpen, activePartnerId, conversations, userId]);

  const activeConv = conversations.find(c => c.otherUserId === activePartnerId);
  const totalUnreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activePartnerId || !userId || isSending) return;

    setIsSending(true);
    // Discover partner name
    let partnerName = activeConv?.otherUserName || defaultAdmin.name;
    if (activePartnerId === defaultAdmin.uid) {
      partnerName = defaultAdmin.name;
    }

    try {
      const senderNameText = userName || (isAr ? 'طالب منسق' : 'Scholar Student');
      const textToPost = replyText.trim();
      
      const sentMsg = await sendDirectMessage(
        userId,
        senderNameText,
        activePartnerId,
        partnerName,
        textToPost
      );

      if (sentMsg) {
        const updatedConvMsgs = activeConv ? [...activeConv.messages, sentMsg] : [sentMsg];
        const updatedConversations = conversations.map(c => {
          if (c.otherUserId === activePartnerId) {
            return {
              ...c,
              lastMessageText: textToPost,
              lastMessageTime: new Date().toISOString(),
              messages: updatedConvMsgs
            };
          }
          return c;
        });
        setConversations(updatedConversations);
      }

      setReplyText('');
    } catch (err) {
      console.error('Error sending message from top widget:', err);
    } finally {
      setIsSending(false);
    }
  };

  const startAdminChat = () => {
    setActivePartnerId(defaultAdmin.uid);
  };

  return (
    <div className="relative">
      {/* Messages Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-8 sm:w-10 h-8 sm:h-10 rounded-2xl transition-all duration-200 cursor-pointer hover:scale-105 select-none relative shadow-sm border border-slate-200/50 dark:border-slate-700/60 ${isOpen ? 'bg-primary border-primary text-white' : 'bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
        title={isAr ? 'صندوق الرسائل والردود السريعة' : 'Quick Inbox'}
      >
        <MessageSquare className={`w-4.5 h-4.5 shrink-0 ${isOpen ? 'text-white' : 'text-primary'}`} />
        {totalUnreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 rtl:right-auto rtl:-left-1.5 flex h-4.5 w-4.5 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white border-2 border-white dark:border-slate-900 shadow-md animate-bounce ring-2 ring-rose-500/20">
            {totalUnreadCount}
          </span>
        )}
      </button>

      {/* Popover Inbox Modal */}
      
        {isOpen && (
          <>
            {/* Overlay to dim under element */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            
            <div
              
              
              
              className={`fixed top-[70px] left-4 right-4 sm:absolute sm:top-full sm:mt-4 sm:left-auto sm:right-0 ltr:sm:right-0 rtl:sm:right-auto rtl:sm:left-0 w-auto sm:w-[400px] max-w-none bg-white dark:bg-[#0c101d] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] z-50 overflow-hidden font-sans origin-top ring-1 ring-black/5 dark:ring-white/5`}
              dir={isAr ? 'rtl' : 'ltr'}
            >
              {/* Decorative top border */}
              <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary-light to-primary" />
              
              {/* Header block */}
              <div className="bg-slate-50/80 dark:bg-[#111726]/80 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-2">
                  {activePartnerId && (
                    <button 
                      onClick={() => setActivePartnerId(null)}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                    >
                      <ArrowRight className="w-4 h-4 rotate-0 rtl:rotate-180" />
                    </button>
                  )}
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span>{isAr ? 'الرسائل والمحادثات المباشرة' : 'Direct Messages'}</span>
                    {totalUnreadCount > 0 && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                        {isAr ? `${totalUnreadCount} غير مقروء` : `${totalUnreadCount} unread`}
                      </span>
                    )}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body lists */}
              <div className="h-96 flex flex-col justify-between bg-slate-50/20 dark:bg-[#0c101d]">
                {isLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs font-medium space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span>{isAr ? 'المزامنة مع قاعدة البيانات السحابية...' : 'Syncing inbox...'}</span>
                  </div>
                ) : activePartnerId ? (
                  /* Conversations Chat Area */
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Chatting Header Summary detail */}
                    <div className="px-4 py-2 bg-slate-100/50 dark:bg-[#121827] border-b border-slate-200/40 dark:border-slate-800/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 flex justify-between items-center shrink-0">
                      <span>{activePartnerId === defaultAdmin.uid ? defaultAdmin.name : activeConv?.otherUserName}</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded">
                        {activePartnerId === defaultAdmin.uid ? (isAr ? 'الدعم الفني والتعليمي' : 'Support/') : (isAr ? 'تواصل نشط' : 'Active')}
                      </span>
                    </div>

                    {/* Messages Scroll Panel */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none">
                      {activeConv && activeConv.messages.length > 0 ? (
                        activeConv.messages.map((m, idx) => {
                          const isMe = m.senderId === userId;
                          return (
                            <div 
                               
                              className={`flex flex-col max-w-[82%] ${isMe ? 'mr-auto items-end text-left' : 'ml-auto items-start text-right'}`}
                            >
                              <div className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed ${
                                isMe 
                                  ? 'bg-primary text-white rounded-br-none shadow-sm shadow-primary/10' 
                                  : 'bg-white dark:bg-[#141b2e] text-slate-800 dark:text-slate-200 border border-slate-150 dark:border-slate-800 rounded-bl-none'
                              }`}>
                                <p className="whitespace-pre-wrap">{m.text}</p>
                              </div>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-mono flex items-center gap-1 select-none">
                                {new Date(m.createdAt).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })}
                                {isMe && (
                                  m.isRead ? <CheckCheck className="w-3 h-3 text-emerald-500" /> : <Check className="w-3 h-3 text-slate-400" />
                                )}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2">
                          <span className="text-2xl animate-bounce">🎓✨</span>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold max-w-[80%] leading-relaxed">
                            {isAr 
                              ? 'اكتب رسالتك بالأسفل لطلب الدعم والمساعدة والتحدث مع المساعد الذكي كوزمو!' 
                              : 'Type your message below for promo codes or real-time support from Cosmo AI Assistant!'
                            }
                          </p>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Text Input Send form */}
                    <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 bg-white dark:bg-[#0c101d] shrink-0">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={isAr ? 'اطلب أكواد الخصم الترويجية، أو ارسل استفسارك...' : 'Request promo codes, or send inquiry...'}
                        className="flex-1 bg-slate-50 dark:bg-[#131929] border border-slate-200 dark:border-slate-800/85 outline-none text-xs rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-white leading-relaxed placeholder-slate-400 dark:placeholder-slate-500"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={!replyText.trim() || isSending}
                        className="p-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:hover:bg-primary text-white cursor-pointer select-none shadow-md shadow-primary/20 aspect-square flex items-center justify-center shrink-0"
                      >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rtl:rotate-180" />}
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Conversations List Area */
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
                    {conversations.length > 0 ? (
                      conversations.map((conv) => (
                        <button
                          
                          onClick={() => setActivePartnerId(conv.otherUserId)}
                          className="w-full text-right flex items-start gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-[#111726]/40 transition-colors border-0 shrink-0 cursor-pointer"
                        >
                          {/* Round Avatar indicator */}
                          <div className="w-9.5 h-9.5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20 relative shrink-0">
                            {conv.otherUserName.substring(0, 2)}
                            {conv.unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center bg-rose-500 text-[10px] font-black leading-none text-white rounded-full border border-white dark:border-slate-900 shadow-md">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>

                          {/* Detail fields */}
                          <div className="flex-1 min-w-0 flex flex-col items-stretch text-right space-y-1" style={{ textAlign: isAr ? 'right' : 'left' }}>
                            <div className="flex justify-between items-center">
                              <span className="text-[11.5px] font-black text-slate-800 dark:text-slate-100 truncate pr-1">
                                {conv.otherUserName}
                              </span>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 shrink-0 font-mono">
                                {new Date(conv.lastMessageTime).toLocaleDateString(lang, { month: 'numeric', day: 'numeric' })}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate font-semibold leading-normal">
                              {conv.lastMessageText}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      /* Empty Inbox State placeholder - Show Quick trigger to initiate message with support teacher */
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                        <div className="p-4 rounded-full bg-primary/10 border border-primary/10">
                          <MessageSquare className="w-8 h-8 text-primary animate-pulse" />
                        </div>
                        <div className="space-y-1.5 max-w-[85%]">
                          <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-100">
                            {isAr ? 'صندوق رسائل المنصة فارغ' : 'Your Inbox is empty'}
                          </h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">
                            {isAr 
                              ? 'تواصل مع المساعد الذكي كوزمو لطلب الدعم الفني أو الاستفسارات الأكاديمية!' 
                              : 'Contact Cosmo AI directly for promo codes or academic inquiries!'
                            }
                          </p>
                        </div>
                        <button
                          onClick={startAdminChat}
                          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-[11px] font-black transition-all hover:scale-103 cursor-pointer shadow-md shadow-primary/20 flex items-center gap-1.5 select-none"
                        >
                          <Send className="w-3.5 h-3.5 rotate-0 rtl:rotate-180" />
                          <span>{isAr ? 'مراسلة كوزمو فوراً 💬' : 'Contact Cosmo 💬'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      
    </div>
  );
}
