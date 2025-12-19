/**
 * Authentication Context for Stepquest Explorer
 * Manages user session state and provides auth utilities
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { syncLocalDataToCloud, updateUserDeviceId } from '@/services/storage';
import { initializeDeviceTracking, getDeviceId } from '@/services/device';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Sync device ID to user profile
 */
const syncDeviceId = async (userId: string): Promise<void> => {
  try {
    // Initialize device tracking (requests ATT permission on iOS)
    await initializeDeviceTracking();

    // Get device ID
    const deviceId = await getDeviceId();

    if (deviceId) {
      await updateUserDeviceId(userId, deviceId);
    }
  } catch {
    // Don't throw - device ID sync is not critical
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      // Sync device ID if user is logged in
      if (session?.user) {
        syncDeviceId(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // Sync local data to cloud after successful login
      if (data.user) {
        try {
          await syncLocalDataToCloud(data.user.id);
        } catch {
          // Don't fail login if sync fails
        }

        // Sync device ID after login
        try {
          await syncDeviceId(data.user.id);
        } catch {
          // Don't fail login if device ID sync fails
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // Sync local data to cloud after successful signup
      if (data.user) {
        try {
          await syncLocalDataToCloud(data.user.id);
        } catch {
          // Don't fail signup if sync fails
        }

        // Sync device ID after signup
        try {
          await syncDeviceId(data.user.id);
        } catch {
          // Don't fail signup if device ID sync fails
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
