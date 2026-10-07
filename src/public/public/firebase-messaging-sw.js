importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB2FqomNgqJwQJNxKqXKPIessMxZDOec7o",
  authDomain: "hr-portal-6bae6.firebaseapp.com",
  projectId: "hr-portal-6bae6",
  messagingSenderId: "965693951481",
  appId: "1:965693951481:web:912720473ecd40164d0128",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
  });
});