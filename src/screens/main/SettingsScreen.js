import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GoogleMapsService from '../../services/GoogleMapsService';
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';

const SettingsScreen = ({ navigation }) => {
  const [reminder1Minutes, setReminder1Minutes] = useState(30); // First reminder (get ready)
  const [reminder2Minutes, setReminder2Minutes] = useState(15); // Second reminder (time to leave)
  const [phoneLockEnabled, setPhoneLockEnabled] = useState(true);
  const [lockDuration, setLockDuration] = useState(30); // minutes before event
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

      if (savedReminder1Minutes) {
        setReminder1Minutes(parseInt(savedReminder1Minutes));
      }
      if (savedReminder2Minutes) {
        setReminder2Minutes(parseInt(savedReminder2Minutes));
      }
      if (savedPhoneLockEnabled) {
        setPhoneLockEnabled(savedPhoneLockEnabled === 'true');
      }
      if (savedLockDuration) {
        setLockDuration(parseInt(savedLockDuration));
      }
      if (savedEmergencyPin) {
        setEmergencyPin(savedEmergencyPin);
      }
      
      // Load Google Maps settings
      const savedGoogleMapsEnabled = await AsyncStorage.getItem('googleMapsEnabled');
      if (savedGoogleMapsEnabled) {
        setGoogleMapsEnabled(savedGoogleMapsEnabled === 'true');
      }
      
      const savedHomeAddress = await GoogleMapsService.getHomeAddress();
      if (savedHomeAddress) {
        setHomeAddress(savedHomeAddress);
      }
      
      // Load notification settings
      const savedNotificationsEnabled = await AsyncStorage.getItem('notificationsEnabled');
      if (savedNotificationsEnabled) {
        setNotificationsEnabled(savedNotificationsEnabled === 'true');
      } else {
        // Check actual notification permissions on startup
        try {
          const NotificationService = require('../../services/NotificationService').default;
          const hasPermissions = await NotificationService.checkPermissions();
          setNotificationsEnabled(hasPermissions);
          console.log('📱 Checked notification permissions on startup:', hasPermissions);
        } catch (error) {
          console.error('Error checking notification permissions:', error);
        }
      }
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
      await GoogleMapsService.setEnabled(googleMapsEnabled);
      await AsyncStorage.setItem('notificationsEnabled', notificationsEnabled.toString());
      
      Alert.alert('Settings Saved', 'Your notification and lock settings have been updated.');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const handleSavePin = async () => {
    if (newPin.length !== 4) {
      Alert.alert('Error', 'PIN must be exactly 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    try {
      await AsyncStorage.setItem('emergencyPin', newPin);
      setEmergencyPin(newPin);
      setShowPinModal(false);
      setNewPin('');
      setConfirmPin('');
      Alert.alert('Success', 'Emergency PIN saved successfully!');
    } catch (error) {
      console.error('Error saving PIN:', error);
      Alert.alert('Error', 'Failed to save PIN');
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'OnTimeHero needs access to your location to set your home address.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const getCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Location permission is required to get your current location.');
      return;
    }

    try {
      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log('📍 Current location:', latitude, longitude);
          
          // Reverse geocode to get address
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GoogleMapsService.apiKey}`
            );
            const data = await response.json();
            
            if (data.status === 'OK' && data.results.length > 0) {
              const address = data.results[0].formatted_address;
              setNewHomeAddress(address);
              console.log('📍 Address found:', address);
            } else {
              Alert.alert('Error', 'Could not find address for your location.');
            }
          } catch (error) {
            console.error('Reverse geocoding error:', error);
            Alert.alert('Error', 'Failed to get address from location.');
          }
        },
        (error) => {
          console.error('Location error:', error);
          Alert.alert('Location Error', 'Could not get your current location. Please enter your address manually.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } catch (error) {
      console.error('Geolocation error:', error);
      Alert.alert('Error', 'Location services are not available.');
    }
  };

  const handleHomeAddressChange = async (text) => {
    setNewHomeAddress(text);
    
    if (text.length > 2) {
      // Get autocomplete predictions
      const predictions = await GoogleMapsService.getPlacePredictions(text);
      setHomeAddressPredictions(predictions);
      setShowHomeAddressPredictions(predictions.length > 0);
    } else {
      setHomeAddressPredictions([]);
      setShowHomeAddressPredictions(false);
    }
  };

  const handleSelectHomeAddress = (prediction) => {
    setNewHomeAddress(prediction.description);
    setShowHomeAddressPredictions(false);
  };

  const handleSaveHomeAddress = async () => {
    if (!newHomeAddress.trim()) {
      Alert.alert('Error', 'Please enter your home address');
      return;
    }

    try {
      await GoogleMapsService.setHomeAddress(newHomeAddress);
      setHomeAddress(newHomeAddress);
      setShowHomeAddressModal(false);
      setNewHomeAddress('');
      setShowHomeAddressPredictions(false);
      Alert.alert('Success', 'Home address saved successfully!');
    } catch (error) {
      console.error('Error saving home address:', error);
      Alert.alert('Error', 'Failed to save home address');
    }
  };

  const handleNotificationToggle = async (value) => {
    if (value) {
      try {
        console.log('🔔 Requesting notification permissions...');

        // Always open system settings to let user enable permissions
        Alert.alert(
          'Enable Notifications',
          'OnTimeHero needs notification permissions to send you event reminders. Tap "Open Settings" to enable notifications in your device settings.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setNotificationsEnabled(false) },
            {
              text: 'Open Settings',
              onPress: async () => {
                await Linking.openSettings();

                // Check permissions after user returns
                setTimeout(async () => {
                  const NotificationService = require('../../services/NotificationService').default;
                  const hasPermissions = await NotificationService.checkPermissions();
                  setNotificationsEnabled(hasPermissions);
                  if (hasPermissions) {
                    await saveSettings();
                    Alert.alert(
                      '✅ Notifications Enabled!',
                      'You will now receive event reminders based on your settings.',
                      [{ text: 'Great!' }]
                    );
                  }
                }, 1000);
              }
            }
          ]
        );
      } catch (error) {
        console.error('❌ Error opening settings:', error);
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

  const notificationOptions = [5, 10, 15, 30, 45, 60];
  const lockDurationOptions = [15, 30, 45, 60, 90, 120];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity onPress={saveSettings} style={styles.saveButton}>
            <Icon name="save" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notification Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.switchContainer}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.settingLabel}>Enable notifications</Text>
                <Text style={styles.settingDescription}>
                  Allow the app to send you event reminders and arrival notifications
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: '#767577', true: '#667eea' }}
                thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>First reminder (Get Ready):</Text>
            <Text style={styles.settingDescription}>
              Time before event to remind you to prepare
            </Text>
            <View style={styles.optionsContainer}>
              {notificationOptions.map((minutes) => (
                <TouchableOpacity
                  key={`reminder1_${minutes}`}
                  style={[
                    styles.optionButton,
                    reminder1Minutes === minutes && styles.selectedOption
                  ]}
                  onPress={() => setReminder1Minutes(minutes)}
                >
                  <Text style={[
                    styles.optionText,
                    reminder1Minutes === minutes && styles.selectedOptionText
                  ]}>
                    {minutes}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Second reminder (Time to Leave):</Text>
            <Text style={styles.settingDescription}>
              Time before event to notify you to leave
            </Text>
            <View style={styles.optionsContainer}>
              {notificationOptions.map((minutes) => (
                <TouchableOpacity
                  key={`reminder2_${minutes}`}
                  style={[
                    styles.optionButton,
                    reminder2Minutes === minutes && styles.selectedOption
                  ]}
                  onPress={() => setReminder2Minutes(minutes)}
                >
                  <Text style={[
                    styles.optionText,
                    reminder2Minutes === minutes && styles.selectedOptionText
                  ]}>
                    {minutes}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Phone Lock Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Phone Lock Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.switchContainer}>
              <Text style={styles.settingLabel}>Enable phone lock before events</Text>
              <Switch
                value={phoneLockEnabled}
                onValueChange={setPhoneLockEnabled}
                trackColor={{ false: '#767577', true: '#667eea' }}
                thumbColor={phoneLockEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={styles.settingDescription}>
              When enabled, your phone will be locked before important events to help you stay focused.
            </Text>
          </View>

          {phoneLockEnabled && (
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Lock phone starting:</Text>
              <View style={styles.optionsContainer}>
                {lockDurationOptions.map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.optionButton,
                      lockDuration === minutes && styles.selectedOption
                    ]}
                    onPress={() => setLockDuration(minutes)}
                  >
                    <Text style={[
                      styles.optionText,
                      lockDuration === minutes && styles.selectedOptionText
                    ]}>
                      {minutes}m before
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Google Maps Integration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗺️ Google Maps Integration</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.switchContainer}>
              <Text style={styles.settingLabel}>Enable Google Maps travel time</Text>
              <Switch
                value={googleMapsEnabled}
                onValueChange={setGoogleMapsEnabled}
                trackColor={{ false: '#767577', true: '#667eea' }}
                thumbColor={googleMapsEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={styles.settingDescription}>
              Calculate accurate travel time based on real-time traffic data
            </Text>
          </View>

          {googleMapsEnabled && (
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Home Address:</Text>
              <TouchableOpacity
                style={styles.pinButton}
                onPress={() => {
                  setNewHomeAddress(homeAddress);
                  setShowHomeAddressModal(true);
                }}
              >
                <Text style={styles.pinButtonText}>
                  {homeAddress || 'Set your home address'}
                </Text>
                <Icon name="edit" size={20} color="#667eea" />
              </TouchableOpacity>
              <Text style={styles.settingDescription}>
                Your starting point for calculating travel time to events
              </Text>
            </View>
          )}
        </View>

        {/* Emergency PIN Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔑 Emergency PIN</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Emergency PIN:</Text>
            <TouchableOpacity
              style={styles.pinButton}
              onPress={() => setShowPinModal(true)}
            >
              <Text style={styles.pinButtonText}>
                {emergencyPin ? '••••' : 'Set PIN'}
              </Text>
              <Icon name="edit" size={20} color="#667eea" />
            </TouchableOpacity>
            <Text style={styles.settingDescription}>
              4-digit PIN to unlock your phone in emergency situations.
            </Text>
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❓ Help & Information</Text>
          
          <TouchableOpacity 
            style={styles.helpItem}
            onPress={() => navigation.navigate('HelpScreen')}
          >
            <Icon name="help-outline" size={24} color="#667eea" />
            <View style={styles.helpItemContent}>
              <Text style={styles.helpItemTitle}>Points & Badges Guide</Text>
              <Text style={styles.helpItemDescription}>
                Learn how to earn points and unlock badges
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.helpItem}
            onPress={() => Alert.alert('App Info', 'OnTimeHero v1.0\nBuilt with React Native & Firebase')}
          >
            <Icon name="info-outline" size={24} color="#667eea" />
            <View style={styles.helpItemContent}>
              <Text style={styles.helpItemTitle}>About OnTimeHero</Text>
              <Text style={styles.helpItemDescription}>
                App version and information
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Emergency PIN Modal */}
      <Modal
        visible={showPinModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Emergency PIN</Text>
            <Text style={styles.modalDescription}>
              Enter a 4-digit PIN for emergency phone unlock:
            </Text>
            
            <TextInput
              style={[styles.pinInput, { color: '#333' }]}
              value={newPin}
              onChangeText={setNewPin}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              placeholder="Enter PIN"
              placeholderTextColor="#999"
            />
            
            <TextInput
              style={[styles.pinInput, { color: '#333' }]}
              value={confirmPin}
              onChangeText={setConfirmPin}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              placeholder="Confirm PIN"
              placeholderTextColor="#999"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPinModal(false);
                  setNewPin('');
                  setConfirmPin('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSavePin}
              >
                <Text style={styles.saveButtonText}>Save</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Home Address</Text>
            <Text style={styles.modalDescription}>
              Enter your home address for travel time calculations:
            </Text>
            
            <View>
              <TouchableOpacity
                style={styles.currentLocationButton}
                onPress={getCurrentLocation}
              >
                <Icon name="my-location" size={20} color="#667eea" />
                <Text style={styles.currentLocationButtonText}>Use Current Location</Text>
              </TouchableOpacity>
              
              <TextInput
                style={[styles.pinInput, { minHeight: 60, color: '#333' }]}
                value={newHomeAddress}
                onChangeText={handleHomeAddressChange}
                placeholder="123 Main St, City, State ZIP"
                placeholderTextColor="#999"
                multiline
              />
              {showHomeAddressPredictions && homeAddressPredictions.length > 0 && (
                <View style={styles.predictionsContainer}>
                  {homeAddressPredictions.map((prediction, index) => (
                    <TouchableOpacity
                      key={prediction.placeId}
                      style={styles.predictionItem}
                      onPress={() => handleSelectHomeAddress(prediction)}
                    >
                      <Icon name="location-on" size={20} color="#667eea" />
                      <View style={styles.predictionTextContainer}>
                        <Text style={styles.predictionMainText}>
                          {prediction.mainText}
                        </Text>
                        <Text style={styles.predictionSecondaryText}>
                          {prediction.secondaryText}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowHomeAddressModal(false);
                  setNewHomeAddress('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveHomeAddress}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    lineHeight: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 15,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  selectedOption: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#fff',
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  helpItemContent: {
    flex: 1,
    marginLeft: 15,
  },
  helpItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  helpItemDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  // PIN Modal Styles
  pinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pinButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  pinInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#667eea',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Autocomplete styles for home address
  predictionsContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginTop: 5,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  predictionTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  predictionMainText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  predictionSecondaryText: {
    color: '#666',
    fontSize: 14,
    marginTop: 2,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#667eea',
  },
  currentLocationButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default SettingsScreen;

