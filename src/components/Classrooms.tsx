import React, { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, Plus, Code, Users, Copy, Check, ShieldAlert,
  ArrowRight, Award, Clock, Star, BookOpen, Trash2, ShieldCheck, 
  ExternalLink, UserPlus, Sparkles, Lock, Shield, Send, Paperclip,
  Volume2, Bell, FileText, Image, Download, FolderOpen, Info, 
  MessageSquare, PlusCircle, Calendar, ClipboardList, Megaphone, 
  CheckCircle, BarChart2, Settings, Sliders, Play, Trash, FileUp, 
  ChevronRight, Users2, SendHorizontal, AlertCircle
} from 'lucide-react';
import { playChimeSound } from './ExtraFeatures';
import { getApiUrl } from '../lib/origin';
import { encryptMessage, decryptMessage } from '../lib/encryption';
import { supabase } from '../lib/supabaseClient';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, Tooltip as ChartTooltip, Cell, PieChart, Pie 
} from 'recharts';

interface Classroom {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  createdBy: string;
  creatorName: string;
  allowStudentMessages?: boolean;
  allowStudentMedia?: boolean;
}

interface ClassroomStudent {
  id: string;
  classCode: string;
  classId?: string;
  studentId: string;
  studentName: string;
  studentPhoto?: string;
  joinedAt: string;
  completedQuizzes: number;
  avgScore: number;
  lastActive: string;
  role?: string;
}

interface SharedFile {
  id: string;
  classId: string;
  name: string;
  sharedByName: string;
  sharedAt: string;
  size: string;
  type: 'pdf' | 'image' | 'docx' | 'link';
  url?: string;
}

interface Assignment {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueDate: string;
  maxPoints: number;
  sharedByName: string;
  sharedAt: string;
}

interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  content: string;
  grade?: number;
  feedback?: string;
}

interface Announcement {
  id: string;
  classId: string;
  content: string;
  priority: 'general' | 'important' | 'urgent';
  postedByName: string;
  postedAt: string;
  reactions: Record<string, number>;
}

interface ToastMessage {
  id: string;
  title: string;
  body: string;
  type: 'message' | 'quiz' | 'info';
}

function DecryptedClassMessage({ msg, classId, isAr, onStartQuiz }: { msg: any; classId: string; isAr: boolean; onStartQuiz?: (quizId: string) => void }) {
  const [decrypted, setDecrypted] = useState<string>('...');
  const [isQuiz, setIsQuiz] = useState(false);
  const [quizId, setQuizId] = useState('');
  const [quizTitle, setQuizTitle] = useState('');

  useEffect(() => {
    let active = true;
    decryptMessage(msg.encryptedText, classId).then(res => {
      if (active) {
        setDecrypted(res);
        if (res.startsWith('[QUIZ_EMBED:')) {
          setIsQuiz(true);
          const parts = res.split(':');
          setQuizId(parts[1] || '');
          setQuizTitle((parts[2] || '').replace(']', '') || '');
        }
      }
    });
    return () => { active = false; };
  }, [msg.encryptedText, classId]);

  if (isQuiz) {
    return (
      <div 
        
        
        className="my-3 p-5 rounded-3xl bg-gradient-to-br from-indigo-950/90 via-purple-950/50 to-slate-950 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] space-y-3 max-w-sm"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full font-bold uppercase block w-max mb-1">
              {isAr ? '👾 كويز مباشر متفاعل' : '👾 Live Interactive Quiz'}
            </span>
            <h5 className="font-bold text-white text-xs">{quizTitle}</h5>
          </div>
        </div>
        <p className="text-[10px] text-slate-300 leading-relaxed">
          {isAr 
            ? 'عين المعلم هذا الاختبار المباشر لفصلك الدراسي. اضغط للبدء واختبار معلوماتك فوراً!' 
            : 'The teacher assigned this quiz to your classroom. Click the button below to start solving and test your knowledge.'}
        </p>
        <button 
          onClick={() => {
            playChimeSound('correct');
            if (onStartQuiz && quizId) {
              onStartQuiz(quizId);
            } else {
              window.location.hash = `#/quiz/${quizId}`;
            }
          }}
          className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer text-center"
        >
          {isAr ? 'صاروخ الحل 🚀 ابدأ الكويز' : 'Launch Quiz 🚀 Solve Now'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800/60 text-slate-200 px-4 py-3 rounded-2xl text-xs leading-relaxed max-w-md select-text break-words">
      {decrypted}
    </div>
  );
}

interface ClassroomsProps {
  lang: 'ar' | 'en';
  currentUserId: string;
  currentUserName: string;
  currentUserPhoto?: string;
  userRole: 'student' | 'teacher';
  userPlan?: 'Free' | 'Silver' | 'Gold' | 'Diamond';
  currentUserEmail?: string | null;
  onStartQuiz?: (quizId: string) => void;
}

export default function Classrooms({
  lang,
  currentUserId,
  currentUserName,
  currentUserPhoto,
  userRole,
  userPlan = 'Free',
  currentUserEmail,
  onStartQuiz
}: ClassroomsProps) {
  const isAr = lang === 'ar';
  const isAdmin = currentUserEmail === 'adman777888999@gmail.com' || currentUserId === 'adman777888999';

  // Seed default classrooms
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => {
    try {
      const stored = localStorage.getItem('classroom_list');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    const defaults: Classroom[] = [
      {
        id: 'default-1',
        name: isAr ? 'الفيزياء المتقدمة - الصف الثالث' : 'Advanced Physics - Grade 12',
        code: 'PHYS12',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'teacher-default',
        creatorName: isAr ? 'أ. أحمد خالد' : 'Prof. Ahmed Khaled'
      },
      {
        id: 'default-2',
        name: isAr ? 'تحدي كود بايثون البرمجي' : 'Python Coding Challenge',
        code: 'PYTH01',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'teacher-default-2',
        creatorName: isAr ? 'أ. سارة المنصوري' : 'Prof. Sarah Al-Mansouri'
      }
    ];
    localStorage.setItem('classroom_list', JSON.stringify(defaults));
    return defaults;
  });

  const [classroomStudents, setClassroomStudents] = useState<ClassroomStudent[]>(() => {
    try {
      const stored = localStorage.getItem('classroom_students_list');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    const defaults: ClassroomStudent[] = [
      {
        id: 'student-seed-1',
        classCode: 'PHYS12',
        studentId: 'student-1',
        studentName: isAr ? 'يوسف الحربي' : 'Yousef Al-Harbi',
        joinedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        completedQuizzes: 12,
        avgScore: 94.5,
        lastActive: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
      },
      {
        id: 'student-seed-2',
        classCode: 'PHYS12',
        studentId: 'student-2',
        studentName: isAr ? 'فاطمة العتيبي' : 'Fatima Al-Otaibi',
        joinedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        completedQuizzes: 9,
        avgScore: 88.2,
        lastActive: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
      },
      {
        id: 'student-seed-3',
        classCode: 'PHYS12',
        studentId: 'student-3',
        studentName: isAr ? 'خالد الشمري' : 'Khaled Al-Shammari',
        joinedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        completedQuizzes: 15,
        avgScore: 97.1,
        lastActive: new Date(Date.now() - 5 * 60 * 1000).toISOString()
      },
      {
        id: 'student-seed-4',
        classCode: 'PYTH01',
        studentId: 'student-3',
        studentName: isAr ? 'خالد الشمري' : 'Khaled Al-Shammari',
        joinedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        completedQuizzes: 6,
        avgScore: 91.0,
        lastActive: new Date(Date.now() - 5 * 60 * 1000).toISOString()
      }
    ];
    localStorage.setItem('classroom_students_list', JSON.stringify(defaults));
    return defaults;
  });

  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>(() => {
    try {
      const stored = localStorage.getItem('classroom_files_list');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    const defaults: SharedFile[] = [
      {
        id: 'file-1',
        classId: 'default-1',
        name: isAr ? 'ملخص قوانين الميكانيكا - الباب الأول.pdf' : 'Mechanics Laws Summary - Chapter 1.pdf',
        sharedByName: isAr ? 'أ. أحمد خالد' : 'Prof. Ahmed Khaled',
        sharedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        size: '2.4 MB',
        type: 'pdf'
      },
      {
        id: 'file-2',
        classId: 'default-1',
        name: isAr ? 'رسوم توضيحية لظاهرة الحيود والتداخل.png' : 'Diffraction & Interference Diagrams.png',
        sharedByName: isAr ? 'أ. أحمد خالد' : 'Prof. Ahmed Khaled',
        sharedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        size: '1.5 MB',
        type: 'image'
      },
      {
        id: 'file-3',
        classId: 'default-2',
        name: isAr ? 'أساسيات لغة بايثون من الصفر.pdf' : 'Python Basics From Scratch.pdf',
        sharedByName: isAr ? 'أ. سارة المنصوري' : 'Prof. Sarah Al-Mansouri',
        sharedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
        size: '3.1 MB',
        type: 'pdf'
      }
    ];
    localStorage.setItem('classroom_files_list', JSON.stringify(defaults));
    return defaults;
  });

  // Unique SaaS Educational Features: Assignments, Announcements, Submissions
  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    try {
      const stored = localStorage.getItem('classroom_assignments_list');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return [
      {
        id: 'assign-1',
        classId: 'default-1',
        title: isAr ? 'بحث قانون نيوتن الثالث للجاذبية الكونية' : 'Newton Third Law of Gravitation Report',
        description: isAr 
          ? 'اكتب تقريراً مفصلاً مدعوماً بالمعادلات الرياضية حول تطبيقات قانون نيوتن الثالث في الدفع النفاث للمكوك الفضائي.' 
          : 'Write a comprehensive report supported by mathematics on Newtonian third-law applications in aerospace rocket jet propulsion.',
        dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
        maxPoints: 100,
        sharedByName: isAr ? 'أ. أحمد خالد' : 'Prof. Ahmed Khaled',
        sharedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'assign-2',
        classId: 'default-2',
        title: isAr ? 'بناء دالة التكرار الحسابي العودية' : 'Recursive Factorial Function Builder',
        description: isAr 
          ? 'قم بكتابة خوارزمية بلغة بايثون لحساب مضروب الأرقام بطريقة العودية واستدعاء الذات مع معالجة الأخطاء.' 
          : 'Write a clean recursive Python algorithm to compute number factorials, complete with edge error exception handling.',
        dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
        maxPoints: 50,
        sharedByName: isAr ? 'أ. سارة المنصوري' : 'Prof. Sarah Al-Mansouri',
        sharedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
      }
    ];
  });

  const [submissions, setSubmissions] = useState<Submission[]>(() => {
    try {
      const stored = localStorage.getItem('classroom_submissions_list');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return [
      {
        id: 'sub-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        studentName: 'Yousef Al-Harbi',
        submittedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        content: 'Newton Third Law states that for every action there is an equal and opposite reaction. In rockets, the high-speed exhaust gas pushed backward creates an forward thrust pushing the rocket into space...',
        grade: 95,
        feedback: 'Excellent integration of propulsion formulas!'
      }
    ];
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    try {
      const stored = localStorage.getItem('classroom_announcements_list');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return [
      {
        id: 'ann-1',
        classId: 'default-1',
        content: isAr 
          ? '🚨 تذكير هام لجميع الطلاب: غداً هو الموعد النهائي لحل كويز الفيزياء الفلكية التجريبي الحصري. يرجى التركيز!' 
          : '🚨 Important Reminder: Tomorrow is the absolute deadline for resolving the AstroPhysics Practice quiz. Focus up!',
        priority: 'urgent',
        postedByName: isAr ? 'أ. أحمد خالد' : 'Prof. Ahmed Khaled',
        postedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        reactions: { '🚀': 8, '❤️': 12, '👍': 15 }
      }
    ];
  });

  // Local state managers
  const [classCodeInput, setClassCodeInput] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeClassroomView, setActiveClassroomView] = useState<Classroom | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  // E2EE Messaging States
  const [activeClassroomMessages, setActiveClassroomMessages] = useState<any[]>([]);
  const [chatMessageText, setChatMessageText] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Expanded 11 SaaS Workspace Tabs
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'overview' | 'discussion' | 'quizzes' | 'assignments' | 'files' | 'members' | 'announcements' | 'grades' | 'calendar' | 'analytics' | 'settings'>('overview');
  
  // Custom Assignment Builder State
  const [isCreatingAssign, setIsCreatingAssign] = useState(false);
  const [newAssignTitle, setNewAssignTitle] = useState('');
  const [newAssignDesc, setNewAssignDesc] = useState('');
  const [newAssignDueDate, setNewAssignDueDate] = useState('');
  const [newAssignPoints, setNewAssignPoints] = useState(100);

  // Custom Student Submit Assignment State
  const [submittingAssignId, setSubmittingAssignId] = useState<string | null>(null);
  const [submitContentText, setSubmitContentText] = useState('');

  // Grading Modal State
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [gradePoints, setGradePoints] = useState(100);
  const [gradeFeedback, setGradeFeedback] = useState('');

  // Announcement Creator State
  const [isCreatingAnn, setIsCreatingAnn] = useState(false);
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'general' | 'important' | 'urgent'>('general');

  // Drag and drop state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // AI Generator Prompt Modal
  const [isAiQuizOpen, setIsAiQuizOpen] = useState(false);
  const [aiQuizTopic, setAiQuizTopic] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Sync helpers
  useEffect(() => { localStorage.setItem('classroom_list', JSON.stringify(classrooms)); }, [classrooms]);
  useEffect(() => { localStorage.setItem('classroom_students_list', JSON.stringify(classroomStudents)); }, [classroomStudents]);
  useEffect(() => { localStorage.setItem('classroom_files_list', JSON.stringify(sharedFiles)); }, [sharedFiles]);
  useEffect(() => { localStorage.setItem('classroom_assignments_list', JSON.stringify(assignments)); }, [assignments]);
  useEffect(() => { localStorage.setItem('classroom_submissions_list', JSON.stringify(submissions)); }, [submissions]);
  useEffect(() => { localStorage.setItem('classroom_announcements_list', JSON.stringify(announcements)); }, [announcements]);

  // Toast notifier
  const triggerToast = (title: string, body: string, type: 'message' | 'quiz' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, body, type }]);
    setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 5000);
  };

  // Fetch PostgreSQL Classrooms & Students
  useEffect(() => {
    const fetchClassroomsData = async () => {
      try {
        const { data: d1 } = await supabase.from('classrooms').select('*');
        if (d1 && d1.length > 0) setClassrooms(d1.map(c => ({
          id: c.id, name: c.name, code: c.code, createdAt: c.created_at,
          createdBy: c.created_by, creatorName: c.creator_name,
          allowStudentMessages: c.allow_student_messages, allowStudentMedia: c.allow_student_media
        })));
        
        const { data: d2 } = await supabase.from('classroom_students').select('*');
        if (d2 && d2.length > 0) setClassroomStudents(d2.map(s => ({
          id: s.id, classCode: s.class_code, classId: s.class_id, studentId: s.student_id,
          studentName: s.student_name, studentPhoto: s.student_photo, joinedAt: s.joined_at,
          completedQuizzes: s.completed_quizzes, avgScore: s.avg_score, lastActive: s.last_active, role: s.role
        })));
      } catch (err) {
        console.error('Error fetching classrooms data:', err);
      }
    };
    fetchClassroomsData();
  }, []);

  // Poll for messages in active classroom
  useEffect(() => {
    if (!activeClassroomView) return;
    let isMounted = true;
    let initialLoad = true;

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase.from('classroom_messages')
          .select('*')
          .eq('classroom_id', activeClassroomView.id)
          .order('created_at', { ascending: true });
        if (!isMounted || error || !data) return;
        const formatted = data.map(m => ({
          id: m.id, senderId: m.sender_id, senderName: m.sender_name, senderPhoto: m.sender_photo, encryptedText: m.encrypted_text, createdAt: m.created_at
        }));
        setActiveClassroomMessages(prev => {
          if (!initialLoad && formatted.length > prev.length) {
            const newMsgs = formatted.slice(prev.length);
            newMsgs.forEach(m => {
              if (m.senderId === currentUserId) return;
              decryptMessage(m.encryptedText, activeClassroomView.id).then(decrypted => {
                const isQuizMsg = decrypted.startsWith('[QUIZ_EMBED:');
                let toastTitle = isAr ? 'رسالة جديدة 💬' : 'New Message 💬';
                let toastBody = `${m.senderName}: ${decrypted}`;
                if (isQuizMsg) {
                  const quizTitle = decrypted.split(':')[2]?.replace(']', '') || '';
                  toastTitle = isAr ? '👾 كويز جديد متوفر!' : '👾 New Quiz Available!';
                  toastBody = isAr ? `قام المعلم بنشر كويز جديد: ${quizTitle}` : `The teacher published a new quiz: ${quizTitle}`;
                }
                triggerToast(toastTitle, toastBody, isQuizMsg ? 'quiz' : 'message');
              });
            });
          }
          initialLoad = false;
          return formatted;
        });
      } catch (err) {
        console.error('Error loading classroom messages:', err);
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeClassroomView, currentUserId, isAr]);

  // Deep linking join classroom
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#/join/')) {
      const code = hash.replace('#/join/', '').split('?')[0].trim();
      if (code) {
        setClassCodeInput(code);
        window.history.pushState(null, '', window.location.pathname + window.location.search);
        triggerToast(
          isAr ? '🔗 رمز دعوة تلقائي' : '🔗 Auto Invitation Detected',
          isAr ? 'تم سحب رمز الفصل تلقائياً من الرابط للتسجيل.' : 'Class code retrieved from URL.',
          'info'
        );
      }
    }
  }, [isAr]);

  const handleJoinByCode = async (codeToJoin?: string) => {
    const targetCode = (codeToJoin || classCodeInput).trim().toUpperCase();
    if (!targetCode) return;

    if (isAdmin) {
      const targetClass = classrooms.find(c => c.code.toUpperCase() === targetCode);
      if (targetClass) {
        playChimeSound('correct');
        setActiveClassroomView(targetClass);
        triggerToast(
          isAr ? '🕵️‍♂️ وضع الشبح نشط' : '🕵️‍♂️ Ghost Mode Active',
          isAr ? 'تم الدخول الفوري دون ترك أي أثر في قائمة الطلاب.' : 'Seamless ghost entry granted.',
          'info'
        );
      } else {
        setErrorText(isAr ? 'عذراً، هذا الرمز غير صحيح.' : 'Sorry, invalid classroom code.');
      }
      return;
    }

    setIsJoining(true);
    setErrorText(null);
    try {
      const { data: classData } = await supabase.from('classrooms').select('*').ilike('code', targetCode).single();
      if (!classData) throw new Error(isAr ? 'عذراً، هذا الرمز غير صحيح.' : 'Sorry, invalid classroom code.');
      
      const { error } = await supabase.from('classroom_students').insert({
        class_code: targetCode,
        class_id: classData.id,
        student_id: currentUserId,
        student_name: currentUserName,
        student_photo: currentUserPhoto,
        joined_at: new Date().toISOString()
      });

      if (error) throw new Error(error.message);

      const { data: freshClassrooms } = await supabase.from('classrooms').select('*');
      if (freshClassrooms) {
        const mapped = freshClassrooms.map(c => ({
          id: c.id, name: c.name, code: c.code, createdAt: c.created_at,
          createdBy: c.created_by, creatorName: c.creator_name,
          allowStudentMessages: c.allow_student_messages, allowStudentMedia: c.allow_student_media
        }));
        setClassrooms(mapped);
        const joinedClass = mapped.find(c => c.code.toUpperCase() === targetCode);
        if (joinedClass) {
          playChimeSound('correct');
          setActiveClassroomView(joinedClass);
          setSuccessText(isAr ? 'تم الانضمام للفصل الدراسي بنجاح!' : 'Joined classroom successfully!');
          setClassCodeInput('');
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Error joining classroom');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateClassroom = async () => {
    const name = newClassName.trim();
    if (!name) return;

    try {
      const { data: newClass, error } = await supabase.from('classrooms').insert({
        name,
        created_by: currentUserId,
        creator_name: currentUserName
      }).select().single();

      if (error) throw new Error(error.message);

      const result = {
        id: newClass.id, name: newClass.name, code: newClass.code, createdAt: newClass.created_at,
        createdBy: newClass.created_by, creatorName: newClass.creator_name,
        allowStudentMessages: newClass.allow_student_messages, allowStudentMedia: newClass.allow_student_media
      };

      playChimeSound('correct');
      setClassrooms(prev => [result, ...prev]);
      setActiveClassroomView(result);
      setNewClassName('');
      setSuccessText(isAr ? 'تم إنشاء فصلك الدراسي الفخم بنجاح!' : 'Classroom workspace established successfully!');
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Error establishing classroom');
    }
  };

  const handleDeleteClassroom = async (classId: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد تماماً من حذف هذا الفصل وسجلاته؟' : 'Are you sure you want to delete this classroom?')) return;
    try {
      const { error } = await supabase.from('classrooms').delete().eq('id', classId);
      if (!error) {
        setClassrooms(prev => prev.filter(c => c.id !== classId));
        if (activeClassroomView?.id === classId) setActiveClassroomView(null);
        playChimeSound('wrong');
      } else {
        console.error('Error deleting classroom:', error.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyInviteLink = (code: string) => {
    const url = `${window.location.origin}/#/join/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCode(code);
      playChimeSound('click');
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const handleSendChatMessage = async () => {
    const text = chatMessageText.trim();
    if (!text || !activeClassroomView) return;

    setIsSendingChat(true);
    try {
      const encrypted = await encryptMessage(text, activeClassroomView.id);
      const { error } = await supabase.from('classroom_messages').insert({
        classroom_id: activeClassroomView.id,
        sender_id: currentUserId,
        sender_name: currentUserName,
        sender_photo: currentUserPhoto,
        encrypted_text: encrypted
      });

      if (error) throw new Error(error.message);
      setChatMessageText('');
      playChimeSound('click');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Files tab operations
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!activeClassroomView) return;
    const isCreator = activeClassroomView.createdBy === currentUserId;
    const myStudent = classroomStudents.find(s => s.classCode === activeClassroomView.code && s.studentId === currentUserId);
    const isCoMod = myStudent?.role === 'co-moderator';
    const allowMedia = isCreator || isCoMod || (activeClassroomView.allowStudentMedia !== false);

    if (!allowMedia && !isAdmin) {
      setErrorText(isAr ? 'عذراً، رفع الملفات معطل حالياً من المعلم.' : 'File uploads are restricted by the teacher.');
      playChimeSound('wrong');
      return;
    }

    const fileSizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    const ext = file.name.split('.').pop()?.toLowerCase();
    const typeMapped = ext === 'pdf' ? 'pdf' : (['png', 'jpg', 'jpeg', 'gif'].includes(ext || '') ? 'image' : 'docx');

    const newFile: SharedFile = {
      id: 'file-' + Math.random().toString(36).substring(2, 9),
      classId: activeClassroomView.id,
      name: file.name,
      sharedByName: currentUserName,
      sharedAt: new Date().toISOString(),
      size: fileSizeStr,
      type: typeMapped as any
    };

    setSharedFiles(prev => [newFile, ...prev]);
    playChimeSound('correct');
    triggerToast(
      isAr ? '📁 تم رفع الملف بنجاح!' : '📁 File Shared Successfully!',
      file.name,
      'info'
    );
  };

  // Assignment Creator Operation
  const handleCreateAssignment = () => {
    if (!newAssignTitle.trim() || !activeClassroomView) return;

    const newAssign: Assignment = {
      id: 'assign-' + Math.random().toString(36).substring(2, 9),
      classId: activeClassroomView.id,
      title: newAssignTitle,
      description: newAssignDesc,
      dueDate: newAssignDueDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      maxPoints: Number(newAssignPoints) || 100,
      sharedByName: currentUserName,
      sharedAt: new Date().toISOString()
    };

    setAssignments(prev => [newAssign, ...prev]);
    setIsCreatingAssign(false);
    setNewAssignTitle('');
    setNewAssignDesc('');
    setNewAssignDueDate('');
    setNewAssignPoints(100);
    playChimeSound('correct');
    triggerToast(
      isAr ? '📝 تم نشر تكليف دراسي!' : '📝 Assignment Published!',
      newAssign.title,
      'info'
    );
  };

  // Student Submit Assignment
  const handleSubmitAssignment = () => {
    if (!submitContentText.trim() || !submittingAssignId) return;

    const newSub: Submission = {
      id: 'sub-' + Math.random().toString(36).substring(2, 9),
      assignmentId: submittingAssignId,
      studentId: currentUserId,
      studentName: currentUserName,
      submittedAt: new Date().toISOString(),
      content: submitContentText
    };

    setSubmissions(prev => [newSub, ...prev]);
    setSubmittingAssignId(null);
    setSubmitContentText('');
    playChimeSound('correct');
    triggerToast(
      isAr ? '🚀 تم تسليم الواجب بنجاح!' : '🚀 Work Submitted Successfully!',
      isAr ? 'تم حفظ إجابتك وتسليمها للمراجعة والتقييم.' : 'Your solution has been submitted for grading.',
      'info'
    );
  };

  // Grade Submission Operation
  const handleGradeSubmission = () => {
    if (!gradingSubmission) return;

    setSubmissions(prev => prev.map(sub => {
      if (sub.id === gradingSubmission.id) {
        return {
          ...sub,
          grade: Number(gradePoints),
          feedback: gradeFeedback
        };
      }
      return sub;
    }));

    setGradingSubmission(null);
    setGradePoints(100);
    setGradeFeedback('');
    playChimeSound('correct');
    triggerToast(
      isAr ? '🌟 تم تقييم وتصحيح التكليف' : '🌟 Solutions Graded!',
      isAr ? 'تم رصد الدرجة للارتجاع المدرسي والطلاب.' : 'The grades were logged successfully.',
      'info'
    );
  };

  // Announcement Creator Operation
  const handleCreateAnnouncement = () => {
    if (!annContent.trim() || !activeClassroomView) return;

    const newAnn: Announcement = {
      id: 'ann-' + Math.random().toString(36).substring(2, 9),
      classId: activeClassroomView.id,
      content: annContent,
      priority: annPriority,
      postedByName: currentUserName,
      postedAt: new Date().toISOString(),
      reactions: { '🚀': 0, '❤️': 0, '👍': 0 }
    };

    setAnnouncements(prev => [newAnn, ...prev]);
    setIsCreatingAnn(false);
    setAnnContent('');
    setAnnPriority('general');
    playChimeSound('correct');
    triggerToast(
      isAr ? '📢 تم نشر إعلان دراسي عام' : '📢 Broadcast Released!',
      isAr ? 'تم تعليق الإعلان في لوحة النشرات.' : 'Classboard update has been pinned.',
      'info'
    );
  };

  const handleAddReaction = (annId: string, emoji: string) => {
    setAnnouncements(prev => prev.map(ann => {
      if (ann.id === annId) {
        return {
          ...ann,
          reactions: {
            ...ann.reactions,
            [emoji]: (ann.reactions[emoji] || 0) + 1
          }
        };
      }
      return ann;
    }));
    playChimeSound('click');
  };

  // AI Quiz Generator Integration
  const handleTriggerAiQuiz = async () => {
    if (!aiQuizTopic.trim() || !activeClassroomView) return;
    setIsAiGenerating(true);
    try {
      // In a serverless architecture, we prompt the user to use the QuizCreator page 
      // where the AI generation logic is already handled on the client side.
      setTimeout(() => {
        playChimeSound('correct');
        setIsAiQuizOpen(false);
        setAiQuizTopic('');
        triggerToast(
          isAr ? '🤖 جاهز للإنشاء!' : '🤖 Ready to Generate!',
          isAr ? 'انتقل لصفحة "إنشاء اختبار" واكتب موضوعك هناك للتوليد بالذكاء الاصطناعي مباشرة.' : 'Go to the Quiz Creator page and enter your topic to generate via AI directly.',
          'quiz'
        );
      }, 1000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Permissions settings operations
  const handleUpdatePermissions = async (allowMessages: boolean, allowMedia: boolean) => {
    if (!activeClassroomView) return;
    try {
      const { error } = await supabase.from('classrooms').update({
        allow_student_messages: allowMessages,
        allow_student_media: allowMedia
      }).eq('id', activeClassroomView.id);

      if (!error) {
        setActiveClassroomView(prev => prev ? { ...prev, allowStudentMessages: allowMessages, allowStudentMedia: allowMedia } : null);
        setClassrooms(prev => prev.map(c => c.id === activeClassroomView.id ? { ...c, allowStudentMessages: allowMessages, allowStudentMedia: allowMedia } : c));
        playChimeSound('click');
        setSuccessText(isAr ? 'تم تعديل صلاحيات طلاب الفصل بنجاح!' : 'Student permission indexes updated!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Determine user contexts
  const isTeacher = userPlan !== 'Free';
  const myCreatedClasses = classrooms.filter(c => c.createdBy === currentUserId || isAdmin);
  const enrolledClasses = classrooms.filter(c => {
    const studentExists = classroomStudents.some(s => s.classCode === c.code && s.studentId === currentUserId);
    return studentExists && c.createdBy !== currentUserId;
  });

  const renderSidebar = () => (
    <div className="w-full md:w-80 bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 p-6 flex flex-col gap-6">
      {/* Join Box */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-purple-400" />
          <span>{isAr ? 'ولوج الفصول الذكية' : 'Enter Smart Classroom'}</span>
        </h3>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          {isAr 
            ? 'أدخل الكود لمزامنة مسارك التعليمي، المذاكرة، وحل الكويزات المباشرة.' 
            : 'Enter classroom code to synchronize homeworks, calendar events, and live quiz channels.'}
        </p>
        <div className="flex gap-2">
          <input 
            type="text"
            value={classCodeInput}
            onChange={(e) => setClassCodeInput(e.target.value)}
            placeholder={isAr ? 'مثال: PHYS12' : 'e.g. PHYS12'}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-purple-500"
          />
          <button 
            onClick={() => handleJoinByCode()}
            disabled={isJoining}
            className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-4 text-xs font-black transition-all cursor-pointer flex items-center justify-center"
          >
            {isJoining ? '...' : (isAr ? 'دخول' : 'Join')}
          </button>
        </div>
      </div>

      {/* Teacher Creation Box */}
      {isTeacher && (
        <div className="space-y-3 pt-6 border-t border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? 'تأسيس فصل تعليمي' : 'Establish Workspace'}</span>
          </h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isAr ? 'صمم بيئة تفاعلية لإدارة التكليفات والحلول، والدردشة مع طلابك.' : 'Create a structured space to dispatch exercises, grades, and resources.'}
          </p>
          <div className="flex gap-2">
            <input 
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder={isAr ? 'اسم المادة أو الصف الدراسى' : 'Class/Subject Title'}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button 
              onClick={handleCreateClassroom}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4 text-xs font-black transition-all cursor-pointer"
            >
              {isAr ? 'إنشاء' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Classrooms List Group */}
      <div className="space-y-4 pt-6 border-t border-slate-800 flex-1 overflow-y-auto max-h-[400px] no-scrollbar">
        <h4 className="text-[10px] uppercase tracking-wider font-mono text-slate-500 font-bold">
          {isAr ? 'الفصول والجروبات النشطة' : 'Classroom Workspaces'}
        </h4>

        {/* Managed */}
        {myCreatedClasses.map(c => (
          <button
            
            onClick={() => { playChimeSound('click'); setActiveClassroomView(c); setActiveWorkspaceTab('overview'); }}
            className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between text-xs cursor-pointer ${
              activeClassroomView?.id === c.id 
                ? 'bg-purple-950/20 border-purple-500/40 text-white shadow-md' 
                : 'bg-slate-950/20 border-slate-800/40 hover:border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="font-bold block truncate">{c.name}</span>
                <span className="text-[9px] font-mono text-slate-500">{c.code} • {isAr ? 'المعلم' : 'Teacher'}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          </button>
        ))}

        {/* Enrolled */}
        {enrolledClasses.map(c => (
          <button
            
            onClick={() => { playChimeSound('click'); setActiveClassroomView(c); setActiveWorkspaceTab('overview'); }}
            className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between text-xs cursor-pointer ${
              activeClassroomView?.id === c.id 
                ? 'bg-purple-950/20 border-purple-500/40 text-white shadow-md' 
                : 'bg-slate-950/20 border-slate-800/40 hover:border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="font-bold block truncate">{c.name}</span>
                <span className="text-[9px] font-mono text-slate-500">{c.code} • {c.creatorName}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          </button>
        ))}

        {myCreatedClasses.length === 0 && enrolledClasses.length === 0 && (
          <div className="text-center py-6 text-slate-600 border border-dashed border-slate-800 rounded-2xl">
            <GraduationCap className="w-8 h-8 mx-auto text-slate-800 mb-1 animate-pulse" />
            <p className="text-[10px]">{isAr ? 'لم تنضم لأي فصول بعد.' : 'No enrolled classes.'}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-140px)] gap-6" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
      
      {/* Toast Popup Pipeline */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
        
          {toasts.map(toast => (
            <div 
              
              
              
              
              className="pointer-events-auto p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex gap-3 items-start"
            >
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-white text-xs leading-none mb-1">{toast.title}</h5>
                <p className="text-[10px] text-slate-400 leading-normal">{toast.body}</p>
              </div>
            </div>
          ))}
        
      </div>

      {/* Error / Success Notifications banner */}
      {errorText && (
        <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 text-red-400 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorText}</span>
          </div>
          <button onClick={() => setErrorText(null)} className="text-red-400 font-bold hover:text-white">✕</button>
        </div>
      )}

      {successText && (
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{successText}</span>
          </div>
          <button onClick={() => setSuccessText(null)} className="text-emerald-400 font-bold hover:text-white">✕</button>
        </div>
      )}

      {!activeClassroomView ? (
        <div className="flex flex-col md:flex-row gap-6 w-full flex-1">
          {renderSidebar()}
          
          {/* Welcome Screen Empty State */}
          <div className="flex-1 bg-slate-900/20 border border-slate-800/40 rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-600/20 to-indigo-600/20 flex items-center justify-center text-purple-400 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
              <GraduationCap className="w-12 h-12" />
            </div>
            <div className="space-y-2 max-w-lg">
              <h2 className="text-2xl font-black text-white tracking-tight">
                {isAr ? 'مرحبا بك في استوديو الفصول الذكية 🚀' : 'Welcome to Classroom Hub 🚀'}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr 
                  ? 'منصتك الموحدة للأكاديميين السحابيين. تواصل، وحل الاختبارات، وشارك الملفات والمشاريع، وتابع مستواك ودرجاتك بتنظيم فائق ونظيف.' 
                  : 'Your cloud education cockpit. Collaborate on homeworks, track calendar milestones, and play interactive real-time quizzes under teacher guidance.'}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <div className="px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-2xl text-[11px] text-slate-300 font-bold flex items-center gap-2">
                <span className="text-purple-400">⚡</span>
                <span>{isAr ? 'اتصالات مشفرة بالكامل E2EE' : 'End-to-End Cryptography'}</span>
              </div>
              <div className="px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-2xl text-[11px] text-slate-300 font-bold flex items-center gap-2">
                <span className="text-emerald-400">📊</span>
                <span>{isAr ? 'لوحات تحليلات ذكية ومقاييس حية' : 'Engagement Metrics & Live Scores'}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6 w-full flex-1 overflow-hidden h-[calc(100vh-160px)]">
          {renderSidebar()}

          {/* Active Workspace */}
          <div className="flex-1 bg-slate-900/30 backdrop-blur-md rounded-3xl border border-slate-800 flex flex-col overflow-hidden relative">
            
            {/* Workspace Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                    {activeClassroomView.code}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {isAr ? 'إدارة المعلم: ' : 'Administered by: '} {activeClassroomView.creatorName}
                  </span>
                </div>
                <h2 className="text-lg font-black text-white">{activeClassroomView.name}</h2>
              </div>

              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={() => handleCopyInviteLink(activeClassroomView.code)}
                  className="px-3.5 py-2 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800 text-xs text-slate-300 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedCode === activeClassroomView.code ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isAr ? 'تم النسخ!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isAr ? 'نسخ رابط الدعوة' : 'Share Code'}</span>
                    </>
                  )}
                </button>

                <button 
                  onClick={() => setActiveClassroomView(null)}
                  className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-black transition-all cursor-pointer"
                >
                  {isAr ? 'مغادرة الفصل' : 'Exit Room'}
                </button>
              </div>
            </div>

            {/* Premium Dock Navigation - 11 Workspace Modules */}
            <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-900/40 px-6 py-2 gap-1 scrollbar-none shrink-0">
              {[
                { id: 'overview', label: isAr ? 'نظرة عامة' : 'Overview', icon: BookOpen },
                { id: 'discussion', label: isAr ? 'المناقشة والتواصل' : 'Discussion', icon: MessageSquare },
                { id: 'quizzes', label: isAr ? 'الاختبارات' : 'Quizzes', icon: Sparkles },
                { id: 'assignments', label: isAr ? 'التكليفات والواجبات' : 'Assignments', icon: ClipboardList },
                { id: 'files', label: isAr ? 'حقيبة الملفات' : 'Files', icon: FolderOpen },
                { id: 'members', label: isAr ? 'الأعضاء والطلاب' : 'Members', icon: Users2 },
                { id: 'announcements', label: isAr ? 'لوحة النشرات' : 'Notices', icon: Megaphone },
                { id: 'grades', label: isAr ? 'دفتر الدرجات' : 'Gradebook', icon: Award },
                { id: 'calendar', label: isAr ? 'التقويم' : 'Calendar', icon: Calendar },
                { id: 'analytics', label: isAr ? 'الإحصائيات' : 'Analytics', icon: BarChart2 },
                { id: 'settings', label: isAr ? 'خيارات الإدارة' : 'Settings', icon: Settings }
              ].map(tab => {
                const TabIcon = tab.icon;
                const isSelected = activeWorkspaceTab === tab.id;
                return (
                  <button
                    
                    onClick={() => { playChimeSound('click'); setActiveWorkspaceTab(tab.id as any); }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                      isSelected 
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/15' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Container for active Workspace view content */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col min-h-0">
              
              {/* TAB 1: OVERVIEW */}
              {activeWorkspaceTab === 'overview' && (
                <div className="space-y-6">
                  {/* Hero welcome banner */}
                  <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/20 to-slate-950 border border-purple-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-white">{isAr ? 'أهلاً بك في فضاء التعلم التفاعلي! 🪐' : 'Welcome to your Learning Space! 🪐'}</h3>
                      <p className="text-xs text-slate-400 max-w-xl">{isAr ? 'تتبع إنجازاتك الدراسية، وشارك في حل الكويزات المباشرة، وحل تكليفاتك المدرسية أولاً بأول لتكتسح النجوم والترتيب.' : 'Track academic goals, complete assignments, and participate in classroom activities.'}</p>
                    </div>
                    {isTeacher && activeClassroomView.createdBy === currentUserId && (
                      <button 
                        onClick={() => setIsCreatingAnn(true)}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md cursor-pointer shrink-0 transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <Megaphone className="w-4 h-4" />
                        <span>{isAr ? 'نشر إعلان عاجل' : 'Post Announcement'}</span>
                      </button>
                    )}
                  </div>

                  {/* Bento Grid Analytics Summary Rings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block leading-none mb-1">{isAr ? 'عدد الطلاب المنضمين' : 'Class Enrollment'}</span>
                        <span className="text-lg font-black font-mono text-white block">
                          {classroomStudents.filter(s => s.classCode === activeClassroomView.code).length} {isAr ? 'طالب' : 'Students'}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block leading-none mb-1">{isAr ? 'معدل درجات الفصل' : 'Class Performance'}</span>
                        <span className="text-lg font-black font-mono text-white block">
                          {(() => {
                            const students = classroomStudents.filter(s => s.classCode === activeClassroomView.code);
                            if (students.length === 0) return '0%';
                            const sum = students.reduce((acc, curr) => acc + curr.avgScore, 0);
                            return `${(sum / students.length).toFixed(1)}%`;
                          })()}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                        <ClipboardList className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block leading-none mb-1">{isAr ? 'التكليفات المنشورة' : 'Active Tasks'}</span>
                        <span className="text-lg font-black font-mono text-white block">
                          {assignments.filter(a => a.classId === activeClassroomView.id).length} {isAr ? 'تكليفات' : 'Assignments'}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 shrink-0">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block leading-none mb-1">{isAr ? 'ملفات ومصادر مشتركة' : 'Shared Resource'}</span>
                        <span className="text-lg font-black font-mono text-white block">
                          {sharedFiles.filter(f => f.classId === activeClassroomView.id).length} {isAr ? 'ملفات' : 'Files'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bulletins boards & Announcements panel */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Megaphone className="w-4 h-4 text-purple-400" />
                          <span>{isAr ? 'آخر النشرات والإعلانات الهامة' : 'Recent Announcements Board'}</span>
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {announcements.filter(a => a.classId === activeClassroomView.id).map(ann => (
                          <div  className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                              <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                ann.priority === 'urgent' 
                                  ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' 
                                  : ann.priority === 'important' 
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                                    : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                              }`}>
                                {isAr ? (ann.priority === 'urgent' ? 'عاجل جداً' : ann.priority === 'important' ? 'هام' : 'إعلان عام') : ann.priority}
                              </span>
                              <span className="text-[10px] text-slate-500">{new Date(ann.postedAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed">{ann.content}</p>
                            <div className="flex items-center gap-4 pt-2 border-t border-slate-800/60">
                              {['🚀', '❤️', '👍', '🧠'].map(emoji => (
                                <button 
                                  
                                  onClick={() => handleAddReaction(ann.id, emoji)}
                                  className="text-xs px-2.5 py-1 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/40 hover:border-slate-700 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 text-slate-400"
                                >
                                  <span>{emoji}</span>
                                  <span className="font-mono text-[10px] text-slate-400 font-bold">{ann.reactions[emoji] || 0}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                        {announcements.filter(a => a.classId === activeClassroomView.id).length === 0 && (
                          <div className="text-center py-10 text-slate-600 border border-dashed border-slate-800 rounded-2xl">
                            <Megaphone className="w-10 h-10 mx-auto text-slate-800 mb-2" />
                            <p className="text-xs">{isAr ? 'لا توجد أي إعلانات معلقة حالياً.' : 'No notices published yet.'}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Upcoming due dates list widget */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-400" />
                        <span>{isAr ? 'المهام والتكليفات القادمة' : 'Upcoming Tasks / Deadlines'}</span>
                      </h4>
                      <div className="space-y-3">
                        {assignments.filter(a => a.classId === activeClassroomView.id).map(assign => {
                          const isSubmitted = submissions.some(s => s.assignmentId === assign.id && s.studentId === currentUserId);
                          return (
                            <div  className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
                              <h5 className="font-bold text-white text-xs truncate">{assign.title}</h5>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-slate-400">{isAr ? 'تاريخ التسليم:' : 'Due:'} {assign.dueDate}</span>
                                <span className={`px-2 py-0.5 rounded-full font-bold ${
                                  isSubmitted 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
                                }`}>
                                  {isSubmitted ? (isAr ? 'تم تسليمك' : 'Submitted') : (isAr ? 'مستحق قريباً' : 'Pending')}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {assignments.filter(a => a.classId === activeClassroomView.id).length === 0 && (
                          <div className="text-center py-10 text-slate-600 border border-dashed border-slate-800 rounded-2xl">
                            <ClipboardList className="w-10 h-10 mx-auto text-slate-800 mb-2" />
                            <p className="text-xs">{isAr ? 'أنت مستعد تماماً! لا يوجد مهام معلقة.' : 'All caught up! No tasks due.'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DISCUSSION */}
              {activeWorkspaceTab === 'discussion' && (
                <div className="flex-1 flex flex-col justify-between overflow-hidden min-h-0 bg-slate-950/20 border border-slate-800/40 rounded-2xl">
                  {/* Messages list feed */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 no-scrollbar flex flex-col" ref={chatContainerRef}>
                    {activeClassroomMessages.map((msg, idx) => {
                      const isOwn = msg.senderId === currentUserId;
                      return (
                        <div 
                           
                          className={`flex gap-3 max-w-[85%] ${isOwn ? 'self-end flex-row-reverse' : 'self-start'}`}
                        >
                          <div className="relative shrink-0 self-end mb-1">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center font-bold text-xs text-slate-300">
                              {msg.senderPhoto ? (
                                <img src={msg.senderPhoto} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span>{msg.senderName.charAt(0)}</span>
                              )}
                            </div>
                            <span className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-emerald-500 border border-black rounded-full" />
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 block px-1">
                              {msg.senderName} • {msg.senderId === activeClassroomView.createdBy ? (isAr ? '👑 المعلم' : '👑 Teacher') : (isAr ? 'طالب' : 'Student')}
                            </span>
                            <DecryptedClassMessage
                              msg={msg}
                              classId={activeClassroomView.id}
                              isAr={isAr}
                              onStartQuiz={onStartQuiz}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {activeClassroomMessages.length === 0 && (
                      <div className="text-center py-20 text-slate-600 space-y-3">
                        <Lock className="w-12 h-12 text-slate-800 mx-auto animate-pulse" />
                        <h4 className="font-bold text-white text-sm">{isAr ? 'شات الطلاب مشفر كلياً E2EE' : 'End-to-End Encrypted Discussion'}</h4>
                        <p className="text-xs max-w-sm mx-auto leading-relaxed">{isAr ? 'ابدأ كتابة أول رسالة، تشفر المحتويات محلياً وتلقائياً لحماية سرية النقاشات.' : 'Start messaging! All texts are symmetrically encrypted on device before persistent database sync.'}</p>
                      </div>
                    )}
                  </div>

                  {/* Typing input composer */}
                  <div className="p-4 bg-slate-900/60 border-t border-slate-800">
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={chatMessageText}
                        onChange={(e) => setChatMessageText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendChatMessage(); }}
                        placeholder={isAr ? 'اكتب رسالة مشفرة آمنة...' : 'Write an encrypted message...'}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                      <button 
                        onClick={handleSendChatMessage}
                        disabled={isSendingChat}
                        className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-5 text-xs font-black cursor-pointer flex items-center justify-center transition-all active:scale-95"
                      >
                        {isSendingChat ? '...' : <SendHorizontal className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: QUIZZES */}
              {activeWorkspaceTab === 'quizzes' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-black text-white">{isAr ? 'قنوات الكويزات التفاعلية المباشرة' : 'Interactive Quiz checkpoints'}</h4>
                      <p className="text-xs text-slate-400 mt-1">{isAr ? 'حل كويزات المعلم المباشرة أو اطلب من كوزمو توليد مسودة اختبار فوري.' : 'Solve assigned tests or prompt Cosmo AI to generate a quiz draft.'}</p>
                    </div>

                    {isTeacher && activeClassroomView.createdBy === currentUserId && (
                      <button 
                        onClick={() => setIsAiQuizOpen(true)}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        <span>{isAr ? 'توليد اختبار بالذكاء الاصطناعي' : 'AI Quiz Generator'}</span>
                      </button>
                    )}
                  </div>

                  {/* Quiz Cards Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* Render live embeds or active listings */}
                    <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          {isAr ? 'كويز مدمج بالفصل' : 'Classroom embed'}
                        </span>
                        <div className="flex gap-0.5 text-amber-400">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </div>
                      </div>
                      <div>
                        <h5 className="font-bold text-white text-sm">{isAr ? 'تقنيات التشفير المتقدمة E2EE' : 'Advanced Encryption Mechanics'}</h5>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{isAr ? 'اختبر مهاراتك في فهم طرق التشفير ومزامنة المفاتيح المتناظرة.' : 'Test your cryptography skill on sym-keys and handshake protocols.'}</p>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                        <span>10 {isAr ? 'أسئلة' : 'Questions'}</span>
                        <span>15 {isAr ? 'دقيقة' : 'Minutes'}</span>
                      </div>
                      <button 
                        onClick={() => triggerToast(isAr ? 'الكويز قيد التحميل' : 'Loading Quiz', isAr ? 'يتم سحب الاختبار من الأرشيف الدراسي...' : 'Fetching checklist...', 'info')}
                        className="w-full py-2.5 bg-slate-950 border border-slate-800 hover:border-purple-500/40 hover:text-white rounded-xl text-xs font-black text-slate-400 transition-all cursor-pointer"
                      >
                        {isAr ? 'ابدأ الصاروخ 🚀' : 'Launch Rocket 🚀'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ASSIGNMENTS */}
              {activeWorkspaceTab === 'assignments' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-black text-white">{isAr ? 'تكليفات وواجبات الفصل الدراسي' : 'Classroom Homework Assignments'}</h4>
                      <p className="text-xs text-slate-400 mt-1">{isAr ? 'تابع المواعيد النهائية، سلم واجباتك يدوياً، واستقبل درجاتك وملاحظات المعلم.' : 'Track submissions, submit homeworks, and receive feedback.'}</p>
                    </div>

                    {isTeacher && activeClassroomView.createdBy === currentUserId && (
                      <button 
                        onClick={() => setIsCreatingAssign(true)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isAr ? 'إضافة تكليف دراسي' : 'Publish Homework'}</span>
                      </button>
                    )}
                  </div>

                  {/* Assignment Creator Form Modal Drawer */}
                  {isCreatingAssign && (
                    <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
                      <h5 className="font-bold text-white text-sm">{isAr ? 'إنشاء تكليف مادة دراسي جديد' : 'Publish New Assignment'}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                          type="text" 
                          placeholder={isAr ? 'عنوان التكليف' : 'Assignment Title'} 
                          value={newAssignTitle}
                          onChange={(e) => setNewAssignTitle(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                        <input 
                          type="date" 
                          value={newAssignDueDate}
                          onChange={(e) => setNewAssignDueDate(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                        <input 
                          type="number" 
                          placeholder={isAr ? 'الدرجة العظمى' : 'Max Points'} 
                          value={newAssignPoints}
                          onChange={(e) => setNewAssignPoints(Number(e.target.value))}
                          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <textarea 
                        placeholder={isAr ? 'وصف التكليف والتعليمات التفصيلية للحل' : 'Detailed requirements and descriptions...'} 
                        value={newAssignDesc}
                        onChange={(e) => setNewAssignDesc(e.target.value)}
                        className="w-full h-24 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setIsCreatingAssign(false)} className="px-4 py-2 bg-slate-900 text-slate-400 rounded-xl text-xs">{isAr ? 'إلغاء' : 'Cancel'}</button>
                        <button onClick={handleCreateAssignment} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">{isAr ? 'نشر الآن' : 'Publish'}</button>
                      </div>
                    </div>
                  )}

                  {/* List of active assignments */}
                  <div className="space-y-4">
                    {assignments.filter(a => a.classId === activeClassroomView.id).map(assign => {
                      const studentSub = submissions.find(s => s.assignmentId === assign.id && s.studentId === currentUserId);
                      const allSubsForTeacher = submissions.filter(s => s.assignmentId === assign.id);

                      return (
                        <div  className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div>
                              <h5 className="font-bold text-white text-sm">{assign.title}</h5>
                              <span className="text-[10px] text-slate-500">
                                {isAr ? 'مستحق في: ' : 'Due: '} {assign.dueDate} • {isAr ? 'الدرجة العظمى: ' : 'Points: '} {assign.maxPoints}
                              </span>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              studentSub 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'
                            }`}>
                              {studentSub 
                                ? (studentSub.grade !== undefined ? `${isAr ? 'تم التصحيح: ' : 'Graded: '} ${studentSub.grade}/${assign.maxPoints}` : (isAr ? 'تم التسليم - بانتظار التقييم' : 'Submitted - Awaiting Grade')) 
                                : (isAr ? 'مستحق الحل' : 'Awaiting Submission')}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/20 p-4 rounded-xl border border-slate-900">{assign.description}</p>

                          {/* Student submit box */}
                          {!isTeacher && !studentSub && submittingAssignId !== assign.id && (
                            <button 
                              onClick={() => { playChimeSound('click'); setSubmittingAssignId(assign.id); }}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black rounded-xl transition-all cursor-pointer"
                            >
                              {isAr ? 'تقديم الحل الآن 🚀' : 'Submit Solution Work 🚀'}
                            </button>
                          )}

                          {/* Submission Editor Drawer */}
                          {!isTeacher && submittingAssignId === assign.id && (
                            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                              <h6 className="text-xs font-bold text-white">{isAr ? 'محرر تقديم الواجب الدراسي' : 'Assignment Editor Workspace'}</h6>
                              <textarea 
                                placeholder={isAr ? 'اكتب تقريرك أو كود البرمجة أو حلولك الدراسية بالتفصيل هنا...' : 'Write your answers or link your files here...'} 
                                value={submitContentText}
                                onChange={(e) => setSubmitContentText(e.target.value)}
                                className="w-full h-32 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                              />
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => setSubmittingAssignId(null)} className="px-3 py-1.5 bg-slate-900 text-slate-400 rounded-lg text-xs">{isAr ? 'إلغاء' : 'Cancel'}</button>
                                <button onClick={handleSubmitAssignment} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold">{isAr ? 'إرسال التكليف' : 'Send Solution'}</button>
                              </div>
                            </div>
                          )}

                          {/* Student submitted feedback view */}
                          {!isTeacher && studentSub && (
                            <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10 space-y-2">
                              <span className="text-[10px] text-emerald-400 font-bold block">{isAr ? 'التقرير المقدم من طرفك:' : 'Your solution report:'}</span>
                              <p className="text-[11px] text-slate-400 leading-normal">{studentSub.content}</p>
                              {studentSub.feedback && (
                                <div className="pt-2 border-t border-emerald-500/10 text-[11px] text-purple-300">
                                  <strong>{isAr ? 'ملاحظة المعلم: ' : 'Teacher Feedback: '}</strong> {studentSub.feedback}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Teacher roster of submissions */}
                          {isTeacher && allSubsForTeacher.length > 0 && (
                            <div className="space-y-2 pt-3 border-t border-slate-800">
                              <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'تسليمات وحلول الطلاب:' : 'Student Submissions Queue:'}</span>
                              <div className="grid grid-cols-1 gap-2">
                                {allSubsForTeacher.map(sub => (
                                  <div  className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex justify-between items-center text-xs">
                                    <div>
                                      <span className="font-bold text-white block">{sub.studentName}</span>
                                      <span className="text-[10px] text-slate-500 block truncate max-w-md">{sub.content}</span>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      {sub.grade !== undefined ? (
                                        <span className="text-xs font-bold text-emerald-400 font-mono">{sub.grade} pts</span>
                                      ) : (
                                        <button 
                                          onClick={() => { playChimeSound('click'); setGradingSubmission(sub); setGradePoints(assign.maxPoints); }}
                                          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] rounded-lg font-black"
                                        >
                                          {isAr ? 'تصحيح ورصد' : 'Grade work'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Grading Modal dialog overlay */}
                  {gradingSubmission && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
                        <h5 className="font-bold text-white text-sm">{isAr ? 'تقييم ورصد الحلول الدراسية' : 'Evaluate Student Work'}</h5>
                        <p className="text-xs text-slate-400"><strong>Student:</strong> {gradingSubmission.studentName}</p>
                        <div className="p-4 bg-slate-950 rounded-xl max-h-40 overflow-y-auto text-xs text-slate-300 border border-slate-800">{gradingSubmission.content}</div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-500 block">{isAr ? 'الدرجة المرصودة' : 'Awarded Grade Points'}</label>
                          <input 
                            type="number" 
                            value={gradePoints} 
                            onChange={(e) => setGradePoints(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-500 block">{isAr ? 'ملاحظات المعلم والارتجاع' : 'Pedagogical feedback'}</label>
                          <textarea 
                            value={gradeFeedback} 
                            onChange={(e) => setGradeFeedback(e.target.value)}
                            placeholder={isAr ? 'توجيهات ممتازة لتحفيز الطالب...' : 'Great job, improve formulation...'}
                            className="w-full h-20 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setGradingSubmission(null)} className="px-4 py-2 bg-slate-950 text-slate-400 rounded-xl text-xs">{isAr ? 'إلغاء' : 'Cancel'}</button>
                          <button onClick={handleGradeSubmission} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">{isAr ? 'حفظ ورصد' : 'Grade Solution'}</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: FILES */}
              {activeWorkspaceTab === 'files' && (
                <div className="space-y-6">
                  {/* Drag and Drop Zone */}
                  <div 
                    onDragEnter={() => setDragActive(true)}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-10 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 relative overflow-hidden ${
                      dragActive 
                        ? 'border-purple-500 bg-purple-500/10' 
                        : 'border-slate-800 bg-slate-900/20 hover:border-slate-700'
                    }`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.gif,.docx"
                    />
                    <FolderOpen className="w-12 h-12 text-purple-400 animate-pulse" />
                    <h4 className="font-bold text-white text-xs">{isAr ? 'اسحب وأفلت الملفات التعليمية هنا لمشاركتها' : 'Drag & Drop Educational Resources Here'}</h4>
                    <p className="text-[10px] text-slate-500">{isAr ? 'أو اضغط للتصفح من جهازك (يدعم PDF, الصور, مستندات Word)' : 'or click to browse your disk (supports PDF, Images, Word Documents)'}</p>
                  </div>

                  {/* List of Files */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sharedFiles.filter(f => f.classId === activeClassroomView.id).map(file => (
                      <div  className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 truncate">
                          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="truncate">
                            <h5 className="font-bold text-white text-xs truncate">{file.name}</h5>
                            <span className="text-[9px] text-slate-500 block truncate">{file.size} • {file.sharedByName}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => triggerToast(isAr ? 'بدء تنزيل الملف' : 'Downloading Resource', file.name, 'info')}
                          className="p-2 bg-slate-950 border border-slate-800 hover:border-purple-500/40 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: MEMBERS */}
              {activeWorkspaceTab === 'members' && (
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>{isAr ? 'دليل الطلاب والكوادر الأكاديمية' : 'Classroom Roster Directory'}</span>
                  </h4>

                  <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950/60 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                          <th className="p-4 text-right rtl:text-right ltr:text-left">{isAr ? 'اسم العضو / الطالب' : 'Student Name'}</th>
                          <th className="p-4 text-center">{isAr ? 'تاريخ الانضمام' : 'Joined Date'}</th>
                          <th className="p-4 text-center">{isAr ? 'الكويزات المنجزة' : 'Quizzes Solved'}</th>
                          <th className="p-4 text-center">{isAr ? 'متوسط الدرجات' : 'Average index'}</th>
                          <th className="p-4 text-center">{isAr ? 'أخر نشاط' : 'Last Activity'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-900/20 text-slate-200">
                        {classroomStudents.filter(s => s.classCode === activeClassroomView.code).map(s => (
                          <tr  className="hover:bg-slate-900/40">
                            <td className="p-4 flex items-center gap-2.5 text-right rtl:text-right ltr:text-left">
                              <div className="w-7 h-7 rounded-full bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center font-bold">
                                {s.studentPhoto ? <img src={s.studentPhoto} alt="" className="w-full h-full object-cover" /> : s.studentName.charAt(0)}
                              </div>
                              <span className="font-bold text-white block">{s.studentName}</span>
                            </td>
                            <td className="p-4 text-center font-mono text-slate-400">{new Date(s.joinedAt).toLocaleDateString()}</td>
                            <td className="p-4 text-center font-mono text-purple-300 font-bold">{s.completedQuizzes}</td>
                            <td className="p-4 text-center font-mono text-emerald-400 font-bold">{s.avgScore}%</td>
                            <td className="p-4 text-center text-[10px] text-slate-500">{new Date(s.lastActive).toLocaleTimeString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 7: ANNOUNCEMENTS */}
              {activeWorkspaceTab === 'announcements' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-black text-white">{isAr ? 'لوحة النشرات والإعلانات الرسمية' : 'Official Bulletins Board'}</h4>
                      <p className="text-xs text-slate-400 mt-1">{isAr ? 'أخر التوجيهات والإشعارات والقرارات الصادرة من إدارة الفصل.' : 'Keep trace of academic announcements.'}</p>
                    </div>

                    {isTeacher && activeClassroomView.createdBy === currentUserId && (
                      <button 
                        onClick={() => setIsCreatingAnn(true)}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isAr ? 'إضافة إعلان' : 'Publish Notice'}</span>
                      </button>
                    )}
                  </div>

                  {/* Announcement creator form */}
                  {isCreatingAnn && (
                    <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
                      <h5 className="font-bold text-white text-sm">{isAr ? 'نشر تعميم دراسي جديد للفصل' : 'Broadcast New Announcement'}</h5>
                      <div className="flex gap-4">
                        {['general', 'important', 'urgent'].map(priority => (
                          <button
                            
                            onClick={() => setAnnPriority(priority as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase cursor-pointer ${
                              annPriority === priority 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}
                          >
                            {priority}
                          </button>
                        ))}
                      </div>
                      <textarea 
                        value={annContent}
                        onChange={(e) => setAnnContent(e.target.value)}
                        placeholder={isAr ? 'اكتب نص التعميم أو التوجيهات بدقة هنا...' : 'Write broadcast notice details...'}
                        className="w-full h-24 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setIsCreatingAnn(false)} className="px-4 py-2 bg-slate-900 text-slate-400 rounded-xl text-xs">{isAr ? 'إلغاء' : 'Cancel'}</button>
                        <button onClick={handleCreateAnnouncement} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold">{isAr ? 'بث الإعلان' : 'Broadcast'}</button>
                      </div>
                    </div>
                  )}

                  {/* Bulletins Feed */}
                  <div className="space-y-4">
                    {announcements.filter(a => a.classId === activeClassroomView.id).map(ann => (
                      <div  className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className={`text-[9px] font-mono font-bold uppercase px-2.5 py-0.5 border rounded-full ${
                            ann.priority === 'urgent' ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}>{ann.priority}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{new Date(ann.postedAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">{ann.content}</p>
                        <div className="flex gap-2 pt-2 border-t border-slate-800/60">
                          {['🚀', '❤️', '👍'].map(emoji => (
                            <button 
                              
                              onClick={() => handleAddReaction(ann.id, emoji)}
                              className="text-xs px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-1.5 text-slate-400 cursor-pointer hover:border-slate-700"
                            >
                              <span>{emoji}</span>
                              <span className="text-[10px] font-mono">{ann.reactions[emoji] || 0}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 8: GRADES */}
              {activeWorkspaceTab === 'grades' && (
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    <span>{isAr ? 'دفتر درجات الطلاب الأكاديمي الشامل' : 'Academic Gradebook & Marks Ledger'}</span>
                  </h4>

                  <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950/60 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                          <th className="p-4 text-right rtl:text-right ltr:text-left">{isAr ? 'اسم الطالب' : 'Student Name'}</th>
                          <th className="p-4 text-center">{isAr ? 'متوسط الكويزات' : 'Quiz Index'}</th>
                          <th className="p-4 text-center">{isAr ? 'درجات التكليفات' : 'Assignments Marks'}</th>
                          <th className="p-4 text-center">{isAr ? 'الترتيب العام' : 'Achievement index'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-900/20 text-slate-200">
                        {classroomStudents.filter(s => s.classCode === activeClassroomView.code).map((s, idx) => (
                          <tr  className="hover:bg-slate-900/40">
                            <td className="p-4 flex items-center gap-2.5 text-right rtl:text-right ltr:text-left font-bold text-white">{s.studentName}</td>
                            <td className="p-4 text-center font-mono text-purple-300 font-bold">{s.avgScore}%</td>
                            <td className="p-4 text-center font-mono text-emerald-400 font-bold">
                              {submissions.filter(sub => sub.studentId === s.studentId && sub.grade !== undefined).reduce((acc, curr) => acc + (curr.grade || 0), 0)} pts
                            </td>
                            <td className="p-4 text-center">
                              <span className="px-2 py-0.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 rounded-full text-[10px] font-bold">
                                {idx === 0 ? '🏆 Master' : idx === 1 ? '🌟 Scholar' : '☄️ Explorer'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 9: CALENDAR */}
              {activeWorkspaceTab === 'calendar' && (
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span>{isAr ? 'التقويم الدراسي للفصل' : 'Academic Event Planner Calendar'}</span>
                  </h4>

                  {/* Calendar monthly view mockup */}
                  <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white">June 2026</span>
                      <span className="text-slate-500">{isAr ? 'مواعيد مستحقة ومحاضرات مباشرة' : 'Highlighted Due Dates'}</span>
                    </div>

                    <div className="grid grid-cols-7 gap-2 text-center font-mono text-[10px] font-bold text-slate-500 uppercase">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div >{d}</div>)}
                    </div>

                    <div className="grid grid-cols-7 gap-2 text-center font-mono text-xs">
                      {Array.from({ length: 30 }).map((_, i) => {
                        const day = i + 1;
                        const isEven = day % 7 === 2;
                        return (
                          <div 
                             
                            className={`p-3 rounded-xl border flex flex-col items-center justify-between h-14 ${
                              isEven 
                                ? 'bg-purple-500/10 border-purple-500/20 text-purple-300 shadow-sm shadow-purple-500/10' 
                                : 'bg-slate-950/40 border-slate-800/40 text-slate-400'
                            }`}
                          >
                            <span>{day}</span>
                            {isEven && <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 10: ANALYTICS */}
              {activeWorkspaceTab === 'analytics' && (
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-purple-400" />
                    <span>{isAr ? 'تحليلات الأداء ومقاييس التفاعل الأكاديمي' : 'Performance Trajectory Analytics'}</span>
                  </h4>

                  {/* Recharts Analytics Widgets */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl h-80 flex flex-col justify-between">
                      <h5 className="text-xs font-bold text-white mb-4">{isAr ? 'تطور معدل درجات الفصل (%)' : 'Class Grade Trend (%)'}</h5>
                      <div className="flex-1 min-h-0 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={[
                            { name: 'Quiz 1', avg: 85 },
                            { name: 'Quiz 2', avg: 89 },
                            { name: 'Quiz 3', avg: 92 },
                            { name: 'Quiz 4', avg: 94 }
                          ]}>
                            <defs>
                              <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                            <ChartTooltip />
                            <Area type="monotone" dataKey="avg" stroke="#a78bfa" fillOpacity={1} fill="url(#colorAvg)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl h-80 flex flex-col justify-between">
                      <h5 className="text-xs font-bold text-white mb-4">{isAr ? 'مستويات إنجاز الكويزات للطلاب' : 'Quiz Completion Rates'}</h5>
                      <div className="flex-1 min-h-0 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { name: 'Yousef', done: 12 },
                            { name: 'Fatima', done: 9 },
                            { name: 'Khaled', done: 15 }
                          ]}>
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                            <ChartTooltip />
                            <Bar dataKey="done" fill="#10b981" radius={[4, 4, 0, 0]}>
                              <Cell fill="#10b981" />
                              <Cell fill="#3b82f6" />
                              <Cell fill="#8b5cf6" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* AI Feedback */}
                  <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/20 flex gap-4 items-start">
                    <span className="text-xl">💡</span>
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-white">{isAr ? 'ملاحظة كوزمو للذكاء الاصطناعي الأكاديمي' : 'Cosmo AI Pedagogical Feedback'}</h5>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {isAr 
                          ? 'أداء الفصل ممتاز جداً ويسير في منحنى تصاعدي رائع! تم إنجاز بايثون01 بنسبة 91% في يوم واحد. نقترح تدريب الطلاب أكثر على التكرارات العودية (Recursions) في الجلسات القادمة.' 
                          : 'Overall engagement remains highly progressive! 91% of student roster completed PYTH01. Consider reviewing recursions on the next session.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 11: SETTINGS */}
              {activeWorkspaceTab === 'settings' && (
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Settings className="w-4 h-4 text-purple-400" />
                    <span>{isAr ? 'إعدادات الفصل وتراخيص المجموعات' : 'Classroom Configuration Panel'}</span>
                  </h4>

                  {/* Settings rows matching premium operating systems */}
                  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl divide-y divide-slate-800 text-xs">
                    
                    {/* Row 1 */}
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white block">{isAr ? 'السماح للطلاب بإرسال الرسائل' : 'Allow Student Messaging'}</span>
                        <span className="text-[10px] text-slate-500 block">{isAr ? 'تمكين شات ومناقشات الطلاب التفاعلية داخل الشات المشفر.' : 'Toggle student posting rights in the secure chat feed.'}</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={activeClassroomView.allowStudentMessages !== false}
                        onChange={(e) => handleUpdatePermissions(e.target.checked, activeClassroomView.allowStudentMedia !== false)}
                        className="w-4 h-4 text-purple-600 rounded border-slate-800 bg-slate-950 focus:ring-purple-500"
                        disabled={activeClassroomView.createdBy !== currentUserId}
                      />
                    </div>

                    {/* Row 2 */}
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white block">{isAr ? 'السماح برفع ومشاركة الوسائط والملفات' : 'Allow Student Media Attachments'}</span>
                        <span className="text-[10px] text-slate-500 block">{isAr ? 'السماح للطلاب بمشاركة مستندات PDF، الكود، والصور التعليمية.' : 'Let students upload homework resources, screenshots or documents.'}</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={activeClassroomView.allowStudentMedia !== false}
                        onChange={(e) => handleUpdatePermissions(activeClassroomView.allowStudentMessages !== false, e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded border-slate-800 bg-slate-950 focus:ring-purple-500"
                        disabled={activeClassroomView.createdBy !== currentUserId}
                      />
                    </div>

                    {/* Danger zone delete */}
                    {activeClassroomView.createdBy === currentUserId && (
                      <div className="p-4 flex items-center justify-between bg-red-950/5">
                        <div>
                          <span className="font-bold text-red-400 block">{isAr ? 'أرشفة وحذف الفصل الدراسي نهائياً' : 'Archive & Terminate Classroom'}</span>
                          <span className="text-[10px] text-slate-500 block">{isAr ? 'سيتم مسح جميع سجلات الدردشات المشفرة والملفات والتكليفات بلا رجعة.' : 'Irreversibly delete E2EE messages history, homeworks, and member links.'}</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteClassroom(activeClassroomView.id)}
                          className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-black rounded-xl"
                        >
                          {isAr ? 'تدمير الفصل' : 'Delete Class'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* AI Quiz Generator prompt Modal Dialog */}
      {isAiQuizOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4">
            <h5 className="font-bold text-white text-sm">{isAr ? 'توليد اختبار ذكي بالذكاء الاصطناعي كوزمو' : 'Generate Smart Quiz Draft via Cosmo AI'}</h5>
            <p className="text-xs text-slate-400">{isAr ? 'اكتب الموضوع أو المفهوم التعليمي وسيقوم كوزمو بصياغة اختبار متكامل مع مفتاح الإجابات.' : 'Prompt Cosmo AI to compile questions on your selected curriculum topic.'}</p>
            <input 
              type="text" 
              placeholder={isAr ? 'مثال: المتجهات الميكانيكية، البرمجة كائنية التوجه' : 'e.g. Mechanical Vector Forces, Python Loops'} 
              value={aiQuizTopic}
              onChange={(e) => setAiQuizTopic(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsAiQuizOpen(false)} className="px-4 py-2 bg-slate-950 text-slate-400 rounded-xl text-xs">{isAr ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={handleTriggerAiQuiz} disabled={isAiGenerating} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold">
                {isAiGenerating ? '...' : (isAr ? 'توليد الكويز' : 'Generate')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
