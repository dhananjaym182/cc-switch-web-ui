import { Router, Request, Response } from 'express';
import { customCLIEngine } from '../services/custom-cli-engine.js';
import { RegisterToolRequest } from '../types/index.js';

const router = Router();

/**
 * GET /api/custom-tools
 * List all registered custom CLI tools
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const tools = customCLIEngine.listTools();
    res.json({
      success: true,
      data: {
        tools,
        total: tools.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list custom tools';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/custom-tools/:id
 * Get a specific custom tool by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tool = customCLIEngine.getTool(id);

    if (!tool) {
      res.status(404).json({
        success: false,
        error: 'Tool not found',
      });
      return;
    }

    res.json({
      success: true,
      data: tool,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get tool';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/custom-tools/register
 * Register a new custom CLI tool
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const request = req.body as RegisterToolRequest;

    // Validate required fields
    if (!request.name || request.name.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Tool name is required',
      });
      return;
    }

    if (!request.command || request.command.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Command is required',
      });
      return;
    }

    const tool = await customCLIEngine.registerTool(request);

    res.status(201).json({
      success: true,
      data: {
        message: 'Tool registered successfully',
        tool,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to register tool';
    res.status(400).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/custom-tools/:id/run
 * Run a custom CLI tool
 */
router.post('/:id/run', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { args } = req.body as { args?: string[] };

    const result = await customCLIEngine.runTool(id, args || []);

    res.json({
      success: result.exitCode === 0,
      data: {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run tool';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * DELETE /api/custom-tools/:id
 * Unregister a custom CLI tool
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = customCLIEngine.unregisterTool(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Tool not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        message: 'Tool unregistered successfully',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to unregister tool';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export default router;
