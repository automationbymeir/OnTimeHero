import { ImageBackground } from 'react-native';

// Dynamic background utility for time-based visuals
const DynamicBackground = {
  // Get background gradient colors based on time of day
  getBackgroundColors: () => {
    const hour = new Date().getHours();
    
    // Early Morning (5-7): Soft dawn colors
    if (hour >= 5 && hour < 7) {
      return ['#FFA07A', '#FFE5B4', '#87CEEB'];
    }
    // Morning (7-11): Bright morning sky
    else if (hour >= 7 && hour < 11) {
      return ['#87CEEB', '#ADD8E6', '#F0E68C'];
    }
    // Midday (11-15): Bright sunshine
    else if (hour >= 11 && hour < 15) {
      return ['#4A90E2', '#87CEEB', '#B0E0E6'];
    }
    // Afternoon (15-17): Golden hour approaching
    else if (hour >= 15 && hour < 17) {
      return ['#F4A460', '#FFD700', '#FFA500'];
    }
    // Evening (17-19): Sunset colors
    else if (hour >= 17 && hour < 19) {
      return ['#FF6B9D', '#C850C0', '#4158D0'];
    }
    // Dusk (19-21): Twilight
    else if (hour >= 19 && hour < 21) {
      return ['#667eea', '#764ba2', '#5B5F97'];
    }
    // Night (21-23): Deep night
    else if (hour >= 21 && hour < 24) {
      return ['#2C3E50', '#4A5F7F', '#1C2833'];
    }
    // Late Night (0-5): Midnight
    else {
      return ['#0F2027', '#203A43', '#2C5364'];
    }
  },

  // Get time of day description
  getTimeOfDay: () => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 7) return 'Dawn';
    if (hour >= 7 && hour < 11) return 'Morning';
    if (hour >= 11 && hour < 15) return 'Midday';
    if (hour >= 15 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 19) return 'Sunset';
    if (hour >= 19 && hour < 21) return 'Dusk';
    if (hour >= 21 && hour < 24) return 'Night';
    return 'Late Night';
  },

  // Get illustration/imagery suggestions based on time
  getBackgroundTheme: () => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 7) return '🌅 Dawn Breaking';
    if (hour >= 7 && hour < 11) return '🌤️ Bright Morning';
    if (hour >= 11 && hour < 15) return '☀️ Sunny Day';
    if (hour >= 15 && hour < 17) return '🌇 Golden Hour';
    if (hour >= 17 && hour < 19) return '🌆 Beautiful Sunset';
    if (hour >= 19 && hour < 21) return '🌃 City Lights';
    if (hour >= 21 && hour < 24) return '🌙 Starry Night';
    return '✨ Midnight Sky';
  },

  // Get accent color for cards based on time
  getAccentColor: () => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 7) return 'rgba(255, 160, 122, 0.3)'; // Coral
    if (hour >= 7 && hour < 11) return 'rgba(135, 206, 235, 0.3)'; // Sky blue
    if (hour >= 11 && hour < 15) return 'rgba(255, 215, 0, 0.25)'; // Gold
    if (hour >= 15 && hour < 17) return 'rgba(255, 165, 0, 0.3)'; // Orange
    if (hour >= 17 && hour < 19) return 'rgba(200, 80, 192, 0.3)'; // Purple-pink
    if (hour >= 19 && hour < 21) return 'rgba(102, 126, 234, 0.3)'; // Indigo
    if (hour >= 21 && hour < 24) return 'rgba(91, 95, 151, 0.3)'; // Deep blue
    return 'rgba(44, 62, 80, 0.3)'; // Dark slate
  },

  // Get text shadow for visibility
  getTextShadow: () => {
    return {
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    };
  },

  // Get strong text shadow for maximum visibility
  getStrongTextShadow: () => {
    return {
      textShadowColor: 'rgba(0, 0, 0, 0.9)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    };
  },
};

export default DynamicBackground;

