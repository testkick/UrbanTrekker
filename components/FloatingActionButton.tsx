/**
 * Premium Floating Action Button Component
 * Enhanced with frosted glass effect, smooth animations, and haptic feedback
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing } from '@/constants/theme';

interface FloatingActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  onPress: () => void;
  position: 'left' | 'right';
  bottom: number;
  color?: string;
  size?: 'small' | 'medium' | 'large';
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  label,
  onPress,
  position,
  bottom,
  color = Colors.primary,
  size = 'medium',
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const sizeConfig = {
    small: { width: 44, height: 44, iconSize: 20 },
    medium: { width: 56, height: 56, iconSize: 24 },
    large: { width: 64, height: 64, iconSize: 28 },
  };

  const config = sizeConfig[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePress = async () => {
    // Haptic feedback
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Press animation with spring bounce
    scale.value = withSequence(
      withTiming(0.88, { duration: 100 }),
      withSpring(1, {
        damping: 12,
        stiffness: 300,
      })
    );

    // Subtle opacity pulse
    opacity.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withTiming(1, { duration: 200 })
    );

    onPress();
  };

  const positionStyle = position === 'left'
    ? { left: Spacing.md }
    : { right: Spacing.md };

  return (
    <Animated.View
      style={[
        styles.container,
        positionStyle,
        { bottom, width: config.width, height: config.height },
        animatedStyle,
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.9}
        style={styles.touchable}
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 80 : 60}
          tint="light"
          style={[
            styles.blurContainer,
            { borderRadius: config.width / 2 },
          ]}
        >
          {/* Icon */}
          <Ionicons name={icon} size={config.iconSize} color={color} />

          {/* Optional label */}
          {label && (
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {label}
            </Text>
          )}
        </BlurView>

        {/* Premium shadow overlay */}
        <Animated.View style={[styles.shadowOverlay, { borderRadius: config.width / 2 }]} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 100,
  },
  touchable: {
    width: '100%',
    height: '100%',
  },
  blurContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    // Premium shadow for depth
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  shadowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  label: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
