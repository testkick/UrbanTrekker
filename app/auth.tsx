/**
 * Authentication Screen - Urban Explorer Theme
 * Sign in or Sign up to sync progress to the cloud
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

type AuthMode = 'signin' | 'signup';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSignUp = mode === 'signup';

  // Common TLD typos to detect
  const commonTLDTypos: Record<string, string> = {
    '.con': '.com',
    '.cmo': '.com',
    '.ocm': '.com',
    '.vom': '.com',
    '.xom': '.com',
    '.nte': '.net',
    '.nett': '.net',
    '.ogr': '.org',
    '.orgg': '.org',
    '.gmai.com': '.gmail.com',
    '.gmial.com': '.gmail.com',
    '.gamil.com': '.gmail.com',
    '.yaho.com': '.yahoo.com',
    '.yahooo.com': '.yahoo.com',
  };

  const validateEmail = (emailValue: string): { isValid: boolean; message?: string; suggestion?: string } => {
    const trimmed = emailValue.trim().toLowerCase();

    if (!trimmed) {
      return { isValid: false, message: 'Please enter your email address.' };
    }

    // Basic format check
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      // Check for common typos
      for (const [typo, correction] of Object.entries(commonTLDTypos)) {
        if (trimmed.endsWith(typo) || trimmed.includes(typo)) {
          const suggested = trimmed.replace(typo, correction);
          return {
            isValid: false,
            message: `Email address "${emailValue.trim()}" is invalid`,
            suggestion: `Did you mean "${suggested}"?`,
          };
        }
      }
      return { isValid: false, message: 'Please enter a valid email address.' };
    }

    return { isValid: true };
  };

  const validateInput = (): boolean => {
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      const message = emailValidation.suggestion
        ? `${emailValidation.message}\n\n${emailValidation.suggestion}`
        : emailValidation.message || 'Invalid email';
      Alert.alert('Error', message);
      return false;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your password.');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return false;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return false;
    }

    return true;
  };

  // Map Supabase error codes/messages to user-friendly messages
  const getReadableErrorMessage = (error: { message?: string; status?: number; code?: string }): string => {
    // Handle various error formats from Supabase
    const errorMessage = error?.message || error?.code || 'Unknown error';
    const message = errorMessage.toLowerCase();

    // Authentication errors
    if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
      return 'The email or password you entered is incorrect. Please try again.';
    }
    if (message.includes('email not confirmed')) {
      return 'Please check your email and confirm your account before signing in.';
    }
    if (message.includes('user not found') || message.includes('no user found')) {
      return 'No account found with this email. Would you like to create one?';
    }
    if (message.includes('user already registered') || message.includes('already exists')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (message.includes('password') && message.includes('weak')) {
      return 'Please choose a stronger password with at least 6 characters.';
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'Too many attempts. Please wait a moment before trying again.';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Connection error. Please check your internet and try again.';
    }
    if (message.includes('invalid email') || message.includes('email invalid')) {
      return 'Please enter a valid email address.';
    }

    // Return original message if no match (but capitalize first letter)
    return errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1);
  };

  const handleAuth = async () => {
    if (!validateInput()) return;

    setIsLoading(true);

    try {
      const { error } = isSignUp
        ? await signUp(email.trim(), password)
        : await signIn(email.trim(), password);

      if (error) {
        const readableMessage = getReadableErrorMessage(error);
        Alert.alert('Error', readableMessage);
      } else {
        if (isSignUp) {
          Alert.alert(
            'Success!',
            'Your account has been created. Your local progress has been synced to the cloud.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } else {
          router.back();
        }
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(isSignUp ? 'signin' : 'signup');
    setConfirmPassword('');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="cloud" size={28} color={Colors.primary} />
          <Text style={styles.headerTitle}>Cloud Sync</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={isSignUp ? 'person-add' : 'compass'}
                size={48}
                color={Colors.accent}
              />
            </View>
            <Text style={styles.heroTitle}>
              {isSignUp ? 'Join the Explorers' : 'Welcome Back, Explorer'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {isSignUp
                ? 'Create an account to save your adventures to the cloud'
                : 'Sign in to sync your exploration progress'
              }
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={Colors.text} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="explorer@adventure.com"
                  placeholderTextColor="rgba(38, 50, 56, 0.4)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.text} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Your secret key"
                  placeholderTextColor="rgba(38, 50, 56, 0.4)"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.text}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input (Sign Up only) */}
            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={Colors.text} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your secret key"
                    placeholderTextColor="rgba(38, 50, 56, 0.4)"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!isLoading}
                  />
                </View>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleAuth}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons
                    name={isSignUp ? 'rocket' : 'log-in'}
                    size={20}
                    color={Colors.white}
                  />
                  <Text style={styles.submitButtonText}>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Toggle Mode */}
          <View style={styles.toggleSection}>
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already an explorer?' : "New to the adventure?"}
            </Text>
            <TouchableOpacity onPress={toggleMode} disabled={isLoading}>
              <Text style={styles.toggleLink}>
                {isSignUp ? 'Sign In' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Ionicons name="sync" size={18} color={Colors.primary} />
              <Text style={styles.infoText}>Sync progress across devices</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
              <Text style={styles.infoText}>Secure cloud backup</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="analytics" size={18} color={Colors.primary} />
              <Text style={styles.infoText}>Track lifetime stats</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  heroTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.text,
    opacity: 0.7,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  // Form Card
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: 'rgba(46, 125, 50, 0.2)',
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    opacity: 0.6,
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  passwordToggle: {
    padding: Spacing.xs,
    opacity: 0.6,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
    ...Shadows.small,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.white,
  },
  // Toggle Section
  toggleSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  toggleText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    opacity: 0.7,
  },
  toggleLink: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.accent,
  },
  // Info Section
  infoSection: {
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    opacity: 0.8,
  },
});
