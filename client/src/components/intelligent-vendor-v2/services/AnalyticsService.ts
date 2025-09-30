
import { AnalyticsEvent } from '../types';

export class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private batchSize = 10;
  private flushInterval = 30000; // 30 segundos
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.startBatchFlush();
    this.loadStoredEvents();
  }

  trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>): void {
    const fullEvent: AnalyticsEvent = {
      ...event,
      timestamp: new Date()
    };

    this.events.push(fullEvent);
    this.saveToLocalStorage();

    // Log para desenvolvimento
    console.log('📊 [Analytics] Event tracked:', fullEvent);

    // Flush imediato para eventos importantes
    if (event.type === 'purchase') {
      this.flush();
    } else if (this.events.length >= this.batchSize) {
      this.flush();
    }
  }

  trackSearch(query: string, sessionId: string, userId?: string, resultsCount?: number): void {
    this.trackEvent({
      type: 'search',
      query,
      sessionId,
      userId,
      metadata: {
        resultsCount,
        timestamp: new Date().toISOString()
      }
    });
  }

  trackProductClick(productId: string, sessionId: string, userId?: string, metadata?: Record<string, any>): void {
    this.trackEvent({
      type: 'click',
      productId,
      sessionId,
      userId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }

  trackPurchase(productId: string, sessionId: string, userId?: string, metadata?: Record<string, any>): void {
    this.trackEvent({
      type: 'purchase',
      productId,
      sessionId,
      userId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }

  trackComparison(productIds: string[], sessionId: string, userId?: string): void {
    this.trackEvent({
      type: 'comparison',
      sessionId,
      userId,
      metadata: {
        productIds,
        productCount: productIds.length,
        timestamp: new Date().toISOString()
      }
    });
  }

  trackWishlistAdd(productId: string, sessionId: string, userId?: string): void {
    this.trackEvent({
      type: 'wishlist_add',
      productId,
      sessionId,
      userId,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }

  private async flush(): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];
    this.saveToLocalStorage();

    try {
      await this.sendEvents(eventsToSend);
      console.log(`📊 [Analytics] Flushed ${eventsToSend.length} events`);
    } catch (error) {
      console.error('📊 [Analytics] Failed to send events:', error);
      // Recolocar eventos na fila em caso de erro
      this.events.unshift(...eventsToSend);
      this.saveToLocalStorage();
    }
  }

  private async sendEvents(events: AnalyticsEvent[]): Promise<void> {
    try {
      const response = await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ events })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      // Fallback: tentar endpoint alternativo ou log local
      console.warn('📊 [Analytics] Primary endpoint failed, using fallback');
      this.logEventsLocally(events);
    }
  }

  private logEventsLocally(events: AnalyticsEvent[]): void {
    // Salvar eventos localmente para análise posterior
    const localEvents = this.getLocalEvents();
    localEvents.push(...events);
    
    // Manter apenas os últimos 1000 eventos
    if (localEvents.length > 1000) {
      localEvents.splice(0, localEvents.length - 1000);
    }
    
    localStorage.setItem('vendor_analytics_local', JSON.stringify(localEvents));
  }

  private getLocalEvents(): AnalyticsEvent[] {
    try {
      const stored = localStorage.getItem('vendor_analytics_local');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('📊 [Analytics] Failed to load local events:', error);
      return [];
    }
  }

  private startBatchFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('vendor_analytics_pending', JSON.stringify(this.events));
    } catch (error) {
      console.warn('📊 [Analytics] Failed to save to localStorage:', error);
    }
  }

  private loadStoredEvents(): void {
    try {
      const stored = localStorage.getItem('vendor_analytics_pending');
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('📊 [Analytics] Failed to load stored events:', error);
      this.events = [];
    }
  }

  // Métodos para análise de dados
  getSessionStats(sessionId: string): {
    totalEvents: number;
    searches: number;
    clicks: number;
    comparisons: number;
    wishlistAdds: number;
    purchases: number;
    duration?: number;
  } {
    const sessionEvents = this.events.filter(e => e.sessionId === sessionId);
    const localEvents = this.getLocalEvents().filter(e => e.sessionId === sessionId);
    const allEvents = [...sessionEvents, ...localEvents];

    const stats = {
      totalEvents: allEvents.length,
      searches: allEvents.filter(e => e.type === 'search').length,
      clicks: allEvents.filter(e => e.type === 'click').length,
      comparisons: allEvents.filter(e => e.type === 'comparison').length,
      wishlistAdds: allEvents.filter(e => e.type === 'wishlist_add').length,
      purchases: allEvents.filter(e => e.type === 'purchase').length
    };

    // Calcular duração da sessão
    if (allEvents.length > 1) {
      const timestamps = allEvents.map(e => e.timestamp.getTime()).sort();
      const duration = timestamps[timestamps.length - 1] - timestamps[0];
      return { ...stats, duration };
    }

    return stats;
  }

  getPopularSearches(limit: number = 10): { query: string; count: number }[] {
    const allEvents = [...this.events, ...this.getLocalEvents()];
    const searches = allEvents.filter(e => e.type === 'search' && e.query);
    
    const queryCount: Record<string, number> = {};
    searches.forEach(event => {
      if (event.query) {
        queryCount[event.query] = (queryCount[event.query] || 0) + 1;
      }
    });

    return Object.entries(queryCount)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getPopularProducts(limit: number = 10): { productId: string; clicks: number; purchases: number }[] {
    const allEvents = [...this.events, ...this.getLocalEvents()];
    const productEvents = allEvents.filter(e => e.productId);
    
    const productStats: Record<string, { clicks: number; purchases: number }> = {};
    
    productEvents.forEach(event => {
      if (event.productId) {
        if (!productStats[event.productId]) {
          productStats[event.productId] = { clicks: 0, purchases: 0 };
        }
        
        if (event.type === 'click') {
          productStats[event.productId].clicks++;
        } else if (event.type === 'purchase') {
          productStats[event.productId].purchases++;
        }
      }
    });

    return Object.entries(productStats)
      .map(([productId, stats]) => ({ productId, ...stats }))
      .sort((a, b) => (b.clicks + b.purchases * 10) - (a.clicks + a.purchases * 10))
      .slice(0, limit);
  }

  getConversionRate(sessionId?: string): number {
    const allEvents = [...this.events, ...this.getLocalEvents()];
    let relevantEvents = allEvents;
    
    if (sessionId) {
      relevantEvents = allEvents.filter(e => e.sessionId === sessionId);
    }

    const clicks = relevantEvents.filter(e => e.type === 'click').length;
    const purchases = relevantEvents.filter(e => e.type === 'purchase').length;

    return clicks > 0 ? (purchases / clicks) * 100 : 0;
  }

  // Cleanup
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(); // Flush final
  }
}
