// Run this in Settings screen to clear old notifications
import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearNotifications = async () => {
  try {
    await AsyncStorage.removeItem('userNotifications');
    console.log('✅ Cleared all notifications from history');
    return true;
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return false;
  }
};
