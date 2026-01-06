import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DiscoveryCardProps {
  isVisible: boolean;
  destinationArchetype: string;
  destinationNarrative: string;
  poiName?: string;
  poiAddress?: string;
  discoveryStory?: string;
  onCollectReward: () => void;
}

/**
 * Discovery Card - Slide-up card that appears when user arrives at destination
 * Reveals the destination archetype and narrative with beautiful animation
 */
export const DiscoveryCard: React.FC<DiscoveryCardProps> = ({
  isVisible,
  destinationArchetype,
  destinationNarrative,
  poiName,
  poiAddress,
  discoveryStory,
  onCollectReward,
}) => {
  const insets = useSafeAreaInsets();

  // Animation values
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);

  // Trigger animation when visibility changes
  useEffect(() => {
    if (isVisible) {
      // Slide up with spring animation
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
        mass: 0.8,
      });
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    } else {
      // Slide down
      translateY.value = withTiming(SCREEN_HEIGHT, {
        duration: 300,
        easing: Easing.in(Easing.ease),
      });
      opacity.value = withTiming(0, { duration: 200 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!isVisible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Backdrop blur */}
      <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Discovery Card */}
      <Animated.View
        style={[
          styles.card,
          animatedCardStyle,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={styles.cardContent}>
          {/* Header with icon */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="compass" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.headerLabel}>DISCOVERED</Text>
          </View>

          {/* Destination Archetype */}
          <Text style={styles.archetype}>{destinationArchetype}</Text>

          {/* POI Name */}
          {poiName && (
            <View style={styles.poiContainer}>
              <Ionicons name="location" size={16} color="#00B0FF" />
              <Text style={styles.poiName}>{poiName}</Text>
            </View>
          )}

          {/* POI Address */}
          {poiAddress && (
            <Text style={styles.poiAddress}>{poiAddress}</Text>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Destination Narrative */}
          <Text style={styles.narrative}>{destinationNarrative}</Text>

          {/* Discovery Story (if available) */}
          {discoveryStory && (
            <View style={styles.storyContainer}>
              <Text style={styles.storyLabel}>Local Review</Text>
              <Text style={styles.storyText}>{discoveryStory}</Text>
            </View>
          )}

          {/* Collect Reward Button */}
          <Pressable
            onPress={onCollectReward}
            style={({ pressed }) => [
              styles.rewardButton,
              pressed && styles.rewardButtonPressed,
            ]}
          >
            <View style={styles.rewardButtonContent}>
              <Text style={styles.rewardButtonText}>Collect Reward</Text>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    backgroundColor: '#1A1A2E',
  },
  cardContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    marginRight: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00B0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00B0FF',
    letterSpacing: 1.5,
  },
  archetype: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 34,
  },
  poiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  poiName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  poiAddress: {
    fontSize: 14,
    color: '#A0A0B0',
    marginTop: 4,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A3E',
    marginVertical: 16,
  },
  narrative: {
    fontSize: 17,
    fontWeight: '500',
    color: '#E0E0E8',
    lineHeight: 24,
    marginBottom: 16,
  },
  storyContainer: {
    backgroundColor: '#0F0F1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#00B0FF',
  },
  storyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B0FF',
    letterSpacing: 1,
    marginBottom: 8,
  },
  storyText: {
    fontSize: 15,
    color: '#C0C0D0',
    lineHeight: 22,
  },
  rewardButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
    backgroundColor: '#00B0FF',
  },
  rewardButtonPressed: {
    opacity: 0.8,
  },
  rewardButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  rewardButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
});

export default DiscoveryCard;
