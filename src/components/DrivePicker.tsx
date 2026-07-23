import React, { useState, useEffect } from 'react';
import CosmicLoader from "./CosmicLoader";
import { XCircle, Search, FileText, Image as ImageIcon, Check, RefreshCw, AlertCircle, Cloud, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface DrivePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelected: (file: File) => void;
  lang: 'ar' | 'en';
}

export default function DrivePicker({ isOpen, onClose, onFileSelected, lang }: DrivePickerProps) {
  const isAr = lang === 'ar';
  
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('gdrive_access_token');
    } catch (_) { return null; }
  });
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchDriveQuery, setSearchDriveQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadingFileName, setDownloadingFileName] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Connects Google Drive using Google Identity Services directly (a separate OAuth flow
  // from Supabase Auth login - this only requests a short-lived Drive-scoped access token,
  // it doesn't change which account the user is logged into the app with).
  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
      if (!clientId) throw new Error('Google OAuth client ID not configured (VITE_GOOGLE_OAUTH_CLIENT_ID).');

      // @ts-ignore - loaded via the Google Identity Services <script> tag in index.html
      const google = window.google;
      if (!google?.accounts?.oauth2) {
        throw new Error(isAr ? 'تعذر تحميل خدمة جوجل، برجاء إعادة تحميل الصفحة.' : 'Google Identity Services failed to load.');
      }

      const token: string = await new Promise((resolve, reject) => {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.readonly',
          prompt: 'consent',
          callback: (resp: any) => {
            if (resp.error) reject(new Error(resp.error));
            else resolve(resp.access_token);
          },
        });
        tokenClient.requestAccessToken();
      });

      setAccessToken(token);
      try {
        sessionStorage.setItem('gdrive_access_token', token);
      } catch (_) {}

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        localStorage.setItem(`gdrive_linked_${user.id}`, 'true');
        localStorage.setItem(`gdrive_account_${user.id}`, user.email || 'Google Account');
      }
    } catch (err: any) {
      console.error('Failed to connect Google Drive:', err);
      if (err.message?.includes('popup_closed') || err.message?.includes('access_denied')) {
        setError(
          isAr
            ? '💡 يبدو أن نافذة تسجيل الدخول قد أُغلقت أو تم حظرها من قِبل المتصفح. نظرًا لأنك في وضع المعاينة (iframe)، يرجى فتح التطبيق في علامة تبويب جديدة بالضغط على زر "فتح في علامة تبويب جديدة" أعلى اليمين والمحاولة من هناك لتجنب قيود الأمان.'
            : '💡 The sign-in popup was closed or blocked. Because you are inside the development preview iframe, please open the app in a new tab using the top-right button, then authorize Google Drive from there.'
        );
      } else {
        setError(isAr ? 'فشلت عملية المصادقة مع Google Drive.' : 'Google Drive authorization failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Drive Files dynamically based on search query
  const fetchDriveFiles = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      // Filter for PDFs, Images and Google Docs
      let q = "(mimeType='application/pdf' or mimeType='image/png' or mimeType='image/jpeg' or mimeType='application/vnd.google-apps.document')";
      if (searchDriveQuery.trim()) {
        q += ` and name contains '${searchDriveQuery.replace(/'/g, "\\'")}'`;
      }
      
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=15&fields=files(id,name,mimeType,size,modifiedTime)`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Token expired, clear it
          setAccessToken(null);
          try { sessionStorage.removeItem('gdrive_access_token'); } catch (_) {}
          throw new Error(isAr ? 'انتهت صلاحية الاتصال، يرجى إعادة الاتصال بـ Google Drive.' : 'Session expired. Please reconnect Google Drive.');
        }
        throw new Error(isAr ? 'فشل جلب الملفات من سحابتك.' : 'Failed to fetch files from Google Drive.');
      }

      const data = await res.json();
      setFiles(data.files || []);
    } catch (err: any) {
      console.error('Error listing Drive files:', err);
      setError(err.message || (isAr ? 'حدث خطأ أثناء جلب الملفات.' : 'Failed to retrieve files.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accessToken) {
      fetchDriveFiles();
    }
  }, [isOpen, accessToken, searchDriveQuery]);

  // Download Google Drive File securely and construct real File object
  const handleImportFile = async (fileId: string, name: string, mimeType: string) => {
    if (!accessToken) return;
    setIsDownloading(true);
    setDownloadingFileName(name);
    setDownloadProgress(20);
    setError(null);

    try {
      let downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      let finalMimeType = mimeType;
      
      // If it's a native Google Doc, we export it as PDF
      if (mimeType === 'application/vnd.google-apps.document') {
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`;
        finalMimeType = 'application/pdf';
        if (!name.toLowerCase().endsWith('.pdf')) {
          name += '.pdf';
        }
      }

      setDownloadProgress(50);
      const res = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!res.ok) {
        throw new Error(isAr ? 'فشل تحميل الملف السحابي.' : 'Could not download cloud document.');
      }

      setDownloadProgress(80);
      const blob = await res.blob();
      const realFile = new File([blob], name, { type: finalMimeType });

      setDownloadProgress(100);
      setTimeout(() => {
        onFileSelected(realFile);
        setIsDownloading(false);
        onClose();
      }, 300);

    } catch (err: any) {
      console.error('Error downloading Drive file:', err);
      setError(isAr ? 'فشل استيراد المستند من سحابة Google.' : 'Failed to import file from Google Drive.');
      setIsDownloading(false);
    }
  };

  const formatSize = (bytesStr?: string) => {
    if (!bytesStr) return isAr ? 'غير معروف' : 'Unknown size';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return bytesStr;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
        <>
          {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            
            
            
            className="fixed inset-0 bg-[#06030c]/85 backdrop-blur-md"
            onClick={() => { if (!isDownloading) onClose(); }}
          />

          {/* Modal Body */}
          <div
            
            
            
            
            className="bg-[#0c071e] border border-slate-800 rounded-[28px] shadow-[0_0_40px_rgba(155,81,224,0.15)] w-full max-w-lg p-6 relative overflow-hidden text-right font-sans text-white"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/10 rounded-full blur-[40px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-md border border-slate-800 p-1.5">
                  <svg className="w-full h-full" viewBox="0 0 1000 866" xmlns="http://www.w3.org/2000/svg">
                    <path d="M333.333 0L500 288.675L166.667 866.025L0 577.35Z" fill="#0F9D58" />
                    <path d="M166.667 866.025L833.333 866.025L666.667 577.35L333.333 577.35Z" fill="#4285F4" />
                    <path d="M666.667 0L1000 577.35L833.333 866.025L500 288.675Z" fill="#FFBA00" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-display font-black text-sm text-white">
                    {isAr ? 'مستندات Google Drive السحابية' : 'Google Drive Cloud Documents'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {accessToken 
                      ? (isAr ? 'متصل ومؤمن بالكامل بالبروتوكول السحابي' : 'Fully connected via secure cloud protocol')
                      : (isAr ? 'الوصول آمن عبر OAuth 2.0' : 'Authorized securely via OAuth 2.0')}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                disabled={isDownloading}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer disabled:opacity-30"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {isDownloading ? (
              /* PROGRESS LOADER FOR DOWNLOADING */
              <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
                <div className="relative">
                  <CosmicLoader />
                  <div className="absolute inset-0 flex items-center justify-center text-primary text-xs font-black">
                    {downloadProgress}%
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h5 className="font-bold text-sm text-white">
                    {isAr ? `جاري سحب واستيراد ${downloadingFileName}...` : `Streaming ${downloadingFileName}...`}
                  </h5>
                  <p className="text-xs text-slate-400">
                    {isAr ? 'نقوم بتحميل وتجهيز المستند عبر اتصال آمن لتسليمه للمعالج الذكي...' : 'Downloading document over secure connection to feed the AI parser...'}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full max-w-xs bg-slate-850 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-primary to-violet-500 h-full rounded-full transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                </div>
              </div>
            ) : !accessToken ? (
              /* CONNECT TO GOOGLE DRIVE PROMPT */
              <div className="py-10 text-center space-y-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-pulse p-3.5">
                  <svg className="w-full h-full" viewBox="0 0 1000 866" xmlns="http://www.w3.org/2000/svg">
                    <path d="M333.333 0L500 288.675L166.667 866.025L0 577.35Z" fill="#0F9D58" />
                    <path d="M166.667 866.025L833.333 866.025L666.667 577.35L333.333 577.35Z" fill="#4285F4" />
                    <path d="M666.667 0L1000 577.35L833.333 866.025L500 288.675Z" fill="#FFBA00" />
                  </svg>
                </div>
                <div className="space-y-1.5 max-w-xs mx-auto">
                  <h5 className="font-black text-sm text-white">
                    {isAr ? 'قم بربط حساب Google Drive' : 'Connect Google Drive Account'}
                  </h5>
                  <p className="text-xs text-slate-400">
                    {isAr ? 'يتيح لك كوزمو الوصول الآمن لمستنداتك ومناهجك بصيغ PDF والصور لبدء تحويلها فوراً لمسابقات ذكية.' : 'Authorizes Quiz Space to securely pull your PDF books, exam sheets, and study materials.'}
                  </p>
                </div>

                {/* Error Box if any */}
                {error && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs text-right flex items-start gap-2.5 max-w-sm mx-auto" dir={isAr ? 'rtl' : 'ltr'}>
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                )}

                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-primary to-violet-600 hover:from-primary-hover hover:to-violet-700 text-white text-xs font-black rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2 mx-auto cursor-pointer"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 1000 866" xmlns="http://www.w3.org/2000/svg">
                      <path d="M333.333 0L500 288.675L166.667 866.025L0 577.35Z" fill="#0F9D58" />
                      <path d="M166.667 866.025L833.333 866.025L666.667 577.35L333.333 577.35Z" fill="#4285F4" />
                      <path d="M666.667 0L1000 577.35L833.333 866.025L500 288.675Z" fill="#FFBA00" />
                    </svg>
                  )}
                  <span>{isAr ? 'ربط الحساب والمتابعة' : 'Authorize and Connect'}</span>
                </button>

                {window.self !== window.top && (
                  <p className="text-[10px] text-amber-400/80 max-w-xs mx-auto leading-relaxed border border-amber-500/15 bg-amber-500/5 p-2.5 rounded-xl text-center">
                    ⚠️ {isAr 
                      ? 'تنبيه المعاينة: يرجى فتح التطبيق في نافذة مستقلة (زر "فتح في علامة تبويب جديدة" أعلى اليمين) لتتمكن من ربط Google Drive بنجاح، حيث يحظر المتصفح النوافذ المنبثقة داخل الإطارات.' 
                      : 'Developer Preview Note: Please open the app in a new tab using the top-right button to connect Google Drive successfully, as browsers block popups inside iframes.'}
                  </p>
                )}
              </div>
            ) : (
              /* FILES LIST & SEARCH ZONE */
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-3.5 text-slate-500 w-4 h-4`} />
                  <input
                    type="text"
                    placeholder={isAr ? 'البحث في مستندات Drive...' : 'Search Google Drive documents...'}
                    value={searchDriveQuery}
                    onChange={(e) => setSearchDriveQuery(e.target.value)}
                    className={`w-full bg-slate-900/60 border border-slate-800 rounded-2xl ${isAr ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3 text-xs text-white outline-none focus:border-primary transition-colors`}
                  />
                </div>

                {/* Error Box if any */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* File List */}
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {isLoading && files.length === 0 ? (
                    <div className="py-12 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-xs text-slate-400 font-bold">{isAr ? 'جاري مزامنة السحابة...' : 'Syncing cloud files...'}</span>
                    </div>
                  ) : files.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500 font-bold">
                      {isAr ? 'لم يتم العثور على ملفات متوافقة (PDF أو صور).' : 'No compatible files (PDFs, images, or Docs) found.'}
                    </div>
                  ) : (
                    files.map((f) => (
                      <div
                        
                        onClick={() => handleImportFile(f.id, f.name, f.mimeType)}
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-900 bg-slate-950/40 hover:bg-slate-900/40 hover:border-slate-800 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2.5 bg-slate-900 group-hover:bg-primary/15 rounded-xl text-slate-400 group-hover:text-primary transition-all shrink-0 border border-slate-800/80">
                            {f.mimeType.startsWith('image/') ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <div className="text-right overflow-hidden">
                            <p className="text-xs font-black text-slate-200 group-hover:text-white transition-colors truncate">{f.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                              {formatSize(f.size)} • {new Date(f.modifiedTime).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-xs font-black text-slate-500 group-hover:text-primary transition-colors pl-2 flex items-center gap-1 shrink-0">
                          <span>{isAr ? 'استيراد' : 'Import'}</span>
                          <ArrowRight className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 ${isAr ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-850">
                  <span>Quiz Space Enterprise v1.5</span>
                  <button 
                    onClick={() => {
                      setAccessToken(null);
                      try { sessionStorage.removeItem('gdrive_access_token'); } catch (_) {}
                    }}
                    className="hover:underline hover:text-red-400 transition-colors"
                  >
                    {isAr ? 'قطع الاتصال بالسحابة' : 'Disconnect'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    
    </>
  );
}