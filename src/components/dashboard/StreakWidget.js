import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Theme, {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  CommonStyles,
  getTextShadow,
  getStrongTextShadow,
} from '../../styles/theme';

const StreakWidget = ({ streak, xpEarned }) => {
  return (
    <View style={CommonStyles.glassCard}>
      <View style={styles.content}>
        <View style={styles.streakInfo}>
          <Icon name="local-fire-department" size={32} color={Colors.accent.gold} />
          <View style={styles.streakText}>
            <Text style={[styles.streakNumber, getStrongTextShadow()]}>{streak}</Text>
            <Text style={[styles.streakLabel, getTextShadow()]}>Day Streak</Text>
          </View>
        </View>
        <View style={styles.xpInfo}>
          <Text style={[styles.xpText, getStrongTextShadow()]}>+{xpEarned} XP</Text>
          <Text style={[styles.xpLabel, getTextShadow()]}>Today</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 15,
    marginVertical: 10,
    padding: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakText: {
    marginLeft: 10,
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  streakLabel: {
    fontSize: 14,
    color: '#fff',
  },
  xpInfo: {
    alignItems: 'flex-end',
  },
  xpText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  xpLabel: {
    fontSize: 12,
    color: '#fff',
  },
});

export default StreakWidget;
