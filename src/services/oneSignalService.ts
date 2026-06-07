import firebaseConfig from '../../firebase-applet-config.json';
import { Settings, Location } from '../types';

declare global {
  interface Window {
    OneSignal?: any;
  }
}

// Get OneSignal App ID from env or a fallback default
const ONESIGNAL_APP_ID = (import.meta.env?.VITE_ONESIGNAL_APP_ID as string) || "d78d4db3-2898-4f81-8bba-c8b5b719ee1b";

/**
 * Checks if Push notifications and Service Workers are supported, and
 * handles sandbox iframe detection to avoid throwing cross-origin security exceptions.
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }
  try {
    // If we are nested in an iframe, avoid executing service worker push logic directly
    // to prevent browser sandbox security exceptions in previews.
    if (window.self !== window.top) {
      return false;
    }
  } catch (e) {
    return false;
  }
  return true;
}

/**
 * Dynamically loads the OneSignal script using script elements in a safe async manner
 */
function loadOneSignalScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.OneSignal) {
      resolve(true);
      return;
    }

    if (!isPushSupported()) {
      console.log('[OneSignal] Push notification APIs not fully supported or restricted in this iframe screen context.');
      resolve(false);
      return;
    }

    try {
      const script = document.createElement('script');
      script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      script.async = true;
      script.crossOrigin = "anonymous";

      script.onload = () => {
        resolve(true);
      };

      script.onerror = (err) => {
        console.warn('[OneSignal] Script load failed:', err);
        resolve(false);
      };

      document.head.appendChild(script);
    } catch (err) {
      console.warn('[OneSignal] Failed to append loader script element:', err);
      resolve(false);
    }
  });
}

/**
 * Ensures safety when calling OneSignal APIs
 */
export function getOneSignal(): any {
  return window.OneSignal || null;
}

/**
 * Initializes OneSignal Web SDK safely and returns subscription state details
 */
export async function initializeOneSignal(onSubscriptionChange?: (playerId: string | null) => void): Promise<string | null> {
  const isLoaded = await loadOneSignalScript();
  if (!isLoaded) {
    return null;
  }

  return new Promise((resolve) => {
    try {
      const OneSignal = getOneSignal();
      if (!OneSignal) {
        console.warn('[OneSignal] SDK not loaded on window.');
        resolve(null);
        return;
      }

      // Safe push helper wrapper to perform setup
      OneSignal.push(async () => {
        try {
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
            notifyButton: {
              enable: false,
            },
          });

          // Get initial user/subscription info
          let playerId: string | null = null;
          if (OneSignal.User?.PushSubscription?.id) {
            playerId = OneSignal.User.PushSubscription.id;
          } else if (typeof OneSignal.getUserId === 'function') {
            playerId = await OneSignal.getUserId();
          }

          // Register listener for subscription changes
          if (OneSignal.User?.PushSubscription?.addEventListener) {
            OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
              const newId = event.current?.id || null;
              if (onSubscriptionChange) {
                onSubscriptionChange(newId);
              }
            });
          }

          resolve(playerId);
        } catch (initErr) {
          console.error('[OneSignal] Init failure:', initErr);
          resolve(null);
        }
      });
    } catch (err) {
      console.warn('[OneSignal] Execution exception:', err);
      resolve(null);
    }
  });
}

/**
 * Triggers permission request prompt and returns the updated playerId
 */
export async function requestNotificationPermission(): Promise<string | null> {
  const isLoaded = await loadOneSignalScript();
  if (!isLoaded) {
    return null;
  }

  return new Promise((resolve) => {
    try {
      const OneSignal = getOneSignal();
      if (!OneSignal) {
        console.warn('[OneSignal] SDK not loaded on window.');
        resolve(null);
        return;
      }

      OneSignal.push(async () => {
        try {
          // Request permission using matching API matching v16 or v15 or v14
          if (OneSignal.Notifications?.requestPermission) {
            await OneSignal.Notifications.requestPermission();
          } else if (OneSignal.showNativePrompt) {
            await OneSignal.showNativePrompt();
          } else if (OneSignal.registerForPushNotifications) {
            await OneSignal.registerForPushNotifications();
          }

          // Fetch playerId post modal consent
          let playerId: string | null = null;
          if (OneSignal.User?.PushSubscription?.id) {
            playerId = OneSignal.User.PushSubscription.id;
          } else if (typeof OneSignal.getUserId === 'function') {
            playerId = await OneSignal.getUserId();
          }

          resolve(playerId);
        } catch (permErr) {
          console.error('[OneSignal] Permission request error:', permErr);
          resolve(null);
        }
      });
    } catch (err) {
      console.warn('[OneSignal] Request execution failure:', err);
      resolve(null);
    }
  });
}

/**
 * Synchronize settings and location definitions to Firebase Firestore `/users`
 */
export async function syncUserSettingsToFirebase(
  playerId: string,
  settings: Settings,
  location: Location | null
): Promise<boolean> {
  const projectId = firebaseConfig.projectId;
  const apiKey = firebaseConfig.apiKey;
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const fields = [
    'playerId',
    'timezone',
    'rainThreshold',
    'snowThreshold',
    'alertRainEnabled',
    'alertSnowEnabled',
    'alertThunderstormEnabled',
    'alertSevereEnabled',
    'alertMorningSummaryEnabled',
    'alertNightSummaryEnabled',
    'latitude',
    'longitude',
    'cityName',
    'countryCode'
  ];

  const updateMaskQuery = fields.map(f => `updateMask.fieldPaths=${f}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${playerId}?${updateMaskQuery}&key=${apiKey}`;

  const body = {
    fields: {
      playerId: { stringValue: playerId },
      timezone: { stringValue: timezone },
      rainThreshold: { integerValue: String(settings.rainThreshold) },
      snowThreshold: { integerValue: String(settings.snowThreshold) },
      alertRainEnabled: { booleanValue: settings.alertRain },
      alertSnowEnabled: { booleanValue: settings.alertDaily },
      alertThunderstormEnabled: { booleanValue: settings.stormThreshold },
      alertSevereEnabled: { booleanValue: settings.alertSevere },
      alertMorningSummaryEnabled: { booleanValue: settings.alertMorningSummary },
      alertNightSummaryEnabled: { booleanValue: settings.alertNightSummary },
      latitude: { doubleValue: location ? location.latitude : 0 },
      longitude: { doubleValue: location ? location.longitude : 0 },
      cityName: { stringValue: location ? location.name : 'Unknown' },
      countryCode: { stringValue: location ? (location.country || '') : '' }
    }
  };

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('[FirebaseSync] Write failed:', errText);
      return false;
    }

    console.log('[FirebaseSync] Settings sync successful for user:', playerId);
    return true;
  } catch (error) {
    console.error('[FirebaseSync] Exception during Firestore sync:', error);
    return false;
  }
}

/**
 * Fetch settings and location definitions from Firebase Firestore `/users`
 */
export async function fetchUserSettingsFromFirebase(
  playerId: string
): Promise<Partial<Settings> | null> {
  const projectId = firebaseConfig.projectId;
  const apiKey = firebaseConfig.apiKey;
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${playerId}?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('[FirebaseFetch] User document not found. This is normal for new users.');
        return null;
      }
      const errText = await response.text();
      console.warn('[FirebaseFetch] Read failed:', errText);
      return null;
    }

    const data = await response.json();
    if (!data.fields) return null;

    const f = data.fields;
    
    const getBool = (field: any) => field?.booleanValue ?? null;
    const getInt = (field: any) => field?.integerValue ? parseInt(field.integerValue, 10) : null;

    const fetchedSettings: Partial<Settings> = {};

    if (getBool(f.alertRainEnabled) !== null) fetchedSettings.alertRain = getBool(f.alertRainEnabled);
    if (getBool(f.alertSnowEnabled) !== null) fetchedSettings.alertDaily = getBool(f.alertSnowEnabled);
    if (getBool(f.alertThunderstormEnabled) !== null) fetchedSettings.stormThreshold = getBool(f.alertThunderstormEnabled);
    if (getBool(f.alertSevereEnabled) !== null) fetchedSettings.alertSevere = getBool(f.alertSevereEnabled);
    if (getBool(f.alertMorningSummaryEnabled) !== null) fetchedSettings.alertMorningSummary = getBool(f.alertMorningSummaryEnabled);
    if (getBool(f.alertNightSummaryEnabled) !== null) fetchedSettings.alertNightSummary = getBool(f.alertNightSummaryEnabled);
    if (getInt(f.rainThreshold) !== null) fetchedSettings.rainThreshold = getInt(f.rainThreshold);
    if (getInt(f.snowThreshold) !== null) fetchedSettings.snowThreshold = getInt(f.snowThreshold);

    console.log('[FirebaseFetch] Mapped settings from firestore:', fetchedSettings);
    return fetchedSettings;
  } catch (error) {
    console.error('[FirebaseFetch] Exception during Firestore fetch:', error);
    return null;
  }
}
