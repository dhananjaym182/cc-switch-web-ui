import { Router, Request, Response } from 'express';
import { configStorage } from '../services/config-storage';

const router = Router();

/**
 * GET /api/logs
 * Get recent operation logs
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const limitParam = req.query.limit as string | undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    if (isNaN(limit) || limit < 1 || limit > 1000) {
      res.status(400).json({
        success: false,
        error: 'Invalid limit parameter. Must be between 1 and 1000.',
      });
      return;
    }

    const logs = configStorage.getLogs(limit);
    const allLogs = configStorage.getLogs(1000); // Get total count

    res.json({
      success: true,
      data: {
        logs,
        total: allLogs.length,
        limit,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get logs';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * DELETE /api/logs
 * Clear all logs
 */
router.delete('/', (_req: Request, res: Response) => {
  try {
    configStorage.clearLogs();

    res.json({
      success: true,
      data: {
        message: 'Logs cleared successfully',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clear logs';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/logs/stats
 * Get log statistics
 */
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const logs = configStorage.getLogs(1000);

    const stats = {
      total: logs.length,
      byLevel: {
        info: logs.filter((l) => l.level === 'info').length,
        warn: logs.filter((l) => l.level === 'warn').length,
        error: logs.filter((l) => l.level === 'error').length,
      },
      byOperation: logs.reduce(
        (acc, log) => {
          acc[log.operation] = (acc[log.operation] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      oldestLog: logs.length > 0 ? logs[0].timestamp : null,
      newestLog: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get log stats';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export default router;
