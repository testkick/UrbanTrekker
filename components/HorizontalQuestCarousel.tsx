/**
 * Horizontal Quest Carousel
 * Premium carousel interface for mission selection with dynamic map integration
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Mission, MissionVibe } from '@/types/mission';
import { Colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const CARD_SPACING = 16;
const SIDE_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2;

interface HorizontalQuestCarouselProps {
  missions: Mission[];
  onSelectMission: (mission: Mission) => void;
  onFocusedMissionChange: (mission: Mission, index: number) => void;
  onDismiss: () => void;
  isVisible: boolean;
}

/**
 * Get colors for each mission vibe
 */
const getVibeColors = (vibe: MissionVibe) => {
  switch (vibe) {
    case 'chill':
      return {
        primary: '#10B981', // Green
        secondary: '#34D399',
        gradient: ['#10B981', '#34D399'] as const,
        shadow: 'rgba(16, 185, 129, 0.3)',
      };
    case 'discovery':
      return {
        primary: '#F59E0B', // Orange
        secondary: '#FBBF24',
        gradient: ['#F59E0B', '#FBBF24'] as const,
        shadow: 'rgba(245, 158, 11, 0.3)',
      };
    case 'workout':
      return {
        primary: '#EF4444', // Red
        secondary: '#F87171',
        gradient: ['#EF4444', '#F87171'] as const,
        shadow: 'rgba(239, 68, 68, 0.3)',
      };
    default:
      return {
        primary: Colors.primary,
        secondary: Colors.accent,
        gradient: [Colors.primary, Colors.accent] as const,
        shadow: 'rgba(99, 102, 241, 0.3)',
      };
  }
};

/**
 * Get icon for each vibe
 */
const getVibeIcon = (vibe: MissionVibe): string => {
  switch (vibe) {
    case 'chill':
      return '🌿';
    case 'discovery':
      return '🔍';
    case 'workout':
      return '⚡';
    default:
      return '✨';
  }
};

export const HorizontalQuestCarousel: React.FC<HorizontalQuestCarouselProps> = ({
  missions,
  onSelectMission,
  onFocusedMissionChange,
  onDismiss,
  isVisible,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Handle scroll events to detect centered card
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));

      if (index !== focusedIndex && index >= 0 && index < missions.length) {
        setFocusedIndex(index);
        onFocusedMissionChange(missions[index], index);
      }
    },
    [focusedIndex, missions, onFocusedMissionChange]
  );

  // Auto-focus first mission on mount
  useEffect(() => {
    if (isVisible && missions.length > 0) {
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        onFocusedMissionChange(missions[0], 0);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isVisible, missions, onFocusedMissionChange]);

  const renderMissionCard = useCallback(
    ({ item, index }: { item: Mission; index: number }) => {
      const vibeColors = getVibeColors(item.vibe);

      // Scale animation for focused card
      const inputRange = [
        (index - 1) * (CARD_WIDTH + CARD_SPACING),
        index * (CARD_WIDTH + CARD_SPACING),
        (index + 1) * (CARD_WIDTH + CARD_SPACING),
      ];

      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.9, 1, 0.9],
        extrapolate: 'clamp',
      });

      const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0.6, 1, 0.6],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View
          style={[
            styles.cardContainer,
            {
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          <View style={[styles.card, { shadowColor: vibeColors.shadow }]}>
            {/* Vibe indicator gradient */}
            <LinearGradient
              colors={vibeColors.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.vibeIndicator}
            />

            {/* Mission header */}
            <View style={styles.cardHeader}>
              <View style={styles.vibeContainer}>
                <Text style={styles.vibeIcon}>{getVibeIcon(item.vibe)}</Text>
                <Text style={[styles.vibeText, { color: vibeColors.primary }]}>
                  {item.vibe.toUpperCase()}
                </Text>
              </View>
              <View style={styles.stepsContainer}>
                <Text style={styles.stepsText}>🦶 {item.stepTarget} steps</Text>
              </View>
            </View>

            {/* Mission title */}
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>

            {/* Mission description */}
            <Text style={styles.cardDescription} numberOfLines={3}>
              {item.description}
            </Text>

            {/* Destination info if available */}
            {item.realPOI && (
              <View style={styles.destinationContainer}>
                <Text style={styles.destinationIcon}>📍</Text>
                <View style={styles.destinationInfo}>
                  <Text style={styles.destinationName} numberOfLines={1}>
                    {item.realPOI.name}
                  </Text>
                  {item.realPOI.rating && (
                    <Text style={styles.destinationRating}>
                      ⭐ {item.realPOI.rating.toFixed(1)}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Accept Mission button */}
            <TouchableOpacity
              style={[
                styles.acceptButton,
                {
                  backgroundColor: vibeColors.primary,
                  shadowColor: vibeColors.shadow,
                },
              ]}
              onPress={() => onSelectMission(item)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={vibeColors.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.acceptButtonGradient}
              >
                <Text style={styles.acceptButtonText}>Accept Mission</Text>
                <Text style={styles.acceptButtonIcon}>→</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      );
    },
    [scrollX, onSelectMission]
  );

  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Gradient backdrop */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.7)']}
        style={styles.backdrop}
        pointerEvents="none"
      />

      {/* Blur effect for iOS */}
      {Platform.OS === 'ios' && (
        <BlurView intensity={20} style={styles.blurView} tint="dark" />
      )}

      {/* Dismiss button */}
      <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
        <View style={styles.dismissButtonInner}>
          <Text style={styles.dismissButtonText}>✕</Text>
        </View>
      </TouchableOpacity>

      {/* Carousel header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Your Adventure</Text>
        <Text style={styles.headerSubtitle}>
          Swipe to preview routes • {missions.length} missions available
        </Text>
      </View>

      {/* Horizontal carousel */}
      <Animated.FlatList
        ref={flatListRef}
        data={missions}
        renderItem={renderMissionCard}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingHorizontal: SIDE_PADDING,
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: true,
            listener: handleScroll,
          }
        )}
        scrollEventThrottle={16}
      />

      {/* Page indicators */}
      <View style={styles.indicators}>
        {missions.map((_, index) => {
          const inputRange = [
            (index - 1) * (CARD_WIDTH + CARD_SPACING),
            index * (CARD_WIDTH + CARD_SPACING),
            (index + 1) * (CARD_WIDTH + CARD_SPACING),
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [1, 1.5, 1],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.indicator,
                {
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 420,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  dismissButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 100,
  },
  dismissButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    zIndex: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_SPACING / 2,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  vibeIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  vibeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vibeIcon: {
    fontSize: 20,
  },
  vibeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stepsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 26,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  destinationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  destinationIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  destinationInfo: {
    flex: 1,
  },
  destinationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  destinationRating: {
    fontSize: 12,
    color: '#666',
  },
  acceptButton: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  acceptButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  acceptButtonIcon: {
    fontSize: 20,
    color: '#fff',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
    zIndex: 2,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});
