import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, deleteToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBSezYwFmU-5GmcG2WNxTZsn-1TwOzAO28",
  authDomain: "hr-portal-notification.firebaseapp.com",
  projectId: "hr-portal-notification",
  storageBucket: "hr-portal-notification.firebasestorage.app",
  messagingSenderId: "1031147716463",
  appId: "1:1031147716463:web:04fc3edc6eff882ae1329a",
  measurementId: "G-DBG4VYC6RX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging, onMessage, deleteToken };

export const requestForToken = async (vapidKey) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.error("[FCM] Push notifications are not supported in this browser.");
    return null;
  }

  try {
    // 1. Request Permission First
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[FCM] Permission not granted.");
      return null;
    }

    // 2. Ensure Service Worker is registered and active
    let registration = await navigator.serviceWorker.getRegistration("/");

    if (!registration || !registration.active || !registration.active.scriptURL.includes('firebase-messaging-sw.js')) {
      registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/",
      });

      // Wait for the service worker to be installed and active
      let count = 0;
      while (!registration.active && count < 20) {
        await new Promise(r => setTimeout(r, 100));
        count++;
      }
    }

    // 3. Wait for the service worker to be "ready"
    await navigator.serviceWorker.ready;

    // 4. Get Token with a small delay and retry logic
    const fetchToken = async (retry = true) => {
      try {
        // A small delay ensures the push service is initialized
        if (!retry) await new Promise(r => setTimeout(r, 2000));

        if (!registration.active) {
          throw new Error("No active service worker found for push service.");
        }

        return await getToken(messaging, {
          vapidKey: vapidKey,
          serviceWorkerRegistration: registration,
        });
      } catch (err) {
        if (retry && err.name === 'AbortError') {
          // console.warn("[FCM] AbortError detected, clearing token and retrying...");
          try {
            await deleteToken(messaging);
          } catch (delErr) { /* ignore delete error */ }
          return fetchToken(false); // One retry only
        }
        throw err;
      }
    };

    const currentToken = await fetchToken();
    if (currentToken) {
      return currentToken;
    }

    return null;
  } catch (err) {
    // Check for common push service errors
    if (err.message?.includes('push service error') || err.name === 'AbortError') {
      console.error("[FCM] Push service unavailable. EXACT ERROR DETAILS:", err);
    } else {
      console.error("[FCM] Error in requestForToken EXACT ERROR DETAILS:", err);
    }
    return null;
  }
};