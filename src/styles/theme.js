import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// ============================================================================
// REFINED CLEAN DESIGN SYSTEM - Glass Cards with Status Colors
// ============================================================================

// Time-based background configurations with clear, simple photos
const TIME_BACKGROUNDS = {
  earlyMorning: {
    gradient: ['#1a1a2e', '#16213e', '#0f3460'],
    // Clear dawn sky
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80',
    time: 'Early Morning',
    hour: [4, 7]
  },
  morning: {
    gradient: ['#4A90E2', '#50B5E9', '#5DC8F4'],
    // Clear blue morning sky
    image: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&q=80',
    time: 'Morning',
    hour: [7, 11]
  },
  midday: {
    gradient: ['#56CCF2', '#2F80ED', '#1E5DB8'],
    // Bright clear sky
    image: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=1200&q=80',
    time: 'Midday',
    hour: [11, 14]
  },
  afternoon: {
    gradient: ['#87CEEB', '#6BB6D6', '#4A9FC2'],
    // Afternoon sky with soft clouds
    image: 'https://images.unsplash.com/photo-1517685352821-92cf88aee5a5?w=1200&q=80',
    time: 'Afternoon',
    hour: [14, 17]
  },
  evening: {
    gradient: ['#FF8C42', '#FF6B35', '#F24C27'],
    // Warm sunset colors
    image: 'https://images.unsplash.com/photo-1472120435266-53107fd0c44a?w=1200&q=80',
    time: 'Evening',
    hour: [17, 19]
  },
  dusk: {
    gradient: ['#667eea', '#764ba2', '#5a4a99'],
    // Purple dusk sky
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
    time: 'Dusk',
    hour: [19, 21]
  },
  night: {
    gradient: ['#141E30', '#243B55', '#1a2634'],
    // Deep blue night sky
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80',
    time: 'Night',
    hour: [21, 23]
  },
  lateNight: {
    gradient: ['#0f0c29', '#302b63', '#24243e'],
    // Dark night with stars
    image: 'https://images.unsplash.com/photo-1444080748397-f442aa95c3e5?w=1200&q=80',
    time: 'Late Night',
    hour: [23, 4]
  }
};

// ============================================================================
// COLORS - Clean & Refined
// ============================================================================
export const Colors = {
  // Text colors
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.85)',
    tertiary: 'rgba(255, 255, 255, 0.7)',
    hint: 'rgba(255, 255, 255, 0.5)',
  },
  
  // Clean glass effects - very subtle
  glass: {
    clear: 'rgba(255, 255, 255, 0.08)',      // Very subtle
    light: 'rgba(255, 255, 255, 0.12)',      // Light glass
    medium: 'rgba(255, 255, 255, 0.15)',     // Standard glass
    border: 'rgba(255, 255, 255, 0.2)',      // Border color
  },
  
  // Status-based glass colors (blend with background)
  status: {
    success: {
      glass: 'rgba(76, 175, 80, 0.15)',      // Green tint
      border: 'rgba(76, 175, 80, 0.3)',      // Green border
      solid: '#4CAF50',
    },
    warning: {
      glass: 'rgba(255, 193, 7, 0.15)',      // Orange tint
      border: 'rgba(255, 193, 7, 0.3)',      // Orange border
      solid: '#FFC107',
    },
    danger: {
      glass: 'rgba(244, 67, 54, 0.15)',      // Red tint
      border: 'rgba(244, 67, 54, 0.3)',      // Red border
      solid: '#F44336',
    },
    info: {
      glass: 'rgba(33, 150, 243, 0.15)',     // Blue tint
      border: 'rgba(33, 150, 243, 0.3)',     // Blue border
      solid: '#2196F3',
    },
    neutral: {
      glass: 'rgba(255, 255, 255, 0.12)',    // White tint
      border: 'rgba(255, 255, 255, 0.25)',   // White border
      solid: '#FFFFFF',
    },
  },
  
  // Accent colors
  accent: {
    gold: '#FFD700',
    white: '#FFFFFF',
  },
};

// ============================================================================
// TYPOGRAPHY - Clean & Readable
// ============================================================================
export const Typography = {
  // Font sizes
  size: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    huge: 32,
    massive: 48,
    giant: 64,
  },
  
  // Font weights
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // Pre-defined text styles
  giant: {
    fontSize: 64,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: -2,
  },
  massive: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: -1,
  },
  huge: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  h5: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.text.primary,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.text.primary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.text.secondary,
  },
  small: {
    fontSize: 10,
    fontWeight: '400',
    color: Colors.text.tertiary,
  },
};

// ============================================================================
// SPACING - Consistent Rhythm
// ============================================================================
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  massive: 64,
};

// ============================================================================
// BORDER RADIUS - Clean & Refined
// ============================================================================
export const BorderRadius = {
  none: 0,
  sm: 8,
  base: 12,
  md: 15,
  lg: 18,
  xl: 20,
  xxl: 24,
  full: 999,
};

// ============================================================================
// COMMON STYLES - Refined Glass Cards
// ============================================================================
export const CommonStyles = StyleSheet.create({
  // Clean glass cards
  glassCard: {
    backgroundColor: Colors.glass.medium,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  
  glassCardSmall: {
    backgroundColor: Colors.glass.light,
    borderRadius: BorderRadius.base,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  
  glassCardLarge: {
    backgroundColor: Colors.glass.medium,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  
  // Status-based glass cards
  glassCardSuccess: {
    backgroundColor: Colors.status.success.glass,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.status.success.border,
  },
  
  glassCardWarning: {
    backgroundColor: Colors.status.warning.glass,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.status.warning.border,
  },
  
  glassCardDanger: {
    backgroundColor: Colors.status.danger.glass,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.status.danger.border,
  },
  
  glassCardInfo: {
    backgroundColor: Colors.status.info.glass,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.status.info.border,
  },
  
  // Container styles
  container: {
    flex: 1,
  },
  
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.massive,
  },
  
  // Layout helpers
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  rowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Section spacing
  section: {
    marginBottom: Spacing.xl,
  },

  sectionLarge: {
    marginBottom: Spacing.xxxl,
  },

  // Input styles - highly visible
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    fontWeight: Typography.weight.medium,
  },
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate brightness of a hex color (0-255)
 */
const getColorBrightness = (hexColor) => {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate perceived brightness
  return (r * 299 + g * 587 + b * 114) / 1000;
};

/**
 * Get adaptive glass card colors based on background brightness
 * Brighter backgrounds get darker glass, darker backgrounds get lighter glass
 */
export const getAdaptiveGlassColors = () => {
  const background = getTimeBackground();
  const mainColor = background.gradient[1]; // Use middle gradient color
  const brightness = getColorBrightness(mainColor);
  
  // Threshold: 128 is middle brightness (0-255 scale)
  const isBright = brightness > 128;
  
  if (isBright) {
    // Bright background: use darker glass for contrast
    return {
      clear: 'rgba(0, 0, 0, 0.12)',
      light: 'rgba(0, 0, 0, 0.18)',
      medium: 'rgba(0, 0, 0, 0.22)',
      border: 'rgba(0, 0, 0, 0.25)',
    };
  } else {
    // Dark background: use lighter glass
    return {
      clear: 'rgba(255, 255, 255, 0.08)',
      light: 'rgba(255, 255, 255, 0.12)',
      medium: 'rgba(255, 255, 255, 0.15)',
      border: 'rgba(255, 255, 255, 0.2)',
    };
  }
};

/**
 * Get the current time-based background configuration
 */
export const getTimeBackground = () => {
  const hour = new Date().getHours();
  
  for (const [key, config] of Object.entries(TIME_BACKGROUNDS)) {
    const [start, end] = config.hour;
    if (start <= end) {
      if (hour >= start && hour < end) return config;
    } else {
      // Handle overnight period (e.g., 23-4)
      if (hour >= start || hour < end) return config;
    }
  }
  
  return TIME_BACKGROUNDS.midday; // Default fallback
};

/**
 * Get gradient colors for current time
 */
export const getDynamicBackground = () => {
  return getTimeBackground().gradient;
};

/**
 * Get background image URL for current time
 */
export const getBackgroundImage = () => {
  return getTimeBackground().image;
};

/**
 * Get gradient colors for fade effect (photo at top, gradient at bottom)
 * Returns array with transparency values for seamless transition
 */
export const getFadeGradient = () => {
  const colors = getDynamicBackground();
  return [
    'rgba(0, 0, 0, 0)',           // Fully transparent at top (show photo)
    'rgba(0, 0, 0, 0.1)',         // Very subtle
    colors[0] + '40',              // Start blending with gradient (25% opacity)
    colors[0] + '80',              // Half opacity
    colors[0] + 'CC',              // Mostly solid
    colors[1],                     // Fully solid
    colors[2] || colors[1],        // Continue solid
  ];
};

/**
 * Get time of day label
 */
export const getTimeOfDay = () => {
  return getTimeBackground().time;
};

/**
 * Get greeting based on time
 */
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
};

/**
 * Format time in clean way
 */
export const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Format date in clean way
 */
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
};

/**
 * Get subtle text shadow for body text
 */
export const getSubtleTextShadow = () => ({
  textShadowColor: 'rgba(0, 0, 0, 0.3)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
});

/**
 * Get strong text shadow for headings
 */
export const getStrongTextShadow = () => ({
  textShadowColor: 'rgba(0, 0, 0, 0.7)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 6,
});

/**
 * Get text shadow for headings
 */
export const getTextShadow = () => ({
  textShadowColor: 'rgba(0, 0, 0, 0.5)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 4,
});

/**
 * Create custom glass card with optional status color
 */
export const createGlassCard = (status = null, size = 'medium') => {
  const baseStyle = {
    borderRadius: BorderRadius.md,
    borderWidth: status ? 1.5 : 1,
  };
  
  // Size variations
  const sizeStyles = {
    small: { padding: Spacing.md },
    medium: { padding: Spacing.lg },
    large: { padding: Spacing.xl },
  };
  
  // Special status for light gray
  if (status === 'lightGray') {
    return {
      ...baseStyle,
      ...sizeStyles[size],
      backgroundColor: 'rgba(128, 128, 128, 0.35)',
      borderColor: 'rgba(128, 128, 128, 0.5)',
    };
  }
  
  // Status colors
  if (status && Colors.status[status]) {
    return {
      ...baseStyle,
      ...sizeStyles[size],
      backgroundColor: Colors.status[status].glass,
      borderColor: Colors.status[status].border,
    };
  }
  
  // Default glass
  return {
    ...baseStyle,
    ...sizeStyles[size],
    backgroundColor: Colors.glass.medium,
    borderColor: Colors.glass.border,
  };
};

/**
 * Get status color for indicators (dots, icons, etc.)
 */
export const getStatusColor = (status) => {
  const statusMap = {
    success: Colors.status.success.solid,
    onTime: Colors.status.success.solid,
    completed: Colors.status.success.solid,
    warning: Colors.status.warning.solid,
    late: Colors.status.warning.solid,
    danger: Colors.status.danger.solid,
    'time-to-leave': Colors.status.danger.solid,
    missed: Colors.status.danger.solid,
    info: Colors.status.info.solid,
    upcoming: Colors.status.info.solid,
  };
  
  return statusMap[status] || Colors.text.primary;
};

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  CommonStyles,
  getDynamicBackground,
  getBackgroundImage,
  getFadeGradient,
  getTimeOfDay,
  getGreeting,
  formatTime,
  formatDate,
  getSubtleTextShadow,
  getStrongTextShadow,
  getTextShadow,
  createGlassCard,
  getStatusColor,
};