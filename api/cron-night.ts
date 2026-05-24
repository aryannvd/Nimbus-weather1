import { GoogleGenAI } from "@google/genai";
import firebaseConfig from '../firebase-applet-config.json';

// Initialize the modern Gemini SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || "d78d4db3-2898-4f81-8bba-c8b5b719ee1b";

export default async function handler(request: any, response: any) {
  console.log('[CronNight] Started cron job trigger');

  const projectId = firebaseConfig.projectId;
  const apiKey = firebaseConfig.apiKey;
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

  try {
    // 1. Fetch all registered users
    const usersUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users?key=${apiKey}`;
    const usersResponse = await fetch(usersUrl);
    
    if (!usersResponse.ok) {
      const errText = await usersResponse.text();
      throw new Error(`Failed to fetch users from Firestore: ${errText}`);
    }

    const usersData = await usersResponse.json();
    const documents = usersData.documents || [];

    const now = new Date();
    let processedCount = 0;
    let sentCount = 0;

    for (const doc of documents) {
      const fields = doc.fields || {};
      const playerId = fields.playerId?.stringValue;
      const timezone = fields.timezone?.stringValue || 'UTC';
      const pushEnabled = fields.alertNightSummaryEnabled?.booleanValue ?? false;
      const mainPushEnabled = fields.playerId?.stringValue ? true : false;

      if (!playerId || !mainPushEnabled || !pushEnabled) {
        continue;
      }

      // Check if it is currently 9 PM (21h) in the user's local timezone
      try {
        const userTimeStr = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          hour12: false
        }).format(now);
        
        const hour = parseInt(userTimeStr, 10);
        processedCount++;

        if (hour !== 21) {
          continue;
        }

        const lat = parseFloat(fields.latitude?.doubleValue || '0');
        const lon = parseFloat(fields.longitude?.doubleValue || '0');
        const cityName = fields.cityName?.stringValue || 'your location';

        if (lat === 0 && lon === 0) {
          continue;
        }

        // 2. Fetch tomorrow's weather forecast (index 1 of daily data)
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
        const weatherResponse = await fetch(weatherUrl);
        if (!weatherResponse.ok) {
          console.warn(`[CronNight] Skipping user ${playerId} because weather fetch failed.`);
          continue;
        }

        const weatherData = await weatherResponse.json();
        const daily = weatherData.daily || {};
        
        // Index 1 corresponds to TOMORROW
        const maxTemp = daily.temperature_2m_max?.[1] ?? 'N/A';
        const minTemp = daily.temperature_2m_min?.[1] ?? 'N/A';
        const precipSum = daily.precipitation_sum?.[1] ?? 0;
        const weatherCode = daily.weather_code?.[1] ?? 0;

        let conditionDesc = 'favorable conditions';
        if (weatherCode >= 1 && weatherCode <= 3) conditionDesc = 'partly cloudy skies';
        else if (weatherCode >= 45 && weatherCode <= 48) conditionDesc = 'fog/mist';
        else if (weatherCode >= 51 && weatherCode <= 57) conditionDesc = 'light drizzle';
        else if (weatherCode >= 61 && weatherCode <= 67) conditionDesc = 'cool rain';
        else if (weatherCode >= 71 && weatherCode <= 77) conditionDesc = 'potential snowfall';
        else if (weatherCode >= 80 && weatherCode <= 82) conditionDesc = 'heavy downpours';
        else if (weatherCode >= 85 && weatherCode <= 86) conditionDesc = 'snowy skies';
        else if (weatherCode >= 95) conditionDesc = 'thunderstorms';

        // 3. Prompt Gemini AI for planning advice
        const prompt = `You are a thoughtful evening weather planner.
Generate a short 2-sentence push notification summarizing tomorrow's weather forecast so the user can easily plan their outfit or travel.
Tomorrow's Details:
City: ${cityName}
Max Temp: ${maxTemp}°C
Min Temp: ${minTemp}°C
Precipitation expected: ${precipSum}mm
Sky conditions: ${conditionDesc}

Rules:
- Give a very practical, gentle planning tip (e.g., grab an umbrella, layer up).
- Keep length under 150 characters to prevent scroll cuts on notifications.
- Respond with only the notification body itself.`;

        const geminiRes = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
        });

        const notifyText = geminiRes.text?.trim() || `Tomorrow in ${cityName}: expected high of ${maxTemp}°C with ${conditionDesc}. Plan entsprechend!`;

        // 4. Send OneSignal push
        const onesignalUrl = 'https://onesignal.com/api/v1/notifications';
        const onesignalBody = {
          app_id: ONESIGNAL_APP_ID,
          include_subscription_ids: [playerId],
          include_player_ids: [playerId],
          headings: { en: "Tomorrow's Weather Outlook 🌙" },
          contents: { en: notifyText }
        };

        const pushResponse = await fetch(onesignalUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
          },
          body: JSON.stringify(onesignalBody)
        });

        if (pushResponse.ok) {
          sentCount++;
          console.log(`[CronNight] Successfully dispatched AI notification to ${playerId}`);
        } else {
          const pushErr = await pushResponse.text();
          console.warn(`[CronNight] OneSignal error for ${playerId}:`, pushErr);
        }
      } catch (userErr) {
        console.error(`[CronNight] Error processing user doc:`, userErr);
      }
    }

    response.status(200).json({
      success: true,
      processed: processedCount,
      sent: sentCount,
      timestamp: now.toISOString()
    });
  } catch (error: any) {
    console.error('[CronNight] Fatal crash:', error);
    response.status(500).json({ error: error.message });
  }
}
