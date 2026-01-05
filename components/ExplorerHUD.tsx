import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
  stepsToKm,
} from '@/constants/theme';

interface ExplorerHUDProps {
  steps: number;
  isAvailable: boolean;
  batteryLevel: number; // 0.0 to 1.0
  isBatteryAvailable: boolean;
  dailyGoal?: number;
}

const ExplorerHUDComponent: React.FC<ExplorerHUDProps> = ({
  steps,
  isAvailable,
  batteryLevel,
  isBatteryAvailable,
  dailyGoal = 10000,
}) => {
  const insets = useSafeAreaInsets();
  const distance = stepsToKm(steps);
  // Convert battery level (0.0-1.0) to percentage (0-100)
  const energyLevel = Math.round(batteryLevel * 100);

  const getEnergyColor = (level: number) => {
    if (level >= 70) return Colors.energyHigh;
    if (level >= 30) return Colors.energyMedium;
    return Colors.energyLow;
  };

  const getEnergyIcon = (level: number): keyof typeof Ionicons.glyphMap => {
    if (level >= 70) return 'flash';
    if (level >= 30) return 'flash-outline';
    return 'battery-half-outline';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
        <View style={styles.hudContent}>
          {/* Steps Section */}
          <View style={styles.statItem}>
            <View style={styles.iconContainer}>
              <Ionicons name="footsteps" size={20} color={Colors.primary} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>
                {isAvailable ? steps.toLocaleString() : '--'}
              </Text>
              <Text style={styles.statLabel}>STEPS</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Distance Section */}
          <View style={styles.statItem}>
            <View style={styles.iconContainer}>
              <Ionicons name="navigate" size={20} color={Colors.accent} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>
                {isAvailable ? distance.toFixed(2) : '--'}
              </Text>
              <Text style={styles.statLabel}>KM</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Energy Section */}
          <View style={styles.statItem}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={getEnergyIcon(energyLevel)}
                size={20}
                color={getEnergyColor(energyLevel)}
              />
            </View>
            <View style={styles.statInfo}>
              <View style={styles.energyBarContainer}>
                <View
                  style={[
                    styles.energyBar,
                    {
                      width: `${energyLevel}%`,
                      backgroundColor: getEnergyColor(energyLevel),
                    },
                  ]}
                />
              </View>
              <Text style={styles.statLabel}>
                {isBatteryAvailable ? `${energyLevel}%` : 'ENERGY'}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Indicator */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isAvailable ? Colors.energyHigh : Colors.energyLow },
            ]}
          />
          <Text style={styles.statusText}>
            {isAvailable ? 'TRACKING ACTIVE' : 'SENSOR UNAVAILABLE'}
          </Text>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: Spacing.md,
  },
  blurContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.hudBorder,
  },
  hudContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statInfo: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    opacity: 0.8,
    fontWeight: '500',
    letterSpacing: 1,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: Spacing.sm,
  },
  energyBarContainer: {
    width: 50,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  energyBar: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    opacity: 0.7,
    fontWeight: '500',
    letterSpacing: 1,
  },
});

// Memoized to prevent re-renders when parent updates but props don't change
export const ExplorerHUD = React.memo(ExplorerHUDComponent);

export default ExplorerHUD;
