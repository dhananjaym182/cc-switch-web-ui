import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import providersRoutes from './routes/providers';
import profilesRoutes from './routes/profiles';
import customToolsRoutes from './routes/custom-tools';
import logsRoutes from './routes/logs';
import settingsRoutes from './routes/settings';
import mcpRoutes from './routes/mcp';
import promptsRoutes from './routes/prompts';
import skillsRoutes from './routes/skills';
import configRoutes from './routes/config';
import envRoutes from './routes/env';

// Import middleware
import { authMiddleware } from './middleware/auth';

// Import services
import { ccSwitchAdapter } from './services/ccswitch-adapter';
import { configStorage } from './services/config-storage';

// Create Express app
const app = express();

// Configuration
const PORT = parseInt(process.env.PORT || '3010', 10);
const HOST = process.env.HOST || '0.0.0.0';

// ============================================
// Middleware
// ============================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API server
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// Public Routes (No Auth Required)
// ============================================

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', async (_req, res) => {
  const startTime = Date.now();
  
  try {
    const ccSwitchAvailable = await ccSwitchAdapter.isAvailable();
    const storageAccessible = configStorage.isAccessible();
    
    const health = {
      status: ccSwitchAvailable && storageAccessible ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      ccSwitchAvailable,
      storageAccessible,
      responseTime: `${Date.now() - startTime}ms`,
    };

    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      ccSwitchAvailable: false,
      storageAccessible: false,
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

/**
 * POST /api/auth/login
 * Login endpoint (no auth required)
 */
app.use('/api/auth', authRoutes);

// ============================================
// Protected Routes (Auth Required)
// ============================================

// Apply auth middleware to all routes below
app.use('/api', authMiddleware);

/**
 * GET /api/status
 * Get current provider/profile status
 */
app.get('/api/status', async (_req, res) => {
  try {
    const status = await ccSwitchAdapter.getStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get status';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// Provider routes
app.use('/api/providers', providersRoutes);

// Profile routes
app.use('/api/profiles', profilesRoutes);

// Custom tools routes
app.use('/api/custom-tools', customToolsRoutes);

// Logs routes
app.use('/api/logs', logsRoutes);

// Settings routes
app.use('/api/settings', settingsRoutes);

// MCP routes
app.use('/api/mcp', mcpRoutes);

// Prompts routes
app.use('/api/prompts', promptsRoutes);

// Skills routes
app.use('/api/skills', skillsRoutes);

// Config routes
app.use('/api/config', configRoutes);

// Environment variables routes
app.use('/api/env', envRoutes);

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
});

// ============================================
// Server Startup
// ============================================

async function startServer() {
  try {
    // Check cc-switch availability
    console.log('Checking cc-switch availability...');
    const ccSwitchAvailable = await ccSwitchAdapter.isAvailable();
    if (!ccSwitchAvailable) {
      console.warn('WARNING: cc-switch binary is not available. Some features may not work.');
    } else {
      console.log('cc-switch binary is available.');
    }

    // Check storage
    console.log('Checking storage accessibility...');
    const storageAccessible = configStorage.isAccessible();
    if (!storageAccessible) {
      console.error('ERROR: Storage directory is not accessible.');
      process.exit(1);
    }
    console.log(`Storage directory: ${configStorage.getDataDir()}`);

    // Start listening
    app.listen(PORT, HOST, () => {
      console.log('');
      console.log('='.repeat(50));
      console.log('  cc-switch-web-ui Backend Server');
      console.log('='.repeat(50));
      console.log(`  Server running at: http://${HOST}:${PORT}`);
      console.log(`  Health check:      http://${HOST}:${PORT}/api/health`);
      console.log(`  Auth enabled:      ${!!process.env.ADMIN_PASSWORD}`);
      console.log(`  Node environment:  ${process.env.NODE_ENV || 'development'}`);
      console.log('='.repeat(50));
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

export default app;
