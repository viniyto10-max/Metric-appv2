import { useCallback, useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'mf:install-dismissed';
const DISMISS_DAYS = 14;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPadOS 13+ se identifica como Mac
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const wasRecentlyDismissed = () => {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY));
    return ts > 0 && Date.now() - ts < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
};

export function usePWA() {
  const [online, setOnline] = useState(navigator.onLine);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [dismissed, setDismissed] = useState(wasRecentlyDismissed());

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Verifica atualização a cada 1h enquanto o app está aberto
      if (registration) setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const onPrompt = (e: Event) => {
      e.preventDefault(); // guardamos o evento para disparar no nosso botão
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setInstallEvent(null);
  }, [installEvent]);

  const dismissInstall = useCallback(() => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setDismissed(true);
  }, []);

  const ios = isIOS();
  return {
    online,
    needRefresh,
    applyUpdate: () => updateServiceWorker(true),
    closeUpdate: () => setNeedRefresh(false),
    // Android/Chrome: botão nativo. iOS: instruções manuais (Safari não tem prompt).
    canInstallNative: !!installEvent && !installed && !dismissed,
    showIOSHint: ios && !installed && !dismissed,
    install,
    dismissInstall,
  };
}
