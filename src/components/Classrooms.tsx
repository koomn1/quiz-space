import React, { useState, useEffect, useRef } from 'react';
import { Quiz } from '../types';
import ClassroomChallengesPanel from './ClassroomChallengesPanel';

// Derives an online/away/offline indicator purely from the existing
// last_active timestamp — no realtime subscriptions/websockets needed.
function getPresenceStatus(lastActiveISO: string, isAr: boolean): { color: string; label: string; dotClass: string } {
  const lastActive = new Date(lastActiveISO).getTime();
  const minutesAgo = (Date.now() - lastActive) / 60000;
  if (minutesAgo <= 5) {
    return { color: 'text-emerald-400', dotClass: 'bg-emerald-500', label: isAr ? 'متصل الآن' : 'Online' };
  }
  if (minutesAgo <= 30) {
    return { color: 'text-amber-400', dotClass: 'bg-amber-500', label: isAr ? 'غير نشط' : 'Away' };
  }
  return { color: 'text-slate-500', dotClass: 'bg-slate-600', label: isAr ? 'غير متصل' : 'Offline' };
}

function generateClassroomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = new Uint32Array(6);

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < values.length; index += 1) {
      values[index] = Math.floor(Math.random() * 0xffffffff);
    }
  }

  return Array.from(values, value => alphabet[value % alphabet.length]).join('');
}
import { 
  GraduationCap, Plus, Code, Users, Copy, Check, ShieldAlert,
  ArrowRight, Award, Clock, Star, BookOpen, Trash2, ShieldCheck, 
  ExternalLink, UserPlus, Sparkles, Lock, Shield, Send, Paperclip,
  Volume2, Bell, FileText, Image, Download, FolderOpen, Info, 
  MessageSquare, PlusCircle, Calendar, ClipboardList, Megaphone, 
  CheckCircle, BarChart2, Settings, Sliders, Play, Trash, FileUp,
  ChevronRight, Users2, SendHorizontal, AlertCircle, Flame, MessageCircle, Eye, Target, ClipboardCheck, CircleX
} from 'lucide-react';
import { playChimeSound } from '../lib/chime';
import { getApiUrl } from '../lib/origin';
import { encryptMessage, decryptMessage } from '../lib/encryption';
import { supabase } from '../lib/supabaseClient';
import {
  type ClassroomAttendanceRecord,
  type ClassroomAttendanceStatus,
  sendPushEvent,
  getLessonVideos,
  addLessonVideo,
  deleteLessonVideo,
  incrementLessonVideoViews,
  extractYouTubeId,
  getClassroomAttendanceRecords,
  markClassroomAttendance,
} from '../lib/db';
import { canPersistAuthenticatedData } from '../lib/userAccess';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, Tooltip as ChartTooltip, Cell, PieChart, Pie 
} from 'recharts';

function getLocalDateInputValue(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

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

interface LessonVideo {
  id: string;
  classId: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description?: string;
  videoUrl: string;
  videoType: 'youtube' | 'live';
  isLive: boolean;
  isPinned: boolean;
  viewCount: number;
  createdAt: string;
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
  isGuest?: boolean;
  isAdmin?: boolean;
  quizzes?: Quiz[];
}

export default function Classrooms({
  lang,
  currentUserId,
  currentUserName,
  currentUserPhoto,
  userRole,
  userPlan = 'Free',
  currentUserEmail,
  onStartQuiz,
  isGuest = false,
  isAdmin: isAdminProp,
  quizzes: allQuizzes = []
}: ClassroomsProps) {
  const isAr = lang === 'ar';
  const isAdmin = isAdminProp === true;
  const guestBlockMessage = isAr ? 'سجل الدخول للاستمرار.' : 'Sign in to continue.';

  // Classrooms & students are loaded exclusively from Supabase (see fetchClassroomsData effect below).
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classroomStudents, setClassroomStudents] = useState<ClassroomStudent[]>([]);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingClassroomWorkspace, setIsLoadingClassroomWorkspace] = useState(false);

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

  // Expanded classroom workspace tabs
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'overview' | 'discussion' | 'quizzes' | 'assignments' | 'files' | 'members' | 'attendance' | 'announcements' | 'grades' | 'calendar' | 'analytics' | 'settings' | 'lessons' | 'challenges'>('overview');
  
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

  // Lesson Videos State
  const [lessonVideos, setLessonVideos] = useState<LessonVideo[]>([]);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [newLessonUrl, setNewLessonUrl] = useState('');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonDesc, setNewLessonDesc] = useState('');
  const [isLessonLive, setIsLessonLive] = useState(false);
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [watchingVideo, setWatchingVideo] = useState<LessonVideo | null>(null);

  // Attendance register state. Teachers own updates; enrolled learners get a read-only view.
  const [attendanceDate, setAttendanceDate] = useState(getLocalDateInputValue);
  const [attendanceRecords, setAttendanceRecords] = useState<ClassroomAttendanceRecord[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceBusyStudentId, setAttendanceBusyStudentId] = useState<string | null>(null);

  // Drag and drop state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const classroomTabsRailRef = useRef<HTMLDivElement>(null);
  const classroomTabsDragRef = useRef({ pointerId: -1, lastX: 0, didDrag: false });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // AI Generator Prompt Modal
  const [isAiQuizOpen, setIsAiQuizOpen] = useState(false);
  const [aiQuizTopic, setAiQuizTopic] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Video player overlay state
  const [videoOverlayVisible, setVideoOverlayVisible] = useState(false);

  // Data now lives exclusively in Supabase; classrooms/students are loaded via
  // fetchClassroomsData below, and per-classroom data (assignments, submissions,
  // announcements, files) is loaded by loadClassroomWorkspace when a classroom opens.

  // Toast notifier
  const triggerToast = (title: string, body: string, type: 'message' | 'quiz' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, body, type }]);
    setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 5000);
  };

  const handleClassroomTabsWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const rail = classroomTabsRailRef.current;
    const usesFinePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
    if (!rail || !usesFinePointer || rail.scrollWidth <= rail.clientWidth) return;

    const delta = event.deltaX || event.deltaY;
    if (!delta) return;
    event.preventDefault();
    rail.scrollBy({ left: delta, behavior: 'auto' });
  };

  const handleClassroomTabsPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    classroomTabsDragRef.current = { pointerId: event.pointerId, lastX: event.clientX, didDrag: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleClassroomTabsPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rail = classroomTabsRailRef.current;
    const drag = classroomTabsDragRef.current;
    if (!rail || drag.pointerId !== event.pointerId) return;

    const delta = drag.lastX - event.clientX;
    if (Math.abs(delta) > 1) {
      drag.didDrag = true;
      rail.scrollBy({ left: delta, behavior: 'auto' });
      drag.lastX = event.clientX;
    }
  };

  const handleClassroomTabsPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = classroomTabsDragRef.current;
    if (drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.pointerId = -1;
    window.setTimeout(() => { drag.didDrag = false; }, 0);
  };

  // Fetch PostgreSQL Classrooms & Students
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

  useEffect(() => {
    fetchClassroomsData();
  }, []);

  // Live presence: (1) keep the current user's own last_active fresh while
  // they're inside a classroom, (2) periodically re-pull the roster so
  // everyone else's presence dot updates too — no websockets/realtime
  // infra needed, just a light poll.
  useEffect(() => {
    if (!activeClassroomView || !currentUserId) return;

    const beat = async () => {
      try {
        await supabase.from('classroom_students')
          .update({ last_active: new Date().toISOString() })
          .eq('class_code', activeClassroomView.code)
          .eq('student_id', currentUserId);
      } catch (err) {
        console.warn('Presence heartbeat failed:', err);
      }
    };
    beat();
    const heartbeatId = window.setInterval(beat, 60_000);
    const pollId = window.setInterval(fetchClassroomsData, 30_000);
    return () => {
      window.clearInterval(heartbeatId);
      window.clearInterval(pollId);
    };
  }, [activeClassroomView, currentUserId]);

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

  // Load assignments, submissions, announcements & shared files from Supabase
  // whenever a classroom is opened. Nothing here touches localStorage.
  useEffect(() => {
    if (!activeClassroomView) {
      setAssignments([]);
      setSubmissions([]);
      setAnnouncements([]);
      setSharedFiles([]);
      return;
    }
    let isMounted = true;
    const loadClassroomWorkspace = async () => {
      setIsLoadingClassroomWorkspace(true);
      try {
        const [assignRes, annRes, fileRes] = await Promise.all([
          supabase.from('classroom_assignments').select('*').eq('class_id', activeClassroomView.id).order('created_at', { ascending: false }),
          supabase.from('classroom_announcements').select('*').eq('class_id', activeClassroomView.id).order('posted_at', { ascending: false }),
          supabase.from('classroom_shared_files').select('*').eq('class_id', activeClassroomView.id).order('shared_at', { ascending: false })
        ]);
        if (!isMounted) return;

        const mappedAssignments: Assignment[] = (assignRes.data || []).map((a: any) => ({
          id: a.id, classId: a.class_id, title: a.title, description: a.description,
          dueDate: a.due_date, maxPoints: a.max_points, sharedByName: a.creator_name, sharedAt: a.created_at
        }));
        setAssignments(mappedAssignments);

        setAnnouncements((annRes.data || []).map((a: any) => ({
          id: a.id, classId: a.class_id, content: a.content, priority: a.priority,
          postedByName: a.posted_by_name, postedAt: a.posted_at, reactions: a.reactions || {}
        })));

        setSharedFiles((fileRes.data || []).map((f: any) => ({
          id: f.id, classId: f.class_id, name: f.name, sharedByName: f.shared_by_name,
          sharedAt: f.shared_at, size: f.size_bytes ? (f.size_bytes / (1024 * 1024)).toFixed(1) + ' MB' : '',
          type: f.file_type, url: f.url
        })));

        // Load lesson videos
        const vids = await getLessonVideos(activeClassroomView.id);
        if (!isMounted) return;
        setLessonVideos(vids);

        // Submissions are scoped per-assignment; pull them for every assignment in this classroom.
        const assignmentIds = mappedAssignments.map(a => a.id);
        if (assignmentIds.length > 0) {
          const { data: subData, error: subError } = await supabase
            .from('classroom_submissions')
            .select('*')
            .in('assignment_id', assignmentIds)
            .order('submitted_at', { ascending: false });
          if (!isMounted) return;
          if (subError) {
            console.error('Error loading submissions:', subError);
          } else {
            setSubmissions((subData || []).map((s: any) => ({
              id: s.id, assignmentId: s.assignment_id, studentId: s.student_id, studentName: s.student_name,
              submittedAt: s.submitted_at, content: s.content, grade: s.grade ?? undefined, feedback: s.feedback ?? undefined
            })));
          }
        } else {
          setSubmissions([]);
        }
      } catch (err) {
        console.error('Error loading classroom workspace:', err);
      } finally {
        if (isMounted) setIsLoadingClassroomWorkspace(false);
      }
    };
    loadClassroomWorkspace();
    return () => { isMounted = false; };
  }, [activeClassroomView]);

  useEffect(() => {
    if (!activeClassroomView) {
      setAttendanceRecords([]);
      setAttendanceError(null);
      return;
    }

    let isMounted = true;
    const loadAttendance = async () => {
      setIsLoadingAttendance(true);
      setAttendanceError(null);
      try {
        const records = await getClassroomAttendanceRecords(activeClassroomView.id, attendanceDate);
        if (isMounted) setAttendanceRecords(records);
      } catch (error) {
        console.error('Error loading attendance register:', error);
        if (isMounted) {
          setAttendanceRecords([]);
          setAttendanceError(isAr ? 'تعذر تحميل سجل الحضور. تحقق من اتصالك ثم أعد المحاولة.' : 'Attendance register could not be loaded. Check your connection and try again.');
        }
      } finally {
        if (isMounted) setIsLoadingAttendance(false);
      }
    };

    void loadAttendance();
    return () => { isMounted = false; };
  }, [activeClassroomView?.id, attendanceDate, isAr]);

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
    if (isGuest) { setErrorText(guestBlockMessage); playChimeSound('wrong'); return; }

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
      
      const membership = {
        class_code: targetCode,
        class_id: classData.id,
        student_id: currentUserId,
        student_name: currentUserName,
        student_photo: currentUserPhoto,
        joined_at: new Date().toISOString()
      };

      const { error: joinError } = await supabase.from('classroom_students').insert(membership);
      if (joinError) throw new Error(joinError.message);

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
    if (isGuest) { setErrorText(guestBlockMessage); playChimeSound('wrong'); return; }

    try {
      const { data: newClass, error } = await supabase.from('classrooms').insert({
        name,
        code: generateClassroomCode(),
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
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const url = `${window.location.origin}${base}/#/join/${code}`;
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
        // The schema requires an explicit text id and has no sender_photo column.
        id: crypto.randomUUID(),
        classroom_id: activeClassroomView.id,
        sender_id: currentUserId,
        sender_name: currentUserName,
        encrypted_text: encrypted
      });

      if (error) throw new Error(error.message);
      void sendPushEvent({ title: `💬 ${activeClassroomView.name}`, body: `${currentUserName}: ${text.slice(0, 140)}`, url: '/quiz-space/#/classrooms', category: 'classroom', classId: activeClassroomView.id });
      setChatMessageText('');
      playChimeSound('click');
        } catch (err) {
      console.error('Failed to send classroom message:', err);
      triggerToast(
        isAr ? 'تعذر إرسال الرسالة' : 'Message was not sent',
        isAr ? 'تحقق من الاتصال ثم حاول مرة أخرى.' : 'Check your connection and try again.',
        'info'
      );
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

  const handleFileUpload = async (file: File) => {
    if (!activeClassroomView) return;
    if (isGuest) { setErrorText(guestBlockMessage); playChimeSound('wrong'); return; }
    const isCreator = activeClassroomView.createdBy === currentUserId;
    const myStudent = classroomStudents.find(s => s.classCode === activeClassroomView.code && s.studentId === currentUserId);
    const isCoMod = myStudent?.role === 'co-moderator';
    const allowMedia = isCreator || isCoMod || (activeClassroomView.allowStudentMedia !== false);

    if (!allowMedia && !isAdmin) {
      setErrorText(isAr ? 'عذراً، رفع الملفات معطل حالياً من المعلم.' : 'File uploads are restricted by the teacher.');
      playChimeSound('wrong');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const typeMapped = ext === 'pdf' ? 'pdf' : (['png', 'jpg', 'jpeg', 'gif'].includes(ext || '') ? 'image' : 'docx');

    try {
      const { data, error } = await supabase.from('classroom_shared_files').insert({
        class_id: activeClassroomView.id,
        name: file.name,
        shared_by: currentUserId,
        shared_by_name: currentUserName,
        size_bytes: file.size,
        file_type: typeMapped
      }).select().single();
      if (error) throw new Error(error.message);
      void sendPushEvent({ title: `📁 ملف جديد في ${activeClassroomView.name}`, body: `${currentUserName} أضاف الملف: ${file.name}`, url: '/quiz-space/#/classrooms', category: 'classroom', classId: activeClassroomView.id });

      const newFile: SharedFile = {
        id: data.id, classId: data.class_id, name: data.name, sharedByName: data.shared_by_name,
        sharedAt: data.shared_at, size: (data.size_bytes / (1024 * 1024)).toFixed(1) + ' MB', type: data.file_type
      };
      setSharedFiles(prev => [newFile, ...prev]);
      playChimeSound('correct');
      triggerToast(
        isAr ? '📁 تم رفع الملف بنجاح!' : '📁 File Shared Successfully!',
        file.name,
        'info'
      );
    } catch (err: any) {
      console.error('Error sharing file:', err);
      setErrorText(err.message || (isAr ? 'تعذر رفع الملف.' : 'Failed to share file.'));
      playChimeSound('wrong');
    }
  };

  // Assignment Creator Operation
  const handleCreateAssignment = async () => {
    if (!newAssignTitle.trim() || !activeClassroomView) return;
    if (isGuest) { setErrorText(guestBlockMessage); playChimeSound('wrong'); return; }

    try {
      const { data, error } = await supabase.from('classroom_assignments').insert({
        class_id: activeClassroomView.id,
        title: newAssignTitle,
        description: newAssignDesc,
        due_date: newAssignDueDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
        max_points: Number(newAssignPoints) || 100,
        created_by: currentUserId,
        creator_name: currentUserName
      }).select().single();
      if (error) throw new Error(error.message);
      void sendPushEvent({ title: `📝 تكليف جديد في ${activeClassroomView.name}`, body: `${currentUserName}: ${newAssignTitle.slice(0, 140)}`, url: '/quiz-space/#/classrooms', category: 'classroom', classId: activeClassroomView.id });

      const newAssign: Assignment = {
        id: data.id, classId: data.class_id, title: data.title, description: data.description,
        dueDate: data.due_date, maxPoints: data.max_points, sharedByName: data.creator_name, sharedAt: data.created_at
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
    } catch (err: any) {
      console.error('Error creating assignment:', err);
      setErrorText(err.message || (isAr ? 'تعذر نشر التكليف.' : 'Failed to publish assignment.'));
      playChimeSound('wrong');
    }
  };

  // Student Submit Assignment
  const handleSubmitAssignment = async () => {
    if (!submitContentText.trim() || !submittingAssignId) return;
    if (isGuest) { setErrorText(guestBlockMessage); playChimeSound('wrong'); return; }

    try {
      const { data, error } = await supabase.from('classroom_submissions').upsert({
        assignment_id: submittingAssignId,
        student_id: currentUserId,
        student_name: currentUserName,
        content: submitContentText,
        submitted_at: new Date().toISOString()
      }, { onConflict: 'assignment_id,student_id' }).select().single();
      if (error) throw new Error(error.message);

      const newSub: Submission = {
        id: data.id, assignmentId: data.assignment_id, studentId: data.student_id, studentName: data.student_name,
        submittedAt: data.submitted_at, content: data.content, grade: data.grade ?? undefined, feedback: data.feedback ?? undefined
      };
      setSubmissions(prev => [newSub, ...prev.filter(s => s.id !== newSub.id)]);
      setSubmittingAssignId(null);
      setSubmitContentText('');
      playChimeSound('correct');
      triggerToast(
        isAr ? '🚀 تم تسليم الواجب بنجاح!' : '🚀 Work Submitted Successfully!',
        isAr ? 'تم حفظ إجابتك وتسليمها للمراجعة والتقييم.' : 'Your solution has been submitted for grading.',
        'info'
      );
    } catch (err: any) {
      console.error('Error submitting assignment:', err);
      setErrorText(err.message || (isAr ? 'تعذر تسليم الواجب.' : 'Failed to submit assignment.'));
      playChimeSound('wrong');
    }
  };

  // Grade Submission Operation
  const handleGradeSubmission = async () => {
    if (!gradingSubmission) return;

    try {
      const { error } = await supabase.from('classroom_submissions').update({
        grade: Number(gradePoints),
        feedback: gradeFeedback,
        graded_at: new Date().toISOString()
      }).eq('id', gradingSubmission.id);
      if (error) throw new Error(error.message);

      setSubmissions(prev => prev.map(sub => sub.id === gradingSubmission.id
        ? { ...sub, grade: Number(gradePoints), feedback: gradeFeedback }
        : sub));

      setGradingSubmission(null);
      setGradePoints(100);
      setGradeFeedback('');
      playChimeSound('correct');
      triggerToast(
        isAr ? '🌟 تم تقييم وتصحيح التكليف' : '🌟 Solutions Graded!',
        isAr ? 'تم رصد الدرجة للارتجاع المدرسي والطلاب.' : 'The grades were logged successfully.',
        'info'
      );
    } catch (err: any) {
      console.error('Error grading submission:', err);
      setErrorText(err.message || (isAr ? 'تعذر حفظ التقييم.' : 'Failed to save grade.'));
      playChimeSound('wrong');
    }
  };

  // Announcement Creator Operation
  const handleCreateAnnouncement = async () => {
    if (!annContent.trim() || !activeClassroomView) return;
    if (isGuest) { setErrorText(guestBlockMessage); playChimeSound('wrong'); return; }

    try {
      const { data, error } = await supabase.from('classroom_announcements').insert({
        class_id: activeClassroomView.id,
        content: annContent,
        priority: annPriority,
        posted_by: currentUserId,
        posted_by_name: currentUserName,
        reactions: { '🚀': 0, '❤️': 0, '👍': 0 }
      }).select().single();
      if (error) throw new Error(error.message);
      void sendPushEvent({ title: `📢 إعلان جديد في ${activeClassroomView.name}`, body: annContent.slice(0, 160), url: '/quiz-space/#/classrooms', category: 'classroom', classId: activeClassroomView.id });

      const newAnn: Announcement = {
        id: data.id, classId: data.class_id, content: data.content, priority: data.priority,
        postedByName: data.posted_by_name, postedAt: data.posted_at, reactions: data.reactions || {}
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
    } catch (err: any) {
      console.error('Error creating announcement:', err);
      setErrorText(err.message || (isAr ? 'تعذر نشر الإعلان.' : 'Failed to publish announcement.'));
      playChimeSound('wrong');
    }
  };

  const handleAddReaction = async (annId: string, emoji: string) => {
    // Optimistic update, then reconcile with the atomic add_announcement_reaction RPC
    // (defined in the 20260725 migration) so concurrent reactors don't clobber each other.
    setAnnouncements(prev => prev.map(ann => ann.id === annId
      ? { ...ann, reactions: { ...ann.reactions, [emoji]: (ann.reactions[emoji] || 0) + 1 } }
      : ann));
    playChimeSound('click');
    try {
      const { data, error } = await supabase.rpc('add_announcement_reaction', { p_announcement_id: annId, p_emoji: emoji });
      if (error) throw new Error(error.message);
      setAnnouncements(prev => prev.map(ann => ann.id === annId ? { ...ann, reactions: data || ann.reactions } : ann));
    } catch (err) {
      console.error('Error adding reaction:', err);
    }
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

  const canManageAttendance = Boolean(activeClassroomView && activeClassroomView.createdBy === currentUserId);
  const classroomAttendanceStudents = activeClassroomView
    ? classroomStudents.filter((student) => student.classCode === activeClassroomView.code)
    : [];
  const attendanceVisibleStudents = canManageAttendance
    ? classroomAttendanceStudents
    : classroomAttendanceStudents.filter((student) => student.studentId === currentUserId);
  const attendanceStatusOptions: Array<{
    id: ClassroomAttendanceStatus;
    label: string;
    shortLabel: string;
    className: string;
    activeClassName: string;
  }> = [
    {
      id: 'present',
      label: isAr ? 'حاضر' : 'Present',
      shortLabel: isAr ? 'حاضر' : 'Present',
      className: 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10',
      activeClassName: 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20',
    },
    {
      id: 'late',
      label: isAr ? 'متأخر' : 'Late',
      shortLabel: isAr ? 'متأخر' : 'Late',
      className: 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10',
      activeClassName: 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20',
    },
    {
      id: 'excused',
      label: isAr ? 'بعذر' : 'Excused',
      shortLabel: isAr ? 'بعذر' : 'Excused',
      className: 'border-sky-500/30 text-sky-500 hover:bg-sky-500/10',
      activeClassName: 'bg-sky-500 text-white border-sky-500 shadow-lg shadow-sky-500/20',
    },
    {
      id: 'absent',
      label: isAr ? 'غائب' : 'Absent',
      shortLabel: isAr ? 'غائب' : 'Absent',
      className: 'border-rose-500/30 text-rose-500 hover:bg-rose-500/10',
      activeClassName: 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20',
    },
  ];

  const handleAttendanceStatusChange = async (studentId: string, status: ClassroomAttendanceStatus) => {
    if (!activeClassroomView || !canManageAttendance || attendanceBusyStudentId) return;

    setAttendanceBusyStudentId(studentId);
    try {
      const savedRecord = await markClassroomAttendance({
        classId: activeClassroomView.id,
        studentId,
        attendanceDate,
        status,
      });
      setAttendanceRecords((previous) => {
        const next = previous.filter((record) => record.studentId !== studentId);
        return [...next, savedRecord].sort((a, b) => a.studentId.localeCompare(b.studentId));
      });
      playChimeSound('click');
      triggerToast(
        isAr ? 'تم حفظ الحضور' : 'Attendance saved',
        isAr ? 'تم تحديث حالة الطالب في سجل اليوم.' : 'The learner status was updated in today’s register.',
        'info',
      );
    } catch (error) {
      console.error('Error saving attendance:', error);
      triggerToast(
        isAr ? 'تعذر حفظ الحضور' : 'Attendance could not be saved',
        isAr ? 'لم يتم تغيير السجل. تحقق من صلاحيتك واتصالك ثم حاول مجددًا.' : 'The register was not changed. Check your permission and connection, then try again.',
        'info',
      );
    } finally {
      setAttendanceBusyStudentId(null);
    }
  };

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

            {/* Premium Dock Navigation */}
            <div
              ref={classroomTabsRailRef}
              role="tablist"
              aria-label={isAr ? 'تبويبات الفصل الدراسي' : 'Classroom workspace tabs'}
              onWheel={handleClassroomTabsWheel}
              onPointerDown={handleClassroomTabsPointerDown}
              onPointerMove={handleClassroomTabsPointerMove}
              onPointerUp={handleClassroomTabsPointerEnd}
              onPointerCancel={handleClassroomTabsPointerEnd}
              className="flex shrink-0 cursor-grab touch-pan-x select-none gap-1 overflow-x-auto border-b border-slate-800 bg-slate-900/40 px-6 py-2 scrollbar-none active:cursor-grabbing"
            >
              {[
                { id: 'overview', label: isAr ? 'نظرة عامة' : 'Overview', icon: BookOpen },
                { id: 'discussion', label: isAr ? 'المناقشة والتواصل' : 'Discussion', icon: MessageSquare },
                { id: 'quizzes', label: isAr ? 'الاختبارات' : 'Quizzes', icon: Sparkles },
                { id: 'assignments', label: isAr ? 'التكليفات والواجبات' : 'Assignments', icon: ClipboardList },
                { id: 'challenges', label: isAr ? 'تحديات الفصل' : 'Challenges', icon: Target },
                { id: 'files', label: isAr ? 'حقيبة الملفات' : 'Files', icon: FolderOpen },
                { id: 'members', label: isAr ? 'الأعضاء والطلاب' : 'Members', icon: Users2 },
                { id: 'attendance', label: isAr ? 'سجل الحضور' : 'Attendance', icon: ClipboardCheck },
                { id: 'announcements', label: isAr ? 'لوحة النشرات' : 'Notices', icon: Megaphone },
                { id: 'grades', label: isAr ? 'دفتر الدرجات' : 'Gradebook', icon: Award },
                { id: 'calendar', label: isAr ? 'التقويم' : 'Calendar', icon: Calendar },
                { id: 'analytics', label: isAr ? 'الإحصائيات' : 'Analytics', icon: BarChart2 },
                { id: 'settings', label: isAr ? 'خيارات الإدارة' : 'Settings', icon: Settings },
                { id: 'lessons', label: isAr ? 'الحصص أونلاين' : 'Live Lessons', icon: Play }
              ].map(tab => {
                const TabIcon = tab.icon;
                const isSelected = activeWorkspaceTab === tab.id;
                return (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => {
                      if (classroomTabsDragRef.current.didDrag) return;
                      playChimeSound('click');
                      setActiveWorkspaceTab(tab.id as any);
                    }}
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
                  <div className="light-dark-card p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/20 to-slate-950 border border-purple-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                      <div className="p-3 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block leading-none mb-1">{isAr ? 'عدد الاختبارات' : 'Quizzes'}</span>
                        <span className="text-lg font-black font-mono text-white block">
                          {allQuizzes.filter(q => q.classroomId === activeClassroomView.id).length} {isAr ? 'اختبار' : 'Quizzes'}
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

                  {/* Today's activity + latest message — real data, no extra fetches */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 shrink-0">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block leading-none mb-1">{isAr ? 'النشاط اليوم' : "Today's Activity"}</span>
                        <span className="text-lg font-black font-mono text-white block">
                          {(() => {
                            const todayStr = new Date().toDateString();
                            const todaysAssignments = assignments.filter(a => a.classId === activeClassroomView.id && new Date(a.sharedAt).toDateString() === todayStr).length;
                            const todaysAnnouncements = announcements.filter(a => a.classId === activeClassroomView.id && new Date(a.postedAt).toDateString() === todayStr).length;
                            const todaysMessages = activeClassroomMessages.filter(m => new Date(m.createdAt).toDateString() === todayStr).length;
                            const total = todaysAssignments + todaysAnnouncements + todaysMessages;
                            return `${total} ${isAr ? 'حدث' : 'events'}`;
                          })()}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveWorkspaceTab('discussion')}
                      className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center gap-4 text-right hover:border-slate-700 transition-colors"
                    >
                      <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400 shrink-0">
                        <MessageCircle className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-500 block leading-none mb-1">{isAr ? 'آخر رسالة' : 'Latest Message'}</span>
                        {activeClassroomMessages.length > 0 ? (
                          <span className="text-xs font-bold text-white block truncate">
                            {activeClassroomMessages[activeClassroomMessages.length - 1].senderName}
                            <span className="text-slate-500 font-normal"> — {new Date(activeClassroomMessages[activeClassroomMessages.length - 1].createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">{isAr ? 'لا توجد رسائل بعد' : 'No messages yet'}</span>
                        )}
                      </div>
                    </button>
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

              {activeWorkspaceTab === 'challenges' && (
                <ClassroomChallengesPanel
                  classId={activeClassroomView.id}
                  canCreate={activeClassroomView.createdBy === currentUserId}
                  lang={isAr ? 'ar' : 'en'}
                />
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
                      <p className="text-xs text-slate-400 mt-1">{isAr ? 'حل كويزات المعلم المباشرة أو اطلب من كوزمو توليد مسودة اختبار فوري.' : 'Solve assigned tests or prompt AI AI to generate a quiz draft.'}</p>
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

                  {/* Quiz Cards Layout — real quizzes linked to this classroom via classroomId */}
                  {(() => {
                    const classroomQuizzes = allQuizzes.filter(q => q.classroomId === activeClassroomView.id);
                    if (classroomQuizzes.length === 0) {
                      return (
                        <div className="text-center py-16 text-slate-600 border border-dashed border-slate-800 rounded-2xl">
                          <Sparkles className="w-10 h-10 mx-auto text-slate-800 mb-2" />
                          <p className="text-xs">
                            {isAr
                              ? (isTeacher ? 'مفيش اختبارات لسه — استخدم مولّد الذكاء الاصطناعي فوق أو انشر اختبار من "إنشاء اختبار" واختار الفصل ده كوجهة النشر.' : 'لا توجد اختبارات منشورة لهذا الفصل بعد.')
                              : (isTeacher ? 'No quizzes yet — use the AI generator above, or publish one from "Create Quiz" and pick this classroom as the destination.' : 'No quizzes published for this classroom yet.')}
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {classroomQuizzes.map((cq) => (
                          <div key={cq.id} className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                {isAr ? 'كويز مدمج بالفصل' : 'Classroom embed'}
                              </span>
                              {typeof cq.avgRating === 'number' && cq.avgRating > 0 && (
                                <div className="flex items-center gap-1 text-amber-400">
                                  <Star className="w-3.5 h-3.5 fill-current" />
                                  <span className="text-[10px] font-mono font-bold">{cq.avgRating.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <h5 className="font-bold text-white text-sm line-clamp-1">{cq.title}</h5>
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cq.description}</p>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                              <span>{cq.questions?.length || 0} {isAr ? 'أسئلة' : 'Questions'}</span>
                              <span>{cq.timeLimit ? `${cq.timeLimit} ${isAr ? 'دقيقة' : 'min'}` : (isAr ? 'بلا وقت' : 'No limit')}</span>
                            </div>
                            <button
                              onClick={() => onStartQuiz && onStartQuiz(cq.id)}
                              className="w-full py-2.5 bg-slate-950 border border-slate-800 hover:border-purple-500/40 hover:text-white rounded-xl text-xs font-black text-slate-400 transition-all cursor-pointer"
                            >
                              {isAr ? 'ابدأ الصاروخ 🚀' : 'Launch Rocket 🚀'}
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
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
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto space-y-4">
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
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-400" />
                        <span>{isAr ? 'دليل الطلاب والكوادر الأكاديمية' : 'Classroom Roster Directory'}</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {isAr ? 'قائمة أعضاء الفصل، حالات الاتصال، ومتوسط الأداء الأكاديمي' : 'Member directory, online presence, and academic standing'}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/40 shadow-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950/80 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                          <th className="p-4 text-right rtl:text-right ltr:text-left">{isAr ? 'اسم العضو / الطالب' : 'Student Name'}</th>
                          <th className="p-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                          <th className="p-4 text-center">{isAr ? 'تاريخ الانضمام' : 'Joined Date'}</th>
                          <th className="p-4 text-center">{isAr ? 'الكويزات المنجزة' : 'Quizzes Solved'}</th>
                          <th className="p-4 text-center">{isAr ? 'متوسط الدرجات' : 'Average Index'}</th>
                          <th className="p-4 text-center">{isAr ? 'آخر نشاط' : 'Last Activity'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/20 text-slate-200">
                        {classroomStudents.filter(s => s.classCode === activeClassroomView.code).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                              {isAr ? 'لا يوجد طلاب منضمون لهذا الفصل حتى الآن.' : 'No students enrolled in this classroom yet.'}
                            </td>
                          </tr>
                        ) : (
                          classroomStudents.filter(s => s.classCode === activeClassroomView.code).map(s => {
                            const presence = getPresenceStatus(s.lastActive, isAr);
                            return (
                              <tr key={s.id} className="hover:bg-slate-900/60 transition-colors">
                                <td className="p-4 flex items-center gap-3 text-right rtl:text-right ltr:text-left">
                                  <div className="relative w-8 h-8 shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-white shadow-inner">
                                      {s.studentPhoto ? <img src={s.studentPhoto} alt="" className="w-full h-full object-cover" /> : s.studentName.charAt(0)}
                                    </div>
                                    <span className={`absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${presence.dotClass}`} />
                                  </div>
                                  <div>
                                    <span className="font-bold text-white block">{s.studentName}</span>
                                    <span className="text-[10px] text-slate-500 font-mono">{s.studentId.slice(0, 8)}...</span>
                                  </div>
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-950 border border-slate-800 ${presence.color}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${presence.dotClass}`}></span>
                                    {presence.label}
                                  </span>
                                </td>
                                <td className="p-4 text-center font-mono text-slate-400 text-[11px]">{new Date(s.joinedAt).toLocaleDateString()}</td>
                                <td className="p-4 text-center font-mono text-purple-300 font-bold">{s.completedQuizzes}</td>
                                <td className="p-4 text-center font-mono text-emerald-400 font-bold">{s.avgScore}%</td>
                                <td className="p-4 text-center text-[10px] text-slate-500">{new Date(s.lastActive).toLocaleTimeString()}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 7: ATTENDANCE */}
              {activeWorkspaceTab === 'attendance' && (
                <div className="space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="h-5 w-5 text-purple-500" />
                          <h4 className="text-base font-black text-slate-900 dark:text-white">
                            {isAr ? 'سجل الحضور اليومي' : 'Daily attendance register'}
                          </h4>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                          {canManageAttendance
                            ? (isAr ? 'حدّد حالة كل طالب. لا يُعرض نجاح إلا بعد حفظ السجل في قاعدة البيانات.' : 'Set each learner status. Success appears only after the record is stored in the database.')
                            : (isAr ? 'اطّلع على حالات حضورك المسجّلة للفصل.' : 'Review the attendance status recorded for this classroom.')}
                        </p>
                      </div>

                      <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 focus-within:ring-2 focus-within:ring-purple-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
                        <Calendar className="h-4 w-4 text-purple-500" />
                        <span>{isAr ? 'التاريخ' : 'Date'}</span>
                        <input
                          aria-label={isAr ? 'تاريخ سجل الحضور' : 'Attendance register date'}
                          type="date"
                          value={attendanceDate}
                          onChange={(event) => setAttendanceDate(event.target.value)}
                          className="min-w-0 bg-transparent text-xs font-bold text-slate-900 outline-none dark:text-white"
                        />
                      </label>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {attendanceStatusOptions.map((status) => {
                        const count = attendanceRecords.filter((record) => record.status === status.id).length;
                        return (
                          <div key={status.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{status.shortLabel}</p>
                            <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{count}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {attendanceError && (
                    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-200">
                      <CircleX className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{attendanceError}</span>
                    </div>
                  )}

                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/30">
                    {isLoadingAttendance ? (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {[0, 1, 2, 3].map((index) => (
                          <div key={index} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                              <div className="space-y-2">
                                <div className="h-3 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                                <div className="h-2.5 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
                              </div>
                            </div>
                            <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                          </div>
                        ))}
                      </div>
                    ) : attendanceVisibleStudents.length === 0 ? (
                      <div className="px-6 py-14 text-center">
                        <Users2 className="mx-auto h-9 w-9 text-slate-300 dark:text-slate-700" />
                        <h5 className="mt-3 text-sm font-black text-slate-800 dark:text-white">{isAr ? 'لا يوجد طلاب للحضور اليوم' : 'No learners to mark today'}</h5>
                        <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">{isAr ? 'سيظهر طلاب الفصل هنا بمجرد انضمامهم.' : 'Classroom learners will appear here once they join.'}</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {attendanceVisibleStudents.map((student) => {
                          const record = attendanceRecords.find((item) => item.studentId === student.studentId);
                          const currentStatus = record?.status;
                          const currentStatusLabel = attendanceStatusOptions.find((option) => option.id === currentStatus)?.label;
                          const isSavingStudent = attendanceBusyStudentId === student.studentId;

                          return (
                            <div key={student.id} className="flex flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-100 text-xs font-black text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">
                                  {student.studentPhoto ? <img src={student.studentPhoto} alt="" className="h-full w-full object-cover" /> : student.studentName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">{student.studentName}</p>
                                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{currentStatusLabel || (isAr ? 'لم تُسجّل حالة بعد' : 'No status recorded')}</p>
                                </div>
                              </div>

                              {canManageAttendance ? (
                                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                                  {attendanceStatusOptions.map((status) => {
                                    const isActive = currentStatus === status.id;
                                    return (
                                      <button
                                        key={status.id}
                                        type="button"
                                        aria-label={`${isAr ? 'تحديد حالة' : 'Set status'} ${student.studentName}: ${status.label}`}
                                        aria-pressed={isActive}
                                        disabled={isSavingStudent}
                                        onClick={() => void handleAttendanceStatusChange(student.studentId, status.id)}
                                        className={`min-h-11 rounded-xl border px-3 text-xs font-black transition-all active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 ${isActive ? status.activeClassName : status.className}`}
                                      >
                                        {isSavingStudent ? (isAr ? 'جارٍ الحفظ' : 'Saving') : status.shortLabel}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="inline-flex min-h-9 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                                  {currentStatusLabel || (isAr ? 'بانتظار المعلم' : 'Pending teacher')}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 8: ANNOUNCEMENTS */}
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
                      <h5 className="text-xs font-bold text-white">{isAr ? 'ملاحظة كوزمو للذكاء الاصطناعي الأكاديمي' : 'AI AI Pedagogical Feedback'}</h5>
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

              {/* TAB: LESSONS (Live Videos) */}
              {activeWorkspaceTab === 'lessons' && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Play className="w-5 h-5 text-purple-400" />
                        {isAr ? 'الحصص المباشرة والفيديوهات' : 'Live Lessons & Videos'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {isAr ? 'شاهد حصصك مباشرة أو الفيديوهات المسجلة بأمان كامل' : 'Watch live lessons or recorded videos securely'}
                      </p>
                    </div>
                    {isTeacher && activeClassroomView.createdBy === currentUserId && (
                      <button
                        onClick={() => setIsAddingLesson(!isAddingLesson)}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isAr ? 'إضافة حصة' : 'Add Lesson'}</span>
                      </button>
                    )}
                  </div>

                  {/* Add Lesson Form (Teacher only) */}
                  {isAddingLesson && (
                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-purple-500/30 space-y-4">
                      <h5 className="text-xs font-black text-purple-400">{isAr ? 'إضافة حصة جديدة' : 'Add New Lesson'}</h5>
                      <input
                        type="text"
                        placeholder={isAr ? 'رابط YouTube أو البث المباشر...' : 'Paste YouTube or Live stream URL...'}
                        value={newLessonUrl}
                        onChange={(e) => setNewLessonUrl(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                        dir="ltr"
                      />
                      <input
                        type="text"
                        placeholder={isAr ? 'عنوان الحصة (مثال: حصة 1 - الكسور)' : 'Lesson title (e.g. Lesson 1 - Fractions)'}
                        value={newLessonTitle}
                        onChange={(e) => setNewLessonTitle(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder={isAr ? 'وصف اختياري...' : 'Optional description...'}
                        value={newLessonDesc}
                        onChange={(e) => setNewLessonDesc(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                      />
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isLessonLive}
                            onChange={(e) => setIsLessonLive(e.target.checked)}
                            className="w-4 h-4 text-red-600 rounded border-slate-700"
                          />
                          {isAr ? 'بث مباشر 🔴' : 'Live Stream 🔴'}
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const lessonUrl = newLessonUrl.trim();
                            const lessonTitle = newLessonTitle.trim();
                            if (!lessonUrl || !lessonTitle) {
                              triggerToast(isAr ? 'خطأ' : 'Error', isAr ? 'أدخل الرابط والعنوان' : 'Enter URL and title', 'info');
                              return;
                            }
                            if (!canPersistAuthenticatedData(currentUserId)) {
                              triggerToast(isAr ? 'تسجيل الدخول مطلوب' : 'Sign-in required', isAr ? 'سجّل الدخول بحسابك الحقيقي قبل إضافة حصة.' : 'Sign in with your verified account before adding a lesson.', 'info');
                              return;
                            }
                            const videoId = extractYouTubeId(lessonUrl);
                            // If it's not a recognized YouTube URL or ID, but is marked as live or has http/https, allow it as a stream link
                            if (!videoId && !isLessonLive && !lessonUrl.startsWith('http')) {
                              triggerToast(isAr ? 'خطأ' : 'Error', isAr ? 'رابط الفيديو غير صالح' : 'Invalid video URL', 'info');
                              return;
                            }
                            setIsSavingLesson(true);
                            try {
                              const teacherName = currentUserEmail || 'Teacher';
                              const video = await addLessonVideo({
                                classId: activeClassroomView.id,
                                creatorId: currentUserId,
                                creatorName: teacherName,
                                title: lessonTitle,
                                description: newLessonDesc.trim() || undefined,
                                videoUrl: lessonUrl,
                                videoType: isLessonLive ? 'live' : 'youtube',
                                isLive: isLessonLive,
                              });
                              setLessonVideos(prev => [video, ...prev.filter(existing => existing.id !== video.id)]);
                              setIsAddingLesson(false);
                              setNewLessonUrl('');
                              setNewLessonTitle('');
                              setNewLessonDesc('');
                              setIsLessonLive(false);
                              triggerToast(isAr ? 'تمت الإضافة' : 'Added', isAr ? 'الحصة تمت إضافتها بنجاح' : 'Lesson added successfully', 'info');
                            } catch (error: any) {
                              console.error('Lesson creation failed:', error);
                              const message = String(error?.message || '');
                              const isPermissionError = /permission|row-level|authorized|policy/i.test(message);
                              triggerToast(
                                isAr ? 'تعذرت إضافة الحصة' : 'Lesson could not be added',
                                isPermissionError
                                  ? (isAr ? 'تأكد أنك صاحب الفصل وأنك سجلت الدخول بالحساب نفسه.' : 'Make sure you are the classroom owner and signed in with the same account.')
                                  : (isAr ? 'تحقق من الرابط واتصالك ثم حاول مرة أخرى.' : 'Check the link and your connection, then try again.'),
                                'info',
                              );
                            } finally {
                              setIsSavingLesson(false);
                            }
                          }}
                          disabled={isSavingLesson}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black cursor-pointer transition-all"
                        >
                          {isSavingLesson ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ الحصة' : 'Save Lesson')}
                        </button>
                        <button
                          onClick={() => { setIsAddingLesson(false); setNewLessonUrl(''); setNewLessonTitle(''); setNewLessonDesc(''); setIsLessonLive(false); }}
                          className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold cursor-pointer transition-all"
                        >
                          {isAr ? 'إلغاء' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Video List */}
                  {lessonVideos.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
                      <Play className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-xs text-slate-400">{isAr ? 'لا توجد حصص بعد. المدرس يمكنه إضافة حصص من رابط YouTube أو بث مباشر.' : 'No lessons yet. Teacher can add YouTube or live stream lessons.'}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {lessonVideos.map(vid => (
                        <div key={vid.id} className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden group hover:border-purple-500/30 transition-colors">
                          {/* Thumbnail */}
                          <div
                            className="relative aspect-video bg-slate-950 cursor-pointer"
                            onClick={() => {
                              setWatchingVideo(vid);
                              incrementLessonVideoViews(vid.id);
                              setLessonVideos(prev => prev.map(v => v.id === vid.id ? { ...v, viewCount: v.viewCount + 1 } : v));
                            }}
                          >
                            <img
                              src={extractYouTubeId(vid.videoUrl) 
                                ? `https://img.youtube.com/vi/${extractYouTubeId(vid.videoUrl)}/mqdefault.jpg`
                                : `${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/images/happy_hour.webp`
                              }
                              alt={vid.title}
                              className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                              loading="lazy"
                            />
                            {vid.isLive && (
                              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                LIVE
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-purple-600/80 flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                                <Play className="w-6 h-6 text-white ml-0.5" />
                              </div>
                            </div>
                          </div>
                          {/* Info */}
                          <div className="p-3">
                            <h5 className="text-xs font-bold text-white truncate">{vid.title}</h5>
                            {vid.description && <p className="text-[10px] text-slate-500 truncate mt-0.5">{vid.description}</p>}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[9px] text-slate-600 flex items-center gap-1">
                                <Eye className="w-3 h-3" />{vid.viewCount}
                              </span>
                              {isTeacher && activeClassroomView.createdBy === currentUserId && (
                                <button
                                  onClick={async () => {
                                    if (deletingLessonId) return;
                                    setDeletingLessonId(vid.id);
                                    try {
                                      await deleteLessonVideo(vid.id, vid.classId);
                                      setLessonVideos(prev => prev.filter(v => v.id !== vid.id));
                                      triggerToast(isAr ? 'تم الحذف' : 'Deleted', isAr ? 'تم حذف الحصة' : 'Lesson deleted', 'info');
                                    } catch (error) {
                                      console.error('Lesson deletion failed:', error);
                                      triggerToast(
                                        isAr ? 'تعذر حذف الحصة' : 'Lesson could not be deleted',
                                        isAr ? 'لم تُحذف الحصة. تحقق من صلاحيتك واتصالك ثم حاول مجددًا.' : 'The lesson was not deleted. Check your permission and connection, then try again.',
                                        'info',
                                      );
                                    } finally {
                                      setDeletingLessonId(null);
                                    }
                                  }}
                                  disabled={deletingLessonId === vid.id}
                                  className="text-[9px] text-red-500 hover:text-red-400 font-bold flex items-center gap-1 cursor-pointer disabled:cursor-wait disabled:opacity-60"
                                >
                                  <Trash className="w-3 h-3" />
                                  {deletingLessonId === vid.id ? (isAr ? 'جارٍ الحذف...' : 'Deleting...') : (isAr ? 'حذف' : 'Delete')}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Protected Video Player Overlay */}
      {watchingVideo && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setWatchingVideo(null)}>
          <div className="relative w-full max-w-5xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={() => setWatchingVideo(null)}
              className="absolute -top-12 left-0 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer transition-all z-10"
            >
              {isAr ? '✕ إغلاق' : '✕ Close'}
            </button>

            {/* Protected Video Container */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl">
              {extractYouTubeId(watchingVideo.videoUrl) ? (
                <iframe
                  src={`https://www.youtube.com/embed/${extractYouTubeId(watchingVideo.videoUrl)}?modestbranding=1&controls=1&autoplay=1&rel=0`}
                  title={watchingVideo.title}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : watchingVideo.videoUrl.includes('mp4') || watchingVideo.videoUrl.includes('webm') ? (
                <video
                  src={watchingVideo.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                ></video>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-white p-6 text-center">
                  <div className="space-y-4">
                    <Play className="w-12 h-12 text-purple-500 mx-auto" />
                    <p className="text-xs font-bold">{isAr ? 'مشاهدة البث المباشر أو الفيديو الخارجي' : 'Watch Live Stream or External Video'}</p>
                    <a 
                      href={watchingVideo.videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-black transition-colors inline-block shadow-lg"
                    >
                      {isAr ? 'فتح الرابط مباشرة ↗' : 'Open Link Directly ↗'}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Video info */}
            <div className="mt-3 text-center">
              <h5 className="text-sm font-bold text-white">{watchingVideo.title}</h5>
              <p className="text-[10px] text-slate-500 mt-1">{watchingVideo.isLive ? '🔴 بث مباشر' : `👁 ${watchingVideo.viewCount} مشاهدة`}</p>
            </div>
          </div>
        </div>
      )}

      {/* AI Quiz Generator prompt Modal Dialog */}
      {isAiQuizOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto space-y-4">
            <h5 className="font-bold text-white text-sm">{isAr ? 'توليد اختبار ذكي بالذكاء الاصطناعي كوزمو' : 'Generate Smart Quiz Draft via AI AI'}</h5>
            <p className="text-xs text-slate-400">{isAr ? 'اكتب الموضوع أو المفهوم التعليمي وسيقوم كوزمو بصياغة اختبار متكامل مع مفتاح الإجابات.' : 'Prompt AI AI to compile questions on your selected curriculum topic.'}</p>
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
