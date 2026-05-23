import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';

// Utility to convert Base64 URL-safe string to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      
      // Register service worker
      navigator.serviceWorker.register('/sw.js').then(
        (reg) => {
          console.log('Service Worker registered', reg);
          // Check if already subscribed
          reg.pushManager.getSubscription().then((sub) => {
            if (sub) setIsSubscribed(true);
          });
        },
        (err) => console.error('Service Worker registration failed', err)
      );
    }
  }, []);

  const subscribeToPush = async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported by your browser');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      // Ensure we don't already have a subscription
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!publicVapidKey) {
          console.error('VITE_VAPID_PUBLIC_KEY is not defined in frontend .env');
          toast.error('Configuration error. Cannot enable push.');
          return;
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
        });
      }

      // Send the subscription to the backend
      await api.post('/push/subscribe', { subscription });
      
      setIsSubscribed(true);
      toast.success('Push notifications enabled!');
    } catch (err: any) {
      console.error('Error subscribing to push:', err);
      toast.error('Failed to enable push notifications');
    }
  };

  return { isSupported, isSubscribed, subscribeToPush };
}
