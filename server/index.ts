import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startCleanupJobs, startTrendingAnalysisJob } from "./cleanupJobs";
import path from "path";

const app = express();
// Aumentar limite de payload para suportar upload de imagens/vídeos maiores
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Serve attached assets statically
app.use('/attached_assets', express.static(path.resolve(process.cwd(), 'attached_assets')));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Modo desenvolvimento rápido: pular jobs pesados para evitar travamentos durante HMR
    const isDevelopment = app.get("env") === "development";
    const fastDev = process.env.FAST_DEV !== 'false'; // true por padrão
    
    if (!isDevelopment || !fastDev) {
      // Executar jobs de forma assíncrona após um pequeno delay
      setTimeout(() => {
        // Guard global para evitar execução duplicada
        if (!(globalThis as any).__jobsStarted) {
          (globalThis as any).__jobsStarted = true;
          
          // Iniciar jobs de limpeza automática
          startCleanupJobs();
          
          // Iniciar job de análise de tendências
          startTrendingAnalysisJob();
        }
      }, 100);
    } else {
      log(`🚀 Modo desenvolvimento rápido ativado - jobs em background desabilitados`);
    }
  });
})();
