import * as React from 'react';
import { AlertCircle, BarChart3, BookOpenCheck, LoaderCircle } from 'lucide-react';
import {
  getInstitutionLearningGaps,
  getInstitutionLearningGapStudents,
  InstitutionLearningGap,
  InstitutionLearningGapStudent,
} from '../lib/institutions';

interface InstitutionLearningGapsPanelProps {
  institutionId: string;
  lang: 'ar' | 'en';
}

const gapStyle: Record<InstitutionLearningGap['gapLevel'], { labelAr: string; labelEn: string; badge: string; bar: string }> = {
  priority: { labelAr: 'أولوية دعم', labelEn: 'Priority support', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200', bar: 'bg-rose-500' },
  watch: { labelAr: 'تحتاج متابعة', labelEn: 'Needs review', badge: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200', bar: 'bg-amber-500' },
  strong: { labelAr: 'مستوى قوي', labelEn: 'Strong progress', badge: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200', bar: 'bg-emerald-500' },
};

export default function InstitutionLearningGapsPanel({ institutionId, lang }: InstitutionLearningGapsPanelProps) {
  const isAr = lang === 'ar';
  const [students, setStudents] = React.useState<InstitutionLearningGapStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = React.useState('');
  const [gaps, setGaps] = React.useState<InstitutionLearningGap[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void getInstitutionLearningGapStudents(institutionId)
      .then((loadedStudents) => {
        if (!active) return;
        setStudents(loadedStudents);
        setSelectedStudentId((current) => current || loadedStudents[0]?.studentId || '');
      })
      .catch((caught: any) => {
        if (active) setError(caught?.message || (isAr ? 'تعذر تحميل طلاب التحليل.' : 'Unable to load students.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [institutionId, isAr]);

  React.useEffect(() => {
    if (!selectedStudentId) {
      setGaps([]);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void getInstitutionLearningGaps(institutionId, selectedStudentId)
      .then((loadedGaps) => {
        if (active) setGaps(loadedGaps);
      })
      .catch((caught: any) => {
        if (active) setError(caught?.message || (isAr ? 'تعذر تحميل تحليل الفجوات.' : 'Unable to load learning gaps.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [institutionId, selectedStudentId, isAr]);

  const selectedStudent = students.find((student) => student.studentId === selectedStudentId);
  const priorityCount = gaps.filter((gap) => gap.gapLevel === 'priority').length;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"><BarChart3 className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">{isAr ? 'تحليل فجوات التعلّم' : 'Learning-gap analysis'}</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600 dark:text-slate-300">{isAr ? 'مؤشر عملي حسب مادة الاختبار، مبني على محاولات الطالب في فصول المؤسسة فقط.' : 'Actionable subject-level insight based only on the student’s institution classroom attempts.'}</p>
          </div>
        </div>
        {priorityCount > 0 && <span className="self-start rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-800 dark:bg-rose-500/15 dark:text-rose-200">{isAr ? `${priorityCount} فجوات أولوية` : `${priorityCount} priority gaps`}</span>}
      </div>

      {error && <div role="alert" className="mt-5 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

      <label className="mt-5 block text-xs font-black text-slate-700 dark:text-slate-200" htmlFor={`gap-student-${institutionId}`}>{isAr ? 'الطالب' : 'Student'}</label>
      <select
        id={`gap-student-${institutionId}`}
        value={selectedStudentId}
        onChange={(event) => setSelectedStudentId(event.target.value)}
        disabled={loading || students.length === 0}
        className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-violet-950"
      >
        {students.length === 0 && <option value="">{isAr ? 'لا يوجد طلاب في فصول المؤسسة بعد' : 'No students in institution classrooms yet'}</option>}
        {students.map((student) => <option key={student.studentId} value={student.studentId}>{student.studentName || student.studentId}</option>)}
      </select>

      {loading && <div className="flex items-center justify-center gap-2 py-10 text-sm font-bold text-slate-500 dark:text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" />{isAr ? 'يتم تحليل المحاولات…' : 'Analysing attempts…'}</div>}
      {!loading && selectedStudent && gaps.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5 text-center dark:border-slate-700"><BookOpenCheck className="mx-auto h-6 w-6 text-slate-400" /><p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">{isAr ? 'لا توجد محاولات مكتملة كافية لهذا الطالب بعد.' : 'There are no completed attempts to analyse for this student yet.'}</p></div>}
      {!loading && gaps.length > 0 && <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {gaps.map((gap) => {
          const style = gapStyle[gap.gapLevel];
          return <article key={`${gap.studentId}-${gap.category}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-start justify-between gap-2"><h3 className="min-w-0 truncate text-sm font-black text-slate-900 dark:text-white">{gap.category}</h3><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${style.badge}`}>{isAr ? style.labelAr : style.labelEn}</span></div>
            <div className="mt-4 flex items-end justify-between"><p className="text-3xl font-black text-slate-950 dark:text-white">{gap.masteryPercent}<span className="text-base">%</span></p><p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{isAr ? `${gap.quizzesTaken} محاولات` : `${gap.quizzesTaken} attempts`}</p></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className={`h-full rounded-full ${style.bar}`} style={{ width: `${gap.masteryPercent}%` }} /></div>
            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">{isAr ? `متوسط الدرجات: ${gap.averageScore}%` : `Average score: ${gap.averageScore}%`}</p>
          </article>;
        })}
      </div>}
    </section>
  );
}
