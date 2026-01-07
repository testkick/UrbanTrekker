import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PulsingMarker } from './PulsingMarker';
import { DestinationType } from '@/types/mission';

interface DestinationMarkerProps {
  destinationType: DestinationType;
  size?: number;
}

/**
 * Map destination types to appropriate Ionicons names
 */
const DESTINATION_ICONS: Record<DestinationType, keyof typeof Ionicons.glyphMap> = {
  bakery: 'restaurant', // Croissant/bread alternative
  cafe: 'cafe',
  park: 'leaf',
  landmark: 'compass',
  restaurant: 'restaurant',
  shop: 'storefront',
  gallery: 'color-palette',
  viewpoint: 'eye',
  mystery: 'search',
};

/**
 * Dynamic goal marker that changes icon based on destination type
 * Maintains the pulsing animation from Phase 11
 */
export const DestinationMarker: React.FC<DestinationMarkerProps> = ({
  destinationType,
  size = 32,
}) => {
  const iconName = DESTINATION_ICONS[destinationType] || 'flag';

  return (
    <View style={styles.container}>
      {/* Pulsing blue marker background */}
      <PulsingMarker size={size} color="#00B0FF" />

      {/* Destination-specific icon overlay */}
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={size * 0.5} color="#FFFFFF" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DestinationMarker;
