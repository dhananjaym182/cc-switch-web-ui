import { Router, Request, Response } from 'express';
import { ccSwitchAdapter } from '../services/ccswitch-adapter';

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
  const query = req.query.q as string;

  if (!query) {
    res.status(400).json({
      success: false,
      error: 'Query parameter q is required',
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

export default router;
