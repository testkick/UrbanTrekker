import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActiveMission, VIBE_CONFIG } from '@/types/mission';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from '@/constants/theme';

interface ActiveMissionPanelProps {
  mission: ActiveMission;
  onCancel: () => void;
  onComplete: () => void;
  isVisible: boolean;
}

export const ActiveMissionPanel: React.FC<ActiveMissionPanelProps> = ({
  mission,
  onCancel,
  onComplete,
  isVisible,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(200);
  const opacity = useSharedValue(0);
  const progressGlow = useSharedValue(0);

  const vibeConfig = VIBE_CONFIG[mission.vibe];

  // Calculate progress
  const stepsInMission = mission.currentSteps - mission.stepsAtStart;
  const progress = Math.min(1, Math.max(0, stepsInMission / mission.stepTarget));
  const progressPercent = Math.round(progress * 100);
  const stepsRemaining = Math.max(0, mission.stepTarget - stepsInMission);

  // Animate panel in/out
  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(200, { duration: 200 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [isVisible, translateY, opacity]);

  // Pulsing glow effect for progress bar
  useEffect(() => {
    progressGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [progressGlow]);

  // Check for completion
  useEffect(() => {
    if (progress >= 1 && !mission.isCompleted) {
      onComplete();
    }
  }, [progress, mission.isCompleted, onComplete]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progressGlow.value, [0, 1], [0.3, 0.7], Extrapolation.CLAMP),
  }));

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingBottom: insets.bottom + Spacing.md },
        panelStyle,
      ]}
    >
      <BlurView intensity={90} tint="light" style={styles.blurContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.vibeBadge, { backgroundColor: vibeConfig.color }]}>
            <Text style={styles.vibeEmoji}>{vibeConfig.emoji}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.missionLabel}>ACTIVE QUEST</Text>
            <Text style={styles.missionTitle} numberOfLines={1}>
              {mission.title}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {mission.description}
        </Text>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBarGlow,
                { width: `${progressPercent}%`, backgroundColor: vibeConfig.color },
                glowStyle,
              ]}
            />
            <View
              style={[
                styles.progressBar,
                { width: `${progressPercent}%`, backgroundColor: vibeConfig.color },
              ]}
            />
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="footsteps" size={16} color={vibeConfig.color} />
              <Text style={styles.statValue}>
                {stepsInMission.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>/ {mission.stepTarget.toLocaleString()}</Text>
            </View>

            <View style={styles.progressBadge}>
              <Text style={[styles.progressText, { color: vibeConfig.color }]}>
                {progressPercent}%
              </Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="trending-up" size={16} color={Colors.accent} />
              <Text style={styles.statValue}>
                {stepsRemaining.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>to go</Text>
            </View>
          </View>
        </View>

        {/* Motivational Message */}
        <View style={styles.motivationContainer}>
          <Ionicons
            name={progress >= 0.75 ? 'flame' : progress >= 0.5 ? 'trending-up' : 'walk'}
            size={14}
            color={vibeConfig.color}
          />
          <Text style={styles.motivationText}>
            {progress >= 0.9
              ? "Almost there! You've got this!"
              : progress >= 0.75
                ? 'Amazing progress! Keep pushing!'
                : progress >= 0.5
                  ? "Halfway there! You're doing great!"
                  : progress >= 0.25
                    ? 'Great start! Keep moving!'
                    : 'Your adventure has begun!'}
          </Text>
        </View>
      </BlurView>
    </Animated.View>
  );
};

// Completion celebration panel
interface MissionCompletePanelProps {
  mission: ActiveMission;
  onDismiss: () => void;
  isVisible: boolean;
}

export const MissionCompletePanel: React.FC<MissionCompletePanelProps> = ({
  mission,
  onDismiss,
  isVisible,
}) => {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);
  const confettiY = useSharedValue(-50);

  const vibeConfig = VIBE_CONFIG[mission.vibe];
  const stepsCompleted = mission.currentSteps - mission.stepsAtStart;

  useEffect(() => {
    if (isVisible) {
      scale.value = withSpring(1, { damping: 10, stiffness: 100 });
      opacity.value = withTiming(1, { duration: 300 });
      confettiY.value = withRepeat(
        withSequence(
          withTiming(10, { duration: 1000 }),
          withTiming(-10, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      scale.value = withTiming(0.5, { duration: 200 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [isVisible, scale, opacity, confettiY]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const confettiStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: confettiY.value }],
  }));

  if (!isVisible) return null;

  return (
    <View style={styles.completionOverlay}>
      <Animated.View
        style={[
          styles.completionPanel,
          { paddingBottom: insets.bottom + Spacing.lg },
          panelStyle,
        ]}
      >
        {/* Confetti decoration */}
        <Animated.View style={[styles.confettiContainer, confettiStyle]}>
          <Text style={styles.confettiText}>🎉 ⭐ 🏆 ⭐ 🎉</Text>
        </Animated.View>

        {/* Trophy icon */}
        <View style={[styles.trophyContainer, { backgroundColor: vibeConfig.color }]}>
          <Ionicons name="trophy" size={48} color={Colors.white} />
        </View>

        <Text style={styles.completionTitle}>Quest Complete!</Text>
        <Text style={styles.completionMission}>{mission.title}</Text>

        <View style={styles.completionStats}>
          <View style={styles.completionStatItem}>
            <Ionicons name="footsteps" size={24} color={vibeConfig.color} />
            <Text style={styles.completionStatValue}>
              {stepsCompleted.toLocaleString()}
            </Text>
            <Text style={styles.completionStatLabel}>Steps Taken</Text>
          </View>

          <View style={styles.completionDivider} />

          <View style={styles.completionStatItem}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.energyHigh} />
            <Text style={styles.completionStatValue}>100%</Text>
            <Text style={styles.completionStatLabel}>Completed</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.dismissButton, { backgroundColor: vibeConfig.color }]}
          onPress={onDismiss}
          activeOpacity={0.8}
        >
          <Text style={styles.dismissButtonText}>Continue Exploring</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.white} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  blurContainer: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  vibeBadge: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  vibeEmoji: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
  },
  missionLabel: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  missionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    opacity: 0.7,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  progressSection: {
    marginBottom: Spacing.sm,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarGlow: {
    position: 'absolute',
    height: '100%',
    borderRadius: 6,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    opacity: 0.6,
  },
  progressBadge: {
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  progressText: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
  },
  motivationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  motivationText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  // Completion panel styles
  completionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
    padding: Spacing.lg,
  },
  completionPanel: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    ...Shadows.large,
  },
  confettiContainer: {
    position: 'absolute',
    top: -30,
  },
  confettiText: {
    fontSize: 24,
  },
  trophyContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  completionTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  completionMission: {
    fontSize: FontSizes.md,
    color: Colors.text,
    opacity: 0.7,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  completionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  completionStatItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  completionStatValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  completionStatLabel: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    opacity: 0.6,
  },
  completionDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  dismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  dismissButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.white,
  },
});

export default ActiveMissionPanel;
