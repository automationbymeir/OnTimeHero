import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const OnTimeHeroLogo = ({ width = 100, height = 112, style }) => {
  return (
    <View style={[styles.container, { width, height }, style]}>
      {/* Shield Shape */}
      <View style={styles.shield}>
        {/* Clock Face */}
        <View style={styles.clockFace}>
          {/* Clock Hands */}
          <View style={styles.hourHand} />
          <View style={styles.minuteHand} />
          {/* Center Dot */}
          <View style={styles.centerDot} />
        </View>
        
        {/* Crown at top - simplified */}
        <View style={styles.crown}>
          <View style={styles.crownShape} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shield: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  clockFace: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  hourHand: {
    position: 'absolute',
    width: 3,
    height: 20,
    backgroundColor: '#d97706',
    borderRadius: 1.5,
    transform: [{ rotate: '30deg' }],
    top: 10,
  },
  minuteHand: {
    position: 'absolute',
    width: 2,
    height: 25,
    backgroundColor: '#d97706',
    borderRadius: 1,
    transform: [{ rotate: '60deg' }],
    top: 5,
  },
  centerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d97706',
    position: 'absolute',
  },
  crown: {
    position: 'absolute',
    top: 8,
    alignItems: 'center',
  },
  crownShape: {
    width: 12,
    height: 8,
    backgroundColor: '#fbbf24',
    borderRadius: 2,
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default OnTimeHeroLogo;