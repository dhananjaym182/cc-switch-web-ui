import { spawn, SpawnOptions } from 'child_process';
import {
  Provider,
  ProviderListResponse,
  SwitchProviderResponse,
  StatusResponse,
} from '../types/index';
import { configStorage } from './config-storage';

/**
 * Adapter for cc-switch CLI
 * Executes cc-switch commands and parses output
 */
export class CCSwitchAdapter {
  private readonly defaultBinaryPath: string;
  private readonly defaultSrcTauriPath: string | undefined;

  constructor() {
    // Default paths for the cc-switch binary
    this.defaultBinaryPath = process.env.CC_SWITCH_PATH || '/usr/local/bin/cc-switch';
    this.defaultSrcTauriPath = undefined;
  }

  /**
   * Get the path to the cc-switch binary
   */
  private getBinaryPath(): string {
    return this.defaultBinaryPath;
  }

  /**
   * Execute a cc-switch command
   */
  private async execute(
    args: string[],
    options: { cwd?: string; timeout?: number } = {}
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const binaryPath = this.getBinaryPath();
    const cwd = options.cwd || this.defaultSrcTauriPath;
    const timeout = options.timeout || 30000;

    return new Promise((resolve, reject) => {
      const spawnOptions: SpawnOptions = {
        cwd,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      };

      const child = spawn(binaryPath, args, spawnOptions);

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Set timeout
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code ?? 1,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Check if cc-switch binary is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.execute(['--help'], {
        cwd: undefined, // Use PATH instead of specific directory
        timeout: 5000
      });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Get list of providers from cc-switch
   */
  async listProviders(app?: string): Promise<ProviderListResponse> {
    try {
      const args = ['provider', 'list'];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        throw new Error(`Failed to list providers: ${result.stderr}`);
      }

      // Parse the output - format depends on cc-switch output
      const providers = this.parseProviderList(result.stdout);
      
      // Extract current provider from output footer
      let currentProviderId = this.extractCurrentProvider(result.stdout);
      
      // Fallback to config if not found in output
      if (!currentProviderId) {
        const appConfig = configStorage.getAppConfig();
        currentProviderId = appConfig.settings?.lastProviderId || null;
      }

      return {
        providers,
        currentProviderId,
      };
    } catch (error) {
      console.error('Error listing providers:', error);
      throw error;
    }
  }

  /**
   * Extract current provider from output footer
   */
  private extractCurrentProvider(output: string): string | null {
    const lines = output.split('\n');
    for (const line of lines) {
      // Look for "→ Current: provider-id" pattern
      if (line.includes('→ Current:')) {
        const match = line.match(/→\s*Current:\s*(\S+)/);
        if (match && match[1]) {
          return match[1];
        }
      }
    }
    return null;
  }

  /**
   * Parse provider list output from cc-switch
   */
  private parseProviderList(output: string): Provider[] {
    const providers: Provider[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines, comments, and separators
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('===')) {
        continue;
      }

      // Skip lines that are purely box drawing characters (table borders), allowing for spaces
      if (/^[┌┐└┘├┤┬┴┼─═│║╞╡╪╤╧╟╢╥╨╫╬╭╮╯╰╱╲╳╌\s]+$/.test(trimmed)) {
        continue;
      }

      // Skip footer info lines
      if (trimmed.startsWith('ℹ') || trimmed.startsWith('→')) {
        continue;
      }

      // Handle table format (cc-switch output) - lines with ┆ separator
      if (trimmed.includes('┆')) {
        // Skip header rows
        if (trimmed.includes('ID') || trimmed.includes('Name') || trimmed.includes('API URL')) {
          continue;
        }
        
        // Skip lines that are mostly box drawing characters
        if (trimmed.match(/[┌┐└┘├┤┬┴┼─═╞╡╪╤╧╟╢╥╨╫╬]/)) {
          continue;
        }
        
        // Parse data rows
        const cells = trimmed.split('┆').map(cell => cell.trim().replace(/[│┌┐└┘╞═╪╡║]/g, '').trim());
        if (cells.length >= 3) {
          const isActive = cells[0].includes('✓');
          const id = cells[1];
          const name = cells[2];
          
          // Only process valid provider rows with actual data
          if (id && id !== '' && name && name !== '') {
            providers.push({
              id,
              name,
              type: this.inferProviderType(id),
              isActive,
            });
          }
        }
        continue;
      }

      // Handle simple format (non-table output)
      // Check if this line has an active marker
      const isActive = trimmed.includes('[active]') || trimmed.includes('[*]');
      const cleanLine = trimmed
        .replace(/\[active\]/g, '')
        .replace(/\[\*\]/g, '')
        .trim();

      // Split by whitespace to get id and name
      const parts = cleanLine.split(/\s+/);
      if (parts.length >= 1 && parts[0]) {
        const id = parts[0];
        
        // Skip if id looks like a table border or invalid identifier
        // Check if it starts with a box char OR contains only box chars/symbols
        // Also ensure it has at least one alphanumeric character to avoid parsing artifacts as IDs
        if (/^[┌┐└┘├┤┬┴┼─═│║╞╡╪╤╧╟╢╥╨╫╬╭╮╯╰╱╲╳╌]/.test(id) || !/[a-zA-Z0-9]/.test(id)) {
          continue;
        }

        const name = parts.slice(1).join(' ') || id;

        providers.push({
          id,
          name,
          type: this.inferProviderType(id),
          isActive,
        });
      }
    }

    return providers;
  }

  /**
   * Infer provider type from ID
   */
  private inferProviderType(id: string): Provider['type'] {
    const lowerId = id.toLowerCase();
    if (lowerId.includes('claude') || lowerId.includes('anthropic')) {
      return 'claude';
    }
    if (lowerId.includes('gemini') || lowerId.includes('google')) {
      return 'gemini';
    }
    if (lowerId.includes('codex') || lowerId.includes('openai')) {
      return 'codex';
    }
    return 'custom';
  }

  /**
   * Switch to a provider
   */
  async switchProvider(providerId: string): Promise<SwitchProviderResponse> {
    try {
      // Get current provider before switch
      const appConfig = configStorage.getAppConfig();
      const previousProviderId = appConfig.settings.lastProviderId;

      const result = await this.execute(['provider', 'switch', providerId]);

      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to switch provider: ${result.stderr || result.stdout}`,
        };
      }

      // Update config with new provider
      appConfig.settings.lastProviderId = providerId;
      configStorage.saveAppConfig(appConfig);

      // Log the operation
      configStorage.addLog({
        level: 'info',
        operation: 'switch_provider',
        message: `Switched to provider: ${providerId}`,
        details: { previousProviderId, currentProviderId: providerId },
      });

      return {
        success: true,
        message: `Successfully switched to provider: ${providerId}`,
        previousProviderId: previousProviderId ?? undefined,
        currentProviderId: providerId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      configStorage.addLog({
        level: 'error',
        operation: 'switch_provider',
        message: `Failed to switch provider: ${errorMessage}`,
        details: { providerId, error: errorMessage },
      });

      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Get current configuration status
   */
  async getStatus(): Promise<StatusResponse> {
    try {
      const result = await this.execute(['config', 'show']);

      // Parse config output (stored for potential future use)
      void this.parseConfigShow(result.stdout);
      
      // Get app config
      const appConfig = configStorage.getAppConfig();
      
      // Get current profile if any
      let activeProfile = null;
      if (appConfig.settings?.lastProfileId) {
        activeProfile = configStorage.getProfileById(appConfig.settings.lastProfileId);
      }

      // Find current provider
      const providers = await this.listProviders();
      const currentProvider = providers.providers.find(
        (p) => p.id === (appConfig.settings?.lastProviderId || null)
      ) || null;

      return {
        currentProvider,
        activeProfile,
        lastSwitchAt: appConfig.lastUpdated,
        version: appConfig.version,
      };
    } catch (error) {
      console.error('Error getting status:', error);
      
      // Return minimal status on error
      const appConfig = configStorage.getAppConfig();
      return {
        currentProvider: null,
        activeProfile: null,
        lastSwitchAt: appConfig.lastUpdated,
        version: appConfig.version,
      };
    }
  }

  /**
   * Parse config show output
   */
  private parseConfigShow(output: string): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    const lines = output.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Try to parse key-value pairs
      // Format could be: "key: value" or "key = value"
      const colonIndex = trimmed.indexOf(':');
      const equalIndex = trimmed.indexOf('=');

      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();
        if (key) {
          config[key] = value;
        }
      } else if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim();
        if (key) {
          config[key] = value;
        }
      }
    }

    return config;
  }

  /**
   * Get raw config output
   */
  async getRawConfig(): Promise<string> {
    const result = await this.execute(['config', 'show']);
    return result.stdout;
  }

  // ============================================
  // Provider Management Methods
  // ============================================

  /**
   * Add a new provider
   */
  async addProvider(params: {
    id: string;
    name: string;
    apiUrl: string;
    apiKey?: string;
    app?: string;
  }): Promise<{ success: boolean; message: string }> {
    // Validate ID format (alphanumeric + hyphens/underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(params.id)) {
        return {
            success: false,
            message: 'Provider ID must contain only alphanumeric characters, hyphens, and underscores.'
        };
    }

    try {
      const app = params.app || 'claude';
      const id = params.id;
      const name = params.name;
      const apiUrl = params.apiUrl;
      const apiKey = params.apiKey || '';

      // Construct settings_config JSON based on app type
      let settingsConfig: Record<string, any> = {};
      
      if (app === 'claude') {
        settingsConfig = {
          env: {
            ANTHROPIC_API_KEY: apiKey,
            ANTHROPIC_BASE_URL: apiUrl,
            CLAUDE_CODE_MAX_OUTPUT_TOKENS: "32000",
            CLAUDE_CODE_SKIP_AUTH_LOGIN: "1"
          },
          statusLine: {
            command: "node ~/.claude/hud/omc-hud.mjs",
            type: "command"
          }
        };
      } else if (app === 'codex') {
        settingsConfig = {
          auth: {
            OPENAI_API_KEY: apiKey
          },
          config: `model = "gpt-4o"\nmodel_provider = "openai-chat-completions"\npreferred_auth_method = "apikey"\n\n[model_providers.openai-chat-completions]\nname = "OpenAI"\nbase_url = "${apiUrl}"\nenv_key = "OPENAI_API_KEY"\nwire_api = "openai"\n`
        };
      } else {
        // Default generic structure
        settingsConfig = {
          env: {
            API_KEY: apiKey,
            BASE_URL: apiUrl
          }
        };
      }

      const settingsConfigStr = JSON.stringify(settingsConfig);
      const metaStr = '{}';
      const costMultiplier = '1.0';
      const providerType = 'custom';

      // Construct SQL INSERT statement
      const sql = `INSERT INTO providers (id, app_type, name, settings_config, category, meta, is_current, in_failover_queue, cost_multiplier, provider_type) VALUES ('${id}', '${app}', '${name}', '${settingsConfigStr.replace(/'/g, "''")}', 'custom', '${metaStr}', 0, 0, '${costMultiplier}', '${providerType}');`;

      // Get DB path
      const dbPath = await this.getDbPath();
      
      // Execute sqlite3 command
      return await this.executeSqlite(dbPath, sql);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Edit an existing provider
   */
  async editProvider(params: {
    id: string;
    name?: string;
    apiUrl?: string;
    apiKey?: string;
    app?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const app = params.app || 'claude';
      const id = params.id;
      
      // Get current provider data first to merge
      const dbPath = await this.getDbPath();
      const currentSql = `SELECT settings_config, name FROM providers WHERE id = '${id}' AND app_type = '${app}';`;
      const currentResult = await this.executeSqlite(dbPath, currentSql);
      
      if (!currentResult.success) {
        return { success: false, message: 'Provider not found' };
      }

      // Parse current settings
      // Note: executeSqlite returns raw string output, we need to parse it if we want to be robust
      // But for now, let's just reconstruct the settings config if API URL or Key is provided
      
      // If we're updating API config, we need to rebuild the settings_config
      if (params.apiUrl || params.apiKey) {
        let settingsConfig: Record<string, any> = {};
        const apiUrl = params.apiUrl || ''; // Should ideally fetch current if not provided
        const apiKey = params.apiKey || ''; // Should ideally fetch current if not provided

        if (app === 'claude') {
            settingsConfig = {
              env: {
                ANTHROPIC_API_KEY: apiKey,
                ANTHROPIC_BASE_URL: apiUrl,
                CLAUDE_CODE_MAX_OUTPUT_TOKENS: "32000",
                CLAUDE_CODE_SKIP_AUTH_LOGIN: "1"
              },
              statusLine: {
                command: "node ~/.claude/hud/omc-hud.mjs",
                type: "command"
              }
            };
        } else if (app === 'codex') {
            settingsConfig = {
              auth: {
                OPENAI_API_KEY: apiKey
              },
              config: `model = "gpt-4o"\nmodel_provider = "openai-chat-completions"\npreferred_auth_method = "apikey"\n\n[model_providers.openai-chat-completions]\nname = "OpenAI"\nbase_url = "${apiUrl}"\nenv_key = "OPENAI_API_KEY"\nwire_api = "openai"\n`
            };
        }
        
        const settingsConfigStr = JSON.stringify(settingsConfig);
        const updateSql = `UPDATE providers SET settings_config = '${settingsConfigStr.replace(/'/g, "''")}' WHERE id = '${id}' AND app_type = '${app}';`;
        await this.executeSqlite(dbPath, updateSql);
      }

      if (params.name) {
        const updateNameSql = `UPDATE providers SET name = '${params.name}' WHERE id = '${id}' AND app_type = '${app}';`;
        await this.executeSqlite(dbPath, updateNameSql);
      }

      return { success: true, message: 'Provider updated successfully' };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Duplicate a provider
   */
  async duplicateProvider(id: string, newId: string, app: string = 'claude'): Promise<{ success: boolean; message: string }> {
    try {
        const dbPath = await this.getDbPath();
        // Copy row with new ID
        const sql = `INSERT INTO providers (id, app_type, name, settings_config, category, meta, is_current, in_failover_queue, cost_multiplier, provider_type)
                     SELECT '${newId}', app_type, name || ' (Copy)', settings_config, category, meta, 0, 0, cost_multiplier, provider_type
                     FROM providers WHERE id = '${id}' AND app_type = '${app}';`;
        
        return await this.executeSqlite(dbPath, sql);
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }
  }

  /**
   * Run speedtest for a provider
   */
  async speedtestProvider(id: string, app: string = 'claude'): Promise<{ success: boolean; message: string; latency?: number }> {
      try {
          const args = ['provider', 'speedtest', id, '--app', app];
          const result = await this.execute(args);
          
          if (result.exitCode === 0) {
              // Parse latency from output if possible, e.g., "Latency: 150ms"
              const match = result.stdout.match(/Latency:\s*(\d+)ms/);
              const latency = match ? parseInt(match[1]) : undefined;
              return { success: true, message: result.stdout, latency };
          } else {
              return { success: false, message: result.stderr || result.stdout };
          }
      } catch (error) {
          return {
              success: false,
              message: error instanceof Error ? error.message : 'Unknown error',
          };
      }
  }

  /**
   * Get DB path from config
   */
  private async getDbPath(): Promise<string> {
    try {
      const result = await this.execute(['config', 'path']);
      const match = result.stdout.match(/DB file:\s*(.+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    } catch (e) {
      // Ignore error and fallback
    }
    return `${process.env.HOME}/.cc-switch/cc-switch.db`;
  }

  /**
   * Execute sqlite3 command
   */
  private async executeSqlite(dbPath: string, sql: string): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const child = spawn('sqlite3', [dbPath, sql]);
      let stderr = '';
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, message: 'Provider added successfully' });
        } else {
          resolve({ success: false, message: `Failed to add provider: ${stderr}` });
        }
      });

      child.on('error', (error) => {
        resolve({ success: false, message: `Failed to execute sqlite3: ${error.message}` });
      });
    });
  }

  /**
   * Edit a provider
   */

  /**
   * Duplicate a provider
   */

  /**
   * Speedtest a provider
   */

  /**
   * Delete a provider
   */
  async deleteProvider(providerId: string, app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = ['provider', 'delete', providerId];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to delete provider: ${result.stderr || result.stdout}`,
        };
      }

      configStorage.addLog({
        level: 'info',
        operation: 'delete_provider',
        message: `Deleted provider: ${providerId}`,
        details: { providerId },
      });

      return {
        success: true,
        message: `Successfully deleted provider: ${providerId}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Get current provider
   */
  async getCurrentProvider(app?: string): Promise<{ id: string; name: string } | null> {
    try {
      const args = ['provider', 'current'];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return null;
      }

      // Parse the output to extract provider info
      const lines = result.stdout.split('\n');
      for (const line of lines) {
        if (line.includes('→ Current:')) {
          const match = line.match(/→\s*Current:\s*(\S+)/);
          if (match && match[1]) {
            return { id: match[1], name: match[1] };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting current provider:', error);
      return null;
    }
  }

  // ============================================
  // MCP Server Management Methods
  // ============================================

  /**
   * List MCP servers
   */
  async listMcpServers(app?: string): Promise<Array<{
    id: string;
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>> {
    try {
      const args = ['mcp', 'list'];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        throw new Error(`Failed to list MCP servers: ${result.stderr}`);
      }

      return this.parseMcpList(result.stdout);
    } catch (error) {
      console.error('Error listing MCP servers:', error);
      return [];
    }
  }

  /**
   * Parse MCP list output
   */
  private parseMcpList(output: string): Array<{
    id: string;
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }> {
    const servers: Array<{
      id: string;
      name: string;
      command: string;
      args?: string[];
      env?: Record<string, string>;
    }> = [];

    if (output.includes('No MCP servers found')) {
      return servers;
    }

    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('┆')) {
        if (trimmed.includes('┌') || trimmed.includes('└') || trimmed.includes('╞') ||
            trimmed.includes('═') || trimmed.includes('─') || trimmed.includes('ID') ||
            trimmed.includes('Name')) {
          continue;
        }
        
        const cells = trimmed.split('┆').map(cell => cell.trim().replace(/[│┌┐└┘╞═╪╡║]/g, '').trim());
        if (cells.length >= 3) {
          const id = cells[1];
          const name = cells[2];
          const command = cells[3] || '';
          
          if (id && id !== '' && !id.includes('ℹ') && !id.includes('→')) {
            servers.push({
              id,
              name,
              command,
            });
          }
        }
      }
    }

    return servers;
  }

  /**
   * Add MCP server
   */
  async addMcpServer(params: {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    app?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const id = params.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const serverConfig = {
        command: params.command,
        args: params.args || [],
        env: params.env || {},
        disabled: false,
        autoUpdate: false
      };
      
      const serverConfigStr = JSON.stringify(serverConfig);
      
      // Determine which apps to enable for
      const enableClaude = params.app === 'claude' || !params.app ? 1 : 0;
      const enableCodex = params.app === 'codex' ? 1 : 0;
      const enableGemini = params.app === 'gemini' ? 1 : 0;
      const enableOpencode = 0;

      const sql = `INSERT OR REPLACE INTO mcp_servers (id, name, server_config, description, enabled_claude, enabled_codex, enabled_gemini, enabled_opencode) VALUES ('${id}', '${params.name}', '${serverConfigStr.replace(/'/g, "''")}', '', ${enableClaude}, ${enableCodex}, ${enableGemini}, ${enableOpencode});`;

      const dbPath = await this.getDbPath();
      return await this.executeSqlite(dbPath, sql);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Edit MCP server
   */

  /**
   * Toggle MCP server
   */
  async toggleMcpServer(id: string, enabled: boolean, app: string): Promise<{ success: boolean; message: string }> {
    try {
      let column = '';
      if (app === 'claude') column = 'enabled_claude';
      else if (app === 'codex') column = 'enabled_codex';
      else if (app === 'gemini') column = 'enabled_gemini';
      else if (app === 'opencode') column = 'enabled_opencode';
      else if (app === 'kilocode-cli') column = 'enabled_kilocode_cli';
      else if (app === 'amp') column = 'enabled_amp';
      else throw new Error(`Invalid app: ${app}`);

      const val = enabled ? 1 : 0;
      const sql = `UPDATE mcp_servers SET ${column} = ${val} WHERE id = '${id}';`;

      const dbPath = await this.getDbPath();
      return await this.executeSqlite(dbPath, sql);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Delete MCP server
   */
  async deleteMcpServer(serverId: string, _app?: string): Promise<{ success: boolean; message: string }> {
    try {
      // Use direct DB delete instead of CLI
      const sql = `DELETE FROM mcp_servers WHERE id = '${serverId}';`;
      const dbPath = await this.getDbPath();
      return await this.executeSqlite(dbPath, sql);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Toggle MCP server status (enable/disable) for an app
   */

  /**
   * Edit MCP server
   */

  /**
   * Sync MCP servers
   */
  async syncMcpServers(app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = ['mcp', 'sync'];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to sync MCP servers: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: 'Successfully synced MCP servers',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Toggle MCP server status (enable/disable) for an app
   */

  /**
   * Edit MCP server
   */
  async editMcpServer(params: {
      id: string;
      name?: string;
      command?: string;
      args?: string[];
      env?: Record<string, string>;
  }): Promise<{ success: boolean; message: string }> {
      try {
          const dbPath = await this.getDbPath();
          
          if (params.name) {
              const sql = `UPDATE mcp_servers SET name = '${params.name}' WHERE id = '${params.id}';`;
              await this.executeSqlite(dbPath, sql);
          }

          if (params.command || params.args || params.env) {
              // We can't easily merge without reading.
              // Let's try to read using raw execute
              const readCmd = ['sqlite3', dbPath, `SELECT server_config FROM mcp_servers WHERE id = '${params.id}';`];
              const readResult = await this.execute(readCmd);
              
              if (readResult.exitCode === 0 && readResult.stdout.trim()) {
                  let config = JSON.parse(readResult.stdout.trim());
                  
                  if (params.command) config.command = params.command;
                  if (params.args) config.args = params.args;
                  if (params.env) config.env = params.env;
                  
                  const configStr = JSON.stringify(config);
                  const updateSql = `UPDATE mcp_servers SET server_config = '${configStr.replace(/'/g, "''")}' WHERE id = '${params.id}';`;
                  await this.executeSqlite(dbPath, updateSql);
              }
          }
          
          return { success: true, message: 'MCP server updated' };

      } catch (error) {
          return {
              success: false,
              message: error instanceof Error ? error.message : 'Unknown error',
          };
      }
  }

  // ============================================
  // Prompts Management Methods
  // ============================================

  /**
   * List prompts
   */
  async listPrompts(app?: string): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    updated?: string;
  }>> {
    try {
      const args = ['prompts', 'list'];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        throw new Error(`Failed to list prompts: ${result.stderr}`);
      }

      return this.parsePromptsList(result.stdout);
    } catch (error) {
      console.error('Error listing prompts:', error);
      return [];
    }
  }

  /**
   * Parse prompts list output
   */
  private parsePromptsList(output: string): Array<{
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    updated?: string;
  }> {
    const prompts: Array<{
      id: string;
      name: string;
      description?: string;
      isActive: boolean;
      updated?: string;
    }> = [];

    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('┆')) {
        if (trimmed.includes('┌') || trimmed.includes('└') || trimmed.includes('╞') ||
            trimmed.includes('═') || trimmed.includes('─') || trimmed.includes('ID') ||
            trimmed.includes('Name')) {
          continue;
        }
        
        const cells = trimmed.split('┆').map(cell => cell.trim().replace(/[│┌┐└┘╞═╪╡║]/g, '').trim());
        if (cells.length >= 3) {
          const isActive = cells[0].includes('✓');
          const id = cells[1];
          const name = cells[2];
          const description = cells[3] || '';
          const updated = cells[4] || '';
          
          if (id && id !== '' && !id.includes('ℹ') && !id.includes('→')) {
            prompts.push({
              id,
              name,
              description,
              isActive,
              updated,
            });
          }
        }
      }
    }

    return prompts;
  }


  /**
   * Activate a prompt
   */
  async activatePrompt(promptId: string, app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = ['prompts', 'activate', promptId];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to activate prompt: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully activated prompt: ${promptId}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Deactivate the current prompt
   */
  async deactivatePrompt(app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = ['prompts', 'deactivate'];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to deactivate prompt: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: 'Successfully deactivated prompt',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  async createPrompt(params: {
      id: string;
      name: string;
      content: string;
      description?: string;
      app?: string;
  }): Promise<{ success: boolean; message: string }> {
      try {
          // Check for existing ID
          if (!/^[a-zA-Z0-9_-]+$/.test(params.id)) {
              return { success: false, message: 'Invalid ID format' };
          }
          
          const app = params.app || 'claude';
          const description = params.description || '';
          
          const sql = `INSERT INTO prompts (id, app_type, name, content, description, enabled, created_at, updated_at) VALUES ('${params.id}', '${app}', '${params.name}', '${params.content.replace(/'/g, "''")}', '${description.replace(/'/g, "''")}', 1, strftime('%s', 'now'), strftime('%s', 'now'));`;
          
          const dbPath = await this.getDbPath();
          return await this.executeSqlite(dbPath, sql);

      } catch (error) {
          return {
              success: false,
              message: error instanceof Error ? error.message : 'Unknown error',
          };
      }
  }

  async editPrompt(id: string, params: {
    name?: string;
    content?: string;
    description?: string;
    app?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const app = params.app || 'claude';
      let updates: string[] = [];
      
      if (params.name) updates.push(`name = '${params.name.replace(/'/g, "''")}'`);
      if (params.content) updates.push(`content = '${params.content.replace(/'/g, "''")}'`);
      if (params.description !== undefined) updates.push(`description = '${params.description.replace(/'/g, "''")}'`);
      updates.push(`updated_at = strftime('%s', 'now')`);
      
      if (updates.length === 1) return { success: true, message: 'No changes provided' };
      
      const sql = `UPDATE prompts SET ${updates.join(', ')} WHERE id = '${id}' AND app_type = '${app}';`;
      const dbPath = await this.getDbPath();
      return await this.executeSqlite(dbPath, sql);

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async deletePrompt(id: string, app: string = 'claude'): Promise<{ success: boolean; message: string }> {
      try {
          const sql = `DELETE FROM prompts WHERE id = '${id}' AND app_type = '${app}';`;
          const dbPath = await this.getDbPath();
          return await this.executeSqlite(dbPath, sql);
      } catch (error) {
          return {
              success: false,
              message: error instanceof Error ? error.message : 'Unknown error',
          };
      }
  }



  // ============================================
  // Skills Management Methods
  // ============================================

  /**
   * List skills
   */
  async listSkills(app?: string): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    installed: boolean;
  }>> {
    try {
      const args = ['skills', 'list'];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        throw new Error(`Failed to list skills: ${result.stderr}`);
      }

      return this.parseSkillsList(result.stdout);
    } catch (error) {
      console.error('Error listing skills:', error);
      return [];
    }
  }


  /**
   * Parse skills list output
   */
  private parseSkillsList(output: string): Array<{
    id: string;
    name: string;
    description?: string;
    installed: boolean;
  }> {
    const skills: Array<{
      id: string;
      name: string;
      description?: string;
      installed: boolean;
    }> = [];

    if (output.includes('No installed skills found')) {
      return skills;
    }

    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('┆')) {
        if (trimmed.includes('┌') || trimmed.includes('└') || trimmed.includes('╞') ||
            trimmed.includes('═') || trimmed.includes('─') || trimmed.includes('ID') ||
            trimmed.includes('Name')) {
          continue;
        }
        
        const cells = trimmed.split('┆').map(cell => cell.trim().replace(/[│┌┐└┘╞═╪╡║]/g, '').trim());
        if (cells.length >= 2) {
          const id = cells[0];
          const name = cells[1];
          const description = cells[2] || '';
          
          if (id && id !== '' && !id.includes('ℹ') && !id.includes('→')) {
            skills.push({
              id,
              name,
              description,
              installed: true,
            });
          }
        }
      }
    }

    return skills;
  }

  /**
   * Install a skill
   */
  async installSkill(skillName: string, app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = ['skills', 'install', skillName];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to install skill: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully installed skill: ${skillName}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Uninstall a skill
   */
  async uninstallSkill(skillName: string, app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = ['skills', 'uninstall', skillName];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to uninstall skill: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully uninstalled skill: ${skillName}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Search skills
   */
  async searchSkills(query: string): Promise<Array<{
    name: string;
    description: string;
    installed: boolean;
  }>> {
    try {
      const result = await this.execute(['skills', 'search', query]);
      
      if (result.exitCode !== 0) {
        return [];
      }

      // Parse search output
      // Format:
      // name  description  [installed]
      const skills: Array<{ name: string; description: string; installed: boolean }> = [];
      const lines = result.stdout.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('Name') || trimmed.includes('───')) continue;
        
        // Simple parsing assuming columns are separated by multiple spaces
        // This might need adjustment based on actual output
        const parts = trimmed.split(/\s{2,}/);
        if (parts.length >= 2) {
          const name = parts[0];
          const description = parts[1];
          const installed = line.includes('[installed]');
          
          skills.push({ name, description, installed });
        }
      }
      
      return skills;
    } catch (error) {
      console.error('Error searching skills:', error);
      return [];
    }
  }

  /**
   * List skill repos
   */
  async listSkillRepos(): Promise<Array<{ owner: string; name: string; branch: string; enabled: boolean }>> {
    try {
      const result = await this.execute(['skills', 'repos', 'list']);
      
      if (result.exitCode !== 0) {
        return [];
      }

      // Parse repos list
      const repos: Array<{ owner: string; name: string; branch: string; enabled: boolean }> = [];
      const lines = result.stdout.split('\n');
      
      for (const line of lines) {
        if (line.includes('┆')) {
           // Table format
           const cells = line.split('┆').map(c => c.trim().replace(/[│┌┐└┘╞═╪╡║]/g, '').trim());
           if (cells.length >= 3) {
             const repoStr = cells[0]; // owner/name
             const branch = cells[1];
             const enabled = cells[2].includes('✓');
             
             const [owner, name] = repoStr.split('/');
             if (owner && name) {
               repos.push({ owner, name, branch, enabled });
             }
           }
        }
      }
      
      return repos;
    } catch (error) {
      console.error('Error listing skill repos:', error);
      return [];
    }
  }

  /**
   * Add skill repo
   */
  async addSkillRepo(repo: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.execute(['skills', 'repos', 'add', repo]);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to add repo: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully added repo: ${repo}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Remove skill repo
   */
  async removeSkillRepo(repo: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.execute(['skills', 'repos', 'remove', repo]);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to remove repo: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully removed repo: ${repo}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Enable a skill
   */
  async enableSkill(skillName: string, app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = ['skills', 'enable', skillName];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to enable skill: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully enabled skill: ${skillName}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Disable a skill
   */
  async disableSkill(skillName: string, app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = ['skills', 'disable', skillName];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to disable skill: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully disabled skill: ${skillName}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  // ============================================
  // Config Management Methods
  // ============================================

  /**
   * Export configuration
   */
  async exportConfig(outputPath: string, app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = ['config', 'export', outputPath];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to export config: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully exported config to: ${outputPath}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Import configuration
   */
  async importConfig(inputPath: string, app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = ['config', 'import', inputPath];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to import config: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully imported config from: ${inputPath}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Backup configuration
   */
  async backupConfig(app?: string): Promise<{ success: boolean; message: string; backupPath?: string }> {
    try {
      const args = ['config', 'backup'];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to backup config: ${result.stderr || result.stdout}`,
        };
      }

      // Try to extract backup path from output
      const backupPathMatch = result.stdout.match(/(?:saved to|created at|backed up to):\s*(.+)/i);
      const backupPath = backupPathMatch ? backupPathMatch[1].trim() : undefined;

      return {
        success: true,
        message: 'Successfully created config backup',
        backupPath,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Restore configuration
   */
  async restoreConfig(backupPath: string, app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = ['config', 'restore', backupPath];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to restore config: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully restored config from: ${backupPath}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Get config path
   */
  async getConfigPath(app?: string): Promise<string | null> {
    try {
      const args = ['config', 'path'];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return null;
      }

      return result.stdout.trim();
    } catch (error) {
      console.error('Error getting config path:', error);
      return null;
    }
  }

  // ============================================
  // Environment Variables Management Methods
  // ============================================

  /**
   * List environment variables
   */
  async listEnvVars(app?: string): Promise<Array<{
    variable: string;
    value: string;
    sourceType: string;
    sourceLocation: string;
  }>> {
    try {
      const args = ['env', 'list'];
      if (app) {
        args.unshift('--app', app);
      }
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        throw new Error(`Failed to list environment variables: ${result.stderr}`);
      }

      return this.parseEnvList(result.stdout);
    } catch (error) {
      console.error('Error listing environment variables:', error);
      return [];
    }
  }

  /**
   * Parse environment variables list output
   */
  private parseEnvList(output: string): Array<{
    variable: string;
    value: string;
    sourceType: string;
    sourceLocation: string;
  }> {
    const envVars: Array<{
      variable: string;
      value: string;
      sourceType: string;
      sourceLocation: string;
    }> = [];

    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('┆')) {
        if (trimmed.includes('┌') || trimmed.includes('└') || trimmed.includes('╞') ||
            trimmed.includes('═') || trimmed.includes('─') || trimmed.includes('Variable') ||
            trimmed.includes('╌')) {
          continue;
        }
        
        const cells = trimmed.split('┆').map(cell => cell.trim().replace(/[│┌┐└┘╞═╪╡║]/g, '').trim());
        if (cells.length >= 4) {
          const variable = cells[0];
          const value = cells[1];
          const sourceType = cells[2];
          const sourceLocation = cells[3];
          
          if (variable && variable !== '' && !variable.includes('ℹ') && !variable.includes('→')) {
            envVars.push({
              variable,
              value,
              sourceType,
              sourceLocation,
            });
          }
        }
      }
    }

    return envVars;
  }

  /**
   * Get version
   */
  async getVersion(): Promise<string> {
    try {
      const result = await this.execute(['--version']);
      
      if (result.exitCode !== 0) {
        return 'unknown';
      }

      return result.stdout.trim();
    } catch (error) {
      console.error('Error getting version:', error);
      return 'unknown';
    }
  }
}

// Export singleton instance
export const ccSwitchAdapter = new CCSwitchAdapter();
