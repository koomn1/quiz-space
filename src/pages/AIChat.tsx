import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { askAIStream } from '../services/aiWorkerClient';
import { getAIChatHistory, saveAIChatMessage, getAIChatConversations, createAIChatConversation, renameAIChatConversation, deleteAIChatConversation, AIChatConversation } from '../lib/db';
import { Image as ImageIcon, Send, Trash2, Sparkles, Brain, Camera, X, Info, Copy, Check, Menu, Plus, Search, Pencil, MessageSquare, History, Settings, MoreVertical } from 'lucide-react';
import ThreeDIcon from '../components/ThreeDIcon';
import CosmoOrb from '../components/CosmoOrb';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  image?: string;
  timestamp: string;
}

interface AIChatProps {
  lang: 'ar' | 'en';
  isPremium: boolean;
  planName: string;
  userId?: string;
  userName?: string;
  userPhoto?: string;
  defaultAvatar?: string;
  onUpgradeClick?: () => void;
  onOpenAuthModal?: (mode: 'login' | 'register') => void;
}

export default function AIChat({ lang, isPremium, planName, userId, userName, userPhoto, defaultAvatar, onUpgradeClick, onOpenAuthModal }: AIChatProps) {
  const isAr = lang === 'ar';
  const FALLBACK_AVATAR = defaultAvatar || './avatars/boy-1.png';
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  
  // Sidebar & Conversations
  const [conversations, setConversations] = useState<AIChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [convSearchQuery, setConvSearchQuery] = useState('');
  const [renamingConvId, setRenamingConvId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const welcomeMessage = (): Message => ({
    id: 'welcome',
    role: 'assistant',
    text: isAr
      ? `مرحباً بك! أنا **كوزمو (Cosmo AI)**، مساعدك الذكي المتطور. كيف يمكنني مساعدتك اليوم؟\n\n💡 يمكنك سؤالي عن أي شيء، أو إرسال صورة لمسألة صعبة وسأقوم بتحليلها لك فوراً.`
      : `Welcome! I am **Cosmo AI**, your advanced smart assistant. How can I help you today?\n\n💡 You can ask me anything, or send a picture of a difficult problem and I will analyze it for you instantly.`,
    timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  });

  // Load conversations
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const list = await getAIChatConversations(userId);
      setConversations(list);
      if (list.length > 0 && !activeConversationId) {
        setActiveConversationId(list[0].id);
      }
    })();
  }, [userId]);

  // Load messages for active conversation
  useEffect(() => {
    if (!userId || !activeConversationId) {
      setMessages([welcomeMessage()]);
      setHistoryLoaded(true);
      return;
    }

    (async () => {
      setHistoryLoaded(false);
      const history = await getAIChatHistory(userId, activeConversationId);
      if (history.length > 0) {
        setMessages(history.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          text: m.text,
          timestamp: new Date(m.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        })));
      } else {
        setMessages([welcomeMessage()]);
      }
      setHistoryLoaded(true);
    })();
  }, [activeConversationId, userId]);

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text && !selectedImage) return;
    if (isAnalyzing) return;

    const userMsgId = Date.now().toString();
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      text: text || (isAr ? 'صورة مرفقة' : 'Attached image'),
      image: selectedImage || undefined,
      timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSelectedImage(null);
    setIsAnalyzing(true);

    let currentConvId = activeConversationId;
    if (!currentConvId && userId) {
      const newConv = await createAIChatConversation(userId, text.slice(0, 30) || (isAr ? 'محادثة جديدة' : 'New Chat'));
      currentConvId = newConv.id;
      setActiveConversationId(currentConvId);
      setConversations(prev => [newConv, ...prev]);
    }

    if (userId && currentConvId) {
      await saveAIChatMessage(userId, 'user', userMsg.text, !!selectedImage, currentConvId);
    }

    // AI Response logic
    try {
      const aiMsgId = (Date.now() + 1).toString();
      let fullText = '';
      
      await askAIStream(
        text,
        messages.slice(-6).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
        (chunk) => {
          fullText += chunk;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.id === aiMsgId) {
              return [...prev.slice(0, -1), { ...last, text: fullText }];
            }
            return [...prev, { id: aiMsgId, role: 'assistant', text: fullText, timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) }];
          });
        },
        selectedImage || undefined
      );

      if (userId && currentConvId) {
        await saveAIChatMessage(userId, 'cosmo', fullText, false, currentConvId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([welcomeMessage()]);
    setIsSidebarOpen(false);
  };

  useGSAP(() => {
    gsap.from(".chat-container", { opacity: 0, y: 20, duration: 0.5, ease: 'power2.out' });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="flex h-[calc(100vh-80px)] w-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
      {/* Sidebar - Desktop */}
      <div className={`hidden md:flex flex-col w-72 bg-white dark:bg-[#1e293b] border-r border-slate-200 dark:border-slate-800 transition-all duration-300`}>
        <div className="p-4">
          <button 
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95"
          >
            <Plus size={18} />
            {isAr ? 'محادثة جديدة' : 'New Chat'}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
          <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'المحادثات الأخيرة' : 'Recent Chats'}
          </div>
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveConversationId(conv.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeConversationId === conv.id ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
            >
              <MessageSquare size={16} />
              <span className="flex-1 text-sm text-right truncate font-medium">{conv.title}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
              {planName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{planName}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{isAr ? 'عضو مميز' : 'Premium Member'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0f172a]">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500"><Menu size={20} /></button>
            </div>
            <div className="w-10 h-10 flex items-center justify-center">
              <CosmoOrb size={32} state={isAnalyzing ? 'thinking' : 'idle'} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-white leading-tight">
                {isAr ? 'كوزمو' : 'Cosmo AI'}
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-emerald-500 uppercase">{isAr ? 'متصل الآن' : 'Online'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><Search size={18} /></button>
            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><Settings size={18} /></button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`flex gap-4 max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm overflow-hidden ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'}`}>
                  {msg.role === 'user' ? (
                    userPhoto ? (
                      <img src={userPhoto} alt={userName || ''} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold">{userName ? userName.substring(0, 1) : <Plus size={14} />}</span>
                    )
                  ) : <CosmoOrb size={20} />}
                </div>
                <div className="space-y-1">
                  <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700/50 rounded-tl-none'
                  }`}>
                    {msg.image && <img src={msg.image} alt="Upload" className="max-w-xs rounded-lg mb-3 shadow-md" />}
                    <div className="whitespace-pre-wrap font-medium">{msg.text}</div>
                  </div>
                  <p className={`text-[10px] font-medium text-slate-400 ${msg.role === 'user' ? 'text-left' : 'text-right'}`}>{msg.timestamp}</p>
                </div>
              </div>
            </div>
          ))}
          {isAnalyzing && (
            <div className="flex justify-start animate-pulse">
              <div className="flex gap-4 items-center bg-slate-50 dark:bg-slate-800/50 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
                <span className="text-xs font-bold text-slate-400">{isAr ? 'كوزمو يفكر...' : 'Cosmo is thinking...'}</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white dark:bg-[#0f172a] border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-4xl mx-auto relative">
            {selectedImage && (
              <div className="absolute bottom-full left-0 mb-4 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in zoom-in duration-200">
                <img src={selectedImage} alt="Preview" className="h-24 w-auto rounded-lg object-cover" />
                <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors">
                  <X size={12} />
                </button>
              </div>
            )}
            
            <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-slate-400 hover:text-purple-500 transition-colors"
              >
                <ImageIcon size={20} />
              </button>
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 onChange={(e) => {
                   const file = e.target.files?.[0];
                   if (file) {
                     const reader = new FileReader();
                     reader.onload = (evt) => {
                       if (evt.target?.result) {
                         setSelectedImage(evt.target.result as string);
                       }
                     };
                     reader.readAsDataURL(file);
                   }
                 }} 
                 accept="image/*" 
                 className="hidden" 
               />
              
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={isAr ? 'اسأل كوزمو أي شيء...' : 'Ask Cosmo anything...'}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 px-2 max-h-32 resize-none text-slate-700 dark:text-slate-200 placeholder-slate-400 custom-scrollbar"
                rows={1}
                style={{ textAlign: isAr ? 'right' : 'left' }}
              />
              
              <button
                onClick={handleSendMessage}
                disabled={(!inputText.trim() && !selectedImage) || isAnalyzing}
                className={`p-3 rounded-xl transition-all ${
                  (inputText.trim() || selectedImage) && !isAnalyzing
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 hover:bg-purple-700 active:scale-95'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                }`}
              >
                <Send size={18} className={isAr ? 'rotate-180' : ''} />
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
              {isAr ? 'كوزمو قد يرتكب أخطاء أحياناً، يرجى مراجعة المعلومات المهمة.' : 'Cosmo can make mistakes. Consider checking important info.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
