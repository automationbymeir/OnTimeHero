import AsyncStorage from '@react-native-async-storage/async-storage';

class GoogleMapsService {
  constructor() {
    // You'll need to add your Google Maps API key here
    // Get it from: https://console.cloud.google.com/google/maps-apis
    this.apiKey = 'AIzaSyCjpfpg6D4w8nnW10Xkoz8DoWGS-0b6v6Q'; // Google Maps API key
    this.enabled = true; // Enable by default since we have API key
    this.loadSettings();
  }

  async loadSettings() {
    try {
      const enabled = await AsyncStorage.getItem('googleMapsEnabled');
      // Only override if explicitly set to false, otherwise keep default true
      if (enabled !== null) {
        this.enabled = enabled === 'true';
      }
      
      const apiKey = await AsyncStorage.getItem('googleMapsApiKey');
      if (apiKey) {
        this.apiKey = apiKey;
      }
    } catch (error) {
      console.error('Error loading Google Maps settings:', error);
    }
  }

  async setApiKey(apiKey) {
    try {
      this.apiKey = apiKey;
      await AsyncStorage.setItem('googleMapsApiKey', apiKey);
    } catch (error) {
      console.error('Error saving Google Maps API key:', error);
    }
  }

  async setEnabled(enabled) {
    try {
      this.enabled = enabled;
      await AsyncStorage.setItem('googleMapsEnabled', enabled.toString());
    } catch (error) {
      console.error('Error saving Google Maps enabled state:', error);
    }
  }

  async getHomeAddress() {
    try {
      const homeAddress = await AsyncStorage.getItem('homeAddress');
      return homeAddress || null;
    } catch (error) {
      console.error('Error loading home address:', error);
      return null;
    }
  }

  async setHomeAddress(address) {
    try {
      await AsyncStorage.setItem('homeAddress', address);
    } catch (error) {
      console.error('Error saving home address:', error);
    }
  }

  async calculateTravelTime(origin, destination, arrivalTime = null) {
    if (!this.enabled || !this.apiKey || this.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      console.log('Google Maps integration not enabled or API key not set');
      return { duration: 15, distance: null, error: 'Google Maps not configured' };
    }

    try {
      // Basic validation to avoid INVALID_REQUEST
      if (!origin || !destination || String(origin).trim() === '' || String(destination).trim() === '') {
        console.warn('Distance Matrix: missing origin or destination - using default travel time');
        return { duration: 15, distance: null, error: 'INVALID_PARAMS' };
      }

      // Additional validation for common issues that cause NOT_FOUND
      const originStr = String(origin).trim();
      const destStr = String(destination).trim();
      
      // Check for very short or generic location names that might cause NOT_FOUND
      if (originStr.length < 3 || destStr.length < 3) {
        console.warn('Distance Matrix: location names too short - using default travel time');
        return { duration: 15, distance: null, error: 'LOCATION_TOO_SHORT' };
      }

      console.log(`Calculating travel time from "${origin}" to "${destination}"`);

      // For driving mode, Distance Matrix supports departure_time, not arrival_time.
      // Use 'now' to get best-guess traffic duration and avoid invalid requests.
      let url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&mode=driving`;

      const departureParam = 'now';
      url += `&departure_time=${departureParam}&traffic_model=best_guess`;

      url += `&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        const result = data.rows[0].elements[0];
        
        if (result.status === 'OK') {
          const durationInMinutes = Math.ceil(result.duration_in_traffic?.value / 60 || result.duration.value / 60);
          const distanceInKm = (result.distance.value / 1000).toFixed(1);
          
          console.log(`✅ Travel time calculated: ${durationInMinutes} minutes (${distanceInKm} km)`);
          
          return {
            duration: durationInMinutes,
            distance: distanceInKm,
            durationText: result.duration.text,
            distanceText: result.distance.text,
            durationInTraffic: result.duration_in_traffic?.text || result.duration.text,
          };
        } else {
          console.warn('Distance Matrix result error:', result.status, '- using default travel time');
          return { duration: 15, distance: null, error: result.status };
        }
      } else {
        console.warn('Distance Matrix API error:', data.status, data.error_message || '', '- using default travel time');
        return { duration: 15, distance: null, error: data.status };
      }
    } catch (error) {
      console.warn('Error calculating travel time:', error.message, '- using default travel time');
      return { duration: 15, distance: null, error: error.message };
    }
  }

  async calculateTravelTimeFromHome(destination, arrivalTime = null) {
    const homeAddress = await this.getHomeAddress();

    if (!homeAddress) {
      console.log('Home address not set, using default 15 minutes');
      return { duration: 15, distance: null, error: 'Home address not set' };
    }

    return this.calculateTravelTime(homeAddress, destination, arrivalTime);
  }

  async calculateTravelTimeFromCurrentLocation(destination, arrivalTime = null) {
    try {
      const LocationService = require('./LocationService').default;

      // First check and request permissions
      const hasPermission = await LocationService.requestLocationPermission();
      if (!hasPermission) {
        console.log('⚠️ Location permission not granted, falling back to home address');
        return this.calculateTravelTimeFromHome(destination, arrivalTime);
      }

      const currentLocation = await LocationService.getCurrentLocation();

      if (!currentLocation) {
        console.log('⚠️ Could not get current location, trying home address');
        return this.calculateTravelTimeFromHome(destination, arrivalTime);
      }

      // Use coordinates as origin
      const origin = `${currentLocation.latitude},${currentLocation.longitude}`;
      console.log(`📍 Calculating travel time from current location (${origin}) to "${destination}"`);

      return this.calculateTravelTime(origin, destination, arrivalTime);
    } catch (error) {
      console.warn('⚠️ Error getting current location:', error.message || error, '- using default travel time');
      // Fallback to home address
      try {
        return await this.calculateTravelTimeFromHome(destination, arrivalTime);
      } catch (fallbackError) {
        console.warn('⚠️ Fallback also failed:', fallbackError.message || fallbackError, '- using default');
        return { duration: 15, distance: null, error: 'Location services unavailable' };
      }
    }
  }

  async getDirectionsWithOptions(destination, arrivalTime = null, originOverride = null) {
    try {
      const LocationService = require('./LocationService').default;

      // First check and request permissions
      const hasPermission = await LocationService.requestLocationPermission();
      if (!hasPermission) {
        console.log('⚠️ Location permission not granted');
        return null;
      }

      const currentLocation = await LocationService.getCurrentLocation();

      if (!currentLocation && !originOverride) {
        console.log('⚠️ Could not get current location');
        return null;
      }

      const origin = originOverride && originOverride.trim() !== ''
        ? originOverride
        : `${currentLocation.latitude},${currentLocation.longitude}`;
      console.log(`🗺️ Getting directions from current location to "${destination}"`);

      if (!this.enabled || !this.apiKey || this.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
        console.log('Google Maps integration not enabled or API key not set');
        return null;
      }

      // Get directions for different modes
      const modes = ['driving', 'transit', 'bicycling', 'walking'];
      const directionsPromises = modes.map(async (mode) => {
        try {
          // Build URL conditionally - only add departure_time if we have a valid arrivalTime
          let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}`;

          if (arrivalTime) {
            const departureTimeSeconds = Math.floor(new Date(arrivalTime).getTime() / 1000);
            url += `&departure_time=${departureTimeSeconds}`;
          }

          url += `&key=${this.apiKey}`;

          const response = await fetch(url);
          const data = await response.json();

          if (data.status === 'OK' && data.routes.length > 0) {
            const route = data.routes[0];
            const leg = route.legs[0];

            return {
              mode,
              available: true,
              duration: Math.ceil(leg.duration.value / 60),
              durationText: leg.duration.text,
              distance: (leg.distance.value / 1000).toFixed(1),
              distanceText: leg.distance.text,
              steps: leg.steps,
              polyline: route.overview_polyline.points,
            };
          } else {
            return {
              mode,
              available: false,
              error: data.status,
            };
          }
        } catch (error) {
          console.error(`Error getting ${mode} directions:`, error);
          return {
            mode,
            available: false,
            error: error.message,
          };
        }
      });

      const directions = await Promise.all(directionsPromises);
      console.log('✅ Got directions for all modes');

      return directions;
    } catch (error) {
      console.error('Error getting directions:', error);
      return null;
    }
  }

  /**
   * Get autocomplete predictions for a location search query
   */
  async getPlacePredictions(input) {
    console.log('🔍 Getting place predictions for:', input);
    console.log('🔑 API Key set:', !!this.apiKey);
    console.log('🔑 API Key starts with:', this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'None');
    
    if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      console.log('❌ Google Maps API key not set');
      return [];
    }

    try {
      // Query both exact addresses and cities, then merge unique results
      const urlAddress = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&inputtype=textquery&locationbias=ipbias&key=${this.apiKey}`;
      const urlCities = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=(cities)&inputtype=textquery&locationbias=ipbias&key=${this.apiKey}`;

      const [respAddress, respCities] = await Promise.all([
        fetch(urlAddress).then(r => r.json()).catch(() => ({ status: 'ERROR', predictions: [] })),
        fetch(urlCities).then(r => r.json()).catch(() => ({ status: 'ERROR', predictions: [] })),
      ]);

      const collect = (data) => {
        if (data.status !== 'OK') return [];
        return data.predictions.map(prediction => ({
          description: prediction.description,
          placeId: prediction.place_id,
          mainText: prediction.structured_formatting?.main_text || prediction.description,
          secondaryText: prediction.structured_formatting?.secondary_text || '',
        }));
      };

      const addresses = collect(respAddress);
      const cities = collect(respCities);

      const mergedMap = new Map();
      // Prioritize addresses first, then cities
      [...addresses, ...cities].forEach(p => {
        if (!mergedMap.has(p.placeId)) mergedMap.set(p.placeId, p);
      });

      let merged = Array.from(mergedMap.values());
      if (merged.length === 0) {
        // Fallback: Places Text Search for localities (cities)
        try {
          const urlTextSearchCity = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(input)}&type=locality&key=${this.apiKey}`;
          const cityResp = await fetch(urlTextSearchCity).then(r => r.json());
          if (cityResp.status === 'OK' && Array.isArray(cityResp.results)) {
            merged = cityResp.results.slice(0, 5).map(r => ({
              description: r.formatted_address || r.name,
              placeId: r.place_id,
              mainText: r.name,
              secondaryText: r.formatted_address && r.formatted_address.includes(r.name) ? r.formatted_address.replace(r.name + ', ', '') : (r.formatted_address || ''),
            }));
          }
        } catch (e) {
          // ignore
        }
      }
      if (merged.length === 0) {
        console.warn('Places API warning:', respAddress.status, respAddress.error_message || '', '/', respCities.status, respCities.error_message || '');
      }
      return merged;
    } catch (error) {
      console.warn('Error getting place predictions:', error?.message || error);
      return [];
    }
  }

  /**
   * Get place details by place ID
   */
  async getPlaceDetails(placeId) {
    if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      console.log('Google Maps integration not enabled');
      return null;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        const place = data.result;
        return {
          name: place.name,
          address: place.formatted_address,
          location: place.geometry.location,
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  /**
   * Geocode an address to get coordinates
   */
  async geocodeAddress(address) {
    if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      console.log('Google Maps integration not enabled');
      return null;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        console.log('✅ Geocoded address:', address, '->', location);
        return location; // { lat, lng }
      }

      console.error('Geocoding error:', data.status);
      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  /**
   * Get directions between two points
   */
  async getDirections(origin, destination) {
    if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      console.log('Google Maps integration not enabled');
      return null;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        console.log('✅ Got directions from', origin, 'to', destination);
        return data; // Full directions response
      }

      console.error('Directions error:', data.status);
      return null;
    } catch (error) {
      console.error('Error getting directions:', error);
      return null;
    }
  }
}

export default new GoogleMapsService();

