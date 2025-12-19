import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Mission, VIBE_CONFIG } from '@/types/mission';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from '@/constants/theme';

interface QuestCardProps {
  mission: Mission;
  index: number;
  onSelect: (mission: Mission) => void;
  isVisible: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const QuestCardComponent: React.FC<QuestCardProps> = ({
  mission,
  index,
  onSelect,
  isVisible,
}) => {
  const translateY = useSharedValue(300);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  const vibeConfig = VIBE_CONFIG[mission.vibe];

  useEffect(() => {
    if (isVisible) {
      // Stagger animation based on index
      const delay = index * 100;
      translateY.value = withDelay(
        delay,
        withSpring(0, {
          damping: 15,
          stiffness: 100,
        })
      );
      opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
      scale.value = withDelay(
        delay,
        withSpring(1, {
          damping: 12,
          stiffness: 100,
        })
      );
    } else {
      translateY.value = withTiming(300, { duration: 200 });
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.8, { duration: 200 });
    }
  }, [isVisible, index, translateY, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const handlePress = useCallback(() => {
    // Animate press feedback
    scale.value = withSpring(0.95, { damping: 15 });

    // Call onSelect after a brief delay for visual feedback
    // Using setTimeout instead of runOnJS to avoid animation thread issues
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15 });
      onSelect(mission);
    }, 100);
  }, [mission, onSelect, scale]);

  return (
    <AnimatedTouchable
      style={[styles.card, animatedStyle]}
      onPress={handlePress}
      activeOpacity={0.95}
    >
      {/* Vibe Badge */}
      <View style={[styles.vibeBadge, { backgroundColor: vibeConfig.color }]}>
        <Text style={styles.vibeEmoji}>{vibeConfig.emoji}</Text>
        <Text style={styles.vibeLabel}>{vibeConfig.label}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {mission.title}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {mission.description}
        </Text>
      </View>

      {/* Step Target */}
      <View style={styles.targetContainer}>
        <Ionicons name="footsteps" size={16} color={Colors.primary} />
        <Text style={styles.targetText}>
          {mission.stepTarget.toLocaleString()} steps
        </Text>
      </View>

      {/* Select Arrow */}
      <View style={[styles.selectIndicator, { backgroundColor: vibeConfig.color }]}>
        <Ionicons name="chevron-forward" size={20} color={Colors.white} />
      </View>
    </AnimatedTouchable>
  );
};

interface QuestCardContainerProps {
  missions: Mission[];
  onSelect: (mission: Mission) => void;
  isVisible: boolean;
  onDismiss: () => void;
}

const QuestCardContainerComponent: React.FC<QuestCardContainerProps> = ({
  missions,
  onSelect,
  isVisible,
  onDismiss,
}) => {
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    backdropOpacity.value = withTiming(isVisible ? 1 : 0, { duration: 300 });
  }, [isVisible, backdropOpacity]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(backdropOpacity.value, [0, 1], [0, 0.3], Extrapolation.CLAMP),
  }));

  if (!isVisible && missions.length === 0) return null;

  return (
    <>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </Animated.View>

      {/* Cards Container */}
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Choose Your Quest</Text>
          <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.cardsWrapper}>
          {missions.map((mission, index) => (
            <QuestCard
              key={mission.id}
              mission={mission}
              index={index}
              onSelect={onSelect}
              isVisible={isVisible}
            />
          ))}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.black,
    zIndex: 50,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: Colors.secondary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    ...Shadows.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardsWrapper: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.small,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  vibeBadge: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  vibeEmoji: {
    fontSize: 18,
  },
  vibeLabel: {
    fontSize: FontSizes.xs,
    color: Colors.white,
    fontWeight: '600',
    marginTop: 2,
  },
  content: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    opacity: 0.7,
    lineHeight: 18,
  },
  targetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    gap: 4,
  },
  targetText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.primary,
  },
  selectIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Memoized components to prevent unnecessary re-renders
export const QuestCard = React.memo(QuestCardComponent);
export const QuestCardContainer = React.memo(QuestCardContainerComponent);

export default QuestCard;
