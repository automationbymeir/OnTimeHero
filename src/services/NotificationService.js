import PushNotification from 'react-native-push-notification';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

class NotificationService {
  constructor() {
    this.configured = false;
    this.initPromise = this.initialize();
  }

  async initialize() {
    try {
      await this.configure();
      this.createChannels();
      this.configured = true;
      console.log('✅ NotificationService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize NotificationService:', error);
    }
  }

  async ensureConfigured() {
    if (!this.configured) {
      await this.initPromise;
    }
  }

  // Convert string ID to numeric ID for notifications
  hashStringToNumber(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  static initialize() {
    return new NotificationService();
  }

  async configure() {
    try {
      // Request permissions explicitly
      const granted = await PushNotification.requestPermissions();
      console.log('📱 Notification permissions granted:', granted);
      
      PushNotification.configure({
        onRegister: function (token) {
          console.log('TOKEN:', token);
        },

        onNotification: function (notification) {
          console.log('NOTIFICATION:', notification);

          // Save notification to history when it's received
          if (notification.foreground || !notification.userInteraction) {
            NotificationService.prototype.saveNotificationToHistory({
              id: notification.id,
              type: notification.userInfo?.type || notification.data?.type || 'event',
              title: notification.title,
              message: notification.message,
              eventId: notification.userInfo?.eventId || notification.data?.eventId,
              timestamp: new Date().toISOString(),
              read: false,
            }).catch(err => console.error('Failed to save notification to history:', err));
          }

          // Handle notification tap
          if (notification.userInteraction) {
            NotificationService.handleNotificationTap(notification);
          }
        },

        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },

        popInitialNotification: true,
        requestPermissions: true,
      });
    } catch (error) {
      console.error('❌ Error configuring notifications:', error);
    }
  }

  async checkPermissions() {
    try {
      console.log('📱 Checking current notification permissions...');
      
      // Check current permissions using a promise wrapper
      const permissions = await new Promise((resolve, reject) => {
        PushNotification.checkPermissions((permissions) => {
          resolve(permissions);
        });
      });
      
      console.log('📱 Current notification permissions:', permissions);
      
      // Handle different response formats
      if (permissions && typeof permissions === 'object') {
        if (permissions.alert !== undefined && permissions.badge !== undefined && permissions.sound !== undefined) {
          if (permissions.alert && permissions.badge && permissions.sound) {
            console.log('✅ All notification permissions already granted');
            return true;
          } else {
            console.log('⚠️ Some notification permissions not granted:', permissions);
            return false;
          }
        } else {
          // If the response format is different, assume success if permissions is truthy
          console.log('✅ Notification permissions already granted (different response format)');
          return true;
        }
      } else if (permissions === true || permissions === 1) {
        console.log('✅ Notification permissions already granted (boolean/number response)');
        return true;
      } else {
        console.log('⚠️ Notification permissions not granted');
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking notification permissions:', error);
      return false;
    }
  }

  async requestPermissions() {
    try {
      console.log('📱 Requesting notification permissions...');
      
      // First check current permissions
      const currentPermissions = await this.checkPermissions();
      if (currentPermissions) {
        console.log('✅ Permissions already granted, no need to request');
        return true;
      }
      
      // Request permissions with explicit settings using promise wrapper
      const granted = await new Promise((resolve, reject) => {
        PushNotification.requestPermissions({
          alert: true,
          badge: true,
          sound: true,
          critical: false,
          provisional: false,
        }, (permissions) => {
          resolve(permissions);
        });
      });
      
      console.log('📱 Notification permissions result:', granted);
      
      // Handle different response formats
      if (granted && typeof granted === 'object') {
        // Check if it has the expected properties
        if (granted.alert !== undefined && granted.badge !== undefined && granted.sound !== undefined) {
          if (granted.alert && granted.badge && granted.sound) {
            console.log('✅ All notification permissions granted');
            return true;
          } else {
            console.log('⚠️ Some notification permissions not granted:', granted);
            return false;
          }
        } else {
          // If the response format is different, assume success if granted is truthy
          console.log('✅ Notification permissions granted (different response format)');
          return true;
        }
      } else if (granted === true || granted === 1) {
        console.log('✅ Notification permissions granted (boolean/number response)');
        return true;
      } else {
        console.log('⚠️ Notification permissions not granted');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error);
      // Return false instead of throwing to prevent app crashes
      return false;
    }
  }

  // Handle background messages
  static setBackgroundMessageHandler() {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Message handled in the background!', remoteMessage);
      // Handle background notification
    });
  }

  // Handle foreground messages
  static setForegroundMessageHandler() {
    messaging().onMessage(async remoteMessage => {
      console.log('Message handled in the foreground!', remoteMessage);
      this.showNotification(remoteMessage);
    });
  }

  createChannels() {
    PushNotification.createChannel(
      {
        channelId: 'time-to-leave',
        channelName: 'Time to Leave',
        channelDescription: 'Notifications when it\'s time to leave for events',
        playSound: true,
        soundName: 'default',
        importance: 5,
        vibrate: true,
      },
      (created) => console.log(`createChannel 'time-to-leave' returned '${created}'`)
    );

    PushNotification.createChannel(
      {
        channelId: 'reminders',
        channelName: 'Event Reminders',
        channelDescription: 'Upcoming event reminders',
        playSound: true,
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`createChannel 'reminders' returned '${created}'`)
    );

    PushNotification.createChannel(
      {
        channelId: 'achievements',
        channelName: 'Achievements',
        channelDescription: 'Badge and streak notifications',
        playSound: true,
        soundName: 'default',
        importance: 3,
        vibrate: false,
      },
      (created) => console.log(`createChannel 'achievements' returned '${created}'`)
    );
  }

  showNotification(remoteMessage) {
    const { title, body, data } = remoteMessage.notification || remoteMessage.data;
    
    PushNotification.localNotification({
      channelId: data?.channelId || 'reminders',
      title: title,
      message: body,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      data: data,
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      bigText: body,
      color: '#667eea',
    });
  }

  async scheduleEventNotifications(event) {
    try {
      await this.ensureConfigured();
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;

      // Get the event's travel time (in minutes) - this is calculated from Google Maps when available
      const travelTime = event.travelTime || 15; // Default to 15 minutes if not specified

      // Get user preference for prep time (how early before leaving to get ready)
      const prepTimeMinutes = await AsyncStorage.getItem('reminder1Minutes');
      const prepTime = prepTimeMinutes ? parseInt(prepTimeMinutes) : 30; // Default 30 min prep time

      const eventTime = moment(event.startTime.toDate ? event.startTime.toDate() : event.startTime);
      const now = moment();

      console.log(`\n📅 ========== SCHEDULING NOTIFICATIONS ==========`);
      console.log(`📅 Event: ${event.title}`);
      console.log(`📅 Event time: ${eventTime.format('YYYY-MM-DD HH:mm')}`);
      console.log(`📅 Current time: ${now.format('YYYY-MM-DD HH:mm')}`);
      console.log(`📅 Travel time: ${travelTime} minutes (${travelTime > 15 ? 'from Google Maps' : 'default'})`);
      console.log(`📅 Prep time: ${prepTime} minutes`);

      // Calculate departure time (event time - travel time)
      // This is when the user should leave based on distance to destination
      const departureTime = eventTime.clone().subtract(travelTime, 'minutes');
      const minutesUntilDeparture = departureTime.diff(now, 'minutes');
      console.log(`📅 Departure time (time to leave): ${departureTime.format('YYYY-MM-DD HH:mm')} (in ${minutesUntilDeparture} minutes)`);

      // Calculate get ready time (departure time - prep time)
      // This is when the user should start getting ready
      const getReadyTime = departureTime.clone().subtract(prepTime, 'minutes');
      const minutesUntilGetReady = getReadyTime.diff(now, 'minutes');
      console.log(`📅 Get ready time: ${getReadyTime.format('YYYY-MM-DD HH:mm')} (in ${minutesUntilGetReady} minutes)`);

      // Schedule "Get Ready" notification - fires at (departure time - prep time)
      // e.g., if event is at 3:00 PM, travel time is 20 min, prep time is 30 min
      // then departure time is 2:40 PM, and get ready time is 2:10 PM
      //
      // IMPORTANT: If get ready time is in the past but departure time is in the future,
      // fire the notification immediately (3 seconds from now) instead of skipping it
      const notificationId1 = this.hashStringToNumber(`${event.id}_get_ready`);
      const timeUntilLeave = Math.round(departureTime.diff(now, 'minutes'));

      if (departureTime.isAfter(now)) {
        // Departure is still in the future
        let notificationTime;

        if (getReadyTime.isAfter(now)) {
          // Get ready time is in the future - schedule normally
          notificationTime = getReadyTime.toDate();
          console.log(`✅ "Get Ready" notification scheduled for: ${getReadyTime.format('YYYY-MM-DD HH:mm')} (in ${minutesUntilGetReady} minutes) [ID: ${notificationId1}]`);
        } else {
          // Get ready time has passed but we still need to leave - fire immediately
          notificationTime = moment().add(3, 'seconds').toDate();
          console.log(`⚡ "Get Ready" time already passed (${Math.abs(minutesUntilGetReady)} minutes ago), firing IMMEDIATELY in 3 seconds [ID: ${notificationId1}]`);
        }

        PushNotification.localNotificationSchedule({
          id: notificationId1,
          channelId: 'reminders',
          title: '📅 Get Ready!',
          message: `Start getting ready for ${event.title}. You need to leave in ${timeUntilLeave} minutes (at ${departureTime.format('h:mm A')}).`,
          date: notificationTime,
          allowWhileIdle: true,
          playSound: true,
          soundName: 'default',
          vibrate: true,
          userInfo: {
            eventId: event.id,
            type: 'get-ready',
            eventTitle: event.title,
            departureTime: departureTime.format('h:mm A'),
          },
        });
      } else {
        console.log(`⏭️ Skipping get ready notification (departure time has passed)`);
      }

      // Schedule "Time to Leave" notification - fires at departure time
      // This is calculated based on travel distance when Google Maps integration is enabled
      // e.g., if event is at 3:00 PM and travel time is 20 min, notification fires at 2:40 PM
      //
      // IMPORTANT: If departure time is within 5 minutes or has passed slightly,
      // fire immediately instead of skipping
      const notificationId2 = this.hashStringToNumber(`${event.id}_time_to_leave`);
      // Reuse minutesUntilDeparture calculated earlier at line 274

      if (eventTime.isAfter(now)) {
        // Event hasn't started yet
        let notificationTime;

        if (minutesUntilDeparture > 0) {
          // Departure time is in the future - schedule normally
          notificationTime = departureTime.toDate();
          console.log(`✅ "Time to Leave" notification scheduled for: ${departureTime.format('YYYY-MM-DD HH:mm')} (in ${minutesUntilDeparture} minutes) [ID: ${notificationId2}]`);
        } else if (minutesUntilDeparture >= -5) {
          // Departure time passed but within 5 minutes - fire immediately
          notificationTime = moment().add(6, 'seconds').toDate(); // 6 seconds to fire after "get ready"
          console.log(`⚡ Departure time passed (${Math.abs(minutesUntilDeparture)} min ago), firing IMMEDIATELY in 6 seconds [ID: ${notificationId2}]`);
        } else {
          console.log(`⏭️ Skipping "Time to Leave" notification (departure was ${Math.abs(minutesUntilDeparture)} minutes ago)`);
          console.log(`📅 ===============================================\n`);
          return; // Skip this notification
        }

        PushNotification.localNotificationSchedule({
          id: notificationId2,
          channelId: 'time-to-leave',
          title: '⏰ Time to Leave NOW!',
          message: `Leave now for ${event.title}${event.location ? ` at ${event.location}` : ''}! ${travelTime > 15 ? `Travel time: ${travelTime} min (based on current traffic).` : `Travel time: ${travelTime} min.`}`,
          date: notificationTime,
          allowWhileIdle: true,
          playSound: true,
          soundName: 'default',
          vibrate: true,
          vibration: 1000,
          userInfo: {
            eventId: event.id,
            type: 'time-to-leave',
            eventTitle: event.title,
            location: event.location || '',
            travelTime: travelTime,
          },
          actions: ['Leave Now', 'Snooze 5 min'],
        });
      } else {
        console.log(`⏭️ Skipping "Time to Leave" notification (event already started)`);
      }
      console.log(`📅 ===============================================\n`);
    } catch (error) {
      console.error('❌ Error scheduling event notifications:', error);
      console.log(`📅 ===============================================\n`);
    }
  }

  async saveNotificationToHistory(notification) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const existing = await AsyncStorage.getItem('userNotifications');
      const notifications = existing ? JSON.parse(existing) : [];

      // Check if notification already exists (by id)
      const existingIndex = notifications.findIndex(n => n.id === notification.id);
      if (existingIndex >= 0) {
        // Update existing notification
        notifications[existingIndex] = notification;
      } else {
        // Add new notification at the beginning
        notifications.unshift(notification);
      }

      // Keep only last 50 notifications
      const trimmed = notifications.slice(0, 50);

      await AsyncStorage.setItem('userNotifications', JSON.stringify(trimmed));
      console.log('✅ Notification saved to history:', notification.title);
    } catch (error) {
      console.error('Error saving notification to history:', error);
    }
  }

  cancelNotification(notificationId) {
    PushNotification.cancelLocalNotification(notificationId);
  }

  static handleNotificationTap(notification) {
    const { type, eventId } = notification.data;
    
    switch (type) {
      case 'time-to-leave':
        // Navigate to lock screen - will be handled by app navigation
        console.log('Time to leave notification tapped for event:', eventId);
        break;
      case 'reminder':
        // Navigate to event details - will be handled by app navigation
        console.log('Reminder notification tapped for event:', eventId);
        break;
      case 'achievement':
        // Navigate to rewards - will be handled by app navigation
        console.log('Achievement notification tapped');
        break;
      default:
        break;
    }
  }

  showAchievementNotification(badge) {
    PushNotification.localNotification({
      channelId: 'achievements',
      title: '🏆 Achievement Unlocked!',
      message: `You earned the "${badge.name}" badge!`,
      playSound: true,
      soundName: 'achievement.mp3',
      data: {
        type: 'achievement',
        badgeId: badge.id,
      },
    });
  }

  showStreakNotification(streakCount) {
    const messages = [
      `You're on a ${streakCount}-day streak! Keep it up! 🔥`,
      `Amazing! ${streakCount} days in a row! 🎉`,
      `Your ${streakCount}-day streak is impressive! 💪`,
      `Don't break the chain! ${streakCount} days strong! ⛓️`,
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    PushNotification.localNotification({
      channelId: 'achievements',
      title: '🔥 Streak Update!',
      message: randomMessage,
      playSound: true,
      vibrate: true,
      data: {
        type: 'streak',
        streakCount,
      },
    });
  }

  showLevelUpNotification(newLevel) {
    PushNotification.localNotification({
      channelId: 'achievements',
      title: '⭐ Level Up!',
      message: `Congratulations! You've reached level ${newLevel}!`,
      playSound: true,
      vibrate: true,
      data: {
        type: 'level_up',
        newLevel,
      },
    });
  }

  async showArrivalNotification(event, wasOnTime, pointsAwarded = 50) {
    const title = wasOnTime ? '🎉 Great Job!' : '⚠️ Running Late';
    const message = wasOnTime
      ? `You arrived on time for "${event.title}"! +${pointsAwarded} XP earned!`
      : `You're running late for "${event.title}". Try to leave earlier next time.`;

    // Save to notification history
    await this.saveNotificationToHistory({
      id: this.hashStringToNumber(`${event.id}_arrival`),
      type: 'arrival',
      title,
      message,
      eventId: event.id,
      timestamp: new Date().toISOString(),
      read: false,
    });

    PushNotification.localNotification({
      channelId: 'achievements',
      title,
      message,
      playSound: true,
      vibrate: true,
      userInfo: {
        type: 'arrival',
        eventId: event.id,
        wasOnTime,
        pointsAwarded: pointsAwarded,
      },
    });
  }

  showMotivationalMessage() {
    const messages = [
      "You've got this! Time to be your most punctual self! 💪",
      "Every journey starts with leaving on time! 🚀",
      "Punctuality is the politeness of kings! 👑",
      "Success is where preparation meets opportunity! ✨",
      "The early bird catches the worm! 🐦",
      "Be the hero of your own time story! 🦸‍♀️",
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    PushNotification.localNotification({
      channelId: 'reminders',
      title: '💡 Daily Motivation',
      message: randomMessage,
      playSound: false,
      vibrate: false,
      data: {
        type: 'motivation',
      },
    });
  }

  scheduleDailyMotivation() {
    // Schedule daily motivation at 8 AM
    const tomorrow = moment().add(1, 'day').hour(8).minute(0).second(0).toDate();

    PushNotification.localNotificationSchedule({
      id: this.hashStringToNumber('daily_motivation'),
      channelId: 'reminders',
      title: '💡 Daily Motivation',
      message: 'Start your day with punctuality!',
      date: tomorrow,
      playSound: false,
      vibrate: false,
      repeatType: 'day',
      data: {
        type: 'daily_motivation',
      },
    });
  }

  scheduleWeeklyReport() {
    // Schedule weekly report on Sundays at 9 AM
    const nextSunday = moment().day(7).hour(9).minute(0).second(0).toDate();

    PushNotification.localNotificationSchedule({
      id: this.hashStringToNumber('weekly_report'),
      channelId: 'achievements',
      title: '📊 Weekly Report',
      message: 'Check out your punctuality stats for this week!',
      date: nextSunday,
      playSound: true,
      soundName: 'default',
      repeatType: 'week',
      data: {
        type: 'weekly_report',
      },
    });
  }

  cancelEventNotifications(eventId) {
    const notifications = this.getScheduledNotifications();
    notifications.then(scheduledNotifications => {
      scheduledNotifications.forEach(notification => {
        if (notification.userInfo?.eventId === eventId) {
          this.cancelNotification(notification.id);
        }
      });
    });
  }

  getScheduledNotifications() {
    return new Promise((resolve) => {
      PushNotification.getScheduledLocalNotifications((notifications) => {
        resolve(notifications);
      });
    });
  }
}

export default new NotificationService();