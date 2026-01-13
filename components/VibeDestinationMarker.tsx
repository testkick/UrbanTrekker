/**
 * Vibe Destination Marker
 * Pulsing destination marker that changes color based on mission vibe
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { MissionVibe } from '@/types/mission';

interface VibeDestinationMarkerProps {
  size?: number;
  vibe: MissionVibe;
}

/**
 * Get color for each mission vibe
 */
const getVibeColor = (vibe: MissionVibe): string => {
  switch (vibe) {
    case 'chill':
      return '#10B981'; // Green
    case 'discovery':
      return '#F59E0B'; // Orange
    case 'workout':
      return '#EF4444'; // Red
    default:
      return '#6366F1'; // Indigo
  }
};

export const VibeDestinationMarker: React.FC<VibeDestinationMarkerProps> = ({
  size = 24,
  vibe,
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const vibeColor = getVibeColor(vibe);

  useEffect(() => {
    // Continuous pulsing animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [pulseAnim]);

  // Outer ring scale and opacity
  const outerScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5],
  });

  const outerOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  // Middle ring scale and opacity
  const middleScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  const middleOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0],
  });

  // Inner dot pulse
  const innerScale = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.2, 1],
  });

  return (
    <View style={[styles.container, { width: size * 3, height: size * 3 }]}>
      {/* Outer pulsing ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: size * 2,
            height: size * 2,
            borderRadius: size,
            borderColor: vibeColor,
            transform: [{ scale: outerScale }],
            opacity: outerOpacity,
          },
        ]}
      />

      {/* Middle pulsing ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: size * 1.6,
            height: size * 1.6,
            borderRadius: size * 0.8,
            borderColor: vibeColor,
            transform: [{ scale: middleScale }],
            opacity: middleOpacity,
          },
        ]}
      />

      {/* Inner solid dot */}
      <Animated.View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: vibeColor,
            transform: [{ scale: innerScale }],
          },
        ]}
      />

      {/* White center highlight */}
      <View
        style={[
          styles.highlight,
          {
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: size * 0.2,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  dot: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  highlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
});
