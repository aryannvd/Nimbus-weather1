import firebaseConfig from '../firebase-applet-config.json';

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || "d78d4db3-2898-4f81-8bba-c8b5b719ee1b";

export default async function handler(request: any, response: any) {
  // Prevent GET requests from anyone if we want, but Vercel Cron sends a simple request
  console.log('[CronMorning] Started cron job trigger');

  const projectId = firebaseConfig.projectId;
  const apiKey = firebaseConfig.apiKey;
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

  try {
    // 1. Fetch all registered users from Firestore
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
      const pushEnabled = fields.alertMorningSummaryEnabled?.booleanValue ?? false;
      const mainPushEnabled = fields.playerId?.stringValue ? true : false; // push is enabled if subscription is connected

      if (!playerId || !mainPushEnabled || !pushEnabled) {
        continue;
      }

      // Check if it is currently 8 AM in the user's local timezone
      try {
        const userTimeStr = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          hour12: false
        }).format(now);
        
        const hour = parseInt(userTimeStr, 10);
        processedCount++;

        if (hour !== 8) {
          // Skip users unless it is 8 AM local time
          continue;
        }

        const lat = parseFloat(fields.latitude?.doubleValue || '0');
        const lon = parseFloat(fields.longitude?.doubleValue || '0');
        const cityName = fields.cityName?.stringValue || 'your location';

        if (lat === 0 && lon === 0) {
          continue;
        }

        // 2. Fetch specific weather forecast for this user
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
        const weatherResponse = await fetch(weatherUrl);
        if (!weatherResponse.ok) {
          console.warn(`[CronMorning] Skipping user ${playerId} because weather fetch failed.`);
          continue;
        }

        const weatherData = await weatherResponse.json();
        const daily = weatherData.daily || {};
        const maxTemp = daily.temperature_2m_max?.[0] ?? 'N/A';
        const minTemp = daily.temperature_2m_min?.[0] ?? 'N/A';
        const precipSum = daily.precipitation_sum?.[0] ?? 0;
        const weatherCode = daily.weather_code?.[0] ?? 0;

        // Interpret weather code representation
        let conditionDesc = 'clear conditions';
        if (weatherCode >= 1 && weatherCode <= 3) conditionDesc = 'partly cloudy sky';
        else if (weatherCode >= 45 && weatherCode <= 48) conditionDesc = 'fog and mist';
        else if (weatherCode >= 51 && weatherCode <= 57) conditionDesc = 'drizzle';
        else if (weatherCode >= 61 && weatherCode <= 67) conditionDesc = 'showers of rain';
        else if (weatherCode >= 71 && weatherCode <= 77) conditionDesc = 'snowfall';
        else if (weatherCode >= 80 && weatherCode <= 82) conditionDesc = 'rain showers';
        else if (weatherCode >= 85 && weatherCode <= 86) conditionDesc = 'snow showers';
        else if (weatherCode >= 95) conditionDesc = 'risk of thunderstorms';

        // 3. Generate a deterministic template-based morning weather summary for today
        let notifyText = `Good morning! Expected high of ${maxTemp}°C and low of ${minTemp}°C in ${cityName} today with ${conditionDesc}.`;
        if (precipSum > 0) {
          notifyText += ` Keep an umbrella handy, as ${precipSum}mm of precipitation is expected.`;
        } else {
          notifyText += ` Enjoy your beautiful day!`;
        }

        // 4. Send OneSignal Push Notification targeting player ID
        const onesignalUrl = 'https://onesignal.com/api/v1/notifications';
        const onesignalBody = {
          app_id: ONESIGNAL_APP_ID,
          include_subscription_ids: [playerId],
          include_player_ids: [playerId],
          headings: { en: "Morning Weather Report ☀️" },
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
          console.log(`[CronMorning] Successfully dispatched AI notification to ${playerId}`);
        } else {
          const pushErr = await pushResponse.text();
          console.warn(`[CronMorning] OneSignal error for ${playerId}:`, pushErr);
        }
      } catch (userErr: any) {
        console.error(`[CronMorning] Error processing subscription document:`, userErr);
      }
    }

    response.status(200).json({
      success: true,
      processed: processedCount,
      sent: sentCount,
      timestamp: now.toISOString()
    });
  } catch (error: any) {
    console.error('[CronMorning] Fatal execution crash:', error);
    response.status(500).json({ error: error.message });
  }
}
