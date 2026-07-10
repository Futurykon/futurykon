import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useActivityTracker } from './useActivityTracker';
import { getProfile } from '@/services/profiles';

// Clears any lingering Supabase auth tokens from localStorage so a stale
// session can't interfere with a fresh sign-in/sign-out attempt.
const cleanupAuthState = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isAdminLoading: boolean;
  signInWithEmail: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components -- pre-existing pattern: this file pairs the AuthProvider component with its useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  // Enable activity-based session management for authenticated users
  useActivityTracker({
    inactivityTimeout: 30, // 30 minutes of inactivity before letting session expire
    refreshInterval: 45,   // Refresh session every 45 minutes if user is active
  });

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch is_admin once per session, alongside (not per component instance of)
  // the profile it belongs to. Refetches whenever the signed-in user changes;
  // resolves to false immediately when signed out. Depends on the user id
  // (not the user object) so token refreshes don't retrigger the fetch.
  const userId = user?.id;
  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setIsAdmin(false);
      setIsAdminLoading(false);
      return;
    }

    setIsAdminLoading(true);

    const checkAdmin = async () => {
      try {
        const { data, error } = await getProfile(userId);
        if (cancelled) return;

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data?.is_admin ?? false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error checking admin status:', err);
          setIsAdmin(false);
        }
      } finally {
        if (!cancelled) setIsAdminLoading(false);
      }
    };

    checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signInWithEmail = async (email: string): Promise<{ error: AuthError | null }> => {
    // Clean up any stale auth state before attempting a fresh sign-in
    cleanupAuthState();

    // Attempt global sign out first, ignoring failures
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      // Continue even if this fails
      console.log('Sign out error (ignoring):', err);
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    return { error };
  };

  const signOut = async () => {
    try {
      // Clean up auth state first
      cleanupAuthState();

      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
        console.log('Sign out error (ignoring):', err);
      }

      // Force page reload for clean state
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      // Force reload anyway
      window.location.href = '/';
    }
  };

  const value = {
    user,
    session,
    loading,
    isAdmin,
    isAdminLoading,
    signInWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};