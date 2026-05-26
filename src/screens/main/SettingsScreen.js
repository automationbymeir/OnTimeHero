import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GoogleMapsService from '../../services/GoogleMapsService';
import GamificationService from '../../services/GamificationService';
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';
import NotificationService from '../../services/NotificationService';
import PushNotification from 'react-native-push-notification';
import Theme, {
  getDynamicBackground,
  getBackgroundImage,
  Typography,
  Colors,
  Spacing,
  getSubtleTextShadow,
  getTextShadow,
} from '../../styles/theme';

const SettingsScreen = ({ navigation }) => {
  const backgroundColors = getDynamicBackground();
  const backgroundImage = getBackgroundImage();

  // Settings state - using existing functionality
  const [reminder1Minutes, setReminder1Minutes] = useState(30);
  const [reminder2Minutes, setReminder2Minutes] = useState(15);
  const [phoneLockEnabled, setPhoneLockEnabled] = useState(true);
  const [lockDuration, setLockDuration] = useState(30);
  const [emergencyPin, setEmergencyPin] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [googleMapsEnabled, setGoogleMapsEnabled] = useState(false);
  const [homeAddress, setHomeAddress] = useState('');
  const [showHomeAddressModal, setShowHomeAddressModal] = useState(false);
  const [newHomeAddress, setNewHomeAddress] = useState('');
  const [homeAddressPredictions, setHomeAddressPredictions] = useState([]);
  const [showHomeAddressPredictions, setShowHomeAddressPredictions] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [batteryUnrestricted, setBatteryUnrestricted] = useState(false);

  // New settings for the redesigned UI
  const [voiceReminders, setVoiceReminders] = useState(true);
  const [calendarSync, setCalendarSync] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedReminder1Minutes = await AsyncStorage.getItem('reminder1Minutes');
      const savedReminder2Minutes = await AsyncStorage.getItem('reminder2Minutes');
      const savedPhoneLockEnabled = await AsyncStorage.getItem('phoneLockEnabled');
      const savedLockDuration = await AsyncStorage.getItem('lockDuration');
      const savedEmergencyPin = await AsyncStorage.getItem('emergencyPin');
      const savedGoogleMapsEnabled = await AsyncStorage.getItem('googleMapsEnabled');
      const savedHomeAddress = await AsyncStorage.getItem('homeAddress');
      const savedNotificationsEnabled = await AsyncStorage.getItem('notificationsEnabled');
      const savedOverlayEnabled = await AsyncStorage.getItem('overlayEnabled');
      const savedBatteryUnrestricted = await AsyncStorage.getItem('batteryUnrestricted');

      if (savedReminder1Minutes) setReminder1Minutes(parseInt(savedReminder1Minutes));
      if (savedReminder2Minutes) setReminder2Minutes(parseInt(savedReminder2Minutes));
      if (savedPhoneLockEnabled) setPhoneLockEnabled(savedPhoneLockEnabled === 'true');
      if (savedLockDuration) setLockDuration(parseInt(savedLockDuration));
      if (savedEmergencyPin) setEmergencyPin(savedEmergencyPin);
      if (savedGoogleMapsEnabled) setGoogleMapsEnabled(savedGoogleMapsEnabled === 'true');
      if (savedHomeAddress) setHomeAddress(savedHomeAddress);
      if (savedNotificationsEnabled) setNotificationsEnabled(savedNotificationsEnabled === 'true');
      if (savedOverlayEnabled) setOverlayEnabled(savedOverlayEnabled === 'true');
      if (savedBatteryUnrestricted) setBatteryUnrestricted(savedBatteryUnrestricted === 'true');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('reminder1Minutes', reminder1Minutes.toString());
      await AsyncStorage.setItem('reminder2Minutes', reminder2Minutes.toString());
      await AsyncStorage.setItem('phoneLockEnabled', phoneLockEnabled.toString());
      await AsyncStorage.setItem('lockDuration', lockDuration.toString());
      await AsyncStorage.setItem('emergencyPin', emergencyPin);
      await AsyncStorage.setItem('googleMapsEnabled', googleMapsEnabled.toString());
      await AsyncStorage.setItem('homeAddress', homeAddress);
      await AsyncStorage.setItem('notificationsEnabled', notificationsEnabled.toString());
      await AsyncStorage.setItem('overlayEnabled', overlayEnabled.toString());
      await AsyncStorage.setItem('batteryUnrestricted', batteryUnrestricted.toString());
      console.log('✅ Settings saved successfully');
    } catch (error) {
      console.error('❌ Error saving settings:', error);
    }
  };

  const handleNotificationToggle = async (value) => {
    if (value) {
      try {
        const granted = await requestNotificationPermission();
        if (granted) {
          setNotificationsEnabled(true);
          await saveSettings();
          Alert.alert(
            'Notifications Enabled',
            'You will now receive event reminders and arrival notifications.',
            [{ text: 'OK' }]
          );
          console.log('🔔 Notifications enabled');
        } else {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive reminders.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
          setNotificationsEnabled(false);
        }
      } catch (error) {
        console.error('❌ Error enabling notifications:', error);
        setNotificationsEnabled(false);
      }
    } else {
      setNotificationsEnabled(false);
      await saveSettings();
      Alert.alert(
        'Notifications Disabled',
        'You will no longer receive event reminders. You can re-enable them anytime.',
        [{ text: 'OK' }]
      );
      console.log('🔕 Notifications disabled');
    }
  };

  const requestNotificationPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification Permission',
          message: 'OnTimeHero needs notification permission to send you event reminders.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const openOverlaySettings = async () => {
    try {
      if (Platform.OS === 'android') {
        const NativeModules = require('react-native').NativeModules;
        const SettingsBridge = NativeModules?.SettingsBridge;
        if (SettingsBridge?.openOverlaySettings) {
          await SettingsBridge.openOverlaySettings();
          setTimeout(async () => {
            const overlay = await SettingsBridge.isOverlayEnabled();
            setOverlayEnabled(overlay === true);
          }, 1000);
        } else {
          await Linking.openSettings();
        }
      } else {
        await Linking.openSettings();
      }
    } catch (e) {
      await Linking.openSettings();
    }
  };

  const openBatteryOptimizationSettings = async () => {
    try {
      if (Platform.OS === 'android') {
        const NativeModules = require('react-native').NativeModules;
        const SettingsBridge = NativeModules?.SettingsBridge;
        if (SettingsBridge?.openBatteryOptimizationSettings) {
          await SettingsBridge.openBatteryOptimizationSettings();
          setTimeout(async () => {
            const battery = await SettingsBridge.isBatteryOptimizationDisabled();
            setBatteryUnrestricted(battery === true);
          }, 1000);
        } else {
          await Linking.openSettings();
        }
      } else {
        await Linking.openSettings();
      }
    } catch (e) {
      await Linking.openSettings();
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            // Handle logout logic
            console.log('User logged out');
            navigation.navigate('Login');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Handle account deletion
            console.log('Account deleted');
          },
        },
      ]
    );
  };

  const handleResetProgress = async () => {
    Alert.alert(
      'Reset Progress',
      'This will permanently delete all your XP, levels, streaks, and achievements. This cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Calling GamificationService.resetUserData()...');
              const success = await GamificationService.resetUserData();

              if (success) {
                Alert.alert(
                  'Success',
                  'All progress has been reset successfully! Your XP, levels, streaks, and achievements have been cleared.',
                  [
                    { text: 'OK', onPress: () => {
                      // Navigate to Dashboard to see the reset
                      navigation.navigate('Dashboard');
                    }}
                  ]
                );
              } else {
                Alert.alert(
                  'Error',
                  'Failed to reset progress. Please try again or check your internet connection.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('❌ Error in handleResetProgress:', error);
              Alert.alert(
                'Error',
                `An error occurred: ${error.message}. Please try again.`,
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const handleResetAwardsAndPoints = () => {
    Alert.alert(
      'Reset Awards & Points',
      'This will reset all your points, achievements, badges, and statistics. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              const firestore = require('@react-native-firebase/firestore').default;
              const auth = require('@react-native-firebase/auth').default;
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              
              const currentUser = auth().currentUser;
              if (!currentUser) {
                Alert.alert('Error', 'You must be logged in to reset data');
                return;
              }

              console.log('🔄 Starting reset for user:', currentUser.uid);

              // Force create/overwrite user document with reset values
              const userDocRef = firestore().collection('users').doc(currentUser.uid);
              await userDocRef.set({
                xp: 0,
                level: 1,
                achievements: [],
                badges: [],
                currentStreak: 0,
                punctualityScore: 0,
                lastPointsUpdate: firestore.FieldValue.serverTimestamp(),
                lastPointsReason: 'Reset by user',
                createdAt: firestore.FieldValue.serverTimestamp(),
              }, { merge: false }); // merge: false forces overwrite

              console.log('✅ User document reset successfully');

              // Clear local storage
              await AsyncStorage.removeItem('userStats');
              await AsyncStorage.removeItem('latestAchievement');
              await AsyncStorage.removeItem('levelUp');
              await AsyncStorage.removeItem('userNotifications');
              console.log('✅ Local storage cleared');

              // Clear all achievement records
              console.log('🗑️ Clearing achievement records...');
              const achievementsSnapshot = await firestore()
                .collection('achievements')
                .where('userId', '==', currentUser.uid)
                .get();
              
              console.log(`🗑️ Found ${achievementsSnapshot.docs.length} achievement records to delete`);
              
              if (achievementsSnapshot.docs.length > 0) {
                const batch = firestore().batch();
                achievementsSnapshot.docs.forEach(doc => {
                  batch.delete(doc.ref);
                });
                await batch.commit();
                console.log('✅ Achievement records deleted');
              }

              // Clear XP logs
              console.log('🗑️ Clearing XP logs...');
              const xpLogsSnapshot = await firestore()
                .collection('xp_logs')
                .where('userId', '==', currentUser.uid)
                .get();
              
              console.log(`🗑️ Found ${xpLogsSnapshot.docs.length} XP log records to delete`);
              
              if (xpLogsSnapshot.docs.length > 0) {
                const xpBatch = firestore().batch();
                xpLogsSnapshot.docs.forEach(doc => {
                  xpBatch.delete(doc.ref);
                });
                await xpBatch.commit();
                console.log('✅ XP log records deleted');
              }

              // Wait for Firestore to propagate
              await new Promise(resolve => setTimeout(resolve, 3000));

              // Verify the reset worked by reading the document back
              const verifyDoc = await userDocRef.get();
              const verifyData = verifyDoc.data();
              console.log('🔍 Verification - User document after reset:', verifyData);
              
              // Double-check that all fields are properly reset
              if (verifyData.xp !== 0 || verifyData.level !== 1 || verifyData.currentStreak !== 0) {
                console.log('❌ Reset verification failed, retrying...');
                await userDocRef.set({
                  xp: 0,
                  level: 1,
                  achievements: [],
                  badges: [],
                  currentStreak: 0,
                  punctualityScore: 0,
                  lastPointsUpdate: firestore.FieldValue.serverTimestamp(),
                  lastPointsReason: 'Reset by user (retry)',
                }, { merge: false });
                
                // Wait again and verify
                await new Promise(resolve => setTimeout(resolve, 2000));
                const retryDoc = await userDocRef.get();
                const retryData = retryDoc.data();
                console.log('🔍 Retry verification - User document after reset:', retryData);
              }

              // Emit multiple events to ensure dashboard gets the message
              const DeviceEventEmitter = require('react-native').DeviceEventEmitter;
              
              // Get the final verified data
              const finalDoc = await userDocRef.get();
              const finalData = finalDoc.data();
              console.log('🔍 Final data before emitting events:', finalData);
              
              const resetStats = {
                points: finalData.xp || 0,
                level: finalData.level || 1,
                currentStreak: finalData.currentStreak || 0,
                xpForNextLevel: 100,
              };
              
              console.log('📡 Emitting STATS_RESET event...');
              DeviceEventEmitter.emit('STATS_RESET');
              
              // Small delay between events
              await new Promise(resolve => setTimeout(resolve, 200));
              
              console.log('📡 Emitting FORCE_REFRESH event...');
              DeviceEventEmitter.emit('FORCE_REFRESH');
              
              // Small delay between events
              await new Promise(resolve => setTimeout(resolve, 200));
              
              console.log('📡 Emitting POINTS_UPDATED event with data:', resetStats);
              DeviceEventEmitter.emit('POINTS_UPDATED', resetStats);
              
              // Emit a final comprehensive event
              console.log('📡 Emitting COMPLETE_RESET event...');
              DeviceEventEmitter.emit('COMPLETE_RESET', resetStats);
              
              console.log('📡 All events emitted successfully');

              Alert.alert(
                'Success',
                `Reset completed! Points: ${verifyData.xp}, Level: ${verifyData.level}. The dashboard should update automatically.`,
                [
                  { text: 'OK' },
                  { 
                    text: 'Force Refresh Dashboard', 
                    onPress: () => {
                      DeviceEventEmitter.emit('STATS_RESET');
                      DeviceEventEmitter.emit('FORCE_REFRESH');
                      DeviceEventEmitter.emit('POINTS_UPDATED', {
                        points: 0,
                        level: 1,
                        xpForNextLevel: 100,
                      });
                    }
                  }
                ]
              );
              
              console.log('✅ All awards and points data reset successfully');
            } catch (error) {
              console.error('❌ Error resetting awards and points:', error);
              Alert.alert(
                'Error',
                `Failed to reset data: ${error.message}. Please try again.`,
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const notificationOptions = [5, 10, 15, 30, 45, 60];
  const lockDurationOptions = [15, 30, 45, 60, 90, 120];

  return (
    <ImageBackground
      source={{ uri: backgroundImage }}
      style={{ flex: 1 }}
      imageStyle={{ opacity: 0.3 }}
    >
      <LinearGradient
        colors={['#0ea5e9', '#0369a1', '#00172a']}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.huge }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ marginTop: Spacing.xl, marginBottom: Spacing.xxxl }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginBottom: Spacing.lg }}
            >
              <Icon name="arrow-back" size={28} color={Colors.text.primary} />
            </TouchableOpacity>
            <Text style={[Typography.huge, getTextShadow()]}>
              Settings
            </Text>
            <Text style={[Typography.body, { color: Colors.text.secondary, marginTop: Spacing.xs }]}>
              Customize your OnTimeHero experience
            </Text>
          </View>

          {/* Profile Section */}
          <View style={{ marginBottom: Spacing.xxxl }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: Spacing.md,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: Colors.status.info + '40',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: Spacing.md,
                }}
              >
                <Icon name="person" size={32} color={Colors.text.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.h3, getSubtleTextShadow()]}>
                  Meir
                </Text>
                <Text style={[Typography.body, { color: Colors.text.secondary }]}>
                  View and edit profile
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color={Colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          {/* Notifications Section */}
          <View style={{ marginBottom: Spacing.xxxl }}>
            <Text style={[Typography.h4, getSubtleTextShadow(), { marginBottom: Spacing.lg }]}>
              Notifications
            </Text>

            <SettingToggle
              icon="notifications"
              label="Push Notifications"
              description="Get reminded about upcoming events"
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
            />

            <SettingToggle
              icon="record-voice-over"
              label="Voice Reminders"
              description="Hear audio reminders before events"
              value={voiceReminders}
              onValueChange={setVoiceReminders}
            />

            <SettingToggle
              icon="volume-up"
              label="Sound Effects"
              description="Play sounds for actions and achievements"
              value={soundEffects}
              onValueChange={setSoundEffects}
            />
          </View>

          {/* Reminder Settings */}
          <View style={{ marginBottom: Spacing.xxxl }}>
            <Text style={[Typography.h4, getSubtleTextShadow(), { marginBottom: Spacing.lg }]}>
              Reminder Settings
            </Text>

            <SettingItem
              icon="schedule"
              label="Get Ready Reminder"
              description={`${reminder1Minutes} minutes before event`}
              onPress={() => {
                Alert.alert(
                  'Get Ready Reminder',
                  'Choose when to remind you to prepare:',
                  notificationOptions.map(minutes => ({
                    text: `${minutes} min`,
                    onPress: () => {
                      setReminder1Minutes(minutes);
                      saveSettings();
                    }
                  }))
                );
              }}
            />

            <SettingItem
              icon="directions-run"
              label="Leave Now Reminder"
              description={`${reminder2Minutes} minutes before event`}
              onPress={() => {
                Alert.alert(
                  'Leave Now Reminder',
                  'Choose when to remind you to leave:',
                  notificationOptions.map(minutes => ({
                    text: `${minutes} min`,
                    onPress: () => {
                      setReminder2Minutes(minutes);
                      saveSettings();
                    }
                  }))
                );
              }}
            />
          </View>

          {/* Calendar & Sync Section */}
          <View style={{ marginBottom: Spacing.xxxl }}>
            <Text style={[Typography.h4, getSubtleTextShadow(), { marginBottom: Spacing.lg }]}>
              Calendar & Sync
            </Text>

            <SettingToggle
              icon="sync"
              label="Google Calendar Sync"
              description="Automatically sync with Google Calendar"
              value={calendarSync}
              onValueChange={setCalendarSync}
            />

            <SettingItem
              icon="calendar-today"
              label="Manage Calendars"
              description="Choose which calendars to display"
              onPress={() => navigation.navigate('Calendar')}
            />

            <SettingItem
              icon="refresh"
              label="Sync Now"
              description="Manually sync your events"
              onPress={() => {
                Alert.alert('Sync', 'Syncing your events...');
                // Add actual sync logic here
              }}
            />
          </View>

          {/* Phone Lock Settings */}
          <View style={{ marginBottom: Spacing.xxxl }}>
            <Text style={[Typography.h4, getSubtleTextShadow(), { marginBottom: Spacing.lg }]}>
              Phone Lock
            </Text>

            <SettingToggle
              icon="lock"
              label="Enable Phone Lock"
              description="Lock phone during travel time"
              value={phoneLockEnabled}
              onValueChange={(value) => {
                setPhoneLockEnabled(value);
                saveSettings();
              }}
            />

            <SettingItem
              icon="timer"
              label="Lock Duration"
              description={`${lockDuration} minutes before event`}
              onPress={() => {
                Alert.alert(
                  'Lock Duration',
                  'How long before event to lock phone:',
                  lockDurationOptions.map(minutes => ({
                    text: `${minutes} min`,
                    onPress: () => {
                      setLockDuration(minutes);
                      saveSettings();
                    }
                  }))
                );
              }}
            />

            <SettingItem
              icon="security"
              label="Emergency PIN"
              description={emergencyPin ? 'PIN set' : 'Set emergency PIN'}
              onPress={() => setShowPinModal(true)}
            />
          </View>

          {/* Location Settings */}
          <View style={{ marginBottom: Spacing.xxxl }}>
            <Text style={[Typography.h4, getSubtleTextShadow(), { marginBottom: Spacing.lg }]}>
              Location
            </Text>

            <SettingToggle
              icon="my-location"
              label="Use Current Location"
              description="Automatically use your current location"
              value={googleMapsEnabled}
              onValueChange={(value) => {
                setGoogleMapsEnabled(value);
                saveSettings();
              }}
            />

            <SettingItem
              icon="home"
              label="Home Address"
              description={homeAddress || 'Set your home address'}
              onPress={() => setShowHomeAddressModal(true)}
            />
          </View>

          {/* System Permissions */}
          <View style={{ marginBottom: Spacing.xxxl }}>
            <Text style={[Typography.h4, getSubtleTextShadow(), { marginBottom: Spacing.lg }]}>
              System Permissions
            </Text>

            <SettingItem
              icon="picture-in-picture"
              label="Display Over Other Apps"
              description="Required for full-screen alerts"
              onPress={openOverlaySettings}
              iconColor={overlayEnabled ? Colors.status.success : Colors.status.warning}
            />

            <SettingItem
              icon="battery-charging-full"
              label="Battery Optimization"
              description="Ensure notifications work properly"
              onPress={openBatteryOptimizationSettings}
              iconColor={batteryUnrestricted ? Colors.status.success : Colors.status.warning}
            />
          </View>

          {/* Data & Privacy Section */}
          <View style={{ marginBottom: Spacing.xxxl }}>
            <Text style={[Typography.h4, getSubtleTextShadow(), { marginBottom: Spacing.lg }]}>
              Data & Privacy
            </Text>

            <SettingItem
              icon="cloud-upload"
              label="Export Data"
              description="Download all your data"
              onPress={() => {
                Alert.alert('Export Data', 'Feature coming soon!');
              }}
            />

            <SettingItem
              icon="refresh"
              label="Reset Awards & Points"
              description="Clear all achievements and statistics"
              onPress={handleResetAwardsAndPoints}
              iconColor={Colors.status.warning}
            />

            <SettingItem
              icon="privacy-tip"
              label="Privacy Policy"
              description="Read our privacy policy"
              onPress={() => {
                Alert.alert('Privacy Policy', 'Feature coming soon!');
              }}
            />

            <SettingItem
              icon="description"
              label="Terms of Service"
              description="View terms and conditions"
              onPress={() => {
                Alert.alert('Terms of Service', 'Feature coming soon!');
              }}
            />
          </View>

          {/* About Section */}
          <View style={{ marginBottom: Spacing.xxxl }}>
            <Text style={[Typography.h4, getSubtleTextShadow(), { marginBottom: Spacing.lg }]}>
              About
            </Text>

            <SettingItem
              icon="info"
              label="App Version"
              description="1.0.0 (Beta)"
              onPress={() => {
                Alert.alert('App Version', 'OnTimeHero v1.0.0 (Beta)');
              }}
            />

            <SettingItem
              icon="star"
              label="Rate OnTimeHero"
              description="Show us some love on the App Store"
              onPress={() => {
                Alert.alert('Rate App', 'Feature coming soon!');
              }}
            />

            <SettingItem
              icon="feedback"
              label="Send Feedback"
              description="Help us improve the app"
              onPress={() => {
                Alert.alert('Send Feedback', 'Feature coming soon!');
              }}
            />
          </View>

          {/* Account Section */}
          <View style={{ marginBottom: Spacing.xxxl }}>
            <Text style={[Typography.h4, getSubtleTextShadow(), { marginBottom: Spacing.lg }]}>
              Account
            </Text>

            <SettingItem
              icon="logout"
              label="Logout"
              description="Sign out of your account"
              onPress={handleLogout}
              iconColor={Colors.status.warning}
            />

            <SettingItem
              icon="delete-forever"
              label="Delete Account"
              description="Permanently delete your account and data"
              onPress={handleDeleteAccount}
              iconColor={Colors.status.danger}
            />

            <SettingItem
              icon="refresh"
              label="Reset Progress"
              description="Reset all XP, levels, streaks, and achievements"
              onPress={handleResetProgress}
              iconColor={Colors.status.warning}
            />
          </View>

          {/* Footer */}
          <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
            <Text style={[Typography.caption, { color: Colors.text.tertiary }]}>
              Made with ❤️ for punctuality heroes
            </Text>
            <Text style={[Typography.small, { color: Colors.text.hint, marginTop: Spacing.xs }]}>
              © 2025 OnTimeHero
            </Text>
          </View>
        </ScrollView>

        {/* Emergency PIN Modal */}
        <Modal
          visible={showPinModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPinModal(false)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 15,
              padding: 20,
              width: '90%',
              maxWidth: 400,
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: '#333',
                marginBottom: 10,
                textAlign: 'center',
              }}>
                Set Emergency PIN
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#666',
                marginBottom: 20,
                textAlign: 'center',
              }}>
                Enter a 4-digit PIN for emergency access
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 8,
                  padding: 15,
                  fontSize: 18,
                  textAlign: 'center',
                  marginBottom: 15,
                  backgroundColor: '#f9f9f9',
                }}
                placeholder="Enter PIN"
                value={newPin}
                onChangeText={setNewPin}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 10,
              }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 15,
                    borderRadius: 8,
                    backgroundColor: '#f0f0f0',
                    marginRight: 10,
                    alignItems: 'center',
                  }}
                  onPress={() => setShowPinModal(false)}
                >
                  <Text style={{ color: '#333', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 15,
                    borderRadius: 8,
                    backgroundColor: '#667eea',
                    marginLeft: 10,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    if (newPin.length === 4) {
                      setEmergencyPin(newPin);
                      setNewPin('');
                      setShowPinModal(false);
                      saveSettings();
                      Alert.alert('Success', 'Emergency PIN set successfully!');
                    } else {
                      Alert.alert('Error', 'Please enter a 4-digit PIN');
                    }
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Home Address Modal */}
        <Modal
          visible={showHomeAddressModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowHomeAddressModal(false)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 15,
              padding: 20,
              width: '90%',
              maxWidth: 400,
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: '#333',
                marginBottom: 10,
                textAlign: 'center',
              }}>
                Set Home Address
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#666',
                marginBottom: 20,
                textAlign: 'center',
              }}>
                Enter your home address for better travel calculations
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 8,
                  padding: 15,
                  fontSize: 16,
                  marginBottom: 15,
                  backgroundColor: '#f9f9f9',
                }}
                placeholder="Enter home address"
                value={newHomeAddress}
                onChangeText={setNewHomeAddress}
              />
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 10,
              }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 15,
                    borderRadius: 8,
                    backgroundColor: '#f0f0f0',
                    marginRight: 10,
                    alignItems: 'center',
                  }}
                  onPress={() => setShowHomeAddressModal(false)}
                >
                  <Text style={{ color: '#333', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 15,
                    borderRadius: 8,
                    backgroundColor: '#667eea',
                    marginLeft: 10,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    if (newHomeAddress.trim()) {
                      setHomeAddress(newHomeAddress);
                      setNewHomeAddress('');
                      setShowHomeAddressModal(false);
                      saveSettings();
                      Alert.alert('Success', 'Home address set successfully!');
                    } else {
                      Alert.alert('Error', 'Please enter a valid address');
                    }
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </ImageBackground>
  );
};

// Reusable Setting Toggle Component
const SettingToggle = ({
  icon,
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.text.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
      }}
    >
      <Icon name={icon} size={20} color={Colors.text.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[Typography.bodyLarge, getSubtleTextShadow()]}>
        {label}
      </Text>
      <Text style={[Typography.caption, { color: Colors.text.tertiary, marginTop: 2 }]}>
        {description}
      </Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{
        false: Colors.text.primary + '20',
        true: Colors.status.success + '60',
      }}
      thumbColor={value ? Colors.status.success : Colors.text.secondary}
      ios_backgroundColor={Colors.text.primary + '20'}
    />
  </View>
);

// Reusable Setting Item Component
const SettingItem = ({
  icon,
  label,
  description,
  onPress,
  iconColor = Colors.text.primary,
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
    }}
  >
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.text.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
      }}
    >
      <Icon name={icon} size={20} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[Typography.bodyLarge, getSubtleTextShadow()]}>
        {label}
      </Text>
      <Text style={[Typography.caption, { color: Colors.text.tertiary, marginTop: 2 }]}>
        {description}
      </Text>
    </View>
    <Icon name="chevron-right" size={24} color={Colors.text.tertiary} />
  </TouchableOpacity>
);

export default SettingsScreen;