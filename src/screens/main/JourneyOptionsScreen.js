import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
  TextInput,
} from 'react-native';
import { DeviceEventEmitter } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import GoogleMapsService from '../../services/GoogleMapsService';
import LocationService from '../../services/LocationService';
import moment from 'moment';

const JourneyOptionsScreen = ({ route, navigation }) => {
  const { event } = route.params;
  const [directions, setDirections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState(null);
  const [currentAddress, setCurrentAddress] = useState('Your Location');
  const [fromUseCurrent, setFromUseCurrent] = useState(!event.origin || event.origin === 'CURRENT_LOCATION');
  const [fromText, setFromText] = useState(event.origin && event.origin !== 'CURRENT_LOCATION' ? event.origin : '');
  const [toText, setToText] = useState(event.location || '');
  const [fromPredictions, setFromPredictions] = useState([]);
  const [toPredictions, setToPredictions] = useState([]);

  // Handler to swap From and To destinations
  const handleSwapDestinations = () => {
    // Save current values
    const tempFromText = fromText;
    const tempFromUseCurrent = fromUseCurrent;
    const tempToText = toText;

    // Swap the values
    if (fromUseCurrent) {
      // If "From" was using current location, swap it to "To" (which doesn't support current location)
      // So we need to use the current address text instead
      setToText(currentAddress || 'Your Location');
      setFromText(tempToText);
      setFromUseCurrent(false); // "From" is now custom with the old "To" value
    } else {
      // Both are custom addresses, simple swap
      setToText(tempFromText);
      setFromText(tempToText);
      // Keep fromUseCurrent as false since we're swapping custom addresses
    }

    // Clear predictions
    setFromPredictions([]);
    setToPredictions([]);
  };

  // Debounce route loading to avoid input jumping
  useEffect(() => {
    const id = setTimeout(() => {
      loadDirections();
    }, 500);
    return () => clearTimeout(id);
  }, [fromUseCurrent, fromText, toText]);

  // Fetch current location and reverse geocode to address
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const hasPermission = await LocationService.requestLocationPermission();
        if (hasPermission) {
          const location = await LocationService.getCurrentLocation();

          if (location) {
            try {
              const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.latitude},${location.longitude}&key=AIzaSyCjpfpg6D4w8nnW10Xkoz8DoWGS-0b6v6Q`
              );
              const data = await response.json();
              if (data.results && data.results[0]) {
                const address = data.results[0].formatted_address;
                const parts = address.split(',');
                const shortAddress = parts[0] + (parts[1] ? ', ' + parts[1].trim() : '');
                setCurrentAddress(shortAddress.length > 35 ? shortAddress.substring(0, 35) + '...' : shortAddress);
              }
            } catch (geocodeError) {
              console.log('Could not reverse geocode:', geocodeError);
            }
          }
        }
      } catch (error) {
        console.log('Could not get current location:', error);
      }
    };

    fetchLocation();
  }, []);

  const loadDirections = async () => {
    try {
      setLoading(true);

      // First check location permissions
      const LocationService = require('../../services/LocationService').default;
      const hasPermission = await LocationService.requestLocationPermission();

      if (!hasPermission) {
        Alert.alert(
          'Location Permission Required',
          'This app needs your location to calculate travel times and show directions. Please grant location permission in your device settings.',
          [
            { text: 'Cancel', onPress: () => navigation.goBack() },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        setLoading(false);
        return;
      }

      const eventTime = event.startTime.toDate ? event.startTime.toDate() : event.startTime;
      const originOverride = fromUseCurrent ? null : fromText;
      const destination = toText || event.location;
      const directionsData = await GoogleMapsService.getDirectionsWithOptions(
        destination,
        eventTime,
        originOverride
      );

      if (directionsData) {
        setDirections(directionsData);
      } else {
        Alert.alert(
          'Unable to Get Directions',
          'Could not get your current location. Please make sure location services are enabled and try again.',
          [
            { text: 'Cancel', onPress: () => navigation.goBack() },
            { text: 'Retry', onPress: () => loadDirections() }
          ]
        );
      }
    } catch (error) {
      console.error('Error loading directions:', error);
      Alert.alert(
        'Error',
        'An error occurred while loading directions: ' + error.message,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'driving':
        return 'directions-car';
      case 'transit':
        return 'directions-transit';
      case 'bicycling':
        return 'directions-bike';
      case 'walking':
        return 'directions-walk';
      default:
        return 'directions';
    }
  };

  const getModeLabel = (mode) => {
    switch (mode) {
      case 'driving':
        return 'Drive';
      case 'transit':
        return 'Public Transit';
      case 'bicycling':
        return 'Bike';
      case 'walking':
        return 'Walk';
      default:
        return mode;
    }
  };

  const getModeColor = (mode) => {
    switch (mode) {
      case 'driving':
        return ['#4facfe', '#00f2fe'];
      case 'transit':
        return ['#43e97b', '#38f9d7'];
      case 'bicycling':
        return ['#fa709a', '#fee140'];
      case 'walking':
        return ['#a8edea', '#fed6e3'];
      default:
        return ['#667eea', '#764ba2'];
    }
  };

  const handleSelectMode = (mode, routeData) => {
    setSelectedMode(mode);
    // Open in Google Maps with the selected mode
    const originParam = fromUseCurrent ? 'My+Location' : encodeURIComponent(fromText);
    const destParam = encodeURIComponent(toText || event.location);
    const url = `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=${mode}`;
    Linking.openURL(url);

    // Also navigate to journey tracking screen
    setTimeout(() => {
      const updatedEvent = { ...event, origin: fromUseCurrent ? 'CURRENT_LOCATION' : fromText, location: toText || event.location };
      navigation.replace('JourneyTracking', { event: updatedEvent, mode, routeData });
    }, 1000);
  };

  const getArrivalTime = (duration) => {
    return moment().add(duration, 'minutes').format('h:mm A');
  };

  // Do not block the whole screen; show inline loader later

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Your Route</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event.title}</Text>

          {/* Edit From/To */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: 'bold', color: '#333', marginBottom: 6 }}>From</Text>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <TouchableOpacity onPress={() => setFromUseCurrent(true)} style={{ backgroundColor: fromUseCurrent ? '#667eea' : '#ddd', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 8 }}>
                <Text style={{ color: fromUseCurrent ? '#fff' : '#333' }}>Current</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFromUseCurrent(false)} style={{ backgroundColor: !fromUseCurrent ? '#667eea' : '#ddd', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ color: !fromUseCurrent ? '#fff' : '#333' }}>Custom</Text>
              </TouchableOpacity>
            </View>
            {!fromUseCurrent && (
              <>
                <TextInput style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, color: '#000' }} value={fromText} onChangeText={async (t)=>{setFromText(t); if(t.length>2){setFromPredictions(await GoogleMapsService.getPlacePredictions(t));} else {setFromPredictions([]);} }} placeholder="Origin address" placeholderTextColor="#999" />
                {fromPredictions.length>0 && (
                  <View style={{ backgroundColor: '#fff', borderRadius: 8, marginTop: 6 }}>
                    {fromPredictions.map(p => (
                      <TouchableOpacity key={p.placeId} style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }} onPress={()=>{setFromText(p.description); setFromPredictions([]);}}>
                        <Text style={{ fontWeight: '600' }}>{p.mainText}</Text>
                        <Text style={{ color: '#666' }}>{p.secondaryText}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            <Text style={{ fontWeight: 'bold', color: '#333', marginVertical: 6 }}>To</Text>
            <TextInput style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, color: '#000' }} value={toText} onChangeText={async (t)=>{setToText(t); if(t.length>2){setToPredictions(await GoogleMapsService.getPlacePredictions(t));} else {setToPredictions([]);} }} placeholder="Destination" placeholderTextColor="#999" />
            {toPredictions.length>0 && (
              <View style={{ backgroundColor: '#fff', borderRadius: 8, marginTop: 6 }}>
                {toPredictions.map(p => (
                  <TouchableOpacity key={p.placeId} style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }} onPress={()=>{setToText(p.description); setToPredictions([]);}}>
                    <Text style={{ fontWeight: '600' }}>{p.mainText}</Text>
                    <Text style={{ color: '#666' }}>{p.secondaryText}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Swap Button */}
            <TouchableOpacity 
              style={{ 
                backgroundColor: '#f8f9fa', 
                borderWidth: 2,
                borderColor: '#667eea',
                padding: 12, 
                alignItems: 'center', 
                borderRadius: 8, 
                marginTop: 10,
                flexDirection: 'row',
                justifyContent: 'center'
              }} 
              onPress={handleSwapDestinations}
            >
              <Icon name="swap-vert" size={24} color="#667eea" />
              <Text style={{ color: '#667eea', fontWeight: 'bold', marginLeft: 8 }}>Swap Destinations</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ backgroundColor: '#667eea', padding: 10, alignItems: 'center', borderRadius: 8, marginTop: 10 }} onPress={async ()=>{
              try{
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                const updated = { ...event, origin: fromUseCurrent ? 'CURRENT_LOCATION' : fromText, location: toText || event.location };
                const localData = await AsyncStorage.getItem('localEvents');
                if(localData){
                  const events = JSON.parse(localData).map(e=> e.id===event.id ? { ...e, origin: updated.origin, location: updated.location } : e);
                  await AsyncStorage.setItem('localEvents', JSON.stringify(events));
                }
                try{ const fs = require('@react-native-firebase/firestore').default; await fs().collection('events').doc(event.id).update({ origin: updated.origin, location: updated.location, lastModified: fs.Timestamp.now() }); }catch(_){ }
                // Notify app to update calendar/dashboard immediately
                DeviceEventEmitter.emit('EVENT_ROUTE_UPDATED', updated);
                Alert.alert('Saved', 'Route updated for this event.');
              }catch(err){ console.log('Save route failed', err); }
            }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save Route</Text>
            </TouchableOpacity>
          </View>

          {/* Journey Visualization */}
          {(toText || event.location) && (
            <View style={styles.journeyContainer}>
              <View style={styles.journeyRow}>
                <View style={styles.journeyPoint}>
                  <View style={styles.toDot} />
                  <View style={styles.journeyInfo}>
                    <Text style={styles.journeyLabel}>To</Text>
                    <Text style={styles.journeyLocationText} numberOfLines={2}>
                      {(toText || event.location).length > 35 ? (toText || event.location).substring(0, 35) + '...' : (toText || event.location)}
                    </Text>
                  </View>
                </View>

                <View style={styles.journeyLine}>
                  <Icon name="arrow-forward" size={24} color="#667eea" />
                </View>

                <View style={styles.journeyPoint}>
                  <View style={styles.fromDot} />
                  <View style={styles.journeyInfo}>
                    <Text style={styles.journeyLabel}>From</Text>
                    <Text style={styles.journeyLocationText} numberOfLines={2}>
                      {fromUseCurrent ? currentAddress : fromText}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={styles.timeContainer}>
            <Icon name="schedule" size={20} color="#666" />
            <Text style={styles.timeText}>
              Event starts at {moment(event.startTime.toDate ? event.startTime.toDate() : event.startTime).format('h:mm A')}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Select Transportation</Text>

        {loading && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <ActivityIndicator size="small" color="#667eea" />
            <Text style={{ marginLeft: 8, color: '#667eea' }}>Updating routes…</Text>
          </View>
        )}

        {directions && directions.length > 0 ? (
          directions.map((option) => {
            if (!option.available) return null;

            const isSelected = selectedMode === option.mode;

            return (
              <TouchableOpacity
                key={option.mode}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => handleSelectMode(option.mode, option)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={getModeColor(option.mode)}
                  style={styles.optionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.optionHeader}>
                    <View style={styles.modeInfo}>
                      <Icon name={getModeIcon(option.mode)} size={32} color="#fff" />
                      <Text style={styles.modeLabel}>{getModeLabel(option.mode)}</Text>
                    </View>
                    <Icon name="arrow-forward" size={24} color="#fff" />
                  </View>

                  <View style={styles.optionDetails}>
                    <View style={styles.detailItem}>
                      <Icon name="schedule" size={18} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.detailLabel}>Duration</Text>
                      <Text style={styles.detailValue}>{option.durationText}</Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Icon name="straighten" size={18} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.detailLabel}>Distance</Text>
                      <Text style={styles.detailValue}>{option.distanceText}</Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Icon name="access-time" size={18} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.detailLabel}>Arrive by</Text>
                      <Text style={styles.detailValue}>{getArrivalTime(option.duration)}</Text>
                    </View>
                  </View>

                  {option.mode === 'transit' && option.steps && (
                    <View style={styles.transitInfo}>
                      <Icon name="info-outline" size={16} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.transitInfoText}>
                        Includes {option.steps.filter(s => s.travel_mode === 'TRANSIT').length} transit stops
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.noRoutesContainer}>
            <Icon name="error-outline" size={60} color="#999" />
            <Text style={styles.noRoutesText}>No routes available</Text>
            <Text style={styles.noRoutesSubText}>
              Make sure location services are enabled and the destination is valid.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#667eea',
    fontWeight: '600',
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
  eventInfo: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  journeyContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  journeyPoint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fromDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#2e7d32',
    alignSelf: 'center',
  },
  toDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ff6b6b',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#c62828',
    alignSelf: 'center',
  },
  journeyInfo: {
    flex: 1,
  },
  journeyLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: 'bold',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  journeyLocationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  journeyLine: {
    alignItems: 'center',
    marginHorizontal: 10,
    minWidth: 40,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  optionCard: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  optionCardSelected: {
    elevation: 6,
    shadowOpacity: 0.2,
  },
  optionGradient: {
    padding: 20,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  optionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 15,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 3,
  },
  transitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 8,
  },
  transitInfoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 8,
  },
  noRoutesContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noRoutesText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 20,
  },
  noRoutesSubText: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default JourneyOptionsScreen;
