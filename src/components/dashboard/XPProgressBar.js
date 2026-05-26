import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { getTextShadow } from '../../styles/theme';

const XPProgressBar = ({ currentXP, level, style }) => {
  const currentLevelXP = (level - 1) * 100;
  const nextLevelXP = level * 100;
  const progressXP = currentXP - currentLevelXP;
  const maxProgressXP = nextLevelXP - currentLevelXP;
  const progressPercentage = (progressXP / maxProgressXP) * 100;

  const getLevelColor = () => {
    if (level >= 20) return ['#ffd700', '#ffed4e'];
    if (level >= 15) return ['#ff6b6b', '#ff8e8e'];
    if (level >= 10) return ['#4CAF50', '#66bb6a'];
    if (level >= 5) return ['#2196F3', '#42a5f5'];
    return ['#9C27B0', '#ba68c8'];
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.levelContainer}>
        <LinearGradient colors={getLevelColor()} style={styles.levelBadge}>
          <Text style={[styles.levelText, getTextShadow()]}>{level}</Text>
        </LinearGradient>
        <Text style={[styles.levelLabel, getTextShadow()]}>Level</Text>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.xpInfo}>
          <Text style={[styles.xpText, getTextShadow()]}>{currentXP} XP</Text>
          <Text style={[styles.nextLevelText, getTextShadow()]}>{nextLevelXP - currentXP} XP to next level</Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View style={styles.progressBarFill}>
              <LinearGradient
                colors={getLevelColor()}
                style={[styles.progressFill, { width: `${progressPercentage}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    padding: 15,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  levelContainer: {
    alignItems: 'center',
    marginRight: 15,
  },
  levelBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  levelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  levelLabel: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  progressContainer: {
    flex: 1,
  },
  xpInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  xpText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  nextLevelText: {
    fontSize: 12,
    color: '#fff',
  },
  progressBarContainer: {
    height: 8,
  },
  progressBarBackground: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});

export default XPProgressBar;


