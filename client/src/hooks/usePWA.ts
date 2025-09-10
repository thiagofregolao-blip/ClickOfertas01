import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAHook {
  canInstall: boolean;
  isInstalled: boolean;
  isSupported: boolean;
  installApp: () => Promise<void>;
  isInstalling: boolean;
}

export function usePWA(): PWAHook {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Verifica se PWA é suportado
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window);

    // Verifica se já está instalado
    const checkIfInstalled = () => {
      if ('standalone' in window.navigator) {
        // iOS
        setIsInstalled((window.navigator as any).standalone === true);
      } else if (window.matchMedia) {
        // Android e outros
        setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);
      }
    };

    checkIfInstalled();

    // Registra service worker APENAS EM PRODUÇÃO
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      registerServiceWorker();
    } else if ('serviceWorker' in navigator && import.meta.env.DEV) {
      // DESENVOLVIMENTO: Desregistrar qualquer Service Worker existente
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
          console.log('DEV: PWA Service Worker desregistrado');
        });
      });
    }

    // Escuta evento de instalação
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      console.log('PWA: App instalado com sucesso');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('PWA: Service Worker registrado:', registration);

      // Atualizar service worker quando houver nova versão
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nova versão disponível
              console.log('PWA: Nova versão disponível');
              if (confirm('Nova versão disponível! Atualizar agora?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        }
      });

      // Escuta mensagens do service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          console.log('PWA: Service Worker atualizado');
        }
      });

    } catch (error) {
      console.error('PWA: Erro ao registrar Service Worker:', error);
    }
  };

  const installApp = async (): Promise<void> => {
    if (!deferredPrompt) {
      console.warn('PWA: Não é possível instalar o app no momento');
      return;
    }

    setIsInstalling(true);

    try {
      // Mostra o prompt de instalação
      await deferredPrompt.prompt();
      
      // Aguarda a escolha do usuário
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA: Usuário aceitou instalar o app');
        setCanInstall(false);
      } else {
        console.log('PWA: Usuário cancelou a instalação');
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('PWA: Erro durante instalação:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  return {
    canInstall,
    isInstalled,
    isSupported,
    installApp,
    isInstalling
  };
}