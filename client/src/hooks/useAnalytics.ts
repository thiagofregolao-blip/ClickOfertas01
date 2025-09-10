import { useCallback, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';

type SessionData = {
  sessionToken: string;
  userAgent: string;
  language: string;
  timeZone: string;
  screenResolution: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
};

type AnalyticsEvent = {
  search: {
    sessionToken: string;
    searchTerm: string;
    category?: string;
    resultsCount?: number;
  };
  productView: {
    sessionToken: string;
    productId: string;
    productName: string;
    category?: string;
    price?: string;
    storeId?: string;
    source: 'search' | 'feed' | 'direct' | 'share';
  };
  searchClick: {
    sessionToken: string;
    productId: string;
    searchTerm?: string;
  };
  productSave: {
    sessionToken: string;
    productId: string;
  };
  productCompare: {
    sessionToken: string;
    productId: string;
  };
};

let sessionData: SessionData | null = null;
let sessionStartTime: number = 0;
let pagesViewed: number = 0;

const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

const createSession = async (): Promise<SessionData> => {
  const session: SessionData = {
    sessionToken: nanoid(),
    userAgent: navigator.userAgent,
    language: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution: `${screen.width}x${screen.height}`,
    deviceType: getDeviceType()
  };

  try {
    await fetch('/api/analytics/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });
  } catch (error) {
    console.debug('Analytics session creation failed:', error);
  }

  return session;
};

const updateSession = async (updates: { visitDuration?: number; pagesViewed?: number }) => {
  if (!sessionData) return;

  try {
    await fetch('/api/analytics/session/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: sessionData.sessionToken,
        ...updates
      })
    });
  } catch (error) {
    console.debug('Analytics session update failed:', error);
  }
};

export const useAnalytics = () => {
  const updateIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Inicializar sessão se não existir
    if (!sessionData) {
      sessionStartTime = Date.now();
      pagesViewed = 1;
      createSession().then(session => {
        sessionData = session;
      });
    } else {
      // Incrementar páginas visualizadas para páginas subsequentes
      pagesViewed++;
    }

    // Configurar atualizações periódicas da sessão
    updateIntervalRef.current = setInterval(() => {
      if (sessionData) {
        const visitDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
        updateSession({ visitDuration, pagesViewed });
      }
    }, 30000); // Atualizar a cada 30 segundos

    // Cleanup
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  // Atualizar sessão quando sair da página
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionData) {
        const visitDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
        // Use sendBeacon para garantir que seja enviado mesmo se a página fechar
        navigator.sendBeacon('/api/analytics/session/update', JSON.stringify({
          sessionToken: sessionData.sessionToken,
          visitDuration,
          pagesViewed
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const trackEvent = useCallback(async <T extends keyof AnalyticsEvent>(
    eventType: T,
    eventData: AnalyticsEvent[T]
  ) => {
    if (!sessionData) return;

    try {
      const endpoints = {
        search: '/api/analytics/search',
        productView: '/api/analytics/view',
        searchClick: '/api/analytics/search/click',
        productSave: '/api/analytics/save',
        productCompare: '/api/analytics/compare'
      };

      await fetch(endpoints[eventType], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
    } catch (error) {
      console.debug(`Analytics ${eventType} event failed:`, error);
    }
  }, []);

  return {
    sessionToken: sessionData?.sessionToken,
    trackEvent
  };
};