import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

interface PulsingMarkerProps {
  size?: number;
  color?: string;
}

export const PulsingMarker: React.FC<PulsingMarkerProps> = ({ size = 24, color }) => {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    // Pulse animation - scale up and fade out
    pulseScale.value = withRepeat(
      withTiming(2.5, {
        duration: 1500,
        easing: Easing.out(Easing.ease),
      }),
      -1, // infinite repeats
      false // don't reverse
    );

    pulseOpacity.value = withRepeat(
      withTiming(0, {
        duration: 1500,
        easing: Easing.out(Easing.ease),
      }),
      -1,
      false
    );
  }, [pulseScale, pulseOpacity]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const outerRingSize = size * 1.5;
  const pulseSize = size * 2;

  const coreColor = color || Colors.markerCore;
  const pulseColor = color || Colors.markerPulse;

  return (
    <View style={[styles.container, { width: pulseSize * 2, height: pulseSize * 2 }]}>
      {/* Pulsing ring */}
      <Animated.View
        style={[
          styles.pulse,
          {
            width: pulseSize,
            height: pulseSize,
            borderRadius: pulseSize / 2,
            backgroundColor: pulseColor,
          },
          pulseAnimatedStyle,
        ]}
      />

      {/* Outer ring */}
      <View
        style={[
          styles.outerRing,
          {
            width: outerRingSize,
            height: outerRingSize,
            borderRadius: outerRingSize / 2,
          },
        ]}
      />

      {/* Inner core */}
      <View
        style={[
          styles.core,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: coreColor,
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
  pulse: {
    position: 'absolute',
  },
  outerRing: {
    position: 'absolute',
    backgroundColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  core: {
    position: 'absolute',
  },
});

export default PulsingMarker;
