// Use v1 compat API to keep existing Firestore trigger code working
const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// ---- Genkit parsing endpoint ----
const cors = require('cors')({ origin: true });
let genkitLoaded = false;
let ai; // genkit instance
try {
  const { genkit } = require('genkit');
  const { googleAI } = require('@genkit-ai/googleai');
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || (functions.config().genai && functions.config().genai.key);
  const keyPresent = !!apiKey;
  console.log('Genkit init: keyPresent=', keyPresent, 'model=', 'googleai/gemini-2.0-flash');
  if (!apiKey) {
    console.log('GOOGLE_GENAI_API_KEY not set; Genkit will be disabled.');
  } else {
    ai = genkit({ plugins: [googleAI({ apiKey })] });
    genkitLoaded = true;
  }
} catch (e) {
  console.log('Genkit init error:', e?.message);
}

const PARSE_PROMPT = `You are a strict JSON parser for calendar events.
Extract: title, description, origin, location, date (YYYY-MM-DD), time (HH:mm, 24h).
If unknown, return empty string. Return ONLY JSON without extra text.`;

const FIELD_PROMPTS = {
  title: `Extract ONLY the event title/name from the user's response. Remove conversational phrases like "set the title to", "it's called", "make it", etc. Return just the clean title. Examples:
  - "set the title to meeting with John" -> "Meeting with John"
  - "call it quarterly planning" -> "Quarterly planning"
  - "it's a team standup" -> "Team standup"
  Return ONLY the extracted title text, nothing else.`,

  description: `Extract ONLY the event description from the user's response. Remove conversational phrases like "it's about", "regarding", "the description is", etc. Return just the clean description. Examples:
  - "it's about the quarterly budget review" -> "The quarterly budget review"
  - "discussing project timeline" -> "Discussing project timeline"
  - "this is for planning next month" -> "For planning next month"
  Return ONLY the extracted description text, nothing else.`,

  location: `Extract ONLY the location from the user's response. Remove conversational phrases like "it's at", "located at", "in", "at", articles like "the", etc. Return just the clean location name. Examples:
  - "it's at the office" -> "Office"
  - "in Jerusalem" -> "Jerusalem"
  - "at the conference room" -> "Conference room"
  Return ONLY the extracted location text, nothing else.`,
};

exports.parseEventWithGenkit = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
      }
      const userText = (req.body && req.body.text) || '';
      const fieldType = req.body.fieldType; // 'title', 'description', 'location', or undefined for full parsing
      
      // NEW: Conversational mode parameters
      const conversationMode = req.body.conversationMode || false;
      const conversationHistory = req.body.conversationHistory || [];
      const currentEventData = req.body.currentEventData || {};
      const userLanguage = req.body.userLanguage || 'en';
      
      if (!userText) return res.status(400).json({ error: 'text is required' });

      if (!genkitLoaded) {
        // Fallback simple parser if Genkit not loaded (local emulator/dev)
        if (conversationMode) {
          return res.json({
            response: "I'm having trouble right now. Could you try again?",
            extractedData: {},
            isComplete: false,
            needsConfirmation: false
          });
        }
        if (fieldType) {
          return res.json({ value: fallbackFieldParse(userText, fieldType) });
        }
        const parsed = fallbackParse(userText);
        return res.json(parsed);
      }

      // NEW: Handle conversational mode
      if (conversationMode) {
        const response = await handleConversationalMode(
          userText,
          conversationHistory,
          currentEventData,
          userLanguage,
          ai
        );
        return res.json(response);
      }

      // Field-specific parsing
      if (fieldType && FIELD_PROMPTS[fieldType]) {
        const prompt = `${FIELD_PROMPTS[fieldType]}\n\nUser's response: "${userText}"\n\nExtracted ${fieldType}:`;
        const result = await ai.generate({
          model: 'googleai/gemini-2.0-flash',
          prompt,
          temperature: 0.1,
        });
        let extracted = result.text.trim();
        // Remove quotes if AI added them
        extracted = extracted.replace(/^["']|["']$/g, '');
        return res.json({ value: extracted });
      }

      // Full event parsing
      const prompt = `${PARSE_PROMPT}\n\nText: "${userText}"\nJSON:`;
      const result = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt,
        temperature: 0.2,
      });
        let parsed;
        try {
          parsed = JSON.parse(result.text);
        } catch (_e) {
          return res.status(422).json({ error: 'LLM returned non-JSON output' });
        }
        const clean = normalizeParsed(parsed, userText);
        return res.json(clean);
    } catch (e) {
      console.error('parseEventWithGenkit error', e);
      return res.status(500).json({ error: 'parse-failed', response: "I'm having trouble right now. Could you try again?" });
    }
  });
});

// Temporary alias to allow deploying a fresh function name if updates are blocked
exports.parseEventWithGenkitV2 = exports.parseEventWithGenkit;

function normalizeParsed(parsed, fallbackText) {
  return {
    title: parsed?.title || 'New Event',
    description: parsed?.description || fallbackText || '',
    origin: parsed?.origin || '',
    location: parsed?.location || '',
    date: parsed?.date || '',
    time: parsed?.time || '',
  };
}

function fallbackFieldParse(text, fieldType) {
  const lower = text.toLowerCase();
  let cleaned = text;

  switch (fieldType) {
    case 'title':
      cleaned = text.replace(/^(set|make|put|change)?\s*(the|this|it)?\s*(title|name|event)?\s*(is|to|be|as)?\s*/i, '').trim();
      cleaned = cleaned.replace(/^(it'?s|its|call it|name it)\s+/i, '').trim();
      break;
    case 'location':
      cleaned = text.replace(/^(it'?s|its|this is)?\s*(at|in|to|located at)?\s*/i, '').trim();
      cleaned = cleaned.replace(/^(the|a|an)\s+/i, '').trim();
      break;
    case 'description':
      cleaned = text.replace(/^(it'?s|its|this is)?\s*(about|regarding|for)?\s*/i, '').trim();
      break;
  }

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned || text;
}

function fallbackParse(text) {
  try {
    const lower = (text || '').toLowerCase();
    const m = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    let hour = 9, minute = 0; if (m){ hour=parseInt(m[1]); minute=m[2]?parseInt(m[2]):0; const ap=m[3]; if(ap==='pm'&&hour<12)hour+=12; if(ap==='am'&&hour===12)hour=0; }
    const time = `${hour.toString().padStart(2,'0')}:${minute.toString().padStart(2,'0')}`;
    let dateStr = new Date(); if (lower.includes('tomorrow')) { const d=new Date(); d.setDate(d.getDate()+1); dateStr=d; }
    const yyyy = dateStr.getFullYear(); const mm = String(dateStr.getMonth()+1).padStart(2,'0'); const dd = String(dateStr.getDate()).padStart(2,'0');
    const atIdx = lower.lastIndexOf(' at '); const location = atIdx!==-1 ? text.substring(atIdx+4).trim() : '';
    let title = 'New Event'; const withIdx = lower.indexOf('with '); if(withIdx!==-1){ const name=text.substring(withIdx+5).split(' at ')[0].trim(); title = `Meeting with ${name}`; }
    return { title, description: '', origin: '', location, date: `${yyyy}-${mm}-${dd}`, time };
  } catch (_e) { return { title: 'New Event', description: '', origin: '', location: '', date: '', time: '' }; }
}

// NEW: Conversational mode handler
async function handleConversationalMode(message, history, currentData, language, ai) {
  const systemPrompt = buildConversationalPrompt(currentData, language);
  
  // Build conversation for Gemini
  const conversationText = history.map((msg) => 
    `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
  ).join('\n') + `\nUser: ${message}\nAssistant:`;

  const result = await ai.generate({
    model: 'googleai/gemini-2.0-flash',
    prompt: `${systemPrompt}\n\nCONVERSATION:\n${conversationText}`,
    config: {
      temperature: 0.7,
      maxOutputTokens: 500,
    }
  });

  const text = result.text;

  // Parse JSON from response
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/) || text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      const jsonText = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonText);
    }
  } catch (e) {
    console.log('JSON parse error:', e);
  }

  // Fallback response
  return {
    response: text,
    extractedData: {},
    isComplete: false,
    needsConfirmation: false
  };
}

function buildConversationalPrompt(currentData, language) {
  const langMap = {
    'en': {
      lang: 'English',
      example: 'When would you like to schedule it?'
    },
    'he': {
      lang: 'Hebrew', 
      example: 'מתי תרצה לקבוע את זה?'
    },
    'de': {
      lang: 'German',
      example: 'Wann möchten Sie es planen?'
    }
  };

  const langConfig = langMap[language] || langMap['en'];
  
  // Get current date and time
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }); // Monday, Tuesday, etc.
  const currentDateTime = now.toLocaleString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `You are a helpful voice assistant for OnTimeHero calendar app. Respond in ${langConfig.lang}.

CURRENT DATE AND TIME:
- Today is ${currentDateTime}
- Current date: ${currentDate} (${currentDay})
- Current time: ${currentTime}

CURRENT EVENT DATA:
${JSON.stringify(currentData, null, 2)}

INSTRUCTIONS:
1. Help create calendar events through natural conversation
2. Extract: title, date, time, location, description, participants
3. Keep responses SHORT (1-2 sentences) - this is voice!
4. Ask ONE clarifying question at a time if needed
5. When you have title + date + time, ask for confirmation
6. If user confirms (yes/okay/correct), set confirmed=true
7. Handle schedule queries like "what's my schedule today" or "what do I have today"
8. For schedule queries, set isScheduleQuery=true and provide a helpful response
9. Handle leave time queries like "when should I leave" or "when should I get ready"
10. For leave time queries, set isLeaveTimeQuery=true and provide a helpful response

RESPONSE FORMAT (return valid JSON):
{
  "response": "Your short conversational reply",
  "extractedData": {
    "title": "string or empty",
    "date": "YYYY-MM-DD or empty",
    "time": "HH:MM or empty", 
    "location": "string or empty",
    "description": "string or empty",
    "participants": []
  },
  "isComplete": true if have title+date+time,
  "needsConfirmation": true if ready to confirm,
  "confirmed": true only if user confirmed,
  "isScheduleQuery": true if user asks about their schedule,
  "isLeaveTimeQuery": true if user asks when to leave or get ready
}

EXAMPLES:

User: "meeting tomorrow at 3pm"
{
  "response": "Got it! Meeting tomorrow at 3 PM. What's it about?",
  "extractedData": {
    "title": "Meeting",
    "date": "${currentDate}",
    "time": "15:00"
  },
  "isComplete": false,
  "needsConfirmation": false
}

User: "Q4 planning"
{
  "response": "Perfect! Q4 planning meeting tomorrow at 3 PM. Where should I set it?",
  "extractedData": {
    "title": "Q4 Planning",
    "date": "${currentDate}",
    "time": "15:00"
  },
  "isComplete": false,
  "needsConfirmation": false
}

User: "conference room A"
{
  "response": "Great! Q4 planning tomorrow at 3 PM in conference room A. Should I create this?",
  "extractedData": {
    "title": "Q4 Planning",
    "date": "${currentDate}",
    "time": "15:00",
    "location": "Conference Room A"
  },
  "isComplete": true,
  "needsConfirmation": true
}

User: "yes"
{
  "response": "Done! Your event is created.",
  "extractedData": {},
  "isComplete": true,
  "needsConfirmation": false,
  "confirmed": true
}

User: "what's my schedule today"
{
  "response": "Let me check your schedule for today.",
  "extractedData": {},
  "isComplete": false,
  "needsConfirmation": false,
  "isScheduleQuery": true
}

User: "when should I leave"
{
  "response": "Let me check your next event and calculate when you should leave.",
  "extractedData": {},
  "isComplete": false,
  "needsConfirmation": false,
  "isLeaveTimeQuery": true
}

Keep it natural and conversational!`;
}

// Function to check and award badges
exports.checkAchievements = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const userId = context.params.userId;

    // Check streak achievements
    if (after.currentStreak > before.currentStreak) {
      await checkStreakBadges(userId, after.currentStreak);
    }

    // Check punctuality achievements
    if (after.punctualityScore > before.punctualityScore) {
      await checkPunctualityBadges(userId, after.punctualityScore);
    }

    // Check total events achievements
    if (after.totalEvents > before.totalEvents) {
      await checkEventBadges(userId, after.totalEvents);
    }
  });

async function checkEventBadges(userId, totalEvents) {
  const badges = [
    { events: 1, badgeId: 'event_1', name: 'First Mission', xp: 25 },
    { events: 10, badgeId: 'event_10', name: 'Seasoned Hero', xp: 150 },
    { events: 50, badgeId: 'event_50', name: 'OnTime Legend', xp: 500 },
  ];

  for (const badge of badges) {
    if (totalEvents >= badge.events) {
      await awardBadge(userId, badge);
    }
  }
}

async function checkStreakBadges(userId, streak) {
  const badges = [
    { streak: 3, badgeId: 'streak_3', name: '3 Day Streak', xp: 50 },
    { streak: 7, badgeId: 'streak_7', name: 'Week Warrior', xp: 100 },
    { streak: 14, badgeId: 'streak_14', name: 'Fortnight Fighter', xp: 200 },
    { streak: 30, badgeId: 'streak_30', name: 'Monthly Master', xp: 500 },
  ];

  for (const badge of badges) {
    if (streak >= badge.streak) {
      await awardBadge(userId, badge);
    }
  }
}

async function checkPunctualityBadges(userId, score) {
  const badges = [
    { score: 80, badgeId: 'punctual_80', name: 'Reliable', xp: 100 },
    { score: 90, badgeId: 'punctual_90', name: 'Time Champion', xp: 200 },
    { score: 95, badgeId: 'punctual_95', name: 'Chronometer', xp: 300 },
    { score: 100, badgeId: 'punctual_100', name: 'Perfect Timer', xp: 500 },
  ];

  for (const badge of badges) {
    if (score >= badge.score) {
      await awardBadge(userId, badge);
    }
  }
}

async function awardBadge(userId, badge) {
  // Check if badge already awarded
  const existing = await db.collection('achievements')
    .where('userId', '==', userId)
    .where('badgeId', '==', badge.badgeId)
    .get();

  if (existing.empty) {
    // Award badge
    await db.collection('achievements').add({
      userId,
      badgeId: badge.badgeId,
      name: badge.name,
      unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
      xpEarned: badge.xp,
    });

    // Update user XP
    await db.collection('users').doc(userId).update({
      xp: admin.firestore.FieldValue.increment(badge.xp),
      totalXP: admin.firestore.FieldValue.increment(badge.xp),
      badgeCount: admin.firestore.FieldValue.increment(1),
    });

    // Send achievement notification
    await sendAchievementNotification(userId, badge);
  }
}

async function sendAchievementNotification(userId, badge) {
  const userDoc = await db.collection('users').doc(userId).get();
  const fcmToken = userDoc.data()?.fcmToken;

  if (fcmToken) {
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: '🏆 Achievement Unlocked!',
        body: `You earned the "${badge.name}" badge! +${badge.xp} XP`,
      },
      data: {
        type: 'achievement',
        badgeId: badge.badgeId,
      },
    });
  }
}

// Scheduled function to send reminders
exports.sendEventReminders = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const in30Minutes = new admin.firestore.Timestamp(
      now.seconds + 1800,
      now.nanoseconds
    );

    // Find events starting in the next 30 minutes
    const eventsSnapshot = await db.collection('events')
      .where('startTime', '>', now)
      .where('startTime', '<', in30Minutes)
      .where('reminderSent', '==', false)
      .get();

    const batch = db.batch();
    const notifications = [];

    eventsSnapshot.forEach(doc => {
      const event = doc.data();
      
      // Mark reminder as sent
      batch.update(doc.ref, { reminderSent: true });

      // Prepare notification
      notifications.push(sendEventReminder(event));
    });

    await batch.commit();
    await Promise.all(notifications);
  });

async function sendEventReminder(event) {
  const userDoc = await db.collection('users').doc(event.userId).get();
  const fcmToken = userDoc.data()?.fcmToken;

  if (fcmToken) {
    const travelTime = event.travelTime || 15;
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: '⏰ Time to Leave Soon!',
        body: `Leave in ${travelTime} minutes for ${event.title}`,
      },
      data: {
        type: 'time-to-leave',
        eventId: event.id,
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'alarm',
          priority: 'max',
          vibrateTimingsMillis: [0, 500, 200, 500],
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'alarm.caf',
            badge: 1,
          },
        },
      },
    });
  }
}
