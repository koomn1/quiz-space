import type React from 'react';
import { useEffect } from 'react';
import { getDefaultAvatar } from '../constants/profileAssets';
import { getUserProfileStats, saveUserProfile } from '../lib/db';
import { generateCoolStudentName } from '../lib/nameGenerator';
import { getOrCreateGuestIdentity } from '../lib/guestIdentity';
import { playNotificationSound } from '../lib/sound';
import { pushNotificationsManager } from '../lib/pushNotifications';
import { registerPushNotifications } from '../lib/pushManager';
import { supabase } from '../lib/supabaseClient';
import type { UserStats } from '../types';

type Setter<T> = (value: T | ((current: T) => T)) => void;

export interface AuthBootstrapOptions {
  lang: 'ar' | 'en';
  getAppBasePath: () => string;
  authRedirectQuizIdRef: React.MutableRefObject<string | null>;
  loginRedirectTabRef: React.MutableRefObject<string | null>;
  setLoginRedirectTab: (value: string | null) => void;
  setActiveTab: (value: string) => void;
  setUrlProfileId: (value: string | null) => void;
  setActiveQuizId: (value: string | null) => void;
  setAuthRedirectQuizId: (value: string | null) => void;
  setUserId: (value: string) => void;
  setUserName: (value: string) => void;
  setUserEmail: (value: string | null) => void;
  setUserPhoto: (value: string | null) => void;
  setUserCustomId: (value: string | null) => void;
  setIsUserPremium: (value: boolean) => void;
  setUserPlanName: (value: string) => void;
  setIsGuestSandbox: (value: boolean) => void;
  setIsStatsLoaded: (value: boolean) => void;
  setUserStats: (value: UserStats | null) => void;
  setCompletions: Setter<any[]>;
  setShowPushBanner: (value: boolean) => void;
  setShowPostRegisterModal: (value: boolean) => void;
  normalizeUserPhoto: (value: unknown) => string | null;
}

export function useAuthBootstrap(options: AuthBootstrapOptions) {
  const {
    lang, getAppBasePath, authRedirectQuizIdRef, loginRedirectTabRef, setLoginRedirectTab,
    setActiveTab, setUrlProfileId, setActiveQuizId, setAuthRedirectQuizId, setUserId, setUserName,
    setUserEmail, setUserPhoto, setUserCustomId, setIsUserPremium, setUserPlanName, setIsGuestSandbox,
    setIsStatsLoaded, setUserStats, setCompletions, setShowPushBanner, setShowPostRegisterModal,
    normalizeUserPhoto,
  } = options;

  // Sync Google Auth State changes
  useEffect(() => {
    const localUserId = localStorage.getItem('quiz_userId');
    const isLocalSandbox = localStorage.getItem('quiz_isLocalSandbox') === 'true';
    const localAuthToken = localStorage.getItem('local_auth_token');

    // Only the explicitly-marked read-only sandbox may restore local state.
    // A legacy browser token is not a Supabase session and must never unlock
    // server-backed features, balances, classrooms, or daily challenges.
    if (localAuthToken) localStorage.removeItem('local_auth_token');
    if (localUserId && isLocalSandbox && localUserId.startsWith('user-guest-')) {
      setIsGuestSandbox(true);
      const savedName = localStorage.getItem('quiz_userName') || generateCoolStudentName(lang);
      const savedEmail = localStorage.getItem('quiz_userEmail') || 'local.student@spacequiz.local';
      setUserId(localUserId);
      setUserName(savedName);
      setUserEmail(savedEmail);
      
      const savedPhoto = localStorage.getItem('quiz_userPhoto');
      if (savedPhoto) {
        const normalizedPhoto = normalizeUserPhoto(savedPhoto);
        setUserPhoto(normalizedPhoto);
        if (normalizedPhoto && normalizedPhoto !== savedPhoto) localStorage.setItem('quiz_userPhoto', normalizedPhoto);
      }

      // Async load their actual Postgres statistics
      getUserProfileStats(localUserId).then(stats => {
        if (stats) {
          setUserStats(stats);
          setIsUserPremium(!!stats.isPremium);
          setUserPlanName(stats.planName || '');
          if (stats.photoURL) {
            const normalizedPhoto = normalizeUserPhoto(stats.photoURL);
            setUserPhoto(normalizedPhoto);
            if (normalizedPhoto) localStorage.setItem('quiz_userPhoto', normalizedPhoto);
          }
          if (stats.customId) {
            setUserCustomId(stats.customId);
          }
          if (stats.completions) {
            setCompletions(stats.completions);
          }
        }
      }).catch(e => {
        console.warn('Error loading custom local stats:', e);
      }).finally(() => {
        setIsStatsLoaded(true);
      });
      return;
    }

    let authSyncGeneration = 0;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const generation = ++authSyncGeneration;
      // Never await Supabase/database work directly inside onAuthStateChange.
      // Holding the auth callback lock can make native signInWithIdToken appear
      // to hang immediately after the Google account picker returns.
      window.setTimeout(() => {
        void (async () => {
          if (generation !== authSyncGeneration) return;
          const user = session?.user as any;
      const isEmailIdentity = Boolean(
        user?.app_metadata?.provider === 'email' ||
        user?.identities?.some((identity: any) => identity.provider === 'email'),
      );
      if (user && !user.email_confirmed_at && isEmailIdentity) {
        await supabase.auth.signOut({ scope: 'local' });
        setIsStatsLoaded(true);
        return;
      }
      if (user) {
        // Authenticated user
        setIsGuestSandbox(false);
        let finalName = user.user_metadata?.name || user.user_metadata?.full_name;
        if (!finalName) {
          const emailPrefix = user.email?.split('@')[0] || '';
          const hasAlphanumericOnly = /^[a-zA-Z0-9._%+-]+$/.test(emailPrefix);
          const containsDeveloperKeywords = 
            emailPrefix.toLowerCase().includes('jobadawy') || 
            emailPrefix.toLowerCase().includes('badawy') || 
            emailPrefix.toLowerCase().includes('youssef') || 
            emailPrefix.toLowerCase().includes('yousef') ||
            emailPrefix.toLowerCase().includes('yo01009950871');
          
          const localSavedName = localStorage.getItem('quiz_userName');
          if (localSavedName && localSavedName !== 'طالب متميز' && localSavedName !== 'طالب زائر' && !localSavedName.toLowerCase().includes('jobadawy') && !localSavedName.toLowerCase().includes('badawy')) {
            finalName = localSavedName;
          } else if (emailPrefix && !hasAlphanumericOnly && !containsDeveloperKeywords) {
            finalName = emailPrefix;
          } else {
            // Generate a cool Arabic/English random student name instead of email prefix or ID
            finalName = generateCoolStudentName(lang);
          }
        }

        setUserId(user.id);
        setUserName(finalName);
        setUserEmail(user.email || null);
        // Don't set photo from auth metadata here — wait for getUserProfileStats
        // to load the user's actual chosen photo from the DB
        const savedLocalPhoto = localStorage.getItem('quiz_userPhoto');
        if (savedLocalPhoto) {
          const normalizedPhoto = normalizeUserPhoto(savedLocalPhoto);
          setUserPhoto(normalizedPhoto);
          if (normalizedPhoto && normalizedPhoto !== savedLocalPhoto) localStorage.setItem('quiz_userPhoto', normalizedPhoto);
        }
        localStorage.setItem('quiz_userId', user.id);
        localStorage.setItem('quiz_userName', finalName);

        let onboarded = localStorage.getItem(`quiz_profile_onboarded_${user.id}`);
        if (!onboarded) {
          try {
            const { data: userRow } = await supabase.from('users').select('onboarded').eq('uid', user.id).maybeSingle();
            if (userRow?.onboarded) {
              localStorage.setItem(`quiz_profile_onboarded_${user.id}`, 'true');
              onboarded = 'true';
            }
          } catch (e) {
            console.error("Error checking onboarding status:", e);
          }
        }
        
        // The onboarding modal is opened only after the authenticated profile
        // and initial stats have finished loading. Rendering it during the
        // auth callback can mask a valid login with a runtime/bootstrap error.

        // Success logged in chime sound (explicit sign-in only, not cold page refresh)
        if (_event === 'SIGNED_IN') {
          playNotificationSound('chime');
        }

        const basePath = getAppBasePath();
        // Check if there was a quiz click waiting for login
        const pendingQuizId = authRedirectQuizIdRef.current;
        if (pendingQuizId && pendingQuizId !== 'login-trigger') {
          authRedirectQuizIdRef.current = null;
          setAuthRedirectQuizId(null);
          setActiveQuizId(pendingQuizId);
          window.history.pushState(null, '', `${basePath}#/quiz/${pendingQuizId}`);
        } else if (pendingQuizId === 'login-trigger') {
          authRedirectQuizIdRef.current = null;
          setAuthRedirectQuizId(null);
        }

        // Check if there was a tab switch waiting for login
        const pendingTab = loginRedirectTabRef.current;
        if (pendingTab) {
          loginRedirectTabRef.current = null;
          setLoginRedirectTab(null);
          setActiveTab(pendingTab);
          if (pendingTab === 'profile') {
            setUrlProfileId(user.id);
            window.history.pushState(null, '', `${basePath}#/profile/${user.id}`);
          } else {
            setUrlProfileId(null);
            window.history.pushState(null, '', basePath);
          }
        }

        // Sync profile into Firestore 'users' collection
        try {
          // Only sync avatar_url from auth provider if user hasn't set a custom photo
          // This preserves the user's chosen avatar/cover after refresh or re-login
          await saveUserProfile(user.id, finalName, undefined, user.email || undefined);
        } catch (e) {
          console.error("Error setting user profile: ", e);
        }

        try {
          const stats = await getUserProfileStats(user.id);
          if (stats) {
            setUserStats(stats);
            setIsUserPremium(!!stats.isPremium);
            setUserPlanName(stats.planName || '');
            if (stats.photoURL) {
            const normalizedPhoto = normalizeUserPhoto(stats.photoURL);
            setUserPhoto(normalizedPhoto);
            if (normalizedPhoto) localStorage.setItem('quiz_userPhoto', normalizedPhoto);
          } else if (user.user_metadata?.avatar_url) {
            // Fallback: use Google/GitHub avatar if user hasn't set a custom one
            const normalizedPhoto = normalizeUserPhoto(user.user_metadata.avatar_url);
            setUserPhoto(normalizedPhoto);
            if (normalizedPhoto) localStorage.setItem('quiz_userPhoto', normalizedPhoto);
          } else {
            // Fallback: assign a default avatar using the curated catalog helper
            const defaultAvatar = getDefaultAvatar(finalName);
            const normalizedPhoto = normalizeUserPhoto(defaultAvatar);
            setUserPhoto(normalizedPhoto);
            if (normalizedPhoto) localStorage.setItem('quiz_userPhoto', normalizedPhoto);
          }
            if (stats.customId) {
              setUserCustomId(stats.customId);
            }
            if (stats.completions) {
              setCompletions(stats.completions);
            }
          }
        } catch (e) {
          console.error("Error getting user profile stats: ", e);
        } finally {
          registerPushNotifications(user.id).then((permission) => {
            pushNotificationsManager.setPermissionStatus(permission);
            if (permission === 'granted') {
              setShowPushBanner(false);
            }
          });
          setIsStatsLoaded(true);
          if (!onboarded) setShowPostRegisterModal(true);
        }
          } else {
            setIsUserPremium(false);
            setUserPlanName('');
            setUserPhoto(null);
            setIsGuestSandbox(true);
        // Guest user fallback - do not reuse a real account id without an
        // active Supabase session, otherwise writes can fail or look signed in.
        let storedUserId = localStorage.getItem('quiz_userId');
        let storedUserName = localStorage.getItem('quiz_userName');
        const guestIdentity = getOrCreateGuestIdentity(lang);
        if (!storedUserId || !/^user-guest-[A-HJ-NP-Z2-9]{6}$/i.test(storedUserId)) {
          storedUserId = guestIdentity.id;
          localStorage.setItem('quiz_userId', storedUserId);
        }
        if (!storedUserName || storedUserName === 'طالب متميز' || storedUserName === 'طالب زائر') {
          storedUserName = guestIdentity.name;
          localStorage.setItem('quiz_userName', storedUserName);
        }
            setUserId(storedUserId);
            setUserName(storedUserName);
            setIsStatsLoaded(true);
          }
        })();
            }, 0);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);  // Initialize Account and check URL routes on start
}
