import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { askAI, askAIStream, askGroq } from '../services/aiWorkerClient';
import { getCosmoHistory, saveCosmoMessage, clearCosmoHistory, getCosmoConversations, createCosmoConversation, renameCosmoConversation, deleteCosmoConversation, CosmoConversation } from '../lib/db';
import { Image, Send, Trash2, Sparkles, Brain, Compass, Camera, AlertCircle, X, Info, HelpCircle, XCircle, Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, FileText, Mic, Menu, Plus, Search, Pencil } from 'lucide-react';
import ThreeDIcon from '../components/ThreeDIcon';

interface Message {
  id: string;
  role: 'user' | 'cosmo';
  text: string;
  image?: string; // base64 preview
  timestamp: string;
}

interface CosmoChatbotProps {
  lang: 'ar' | 'en';
  isPremium: boolean;
  planName: string;
  userId?: string;
  onUpgradeClick?: () => void;
  onOpenAuthModal?: (mode: 'login' | 'register') => void;
}

export default function CosmoChatbot({ lang, isPremium, planName, userId, onUpgradeClick, onOpenAuthModal }: CosmoChatbotProps) {
  const isAr = lang === 'ar';
  const chatEndRef = useRef<HTMLDivElement>(null);


  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine if active user is officially Diamond
  const planClean = (planName || '').toLowerCase();
  const isDiamond = isPremium && (
    planClean.includes('diamond') || 
    planClean.includes('الماسية') || 
    planClean.includes('ماسية')
  );

  const hasAccess = isDiamond;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down' | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Multi-conversation sidebar state
  const [conversations, setConversations] = useState<CosmoConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [convSearchQuery, setConvSearchQuery] = useState('');
  const [renamingConvId, setRenamingConvId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);

  const welcomeMessage = (): Message => ({
    id: 'welcome',
    role: 'cosmo',
    text: isAr
      ? `مرحباً بك يا صديقي الكوني ومستكشف المستقبل في الباقة الماسية الفاخرة! 🌌💎\n\nأنا **كوزمو (Cosmo AI)**، مساعدك الأكاديمي وصديقك الذكي جداً. يمكنك التحدث معي حول أي موضوع علمي أو طرح الأسئلة الصعبة.\n\n💡 **ميزتي الكبرى:** يمكنني **قراءة الصور وتحليلها**! أرفق لي صورة لمسألة، رسم بياني، أو معادلة معقدة وسأقوم بشرحها وتبسيطها لك بحلول فورية ذكية! 🪐🚀`
      : `Welcome, cosmic star explorer, to the premium Diamond Elite package! 🌌💎\n\nI am **Cosmo (Cosmo AI)**, your automated smart academic buddy. You can chat with me about scientific concepts, solve hard brain teasers, or plan your study guides.\n\n💡 **My superpower:** I can **read & analyze images**! Attach any screen capture, chart, or homework problem and I will explain and solve it with stellar accuracy instantly! 🪐🚀`,
    timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  });

  // For the info modal when showInfo changes
  useEffect(() => {
    if (showInfo) {
      gsap.fromTo(".info-modal-bg", { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(".info-modal-content", { scale: 0.9, y: 20, opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' });
    }
  }, [showInfo]);

  useGSAP(() => {
    gsap.fromTo(containerRef.current, 
      { opacity: 0, scale: 0.98, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    );
    gsap.fromTo(".message-bubble", 
      { opacity: 0, y: 15, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.05, ease: 'back.out(1.2)' }
    );
  }, { scope: containerRef, dependencies: [messages.length, showInfo] });


  // Load the conversation list (sidebar) whenever the user changes.
  useEffect(() => {
    if (!userId) { setConversations([]); return; }
    let cancelled = false;
    (async () => {
      const list = await getCosmoConversations(userId);
      if (cancelled) return;
      setConversations(list);
      // Auto-select the most recent conversation on first load, if any.
      setActiveConversationId((current) => current ?? (list[0]?.id || null));
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Load persisted conversation from Supabase (survives clearing the
  // browser or logging in on another device). Falls back to the welcome
  // message for guests, first-time chatters, or a brand-new conversation.
  useEffect(() => {
    let cancelled = false;
    setHistoryLoaded(false);
    setMessages([]);

    (async () => {
      if (userId && activeConversationId) {
        const history = await getCosmoHistory(userId, activeConversationId);
        if (cancelled) return;
        if (history.length > 0) {
          setMessages(history.map((row) => ({
            id: row.id,
            role: row.role,
            text: row.text,
            timestamp: new Date(row.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
          })));
          setHistoryLoaded(true);
          return;
        }
      }
      if (!cancelled) {
        setMessages([welcomeMessage()]);
        setHistoryLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [isAr, userId, activeConversationId]);

  const startNewConversation = () => {
    setActiveConversationId(null);
    setMessages([welcomeMessage()]);
    setIsSidebarOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setIsSidebarOpen(false);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteCosmoConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setDeletingConvId(null);
    if (activeConversationId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      setActiveConversationId(remaining[0]?.id || null);
    }
  };

  const handleRenameConversation = async (id: string) => {
    const title = renameValue.trim();
    if (title) {
      await renameCosmoConversation(id, title);
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    }
    setRenamingConvId(null);
  };

  // Groups conversations into Today / Yesterday / Older, matching the
  // familiar ChatGPT-style sidebar sections.
  const groupedConversations = (() => {
    const q = convSearchQuery.trim().toLowerCase();
    const filtered = q ? conversations.filter((c) => c.title.toLowerCase().includes(q)) : conversations;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const groups: { label: string; items: CosmoConversation[] }[] = [
      { label: isAr ? 'اليوم' : 'Today', items: [] },
      { label: isAr ? 'أمس' : 'Yesterday', items: [] },
      { label: isAr ? 'أقدم' : 'Older', items: [] },
    ];
    filtered.forEach((c) => {
      const d = new Date(c.updatedAt).toDateString();
      if (d === today) groups[0].items.push(c);
      else if (d === yesterday) groups[1].items.push(c);
      else groups[2].items.push(c);
    });
    return groups.filter((g) => g.items.length > 0);
  })();

  // Handle auto-scroll to bottom on messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAnalyzing]);

  // Handle image attachment
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag and drop events
  const [dragActive, setDragActive] = useState(false);
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Convert rich text formatting to clean elements safely with React 19 compatibility
  // Renders inline markdown within a single line: **bold**, *italic*/_italic_,
  // `inline code`. Order matters — code spans are extracted first so bold/
  // italic markers inside them aren't touched.
  const renderInline = (line: string, keyPrefix: string) => {
    const parts: React.ReactNode[] = [];
    // Split on inline code spans first, keeping the delimiters
    const codeSplit = line.split(/(`[^`]+`)/g);
    codeSplit.forEach((chunk, ci) => {
      if (chunk.startsWith('`') && chunk.endsWith('`') && chunk.length > 1) {
        parts.push(
          <code key={`${keyPrefix}-code-${ci}`} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[0.85em] font-mono text-pink-600 dark:text-pink-400">
            {chunk.slice(1, -1)}
          </code>
        );
        return;
      }
      // Bold + italic within this non-code chunk
      const boldItalicSplit = chunk.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g);
      boldItalicSplit.forEach((piece, pi) => {
        if (/^\*\*[^*]+\*\*$/.test(piece)) {
          parts.push(<strong key={`${keyPrefix}-b-${ci}-${pi}`} className="font-extrabold text-[#7c3aed] dark:text-[#a78bfa]">{piece.slice(2, -2)}</strong>);
        } else if (/^\*[^*]+\*$/.test(piece) || /^_[^_]+_$/.test(piece)) {
          parts.push(<em key={`${keyPrefix}-i-${ci}-${pi}`} className="italic">{piece.slice(1, -1)}</em>);
        } else if (piece) {
          parts.push(piece);
        }
      });
    });
    return parts;
  };

  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);

  const formatText = (text: string) => {
    // 1) Split out fenced code blocks (```lang\n...\n```) from the rest first
    const blocks: { type: 'code' | 'text'; content: string; lang?: string }[] = [];
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    let lastEnd = 0;
    let m;
    while ((m = codeBlockRegex.exec(text)) !== null) {
      if (m.index > lastEnd) blocks.push({ type: 'text', content: text.slice(lastEnd, m.index) });
      blocks.push({ type: 'code', content: m[2].replace(/\n$/, ''), lang: m[1] || undefined });
      lastEnd = codeBlockRegex.lastIndex;
    }
    if (lastEnd < text.length) blocks.push({ type: 'text', content: text.slice(lastEnd) });

    return blocks.map((block, blockIdx) => {
      if (block.type === 'code') {
        const blockId = `code-${blockIdx}-${block.content.slice(0, 12)}`;
        return (
          <div key={blockId} className="relative my-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800">
              <span className="text-[10px] font-mono text-slate-400">{block.lang || 'code'}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(block.content).catch(() => {});
                  setCopiedBlockId(blockId);
                  window.setTimeout(() => setCopiedBlockId((c) => (c === blockId ? null : c)), 1500);
                }}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {copiedBlockId === blockId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedBlockId === blockId ? (isAr ? 'اتنسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}
              </button>
            </div>
            <pre className="p-3 overflow-x-auto text-[12px] leading-relaxed text-slate-100 font-mono"><code>{block.content}</code></pre>
          </div>
        );
      }

      // Text block: process line by line, with basic table support
      const lines = block.content.split('\n');
      const rendered: React.ReactNode[] = [];
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];

        // Simple pipe-table: a header row, a separator row (---|---), then data rows
        if (line.includes('|') && lines[i + 1]?.replace(/[|\s]/g, '').match(/^:?-+:?(-+:?)*$/)) {
          const parseRow = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
          const header = parseRow(line);
          let r = i + 2;
          const rows: string[][] = [];
          while (r < lines.length && lines[r].includes('|')) {
            rows.push(parseRow(lines[r]));
            r++;
          }
          rendered.push(
            <div key={`table-${i}`} className="my-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>{header.map((h, hi) => <th key={hi} className="px-3 py-2 text-right font-black text-slate-700 dark:text-slate-200">{renderInline(h, `th-${i}-${hi}`)}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((row, ri) => (
                    <tr key={ri}>{row.map((cell, ci) => <td key={ci} className="px-3 py-2 text-slate-600 dark:text-slate-300">{renderInline(cell, `td-${i}-${ri}-${ci}`)}</td>)}</tr>
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
            <h4 key={`h4-${i}`} className="text-sm font-black text-slate-900 dark:text-white mt-3 mb-1.5 flex items-center gap-1">
              <span className="text-secondary shrink-0">✦</span> {renderInline(line.replace('### ', ''), `h4i-${i}`)}
            </h4>
          );
          i++; continue;
        }
        if (line.startsWith('## ') || line.startsWith('# ')) {
          rendered.push(
            <h3 key={`h3-${i}`} className="text-base font-black text-slate-950 dark:text-white mt-4 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-1.5">
              <span className="text-primary shrink-0">✦</span> {renderInline(line.replace(/^##? /, ''), `h3i-${i}`)}
            </h3>
          );
          i++; continue;
        }

        const isBullet = line.startsWith('- ') || line.startsWith('* ');
        const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
        const cleanLine = isBullet ? line.substring(2) : (numberedMatch ? numberedMatch[2] : line);
        const parts = renderInline(cleanLine, `l-${i}`);

        if (isBullet) {
          rendered.push(
            <li key={`li-${i}`} className="list-none mr-4 ml-4 flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 py-0.5 leading-relaxed">
              <span className="text-primary dark:text-violet-400 mt-1.5 shrink-0 text-[10px]">✨</span>
              <span className="flex-1">{parts.length > 0 ? parts : cleanLine}</span>
            </li>
          );
        } else if (numberedMatch) {
          rendered.push(
            <li key={`nli-${i}`} className="list-none mr-4 ml-4 flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 py-0.5 leading-relaxed">
              <span className="text-primary dark:text-violet-400 shrink-0 font-black text-[11px]">{numberedMatch[1]}.</span>
              <span className="flex-1">{parts.length > 0 ? parts : cleanLine}</span>
            </li>
          );
        } else {
          rendered.push(
            <p key={`p-${i}`} className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed min-h-[1.25rem]">
              {parts.length > 0 ? parts : line}
            </p>
          );
        }
        i++;
      }
      return <React.Fragment key={`block-${blockIdx}`}>{rendered}</React.Fragment>;
    });
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Trigger send prompt to backend
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    const currentText = inputText;
    const currentImg = selectedImage;

    // Reset inputs immediately
    setInputText('');
    setSelectedImage(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMsgId = 'msg-' + Date.now();
    const newUserMessage: Message = {
      id: userMsgId,
      role: 'user',
      text: currentText,
      image: currentImg || undefined,
      timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setIsAnalyzing(true);

    // First message of a brand-new chat (no conversation selected yet) —
    // create the conversation row now, titled from the message itself,
    // exactly like ChatGPT titles a new thread from your first prompt.
    let conversationId = activeConversationId;
    if (userId && !conversationId) {
      const title = (currentText || (isAr ? 'محادثة بالصورة' : 'Image conversation')).slice(0, 60);
      const created = await createCosmoConversation(userId, title);
      if (created) {
        conversationId = created.id;
        setActiveConversationId(created.id);
        setConversations((prev) => [created, ...prev]);
      }
    }

    if (userId) {
      saveCosmoMessage(userId, 'user', currentText, !!currentImg, conversationId || undefined).catch(() => {});
    }

    try {
      // Assemble previous history context safely (capped to last 5 messages to avoid token bloat)
      const recentHistory = messages
        .slice(-5)
        .map(m => ({ role: m.role, text: m.text }));

      const systemPrompt = isAr
        ? `أنت كوزمو (Cosmo AI)، مساعد ذكاء اصطناعي أكاديمي متعدد الوسائط للطلاب والمعلمين. تتكلم العربية بطلاقة وبشكل ودي واحترافي. يمكنك تحليل الصور والمسائل وشرح المفاهيم العلمية والرياضية.`
        : `You are Cosmo (Cosmo AI), a multimodal AI academic assistant for students and teachers. You speak fluent English in a friendly and professional manner. You can analyze images, solve problems, and explain scientific and mathematical concepts.`;

      const historyParts = recentHistory.map(m => ({
        role: m.role === 'cosmo' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

      let image: { data: string; mimeType: string } | undefined;
      if (currentImg) {
        const base64Data = currentImg.split(',')[1];
        const mimeMatch = currentImg.match(/data:([^;]+);/);
        image = { data: base64Data, mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg' };
      }

      const chatHistory = historyParts.map(item => ({ role: item.role as 'user' | 'model', text: item.parts[0].text }));
      const promptText = currentText || (isAr ? 'حلل الصورة المرفقة.' : 'Analyze the attached image.');

      // Cosmo runs on OpenRouter for all messages (text + images via multimodal support).
      const cosmoMsgId = 'msg-' + (Date.now() + 1);
      let streamStarted = false;
      const { text: replyText } = await askAIStream(
        promptText,
        { systemInstruction: systemPrompt, history: chatHistory, ...(image ? { image } : {}) },
        (_delta, fullSoFar) => {
          if (!streamStarted) {
            streamStarted = true;
            setIsAnalyzing(false); // hide "thinking..." the moment real tokens start
            setMessages((prev) => [...prev, {
              id: cosmoMsgId,
              role: 'cosmo',
              text: fullSoFar,
              timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
            }]);
          } else {
            setMessages((prev) => prev.map((m) => (m.id === cosmoMsgId ? { ...m, text: fullSoFar } : m)));
          }
        },
      );

      // Edge case: connection succeeded but the stream ended with zero
      // tokens (e.g. upstream returned an empty completion) — still show
      // something instead of silently doing nothing.
      if (!streamStarted) {
        setMessages((prev) => [...prev, {
          id: cosmoMsgId,
          role: 'cosmo',
          text: replyText || (isAr ? 'لم يصل رد، حاول مرة أخرى.' : 'No response received, please try again.'),
          timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        }]);
      }

      if (userId) {
        saveCosmoMessage(userId, 'cosmo', replyText, false, conversationId || undefined).catch(() => {});
      }
    } catch (err: any) {
      console.error('Error fetching cosmo reply:', err);
      // Fallback response
      const errMsgText = (err.message && err.message !== 'Server responded with error')
        ? err.message
        : (isAr 
          ? "⚠️ عذراً يا صديقي الكوني المميز! واجهتُ مشكلة مؤقتة في محيط الاتصال بخادم الذكاء الاصطناعي للمجرة. يرجى مراجعة إعدادات الإنترنت وإعادة تراسلنا بعد برهة."
          : "⚠️ Sorry, my stellar partner! I encountered a temporary connection glitch with the core AI galaxy. Please check your data lines and let's retry shortly.");

      const errMessage: Message = {
        id: 'msg-err-' + Date.now(),
        role: 'cosmo',
        text: errMsgText,
        timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errMessage]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Regenerate: re-send the user message that led to this reply, and
  // replace the reply in place instead of appending a new one.
  const handleRegenerate = async (cosmoMsgIdx: number) => {
    const cosmoMsg = messages[cosmoMsgIdx];
    if (!cosmoMsg || cosmoMsg.role !== 'cosmo') return;
    const userMsg = messages.slice(0, cosmoMsgIdx).reverse().find((m) => m.role === 'user');
    if (!userMsg) return;

    setIsAnalyzing(true);
    try {
      const recentHistory = messages
        .slice(0, cosmoMsgIdx - 1)
        .slice(-5)
        .map((m) => ({ role: m.role === 'cosmo' ? 'model' as const : 'user' as const, text: m.text }));

      const systemPrompt = isAr
        ? `أنت كوزمو (Cosmo AI)، مساعد ذكاء اصطناعي أكاديمي متعدد الوسائط للطلاب والمعلمين. تتكلم العربية بطلاقة وبشكل ودي واحترافي. يمكنك تحليل الصور والمسائل وشرح المفاهيم العلمية والرياضية.`
        : `You are Cosmo (Cosmo AI), a multimodal AI academic assistant for students and teachers. You speak fluent English in a friendly and professional manner. You can analyze images, solve problems, and explain scientific and mathematical concepts.`;

      let image: { data: string; mimeType: string } | undefined;
      if (userMsg.image) {
        const base64Data = userMsg.image.split(',')[1];
        const mimeMatch = userMsg.image.match(/data:([^;]+);/);
        image = { data: base64Data, mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg' };
      }
      const promptText = userMsg.text || (isAr ? 'حلل الصورة المرفقة.' : 'Analyze the attached image.');

      const { text: replyText } = await askAIStream(
        promptText,
        { systemInstruction: systemPrompt, history: recentHistory, ...(image ? { image } : {}) },
        (_delta, fullSoFar) => {
          setMessages((prev) => prev.map((m, i) => (i === cosmoMsgIdx ? { ...m, text: fullSoFar } : m)));
        },
      );

      setMessages((prev) => prev.map((m, i) => (i === cosmoMsgIdx ? { ...m, text: replyText, timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) } : m)));
      if (userId) {
        saveCosmoMessage(userId, 'cosmo', replyText, false, activeConversationId || undefined).catch(() => {});
      }
    } catch (err) {
      console.error('Error regenerating cosmo reply:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div ref={containerRef} className="w-full max-w-5xl mx-auto flex flex-col h-[calc(100dvh-140px)] min-h-[550px]" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Custom Styles for clean, modern AI UI elements */}
      <style>{`
        @keyframes subtlePulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.95; }
        }
        .shimmer-bar {
          background: linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #6366f1 100%);
          background-size: 200% 100%;
          animation: shimmerMove 1.5s infinite linear;
        }
        @keyframes shimmerMove {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Conversation history sidebar — slides in from the side, ChatGPT-style */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[10000] flex" dir={isAr ? 'rtl' : 'ltr'}>
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className={`relative w-80 max-w-[85vw] h-full bg-white dark:bg-[#0b0f19] border-slate-100 dark:border-slate-800 flex flex-col shadow-2xl ${isAr ? 'mr-auto border-l' : 'ml-auto border-r'}`}>
            <div className="p-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 right-3 text-slate-400" />
                <input
                  type="text"
                  value={convSearchQuery}
                  onChange={(e) => setConvSearchQuery(e.target.value)}
                  placeholder={isAr ? 'بحث في المحادثات...' : 'Search conversations...'}
                  className="w-full pr-8 pl-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="p-3">
              <button
                type="button"
                onClick={startNewConversation}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-black transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {isAr ? 'محادثة جديدة' : 'New conversation'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-4">
              {groupedConversations.length === 0 && (
                <p className="text-center text-xs text-slate-400 mt-8 px-4">
                  {convSearchQuery ? (isAr ? 'مفيش نتائج' : 'No results') : (isAr ? 'لسه معندكش محادثات محفوظة' : 'No saved conversations yet')}
                </p>
              )}
              {groupedConversations.map((group) => (
                <div key={group.label}>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-3 mb-1.5">{group.label}</p>
                  <div className="space-y-0.5">
                    {group.items.map((conv) => (
                      <div
                        key={conv.id}
                        className={`group flex items-center gap-1.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${activeConversationId === conv.id ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'}`}
                      >
                        {renamingConvId === conv.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameConversation(conv.id); if (e.key === 'Escape') setRenamingConvId(null); }}
                            onBlur={() => handleRenameConversation(conv.id)}
                            className="flex-1 min-w-0 bg-transparent border-b border-primary text-xs font-bold focus:outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectConversation(conv.id)}
                            className="flex-1 min-w-0 text-right text-xs font-bold truncate cursor-pointer"
                          >
                            {conv.title}
                          </button>
                        )}

                        {renamingConvId !== conv.id && (
                          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setRenamingConvId(conv.id); setRenameValue(conv.title); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                              title={isAr ? 'إعادة تسمية' : 'Rename'}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setDeletingConvId(conv.id); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                              title={isAr ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete-conversation confirmation */}
      {deletingConvId && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-2xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 p-5 text-center space-y-4">
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              {isAr ? 'هل تحذف هذه المحادثة نهائيًا؟' : 'Delete this conversation permanently?'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingConvId(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteConversation(deletingConvId)}
                className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black cursor-pointer"
              >
                {isAr ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ℹ️ Cosmo Premium Information & Simulator Settings Modal Overlay */}
      {showInfo && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md info-modal-bg" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-primary/30 bg-[#0c0f1a]/95 text-white p-6 shadow-2xl info-modal-content">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#7c3aed]/15 to-transparent rounded-full blur-2xl pointer-events-none" />

            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer z-20"
              style={{ [isAr ? 'left' : 'right']: '1rem', [isAr ? 'right' : 'left']: 'auto' }}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4 relative z-10">
              <div className="relative w-16 h-16 transform hover:scale-110 transition-transform duration-300 flex items-center justify-center">
                <div className="absolute inset-[-6px] rounded-full opacity-60 bg-gradient-to-tr from-[#7c3aed]/40 to-[#ec4899]/40 blur-md" />
                <div className="w-full h-full rounded-2xl p-[2px] bg-gradient-to-tr from-[#7c3aed] to-[#ec4899] shadow-lg relative z-10">
                  <div className="w-full h-full bg-[#0b0f19] rounded-xl flex items-center justify-center">
                    <ThreeDIcon name="cosmobot" className="w-full h-full" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-2.5 h-2.5 fill-slate-950" />
                    {isAr ? 'حساب ماسي نخبوي' : 'Diamond Elite VIP'}
                  </span>
                  <span className="bg-primary/40 text-primary-light text-[9px] font-black px-2 py-0.5 rounded-full">
                    AI Agent V3.5
                  </span>
                </div>
                <h3 className="font-display font-black text-lg text-white">
                  {isAr ? 'معلومات المستشار كوزمو 🤖💎' : 'Cosmo AI Information 🤖💎'}
                </h3>
              </div>

              <div className="text-xs text-slate-300 space-y-2.5 text-right leading-relaxed font-bold w-full p-4 rounded-2xl bg-slate-900/50 border border-slate-800" style={{ textAlign: isAr ? 'right' : 'left' }}>
                <p>
                  {isAr
                    ? '🪐 أنا كوزمو، مساعدك الكوانتي الذكي المطور لحل المسائل العلمية وتبسيط المناهج بذكاء استثنائي.'
                    : '🪐 I am Cosmo, your custom scientific buddy built to clarify homework challenges and simplify lessons.'}
                </p>
                <p className="text-[#a78bfa]">
                  {isAr
                    ? '📸 ميزتي الخارقة: قراءة وتفسير وتحليل الصور والرسومات البيانية فورياً! التقط صورة لأي مسألة صعبة وأرسلها لي لشرح تفصيلي.'
                    : '📸 My superpower: real-time photo & diagram comprehension! Simply snap a photo of any assignment and ask me for deep explanations.'}
                </p>
                <p className="text-slate-400 text-[11px]">
                  {isAr
                    ? '✨ متاح حصرياً للباقة الماسية الفخمة، أو عبر تفعيل محاكي الرتب الموضح أدناه للتجربة الفورية.'
                    : '✨ Available for Diamond Level premium accounts, or instantly test-drive via the developer simulator toggle below.'}
                </p>
              </div>

              {/* Premium info */}
              <div className="w-full border-t border-slate-800/80 pt-4 mt-2">
                {!isDiamond ? (
                  <div className="space-y-3">
                    {onUpgradeClick && (
                      <button
                        type="button"
                        onClick={() => { setShowInfo(false); onUpgradeClick(); }}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black transition-all shadow-md cursor-pointer"
                      >
                        {isAr ? 'الترقية للباقة الماسية 👑' : 'Upgrade to Diamond 👑'}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-400 font-black flex items-center justify-center gap-1.5">
                    <span>💎 {isAr ? 'أنت شريك ماسي فخّم، استمتع بكامل الصلاحيات!' : 'You are a Diamond partner, enjoy unlimited access!'}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Interface */}
      <div className={`relative flex-1 rounded-3xl bg-white dark:bg-[#0b0f19] border border-slate-150 dark:border-slate-800/80 flex flex-col overflow-hidden shadow-xl transition-all ${!hasAccess ? 'opacity-60 pointer-events-none select-none' : ''}`}>
        
        {/* Immersive ChatGPT-Style Top Header Bar */}
        <header className="shrink-0 px-5 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {userId && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer shrink-0"
                title={isAr ? 'سجل المحادثات' : 'Conversation history'}
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <div className="relative w-8 h-8 shrink-0">
              <div className="w-full h-full rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                <span className="text-xs font-black">✦</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white dark:border-[#0b0f19]" />
            </div>

            <div className="text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
              <div className="flex items-center gap-1.5">
                <h3 className="font-sans font-bold text-xs sm:text-sm text-slate-800 dark:text-white">
                  {isAr ? 'المساعد الذكي كوزمو' : 'Cosmo Assistant'}
                </h3>
              </div>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1 mt-0.5">
                <span className="w-1 h-1 bg-emerald-500 rounded-full inline-block" />
                <span>{isAr ? 'متصل ومستعد للرد' : 'Online & ready to assist'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Trash option to clear current session chat history */}
            <button
              type="button"
              onClick={() => {
                if (confirm(isAr ? 'هل تود بالتأكيد تصفير محادثة كوزمو والبدء من جديد؟' : 'Are you sure you want to clear your conversation history?')) {
                  setMessages([welcomeMessage()]);
                  if (userId) {
                    clearCosmoHistory(userId).catch(() => {});
                  }
                }
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              title={isAr ? 'تفريغ المحادثة' : 'Clear Chat'}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Information Button */}
            <button
              type="button"
              onClick={() => setShowInfo(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              title={isAr ? 'معلومات كوزمو' : 'Cosmo Info'}
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </header>
        
        {/* Sleek Minimal Progress Shimmer Line */}
        {isAnalyzing && (
          <div className="absolute top-[53px] left-0 right-0 z-40 h-[3px] shimmer-bar pointer-events-none" />
        )}

        {/* Chat Messages Feed Area */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 relative scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 ${dragActive ? 'bg-primary/5 dark:bg-primary/10 border-2 border-dashed border-primary/40 m-2 rounded-2xl' : ''}`}
        >
          {dragActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white/90 dark:bg-[#111827]/90 z-20 gap-3">
              <Camera className="w-12 h-12 text-primary animate-bounce" />
              <h3 className="font-display font-black text-lg text-slate-800 dark:text-white">
                {isAr ? 'ألق بالصورة هنا للتحليل! 📷' : 'Drop your image here to analyze! 📷'}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr ? 'سيروق لكوزمو فحصها وتبسيط محتواها الأكاديمي.' : 'Cosmo will look forward to investigating it.'}
              </p>
            </div>
          )}

          {/* Dedicated welcome screen with quick-start suggestions — shown
              only before any real conversation has started (just the
              static welcome message in the list). Disappears entirely
              once the user sends their first message. */}
          {messages.length === 1 && messages[0].id === 'welcome' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-10 gap-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
                  {isAr ? `مرحباً بك 👋` : `Welcome 👋`}
                </h2>
                <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">
                  {isAr ? 'كيف يمكنني مساعدتك اليوم؟' : 'How can I help you today?'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 w-full max-w-md">
                {[
                  { icon: '🖼️', label: isAr ? 'ارفع صورة' : 'Upload image', action: 'image' as const },
                  { icon: '🎓', label: isAr ? 'أنشئ اختبار' : 'Create a quiz', action: 'prompt' as const, prompt: isAr ? 'أنشئ لي 5 أسئلة اختيار من متعدد عن: ' : 'Create 5 multiple-choice questions about: ' },
                  { icon: '💡', label: isAr ? 'اشرح لي درس' : 'Explain a lesson', action: 'prompt' as const, prompt: isAr ? 'اشرح لي بطريقة مبسطة: ' : 'Explain simply: ' },
                  { icon: '📝', label: isAr ? 'اسأل كوزمو' : 'Ask Cosmo anything', action: 'prompt' as const, prompt: '' },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      if (item.action === 'image') {
                        fileInputRef.current?.click();
                      } else {
                        setInputText(item.prompt || '');
                        textareaRef.current?.focus();
                      }
                    }}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-right transition-colors cursor-pointer"
                  >
                    <span className="text-lg shrink-0">{item.icon}</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, msgIdx) => {
            if (msg.id === 'welcome') return null; // shown via the dedicated welcome screen above instead
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-1 w-full ${isUser ? 'items-end' : 'items-start'}`}
              >
                {/* Plain sender label instead of a circular bot/user icon */}
                <span className={`text-[10px] font-black px-1 ${isUser ? 'text-indigo-500 dark:text-indigo-400' : 'text-primary'}`}>
                  {isUser ? (isAr ? 'أنت' : 'You') : 'Cosmo'}
                </span>

                <div className={`flex flex-col gap-1 ${isUser ? 'max-w-[75%]' : 'w-full'}`}>
                  {isUser ? (
                    <div 
                      className="bg-indigo-600 dark:bg-indigo-900 text-white px-4 py-2.5 rounded-2xl text-[14px] sm:text-[15px] leading-[1.7]"
                      style={{ textAlign: isAr ? 'right' : 'left' }}
                    >
                      {msg.image && (
                        <div className="mb-2 overflow-hidden rounded-xl max-w-sm max-h-[220px] shadow-md border border-white/10">
                          <img 
                            src={msg.image} 
                            alt="Uploaded material" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      <p className="whitespace-pre-line">{msg.text}</p>
                    </div>
                  ) : (
                    <div className="text-right max-w-none flex flex-col gap-2" style={{ textAlign: isAr ? 'right' : 'left' }}>
                      <div className="text-[14px] sm:text-[15px] leading-[1.7] text-slate-800 dark:text-slate-100 space-y-3">
                        {formatText(msg.text)}
                      </div>
                      
                      {(!msg.text.includes('يجب تسجيل الدخول') && !msg.text.includes('تسجيل الدخول') && !msg.text.toLowerCase().includes('login')) ? null : (
                        onOpenAuthModal && (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button
                              type="button"
                              onClick={() => onOpenAuthModal('login')}
                              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-black transition-all shadow-md shadow-primary/10 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center gap-1.5"
                            >
                              <span>{isAr ? 'تسجيل الدخول الآن 🔐' : 'Log In Now 🔐'}</span>
                            </button>
                          </div>
                        )
                      )}

                      {/* Response actions: copy / regenerate / like / dislike — same
                          pattern as ChatGPT/Claude. Only shown on real replies, not
                          the static welcome message. */}
                      {msg.id !== 'welcome' && (
                        <div className="flex items-center gap-1 pt-1">
                          <button
                            type="button"
                            title={isAr ? 'نسخ' : 'Copy'}
                            onClick={() => {
                              navigator.clipboard?.writeText(msg.text).catch(() => {});
                              setCopiedMsgId(msg.id);
                              window.setTimeout(() => setCopiedMsgId((c) => (c === msg.id ? null : c)), 1500);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            {copiedMsgId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            title={isAr ? 'إعادة توليد' : 'Regenerate'}
                            onClick={() => handleRegenerate(msgIdx)}
                            disabled={isAnalyzing}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title={isAr ? 'إجابة جيدة' : 'Good response'}
                            onClick={() => setFeedback((prev) => ({ ...prev, [msg.id]: prev[msg.id] === 'up' ? null : 'up' }))}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${feedback[msg.id] === 'up' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title={isAr ? 'إجابة سيئة' : 'Bad response'}
                            onClick={() => setFeedback((prev) => ({ ...prev, [msg.id]: prev[msg.id] === 'down' ? null : 'down' }))}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${feedback[msg.id] === 'down' ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <p className={`text-[9px] text-slate-400 dark:text-slate-500 font-bold px-1.5 ${isUser ? 'text-left' : 'text-right'}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Elegant typing bubble */}
          {isAnalyzing && (
            <div className="flex flex-col gap-1 w-full items-start">
              <span className="text-[10px] font-black px-1 text-primary">Cosmo</span>
              <div className="flex flex-col gap-1 flex-1">
                <div className="text-slate-500 flex items-center gap-1.5 py-1">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    {isAr ? 'كوزمو يفكر ويكتب...' : 'Cosmo is thinking...'}
                  </span>
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Dummy anchor for scrolling */}
          <div ref={chatEndRef} />
        </div>

        {/* Selected image preview panel */}
        {selectedImage && (
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 z-10 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800 relative group">
                <img 
                  src={selectedImage} 
                  alt="Attachment preview" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-white">
                  {isAr ? 'صورة مرفقة للتحليل والمناقشة 📷' : 'Image attached for analysis 📷'}
                </p>
                <p className="text-[10px] text-slate-400 font-bold">
                  {isAr ? 'سيقوم كوزمو بقراءتها فور الإرسال' : 'Cosmo will read it upon sending'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedImage(null)}
              className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-colors cursor-pointer"
              title={isAr ? 'حذف الصورة' : 'Remove Image'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Composer (input bar) — ChatGPT/Claude style */}
        <form 
          onSubmit={handleSendMessage}
          className="sticky bottom-0 z-20 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-white dark:from-[#0b0f19] via-white/95 dark:via-[#0b0f19]/95 to-transparent shrink-0"
        >
          {/* File attach helper (hidden input) */}
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            style={{ display: 'none' }}
          />

          <div className="max-w-3xl mx-auto flex items-end gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-lg px-2 py-2 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-primary transition-all duration-200 shrink-0 cursor-pointer"
              title={isAr ? 'أرفق صورة لكسر التحديات الأكاديمية' : 'Attach image file'}
            >
              <Camera className="w-5 h-5" />
            </button>

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
              placeholder={isAr ? 'اسأل كوزمو أي سؤال، أو اسحب الصورة هنا للبدء... 👋🌌' : 'Ask Cosmo any academic core question, or drop your image... 👋🌌'}
              className="flex-1 resize-none bg-transparent outline-none text-sm py-2 max-h-40 leading-relaxed text-slate-800 dark:text-slate-100 placeholder-slate-400"
              disabled={isAnalyzing}
              style={{ textAlign: isAr ? 'right' : 'left' }}
            />

            <button
              type="submit"
              disabled={isAnalyzing || (!inputText.trim() && !selectedImage)}
              className="p-2.5 rounded-full bg-primary hover:bg-primary-hover disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white shrink-0 transition-all cursor-pointer"
            >
              <Send className={`w-4 h-4 ${isAr ? 'transform rotate-180' : ''}`} />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-2">
            {isAr ? 'قد يقوم كوزمو بارتكاب أخطاء أحياناً. يرجى التحقق من المعلومات المهمة.' : 'Cosmo can make mistakes. Verify important info.'}
          </p>
        </form>

      </div>

      {/* Lock screen placeholder when no access and no simulator active */}
      {!hasAccess && (
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-3xl p-8 sm:p-14 text-center max-w-xl mx-auto space-y-4">
          <Brain className="w-14 h-14 mx-auto text-primary animate-pulse" />
          <h4 className="font-display font-black text-xl text-slate-800 dark:text-white">
            {isAr ? 'العضوية الماسية مطلوبة 💎' : 'Diamond subscription required 💎'}
          </h4>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            {isAr
              ? 'مساعد كوزمو (Cosmo AI) يستند لعمليات كوانتية متقدمة وهو مخصص لشركاء الباقة الماسية الفخمة. قم بالترقية الآن واستمتع بقارئ ومحلل الصورة الاستثنائي!'
              : 'Cosmo AI chatbot uses quantum reasoning models which operate exclusively for Diamond tier members. Upgrade now to get full image comprehension support!'}
          </p>
          <div className="flex justify-center gap-3">
            {onUpgradeClick && (
              <button
                onClick={onUpgradeClick}
                className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-xs cursor-pointer shadow-md"
              >
                {isAr ? 'تحديث رتبة عضويتي 👑' : 'Upgrade My Tier 👑'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
