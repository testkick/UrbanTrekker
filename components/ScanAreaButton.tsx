import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from '@/constants/theme';

interface ScanAreaButtonProps {
  onPress: () => void;
  onLongPress?: () => void;
  isScanning: boolean;
  disabled?: boolean;
}

const ScanAreaButtonComponent: React.FC<ScanAreaButtonProps> = ({
  onPress,
  onLongPress,
  isScanning,
  disabled = false,
}) => {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);
  const iconRotation = useSharedValue(0);

  // Multi-tier radar rings (representing 1km, 3km, 6km searches)
  const radarRing1 = useSharedValue(0);
  const radarRing2 = useSharedValue(0);
  const radarRing3 = useSharedValue(0);

  // Pulsing animation for idle state
  useEffect(() => {
    if (!isScanning) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 1000 }),
          withTiming(0.5, { duration: 1000 })
        ),
        -1,
        true
      );

      // Reset radar rings
      radarRing1.value = 0;
      radarRing2.value = 0;
      radarRing3.value = 0;
    } else {
      // Scanning animation - rotate radar
      iconRotation.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );

      // Expanding radar rings (staggered for visual effect)
      // Ring 1: Represents Chill tier (500m-1km)
      radarRing1.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      );

      // Ring 2: Represents Discovery tier (1.5km-3km) - starts 400ms later
      setTimeout(() => {
        radarRing2.value = withRepeat(
          withSequence(
            withTiming(0, { duration: 0 }),
            withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 0 })
          ),
          -1,
          false
        );
      }, 400);

      // Ring 3: Represents Workout tier (4km-6km) - starts 800ms later
      setTimeout(() => {
        radarRing3.value = withRepeat(
          withSequence(
            withTiming(0, { duration: 0 }),
            withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 0 })
          ),
          -1,
          false
        );
      }, 800);
    }
  }, [isScanning, pulseScale, pulseOpacity, iconRotation, radarRing1, radarRing2, radarRing3]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotation.value}deg` }],
  }));

  // Radar ring animations (expanding and fading)
  const radarRing1Style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.5 + radarRing1.value * 1.5 }],
    opacity: 0.6 * (1 - radarRing1.value),
  }));

  const radarRing2Style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.5 + radarRing2.value * 2.5 }],
    opacity: 0.5 * (1 - radarRing2.value),
  }));

  const radarRing3Style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.5 + radarRing3.value * 3.5 }],
    opacity: 0.4 * (1 - radarRing3.value),
  }));

  const handlePress = () => {
    if (!isScanning && !disabled) {
      // Button press animation
      pulseScale.value = withSequence(
        withSpring(0.95, { damping: 15 }),
        withSpring(1, { damping: 15 })
      );
      onPress();
    }
  };

  return (
    <View style={styles.container}>
      {/* Pulse ring (idle state) */}
      {!isScanning && (
        <Animated.View style={[styles.pulseRing, pulseStyle]} />
      )}

      {/* Radar rings (scanning state) - Multi-tier visual indicators */}
      {isScanning && (
        <>
          <Animated.View style={[styles.radarRing, styles.radarRing1, radarRing1Style]} />
          <Animated.View style={[styles.radarRing, styles.radarRing2, radarRing2Style]} />
          <Animated.View style={[styles.radarRing, styles.radarRing3, radarRing3Style]} />
        </>
      )}

      {/* Main button */}
      <TouchableOpacity
        style={[
          styles.button,
          isScanning && styles.buttonScanning,
          disabled && styles.buttonDisabled,
        ]}
        onPress={handlePress}
        onLongPress={onLongPress}
        delayLongPress={800}
        activeOpacity={0.9}
        disabled={disabled || isScanning}
      >
        {isScanning ? (
          <View style={styles.scanningContent}>
            <Animated.View style={iconStyle}>
              <Ionicons name="radio" size={24} color={Colors.white} />
            </Animated.View>
            <Text style={styles.scanningText}>Searching High-Quality POIs...</Text>
            <ActivityIndicator size="small" color={Colors.white} />
          </View>
        ) : (
          <View style={styles.idleContent}>
            <Ionicons name="scan" size={24} color={Colors.white} />
            <Text style={styles.buttonText}>Scan Area</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.white} />
          </View>
        )}
      </TouchableOpacity>

      {/* Helper text */}
      {!isScanning && (
        <Text style={styles.helperText}>
          Discover high-rated local destinations nearby
        </Text>
      )}
      {isScanning && (
        <Text style={styles.scanningHelperText}>
          Searching 1km → 3km → 6km radius for top-rated spots...
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  pulseRing: {
    position: 'absolute',
    top: -10,
    width: '100%',
    height: 70,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.accent,
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  buttonScanning: {
    backgroundColor: Colors.primary,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255, 111, 0, 0.5)',
  },
  idleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  buttonText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  scanningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  scanningText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.white,
  },
  helperText: {
    marginTop: Spacing.sm,
    fontSize: FontSizes.sm,
    color: Colors.text,
    opacity: 0.6,
    textAlign: 'center',
  },
  scanningHelperText: {
    marginTop: Spacing.sm,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    opacity: 0.8,
    textAlign: 'center',
    fontWeight: '600',
  },
  radarRing: {
    position: 'absolute',
    width: '100%',
    height: 56,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: 'solid',
  },
  radarRing1: {
    borderColor: '#4CAF50', // Green for Chill tier (1km)
  },
  radarRing2: {
    borderColor: '#2196F3', // Blue for Discovery tier (3km)
  },
  radarRing3: {
    borderColor: '#FF5722', // Red for Workout tier (6km)
  },
});

// Memoized to prevent re-renders during GPS/step updates
export const ScanAreaButton = React.memo(ScanAreaButtonComponent);

export default ScanAreaButton;
