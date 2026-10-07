importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBSezYwFmU-5GmcG2WNxTZsn-1TwOzAO28",
  authDomain: "hr-portal-notification.firebaseapp.com",
  projectId: "hr-portal-notification",
  storageBucket: "hr-portal-notification.firebasestorage.app",
  messagingSenderId: "1031147716463",
  appId: "1:1031147716463:web:04fc3edc6eff882ae1329a",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
  });
});