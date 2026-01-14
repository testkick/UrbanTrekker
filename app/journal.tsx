import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { VIBE_CONFIG } from '@/types/mission';
import {
  getJournalData,
  clearAllData,
  UserStats,
  CompletedMission,
} from '@/services/storage';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user, signOut, isLoading: authLoading } = useAuth();

  const [stats, setStats] = useState<UserStats | null>(null);
  const [history, setHistory] = useState<CompletedMission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getJournalData();
      setStats(data.stats);
      setHistory(data.history);
    } catch (error) {
      console.error('Error loading journal data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load data on mount and when auth state changes
  useEffect(() => {
    loadData();
  }, [loadData, isAuthenticated]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData();
  }, [loadData]);

  const handleResetData = useCallback(() => {
    Alert.alert(
      'Reset All Data',
      'This will permanently delete all your stats and mission history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              setStats(null);
              setHistory([]);
              Alert.alert('Success', 'All data has been reset.');
            } catch {
              Alert.alert('Error', 'Failed to reset data. Please try again.');
            }
          },
        },
      ]
    );
  }, []);

  const handleCloudSync = useCallback(() => {
    if (isAuthenticated) {
      // Show sign out confirmation
      Alert.alert(
        'Cloud Sync',
        `Signed in as ${user?.email}\n\nYour data is synced to the cloud.`,
        [
          { text: 'OK', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              try {
                await signOut();
                // Reload data after sign out (will show local data)
                loadData();
                Alert.alert('Signed Out', 'Your data will now be stored locally on this device.');
              } catch {
                Alert.alert('Error', 'Failed to sign out. Please try again.');
              }
            },
          },
        ]
      );
    } else {
      // Navigate to auth screen
      router.push('/auth');
    }
  }, [isAuthenticated, user, signOut, loadData]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading || authLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your journal...</Text>
      </View>
    );
  }

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
          <Ionicons name="journal" size={28} color={Colors.primary} />
          <Text style={styles.headerTitle}>Explorer&apos;s Journal</Text>
        </View>
        {/* Cloud Sync Button */}
        <TouchableOpacity
          style={[
            styles.cloudButton,
            isAuthenticated && styles.cloudButtonAuthenticated,
          ]}
          onPress={handleCloudSync}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isAuthenticated ? 'cloud-done' : 'cloud-outline'}
            size={22}
            color={isAuthenticated ? Colors.white : Colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Sync Status Banner (Authenticated) */}
      {isAuthenticated && (
        <View style={styles.syncBanner}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
          <Text style={styles.syncBannerText}>Synced to cloud • Full history saved</Text>
        </View>
      )}

      {/* Guest Mode Banner */}
      {!isAuthenticated && (
        <TouchableOpacity
          style={styles.guestBanner}
          onPress={handleCloudSync}
          activeOpacity={0.85}
        >
          <View style={styles.guestBannerContent}>
            <View style={styles.guestBannerIcon}>
              <Ionicons name="compass" size={20} color={Colors.accent} />
            </View>
            <View style={styles.guestBannerText}>
              <Text style={styles.guestBannerTitle}>Guest Explorer Mode</Text>
              <Text style={styles.guestBannerSubtitle}>
                All quests saved locally • Sign in to backup to cloud
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={Colors.accent} />
          </View>
        </TouchableOpacity>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Overview Card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Lifetime Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name="footsteps" size={28} color={Colors.primary} />
              <Text style={styles.statValue}>
                {(stats?.totalSteps || 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Total Steps</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Ionicons name="trophy" size={28} color={Colors.accent} />
              <Text style={styles.statValue}>
                {stats?.totalMissions || 0}
              </Text>
              <Text style={styles.statLabel}>Quests Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Ionicons name="navigate" size={28} color={Colors.primary} />
              <Text style={styles.statValue}>
                {(stats?.totalDistanceKm || 0).toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Km Traveled</Text>
            </View>
          </View>
        </View>


        {/* History Section */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Quest History</Text>

          {history.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="compass-outline" size={64} color={Colors.primary} style={{ opacity: 0.3 }} />
              <Text style={styles.emptyTitle}>No Quests Yet</Text>
              <Text style={styles.emptyText}>
                Complete your first walking quest to see it here!
              </Text>
            </View>
          ) : (
            history.map((mission) => {
              const vibeConfig = VIBE_CONFIG[mission.vibe];
              return (
                <View key={mission.id} style={styles.historyCard}>
                  {/* Card Header */}
                  <View style={styles.historyHeader}>
                    <View style={[styles.historyVibe, { backgroundColor: vibeConfig.color }]}>
                      <Text style={styles.historyVibeEmoji}>{vibeConfig.emoji}</Text>
                    </View>
                    <View style={styles.historyHeaderText}>
                      <Text style={styles.historyTitle} numberOfLines={1}>
                        {mission.title}
                      </Text>
                      <View style={styles.historyMeta}>
                        <Text style={styles.historyDate}>
                          {formatDate(mission.completedAt)}
                        </Text>
                        <Text style={styles.historyDot}>•</Text>
                        <Text style={styles.historyTime}>
                          {formatTime(mission.completedAt)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.historyStats}>
                      <Ionicons name="footsteps" size={14} color={vibeConfig.color} />
                      <Text style={[styles.historySteps, { color: vibeConfig.color }]}>
                        {mission.stepsCompleted.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Reward Text */}
                  {mission.rewardText && (
                    <View style={styles.historyReward}>
                      <Ionicons name="gift-outline" size={14} color={Colors.primary} />
                      <Text style={styles.historyRewardText} numberOfLines={3}>
                        {mission.rewardText}
                      </Text>
                    </View>
                  )}

                  {/* Duration */}
                  {mission.durationMinutes > 0 && (
                    <View style={styles.historyDuration}>
                      <Ionicons name="time-outline" size={12} color={Colors.text} style={{ opacity: 0.5 }} />
                      <Text style={styles.historyDurationText}>
                        {mission.durationMinutes < 60
                          ? `${mission.durationMinutes} min`
                          : `${Math.floor(mission.durationMinutes / 60)}h ${mission.durationMinutes % 60}m`}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Reset Button */}
        {history.length > 0 && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetData}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.energyLow} />
            <Text style={styles.resetButtonText}>Reset All Data</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    opacity: 0.6,
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
  cloudButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  cloudButtonAuthenticated: {
    backgroundColor: Colors.primary,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  syncBannerText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '500',
  },
  // Guest Mode Banner
  guestBanner: {
    backgroundColor: 'rgba(255, 111, 0, 0.08)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 111, 0, 0.1)',
  },
  guestBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  guestBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  guestBannerText: {
    flex: 1,
  },
  guestBannerTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  guestBannerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  // Stats Card
  statsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  statsTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    opacity: 0.6,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  // History Section
  historySection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.small,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyVibe: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  historyVibeEmoji: {
    fontSize: 16,
  },
  historyHeaderText: {
    flex: 1,
  },
  historyTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  historyDate: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    opacity: 0.5,
  },
  historyDot: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    opacity: 0.3,
    marginHorizontal: 4,
  },
  historyTime: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    opacity: 0.5,
  },
  historyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  historySteps: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  historyReward: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: Spacing.xs,
  },
  historyRewardText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
    opacity: 0.7,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  historyDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 4,
  },
  historyDurationText: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    opacity: 0.5,
  },
  // Reset Button
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  resetButtonText: {
    fontSize: FontSizes.md,
    color: Colors.energyLow,
    fontWeight: '500',
  },
});
