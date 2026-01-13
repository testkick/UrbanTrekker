/**
 * Stepquest Urban Explorer Theme
 * Color palette and styling constants for the Explorer's Dashboard
 */

export const Colors = {
  // Primary colors
  primary: '#2E7D32', // Forest Green
  secondary: '#F5F5DC', // Map Parchment
  accent: '#FF6F00', // Waypoint Orange
  text: '#263238', // Deep Charcoal

  // Supporting colors
  white: '#FFFFFF',
  black: '#000000',

  // Transparency variants
  primaryTransparent: 'rgba(46, 125, 50, 0.8)',
  secondaryTransparent: 'rgba(245, 245, 220, 0.9)',
  accentTransparent: 'rgba(255, 111, 0, 0.8)',

  // HUD specific
  hudBackground: 'rgba(38, 50, 56, 0.85)', // Deep Charcoal with transparency
  hudBorder: 'rgba(46, 125, 50, 0.5)',

  // Status colors
  energyHigh: '#4CAF50',
  energyMedium: '#FFC107',
  energyLow: '#F44336',
  success: '#4CAF50',
  error: '#F44336',

  // Map marker
  markerPulse: 'rgba(46, 125, 50, 0.3)',
  markerCore: '#2E7D32',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const Shadows = {
  small: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Step to distance conversion (average step length in meters)
export const AVERAGE_STEP_LENGTH_METERS = 0.762; // ~30 inches

// Convert steps to kilometers
export const stepsToKm = (steps: number): number => {
  return (steps * AVERAGE_STEP_LENGTH_METERS) / 1000;
};

// Convert steps to miles
export const stepsToMiles = (steps: number): number => {
  return stepsToKm(steps) * 0.621371;
};

// Calculate energy level (0-100) based on steps
// Assumes 10,000 steps = 100% daily goal
export const calculateEnergyLevel = (steps: number, dailyGoal = 10000): number => {
  return Math.min(100, Math.round((steps / dailyGoal) * 100));
};
