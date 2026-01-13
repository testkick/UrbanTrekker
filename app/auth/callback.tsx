/**
 * Authentication Callback Handler
 * Processes deep link redirects from Supabase email confirmations
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Confirming your email...');

  const handleAuthCallback = useCallback(async () => {
    try {
      // Extract token hash from URL parameters
      // Supabase sends: access_token, refresh_token, expires_in, token_type, type
      const { access_token, refresh_token, type } = params;

      if (!access_token || !refresh_token) {
        setStatus('error');
        setMessage('Invalid confirmation link. Please try again.');
        setTimeout(() => router.replace('/'), 3000);
        return;
      }

      // Set the session using the tokens from the callback
      const { error } = await supabase.auth.setSession({
        access_token: access_token as string,
        refresh_token: refresh_token as string,
      });

      if (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('Failed to confirm email. Please try again.');
        setTimeout(() => router.replace('/auth'), 3000);
        return;
      }

      // Success!
      setStatus('success');

      // Show success message based on the callback type
      if (type === 'signup') {
        setMessage('Welcome to Stepquest! Your email is confirmed.');
      } else if (type === 'recovery') {
        setMessage('Email confirmed. You can now reset your password.');
      } else {
        setMessage('Email confirmed successfully!');
      }

      // Redirect to home after a brief delay
      setTimeout(() => {
        router.replace('/');
      }, 2000);
    } catch (err) {
      console.error('Unexpected error in auth callback:', err);
      setStatus('error');
      setMessage('Something went wrong. Please try signing in again.');
      setTimeout(() => router.replace('/auth'), 3000);
    }
  }, [params, router]);

  useEffect(() => {
    handleAuthCallback();
  }, [handleAuthCallback]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Status Icon */}
        <View style={[
          styles.iconContainer,
          status === 'success' && styles.iconContainerSuccess,
          status === 'error' && styles.iconContainerError,
        ]}>
          {status === 'processing' && (
            <ActivityIndicator size="large" color={Colors.primary} />
          )}
          {status === 'success' && (
            <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
          )}
          {status === 'error' && (
            <Ionicons name="alert-circle" size={64} color={Colors.error} />
          )}
        </View>

        {/* Status Message */}
        <Text style={styles.title}>
          {status === 'processing' && 'Just a moment...'}
          {status === 'success' && 'Success!'}
          {status === 'error' && 'Oops!'}
        </Text>

        <Text style={styles.message}>{message}</Text>

        {status === 'processing' && (
          <Text style={styles.hint}>Verifying your email address</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainerSuccess: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  iconContainerError: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  message: {
    fontSize: FontSizes.lg,
    color: Colors.text,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  hint: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    opacity: 0.5,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
