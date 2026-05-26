import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  DeviceEventEmitter,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import Theme, { Colors, Typography, Spacing, BorderRadius, CommonStyles, getTextShadow, getStrongTextShadow, getDynamicBackground, createGlassCard } from '../../styles/theme';

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const storedNotifications = await AsyncStorage.getItem('userNotifications');
      if (storedNotifications) {
        const parsed = JSON.parse(storedNotifications);
        // Sort by timestamp descending
        const sorted = parsed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setNotifications(sorted);
      } else {
        // Create some default notifications to show the UI
        const defaultNotifications = [];
        setNotifications(defaultNotifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId) => {
    try {
      const updatedNotifications = notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      );
      
      await AsyncStorage.setItem('userNotifications', JSON.stringify(updatedNotifications));
      setNotifications(updatedNotifications);
      
      // Emit event to update notification count on dashboard
      DeviceEventEmitter.emit('NOTIFICATION_READ');
      console.log('📱 NotificationsScreen: Emitted NOTIFICATION_READ event');
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const clearNotifications = async () => {
    try {
      await AsyncStorage.setItem('userNotifications', JSON.stringify([]));
      setNotifications([]);
      
      // Emit event to update notification count on dashboard
      DeviceEventEmitter.emit('NOTIFICATIONS_CLEARED');
      console.log('📱 NotificationsScreen: Emitted NOTIFICATIONS_CLEARED event');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'time-to-leave':
        return { name: 'directions-walk', color: '#ff6b6b' };
      case 'get-ready':
        return { name: 'alarm', color: '#4facfe' };
      case 'achievement':
        return { name: 'emoji-events', color: '#f093fb' };
      case 'streak':
        return { name: 'local-fire-department', color: '#ff9800' };
      case 'event':
        return { name: 'event', color: '#667eea' };
      default:
        return { name: 'notifications', color: '#999' };
    }
  };

  const renderNotification = (notification, index) => {
    const iconInfo = getNotificationIcon(notification.type);
    const timeAgo = moment(notification.timestamp).fromNow();

    return (
      <TouchableOpacity
        key={index}
        style={styles.notificationCard}
        onPress={() => {
          // Mark notification as read when tapped
          if (!notification.read) {
            markAsRead(notification.id);
          }
          
          // Handle notification tap - could navigate to relevant screen
          if (notification.eventId) {
            // Navigate to event details if available
          }
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconInfo.color }]}>
          <Icon name={iconInfo.name} size={24} color="#fff" />
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationMessage}>{notification.message}</Text>
          <Text style={styles.notificationTime}>{timeAgo}</Text>
        </View>
        {!notification.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const backgroundColors = getDynamicBackground();

  return (
    <LinearGradient
      colors={backgroundColors}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, getStrongTextShadow()]}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearNotifications}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea']}
            tintColor="#fff"
          />
        }
      >
        {notifications.length > 0 ? (
          <View style={styles.notificationsList}>
            {notifications.map((notification, index) =>
              renderNotification(notification, index)
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="notifications-none" size={80} color="rgba(255,255,255,0.5)" />
            <Text style={styles.emptyStateTitle}>No Notifications</Text>
            <Text style={styles.emptyStateText}>
              You're all caught up! Notifications about your events and achievements will appear here.
            </Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  clearButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  notificationsList: {
    padding: 20,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff6b6b',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default NotificationsScreen;
