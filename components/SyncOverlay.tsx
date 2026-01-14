/**
 * Premium Sync Overlay for Guest-to-Cloud Legacy Sync
 * High-end UI with professional animations and progress tracking
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from '@/constants/theme';
import { SyncProgress } from '@/services/storage';

const { width } = Dimensions.get('window');

interface SyncOverlayProps {
  visible: boolean;
  progress: SyncProgress | null;
}

export const SyncOverlay: React.FC<SyncOverlayProps> = ({ visible, progress }) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const footstepAnim = useRef(new Animated.Value(0)).current;
  const progressBarAnim = useRef(new Animated.Value(0)).current;

  // Entrance animation
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous rotation for the compass icon
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Footstep pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(footstepAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(footstepAnim, {
            toValue: 0,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible]);

  // Progress bar animation
  useEffect(() => {
    if (progress && progress.total > 0) {
      const progressValue = progress.current / progress.total;
      Animated.timing(progressBarAnim, {
        toValue: progressValue,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }
  }, [progress]);

  // Get stage-specific icon and color
  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'missions':
        return { icon: 'compass', color: Colors.primary };
      case 'stats':
        return { icon: 'stats-chart', color: Colors.accent };
      case 'locations':
        return { icon: 'location', color: Colors.primary };
      case 'cleanup':
        return { icon: 'checkmark-circle', color: Colors.success };
      default:
        return { icon: 'cloud-upload', color: Colors.primary };
    }
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const footstepScale = footstepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const footstepOpacity = footstepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const progressBarWidth = progressBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const stageInfo = progress ? getStageIcon(progress.stage) : { icon: 'cloud-upload', color: Colors.primary };

  return (
    <Modal visible={visible} transparent animationType="none">
      <BlurView intensity={90} style={styles.blurContainer}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Main content card */}
          <View style={styles.card}>
            {/* Animated icon */}
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [
                    { rotate },
                    { scale: footstepScale },
                  ],
                  opacity: footstepOpacity,
                },
              ]}
            >
              <View style={[styles.iconBackground, { backgroundColor: `${stageInfo.color}15` }]}>
                <Ionicons name={stageInfo.icon as any} size={48} color={stageInfo.color} />
              </View>
            </Animated.View>

            {/* Title */}
            <Text style={styles.title}>Syncing your adventures...</Text>

            {/* Progress message */}
            {progress && (
              <Text style={styles.message}>{progress.message}</Text>
            )}

            {/* Progress bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarTrack}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: progressBarWidth,
                      backgroundColor: stageInfo.color,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Progress stats */}
            {progress && progress.total > 0 && (
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Ionicons name="footsteps" size={16} color="rgba(38, 50, 56, 0.6)" />
                  <Text style={styles.statText}>
                    {progress.current} / {progress.total}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="shield-checkmark" size={16} color="rgba(38, 50, 56, 0.6)" />
                  <Text style={styles.statText}>Secure</Text>
                </View>
              </View>
            )}

            {/* Legacy preservation badge */}
            <View style={styles.badge}>
              <Ionicons name="medal" size={14} color={Colors.accent} />
              <Text style={styles.badgeText}>Preserving your legacy</Text>
            </View>
          </View>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  container: {
    width: width * 0.85,
    maxWidth: 400,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.large,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  iconBackground: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSizes.md,
    color: 'rgba(38, 50, 56, 0.6)',
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(100, 116, 139, 0.3)',
    marginHorizontal: Spacing.md,
  },
  statText: {
    fontSize: FontSizes.sm,
    color: 'rgba(38, 50, 56, 0.6)',
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: 'rgba(255, 111, 0, 0.1)',
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    color: Colors.accent,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
