// Utilitário para captura de metadados anônimos
import { nanoid } from 'nanoid';

interface UserSession {
  sessionToken: string;
  deviceType: string;
  screenResolution: string;
  browserInfo: string;
  startTime: number;
  pageViews: number;
}

interface ProductSearchData {
  searchTerm: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  resultsCount?: number;
  clickedProductId?: string;
  storeId?: string;
}

interface ProductViewData {
  productId: string;
  productName: string;
  productCategory?: string;
  productPrice?: number;
  storeId: string;
  storeName?: string;
  viewDuration?: number;
  cameFromSearch?: boolean;
  searchTerm?: string;
  wasCompared?: boolean;
  wasSaved?: boolean;
}

class AnalyticsManager {
  private session: UserSession | null = null;
  private pageStartTime: number = 0;
  private currentProductView: { productId: string; startTime: number } | null = null;

  constructor() {
    this.initSession();
    this.setupPageVisibility();
  }

  private initSession() {
    const existingToken = localStorage.getItem('analytics_session_token');
    const sessionStart = localStorage.getItem('analytics_session_start');
    
    // Criar nova sessão se não existir ou expirou (24h)
    if (!existingToken || !sessionStart || (Date.now() - parseInt(sessionStart)) > 24 * 60 * 60 * 1000) {
      this.createNewSession();
    } else {
      this.session = {
        sessionToken: existingToken,
        deviceType: this.getDeviceType(),
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        browserInfo: navigator.userAgent.slice(0, 100),
        startTime: parseInt(sessionStart),
        pageViews: parseInt(localStorage.getItem('analytics_page_views') || '0')
      };
    }

    this.pageStartTime = Date.now();
    this.incrementPageView();
  }

  private createNewSession() {
    const sessionToken = nanoid();
    const startTime = Date.now();
    
    this.session = {
      sessionToken,
      deviceType: this.getDeviceType(),
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      browserInfo: navigator.userAgent.slice(0, 100),
      startTime,
      pageViews: 1
    };

    localStorage.setItem('analytics_session_token', sessionToken);
    localStorage.setItem('analytics_session_start', startTime.toString());
    localStorage.setItem('analytics_page_views', '1');

    // Enviar dados da sessão para o backend
    this.sendSessionData();
  }

  private getDeviceType(): string {
    const width = window.innerWidth;
    if (width <= 768) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }

  private incrementPageView() {
    if (this.session) {
      this.session.pageViews++;
      localStorage.setItem('analytics_page_views', this.session.pageViews.toString());
      this.updateSessionData();
    }
  }

  private setupPageVisibility() {
    // Atualizar duração da sessão quando a página ficar invisível
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.updateSessionData();
      }
    });

    // Atualizar quando a janela for fechada
    window.addEventListener('beforeunload', () => {
      this.updateSessionData();
    });
  }

  private async sendSessionData() {
    if (!this.session) return;

    try {
      await fetch('/api/analytics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: this.session.sessionToken,
          deviceType: this.session.deviceType,
          screenResolution: this.session.screenResolution,
          browserInfo: this.session.browserInfo,
          pagesViewed: this.session.pageViews
        })
      });
    } catch (error) {
      console.debug('Analytics session error:', error);
    }
  }

  private async updateSessionData() {
    if (!this.session) return;

    const visitDuration = (Date.now() - this.session.startTime) / 1000;

    try {
      await fetch('/api/analytics/session/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: this.session.sessionToken,
          visitDuration,
          pagesViewed: this.session.pageViews
        })
      });
    } catch (error) {
      console.debug('Analytics update error:', error);
    }
  }

  // Capturar busca de produto
  async trackProductSearch(data: ProductSearchData) {
    if (!this.session) return;

    try {
      await fetch('/api/analytics/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: this.session.sessionToken,
          ...data
        })
      });
    } catch (error) {
      console.debug('Analytics search error:', error);
    }
  }

  // Iniciar rastreamento de visualização de produto
  startProductView(productId: string) {
    this.currentProductView = {
      productId,
      startTime: Date.now()
    };
  }

  // Finalizar rastreamento de visualização de produto
  async endProductView(data: Omit<ProductViewData, 'viewDuration'>) {
    if (!this.session || !this.currentProductView || this.currentProductView.productId !== data.productId) return;

    const viewDuration = (Date.now() - this.currentProductView.startTime) / 1000;

    try {
      await fetch('/api/analytics/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: this.session.sessionToken,
          viewDuration,
          ...data
        })
      });
    } catch (error) {
      console.debug('Analytics view error:', error);
    }

    this.currentProductView = null;
  }

  // Capturar clique em produto (desde busca)
  async trackProductClick(productId: string, searchTerm?: string) {
    if (!this.session) return;

    try {
      await fetch('/api/analytics/search/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: this.session.sessionToken,
          productId,
          searchTerm
        })
      });
    } catch (error) {
      console.debug('Analytics click error:', error);
    }
  }

  // Marcar produto como salvo/curtido
  async trackProductSave(productId: string) {
    if (!this.session) return;

    try {
      await fetch('/api/analytics/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: this.session.sessionToken,
          productId
        })
      });
    } catch (error) {
      console.debug('Analytics save error:', error);
    }
  }

  // Marcar produto como comparado
  async trackProductCompare(productId: string) {
    if (!this.session) return;

    try {
      await fetch('/api/analytics/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: this.session.sessionToken,
          productId
        })
      });
    } catch (error) {
      console.debug('Analytics compare error:', error);
    }
  }

  getSessionToken(): string | null {
    return this.session?.sessionToken || null;
  }
}

// Instância global do analytics
export const analytics = new AnalyticsManager();

// Hook para usar analytics em componentes React
export function useAnalytics() {
  return {
    trackSearch: (data: ProductSearchData) => analytics.trackProductSearch(data),
    startProductView: (productId: string) => analytics.startProductView(productId),
    endProductView: (data: Omit<ProductViewData, 'viewDuration'>) => analytics.endProductView(data),
    trackClick: (productId: string, searchTerm?: string) => analytics.trackProductClick(productId, searchTerm),
    trackSave: (productId: string) => analytics.trackProductSave(productId),
    trackCompare: (productId: string) => analytics.trackProductCompare(productId),
    getSessionToken: () => analytics.getSessionToken()
  };
}