import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../../services/NotificationService';
import GoogleMapsService from '../../services/GoogleMapsService';

const EditEventScreen = ({ navigation, route }) => {
  const { event } = route.params;
  const [title, setTitle] = useState(event.title || '');
  const [description, setDescription] = useState(event.description || '');
  const [location, setLocation] = useState(event.location || '');
  const [date, setDate] = useState(moment(event.startTime.toDate ? event.startTime.toDate() : event.startTime).format('YYYY-MM-DD'));
  const [time, setTime] = useState(moment(event.startTime.toDate ? event.startTime.toDate() : event.startTime).format('HH:mm'));
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [locationPredictions, setLocationPredictions] = useState([]);
  const [showLocationPredictions, setShowLocationPredictions] = useState(false);
  const [calculatedTravelTime, setCalculatedTravelTime] = useState(event.travelTime || 15);

  const handleUpdateEvent = async () => {
    if (!title || !date || !time) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'User not authenticated');
        setLoading(false);
        return;
      }

      // Parse time
      let parsedTime;
      try {
        const timeFormats = ['HH:mm', 'h:mm A', 'h:mm a', 'HH:mm:ss', 'h:mm:ss A', 'h:mm:ss a'];
        parsedTime = moment(time, timeFormats, true);

        if (!parsedTime.isValid()) {
          parsedTime = moment(time);
        }

        if (!parsedTime.isValid()) {
          Alert.alert('Invalid Time', 'Please enter time in format like "2:30 PM" or "14:30"');
          setLoading(false);
          return;
        }
      } catch (error) {
        Alert.alert('Invalid Time', 'Please enter time in format like "2:30 PM" or "14:30"');
        setLoading(false);
        return;
      }

      const eventDateTime = moment(`${date} ${parsedTime.format('HH:mm')}`, 'YYYY-MM-DD HH:mm').toDate();

      // Calculate travel time if not already calculated and location is provided
      let travelTime = calculatedTravelTime;
      if (!travelTime && location && location.trim() !== '') {
        console.log('📍 Calculating travel time for manually entered location:', location);
        try {
          const travelInfo = await GoogleMapsService.calculateTravelTimeFromHome(
            location,
            eventDateTime
          );

          if (travelInfo && !travelInfo.error) {
            travelTime = travelInfo.duration;
            console.log('✅ Travel time calculated:', travelTime, 'minutes');
          } else {
            console.log('⚠️ Could not calculate travel time:', travelInfo.error);
            travelTime = 15; // Default
          }
        } catch (error) {
          console.error('❌ Error calculating travel time:', error);
          travelTime = 15; // Default
        }
      }

      // Use calculated travel time or default to 15 minutes
      travelTime = travelTime || 15;

      // Update event data
      const updatedEventData = {
        title,
        description,
        location,
        startTime: eventDateTime,
        endTime: moment(eventDateTime).add(1, 'hour').toDate(),
        travelTime: travelTime,
        updatedAt: new Date(),
      };

      // Cancel old notifications
      NotificationService.cancelEventNotifications(event.id);

      console.log('📝 Updating event:', event.id);
      console.log('📝 Event has googleEventId:', event.googleEventId);
      console.log('📝 Event isLocal:', event.isLocal);

      // Update in Google Calendar FIRST if synced
      if (event.googleEventId) {
        console.log('📝 Updating Google Calendar event:', event.googleEventId);
        const googleUpdateSuccess = await updateGoogleCalendarEvent(event.googleEventId, updatedEventData);
        if (!googleUpdateSuccess) {
          console.error('❌ Google Calendar update failed');
          Alert.alert(
            'Update Failed',
            'Failed to update event in Google Calendar. This event is synced with Google Calendar and must be updated there first. Please check your internet connection and try again.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          return; // Don't proceed with local update
        }
        console.log('✅ Google Calendar updated successfully, proceeding with local update');
      }

      // Add lastModified timestamp to prevent sync conflicts
      const lastModified = new Date();

      if (event.isLocal) {
        // Update local event
        const existingEvents = await AsyncStorage.getItem('localEvents');
        if (existingEvents) {
          const events = JSON.parse(existingEvents);
          console.log('📝 Updating local event in AsyncStorage');
          const updatedEvents = events.map(e =>
            e.id === event.id
              ? {
                  ...e,
                  ...updatedEventData,
                  startTime: eventDateTime.toISOString(),
                  endTime: moment(eventDateTime).add(1, 'hour').toISOString(),
                  lastModified: lastModified.toISOString(),
                }
              : e
          );
          await AsyncStorage.setItem('localEvents', JSON.stringify(updatedEvents));
          console.log('✅ Local event updated successfully');
        }
      } else {
        // Update Firestore event
        console.log('📝 Updating Firestore event');
        await firestore().collection('events').doc(event.id).update({
          ...updatedEventData,
          startTime: firestore.Timestamp.fromDate(eventDateTime),
          endTime: firestore.Timestamp.fromDate(moment(eventDateTime).add(1, 'hour').toDate()),
          updatedAt: firestore.Timestamp.now(),
          lastModified: firestore.Timestamp.fromDate(lastModified),
        });
        console.log('✅ Firestore event updated successfully');
      }

      // Schedule new notifications
      const updatedEvent = { ...event, ...updatedEventData, startTime: { toDate: () => eventDateTime } };
      await NotificationService.scheduleEventNotifications(updatedEvent);

      Alert.alert('Success', 'Event updated successfully!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          }
        }
      ]);

    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Error', 'Failed to update event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateGoogleCalendarEvent = async (googleEventId, eventData) => {
    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');

      const isSignedIn = await GoogleSignin.isSignedIn();
      if (!isSignedIn) {
        console.log('⚠️ User not signed in to Google, skipping Calendar update');
        return false;
      }

      const calendarService = require('../../services/GoogleCalendarService').default;
      const tokens = await calendarService.getTokensSafely();
      const accessToken = tokens.accessToken;

      if (!accessToken) {
        console.log('⚠️ No access token available, skipping Calendar update');
        return false;
      }

      const googleEvent = {
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      console.log('📝 Sending PUT request to Google Calendar API');
      console.log('📝 Event ID:', googleEventId);
      console.log('📝 Event data:', JSON.stringify(googleEvent, null, 2));

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEvent),
        }
      );

      if (response.ok) {
        const updatedEvent = await response.json();
        console.log('✅ Event updated in Google Calendar successfully');
        console.log('✅ Updated event:', updatedEvent.summary, 'at', updatedEvent.start.dateTime);
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to update in Google Calendar:', response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ Error updating Google Calendar event:', error);
      return false;
    }
  };

  const handleLocationChange = async (text) => {
    setLocation(text);

    if (text.length > 2) {
      const predictions = await GoogleMapsService.getPlacePredictions(text);
      setLocationPredictions(predictions);
      setShowLocationPredictions(predictions.length > 0);
    } else {
      setLocationPredictions([]);
      setShowLocationPredictions(false);
    }
  };

  const handleSelectLocation = async (prediction) => {
    setLocation(prediction.description);
    setShowLocationPredictions(false);

    const eventDateTime = moment(`${date} ${time}`, 'YYYY-MM-DD HH:mm').toDate();
    const travelInfo = await GoogleMapsService.calculateTravelTimeFromHome(
      prediction.description,
      eventDateTime
    );

    if (travelInfo && !travelInfo.error) {
      setCalculatedTravelTime(travelInfo.duration);
      Alert.alert(
        'Travel Time Updated',
        `Estimated travel time: ${travelInfo.duration} minutes (${travelInfo.distance} km)\n\nNotifications will be updated accordingly.`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Event</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter event title"
              placeholderTextColor="rgba(255,255,255,0.6)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter event description"
              placeholderTextColor="rgba(255,255,255,0.6)"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={handleLocationChange}
              placeholder="Enter event location"
              placeholderTextColor="rgba(255,255,255,0.6)"
            />
            {showLocationPredictions && locationPredictions.length > 0 && (
              <View style={styles.predictionsContainer}>
                {locationPredictions.map((prediction) => (
                  <TouchableOpacity
                    key={prediction.placeId}
                    style={styles.predictionItem}
                    onPress={() => handleSelectLocation(prediction)}
                  >
                    <Icon name="location-on" size={20} color="rgba(255,255,255,0.8)" />
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
            {calculatedTravelTime && (
              <View style={styles.travelTimeInfo}>
                <Icon name="directions-car" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.travelTimeText}>
                  Estimated travel time: {calculatedTravelTime} min
                </Text>
              </View>
            )}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity
                style={[styles.input, styles.clickableInput]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.inputText}>{date}</Text>
                <Icon name="calendar-today" size={20} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Time *</Text>
              <View style={styles.timeInputContainer}>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={time}
                  onChangeText={setTime}
                  placeholder="2:30 PM or 14:30"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  keyboardType="default"
                />
                <TouchableOpacity
                  style={styles.timePickerButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Icon name="access-time" size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={handleUpdateEvent}
            disabled={loading}
          >
            <LinearGradient
              colors={['#4facfe', '#00f2fe']}
              style={styles.buttonGradient}
            >
              <Icon name="save" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {loading ? 'Updating...' : 'Update Event'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <View style={styles.dateOptions}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map(days => {
                const optionDate = moment().add(days, 'days');
                const isSelected = moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === optionDate.format('YYYY-MM-DD');
                return (
                  <TouchableOpacity
                    key={days}
                    style={[styles.dateOption, isSelected && styles.selectedDateOption]}
                    onPress={() => {
                      setDate(optionDate.format('YYYY-MM-DD'));
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={[styles.dateOptionText, isSelected && styles.selectedDateOptionText]}>
                      {optionDate.format('MMM D')}
                    </Text>
                    <Text style={[styles.dateOptionSubText, isSelected && styles.selectedDateOptionText]}>
                      {optionDate.format('dddd')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Time</Text>
            <ScrollView style={styles.timeOptionsScrollView}>
              <View style={styles.timeOptions}>
                {Array.from({ length: 96 }, (_, index) => {
                  const hour = Math.floor(index / 4);
                  const minute = (index % 4) * 15;
                  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                  const isSelected = time === timeString;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.timeOption, isSelected && styles.selectedTimeOption]}
                      onPress={() => {
                        setTime(timeString);
                        setShowTimePicker(false);
                      }}
                    >
                      <Text style={[styles.timeOptionText, isSelected && styles.selectedTimeOptionText]}>
                        {moment(timeString, 'HH:mm').format('h:mm A')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  form: {
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 16,
  },
  inputText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  clickableInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    flex: 1,
    marginRight: 10,
  },
  timePickerButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  predictionsContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    marginTop: 10,
    maxHeight: 200,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  predictionTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  predictionMainText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  predictionSecondaryText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 2,
  },
  travelTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  travelTimeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  saveButton: {
    marginTop: 30,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  dateOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateOption: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 15,
    width: '48%',
    marginBottom: 10,
    alignItems: 'center',
  },
  selectedDateOption: {
    backgroundColor: '#667eea',
  },
  dateOptionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedDateOptionText: {
    color: '#fff',
  },
  dateOptionSubText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  timeOptionsScrollView: {
    maxHeight: 400,
    marginBottom: 20,
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  timeOption: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    width: '23%',
    marginBottom: 8,
    alignItems: 'center',
  },
  selectedTimeOption: {
    backgroundColor: '#667eea',
  },
  timeOptionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedTimeOptionText: {
    color: '#fff',
  },
  modalCloseButton: {
    backgroundColor: '#667eea',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditEventScreen;
