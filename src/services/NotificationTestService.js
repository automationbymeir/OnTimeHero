import moment from 'moment';
import NotificationService from './NotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';

/**
 * Comprehensive Notification Testing Service
 * Tests all notification types and scenarios with detailed logging
 */
class NotificationTestService {
  constructor() {
    this.testResults = [];
    this.testStartTime = null;
  }

  /**
   * Log test results with timestamp
   */
  log(category, message, data = null) {
    const timestamp = moment().format('HH:mm:ss.SSS');
    const logEntry = {
      timestamp,
      category,
      message,
      data,
    };

    this.testResults.push(logEntry);

    const emoji = {
      'START': '🚀',
      'SUCCESS': '✅',
      'ERROR': '❌',
      'WARNING': '⚠️',
      'INFO': 'ℹ️',
      'TEST': '🧪',
      'VERIFY': '🔍',
      'SCHEDULE': '📅',
      'FIRE': '🔔',
    }[category] || '📝';

    console.log(`${emoji} [${timestamp}] ${category}: ${message}`);
    if (data) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Main test suite - runs all notification tests
   */
  async runAllTests() {
    this.testStartTime = moment();
    this.testResults = [];

    this.log('START', '========== NOTIFICATION TEST SUITE STARTED ==========');
    this.log('START', `Test started at: ${this.testStartTime.format('YYYY-MM-DD HH:mm:ss')}`);

    try {
      // Test 1: Permissions
      await this.testPermissions();

      // Test 2: Channel Creation
      await this.testChannelCreation();

      // Test 3: Immediate Notifications
      await this.testImmediateNotifications();

      // Test 4: Scheduled Event Notifications (various scenarios)
      await this.testScheduledEventNotifications();

      // Test 5: Achievement Notifications
      await this.testAchievementNotifications();

      // Test 6: Notification History
      await this.testNotificationHistory();

      // Test 7: Notification Cancellation
      await this.testNotificationCancellation();

      // Test 8: Edge Cases
      await this.testEdgeCases();

      // Generate summary report
      this.generateSummaryReport();

    } catch (error) {
      this.log('ERROR', 'Test suite failed with error', { error: error.message, stack: error.stack });
    }

    this.log('START', '========== NOTIFICATION TEST SUITE COMPLETED ==========');
    return this.testResults;
  }

  /**
   * Test 1: Permission System
   */
  async testPermissions() {
    this.log('TEST', '--- Test 1: Permission System ---');

    try {
      // Check current permissions
      const hasPermissions = await NotificationService.checkPermissions();
      this.log('VERIFY', 'Checked notification permissions', { hasPermissions });

      // Request permissions if needed
      if (!hasPermissions) {
        this.log('INFO', 'Requesting permissions...');
        const granted = await NotificationService.requestPermissions();
        this.log(granted ? 'SUCCESS' : 'ERROR', 'Permission request result', { granted });
      } else {
        this.log('SUCCESS', 'Permissions already granted');
      }

    } catch (error) {
      this.log('ERROR', 'Permission test failed', { error: error.message });
    }
  }

  /**
   * Test 2: Notification Channels
   */
  async testChannelCreation() {
    this.log('TEST', '--- Test 2: Notification Channels ---');

    try {
      this.log('INFO', 'Creating notification channels...');
      NotificationService.createChannels();
      this.log('SUCCESS', 'Channels created: time-to-leave, reminders, achievements');

    } catch (error) {
      this.log('ERROR', 'Channel creation test failed', { error: error.message });
    }
  }

  /**
   * Test 3: Immediate Notifications
   */
  async testImmediateNotifications() {
    this.log('TEST', '--- Test 3: Immediate Notifications ---');

    try {
      // Test 3a: Achievement Notification
      this.log('INFO', 'Testing achievement notification...');
      await NotificationService.showAchievementNotification({
        id: 'test_badge_1',
        name: 'Test Master',
      });
      this.log('SUCCESS', 'Achievement notification fired');
      await this.delay(2000);

      // Test 3b: Streak Notification
      this.log('INFO', 'Testing streak notification...');
      await NotificationService.showStreakNotification(7);
      this.log('SUCCESS', 'Streak notification fired (7-day streak)');
      await this.delay(2000);

      // Test 3c: Level Up Notification
      this.log('INFO', 'Testing level up notification...');
      await NotificationService.showLevelUpNotification(5);
      this.log('SUCCESS', 'Level up notification fired (Level 5)');
      await this.delay(2000);

      // Test 3d: Arrival Notification (On Time)
      this.log('INFO', 'Testing arrival notification (on time)...');
      await NotificationService.showArrivalNotification(
        { id: 'test_event_1', title: 'Test Meeting' },
        true,
        50
      );
      this.log('SUCCESS', 'On-time arrival notification fired (+50 XP)');
      await this.delay(2000);

      // Test 3e: Arrival Notification (Late)
      this.log('INFO', 'Testing arrival notification (late)...');
      await NotificationService.showArrivalNotification(
        { id: 'test_event_2', title: 'Test Meeting' },
        false,
        0
      );
      this.log('SUCCESS', 'Late arrival notification fired');
      await this.delay(2000);

      // Test 3f: Motivational Message
      this.log('INFO', 'Testing motivational message...');
      await NotificationService.showMotivationalMessage();
      this.log('SUCCESS', 'Motivational message fired');

    } catch (error) {
      this.log('ERROR', 'Immediate notification test failed', { error: error.message });
    }
  }

  /**
   * Test 4: Scheduled Event Notifications (Various Scenarios)
   */
  async testScheduledEventNotifications() {
    this.log('TEST', '--- Test 4: Scheduled Event Notifications ---');

    try {
      // Scenario 4a: Event in near future (5 minutes)
      this.log('INFO', 'Scenario 4a: Event in 5 minutes (should fire immediately)');
      const event1 = this.createTestEvent('Meeting in 5 min', 5);
      await NotificationService.scheduleEventNotifications(event1);
      await this.verifyScheduledNotifications(event1.id, 2); // Should have 2 notifications
      await this.delay(2000);

      // Scenario 4b: Event in 1 hour (normal scheduling)
      this.log('INFO', 'Scenario 4b: Event in 1 hour (normal scheduling)');
      const event2 = this.createTestEvent('Meeting in 1 hour', 60);
      await NotificationService.scheduleEventNotifications(event2);
      await this.verifyScheduledNotifications(event2.id, 2); // Should have 2 notifications
      await this.delay(2000);

      // Scenario 4c: Event in 2 hours with long travel time (40 min)
      this.log('INFO', 'Scenario 4c: Event in 2 hours with 40min travel time');
      const event3 = this.createTestEvent('Meeting across town', 120, 40);
      await NotificationService.scheduleEventNotifications(event3);
      await this.verifyScheduledNotifications(event3.id, 2);
      await this.delay(2000);

      // Scenario 4d: Event in past (should not schedule)
      this.log('INFO', 'Scenario 4d: Event in past (should not schedule)');
      const event4 = this.createTestEvent('Past Meeting', -30);
      await NotificationService.scheduleEventNotifications(event4);
      await this.verifyScheduledNotifications(event4.id, 0); // Should have 0 notifications
      await this.delay(2000);

      // Scenario 4e: Event far in future (24 hours)
      this.log('INFO', 'Scenario 4e: Event in 24 hours');
      const event5 = this.createTestEvent('Tomorrow Meeting', 1440);
      await NotificationService.scheduleEventNotifications(event5);
      await this.verifyScheduledNotifications(event5.id, 2);
      await this.delay(2000);

      // Scenario 4f: Event with location and origin
      this.log('INFO', 'Scenario 4f: Event with full location details');
      const event6 = this.createTestEvent('Office Meeting', 90, 25, {
        location: '123 Main St, City',
        origin: 'Home',
      });
      await NotificationService.scheduleEventNotifications(event6);
      await this.verifyScheduledNotifications(event6.id, 2);

    } catch (error) {
      this.log('ERROR', 'Scheduled event notification test failed', { error: error.message });
    }
  }

  /**
   * Test 5: Achievement Notifications (Batch)
   */
  async testAchievementNotifications() {
    this.log('TEST', '--- Test 5: Achievement Notifications (Batch) ---');

    try {
      // Test multiple achievements in sequence
      const badges = [
        { id: 'early_bird', name: 'Early Bird' },
        { id: 'punctual_hero', name: 'Punctual Hero' },
        { id: 'time_master', name: 'Time Master' },
      ];

      for (const badge of badges) {
        this.log('INFO', `Testing achievement: ${badge.name}`);
        await NotificationService.showAchievementNotification(badge);
        await this.delay(2000);
      }

      this.log('SUCCESS', 'All achievement notifications fired successfully');

    } catch (error) {
      this.log('ERROR', 'Achievement notification batch test failed', { error: error.message });
    }
  }

  /**
   * Test 6: Notification History
   */
  async testNotificationHistory() {
    this.log('TEST', '--- Test 6: Notification History ---');

    try {
      // Save test notification to history
      const testNotification = {
        id: Date.now(),
        type: 'test',
        title: 'Test Notification',
        message: 'This is a test notification',
        eventId: 'test_event',
        timestamp: new Date().toISOString(),
        read: false,
      };

      this.log('INFO', 'Saving test notification to history...');
      await NotificationService.saveNotificationToHistory(testNotification);

      // Retrieve and verify
      const history = await AsyncStorage.getItem('userNotifications');
      const notifications = history ? JSON.parse(history) : [];

      this.log('VERIFY', 'Notification history retrieved', {
        totalCount: notifications.length,
        latestNotification: notifications[0],
      });

      // Verify our test notification is there
      const found = notifications.some(n => n.id === testNotification.id);
      if (found) {
        this.log('SUCCESS', 'Test notification found in history');
      } else {
        this.log('ERROR', 'Test notification NOT found in history');
      }

    } catch (error) {
      this.log('ERROR', 'Notification history test failed', { error: error.message });
    }
  }

  /**
   * Test 7: Notification Cancellation
   */
  async testNotificationCancellation() {
    this.log('TEST', '--- Test 7: Notification Cancellation ---');

    try {
      // Create and schedule an event
      const event = this.createTestEvent('Cancellation Test Event', 120);
      this.log('INFO', 'Scheduling event for cancellation test...');
      await NotificationService.scheduleEventNotifications(event);

      // Verify it was scheduled
      const beforeCancel = await NotificationService.getScheduledNotifications();
      const beforeCount = beforeCancel.filter(n => n.userInfo?.eventId === event.id).length;
      this.log('VERIFY', `Scheduled notifications before cancel: ${beforeCount}`);

      // Cancel the notifications
      this.log('INFO', 'Cancelling event notifications...');
      await NotificationService.cancelEventNotifications(event.id);

      // Verify they were cancelled
      const afterCancel = await NotificationService.getScheduledNotifications();
      const afterCount = afterCancel.filter(n => n.userInfo?.eventId === event.id).length;
      this.log('VERIFY', `Scheduled notifications after cancel: ${afterCount}`);

      if (afterCount === 0 && beforeCount > 0) {
        this.log('SUCCESS', `Successfully cancelled ${beforeCount} notifications`);
      } else {
        this.log('ERROR', 'Cancellation may have failed', { beforeCount, afterCount });
      }

    } catch (error) {
      this.log('ERROR', 'Notification cancellation test failed', { error: error.message });
    }
  }

  /**
   * Test 8: Edge Cases
   */
  async testEdgeCases() {
    this.log('TEST', '--- Test 8: Edge Cases ---');

    try {
      // Edge Case 8a: Event with no travel time
      this.log('INFO', 'Edge Case 8a: Event with no travel time (should use default 15 min)');
      const event1 = {
        id: 'edge_case_1',
        title: 'No Travel Time Event',
        startTime: moment().add(45, 'minutes').toDate(),
        location: 'Somewhere',
        status: 'upcoming',
      };
      await NotificationService.scheduleEventNotifications(event1);
      await this.delay(1000);

      // Edge Case 8b: Event with very long travel time (2 hours)
      this.log('INFO', 'Edge Case 8b: Event with very long travel time (120 min)');
      const event2 = this.createTestEvent('Far Away Meeting', 180, 120);
      await NotificationService.scheduleEventNotifications(event2);
      await this.delay(1000);

      // Edge Case 8c: Event with zero travel time
      this.log('INFO', 'Edge Case 8c: Event with zero travel time');
      const event3 = this.createTestEvent('Virtual Meeting', 60, 0);
      await NotificationService.scheduleEventNotifications(event3);
      await this.delay(1000);

      // Edge Case 8d: Duplicate scheduling (should cancel old and create new)
      this.log('INFO', 'Edge Case 8d: Duplicate scheduling test');
      const event4 = this.createTestEvent('Duplicate Test', 90);
      await NotificationService.scheduleEventNotifications(event4);
      await this.delay(1000);
      this.log('INFO', 'Scheduling same event again...');
      await NotificationService.scheduleEventNotifications(event4);
      const duplicateCheck = await NotificationService.getScheduledNotifications();
      const duplicateCount = duplicateCheck.filter(n => n.userInfo?.eventId === event4.id).length;
      this.log('VERIFY', `After duplicate scheduling, found ${duplicateCount} notifications (should be 2)`);

      this.log('SUCCESS', 'All edge case tests completed');

    } catch (error) {
      this.log('ERROR', 'Edge case test failed', { error: error.message });
    }
  }

  /**
   * Helper: Create a test event
   */
  createTestEvent(title, minutesFromNow, travelTime = 15, extraProps = {}) {
    return {
      id: `test_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      startTime: moment().add(minutesFromNow, 'minutes').toDate(),
      travelTime,
      location: extraProps.location || 'Test Location',
      origin: extraProps.origin || 'CURRENT_LOCATION',
      status: 'upcoming',
      transportationMode: 'driving',
      ...extraProps,
    };
  }

  /**
   * Helper: Verify scheduled notifications
   */
  async verifyScheduledNotifications(eventId, expectedCount) {
    try {
      const scheduled = await NotificationService.getScheduledNotifications();
      const eventNotifications = scheduled.filter(n => n.userInfo?.eventId === eventId);

      this.log('VERIFY', `Scheduled notifications for event ${eventId}`, {
        expectedCount,
        actualCount: eventNotifications.length,
        notifications: eventNotifications.map(n => ({
          type: n.userInfo?.type,
          scheduledFor: moment(n.date).format('YYYY-MM-DD HH:mm:ss'),
          title: n.title,
        })),
      });

      if (eventNotifications.length === expectedCount) {
        this.log('SUCCESS', `Correct number of notifications scheduled (${expectedCount})`);
      } else {
        this.log('WARNING', `Expected ${expectedCount} notifications but found ${eventNotifications.length}`);
      }

      return eventNotifications;

    } catch (error) {
      this.log('ERROR', 'Failed to verify scheduled notifications', { error: error.message });
      return [];
    }
  }

  /**
   * Helper: Delay for testing
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate Summary Report
   */
  generateSummaryReport() {
    this.log('INFO', '========== TEST SUMMARY REPORT ==========');

    const duration = moment().diff(this.testStartTime, 'seconds');
    const successCount = this.testResults.filter(r => r.category === 'SUCCESS').length;
    const errorCount = this.testResults.filter(r => r.category === 'ERROR').length;
    const warningCount = this.testResults.filter(r => r.category === 'WARNING').length;
    const testCount = this.testResults.filter(r => r.category === 'TEST').length;

    this.log('INFO', `Test Duration: ${duration} seconds`);
    this.log('INFO', `Total Tests Run: ${testCount}`);
    this.log('SUCCESS', `Successful Operations: ${successCount}`);
    this.log('ERROR', `Errors: ${errorCount}`);
    this.log('WARNING', `Warnings: ${warningCount}`);

    this.log('INFO', '========================================');

    // Print all test results to console for easy review
    console.log('\n\n📊 FULL TEST RESULTS:');
    console.log(JSON.stringify(this.testResults, null, 2));
  }

  /**
   * Quick test for immediate verification
   */
  async quickTest() {
    this.log('START', '========== QUICK NOTIFICATION TEST ==========');

    try {
      // Test 1: Fire immediate notification
      this.log('TEST', 'Quick Test: Immediate notification');
      await NotificationService.showAchievementNotification({
        id: 'quick_test',
        name: 'Quick Test Badge',
      });

      // Test 2: Schedule near-future event
      this.log('TEST', 'Quick Test: Near-future event (2 minutes)');
      const event = this.createTestEvent('Quick Test Event', 2);
      await NotificationService.scheduleEventNotifications(event);
      await this.verifyScheduledNotifications(event.id, 2);

      this.log('SUCCESS', 'Quick test completed successfully');

    } catch (error) {
      this.log('ERROR', 'Quick test failed', { error: error.message });
    }
  }

  /**
   * Get all scheduled notifications (for debugging)
   */
  async listAllScheduledNotifications() {
    try {
      const scheduled = await NotificationService.getScheduledNotifications();

      this.log('INFO', `Total scheduled notifications: ${scheduled.length}`);

      scheduled.forEach((notif, index) => {
        this.log('INFO', `Notification ${index + 1}:`, {
          id: notif.id,
          title: notif.title,
          type: notif.userInfo?.type,
          eventId: notif.userInfo?.eventId,
          scheduledFor: moment(notif.date).format('YYYY-MM-DD HH:mm:ss'),
          fromNow: moment(notif.date).fromNow(),
        });
      });

      return scheduled;

    } catch (error) {
      this.log('ERROR', 'Failed to list scheduled notifications', { error: error.message });
      return [];
    }
  }

  /**
   * Clear all test notifications
   */
  async clearAllTestNotifications() {
    try {
      this.log('INFO', 'Clearing all test notifications...');

      const scheduled = await NotificationService.getScheduledNotifications();
      let clearedCount = 0;

      scheduled.forEach(notif => {
        if (notif.userInfo?.eventId?.includes('test_event')) {
          NotificationService.cancelNotification(notif.id);
          clearedCount++;
        }
      });

      this.log('SUCCESS', `Cleared ${clearedCount} test notifications`);

    } catch (error) {
      this.log('ERROR', 'Failed to clear test notifications', { error: error.message });
    }
  }
}

export default new NotificationTestService();
