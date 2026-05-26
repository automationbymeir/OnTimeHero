import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NotificationTestService from '../../services/NotificationTestService';
import { Colors, Typography, Spacing, BorderRadius, CommonStyles, getTextShadow, getStrongTextShadow, getDynamicBackground } from '../../styles/theme';

const NotificationTestScreen = ({ navigation }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [testSummary, setTestSummary] = useState(null);

  const runFullTestSuite = async () => {
    setIsRunning(true);
    setTestResults([]);
    setTestSummary(null);

    try {
      Alert.alert(
        'Test Started',
        'Running full notification test suite. Check console logs for detailed output.',
        [{ text: 'OK' }]
      );

      const results = await NotificationTestService.runAllTests();
      setTestResults(results);

      // Generate summary
      const successCount = results.filter(r => r.category === 'SUCCESS').length;
      const errorCount = results.filter(r => r.category === 'ERROR').length;
      const warningCount = results.filter(r => r.category === 'WARNING').length;

      setTestSummary({ successCount, errorCount, warningCount });

      Alert.alert(
        'Test Completed',
        `✅ Success: ${successCount}\n❌ Errors: ${errorCount}\n⚠️ Warnings: ${warningCount}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      Alert.alert('Test Failed', error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const runQuickTest = async () => {
    setIsRunning(true);

    try {
      Alert.alert(
        'Quick Test Started',
        'Running quick notification test. You should see a notification shortly.',
        [{ text: 'OK' }]
      );

      await NotificationTestService.quickTest();

      Alert.alert('Quick Test Completed', 'Check if you received the test notifications.');

    } catch (error) {
      Alert.alert('Quick Test Failed', error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const listScheduledNotifications = async () => {
    try {
      await NotificationTestService.listAllScheduledNotifications();
      Alert.alert('Scheduled Notifications', 'Check console for the full list of scheduled notifications.');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const clearTestNotifications = async () => {
    try {
      await NotificationTestService.clearAllTestNotifications();
      Alert.alert('Success', 'All test notifications have been cleared.');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const backgroundColors = getDynamicBackground();

  return (
    <LinearGradient colors={backgroundColors} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, getStrongTextShadow()]}>Notification Tests</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Test Summary Card */}
        {testSummary && (
          <View style={[CommonStyles.glassCard, styles.summaryCard]}>
            <Text style={[styles.sectionTitle, getTextShadow()]}>Test Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>✅ Success:</Text>
              <Text style={styles.summaryValue}>{testSummary.successCount}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>❌ Errors:</Text>
              <Text style={styles.summaryValue}>{testSummary.errorCount}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>⚠️ Warnings:</Text>
              <Text style={styles.summaryValue}>{testSummary.warningCount}</Text>
            </View>
          </View>
        )}

        {/* Test Buttons */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, getTextShadow()]}>Run Tests</Text>

          <TouchableOpacity
            style={[styles.testButton, isRunning && styles.disabledButton]}
            onPress={runFullTestSuite}
            disabled={isRunning}
          >
            <Icon name="science" size={24} color="#fff" />
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonTitle}>Full Test Suite</Text>
              <Text style={styles.buttonSubtitle}>
                Tests all notification types and scenarios
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, isRunning && styles.disabledButton]}
            onPress={runQuickTest}
            disabled={isRunning}
          >
            <Icon name="flash-on" size={24} color="#fff" />
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonTitle}>Quick Test</Text>
              <Text style={styles.buttonSubtitle}>
                Fast verification of basic functionality
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Utility Buttons */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, getTextShadow()]}>Utilities</Text>

          <TouchableOpacity
            style={styles.utilityButton}
            onPress={listScheduledNotifications}
          >
            <Icon name="list" size={20} color="#fff" />
            <Text style={styles.utilityButtonText}>List Scheduled Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.utilityButton}
            onPress={clearTestNotifications}
          >
            <Icon name="delete-sweep" size={20} color="#fff" />
            <Text style={styles.utilityButtonText}>Clear Test Notifications</Text>
          </TouchableOpacity>
        </View>

        {/* Test Results */}
        {testResults.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, getTextShadow()]}>
              Recent Test Logs ({testResults.length})
            </Text>

            {testResults.slice(-20).reverse().map((result, index) => (
              <View key={index} style={[CommonStyles.glassCard, styles.logEntry]}>
                <View style={styles.logHeader}>
                  <Text style={styles.logCategory}>{result.category}</Text>
                  <Text style={styles.logTimestamp}>{result.timestamp}</Text>
                </View>
                <Text style={styles.logMessage}>{result.message}</Text>
                {result.data && (
                  <Text style={styles.logData}>
                    {JSON.stringify(result.data, null, 2)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Info Section */}
        <View style={[CommonStyles.glassCard, styles.infoCard]}>
          <Text style={[styles.sectionTitle, getTextShadow()]}>About These Tests</Text>
          <Text style={styles.infoText}>
            These tests verify that all notification types work correctly:
          </Text>
          <Text style={styles.infoItem}>• Get Ready notifications</Text>
          <Text style={styles.infoItem}>• Time to Leave notifications</Text>
          <Text style={styles.infoItem}>• Achievement notifications</Text>
          <Text style={styles.infoItem}>• Streak notifications</Text>
          <Text style={styles.infoItem}>• Arrival notifications</Text>
          <Text style={styles.infoItem}>• Motivational messages</Text>
          <Text style={styles.infoText} style={[styles.infoText, { marginTop: 10 }]}>
            Check the console (logcat/metro logs) for detailed output.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: CommonStyles.container,
  header: {
    ...CommonStyles.row,
    padding: Spacing.lg,
    paddingTop: Spacing.huge,
    backgroundColor: Colors.glass.black10,
  },
  backButton: {
    marginRight: Spacing.base,
  },
  headerTitle: {
    ...Typography.h3,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h4,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    marginTop: Spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glass.border,
  },
  summaryLabel: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  summaryValue: {
    ...Typography.body,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  testButton: {
    ...CommonStyles.glassCard,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonTextContainer: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  buttonTitle: {
    ...Typography.h5,
    marginBottom: Spacing.xs,
  },
  buttonSubtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  utilityButton: {
    ...CommonStyles.glassCard,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  utilityButtonText: {
    ...Typography.body,
    marginLeft: Spacing.md,
  },
  logEntry: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  logCategory: {
    ...Typography.caption,
    fontWeight: Typography.weight.bold,
    color: Colors.status.info.solid,
  },
  logTimestamp: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  logMessage: {
    ...Typography.body,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  logData: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  infoCard: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxxl,
  },
  infoText: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  infoItem: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginLeft: Spacing.md,
  },
});

export default NotificationTestScreen;
