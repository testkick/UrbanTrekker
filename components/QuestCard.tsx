import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, ScrollView } from 'react-native';
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
import * as Haptics from 'expo-haptics';
import { Mission, VIBE_CONFIG } from '@/types/mission';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface QuestCardProps {
  mission: Mission;
  index: number;
  onSelect: (mission: Mission) => void;
  onAccept: (mission: Mission) => void;
  isVisible: boolean;
  isSelected: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const QuestCardComponent: React.FC<QuestCardProps> = ({
  mission,
  index,
  onSelect,
  onAccept,
  isVisible,
  isSelected,
}) => {
  const translateY = useSharedValue(300);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const glowOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0);

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

  // Animate selection state (glow and button)
  useEffect(() => {
    if (isSelected) {
      glowOpacity.value = withSpring(1, { damping: 15, stiffness: 150 });
      buttonScale.value = withDelay(
        100,
        withSpring(1, {
          damping: 10,
          stiffness: 120,
        })
      );
      scale.value = withSpring(1.02, { damping: 15, stiffness: 150 });
    } else {
      glowOpacity.value = withSpring(0, { damping: 15, stiffness: 150 });
      buttonScale.value = withTiming(0, { duration: 150 });
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    }
  }, [isSelected, glowOpacity, buttonScale, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
    opacity: buttonScale.value,
  }));

  const handlePress = useCallback(() => {
    // Trigger haptic feedback on selection
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Call onSelect to mark as selected (no longer activates mission immediately)
    onSelect(mission);
  }, [mission, onSelect]);

  const handleAccept = useCallback(() => {
    // Trigger strong haptic feedback on acceptance
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Animate scale up slightly before accepting
    scale.value = withSpring(1.05, { damping: 15, stiffness: 200 });

    // Call onAccept to activate the mission after brief feedback
    setTimeout(() => {
      onAccept(mission);
    }, 150);
  }, [mission, onAccept, scale]);

  // Check if this is a premium POI mission
  const hasRealPOI = mission.realPOI !== undefined;
  const isTopRated = mission.realPOI && mission.realPOI.rating >= 4.5;
  const isOpenNow = mission.realPOI?.isOpenNow;
  const isNewDiscovery = mission.isNewDiscovery === true;

  return (
    <View style={styles.cardWrapper}>
      {/* Glow Effect for Selected Card */}
      {isSelected && (
        <Animated.View style={[styles.glowContainer, glowStyle]}>
          <View style={styles.glow} />
        </Animated.View>
      )}

      <AnimatedTouchable
        style={[
          styles.card,
          animatedStyle,
          isSelected && styles.cardSelected,
        ]}
        onPress={handlePress}
        activeOpacity={0.95}
        disabled={isSelected} // Disable tap when already selected
      >
        {/* Vibe Badge */}
        <View style={[styles.vibeBadge, { backgroundColor: vibeConfig.color }]}>
          <Text style={styles.vibeEmoji}>{vibeConfig.emoji}</Text>
          <Text style={styles.vibeLabel}>{vibeConfig.label}</Text>
        </View>

      {/* Top Right Badges */}
      <View style={styles.badgesContainer}>
        {/* NEW DISCOVERY Badge - Glowing badge for never-visited places */}
        {isNewDiscovery && (
          <View style={styles.newDiscoveryBadge}>
            <Ionicons name="sparkles" size={12} color={Colors.primary} />
            <Text style={styles.newDiscoveryText}>New Discovery</Text>
          </View>
        )}

        {/* Open Now Badge */}
        {isOpenNow && (
          <View style={styles.openNowBadge}>
            <View style={styles.liveIndicator} />
            <Text style={styles.openNowText}>Open Now</Text>
          </View>
        )}

        {/* Top Rated Badge */}
        {isTopRated && (
          <View style={styles.topRatedBadge}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.topRatedText}>Top Rated</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Real Business Name (if available) */}
        {hasRealPOI && mission.realPOI && (
          <View style={styles.businessNameContainer}>
            <Ionicons name="location" size={14} color={vibeConfig.color} />
            <Text style={[styles.businessName, { color: vibeConfig.color }]} numberOfLines={1}>
              {mission.realPOI.name}
            </Text>
          </View>
        )}

        <Text style={styles.title} numberOfLines={1}>
          {mission.title}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {mission.description}
        </Text>

        {/* Rating Display (if available) */}
        {mission.realPOI && mission.realPOI.rating > 0 && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>
              {mission.realPOI.rating.toFixed(1)} • {mission.realPOI.userRatingsTotal || 0} reviews
            </Text>
          </View>
        )}
      </View>

      {/* Step Target */}
      <View style={styles.targetContainer}>
        <Ionicons name="footsteps" size={16} color={Colors.primary} />
        <Text style={styles.targetText}>
          {mission.stepTarget.toLocaleString()} steps
        </Text>
      </View>

      {/* Select Arrow - Only show when NOT selected */}
      {!isSelected && (
        <View style={[styles.selectIndicator, { backgroundColor: vibeConfig.color }]}>
          <Ionicons name="chevron-forward" size={20} color={Colors.white} />
        </View>
      )}
    </AnimatedTouchable>

    {/* Accept Mission Button - Only show when selected */}
    {isSelected && (
      <Animated.View style={[styles.acceptButtonContainer, buttonAnimatedStyle]}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={handleAccept}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={24} color={Colors.white} />
          <Text style={styles.acceptButtonText}>Accept Mission</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.white} />
        </TouchableOpacity>
      </Animated.View>
    )}
  </View>
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
  const insets = useSafeAreaInsets();
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

  useEffect(() => {
    backdropOpacity.value = withTiming(isVisible ? 1 : 0, { duration: 300 });
  }, [isVisible, backdropOpacity]);

  // Reset selection when container becomes invisible
  useEffect(() => {
    if (!isVisible) {
      setSelectedMissionId(null);
    }
  }, [isVisible]);

  const handleSelectMission = useCallback((mission: Mission) => {
    // Mark mission as selected (browsing step)
    setSelectedMissionId(mission.id);
    // Haptic feedback handled by QuestCard component
  }, []);

  const handleAcceptMission = useCallback((mission: Mission) => {
    // Actually activate the mission (lock-in step)
    onSelect(mission);
  }, [onSelect]);

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
      <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Choose Your Quest</Text>
            <Text style={styles.headerSubtitle}>{missions.length} adventures await</Text>
          </View>
          <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.cardsWrapper}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {missions.map((mission, index) => (
            <QuestCard
              key={mission.id}
              mission={mission}
              index={index}
              onSelect={handleSelectMission}
              onAccept={handleAcceptMission}
              isVisible={isVisible}
              isSelected={selectedMissionId === mission.id}
            />
          ))}
        </ScrollView>
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
    maxHeight: '75%', // Limit to 75% of screen height
    ...Shadows.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    opacity: 0.6,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  cardsWrapper: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  cardWrapper: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  glowContainer: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    zIndex: 0,
  },
  glow: {
    flex: 1,
    borderRadius: BorderRadius.lg + 4,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
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
    position: 'relative',
    zIndex: 1,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: Colors.accent,
    ...Shadows.large,
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
  badgesContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'column',
    gap: 4,
    zIndex: 10,
  },
  openNowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    gap: 4,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  openNowText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4CAF50',
    letterSpacing: 0.5,
  },
  topRatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    gap: 4,
  },
  topRatedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B8860B',
    letterSpacing: 0.5,
  },
  newDiscoveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 125, 50, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    gap: 4,
    // Subtle glow effect
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  newDiscoveryText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  businessNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  businessName: {
    fontSize: FontSizes.md,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    opacity: 0.7,
    lineHeight: 18,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  ratingText: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    opacity: 0.8,
    fontWeight: '500',
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
  acceptButtonContainer: {
    marginTop: Spacing.sm,
    zIndex: 2,
  },
  acceptButton: {
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    ...Shadows.medium,
    shadowColor: Colors.accent,
    shadowOpacity: 0.4,
    elevation: 6,
  },
  acceptButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

// Memoized components to prevent unnecessary re-renders
export const QuestCard = React.memo(QuestCardComponent);
export const QuestCardContainer = React.memo(QuestCardContainerComponent);

export default QuestCard;
