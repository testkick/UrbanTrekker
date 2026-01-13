import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/constants/theme';

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

  const handlePress = async () => {
    if (!isScanning && !disabled) {
      // Haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

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

      {/* Main button with frosted glass */}
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={onLongPress}
        delayLongPress={800}
        activeOpacity={0.95}
        disabled={disabled || isScanning}
        style={[
          styles.buttonWrapper,
          disabled && styles.buttonDisabled,
        ]}
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 90 : 70}
          tint={isScanning ? 'dark' : 'light'}
          style={[
            styles.button,
            isScanning && styles.buttonScanning,
          ]}
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
              <Ionicons name="scan" size={28} color={Colors.white} />
              <Text style={styles.buttonText}>Scan Area</Text>
              <Ionicons name="chevron-forward" size={22} color={Colors.white} />
            </View>
          )}
        </BlurView>

        {/* Premium shadow overlay */}
        <View style={styles.shadowOverlay} />
      </TouchableOpacity>

      {/* Helper text */}
      {!isScanning && (
        <Text style={styles.helperText}>
          Fresh adventures every scan with smart rotation
        </Text>
      )}
      {isScanning && (
        <Text style={styles.scanningHelperText}>
          Discovery Engine: Finding unique destinations nearby...
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
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.accent,
  },
  buttonWrapper: {
    width: '100%',
    height: 60,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    // Premium shadow for depth
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  button: {
    flex: 1,
    backgroundColor: Colors.accent, // Fallback for non-blur platforms
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonScanning: {
    backgroundColor: Colors.primary,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  shadowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.xl,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    pointerEvents: 'none',
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
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
    height: 60,
    borderRadius: BorderRadius.xl,
    borderWidth: 3,
    borderStyle: 'solid',
  },
  radarRing1: {
    borderColor: Colors.primary, // Forest Green for Discovery Engine
  },
  radarRing2: {
    borderColor: Colors.accent, // Waypoint Orange for Discovery Engine
  },
  radarRing3: {
    borderColor: Colors.primary, // Forest Green for Discovery Engine
  },
});

// Memoized to prevent re-renders during GPS/step updates
export const ScanAreaButton = React.memo(ScanAreaButtonComponent);

export default ScanAreaButton;
