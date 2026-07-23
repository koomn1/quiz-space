import React from 'react';
import CosmicLoader from "./CosmicLoader";
import { useAuth } from '../context/AuthContext';
import Login from '../pages/Login';

interface RouteGuardProps {
  children: React.ReactNode;
}

export default function RouteGuard({ children }: RouteGuardProps) {
  const { isAuthenticated, mfaRequired, loading } = useAuth();

  if (loading) {
    // Elegant background loading glow
    return (
      <div className="min-h-screen bg-[#070412] flex items-center justify-center">
        <div className="relative">
          <CosmicLoader />
        </div>
      </div>
    );
  }

  // If the user is currently challenged with MFA (Scenario B), render the OTP verification form.
  // This prevents any global navigation guards from kicking them out or triggering a logout loop.
  if (mfaRequired) {
    return <Login />;
  }

  // If unauthenticated and not challenged, redirect/route them to the login screen.
  if (!isAuthenticated) {
    return <Login />;
  }

  return <>{children}</>;
}
