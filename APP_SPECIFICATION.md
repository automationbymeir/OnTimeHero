# OnTimeHero App - Complete Technical Specification

**Version:** 1.0
**Last Updated:** 2025-10-19
**Platform:** React Native (iOS & Android)
**Author:** Technical Documentation Team

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication Flow](#authentication-flow)
4. [Event Management Flow](#event-management-flow)
5. [Voice Assistant Flow](#voice-assistant-flow)
6. [Notification System Flow](#notification-system-flow)
7. [Location & Journey Tracking Flow](#location--journey-tracking-flow)
8. [Phone Lock / Focus Mode Flow](#phone-lock--focus-mode-flow)
9. [Gamification & Rewards Flow](#gamification--rewards-flow)
10. [Dashboard Flow](#dashboard-flow)
11. [Data Models](#data-models)
12. [External Integrations](#external-integrations)
13. [State Management](#state-management)

---

## Overview

**OnTimeHero** is a React Native mobile application designed to help users arrive on time to their events by:
- Smart notification timing based on real-time travel calculations
- AI-powered voice event creation
- Phone lock/focus mode to minimize distractions
- Gamification with XP, levels, badges, and achievements
- Google Calendar and Google Maps integration

### Key Features
- Multi-platform authentication (Email/Password, Google Sign-In)
- Manual and AI voice-based event creation
- Intelligent notification scheduling with travel time calculation
- Real-time location tracking and arrival detection
- Phone lock mode with automatic unlocking
- XP/level progression and achievement system
- Dashboard with next event preview and stats

---

## Architecture

### Technology Stack

**Frontend:**
- React Native 0.72.17
- React Navigation (Stack, Bottom Tabs)
- React Native Vector Icons
- React Native Linear Gradient
- Moment.js for date/time handling

**Backend Services:**
- Firebase Authentication
- Cloud Firestore
- Firebase Cloud Functions
- Google Calendar API
- Google Maps API (Distance Matrix, Places, Geocoding)
- Google Generative AI (Gemini) for voice parsing

**Location & Notifications:**
- react-native-geolocation-service
- react-native-push-notification
- @react-native-voice/voice

**Storage:**
- AsyncStorage (local persistence)
- Cloud Firestore (cloud sync)

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── dashboard/       # Dashboard-specific components
│   ├── HeaderFade.js
│   └── OnTimeHeroLogo.js
├── contexts/            # React Context providers
│   └── AuthContext.js
├── navigation/          # Navigation configuration
│   └── AppNavigator.js
├── screens/             # Screen components
│   ├── auth/            # Authentication screens
│   │   ├── LoginScreen.js
│   │   └── SignupScreen.js
│   ├── main/            # Main app screens
│   │   ├── AddEventScreen.js
│   │   ├── EditEventScreen.js
│   │   ├── VoiceEventScreen.js
│   │   ├── CalendarScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── ProfileScreen.js
│   │   ├── SettingsScreen.js
│   │   └── NotificationsScreen.js
│   └── alerts/          # Alert/Focus screens
│       └── PhoneLockScreen.js
├── services/            # Business logic services
│   ├── GamificationService.js
│   ├── NotificationService.js
│   ├── LocationService.js
│   ├── LockService.js
│   ├── GoogleCalendarService.js
│   └── GoogleMapsService.js
├── styles/              # Theming and styles
│   └── theme.js
└── utils/               # Utility functions
```

---

## Authentication Flow

### File References
- **LoginScreen.js** (src/screens/auth/LoginScreen.js:46-248)
- **SignupScreen.js** (src/screens/auth/SignupScreen.js:18-249)
- **AppNavigator.js** (src/navigation/AppNavigator.js:391-417)

### Flow Description

#### 1. Initial State
- App checks for authenticated user via `AuthContext`
- If user exists → Navigate to MainTabs
- If no user → Show Login/Signup screens

#### 2. Login Flow

**Step 1: User Input**
```
LoginScreen.js:46-65
- User enters email and password
- Validation: Email and password required
```

**Step 2: Email/Password Authentication**
```javascript
LoginScreen.js:51-65
handleLogin() → auth().signInWithEmailAndPassword(email, password)
```

**Step 3: Google Sign-In**
```javascript
LoginScreen.js:67-82
handleGoogleSignIn() →
  1. GoogleSignin.hasPlayServices()
  2. GoogleSignin.signIn() → Get idToken and user data
  3. auth.GoogleAuthProvider.credential(idToken)
  4. auth().signInWithCredential(googleCredential)
  5. updateFirebaseUserProfile() → Update displayName, photoURL
  6. importGoogleProfileData() → Save to Firestore
```

**Step 4: Profile Data Sync**
```javascript
LoginScreen.js:105-148
importGoogleProfileData() →
  1. Create/update Firestore users/{uid} document
  2. Fields: displayName, email, photoURL, googleId, lastSignIn, createdAt
  3. Fallback: If Firestore unavailable, store in AsyncStorage
```

#### 3. Signup Flow

**Step 1: User Input**
```
SignupScreen.js:24-48
- Email, password, confirmPassword
- Validation:
  - All fields required
  - Passwords must match
  - Password ≥ 6 characters
```

**Step 2: Account Creation**
```javascript
SignupScreen.js:40-48
handleSignup() → auth().createUserWithEmailAndPassword(email, password)
```

#### 4. Google Sign-In Configuration
```javascript
LoginScreen.js:39-44
GoogleSignin.configure({
  scopes: ['calendar', 'email', 'profile'],
  webClientId: '574885181091-rutnfbrqmiu01gjlp7gsfvo3mc2n8ecs.apps.googleusercontent.com',
  offlineAccess: true,
  forceCodeForRefreshToken: true
})
```

### Navigation After Authentication
```
AppNavigator.js:396-408
Authenticated → MainTabs (Dashboard, Calendar, AddEventTab, Profile)
Unauthenticated → Auth Stack (Login, Signup)
```

---

## Event Management Flow

### File References
- **AddEventScreen.js** (src/screens/main/AddEventScreen.js)
- **EditEventScreen.js** (src/screens/main/EditEventScreen.js)
- **CalendarScreen.js** (src/screens/main/CalendarScreen.js)
- **NotificationService.js** (src/services/NotificationService.js:277-456)

### Add Event Flow

#### 1. Navigation to Add Event
```
Two entry points:
1. Bottom tab "Add" button → AppNavigator.js:73-82
2. Voice Assistant → Prefill data
```

#### 2. Form Fields
```javascript
AddEventScreen.js:24-47
State:
- title: Event name (required)
- description: Event details
- location: Destination address
- fromUseCurrent: Boolean (use current location as origin)
- fromText: Custom origin address
- date: Event date (YYYY-MM-DD)
- time: Event time (HH:mm)
- calculatedTravelTime: Minutes to destination
```

#### 3. Location Autocomplete
```javascript
AddEventScreen.js:476-528
handleLocationChange() →
  1. If text.length > 2
  2. GoogleMapsService.getPlacePredictions(text, userLocation)
  3. Display predictions in dropdown
  4. On selection → handleSelectLocation()
     a. GoogleMapsService.calculateTravelTimeFromHome()
     b. setCalculatedTravelTime(travelInfo.duration)
     c. Alert: "Travel Time Calculated: X minutes"
```

#### 4. Travel Time Calculation
```javascript
AddEventScreen.js:128-168
Travel time logic:
- If calculatedTravelTime exists → Use it
- Else if location provided:
  - If location.length < 3 → Default 15 min
  - Else:
    - Call GoogleMapsService.calculateTravelTime(origin, location, eventDateTime)
    - Success → Use calculated time
    - Failure → Default 15 min
```

#### 5. Save Event
```javascript
AddEventScreen.js:69-283
handleSaveEvent() →
  1. Validation: title, date, time required
  2. Parse time (supports multiple formats: HH:mm, h:mm A)
  3. Create eventDateTime = moment(date + time)
  4. Calculate travelTime (from Maps or default 15)
  5. Create localEventData object
  6. Save to AsyncStorage (immediate feedback)
     - Check for duplicates (same title, time, location)
     - Remove duplicates before adding
  7. Schedule notifications
  8. Sync to Firestore in background (non-blocking)
  9. Sync to Google Calendar (non-blocking)
```

#### 6. Background Sync
```javascript
AddEventScreen.js:285-347
syncToFirestore() →
  1. Check for existing event (duplicate check)
  2. Create Firestore document in events collection
  3. On success:
     - createGoogleCalendarEvent()
     - Remove from AsyncStorage (now in cloud)
```

```javascript
AddEventScreen.js:349-451
createGoogleCalendarEvent() →
  1. Check GoogleSignin.isSignedIn()
  2. Get access token from GoogleCalendarService
  3. Create Google Calendar event object:
     - summary, description, location
     - start/end (dateTime with timezone)
     - reminders: [30 min, 10 min]
  4. POST to calendar/v3/calendars/primary/events
  5. On success → Update local event with googleEventId
```

### Edit Event Flow

#### 1. Load Existing Event
```javascript
EditEventScreen.js:22-39
- Receive event via route.params
- Pre-fill form with existing data:
  - title, description, location
  - origin (current or custom)
  - date, time (formatted from startTime)
  - calculatedTravelTime
```

#### 2. Update Event
```javascript
EditEventScreen.js:61-230
handleUpdateEvent() →
  1. Validation (same as Add Event)
  2. Parse time and create eventDateTime
  3. Calculate new travelTime if needed
  4. Cancel old notifications
  5. If event.googleEventId exists:
     - updateGoogleCalendarEvent() FIRST
     - If fails → Alert and abort
  6. Update storage (AsyncStorage or Firestore)
  7. Schedule new notifications
  8. Emit EVENT_ROUTE_UPDATED event
```

#### 3. Google Calendar Update
```javascript
EditEventScreen.js:232-389
updateGoogleCalendarEvent() →
  1. Get existing event from Google Calendar (GET request)
  2. Check eventType (outOfOffice, focusTime, etc.)
     - If special type → Show alert, return false
  3. Preserve event type (all-day vs timed)
  4. PATCH request to update event
  5. Handle errors:
     - eventTypeRestriction
     - forbidden (permissions)
     - Other errors
```

### Calendar View Flow

#### 1. Load Events
```
CalendarScreen displays:
- Local events from AsyncStorage
- Firestore events
- Google Calendar events (if synced)
```

#### 2. Event Actions
```
- Tap event → Navigate to EditEventScreen
- Delete event → Cancel notifications, remove from storage
- Mark complete → Update status, award XP
```

---

## Voice Assistant Flow

### File References
- **VoiceEventScreen.js** (src/screens/main/VoiceEventScreen.js)

### Flow Description

#### 1. Screen Initialization
```javascript
VoiceEventScreen.js:78-86
On mount:
- Load chat history from AsyncStorage
- Add welcome message
- Initialize Voice recognition
```

#### 2. Voice Recognition Setup
```javascript
VoiceEventScreen.js:248-321
Voice event handlers:
- Voice.onSpeechStart → setIsListening(true)
- Voice.onSpeechEnd → setIsListening(false)
- Voice.onSpeechResults → handleUserSpeech(transcript)
- Voice.onSpeechPartialResults → Show partial text
- Voice.onSpeechError → Handle errors
```

#### 3. User Speech Processing
```javascript
VoiceEventScreen.js:323-438
handleUserSpeech(transcript) →
  1. Add user message to conversation
  2. Detect language (en-US, he-IL, de-DE)
  3. Call AI parser: callGenkitParser()
  4. Handle response:
     a. Schedule query → Fetch and display calendar
     b. Leave time query → Calculate departure time
     c. Event creation → Extract event data
  5. Update eventData state with formatted fields
  6. If confirmed/complete → Navigate to AddEventScreen with prefill
```

#### 4. AI Event Parser
```javascript
VoiceEventScreen.js:555-612
callGenkitParser() →
  1. Prepare request:
     - URL: Cloud Functions endpoint parseEventWithGenkitV2
     - Body: { text, conversationMode, conversationHistory, currentEventData, userLanguage }
  2. POST request to Cloud Function
  3. Response fields:
     - response: Assistant message
     - extractedData: { title, date, time, location, description }
     - isComplete: Boolean
     - needsConfirmation: Boolean
     - confirmed: Boolean
     - isScheduleQuery: Boolean
     - isLeaveTimeQuery: Boolean
```

#### 5. Event Data Formatting
```javascript
VoiceEventScreen.js:204-224
formatEventData() →
  - date: Convert to YYYY-MM-DD
  - time: Convert to HH:mm
  - Ensure compatibility with AddEventScreen
```

#### 6. Text Input Mode
```javascript
VoiceEventScreen.js:440-533
handleTextSubmit() →
  - Same flow as voice input
  - Uses textInput state instead of speech
  - No speech recognition needed
```

#### 7. Chat History
```javascript
VoiceEventScreen.js:100-144
Features:
- Save conversations to AsyncStorage
- Load previous conversations
- Start new conversation
- Keep last 10 conversations
```

#### 8. Special Queries

**Schedule Query:**
```javascript
VoiceEventScreen.js:358-389
If isScheduleQuery:
  1. GoogleCalendarService.getTodaysEvents()
  2. Format event list with time, title, location
  3. Display in chat
```

**Leave Time Query:**
```javascript
VoiceEventScreen.js:390-406
If isLeaveTimeQuery:
  1. calculateLeaveTime() →
     - Find next event today
     - Calculate travel time via GoogleMapsService
     - departure_time = event_time - travel_time - 5 min buffer
  2. Display when to leave
```

---

## Notification System Flow

### File References
- **NotificationService.js** (src/services/NotificationService.js)

### Notification Channels (Android)

```javascript
NotificationService.js:218-257
Three channels:
1. time-to-leave: Importance 5 (max), vibrate, critical
2. reminders: Importance 4 (high), vibrate
3. achievements: Importance 3 (default), no vibrate
```

### Event Notification Scheduling

```javascript
NotificationService.js:277-456
scheduleEventNotifications(event) →

Step 1: Calculate Times
  eventTime = moment(event.startTime)
  travelTime = event.travelTime || 15 minutes
  prepTime = AsyncStorage.getItem('reminder1Minutes') || 30 minutes
  departureTime = eventTime - travelTime
  getReadyTime = departureTime - prepTime

Step 2: Schedule "Get Ready" Notification
  If departureTime is in future:
    If getReadyTime > now:
      Schedule for getReadyTime
    Else:
      Fire immediately (3 seconds)
  Title: "📅 Get Ready!"
  Message: "Start getting ready for {title}. Leave in X minutes at {departureTime}"

Step 3: Schedule "Time to Leave" Notification
  If eventTime > now:
    If minutesUntilDeparture > 0:
      Schedule for departureTime
    Else if minutesUntilDeparture >= -5:
      Fire immediately (6 seconds)
    Else:
      Skip (too late)
  Title: "⏰ Time to Leave NOW!"
  Message: "Leave now for {title} at {location}! Travel time: X min"

Step 4: Verification
  - getScheduledNotifications()
  - Log all scheduled notifications for event
  - markNotificationsScheduled(eventId)
```

### Notification ID Generation
```javascript
NotificationService.js:30-38
hashStringToNumber(str) →
  - Convert string to 32-bit integer hash
  - Used for: "${eventId}_get_ready", "${eventId}_time_to_leave"
  - Ensures consistent IDs for cancellation
```

### Cancel Notifications
```javascript
NotificationService.js:673-689
cancelEventNotifications(eventId) →
  1. getScheduledNotifications()
  2. Filter by eventId in userInfo
  3. cancelNotification(id) for each
```

### Achievement Notifications
```javascript
NotificationService.js:528-577
- showAchievementNotification(badge)
- showStreakNotification(streakCount)
- showLevelUpNotification(newLevel)
```

### Arrival Notifications
```javascript
NotificationService.js:579-609
showArrivalNotification(event, wasOnTime, pointsAwarded) →
  Title: "🎉 Great Job!" or "⚠️ Running Late"
  Message: "You arrived on time! +{points} XP" or "Try to leave earlier"
  Save to notification history
```

### Notification History
```javascript
NotificationService.js:469-501
saveNotificationToHistory(notification) →
  1. Load from AsyncStorage.userNotifications
  2. Add/update notification (by id)
  3. Keep last 50 notifications
  4. Emit NOTIFICATION_RECEIVED event
```

---

## Location & Journey Tracking Flow

### File References
- **LocationService.js** (src/services/LocationService.js)
- **GoogleMapsService.js** (src/services/GoogleMapsService.js)

### Location Permission Request
```javascript
LocationService.js:14-34
requestLocationPermission() →
  Android:
    - PermissionsAndroid.request(ACCESS_FINE_LOCATION)
    - Shows system permission dialog
  iOS:
    - Handled automatically by Geolocation library
```

### Get Current Location
```javascript
LocationService.js:36-105
getCurrentLocation() →
  Strategy (with fallbacks):
  1. High accuracy (timeout: 10s, maximumAge: 10min)
     - GPS with enableHighAccuracy: true
  2. Low accuracy (timeout: 5s)
     - Network/Cell tower with enableHighAccuracy: false
  3. Cached location (if available)
     - Return last known location
  Returns: { latitude, longitude, accuracy, timestamp }
```

### Continuous Location Tracking
```javascript
LocationService.js:107-142
startLocationTracking(callback) →
  - Geolocation.watchPosition()
  - Config:
    - enableHighAccuracy: true
    - distanceFilter: 10 meters
    - interval: 5 seconds
    - fastestInterval: 2 seconds
  - Callback on each position update
  - Updates currentLocation property
```

### Distance Calculation
```javascript
LocationService.js:144-157
calculateDistance(lat1, lon1, lat2, lon2) →
  - Haversine formula
  - Returns distance in meters
  - Used for arrival detection (< 50m)
```

### Arrival Detection
```javascript
LocationService.js:175-190
checkArrivalAtLocation(event, currentLocation) →
  1. geocodeLocation(event.location) → Get coordinates
  2. calculateDistance(current, event)
  3. Return: distance < 50 meters
```

### Departure Monitoring
```javascript
LocationService.js:192-221
checkDepartureFromHome(event, currentLocation) →
  1. Get user's home location from Firestore
  2. calculateDistance(current, home)
  3. Return: distance > 100 meters
```

### Travel Time Estimation
```javascript
LocationService.js:279-290
getDepartureTime(event) →
  1. estimateTravelTime(event.location) → Get travel minutes
  2. eventTime = moment(event.startTime)
  3. departureTime = eventTime - travelTime - 5 min buffer
  Returns: { departureTime, travelTime, bufferTime }
```

### Location History
```javascript
LocationService.js:330-370
logLocationEvent(type, location, eventId) →
  - Save to Firestore location_logs collection
  - Types: 'arrival', 'departure', 'check_in'
  - Fields: userId, type, location, eventId, timestamp, accuracy

getLocationHistory(limit=50) →
  - Fetch from Firestore location_logs
  - Order by timestamp desc
```

---

## Phone Lock / Focus Mode Flow

### File References
- **PhoneLockScreen.js** (src/screens/alerts/PhoneLockScreen.js)
- **LockService.js** (src/services/LockService.js)

### Phone Lock Activation

#### 1. Navigate to Phone Lock
```
Entry points:
- From AddEventScreen: Select "Lock Phone" option
- From DashboardScreen: TIME_TO_LEAVE event
- From JourneyOptions: User selects lock mode
```

#### 2. Lock Mode Initialization
```javascript
PhoneLockScreen.js:77-92
useEffect on event load:
  1. LockService.startLockMode(event, handleUnlock)
  2. Vibration.vibrate([500, 200, 500])
  3. startCountdown() → Update timer every second
```

```javascript
LockService.js:27-71
startLockMode(event, onUnlock) →
  1. Get lockDuration from AsyncStorage (default: 30 min)
  2. this.isLocked = true
  3. this.currentEvent = event
  4. Save lock state to AsyncStorage
  5. startLocationTracking()
  6. Monitor app state changes
  7. Set auto-unlock timer at event start time
  8. blockAppSwitching() (platform-specific)
```

### Lock Screen UI
```javascript
PhoneLockScreen.js:237-335
Displays:
- Lock icon
- "Phone Locked! No distractions allowed!"
- Countdown timer to event start
- Event info (title, location)
- Buttons:
  1. "I'm Leaving Now 🚀" → Navigate to JourneyTracking
  2. "I've Arrived ✓" → Confirm arrival, unlock
  3. "Emergency Unlock" → Show PIN modal
```

### Arrival Detection & Unlock

#### 1. Location-Based Unlock
```javascript
LockService.js:99-119
checkArrival(position) →
  1. getEventCoordinates(event.location) → Mock coords
  2. calculateDistance(current, event)
  3. If distance < 50 meters:
     - unlock('Arrived at location')
```

#### 2. Manual Arrival Confirmation
```javascript
PhoneLockScreen.js:151-169
handleArrived() →
  1. Calculate isOnTime = now <= eventTime
  2. LockService.unlockAsync('Manual arrival confirmation')
  3. Wait for unlock and event update
  4. Navigate to MainTabs with success/late message
```

#### 3. Emergency PIN Unlock
```javascript
PhoneLockScreen.js:171-202
handleEmergencyUnlock() →
  1. Validate 4-digit PIN
  2. LockService.emergencyUnlock(pin)
  3. Check against stored PIN (default: '1234')
  4. If valid:
     - Unlock with -10 XP penalty
  5. If invalid:
     - Increment attempts
     - Show remaining attempts (max 3)
```

### Event Completion Update
```javascript
LockService.js:248-379
updateEventCompletion(arrivedOnTime) →
  1. Calculate:
     - completedAt = new Date()
     - eventTime = event.startTime
     - minutesEarly = (eventTime - completedAt) / 60000
     - wasEarly = minutesEarly >= 10

  2. Update Firestore:
     - status: 'completed'
     - completedAt: timestamp
     - arrivedOnTime: boolean
     - wasEarly: boolean

  3. Update AsyncStorage (local events)

  4. Award points:
     - GamificationService.awardEventPoints(event)
     - GamificationService.awardPhoneLockPoints() → +5 XP
     - GamificationService.checkAchievements()

  5. Show notification:
     - NotificationService.showArrivalNotification()

  6. Emit events:
     - DeviceEventEmitter.emit('EVENT_COMPLETED', eventData)
```

---

## Gamification & Rewards Flow

### File References
- **GamificationService.js** (src/services/GamificationService.js)

### XP & Level System

#### 1. Level Calculation
```javascript
GamificationService.js:86-94
calculateLevel(xp) → Math.floor(xp / 100) + 1

Examples:
- 0-99 XP → Level 1
- 100-199 XP → Level 2
- 200-299 XP → Level 3
- 500 XP → Level 6
```

#### 2. Award Points
```javascript
GamificationService.js:98-152
awardPoints(points, reason, eventData) →
  1. Get current user from auth().currentUser
  2. Fetch current XP from Firestore users collection
  3. Calculate:
     - newXP = currentXP + points
     - oldLevel = calculateLevel(currentXP)
     - newLevel = calculateLevel(newXP)
  4. Update Firestore:
     - xp: newXP
     - level: newLevel
     - lastPointsUpdate: timestamp
     - lastPointsReason: reason
  5. Log to xp_logs collection
  6. If level up:
     - handleLevelUp(newLevel, newXP)
  7. Emit POINTS_UPDATED event
```

#### 3. Level Up
```javascript
GamificationService.js:155-180
handleLevelUp(newLevel, newXP) →
  1. Log: "🎉 Level up! New level: {level}"
  2. Store notification in AsyncStorage
  3. Emit LEVEL_UP event
  4. checkAchievements()
```

### Event Point System
```javascript
GamificationService.js:183-218
awardEventPoints(event) →
  Points based on arrival status:
  - Late arrival: 0 XP
  - On-time arrival: +10 XP
  - Early arrival (10+ min): +20 XP

  After awarding:
  - checkAchievements()
```

### Phone Lock Points
```javascript
GamificationService.js:221-233
awardPhoneLockPoints() →
  - Award +5 XP for completing phone lock
  - Reason: "Completed phone lock mode"
  - checkAchievements()
```

### Achievements System

#### 1. Available Achievements
```javascript
GamificationService.js:7-72
Achievements list:
1. Early Bird: Arrive early to 5 events → +25 XP, 🐦 badge
2. Punctual Pro: Arrive on time to 10 events → +50 XP, ⏰ badge
3. Streak Master: 7-day perfect streak → +100 XP, 🔥 badge
4. Phone Lock Hero: Use phone lock 10 times → +75 XP, 🔒 badge
5. Calendar King: Create 20 events → +60 XP, 📅 badge
6. Evening Warrior: Complete 5 evening events → +40 XP, 🌙 badge
7. Social Butterfly: Complete 10 social events → +80 XP, 👥 badge
```

#### 2. Check Achievements
```javascript
GamificationService.js:236-259
checkAchievements() →
  1. Get current user achievements from Firestore
  2. For each achievement in achievements array:
     - Skip if already earned
     - checkAchievementCondition(achievement)
     - If earned → awardAchievement()
```

#### 3. Achievement Conditions
```javascript
GamificationService.js:262-390

checkEarlyArrivals(userId, count) →
  Query events where wasEarly == true, count >= required

checkOnTimeArrivals(userId, count) →
  Query events where arrivedOnTime == true, count >= required

checkStreak(userId, days) →
  Get user.currentStreak, check >= requiredDays

checkPhoneLockUsage(userId, count) →
  Query events where usedPhoneLock == true, count >= required

checkCalendarEvents(userId, count) →
  Count total events, check >= required

checkEveningEvents(userId, count) →
  Query events, filter where hour >= 18 || hour <= 6, count >= required

checkSocialEvents(userId, count) →
  Query events, filter by keywords:
  ['meeting', 'party', 'dinner', 'lunch', 'coffee', 'drinks', 'social', 'friend', 'family', 'date']
```

#### 4. Award Achievement
```javascript
GamificationService.js:393-434
awardAchievement(achievement, userId, currentXP) →
  1. Update Firestore users:
     - achievements: arrayUnion(achievementId)
     - badges: arrayUnion(badgeReward)
     - xp: currentXP + xpReward
     - level: recalculated
  2. Create achievement record in achievements collection
  3. Store in AsyncStorage (latestAchievement)
  4. Emit ACHIEVEMENT_EARNED event
```

### User Stats
```javascript
GamificationService.js:437-463
getUserStats() →
  Returns:
  - xp: total experience points
  - level: calculated from XP
  - xpForNextLevel: points needed for next level
  - achievements: array of achievement IDs
  - badges: array of badge IDs
  - currentStreak: consecutive days
  - punctualityScore: percentage on-time
```

---

## Dashboard Flow

### File References
- **DashboardScreen.js** (src/screens/main/DashboardScreen.js)

### Dashboard Initialization

```javascript
DashboardScreen.js:135-148
useEffect() →
  1. loadUserData() → Get displayName from auth().currentUser
  2. loadUserStats() → Fetch XP, level, streak from GamificationService
  3. loadNotificationCount() → Count unread notifications
  4. getCurrentLocation() → Get device location
  5. loadEvents(location) → Fetch events from all sources
```

### Load Events
```
Sources (in order):
1. AsyncStorage (localEvents) → Local pending events
2. Firestore (events collection) → Cloud-synced events
3. Google Calendar API → Imported calendar events
```

### Next Event Detection
```
Logic:
1. Filter events: status != 'completed' && startTime > now
2. Sort by startTime ascending
3. Take first event → setNextEvent()
```

### Event Status Updates

#### 1. TIME_TO_LEAVE Event
```javascript
DashboardScreen.js:151-178
DeviceEventEmitter.addListener('TIME_TO_LEAVE') →
  1. Verify eventId matches nextEvent
  2. Check event.status != 'completed'
  3. Update nextEvent.status = 'time-to-leave'
  4. Navigate to PhoneLock screen
```

#### 2. Timer Check (Every 10 seconds)
```javascript
DashboardScreen.js:288-343
useEffect with interval →
  1. Calculate:
     - leaveTime = eventTime - travelTime
     - minutesUntilLeave = leaveTime - now
  2. Status updates:
     - minutesUntilLeave <= 0: status = 'time-to-leave', navigate to PhoneLock
     - minutesUntilLeave <= 5: status = 'warning'
     - minutesUntilLeave > 5: status = 'upcoming'
```

#### 3. EVENT_COMPLETED
```javascript
DashboardScreen.js:394-438
DeviceEventEmitter.addListener('EVENT_COMPLETED') →
  1. Update events list with completed status
  2. If completed event is nextEvent:
     - Show completed status (green, checkmark)
     - Wait 1 minute
     - Find next upcoming event
     - setNextEvent(nextUpcomingEvent)
```

### Stats Listeners

```javascript
DashboardScreen.js:182-285
Event Listeners:

STATS_RESET:
  - Reset stats to { points: 0, level: 1, currentStreak: 0, xpForNextLevel: 100 }
  - Reload from Firestore

FORCE_REFRESH:
  - Call onRefresh() → Reload all data

POINTS_UPDATED:
  - Update stats: { points, level, currentStreak, xpForNextLevel }
  - Force re-render

ACHIEVEMENT_EARNED:
  - showAchievementPopup(achievement)

LEVEL_UP:
  - showLevelUpPopup(data)

COMPLETE_RESET:
  - Reset stats to new values from event data
```

### Dashboard UI Components

#### 1. Header
```
- Welcome greeting (Good morning/afternoon/evening)
- User name
- Notification bell with unread count
```

#### 2. Next Event Card
```
Displays:
- Event title
- Time and location
- Countdown timer
- Travel time
- Status indicator:
  - Green: Plenty of time
  - Yellow: Within 5 minutes
  - Red: Time to leave NOW
- Actions:
  - View details → Navigate to EditEventScreen
  - Start journey → Navigate to JourneyTracking
```

#### 3. Quick Stats
```
Cards showing:
- Current XP / Level
- XP progress bar to next level
- Current streak (🔥 icon)
- On-time percentage
```

#### 4. Recent Events List
```
Last 5 completed events:
- Title, time, location
- Status badge (on-time, early, late)
- XP earned
```

### Refresh Flow
```javascript
DashboardScreen onRefresh() →
  1. setRefreshing(true)
  2. loadUserStats()
  3. loadNotificationCount()
  4. getCurrentLocation()
  5. loadEvents()
  6. setRefreshing(false)
```

---

## Data Models

### Firestore Collections

#### 1. users Collection
```typescript
users/{userId}
{
  displayName: string
  email: string
  photoURL: string | null
  googleId: string | null
  xp: number                    // Experience points
  level: number                 // Calculated level
  achievements: string[]        // Achievement IDs earned
  badges: string[]              // Badge IDs earned
  currentStreak: number         // Consecutive days
  punctualityScore: number      // Percentage on-time
  homeLocation: {
    latitude: number
    longitude: number
    address: string
    setAt: Timestamp
  } | null
  lastSignIn: Timestamp
  createdAt: Timestamp
  lastPointsUpdate: Timestamp
  lastPointsReason: string
}
```

#### 2. events Collection
```typescript
events/{eventId}
{
  userId: string
  title: string
  description: string
  location: string              // Destination address
  origin: string | null         // Origin address or 'CURRENT_LOCATION'
  startTime: Timestamp
  endTime: Timestamp
  travelTime: number            // Minutes to destination
  status: 'upcoming' | 'time-to-leave' | 'completed'

  // Completion fields
  completedAt: Timestamp | null
  arrivedOnTime: boolean | null
  wasEarly: boolean | null      // Arrived 10+ minutes early
  usedPhoneLock: boolean

  // Sync fields
  googleEventId: string | null
  syncedToGoogle: boolean
  lastSynced: Timestamp
  lastModified: Timestamp
  createdAt: Timestamp
}
```

#### 3. achievements Collection
```typescript
achievements/{achievementId}
{
  userId: string
  achievementId: string         // e.g., 'early_bird'
  title: string
  description: string
  icon: string
  xpReward: number
  badgeReward: string
  timestamp: Timestamp
}
```

#### 4. xp_logs Collection
```typescript
xp_logs/{logId}
{
  userId: string
  points: number
  reason: string
  timestamp: Timestamp
  eventData: {
    eventId: string
    eventTitle: string
    eventLocation: string
  } | null
}
```

#### 5. location_logs Collection
```typescript
location_logs/{logId}
{
  userId: string
  type: 'arrival' | 'departure' | 'check_in'
  location: {
    latitude: number
    longitude: number
    accuracy: number
  }
  eventId: string | null
  timestamp: Timestamp
}
```

### AsyncStorage Keys

```typescript
// Authentication
'userProfile': JSON.stringify({
  displayName: string
  email: string
  photoURL: string
  googleId: string
  lastSignIn: string
})

// Events
'localEvents': JSON.stringify(Event[])

// Notifications
'userNotifications': JSON.stringify({
  id: string
  type: string
  title: string
  message: string
  eventId: string
  timestamp: string
  read: boolean
}[])

// Lock Mode
'lockMode': JSON.stringify({
  isLocked: boolean
  eventId: string
  startTime: string
  lockDuration: number
})

// Gamification
'levelUp': JSON.stringify({
  level: number
  xp: number
  timestamp: string
})

'latestAchievement': JSON.stringify({
  id: string
  title: string
  description: string
  icon: string
  xpReward: number
  badgeReward: string
  timestamp: string
})

// Settings
'reminder1Minutes': string        // Prep time (default: '30')
'lockDuration': string            // Lock duration in minutes (default: '30')
'emergencyPin': string            // Emergency unlock PIN (default: '1234')
'homeAddress': string
```

---

## External Integrations

### Google Calendar API

#### Authentication
```javascript
GoogleCalendarService.js
Configuration:
- Scopes: ['https://www.googleapis.com/auth/calendar', 'email', 'profile']
- Token caching: 50-minute TTL
- Concurrent request prevention
```

#### Endpoints Used
```
GET /calendar/v3/calendars/primary/events
- Fetch today's events
- Filter by timeMin, timeMax

POST /calendar/v3/calendars/primary/events
- Create new event
- Body: { summary, description, location, start, end, reminders }

PATCH /calendar/v3/calendars/primary/events/{eventId}
- Update existing event
- Preserves event type (all-day vs timed)

GET /calendar/v3/calendars/primary/events/{eventId}
- Fetch single event details
```

### Google Maps APIs

#### 1. Distance Matrix API
```javascript
GoogleMapsService.calculateTravelTime(origin, destination, departureTime)
→ Returns: { duration: number, distance: number }
```

#### 2. Places API (Autocomplete)
```javascript
GoogleMapsService.getPlacePredictions(input, userLocation)
→ Returns: [{ placeId, mainText, secondaryText, description }]
```

#### 3. Geocoding API
```javascript
GoogleMapsService.reverseGeocode(latitude, longitude)
→ Returns: Formatted address string
```

### Google Generative AI (Gemini)

#### Cloud Function: parseEventWithGenkitV2
```
Endpoint: https://us-central1-{projectId}.cloudfunctions.net/parseEventWithGenkitV2

Request:
{
  text: string                          // User speech/text
  conversationMode: boolean
  conversationHistory: Message[]        // Last 10 messages
  currentEventData: {                   // Partial event data
    title?: string
    date?: string
    time?: string
    location?: string
    description?: string
  }
  userLanguage: 'en' | 'he' | 'de'
}

Response:
{
  response: string                      // Assistant message
  extractedData: {
    title?: string
    date?: string                       // YYYY-MM-DD
    time?: string                       // HH:mm
    location?: string
    description?: string
  }
  isComplete: boolean                   // All required fields present
  needsConfirmation: boolean
  confirmed: boolean
  isScheduleQuery: boolean              // User asking for schedule
  isLeaveTimeQuery: boolean             // User asking when to leave
}
```

### Firebase Cloud Messaging
```
Used for:
- Push notifications
- Background message handling
- Foreground message handling
```

---

## State Management

### Event Emitters (DeviceEventEmitter)

```typescript
Events:

'POINTS_UPDATED'
  Data: { points: number, level: number, pointsAwarded: number, reason: string, levelUp: boolean }
  Emitted by: GamificationService.awardPoints()
  Listened by: DashboardScreen

'LEVEL_UP'
  Data: { level: number, xp: number }
  Emitted by: GamificationService.handleLevelUp()
  Listened by: DashboardScreen

'ACHIEVEMENT_EARNED'
  Data: Achievement object
  Emitted by: GamificationService.awardAchievement()
  Listened by: DashboardScreen

'EVENT_COMPLETED'
  Data: Event object with completedAt, arrivedOnTime, wasEarly
  Emitted by: LockService.updateEventCompletion()
  Listened by: DashboardScreen, CalendarScreen

'TIME_TO_LEAVE'
  Data: { eventId: string, eventTitle: string }
  Emitted by: NotificationService (on notification tap)
  Listened by: DashboardScreen

'NOTIFICATION_RECEIVED'
  Data: { notification: Notification }
  Emitted by: NotificationService.saveNotificationToHistory()
  Listened by: DashboardScreen

'STATS_RESET'
  Data: none
  Emitted by: SettingsScreen (reset stats button)
  Listened by: DashboardScreen

'FORCE_REFRESH'
  Data: none
  Emitted by: Various screens
  Listened by: DashboardScreen

'EVENT_ROUTE_UPDATED'
  Data: { id: string, origin: string, location: string }
  Emitted by: EditEventScreen
  Listened by: DashboardScreen
```

### Navigation State
```
React Navigation Stack:
- AuthStack (Login, Signup)
- MainTabs (Dashboard, Calendar, AddEventTab, Profile)
- Modal Screens:
  - AddEvent
  - EditEvent
  - VoiceEvent
  - PhoneLock
  - JourneyTracking
  - Notifications
  - Settings
  - HelpScreen
```

### Component State
```typescript
DashboardScreen state:
- nextEvent: Event | null
- events: Event[]
- stats: { points, level, currentStreak, punctualityRate, xpForNextLevel }
- currentLocation: Location | null
- notificationCount: number
- refreshing: boolean

AddEventScreen state:
- title, description, location, fromUseCurrent, fromText
- date, time
- calculatedTravelTime: number
- locationPredictions: Prediction[]
- loading: boolean

VoiceEventScreen state:
- messages: Message[]
- eventData: PartialEvent
- isListening: boolean
- isProcessing: boolean
- inputMode: 'voice' | 'text'
- chatHistory: Conversation[]

PhoneLockScreen state:
- event: Event
- countdown: string
- showEmergencyModal: boolean
- emergencyPin: string
- attempts: number
```

---

## Summary

OnTimeHero is a comprehensive event management and punctuality app with the following key technical features:

1. **Multi-platform Authentication**: Email/password and Google Sign-In with profile sync
2. **Intelligent Event Creation**: Manual and AI voice-based with Google Places autocomplete
3. **Smart Notifications**: Travel time-based scheduling with immediate firing for missed prep times
4. **Location Tracking**: Continuous monitoring with arrival detection and journey tracking
5. **Focus Mode**: Phone lock with location-based and time-based auto-unlock
6. **Gamification**: XP/level system with 7 achievements and badge rewards
7. **Real-time Sync**: Local-first with background Firebase and Google Calendar sync
8. **Voice Assistant**: Conversational AI using Google Gemini for natural event creation

The app uses a hybrid storage approach (AsyncStorage + Firestore) for offline-first functionality, event-driven architecture with DeviceEventEmitter for real-time UI updates, and extensive Google API integration for location and calendar features.

---

**End of Specification Document**
