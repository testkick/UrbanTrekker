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
  isScanning: boolean;
  disabled?: boolean;
}

const ScanAreaButtonComponent: React.FC<ScanAreaButtonProps> = ({
  onPress,
  isScanning,
  disabled = false,
}) => {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);
  const iconRotation = useSharedValue(0);

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
    } else {
      // Scanning animation - rotate radar
      iconRotation.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [isScanning, pulseScale, pulseOpacity, iconRotation]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotation.value}deg` }],
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
      {/* Pulse ring */}
      {!isScanning && (
        <Animated.View style={[styles.pulseRing, pulseStyle]} />
      )}

      {/* Main button */}
      <TouchableOpacity
        style={[
          styles.button,
          isScanning && styles.buttonScanning,
          disabled && styles.buttonDisabled,
        ]}
        onPress={handlePress}
        activeOpacity={0.9}
        disabled={disabled || isScanning}
      >
        {isScanning ? (
          <View style={styles.scanningContent}>
            <Animated.View style={iconStyle}>
              <Ionicons name="radio" size={24} color={Colors.white} />
            </Animated.View>
            <Text style={styles.scanningText}>Scanning Area...</Text>
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
          Discover AI-generated walking quests nearby
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
});

// Memoized to prevent re-renders during GPS/step updates
export const ScanAreaButton = React.memo(ScanAreaButtonComponent);

export default ScanAreaButton;
