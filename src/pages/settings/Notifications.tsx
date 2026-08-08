import React, { useState } from 'react';
import { Bell, Mail, ShieldAlert, Award, FileSpreadsheet, RefreshCw, CheckCircle2, Trophy, BellRing } from 'lucide-react';
import { LiquidGlassSwitch } from '../../components/LiquidGlassSwitch';
import { registerPushNotifications } from '../../lib/pushManager';
import { supabase } from '../../lib/supabaseClient';

interface NotificationsProps {
  lang: 'ar' | 'en';
}

export default function Notifications({ lang }: NotificationsProps) {
  const isAr = lang === 'ar';

  // Toggle States (Persisted in localStorage)
  const [emailAlerts, setEmailAlerts] = useState(() => localStorage.getItem('pref_emailAlerts') !== 'false');
  const [rankUpdates, setRankUpdates] = useState(() => localStorage.getItem('pref_rankUpdates') !== 'false');
  const [weeklyReports, setWeeklyReports] = useState(() => localStorage.getItem('pref_weeklyReports') === 'true');
  const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem('pref_pushEnabled') !== 'false');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isActivatingPush, setIsActivatingPush] = useState(false);
  const [pushMessage, setPushMessage] = useState<'success' | 'error' | null>(null);

  const handleSavePreferences = () => {
    setIsSaving(true);
    setSaveSuccess(false);
    localStorage.setItem('pref_emailAlerts', String(emailAlerts));
    localStorage.setItem('pref_rankUpdates', String(rankUpdates));
    localStorage.setItem('pref_weeklyReports', String(weeklyReports));
    localStorage.setItem('pref_pushEnabled', String(pushEnabled));
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 500);
  };

  const handleActivateLeaderboardPush = async () => {
    if (isActivatingPush) return;
    setIsActivatingPush(true);
    setPushMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        setPushMessage('error');
        return;
      }

      const permission = await registerPushNotifications(user.id);
      if (permission === 'granted') {
        setPushEnabled(true);
        localStorage.setItem('pref_pushEnabled', 'true');
        localStorage.removeItem('quiz_push_banner_dismissed');
        setPushMessage('success');
      } else {
        setPushMessage('error');
      }
    } catch (error) {
      console.error('Leaderboard push activation failed:', error);
      setPushMessage('error');
    } finally {
      setIsActivatingPush(false);
    }
  };

  const notificationOptions = [
    {
      id: 'emailAlerts',
      title: isAr ? 'تنبيهات البريد الإلكتروني للاختبارات الجديدة' : 'Email alerts when a new quiz is generated',
      desc: isAr ? 'استلام بريد إلكتروني فوري يحتوي على الروابط والتحليلات فور إنشاء الذكاء الاصطناعي للاختبار' : 'Receive instant email delivery containing links and analyses whenever AI constructs a new quiz',
      icon: Mail,
      state: emailAlerts,
      setter: setEmailAlerts
    },
    {
      id: 'rankUpdates',
      title: isAr ? 'تحديثات تصنيف لوحة المتصدرين' : 'Leaderboard rank updates',
      desc: isAr ? 'تنبيهك فوراً عند تقدمك أو تراجع ترتيبك على مستوى الكوكب في لوحة الصدارة العامة' : 'Get instantly notified when your position shifts on the global high score leaderboards',
      icon: Award,
      state: rankUpdates,
      setter: setRankUpdates
    },
    {
      id: 'weeklyReports',
      title: isAr ? 'تقارير الأداء الأسبوعية' : 'Weekly performance reports',
      desc: isAr ? 'ملخص أسبوعي يحلل نقاط القوة والضعف ومعدلات تقدمك الأكاديمي والتحصيلي' : 'A detailed weekly recap analyzing your progress, academic strengths, and quiz metrics',
      icon: FileSpreadsheet,
      state: weeklyReports,
      setter: setWeeklyReports
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in text-right" style={{ textAlign: isAr ? 'right' : 'left' }} dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Header section */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white">
              {isAr ? 'تفضيلات الإشعارات' : 'Notification Settings'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr ? 'اختر وتتبع التنبيهات والأخبار التي تود استقبالها من Quiz Space' : 'Choose and monitor the updates and reports you wish to receive from Quiz Space'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="space-y-6 max-w-2xl bg-slate-50/50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
        
        {/* Toggle Grid */}
        <div className="space-y-6 divide-y divide-slate-100 dark:divide-slate-800">
          {notificationOptions.map((opt, idx) => {
            const IconComponent = opt.icon;
            return (
              <div  className={`flex items-start justify-between gap-6 ${idx > 0 ? 'pt-6' : ''}`}>
                <div className="flex gap-4">
                  <div className="p-2.5 bg-primary/5 dark:bg-primary/10 rounded-xl text-primary shrink-0">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                      {opt.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                      {opt.desc}
                    </p>
                  </div>
                </div>

                {/* Custom premium purple neon toggle switch */}
                <div className="flex items-center">
                  <LiquidGlassSwitch 
                    checked={opt.state} 
                    onChange={(checked) => opt.setter(checked)} 
                    size="sm"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Leaderboard Push activation */}
        <div className="pt-6 border-t border-slate-150 dark:border-slate-800/80">
          <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-indigo-500/5 to-purple-500/10 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex gap-4">
                <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500 shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                    🏆 {isAr ? 'فعل إشعارات لوحة المتصدرين الحية!' : 'Enable Live Leaderboard Notifications!'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                    {isAr ? 'احصل على إشعار فوري من المتصفح عندما يقوم طالب آخر بكسر رقمك القياسي واحتلال الصدارة!' : 'Get an instant browser notification when another student breaks your record and takes the lead!'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleActivateLeaderboardPush}
                disabled={isActivatingPush || pushEnabled}
                className="w-full sm:w-auto shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-black shadow-lg shadow-amber-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isActivatingPush ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
                {pushEnabled ? (isAr ? 'الإشعارات مفعّلة ✅' : 'Notifications Enabled ✅') : (isAr ? 'تفعيل الإشعارات' : 'Enable Notifications')}
              </button>
            </div>
            {pushMessage === 'success' && (
              <div className="mt-3 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{isAr ? 'تم تفعيل إشعارات لوحة المتصدرين بنجاح.' : 'Live leaderboard notifications are now enabled.'}</div>
            )}
            {pushMessage === 'error' && (
              <div className="mt-3 text-[11px] font-bold text-red-500">{isAr ? 'لم يتم تفعيل الإشعارات. اسمح بها من إعدادات المتصفح ثم حاول مرة أخرى.' : 'Notifications were not enabled. Allow them in your browser settings and try again.'}</div>
            )}
          </div>
        </div>

        {/* Browser Push Notifications */}
        <div className="pt-6 border-t border-slate-150 dark:border-slate-800/80 flex items-start justify-between gap-6">
          <div className="flex gap-4">
            <div className="p-2.5 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-xl text-indigo-500 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                {isAr ? 'إشعارات المتصفح التفاعلية' : 'Interactive Browser Push Notifications'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                {isAr ? 'السماح للذكاء الاصطناعي ببث إشعارات عاجلة لسطح المكتب عند انتهاء توليد الملفات المعقدة' : 'Allow AI to broadcast urgent notifications on your desktop once complex generation finishes'}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <LiquidGlassSwitch 
              checked={pushEnabled} 
              onChange={(checked) => setPushEnabled(checked)} 
              size="sm"
            />
          </div>
        </div>

        {/* Feedbacks and Save Action button */}
        <div className="pt-6 border-t border-slate-150 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-auto">
            {saveSuccess && (
              <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold animate-fade-in bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
                <span>{isAr ? 'تم حفظ التفضيلات بنجاح!' : 'Preferences saved successfully!'}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleSavePreferences}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{isAr ? 'حفظ التفضيلات الكونية' : 'Save Cosmic Preferences'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
