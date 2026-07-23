/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Copy, Check, Twitter, Facebook, Linkedin, MessageCircle, Send, ExternalLink, Share2 } from 'lucide-react';
import { getAppOrigin } from '../lib/origin';
import { LiquidGlassSwitch } from './LiquidGlassSwitch';

interface ShareModalProps {
  quizId: string;
  quizTitle: string;
  quizDescription?: string;
  onClose: () => void;
  lang?: 'ar' | 'en';
}

export default function ShareModal({
  quizId,
  quizTitle,
  quizDescription = '',
  onClose,
  lang = 'ar'
}: ShareModalProps) {
  const [copied, setCopied] = React.useState(false);
  const [isChallengeMode, setIsChallengeMode] = React.useState(false);

  const isAr = lang === 'ar';
  
  const textDict = {
    modalTitle: isAr ? 'مشاركة الاختبار التفاعلي' : 'Share Interactive Quiz',
    modalSub: isAr ? 'انشر العلم واختبر شبكتك حول العالم' : 'Spread knowledge and challenge your network worldwide',
    quizNameLabel: isAr ? 'اسم الاختبار:' : 'Quiz Title:',
    challengeLabel: isAr ? 'وضعية التحدي التنافسي (Challenge Mode) 🏆' : 'Competitive Challenge Mode 🏆',
    challengeSub: isAr 
      ? 'يقيس وقت الحل بالملي ثانية وينشر الترتيب مباشرة على لوحة المتصدرين للأصدقاء.' 
      : 'Measures completion time in milliseconds and posts results on the friends leaderboard live.',
    uniqueUrlLabel: isAr ? 'الرابط الفريد المباشر:' : 'Unique Direct Link:',
    shareSocialLabel: isAr ? 'انشر مباشرة عبر منصات التواصل:' : 'Publish directly on social channels:',
    copiedLabel: isAr ? 'تمّ النسخ' : 'Copied!',
    copyLabel: isAr ? 'نسخ الرابط' : 'Copy Link',
    disclaimer: isAr 
      ? 'مستندات الرابط والحلول تُحفظ ديناميكياً وتدعم ميزة المزامنة المباشرة للتصحيح.'
      : 'Quiz data and scores are saved dynamically supporting real-time grade updates and synchronization.',
    twitter: isAr ? 'إكس / تويتر' : 'X / Twitter',
    facebook: isAr ? 'فيسبوك' : 'Facebook',
    linkedin: isAr ? 'LinkedIn' : 'LinkedIn',
    whatsapp: isAr ? 'واتساب' : 'WhatsApp',
    telegram: isAr ? 'تيليجرام' : 'Telegram',
    closeTooltip: isAr ? 'إغلاق التبويب' : 'Close'
  };

  const shareUrl = isChallengeMode 
    ? `${getAppOrigin()}/#/quiz/${quizId}?challenge=true` 
    : `${getAppOrigin()}/#/quiz/${quizId}`;

  const shareText = isChallengeMode
    ? (isAr 
        ? `🏆 أتحداك في حل هذا الاختبار! دخلت الآن في "وضع التحدي" على اختبار "${quizTitle}". اضغط الرابط وتحدَ رفاقك لتصدر الترتيب! ⏱️`
        : `🏆 Challenge alert! I invite you to beat my score in "${quizTitle}" (Challenge Mode). Click the link and show your skills! ⏱️`)
    : (isAr
        ? `هل يمكنك حل هذا الاختبار؟ 🤔 لقد تم إنشاء اختبار تفاعلي ذكي بعنوان "${quizTitle}" عبر منصة Quiz Space. اختبر معلوماتك الآن!`
        : `Can you solve this quiz? 🤔 "${quizTitle}" has been generated on Quiz Space. Test your knowledge right away!`);

  const copyToClipboard = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => {
            fallbackCopy(shareUrl);
          });
      } else {
        fallbackCopy(shareUrl);
      }
    } catch (_) {
      fallbackCopy(shareUrl);
    }
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // Position out of screen to avoid layout shifts
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        alert(isAr ? "برجاء تحديد الرابط ونسخه يدوياً" : "Please select and copy the link manually.");
      }
    } catch (err) {
      alert(isAr ? "برجاء تحديد الرابط ونسخه يدوياً" : "Please select and copy the link manually.");
    }
    document.body.removeChild(textArea);
  };

  const platforms = [
    {
      name: textDict.twitter,
      icon: <Twitter className="w-5 h-5 text-white" />,
      color: 'bg-black hover:bg-slate-900',
      shadow: 'shadow-slate-955/20',
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
    },
    {
      name: textDict.facebook,
      icon: <Facebook className="w-5 h-5 text-white" fill="white" />,
      color: 'bg-blue-600 hover:bg-blue-700',
      shadow: 'shadow-blue-600/20',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    },
    {
      name: textDict.linkedin,
      icon: <Linkedin className="w-5 h-5 text-white" fill="white" />,
      color: 'bg-indigo-700 hover:bg-indigo-800',
      shadow: 'shadow-indigo-700/20',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    },
    {
      name: textDict.whatsapp,
      icon: <MessageCircle className="w-5 h-5 text-white" fill="currentColor" />,
      color: 'bg-emerald-600 hover:bg-emerald-700',
      shadow: 'shadow-emerald-600/20',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`
    },
    {
      name: textDict.telegram,
      icon: <Send className="w-5 h-5 text-white mr-0.5" fill="currentColor" />,
      color: 'bg-sky-500 hover:bg-sky-600',
      shadow: 'shadow-sky-500/20',
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-xs">
      {/* Modal Card */}
      <div
        
        
        
        className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 dark:border-slate-700/80 text-right"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-light dark:bg-primary/20 rounded-xl text-primary">
              <Share2 className="w-5 h-5" />
            </div>
            <div className={isAr ? 'text-right' : 'text-left'}>
              <h4 className="font-display font-black text-lg text-slate-800 dark:text-slate-100">
                {textDict.modalTitle}
              </h4>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {textDict.modalSub}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
            title={textDict.closeTooltip}
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Quiz Info Brief */}
        <div className={`p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-1 ${isAr ? 'text-right' : 'text-left'}`}>
          <span className="text-[10px] font-bold text-primary">{textDict.quizNameLabel}</span>
          <h5 className="font-bold text-sm text-slate-805 dark:text-slate-200 line-clamp-1">{quizTitle}</h5>
          {quizDescription && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
              {quizDescription}
            </p>
          )}
        </div>

        {/* Challenge Mode Toggle Indicator */}
        <div className={`p-4 rounded-2xl bg-primary-light/50 dark:bg-primary/10 border border-primary/20 flex items-center justify-between gap-4 ${isAr ? 'text-right' : 'text-left'}`}>
          <div className="space-y-1">
            <div className={`flex items-center gap-1.5 ${isAr ? 'justify-start' : 'justify-start'}`}>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h5 className="font-bold text-xs text-slate-850 dark:text-slate-200">{textDict.challengeLabel}</h5>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-400 leading-relaxed">
              {textDict.challengeSub}
            </p>
          </div>
          
          <LiquidGlassSwitch 
            checked={isChallengeMode} 
            onChange={(checked) => setIsChallengeMode(checked)} 
            size="sm"
          />
        </div>

        {/* Copy Link Segment */}
        <div className={`space-y-2 ${isAr ? 'text-right' : 'text-left'}`}>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{textDict.uniqueUrlLabel}</label>
          <div className="flex gap-2 relative">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl outline-none text-xs font-mono text-primary dark:text-primary-light select-all text-left"
              dir="ltr"
            />
            
            <button
              onClick={copyToClipboard}
              className={`flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl font-bold text-xs transition-all cursor-pointer flex-shrink-0 ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/20'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{textDict.copiedLabel}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{textDict.copyLabel}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Social Platforms Row */}
        <div className={`space-y-3 ${isAr ? 'text-right' : 'text-left'}`}>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{textDict.shareSocialLabel}</label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {platforms.map((platform) => (
              <a
                
                href={platform.url}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-semibold ${platform.color} transition-all duration-200 shadow-xs hover:scale-[1.02]`}
              >
                <div className="flex-shrink-0">{platform.icon}</div>
                <span className="text-white font-semibold">{platform.name}</span>
                <ExternalLink className="w-3 h-3 text-white/60 mr-auto ml-auto" />
              </a>
            ))}
          </div>
        </div>

        {/* Note info */}
        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
          {textDict.disclaimer}
        </p>
      </div>
    </div>
  );
}
