/*
 * usePWA Hook
 * 
 * Handles PWA install prompt lifecycle.
 * - Captures `beforeinstallprompt` event
 * - Provides `canInstall` flag and `promptInstall` function
 * - Tracks if app is already installed
 * 
 * Usage:
 *   const { canInstall, isInstalled, promptInstall } = usePWA();
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export function usePWA() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const deferredPromptRef = useRef(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Capture install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanInstall(true);
    };

    // Track successful installation
    const handleInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPromptRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return false;

    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setCanInstall(false);
    }
    
    deferredPromptRef.current = null;
    return outcome === 'accepted';
  }, []);

  return { canInstall, isInstalled, promptInstall };
}

export default usePWA;
