/**
 * Authentication Context for Stepquest Explorer
 * Manages user session state and provides auth utilities
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { syncLocalDataToCloud, updateUserDeviceId, updateUserIPAddress } from '@/services/storage';
import { getAnonymousDeviceId, initializeAnonymousDeviceId } from '@/services/anonymousDeviceId';
import { initializeIPCapture, getPublicIPAddress } from '@/services/ipService';

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
 * Sync anonymous device ID and IP address to user profile
 * Uses privacy-respecting UUID, not advertising identifiers
 */
const syncDeviceIdAndIP = async (userId: string): Promise<void> => {
  try {
    // Get the anonymous device ID (UUID-based, not IDFA)
    const deviceId = await getAnonymousDeviceId();

    if (deviceId) {
      await updateUserDeviceId(userId, deviceId);
    }

    // Capture and sync IP address (fire-and-forget)
    const ipAddress = await getPublicIPAddress();
    if (ipAddress) {
      await updateUserIPAddress(userId, ipAddress);
    }
  } catch {
    // Don't throw - device ID and IP sync is not critical
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize anonymous device ID and IP capture on app startup
  useEffect(() => {
    // Initialize the device ID system (generates UUID if first launch)
    initializeAnonymousDeviceId().catch((err) => {
      console.error('Failed to initialize anonymous device ID:', err);
    });

    // Initialize IP capture system (fire-and-forget)
    // This captures the IP on app launch for security monitoring
    initializeIPCapture().catch((err) => {
      console.error('Failed to initialize IP capture:', err);
    });
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      // Sync device ID and IP address if user is logged in
      if (session?.user) {
        syncDeviceIdAndIP(session.user.id);
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

        // Sync device ID and IP address after login
        try {
          await syncDeviceIdAndIP(data.user.id);
        } catch {
          // Don't fail login if device ID and IP sync fails
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
        options: {
          emailRedirectTo: 'fastshot://auth/callback',
        },
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

        // Sync device ID and IP address after signup
        try {
          await syncDeviceIdAndIP(data.user.id);
        } catch {
          // Don't fail signup if device ID and IP sync fails
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
