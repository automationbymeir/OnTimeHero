import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

const StatCard = ({ icon, value, label, onPress }) => (
  <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={{ flex: 1 }}>
    <View style={CommonStyles.glassCard}>
      <Icon name={icon} size={24} color="#fff" />
      <Text style={[styles.statValue, getStrongTextShadow()]}>{value}</Text>
      <Text style={[styles.statLabel, getTextShadow()]}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const QuickStats = ({ points, badges, punctualityRate, onCardPress }) => {
  return (
    <View style={styles.container}>
      <StatCard
        icon="star"
        value={points}
        label="Points"
        onPress={onCardPress}
      />
      <StatCard
        icon="emoji-events"
        value={badges}
        label="Badges"
        onPress={onCardPress}
      />
      <StatCard
        icon="schedule"
        value={`${punctualityRate}%`}
        label="On Time"
        onPress={onCardPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.base,
    gap: Spacing.base,
  },
  statValue: {
    ...Typography.h4,
    marginTop: Spacing.xs,
  },
  statLabel: {
    ...Typography.small,
    marginTop: Spacing.xs,
  },
});

export default QuickStats;
