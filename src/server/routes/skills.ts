import { Router, Request, Response } from 'express';
import { ccSwitchAdapter } from '../services/ccswitch-adapter.js';

const router = Router();

/**
 * GET /api/skills
 * List all skills
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const app = req.query.app as string | undefined;
    const skills = await ccSwitchAdapter.listSkills(app);
    
    res.json({
      success: true,
      data: { skills },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list skills';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/skills/install
 * Install a skill
 */
router.post('/install', async (req: Request, res: Response) => {
  const { skillName, app } = req.body;

  if (!skillName) {
    res.status(400).json({
      success: false,
      error: 'skillName is required',
    });
    return;
  }

  try {
    const result = await ccSwitchAdapter.installSkill(skillName, app);

    if (result.success) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to install skill';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/skills/uninstall
 * Uninstall a skill
 */
router.post('/uninstall', async (req: Request, res: Response) => {
  const { skillName, app } = req.body;

  if (!skillName) {
    res.status(400).json({
      success: false,
      error: 'skillName is required',
    });
    return;
  }

  try {
    const result = await ccSwitchAdapter.uninstallSkill(skillName, app);

    if (result.success) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to uninstall skill';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/skills/search
 * Search skills
 */
router.get('/search', async (req: Request, res: Response) => {
  const query = (req.query.q || req.query.query) as string;

  if (!query) {
    res.status(400).json({
      success: false,
      error: 'Query parameter q or query is required',
    });
    return;
  }

  try {
    const skills = await ccSwitchAdapter.searchSkills(query);
    
    res.json({
      success: true,
      data: { skills },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search skills';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/skills/repos
 * List skill repos
 */
router.get('/repos', async (_req: Request, res: Response) => {
  try {
    const repos = await ccSwitchAdapter.listSkillRepos();
    
    res.json({
      success: true,
      data: { repos },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list skill repos';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/skills/repos
 * Add a skill repo
 */
router.post('/repos', async (req: Request, res: Response) => {
  const { repo } = req.body;

  if (!repo) {
    res.status(400).json({
      success: false,
      error: 'repo is required',
    });
    return;
  }

  try {
    const result = await ccSwitchAdapter.addSkillRepo(repo);

    if (result.success) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add skill repo';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * DELETE /api/skills/repos
 * Remove a skill repo
 */
router.delete('/repos', async (req: Request, res: Response) => {
  const { repo } = req.body;

  if (!repo) {
    res.status(400).json({
      success: false,
      error: 'repo is required',
    });
    return;
  }

  try {
    const result = await ccSwitchAdapter.removeSkillRepo(repo);

    if (result.success) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove skill repo';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/skills/enable
 * Enable a skill
 */
router.post('/enable', async (req: Request, res: Response) => {
  const { skillName, app } = req.body;

  if (!skillName) {
    res.status(400).json({
      success: false,
      error: 'skillName is required',
    });
    return;
  }

  try {
    const result = await ccSwitchAdapter.enableSkill(skillName, app);

    if (result.success) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to enable skill';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

  /**
   * POST /api/skills/disable
   * Disable a skill
   */
  router.post('/disable', async (req: Request, res: Response) => {
    const { skillName, app } = req.body;

    if (!skillName) {
      res.status(400).json({
        success: false,
        error: 'skillName is required',
      });
      return;
    }

    try {
      const result = await ccSwitchAdapter.disableSkill(skillName, app);

      if (result.success) {
        res.json({
          success: true,
          data: result,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to disable skill';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  });

  /**
   * GET /api/skills/discover
   * Discover available skills from enabled repos
   */
  router.get('/discover', async (req: Request, res: Response) => {
    try {
      const app = req.query.app as string | undefined;
      const skills = await ccSwitchAdapter.discoverSkills(app);
      
      res.json({
        success: true,
        data: { skills },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to discover skills';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  });

  /**
   * POST /api/skills/sync
   * Sync enabled skills to app skills dirs
   */
  router.post('/sync', async (req: Request, res: Response) => {
    try {
      const app = req.query.app as string | undefined || req.body.app;
      const result = await ccSwitchAdapter.syncSkills(app);

      if (result.success) {
        res.json({
          success: true,
          data: result,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync skills';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  });

  /**
   * GET /api/skills/scan-unmanaged
   * Scan unmanaged skills in app skills dirs
   */
  router.get('/scan-unmanaged', async (req: Request, res: Response) => {
    try {
      const app = req.query.app as string | undefined;
      const skills = await ccSwitchAdapter.scanUnmanagedSkills(app);
      
      res.json({
        success: true,
        data: { skills },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to scan unmanaged skills';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  });

  /**
   * POST /api/skills/import-from-apps
   * Import unmanaged skills from app skills dirs into SSOT
   */
  router.post('/import-from-apps', async (req: Request, res: Response) => {
    try {
      const app = req.query.app as string | undefined || req.body.app;
      const result = await ccSwitchAdapter.importSkillsFromApps(app);

      if (result.success) {
        res.json({
          success: true,
          data: result,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import skills';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  });

  /**
   * GET /api/skills/info/:skillName
   * Get skill information
   */
  router.get('/info/:skillName', async (req: Request, res: Response) => {
    const { skillName } = req.params;
    const app = req.query.app as string | undefined;

    if (!skillName) {
      res.status(400).json({
        success: false,
        error: 'skillName is required',
      });
      return;
    }

    try {
      const info = await ccSwitchAdapter.getSkillInfo(skillName, app);
      
      if (info) {
        res.json({
          success: true,
          data: info,
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Skill not found',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get skill info';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  });

  /**
   * GET /api/skills/sync-method
   * Get the skills sync method
   */
  router.get('/sync-method', async (_req: Request, res: Response) => {
    try {
      const result = await ccSwitchAdapter.getSyncMethod();
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get sync method';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  });

  /**
   * POST /api/skills/sync-method
   * Set the skills sync method
   */
  router.post('/sync-method', async (req: Request, res: Response) => {
    const { method } = req.body;

    if (!method || !['auto', 'symlink', 'copy'].includes(method)) {
      res.status(400).json({
        success: false,
        error: 'method must be one of: auto, symlink, copy',
      });
      return;
    }

    try {
      const result = await ccSwitchAdapter.setSyncMethod(method);

      if (result.success) {
        res.json({
          success: true,
          data: result,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set sync method';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  });

export default router;
