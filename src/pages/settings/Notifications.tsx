import React, { useState } from 'react';
import { Bell, Mail, ShieldAlert, Award, FileSpreadsheet, RefreshCw, CheckCircle2 } from 'lucide-react';
import { LiquidGlassSwitch } from '../../components/LiquidGlassSwitch';

interface NotificationsProps {
  lang: 'ar' | 'en';
}

export default function Notifications({ lang }: NotificationsProps) {
  const isAr = lang === 'ar';

  // Toggle States
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [rankUpdates, setRankUpdates] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSavePreferences = () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1000);
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
