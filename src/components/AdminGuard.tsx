import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AdminGuardProps {
  userId: string | null;
  userEmail: string | null;
  lang: 'ar' | 'en';
  children: React.ReactNode;
}

export default function AdminGuard({ userId, userEmail, lang, children }: AdminGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    console.log('[AdminGuard] Checking authorization...');
    console.log('[AdminGuard] userId:', userId);
    console.log('[AdminGuard] userEmail:', userEmail);

    if (!userId || !userEmail) {
      console.log('[AdminGuard] Missing userId or userEmail, waiting for session...');
      setIsAuthorized(false);
      return;
    }

    const checkAdminPrivileges = async () => {
      setIsChecking(true);
      console.log('[AdminGuard] Starting admin privileges check...');
      
      try {
        // First check if session is valid
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('[AdminGuard] Session check:', session ? 'Valid' : 'Invalid/Null');
        if (sessionError) {
          console.error('[AdminGuard] Session error:', sessionError);
        }

        if (!session) {
          console.log('[AdminGuard] No active session, denying access');
          setIsAuthorized(false);
          return;
        }

        console.log('[AdminGuard] Querying public.users for is_admin...');
        console.log('[AdminGuard] Query: SELECT is_admin FROM users WHERE uid =', userId);
        
        const { data, error } = await supabase.from('users').select('is_admin').eq('uid', userId).single();
        
        console.log('[AdminGuard] Query result data:', data);
        console.log('[AdminGuard] Query error:', error);
        
        if (error) {
          console.error('[AdminGuard] Database query failed:', error);
          console.error('[AdminGuard] Error code:', error.code);
          console.error('[AdminGuard] Error message:', error.message);
          console.error('[AdminGuard] Error details:', error.details);
          
          // Don't fail immediately on error - check if it's a "not found" error
          if (error.code === 'PGRST116') {
            console.log('[AdminGuard] User not found in public.users table');
            // Fall back to email check
            const isAdminEmail = userEmail === 'adman777888999@gmail.com' || userEmail === 'yo01009950871@gmail.com';
            console.log('[AdminGuard] Fallback email check:', isAdminEmail);
            setIsAuthorized(isAdminEmail);
          } else {
            console.error('[AdminGuard] Unexpected database error, denying access');
            setIsAuthorized(false);
          }
          return;
        }

        const dbIsAdmin = !!data?.is_admin;
        console.log('[AdminGuard] Database is_admin value:', data?.is_admin);
        console.log('[AdminGuard] Database is_admin boolean:', dbIsAdmin);
        
        const isAdminEmail = userEmail === 'adman777888999@gmail.com' || userEmail === 'yo01009950871@gmail.com';
        console.log('[AdminGuard] Email admin check:', isAdminEmail);
        
        const finalAuthorized = dbIsAdmin || isAdminEmail;
        console.log('[AdminGuard] Final authorization result:', finalAuthorized);
        console.log('[AdminGuard] Authorization reason:', dbIsAdmin ? 'Database flag' : 'Email fallback');
        
        setIsAuthorized(finalAuthorized);
      } catch (err) {
        console.error('[AdminGuard] Exception during authorization check:', err);
        console.error('[AdminGuard] Exception type:', err?.constructor?.name);
        console.error('[AdminGuard] Exception message:', err?.message);
        setIsAuthorized(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAdminPrivileges();
  }, [userId, userEmail]);

  useEffect(() => {
    console.log('[AdminGuard] Authorization state changed:', isAuthorized);
    console.log('[AdminGuard] Is currently checking:', isChecking);
    
    // Only redirect if we're done checking and definitely not authorized
    if (isAuthorized === false && !isChecking) {
      console.log('[AdminGuard] Access denied, redirecting to landing page...');
      window.location.hash = '#/dashboard/landing';
    }
  }, [isAuthorized, isChecking]);

  if (isAuthorized === null || isChecking) {
    console.log('[AdminGuard] Still checking authorization, showing loading state...');
    return null;
  }

  console.log('[AdminGuard] Access granted, rendering children');
  return <>{children}</>;
}
