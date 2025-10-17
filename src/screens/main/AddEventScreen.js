import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
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
// import DatePicker from 'react-native-date-picker'; // Temporarily disabled due to linking issues

const AddEventScreen = ({ navigation, route }) => {
  const prefill = route?.params?.prefill || {};
  const [title, setTitle] = useState(prefill.title || '');
  const [description, setDescription] = useState(prefill.description || '');
  const [location, setLocation] = useState(prefill.location || '');
  const [fromUseCurrent, setFromUseCurrent] = useState(prefill.origin ? false : true);
  const [fromText, setFromText] = useState(prefill.origin || '');
  const [fromPredictions, setFromPredictions] = useState([]);
  const [showFromPredictions, setShowFromPredictions] = useState(false);
  const [date, setDate] = useState(prefill.date || moment().format('YYYY-MM-DD'));
  const [time, setTime] = useState(prefill.time || moment().format('HH:mm'));
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState(parseInt(moment().format('HH'), 10));
  const [selectedMinute, setSelectedMinute] = useState(parseInt(moment().format('mm'), 10));
  const hourListRef = useRef(null);
  const minuteListRef = useRef(null);
  const [locationPredictions, setLocationPredictions] = useState([]);
  const [showLocationPredictions, setShowLocationPredictions] = useState(false);
  const [calculatedTravelTime, setCalculatedTravelTime] = useState(null);

  const handleSaveEvent = async () => {
    console.log('🚀 Starting event save process...');
    console.log('📋 Form data:', { title, date, time, location, description });
    
    if (!title || !date || !time) {
      console.log('❌ Missing required fields');
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    console.log('✅ Required fields present, setting loading...');
    setLoading(true);

    try {
      const currentUser = auth().currentUser;
      console.log('👤 Current user:', currentUser ? 'authenticated' : 'not authenticated');
      if (!currentUser) {
        console.log('❌ User not authenticated');
        Alert.alert('Error', 'User not authenticated');
        setLoading(false);
        return;
      }

      // Parse time in various formats (HH:mm, h:mm A, h:mm a, etc.)
      let parsedTime;
      try {
        // Try different time formats
        const timeFormats = ['HH:mm', 'h:mm A', 'h:mm a', 'HH:mm:ss', 'h:mm:ss A', 'h:mm:ss a'];
        parsedTime = moment(time, timeFormats, true);

        if (!parsedTime.isValid()) {
          // If none of the formats work, try parsing as-is
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

      // Create event datetime in local timezone
      const eventDateTime = moment(`${date} ${parsedTime.format('HH:mm')}`, 'YYYY-MM-DD HH:mm').toDate();

      // Determine origin for travel calculation
      let originForCalc = null;
      if (fromUseCurrent) {
        // null -> service uses current location
        originForCalc = null;
      } else if (fromText && fromText.trim() !== '') {
        originForCalc = fromText.trim();
      }

      // Calculate travel time if not already calculated and location is provided
      let travelTime = calculatedTravelTime;
      try {
        if (!travelTime && location && location.trim() !== '') {
          // Skip travel time calculation for very short or generic locations
          if (location.trim().length < 3) {
            console.log('⚠️ Location too short for travel calculation, using default');
            travelTime = 15;
          } else {
            console.log('📍 Calculating travel time for location:', location);
            try {
              let travelInfo;
              if (originForCalc) {
                travelInfo = await GoogleMapsService.calculateTravelTime(
                  originForCalc,
                  location,
                  eventDateTime
                );
              } else {
                travelInfo = await GoogleMapsService.calculateTravelTimeFromCurrentLocation(
                  location,
                  eventDateTime
                );
              }

              if (travelInfo && !travelInfo.error) {
                travelTime = travelInfo.duration;
                console.log('✅ Travel time calculated:', travelTime, 'minutes');
              } else {
                console.log('⚠️ Could not calculate travel time:', travelInfo?.error || 'Unknown error');
                travelTime = 15; // Default
              }
            } catch (error) {
              console.warn('⚠️ Error calculating travel time:', error.message || error);
              travelTime = 15; // Default
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Error in travel time calculation section:', error.message || error);
        travelTime = 15; // Default
      }

      // Use calculated travel time or default to 15 minutes
      travelTime = travelTime || 15;
      
      console.log('📝 Creating event with data:', {
        title,
        date,
        time,
        location,
        travelTime
      });
      
      // Always save locally first for immediate feedback
      const localEventData = {
        id: Date.now().toString(), // Simple ID for local events
        userId: currentUser.uid,
        title,
        description,
        location,
        origin: fromUseCurrent ? 'CURRENT_LOCATION' : fromText,
        startTime: eventDateTime.toISOString(),
        endTime: moment(eventDateTime).add(1, 'hour').toISOString(),
        travelTime: travelTime,
        status: 'upcoming',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        isLocal: true,
      };
      
      // Save to local storage
      console.log('💾 Saving to local storage...');
      const existingEvents = await AsyncStorage.getItem('localEvents');
      const events = existingEvents ? JSON.parse(existingEvents) : [];
      console.log('📊 Existing events count:', events.length);
      
      // Remove existing duplicates first
      const uniqueEvents = events.filter(existingEvent => {
        const sameTitle = existingEvent.title === localEventData.title;
        const sameTime = existingEvent.startTime === localEventData.startTime;
        const sameLocation = existingEvent.location === localEventData.location;
        return !(sameTitle && sameTime && sameLocation);
      });
      
      console.log('🧹 Removed', events.length - uniqueEvents.length, 'duplicate events');
      
      // Check if this exact event already exists
      const isDuplicate = uniqueEvents.some(existingEvent => {
        const sameTitle = existingEvent.title === localEventData.title;
        const sameTime = existingEvent.startTime === localEventData.startTime;
        const sameLocation = existingEvent.location === localEventData.location;
        return sameTitle && sameTime && sameLocation;
      });
      
      if (isDuplicate) {
        console.log('⚠️ Duplicate event detected, not saving');
        Alert.alert('Duplicate Event', 'This event already exists. Please check your calendar.');
        setLoading(false);
        return;
      }
      
      // Use the cleaned events array
      const eventsToSave = [...uniqueEvents, localEventData];
      
      await AsyncStorage.setItem('localEvents', JSON.stringify(eventsToSave));
      console.log('✅ Event saved to local storage successfully');
      
      // Schedule notifications for the event
      await NotificationService.scheduleEventNotifications(localEventData);
      console.log('✅ Notifications scheduled for event');
      
      console.log('✅ Event saved successfully to local storage');
      
      // Verify the event was actually saved
      const verifyEvents = await AsyncStorage.getItem('localEvents');
      const verifyParsed = verifyEvents ? JSON.parse(verifyEvents) : [];
      console.log('🔍 Verification: Total events in storage:', verifyParsed.length);
      console.log('🔍 Verification: Last event saved:', verifyParsed[verifyParsed.length - 1]);
      
      // Show success immediately
      console.log('🎉 Showing success alert...');
      Alert.alert('Success', 'Event created successfully!', [
        { 
          text: 'OK', 
          onPress: () => {
            // Navigate back and trigger refresh
            navigation.goBack();
            // Force refresh of calendar/dashboard by navigating to them briefly
            setTimeout(() => {
              navigation.navigate('Calendar');
              setTimeout(() => navigation.navigate('MainTabs'), 100);
            }, 100);
          }
        }
      ]);
      
      // Try to sync to Firestore in background (don't wait for it)
      syncToFirestore(localEventData).catch(err => {
        console.log('Background sync failed, will retry later:', err);
      });
      
    } catch (error) {
      console.error('❌ Error creating event:', error);
      console.error('❌ Error stack:', error.stack);
      Alert.alert('Error', `Failed to save event: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const syncToFirestore = async (eventData) => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      // Check if event already exists in Firestore to avoid duplicates
      const eventTime = moment(eventData.startTime).format('YYYY-MM-DD HH:mm');
      const duplicateCheck = await firestore()
        .collection('events')
        .where('userId', '==', currentUser.uid)
        .where('title', '==', eventData.title)
        .where('startTime', '==', firestore.Timestamp.fromDate(new Date(eventData.startTime)))
        .get();

      if (!duplicateCheck.empty) {
        console.log('✅ Event already exists in Firestore, skipping sync');
        // Remove from local storage since it's already in Firestore
        const localEvents = await AsyncStorage.getItem('localEvents');
        if (localEvents) {
          const events = JSON.parse(localEvents);
          const filteredEvents = events.filter(e => e.id !== eventData.id);
          await AsyncStorage.setItem('localEvents', JSON.stringify(filteredEvents));
        }
        return;
      }

      const firestoreEventData = {
        userId: currentUser.uid,
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        origin: eventData.origin || null,
        startTime: firestore.Timestamp.fromDate(new Date(eventData.startTime)),
        endTime: firestore.Timestamp.fromDate(new Date(eventData.endTime)),
        travelTime: eventData.travelTime,
        status: eventData.status,
        createdAt: firestore.Timestamp.now(),
        lastSynced: firestore.Timestamp.now(),
        lastModified: firestore.Timestamp.fromDate(new Date(eventData.lastModified || eventData.createdAt)),
      };

      const docRef = await firestore().collection('events').add(firestoreEventData);
      console.log('✅ Event synced to Firestore successfully, ID:', docRef.id);

      // Also try to create in Google Calendar (don't wait for it)
      createGoogleCalendarEvent(eventData).catch(err => {
        console.log('Google Calendar sync failed, will retry later:', err);
      });

      // Remove from local storage after successful sync
      const existingLocalEvents = await AsyncStorage.getItem('localEvents');
      if (existingLocalEvents) {
        const events = JSON.parse(existingLocalEvents);
        const filteredEvents = events.filter(e => e.id !== eventData.id);
        await AsyncStorage.setItem('localEvents', JSON.stringify(filteredEvents));
        console.log('✅ Removed event from local storage after Firestore sync');
      }

    } catch (error) {
      console.log('❌ Firestore sync failed:', error);
      // Keep in local storage for retry later
    }
  };

  const createGoogleCalendarEvent = async (eventData) => {
    try {
      console.log('Starting Google Calendar event creation...');
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      
      // Check if user is signed in to Google
      let isSignedIn = await GoogleSignin.isSignedIn();
      console.log('Google Sign-In status:', isSignedIn);
      
      if (!isSignedIn) {
        console.log('User not signed in to Google, attempting to sign in...');
        try {
          await GoogleSignin.hasPlayServices();
          const { idToken } = await GoogleSignin.signIn();
          const googleCredential = auth.GoogleAuthProvider.credential(idToken);
          await auth().signInWithCredential(googleCredential);
          isSignedIn = true;
          console.log('Successfully signed in to Google');
        } catch (signInError) {
          console.log('Failed to sign in to Google:', signInError);
          return;
        }
      }

      // Get access token safely
      const calendarService = require('../../services/GoogleCalendarService').default;
      const tokens = await calendarService.getTokensSafely();
      const accessToken = tokens.accessToken;
      console.log('Google access token available:', !!accessToken);

      if (!accessToken) {
        console.log('No Google access token available');
        return;
      }

      // Create event in Google Calendar
      const startDateTime = new Date(eventData.startTime);
      const endDateTime = new Date(eventData.endTime);

      const googleEvent = {
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Use device timezone
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 },
            { method: 'popup', minutes: 10 },
          ],
        },
      };

      console.log('Sending request to Google Calendar API...');
      console.log('Event data:', JSON.stringify(googleEvent, null, 2));
      
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEvent),
        }
      );

      console.log('Google Calendar API response status:', response.status);
      
      if (response.ok) {
        const createdEvent = await response.json();
        console.log('✅ Event created in Google Calendar:', createdEvent.id);
        console.log('✅ Event summary:', createdEvent.summary);
        
        // Update local event with Google Calendar ID
        const existingEvents = await AsyncStorage.getItem('localEvents');
        if (existingEvents) {
          const events = JSON.parse(existingEvents);
          const updatedEvents = events.map(e => 
            e.id === eventData.id 
              ? { ...e, googleEventId: createdEvent.id, syncedToGoogle: true }
              : e
          );
          await AsyncStorage.setItem('localEvents', JSON.stringify(updatedEvents));
          console.log('✅ Local event updated with Google Calendar ID');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to create Google Calendar event:', response.status, errorText);
      }

    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
    }
  };

  const handleDatePress = () => {
    setSelectedDate(moment(date, 'YYYY-MM-DD').toDate());
    setShowDatePicker(true);
  };

  const handleTimePress = () => {
    const m = moment(time, 'HH:mm');
    const h = parseInt(m.format('HH'), 10);
    const mm = parseInt(m.format('mm'), 10);
    setSelectedHour(isNaN(h) ? parseInt(moment().format('HH'), 10) : h);
    setSelectedMinute(isNaN(mm) ? parseInt(moment().format('mm'), 10) : mm);
    setSelectedTime(m.toDate());
    setShowTimePicker(true);
    setTimeout(() => {
      if (hourListRef.current) {
        hourListRef.current.scrollTo({ y: (isNaN(h) ? 0 : h) * 40, animated: false });
      }
      if (minuteListRef.current) {
        minuteListRef.current.scrollTo({ y: (isNaN(mm) ? 0 : mm) * 40, animated: false });
      }
    }, 0);
  };

  const handleLocationChange = async (text) => {
    setLocation(text);
    
    if (text.length > 2) {
      // Get autocomplete predictions
      const predictions = await GoogleMapsService.getPlacePredictions(text);
      setLocationPredictions(predictions);
      setShowLocationPredictions(predictions.length > 0);
    } else {
      setLocationPredictions([]);
      setShowLocationPredictions(false);
    }
  };

  const handleFromChange = async (text) => {
    setFromText(text);
    if (text.length > 2) {
      const predictions = await GoogleMapsService.getPlacePredictions(text);
      setFromPredictions(predictions);
      setShowFromPredictions(predictions.length > 0);
    } else {
      setFromPredictions([]);
      setShowFromPredictions(false);
    }
  };

  const handleSelectFrom = async (prediction) => {
    setFromText(prediction.description);
    setShowFromPredictions(false);
  };

  const handleSelectLocation = async (prediction) => {
    setLocation(prediction.description);
    setShowLocationPredictions(false);
    
    // Calculate travel time from home to this location
    const eventDateTime = moment(`${date} ${time}`, 'YYYY-MM-DD HH:mm').toDate();
    const travelInfo = await GoogleMapsService.calculateTravelTimeFromHome(
      prediction.description,
      eventDateTime
    );
    
    if (travelInfo && !travelInfo.error) {
      setCalculatedTravelTime(travelInfo.duration);
      Alert.alert(
        'Travel Time Calculated',
        `Estimated travel time: ${travelInfo.duration} minutes (${travelInfo.distance} km)\n\nThis will be used for your notifications.`,
        [{ text: 'OK' }]
      );
    } else {
      setCalculatedTravelTime(15); // Default fallback
    }
  };

  // Date and time confirmation functions are now handled inline in the modal components

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
        <Text style={styles.headerTitle}>Add Event</Text>
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

          {/* Route Builder */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>From</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <TouchableOpacity onPress={() => setFromUseCurrent(true)} style={[styles.toggleChip, fromUseCurrent && styles.toggleChipActive]}>
                <Icon name="my-location" size={16} color="#fff" />
                <Text style={styles.toggleChipText}>Current location</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFromUseCurrent(false)} style={[styles.toggleChip, !fromUseCurrent && styles.toggleChipActive]}>
                <Icon name="edit-location" size={16} color="#fff" />
                <Text style={styles.toggleChipText}>Choose address</Text>
              </TouchableOpacity>
            </View>
            {!fromUseCurrent && (
              <>
                <TextInput
                  style={styles.input}
                  value={fromText}
                  onChangeText={handleFromChange}
                  placeholder="Search origin address"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                />
                {showFromPredictions && fromPredictions.length > 0 && (
                  <View style={styles.predictionsContainer}>
                    {fromPredictions.map(prediction => (
                      <TouchableOpacity key={prediction.placeId} style={styles.predictionItem} onPress={() => handleSelectFrom(prediction)}>
                        <Icon name="location-on" size={20} color="rgba(255,255,255,0.8)" />
                        <View style={styles.predictionTextContainer}>
                          <Text style={styles.predictionMainText}>{prediction.mainText}</Text>
                          <Text style={styles.predictionSecondaryText}>{prediction.secondaryText}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>

               <View style={styles.inputGroup}>
                 <Text style={styles.label}>To</Text>
                 <TextInput
                   style={styles.input}
                   value={location}
                   onChangeText={handleLocationChange}
                   placeholder="Enter destination"
                   placeholderTextColor="rgba(255,255,255,0.6)"
                 />
                 {showLocationPredictions && locationPredictions.length > 0 && (
                   <View style={styles.predictionsContainer}>
                     {locationPredictions.map((prediction, index) => (
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
              <TouchableOpacity style={[styles.input, styles.clickableInput]} onPress={handleDatePress}>
                <Text style={styles.inputText}>{date || moment().format('YYYY-MM-DD')}</Text>
                <Icon name="calendar-today" size={20} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

                 <View style={[styles.inputGroup, styles.halfWidth]}>
                   <Text style={styles.label}>Time *</Text>
                   <View style={styles.timeInputContainer}>
                     <TouchableOpacity style={[styles.input, styles.clickableInput]} onPress={handleTimePress}>
                       <Text style={styles.inputText}>{moment(time, 'HH:mm').format('h:mm A')}</Text>
                       <Icon name="access-time" size={20} color="rgba(255,255,255,0.6)" />
                     </TouchableOpacity>
                   </View>
                 </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={handleSaveEvent}
            disabled={loading}
          >
            <LinearGradient
              colors={['#4facfe', '#00f2fe']}
              style={styles.buttonGradient}
            >
              <Icon name="save" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {loading ? 'Saving...' : 'Save Event'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Custom Date Picker Modal */}
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

      {/* Custom Time Picker Modal (Wheel style) */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Time</Text>
            <View style={styles.wheelContainer}>
              <View style={styles.wheelColumn}>
                <ScrollView
                  ref={hourListRef}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={40}
                  decelerationRate="fast"
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.y / 40);
                    const clamped = Math.max(0, Math.min(23, idx));
                    setSelectedHour(clamped);
                  }}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <View key={`h-${h}`} style={styles.wheelItem}>
                      <Text style={[styles.wheelItemText, h === selectedHour && styles.wheelItemTextActive]}>{h.toString().padStart(2, '0')}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
              <Text style={styles.wheelSeparator}>:</Text>
              <View style={styles.wheelColumn}>
                <ScrollView
                  ref={minuteListRef}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={40}
                  decelerationRate="fast"
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.y / 40);
                    const clamped = Math.max(0, Math.min(59, idx));
                    setSelectedMinute(clamped);
                  }}
                >
                  {Array.from({ length: 60 }, (_, mIdx) => (
                    <View key={`m-${mIdx}`} style={styles.wheelItem}>
                      <Text style={[styles.wheelItemText, mIdx === selectedMinute && styles.wheelItemTextActive]}>{mIdx.toString().padStart(2, '0')}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: '#f0f0f0' }]}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={[styles.modalCloseButtonText, { color: '#333' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  const hh = selectedHour.toString().padStart(2, '0');
                  const mm = selectedMinute.toString().padStart(2, '0');
                  setTime(`${hh}:${mm}`);
                  setShowTimePicker(false);
                }}
              >
                <Text style={styles.modalCloseButtonText}>Set Time</Text>
              </TouchableOpacity>
            </View>
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
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)'
  },
  toggleChipActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderColor: '#fff'
  },
  toggleChipText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600'
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
  timeFormatHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 5,
    fontStyle: 'italic',
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
  // Modal styles
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
  wheelContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  wheelColumn: {
    height: 200,
    width: 80,
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    overflow: 'hidden',
    marginHorizontal: 6,
  },
  wheelItem: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontSize: 18,
    color: '#666',
  },
  wheelItemTextActive: {
    color: '#333',
    fontWeight: 'bold',
  },
  wheelSeparator: {
    fontSize: 24,
    color: '#333',
    marginHorizontal: 4,
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

export default AddEventScreen;
