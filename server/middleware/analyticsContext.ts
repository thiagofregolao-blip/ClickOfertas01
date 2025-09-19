import { Request, Response, NextFunction } from "express";
import { randomUUID, createHash, createHmac } from "node:crypto";

// Extensão do tipo Request para incluir dados de analytics
declare global {
  namespace Express {
    interface Request {
      analytics: {
        sessionId: string;
        ipHash: string;
        utm: {
          source?: string;
          medium?: string;
          campaign?: string;
          content?: string;
          term?: string;
        };
        referrer?: string;
        device: 'mobile' | 'desktop' | 'tablet';
        userAgent?: string;
      };
    }
  }
}

// Rate limiting em memória para analytics (simple)
const analyticsRateLimit = new Map<string, { count: number; resetTime: number }>();

// Secret para hash de IP (em produção, usar env var)
const IP_HASH_SECRET = process.env.IP_HASH_SECRET || 'default-secret-for-dev';

/**
 * Middleware para capturar contexto de analytics de forma anônima
 * Gera sessão, coleta UTM, hash de IP, detecção de device
 */
export function analyticsContext() {
  const ANALYTICS_COOKIE = "co_analytics_session";
  
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Session ID - Cookie próprio para analytics (separado da autenticação)
      let sessionId = req.cookies?.[ANALYTICS_COOKIE];
      if (!sessionId) {
        sessionId = randomUUID();
        res.cookie(ANALYTICS_COOKIE, sessionId, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production", // HTTPS em produção
          maxAge: 1000 * 60 * 60 * 24 * 365, // 1 ano
          path: "/",
        });
      }

      // 2. UTM Parameters - First touch attribution (preserva UTM original via cookies)
      const utm = {
        source: String(req.query.utm_source || req.cookies?.utm_source || ""),
        medium: String(req.query.utm_medium || req.cookies?.utm_medium || ""),
        campaign: String(req.query.utm_campaign || req.cookies?.utm_campaign || ""),
        content: String(req.query.utm_content || req.cookies?.utm_content || ""),
        term: String(req.query.utm_term || req.cookies?.utm_term || ""),
      };

      // Salvar UTM em cookies se vieram na URL (first touch)
      if (req.query.utm_source) {
        res.cookie("utm_source", utm.source, { sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 * 30 });
      }
      if (req.query.utm_medium) {
        res.cookie("utm_medium", utm.medium, { sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 * 30 });
      }
      if (req.query.utm_campaign) {
        res.cookie("utm_campaign", utm.campaign, { sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 * 30 });
      }
      if (req.query.utm_content) {
        res.cookie("utm_content", utm.content, { sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 * 30 });
      }
      if (req.query.utm_term) {
        res.cookie("utm_term", utm.term, { sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 * 30 });
      }

      // 3. IP Hash para privacidade (HMAC + salt diário)
      const rawIp = 
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        "unknown";
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const saltedIp = `${rawIp}:${today}`;
      const ipHash = createHmac('sha256', IP_HASH_SECRET)
        .update(saltedIp)
        .digest('hex')
        .slice(0, 64);

      // 4. Device Detection
      const userAgent = req.get("user-agent") || "";
      let device: 'mobile' | 'desktop' | 'tablet' = 'desktop';
      if (/mobile/i.test(userAgent)) {
        device = 'mobile';
      } else if (/tablet|ipad/i.test(userAgent)) {
        device = 'tablet';
      }

      // 5. Referrer
      const referrer = req.get("referer") || req.get("referrer") || undefined;

      // 6. Rate Limiting simples para analytics (por IP hash)
      const now = Date.now();
      const windowMs = 60 * 1000; // 1 minuto
      const maxRequests = 1000; // 1000 requests por minuto por IP

      const rateLimitKey = ipHash;
      const current = analyticsRateLimit.get(rateLimitKey);
      
      if (current && current.resetTime > now) {
        if (current.count >= maxRequests) {
          return res.status(429).json({ error: "Too many analytics requests" });
        }
        current.count++;
      } else {
        analyticsRateLimit.set(rateLimitKey, {
          count: 1,
          resetTime: now + windowMs,
        });
      }

      // Cleanup do rate limiting (remove entradas antigas)
      if (Math.random() < 0.01) { // 1% de chance de cleanup
        Array.from(analyticsRateLimit.entries()).forEach(([key, value]) => {
          if (value.resetTime <= now) {
            analyticsRateLimit.delete(key);
          }
        });
      }

      // 7. Anexar dados ao request
      req.analytics = {
        sessionId,
        ipHash,
        utm: {
          source: utm.source || undefined,
          medium: utm.medium || undefined,
          campaign: utm.campaign || undefined,
          content: utm.content || undefined,
          term: utm.term || undefined,
        },
        referrer,
        device,
        userAgent,
      };

      next();
    } catch (error) {
      console.error("Analytics middleware error:", error);
      // Em caso de erro, continue sem analytics
      req.analytics = {
        sessionId: "error",
        ipHash: "error",
        utm: {},
        device: 'desktop',
      };
      next();
    }
  };
}

/**
 * Utility function para deduplicate eventos analytics
 * Evita spam de eventos idênticos na mesma sessão
 */
const eventDedupeCache = new Map<string, number>();

export function isDuplicateEvent(sessionId: string, eventType: string, entityId: string): boolean {
  const key = `${sessionId}:${eventType}:${entityId}`;
  const now = Date.now();
  const dedupeWindow = 5000; // 5 segundos
  
  const lastTime = eventDedupeCache.get(key);
  if (lastTime && (now - lastTime) < dedupeWindow) {
    return true; // É duplicado
  }
  
  eventDedupeCache.set(key, now);
  
  // Cleanup periódico
  if (Math.random() < 0.01) {
    Array.from(eventDedupeCache.entries()).forEach(([cacheKey, time]) => {
      if ((now - time) > dedupeWindow * 2) {
        eventDedupeCache.delete(cacheKey);
      }
    });
  }
  
  return false; // Não é duplicado
}