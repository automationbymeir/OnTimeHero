# OnTimeHero - Notification & Dashboard Flow Documentation

## Overview
This document explains how notifications and the dashboard work together to keep you on time for your events.

---

## 🔔 Notification System

### How Notifications Are Scheduled

When you create an event (via Voice Assistant, Add Event screen, or Google Calendar sync), the app schedules **TWO types of notifications**:

#### 1. 📅 "Get Ready" Notification
- **When it fires**: `(Departure Time - Prep Time)`
- **Purpose**: Gives you time to prepare before you need to leave
- **Default prep time**: 30 minutes (can be changed in Settings under `reminder1Minutes`)
- **Example**: If you need to leave at 2:40 PM, this fires at 2:10 PM (30 min before)

#### 2. ⏰ "Time to Leave NOW!" Notification
- **When it fires**: `Departure Time` (Event Time - Travel Time)
- **Purpose**: Alerts you when it's time to leave to arrive on time
- **Travel time calculation**:
  - Uses **Google Maps** real-time traffic data when location is provided
  - Falls back to **15 minutes** if no location or Maps unavailable
- **Example**: If event is at 3:00 PM and travel time is 20 minutes, this fires at 2:40 PM

### Notification Channel Configuration

The app uses three notification channels with different priorities:

| Channel | Name | Priority | Use Case |
|---------|------|----------|----------|
| `time-to-leave` | Time to Leave | **Highest (5)** | Critical departure alerts |
| `reminders` | Event Reminders | High (4) | Get ready reminders |
| `achievements` | Achievements | Medium (3) | Badges, streaks, XP |

### Smart Notification Logic

#### For Past Events
If you create an event where the "get ready" time has already passed but departure time is still in the future:
- ✅ "Get Ready" notification fires **immediately** (3 seconds)
- ✅ "Time to Leave" notification still fires at departure time

If departure time passed within the last 5 minutes:
- ✅ "Time to Leave" notification fires **immediately** (6 seconds)

If departure time passed more than 5 minutes ago:
- ⏭️ Notifications are skipped (you're already late)

---

## 📱 Dashboard Card System

### NextEventCard - The Red Alert System

The main event card on your dashboard changes color based on urgency:

#### 🟣 Purple State (Normal)
- **When**: More than 5 minutes until departure time
- **Display**: Shows countdown timer "Leave in X hours Y minutes"
- **Meaning**: You have time, no rush yet

#### 🔴 Red State (URGENT!)
- **When**: 5 minutes or less until departure time, OR time to leave now
- **Display**: 
  - Shows "Leave now!" if past departure time
  - Shows "Leave in X minutes" if within 5 minutes
  - Has "TIME TO GO!" badge
  - White border for extra visibility
- **Action**: Shows "I'm Leaving Now! 🏃" button

#### 🟢 Green State (Completed - On Time)
- **When**: Event completed and you arrived on time
- **Display**: Shows "ARRIVED ON TIME!" with checkmark
- **Reward**: Shows "+50 XP earned!"

#### 🟠 Orange State (Completed - Late)
- **When**: Event completed but you arrived late
- **Display**: Shows "ARRIVED LATE" with clock icon

### Card Updates

The dashboard card updates **automatically**:
- ⏱️ **Every second**: Timer countdown updates
- 🔄 **Every 30 seconds**: Dashboard auto-refreshes to check for new events
- 📲 **On app foreground**: Immediately refreshes when you open the app
- 🎯 **On navigation focus**: Refreshes when you navigate to Dashboard screen

### Travel Time Calculation

The card displays real-time travel information:
- 📍 **From**: Current location (auto-detected) or specified origin
- 🎯 **To**: Event location
- 🚗 **Travel Time**: Calculated from Google Maps with traffic data
- 🔄 **Updates**: Recalculates every 5 minutes to account for traffic changes

---

## 🔄 Complete Event Flow

### 1. Event Creation
```
User creates event →
├─ Event saved to local storage
├─ Event synced to Firestore (background)
├─ Event created in Google Calendar (background)
└─ Notifications scheduled immediately
```

### 2. Dashboard Loading
```
Dashboard loads →
├─ Loads events from Firestore
├─ Loads events from local storage
├─ Merges and deduplicates events
├─ Finds next upcoming event
├─ Schedules notifications for all future events
└─ Updates NextEventCard every second
```

### 3. Notification Flow
```
Current Time reaches Notification Time →
├─ Notification appears in system tray
├─ Notification saved to app history
├─ User can tap notification to view event
└─ Dashboard card shows RED if within 5 minutes
```

### 4. Leave Time Detection
```
Every second, NextEventCard checks:
├─ Calculate: leaveTime = eventTime - travelTime
├─ Calculate: diff = leaveTime - currentTime
├─ If diff <= 0: RED card, "Leave now!"
├─ If diff <= 5 minutes: RED card, "Leave in X minutes"
└─ If diff > 5 minutes: PURPLE card, countdown timer
```

### 5. Event Completion
```
User clicks "I'm Leaving Now!" →
├─ Navigate to Journey Tracking
├─ GPS tracking starts
├─ Distance to destination monitored
├─ Arrival detected when within 50 meters
├─ Calculate if on-time based on event start time
├─ Award 50 XP if on-time
├─ Update event status to "completed"
├─ Show completion card (green/orange) for 3 seconds
└─ Switch to next upcoming event
```

---

## 🐛 Troubleshooting

### Notifications Not Appearing

**Check these in order:**

1. **Notification Permissions**
   - Go to device Settings → Apps → OnTimeHero → Notifications
   - Ensure all notification channels are enabled
   - In-app: Dashboard → Settings → Test Notifications

2. **Event Has Location**
   - Events need a location for proper travel time calculation
   - Without location, defaults to 15 minutes travel time

3. **Event Is In The Future**
   - Notifications only schedule for future events
   - If event time passed, notifications won't fire

4. **Check Console Logs**
   - Look for: `📅 ========== SCHEDULING NOTIFICATIONS ==========`
   - Check if notifications were created: `✅ "Time to Leave" notification CREATED successfully`
   - Verify scheduled time matches expectations

### Dashboard Card Not Turning Red

**Check these:**

1. **Event Timing**
   - Card only turns red when: `currentTime >= (eventTime - travelTime - 5 minutes)`
   - Verify travel time is calculated correctly
   - Check console logs: `⏰ NextEventCard timer:`

2. **Auto-Refresh**
   - Dashboard auto-refreshes every 30 seconds
   - Pull down to force refresh
   - Navigate away and back to trigger update

3. **Travel Time**
   - Default is 15 minutes if no location
   - With location, Google Maps calculates actual travel time
   - Travel time updates every 5 minutes

### Debugging Commands

To debug notifications, check logs for these patterns:

```javascript
// When event is created
"📲 About to schedule notifications with event data"
"✅ Event saved to local storage successfully"

// When notifications are scheduled
"📅 ========== SCHEDULING NOTIFICATIONS =========="
"📅 Event: [Event Title]"
"📅 Travel time: X minutes"
"✅ "Get Ready" notification CREATED successfully"
"✅ "Time to Leave" notification CREATED successfully"

// When dashboard loads
"📅 Scheduling notifications for: [Event Title]"
"📅 Skipping notification scheduling for: [Event Title] (future=false, notCompleted=true)"

// When card updates
"⏰ NextEventCard timer:"
"🔴 Card should be RED - Leave now!"
```

---

## ⚙️ Configuration Settings

### User Preferences (AsyncStorage)

| Key | Description | Default | Location |
|-----|-------------|---------|----------|
| `reminder1Minutes` | Prep time before departure | 30 | Settings Screen |
| `phoneLockEnabled` | Enable phone lock feature | true | Settings Screen |
| `localEvents` | Locally stored events | [] | Auto-managed |
| `userNotifications` | Notification history | [] | Auto-managed |

### Hard-coded Defaults

| Setting | Value | Location |
|---------|-------|----------|
| Default travel time | 15 minutes | NotificationService.js:281 |
| Default prep time | 30 minutes | NotificationService.js:289 |
| Red card threshold | 5 minutes | NextEventCard.js:155 |
| Dashboard refresh interval | 30 seconds | DashboardScreen.js:69 |
| Travel time refresh interval | 5 minutes | NextEventCard.js:99 |

---

## 🔧 Recent Fixes Applied

### Issue 1: Notifications Not Scheduled Correctly
**Problem**: DashboardScreen was using incorrect logic `event.status === 'upcoming' || event.status !== 'completed'` which is always true except for completed events, causing notifications to be scheduled for all events including past ones.

**Fix**: Changed to:
```javascript
const isFutureEvent = eventTime > now;
const isNotCompleted = event.status !== 'completed';
if (isFutureEvent && isNotCompleted) {
  // Schedule notifications
}
```

### Issue 2: Dashboard Card Not Turning Red
**Problem**: The `isTimeToGo` state wasn't being set to `false` in some branches, causing the card to remain red inappropriately.

**Fix**: Added explicit `setIsTimeToGo(false)` in all non-urgent branches:
```javascript
} else if (diff < 60) {
  setTimeToLeave(`Leave in ${diff} minutes`);
  if (diff <= 5) {
    setIsTimeToGo(true);  // RED
  } else {
    setIsTimeToGo(false); // PURPLE (FIXED)
  }
}
```

### Issue 3: Missing Travel Time Data
**Problem**: Travel time might not be passed correctly from event creation to notification scheduling.

**Fix**: Added comprehensive logging at every step:
- Event creation logs travel time
- Notification scheduling logs received travel time
- Warns if travel time is missing
- Verifies scheduled notifications after creation

---

## 📊 Data Flow Diagram

```
┌─────────────────┐
│  User Creates   │
│     Event       │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  1. Calculate Travel Time           │
│     - Google Maps API call          │
│     - Current location → Event loc  │
│     - Returns: duration & distance  │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  2. Save Event Data                 │
│     - Local Storage (immediate)     │
│     - Firestore (background)        │
│     - Google Calendar (background)  │
│     WITH: travelTime field          │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  3. Schedule Notifications          │
│     - Get Ready: eventTime -        │
│       travelTime - prepTime         │
│     - Time to Leave: eventTime -    │
│       travelTime                    │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  4. Dashboard Displays              │
│     - Load event with travelTime    │
│     - Calculate leave time          │
│     - Update every second           │
│     - Turn RED when time comes      │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  5. Notification Fires              │
│     - At scheduled time             │
│     - System notification appears   │
│     - Dashboard updates if open     │
└─────────────────────────────────────┘
```

---

## 🎯 Expected Behavior Example

**Scenario**: Creating an event for 3:00 PM with 20-minute travel time

### Timeline:
| Time | Event | Dashboard Card | Notification |
|------|-------|----------------|--------------|
| 1:30 PM | Event created | Purple: "Leave in 1h 10m" | Scheduled ✅ |
| 2:10 PM | Prep time reached | Purple: "Leave in 30m" | 📅 "Get Ready!" fires |
| 2:35 PM | 5 min to departure | **RED**: "Leave in 5 minutes" | - |
| 2:40 PM | Departure time | **RED**: "Leave now!" | ⏰ "Time to Leave NOW!" fires |
| 3:00 PM | Event starts | **RED**: "Leave now!" (if not completed) | - |
| 3:05 PM | Arrived on time | **GREEN**: "ARRIVED ON TIME!" | 🎉 +50 XP |

---

## 📞 Support

If you're still experiencing issues:

1. Check the device logs for the patterns mentioned in "Debugging Commands"
2. Test notifications using the "Test Notifications" button in Dashboard
3. Verify event has all required fields: title, date, time, location
4. Ensure travel time was calculated (check logs for "Travel time: X minutes")
5. Pull down on Dashboard to force refresh

---

## ✅ Checklist for Creating Events

To ensure notifications work properly:

- [ ] Event has a **title**
- [ ] Event has a **date** and **time** in the future
- [ ] Event has a **location** (for accurate travel time)
- [ ] Location is a valid address recognized by Google Maps
- [ ] Notification permissions are enabled
- [ ] Device is not in Do Not Disturb mode
- [ ] App has location permissions (for current location origin)

---

## 🎓 Key Concepts

### Departure Time vs Event Time
- **Event Time**: When the event starts (e.g., 3:00 PM)
- **Departure Time**: When you need to leave to arrive on time (e.g., 2:40 PM)
- **Formula**: `Departure Time = Event Time - Travel Time`

### Travel Time Sources
1. **Google Maps API** (preferred): Real-time with traffic
2. **Default (15 min)**: Used when:
   - No location provided
   - Google Maps API unavailable
   - Location too short/invalid

### Card Color Logic
- **Purple**: Normal state, plenty of time
- **Red**: Urgent! Leave within 5 minutes or now
- **Green**: Completed successfully, on time
- **Orange**: Completed but arrived late

---

*Last Updated: After fixing notification scheduling and dashboard card issues*
*Version: 1.0*






