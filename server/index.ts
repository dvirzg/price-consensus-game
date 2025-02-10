import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import { Server } from "http";

const app = express();

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',  // Development frontend
  'https://dvirzg.github.io' // Production frontend
];

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

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
  const server = registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`Error: ${message}`);
    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = parseInt(process.env.PORT || "5000", 10);
  const runningServer = server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    log(`${signal} signal received. Starting graceful shutdown...`);
    
    // Give ongoing requests a chance to complete (5 second timeout)
    const shutdownTimeout = setTimeout(() => {
      log('Shutdown timeout reached. Forcing exit.');
      process.exit(1);
    }, 5000);

    try {
      // Stop accepting new connections
      await new Promise<void>((resolve) => {
        runningServer.close(() => {
          log('HTTP server closed');
          resolve();
        });
      });

      // Log final state before shutdown
      log('Server shutting down, active connections closed');

      clearTimeout(shutdownTimeout);
      log('Graceful shutdown completed');
      process.exit(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during shutdown';
      log('Error during shutdown:', errorMessage);
      process.exit(1);
    }
  };

  // Handle various termination signals
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  signals.forEach(signal => {
    process.on(signal, () => shutdown(signal));
  });

  // Log uncaught exceptions and rejections
  process.on('uncaughtException', (err: Error) => {
    log('Uncaught exception:', err.message);
    shutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : 'Unknown rejection reason';
    log('Unhandled rejection:', message);
    shutdown('UNHANDLED_REJECTION');
  });
})();