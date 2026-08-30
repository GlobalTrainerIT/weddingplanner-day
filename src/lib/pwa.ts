import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const installedHandler = () => {
      setInstalled(true);
      setCanInstall(false);
      deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    deferredPrompt = null;
    setCanInstall(false);
  }, []);

  return { canInstall, installed, promptInstall };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  return isOnline;
}

// ============================================================
// Push notification permission + subscription
// ============================================================

const DECLINE_KEY = 'vow_push_declined_at';
const COOLDOWN_DAYS = 30;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

/**
 * The primer — never call the browser permission API cold.
 * Call `prime()` to show the soft primer UI. Only after the user
 * explicitly agrees do we call `requestPermission()`.
 *
 * If the user declines the primer or the browser permission,
 * we record the timestamp and don't ask again for 30 days.
 */
export function usePushPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [showPrimer, setShowPrimer] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);

  useEffect(() => {
    const declinedAt = localStorage.getItem(DECLINE_KEY);
    if (declinedAt) {
      const elapsed = Date.now() - parseInt(declinedAt);
      if (elapsed < COOLDOWN_MS) {
        setCanAskAgain(false);
      } else {
        localStorage.removeItem(DECLINE_KEY);
      }
    }
  }, []);

  const recordDecline = useCallback(() => {
    localStorage.setItem(DECLINE_KEY, Date.now().toString());
    setCanAskAgain(false);
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof Notification === 'undefined') return 'denied';
    const result = await Notification.requestPermission();
    setPermission(result);
    setShowPrimer(false);
    if (result === 'denied') recordDecline();
    return result;
  }, [recordDecline]);

  const prime = useCallback(() => {
    if (!canAskAgain) return;
    setShowPrimer(true);
  }, [canAskAgain]);

  const dismissPrimer = useCallback(() => {
    setShowPrimer(false);
    recordDecline();
  }, [recordDecline]);

  return { permission, showPrimer, canAskAgain, requestPermission, prime, dismissPrimer, daysUntilCanAsk: COOLDOWN_DAYS };
}

/**
 * Subscribe to push notifications via the service worker.
 * Saves the subscription to the push_subscriptions table.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    await saveSubscription(existing);
    return existing;
  }

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.warn('VITE_VAPID_PUBLIC_KEY not set — push notifications disabled');
    return null;
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  await saveSubscription(sub);
  return sub;
}

async function saveSubscription(sub: PushSubscription): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const subJson = sub.toJSON();
  await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh_key: subJson.keys?.p256dh || '',
    auth_key: subJson.keys?.auth || '',
    device_label: navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad') ? 'iOS' :
                  navigator.userAgent.includes('Mac') ? 'Mac' :
                  navigator.userAgent.includes('Android') ? 'Android' :
                  navigator.userAgent.includes('Windows') ? 'Windows' : 'Device',
  }, { onConflict: 'user_id,endpoint' });
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', sub.endpoint);
    }
    await sub.unsubscribe();
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
