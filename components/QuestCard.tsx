import React, { useEffect, useCallback } from 'react';
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
import { Mission, VIBE_CONFIG } from '@/types/mission';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  // Check if this is a premium POI mission
  const hasRealPOI = mission.realPOI !== undefined;
  const isTopRated = mission.realPOI && mission.realPOI.rating >= 4.5;
  const isOpenNow = mission.realPOI?.isOpenNow;
  const isNewDiscovery = mission.isNewDiscovery === true;

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
  const insets = useSafeAreaInsets();

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
              onSelect={onSelect}
              isVisible={isVisible}
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
});

// Memoized components to prevent unnecessary re-renders
export const QuestCard = React.memo(QuestCardComponent);
export const QuestCardContainer = React.memo(QuestCardContainerComponent);

export default QuestCard;
