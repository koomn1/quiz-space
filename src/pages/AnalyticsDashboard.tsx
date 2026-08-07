import React, { useState } from 'react';
import { Quiz, QuizCompletion } from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { 
  Activity, TrendingUp, Users, Award, BookOpen, Clock, BarChart3, CheckCircle2, Star, Calendar, RefreshCw, ChevronRight, Play, GraduationCap, Flame, Sparkles
} from 'lucide-react';

interface AnalyticsDashboardProps {
  userId: string;
  quizzes: Quiz[];
  completions: QuizCompletion[];
  lang: 'ar' | 'en';
  onStartQuiz?: (quizId: string) => void;
}

export function AnalyticsDashboard({ userId, quizzes, completions, lang, onStartQuiz }: AnalyticsDashboardProps) {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'solving' | 'creating'>('solving');

  // ----------------------------------------------------
  // Aggregate Data: solving/taking progress
  // ----------------------------------------------------
  const mySolvingCompletions = completions
    .filter(c => c.takerId === userId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const totalQuizzesSolved = mySolvingCompletions.length;
  
  const avgSolvingPercentage = totalQuizzesSolved > 0 
    ? Math.round(
        (mySolvingCompletions.reduce((acc, c) => acc + (c.totalQuestions > 0 ? (c.score / c.totalQuestions) : 0), 0) / totalQuizzesSolved) * 100
      )
    : 0;

  const perfectCompletions = mySolvingCompletions.filter(c => c.score === c.totalQuestions && c.totalQuestions > 0).length;
  const totalSolvedExp = totalQuizzesSolved * 100 + perfectCompletions * 50;

  // Preparing data for Taking Score Chart (Line)
  const scoreProgressData = mySolvingCompletions.map((c, idx) => {
    const percent = c.totalQuestions > 0 ? Math.round((c.score / c.totalQuestions) * 100) : 0;
    return {
      index: idx + 1,
      quizTitle: c.quizTitle,
      percentage: percent,
      scoreText: `${c.score}/${c.totalQuestions}`,
      date: new Date(c.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })
    };
  });

  // Preparing data for score ranges (Bar)
  const rangeHigh = mySolvingCompletions.filter(c => c.totalQuestions > 0 && (c.score / c.totalQuestions) >= 0.8).length;
  const rangeMed = mySolvingCompletions.filter(c => c.totalQuestions > 0 && (c.score / c.totalQuestions) >= 0.5 && (c.score / c.totalQuestions) < 0.8).length;
  const rangeLow = mySolvingCompletions.filter(c => c.totalQuestions > 0 && (c.score / c.totalQuestions) < 0.5).length;

  const scoreRangeData = [
    { name: isAr ? 'ممتاز (80-100%)' : 'High (80-100%)', count: rangeHigh, color: '#10b981' },
    { name: isAr ? 'متوسط (50-79%)' : 'Medium (50-79%)', count: rangeMed, color: '#6366f1' },
    { name: isAr ? 'مقبول (<50%)' : 'Needs Review (<50%)', count: rangeLow, color: '#ef4444' }
  ];

  // ----------------------------------------------------
  // Aggregate Data: creating / authoring analytics
  // ----------------------------------------------------
  const myCreatedQuizzes = quizzes.filter(q => q.creatorId === userId);
  const myCreatedQuizIds = myCreatedQuizzes.map(q => q.id);
  const globalPlaysOnMyQuizzes = completions
    .filter(c => myCreatedQuizIds.includes(c.quizId))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const totalPlays = globalPlaysOnMyQuizzes.length;
  const totalRatingsCount = myCreatedQuizzes.reduce((acc, q) => acc + (q.ratingsCount || 0), 0);
  
  const creatorAvgRating = myCreatedQuizzes.filter(q => q.ratingsCount > 0).length > 0
    ? (myCreatedQuizzes.reduce((acc, q) => acc + (q.avgRating || 0), 0) / myCreatedQuizzes.filter(q => q.ratingsCount > 0).length).toFixed(1)
    : '5.0';

  // Revenue model: premium content creator tier payout
  const totalRevenue = totalPlays * 0.15; // $0.15 per completed play for creators

  // Create category breakdown
  const categoryMap: { [key: string]: number } = {};
  myCreatedQuizzes.forEach(q => {
    const cat = q.category || (isAr ? 'عام' : 'General');
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const categoryData = Object.keys(categoryMap).map(key => ({
    name: key,
    value: categoryMap[key]
  }));

  const COLORS = ['#6366f1', '#a855f7', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 glass-panel p-6 rounded-[28px]">
        <div className="flex items-center gap-4 text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center border border-primary/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black font-display text-slate-800 dark:text-white">
              {isAr ? 'مستودع البيانات والتحليلات الذكية 📊' : 'Cognitive Analytics Hub 📊'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {isAr ? 'مراقبة التقدم التعليمي الشخصي وتحليلات تفاعل الفصول والاختبارات.' : 'Monitor your study progress metrics, classroom engagements, and authoring reach.'}
            </p>
          </div>
        </div>

        {/* Dynamic Glass Tabs Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('solving')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
              activeTab === 'solving'
                ? 'bg-primary text-white shadow-md shadow-primary/15'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>{isAr ? 'مسيرتي التعليمية' : 'Personal Study'}</span>
          </button>
          
          <button
            onClick={() => setActiveTab('creating')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
              activeTab === 'creating'
                ? 'bg-primary text-white shadow-md shadow-primary/15'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{isAr ? 'أداء اختباراتي' : 'Authoring reach'}</span>
          </button>
        </div>
      </div>

      
        {activeTab === 'solving' ? (
          <div
            
            
            
            
            className="space-y-8"
          >
            {/* SOLVING METRICS GRIDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  label: isAr ? 'الاختبارات المنجزة' : 'Quizzes Completed',
                  val: totalQuizzesSolved,
                  icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
                  bg: 'bg-emerald-500/5 border-emerald-500/10'
                },
                {
                  label: isAr ? 'معدل الدقة الإجمالي' : 'Overall Accuracy',
                  val: `${avgSolvingPercentage}%`,
                  icon: <Activity className="w-5 h-5 text-indigo-500" />,
                  bg: 'bg-indigo-500/5 border-indigo-500/10'
                },
                {
                  label: isAr ? 'الدرجات الكاملة (١٠٠٪)' : 'Perfect Matches',
                  val: perfectCompletions,
                  icon: <Award className="w-5 h-5 text-amber-500 animate-bounce" />,
                  bg: 'bg-amber-500/5 border-amber-500/10'
                },
                {
                  label: isAr ? 'خبرة الكوزمو المتراكمة' : 'Accumulated EXP',
                  val: `${totalSolvedExp} XP`,
                  icon: <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />,
                  bg: 'bg-purple-500/5 border-purple-500/10'
                }
              ].map((m, i) => (
                <div
                  
                  
                  className={`p-5 rounded-2.5xl border bg-white dark:bg-[#0f172a] shadow-xs flex items-center justify-between group transition-all`}
                >
                  <div className="space-y-1 text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">{m.label}</span>
                    <span className="text-xl font-black text-slate-800 dark:text-white font-mono block">{m.val}</span>
                  </div>
                  <div className={`p-3 rounded-xl border flex items-center justify-center shrink-0 ${m.bg}`}>
                    {m.icon}
                  </div>
                </div>
              ))}
            </div>

            {/* CHARTS CONTAINER */}
            {totalQuizzesSolved === 0 ? (
              <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/40 rounded-[32px] border border-slate-250/60 dark:border-slate-850 flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-450">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-700 dark:text-slate-200">{isAr ? 'لا توجد اختبارات محلولة بعد' : 'No Study Records Found'}</h4>
                  <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                    {isAr ? 'قم بحل أي اختبار من الصفحة الرئيسية لتبدأ إحصاءاتك بالظهور والتحليل التفصيلي هنا!' : 'Solve any science quiz from the exploration catalog to initiate your intelligence charts here.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Score progress over time Line Chart */}
                <div className="lg:col-span-8 bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-850 p-6 rounded-[28px] shadow-xs">
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-4.5 h-4.5 text-primary" />
                    <span>{isAr ? 'منحنى التطور المعرفي الأكاديمي' : 'Cognitive Growth Curve'}</span>
                  </h3>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={scoreProgressData} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                        <XAxis dataKey="date" tickLine={false} style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <YAxis tickLine={false} domain={[0, 100]} style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const item = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-right space-y-1 text-xs">
                                  <p className="font-black text-slate-100">{item.quizTitle}</p>
                                  <p className="font-bold text-indigo-400">{isAr ? `الدرجة: %${item.percentage}` : `Accuracy: ${item.percentage}%`}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{isAr ? `النتيجة: ${item.scoreText}` : `Result: ${item.scoreText}`}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="percentage" 
                          stroke="#6366f1" 
                          strokeWidth={4} 
                          dot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Score Range Distribution Bar Chart */}
                <div className="lg:col-span-4 bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-850 p-6 rounded-[28px] shadow-xs">
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2">
                    <Activity className="w-4.5 h-4.5 text-indigo-500" />
                    <span>{isAr ? 'توزيع درجات الإجابات' : 'Result Category Ratios'}</span>
                  </h3>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scoreRangeData} margin={{ left: -20, right: 5, top: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                        <XAxis dataKey="name" tickLine={false} style={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                        <YAxis tickLine={false} allowDecimals={false} style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                          {scoreRangeData.map((entry, index) => (
                            <Cell  fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            )}

            {/* SOLVING LOG TABLE */}
            {totalQuizzesSolved > 0 && (
              <div className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-850 rounded-[28px] overflow-hidden shadow-xs">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-100">{isAr ? 'سجل المحاولات والأداء التفصيلي 📖' : 'Study Attempt History 📖'}</h3>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-500 font-extrabold">{totalQuizzesSolved} {isAr ? 'محاولات' : 'Attempts'}</span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-slate-900/40 text-slate-400 font-black text-[10px] uppercase border-b border-slate-100 dark:border-slate-850">
                        <th className="px-6 py-4">{isAr ? 'الاختبار' : 'Quiz Title'}</th>
                        <th className="px-6 py-4">{isAr ? 'الدرجة' : 'Score'}</th>
                        <th className="px-6 py-4">{isAr ? 'نسبة الدقة' : 'Accuracy'}</th>
                        <th className="px-6 py-4">{isAr ? 'التاريخ والوقت' : 'Date Taken'}</th>
                        <th className="px-6 py-4 text-center">{isAr ? 'مراجعة وتقييم' : 'Feedback'}</th>
                        <th className="px-6 py-4 text-center">{isAr ? 'إعادة التحدي' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850/80 text-xs text-slate-650 dark:text-slate-300 font-medium">
                      {[...mySolvingCompletions].reverse().map((completion) => {
                        const scoreRatio = completion.totalQuestions > 0 ? (completion.score / completion.totalQuestions) : 0;
                        const accuracyStr = `${Math.round(scoreRatio * 100)}%`;
                        let badgeColor = 'bg-red-500/10 text-red-500';
                        if (scoreRatio >= 0.8) badgeColor = 'bg-emerald-500/10 text-emerald-500';
                        else if (scoreRatio >= 0.5) badgeColor = 'bg-indigo-500/10 text-indigo-500';

                        return (
                          <tr  className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="px-6 py-4.5 font-bold text-slate-800 dark:text-slate-200 max-w-[200px] truncate">{completion.quizTitle}</td>
                            <td className="px-6 py-4.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                              {completion.score} / {completion.totalQuestions}
                            </td>
                            <td className="px-6 py-4.5">
                              <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-black ${badgeColor}`}>{accuracyStr}</span>
                            </td>
                            <td className="px-6 py-4.5 text-slate-400 font-bold font-mono">
                              {new Date(completion.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="flex flex-col items-center justify-center gap-1">
                                {completion.rating ? (
                                  <div className="flex items-center text-amber-500 font-bold gap-0.5">
                                    <Star className="w-3 h-3 fill-amber-500" />
                                    <span className="text-[10px]">{completion.rating} ★</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400">-</span>
                                )}
                                {completion.feedback && (
                                  <span className="text-[10px] text-slate-400 italic max-w-[120px] truncate" title={completion.feedback}>
                                    "{completion.feedback}"
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4.5 text-center">
                              {onStartQuiz && (
                                <button
                                  onClick={() => onStartQuiz(completion.quizId)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[10px] font-black transition-all hover:scale-103 cursor-pointer"
                                >
                                  <Play className="w-2.5 h-2.5 fill-white" />
                                  <span>{isAr ? 'ابدأ من جديد' : 'Replay'}</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            
            
            
            
            className="space-y-8"
          >
            {/* CREATED QUIZZES METRICS GRIDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  label: isAr ? 'الاختبارات المؤلّفة' : 'Created Quizzes',
                  val: myCreatedQuizzes.length,
                  icon: <BookOpen className="w-5 h-5 text-indigo-500" />,
                  bg: 'bg-indigo-500/5 border-indigo-500/10'
                },
                {
                  label: isAr ? 'إجمالي لعب الطلاب والمحاولات' : 'Global Student Plays',
                  val: totalPlays,
                  icon: <Users className="w-5 h-5 text-purple-500" />,
                  bg: 'bg-purple-500/5 border-purple-500/10'
                },
                {
                  label: isAr ? 'متوسط تقييم اختباراتي' : 'Average Rating',
                  val: `${creatorAvgRating} ★`,
                  icon: <Star className="w-5 h-5 text-amber-500 animate-pulse" />,
                  bg: 'bg-amber-500/5 border-amber-500/10'
                },
                {
                  label: isAr ? 'الأرباح التراكمية (٠.١٥$ لعب)' : 'Creator Earnings ($0.15/play)',
                  val: `$${totalRevenue.toFixed(2)}`,
                  icon: <Activity className="w-5 h-5 text-emerald-500 animate-bounce" />,
                  bg: 'bg-emerald-500/5 border-emerald-500/10'
                }
              ].map((m, i) => (
                <div
                  
                  
                  className={`p-5 rounded-2.5xl border bg-white dark:bg-[#0f172a] shadow-xs flex items-center justify-between group transition-all`}
                >
                  <div className="space-y-1 text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">{m.label}</span>
                    <span className="text-xl font-black text-slate-800 dark:text-white font-mono block">{m.val}</span>
                  </div>
                  <div className={`p-3 rounded-xl border flex items-center justify-center shrink-0 ${m.bg}`}>
                    {m.icon}
                  </div>
                </div>
              ))}
            </div>

            {myCreatedQuizzes.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/40 rounded-[32px] border border-slate-250/60 dark:border-slate-850 flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-450">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-700 dark:text-slate-200">{isAr ? 'لم تقم بتأليف اختبارات بعد' : 'No Created Quizzes'}</h4>
                  <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                    {isAr ? 'أنت لست ناشراً بعد. يمكنك استخدام صفحة إنشاء اختبار لتصميم اختبارات كوزمو الخاصة بك ومشاركتها مع الطلاب!' : 'Author dynamic quizzes inside the Creator workspace to populate student interaction logs and earn premium payout.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Creator Quiz Performance Plays (Bar) */}
                <div className="lg:col-span-7 bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-850 p-6 rounded-[28px] shadow-xs">
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2">
                    <Users className="w-4.5 h-4.5 text-primary" />
                    <span>{isAr ? 'معدل لعب الطلاب لكل اختبار' : 'Quiz Interactive Engagement'}</span>
                  </h3>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={myCreatedQuizzes.map(q => ({ name: q.title, plays: q.totalPlays || 0 }))} 
                        margin={{ left: -20, right: 5, top: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                        <XAxis dataKey="name" tickLine={false} style={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                        <YAxis tickLine={false} allowDecimals={false} style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <Tooltip />
                        <Bar dataKey="plays" fill="#a855f7" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Creator Category Breakdown (Pie) */}
                <div className="lg:col-span-5 bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-850 p-6 rounded-[28px] shadow-xs">
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2">
                    <BarChart3 className="w-4.5 h-4.5 text-purple-500" />
                    <span>{isAr ? 'توزيع الاختبارات حسب الفئات' : 'Category Authored Ratios'}</span>
                  </h3>
                  <div className="h-[250px] w-full flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell  fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Floating legend inside card */}
                    <div className="absolute inset-y-0 right-0 flex flex-col justify-center space-y-1 text-[10px] font-extrabold pr-4 text-slate-500 dark:text-slate-400">
                      {categoryData.map((entry, idx) => (
                        <div  className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span>{entry.name}: {entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* AUTHORING QUIZZES LOG */}
            {myCreatedQuizzes.length > 0 && (
              <div className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-850 rounded-[28px] overflow-hidden shadow-xs">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-100">{isAr ? 'تحليلات الاختبارات المؤلّفة 🏫' : 'Authoring Performance Index 🏫'}</h3>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-500 font-extrabold">{myCreatedQuizzes.length} {isAr ? 'اختبار' : 'Quizzes'}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-slate-900/40 text-slate-400 font-black text-[10px] uppercase border-b border-slate-100 dark:border-slate-850">
                        <th className="px-6 py-4">{isAr ? 'اسم الاختبار' : 'Quiz Title'}</th>
                        <th className="px-6 py-4">{isAr ? 'الأسئلة' : 'Questions'}</th>
                        <th className="px-6 py-4">{isAr ? 'مرات لعب الطلاب' : 'Total Plays'}</th>
                        <th className="px-6 py-4">{isAr ? 'متوسط تقييم النجوم' : 'Avg Rating'}</th>
                        <th className="px-6 py-4">{isAr ? 'فئة المحتوى' : 'Category'}</th>
                        <th className="px-6 py-4">{isAr ? 'صلاحية التوزيع' : 'Routing'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850/80 text-xs text-slate-650 dark:text-slate-300 font-medium">
                      {myCreatedQuizzes.map((q) => (
                        <tr  className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-4.5 font-bold text-slate-800 dark:text-slate-200 max-w-[200px] truncate">{q.title}</td>
                          <td className="px-6 py-4.5 font-mono text-slate-500 dark:text-slate-400 font-bold">{q.questions.length}</td>
                          <td className="px-6 py-4.5">
                            <span className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-500 font-black font-mono">{q.totalPlays || 0}</span>
                          </td>
                          <td className="px-6 py-4.5">
                            <div className="flex items-center text-amber-500 font-bold gap-0.5">
                              <Star className="w-3 h-3 fill-amber-500" />
                              <span className="font-mono text-[10.5px]">{q.avgRating || '5.0'} ★ ({q.ratingsCount || 0})</span>
                            </div>
                          </td>
                          <td className="px-6 py-4.5">
                            <span className="px-2.5 py-1 text-[10.5px] font-black rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-500/10">
                              {q.category || (isAr ? 'عام' : 'General')}
                            </span>
                          </td>
                          <td className="px-6 py-4.5">
                            <span className="text-[10px] text-slate-400 capitalize font-bold">
                              {q.distributionRouting || 'public'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      

    </div>
  );
}
