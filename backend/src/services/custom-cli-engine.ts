import { spawn, SpawnOptions } from 'child_process';
import { CustomTool, RegisterToolRequest } from '../types/index';
import { configStorage } from './config-storage';

/**
 * Custom CLI Engine
 * Manages and executes custom CLI tools registered by the user
 */
export class CustomCLIEngine {
  /**
   * Execute a custom tool command
   */
  async executeTool(
    tool: CustomTool,
    args: string[] = []
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const spawnOptions: SpawnOptions = {
        env: { ...process.env, ...tool.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      };

      const fullArgs = [...(tool.args || []), ...args];
      const child = spawn(tool.command, fullArgs, spawnOptions);

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      const timeout = 60000; // 1 minute timeout
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`Tool execution timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', (code: number | null) => {
        clearTimeout(timer);
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code ?? 1,
        });
      });

      child.on('error', (error: Error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Validate a tool command before registration
   */
  async validateTool(request: RegisterToolRequest): Promise<{
    valid: boolean;
    error?: string;
  }> {
    // Check required fields
    if (!request.name || request.name.trim() === '') {
      return { valid: false, error: 'Tool name is required' };
    }

    if (!request.command || request.command.trim() === '') {
      return { valid: false, error: 'Command is required' };
    }

    // Check for duplicate names
    const existingTools = configStorage.getCustomTools();
    const duplicate = existingTools.find(
      (t) => t.name.toLowerCase() === request.name.toLowerCase()
    );
    if (duplicate) {
      return { valid: false, error: `Tool with name "${request.name}" already exists` };
    }

    // Try to verify the command exists (basic check)
    try {
      const result = await this.testCommand(request.command, request.args);
      if (result.exitCode !== 0 && result.stderr.includes('not found')) {
        return { valid: false, error: `Command not found: ${request.command}` };
      }
    } catch (error) {
      // Command test failed, but we'll allow registration anyway
      // The user might want to register a tool that's not available yet
      console.warn('Warning: Could not verify command:', error);
    }

    return { valid: true };
  }

  /**
   * Test if a command can be executed
   */
  private async testCommand(
    command: string,
    args?: string[]
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const timeout = 5000; // 5 second timeout for validation

      const child = spawn(command, args || ['--help'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        child.kill();
        // If it times out, the command probably exists but --help doesn't work
        resolve({ stdout, stderr, exitCode: 0 });
      }, timeout);

      child.on('close', (code: number | null) => {
        clearTimeout(timer);
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code ?? 1,
        });
      });

      child.on('error', (error: Error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Register a new custom tool
   */
  async registerTool(request: RegisterToolRequest): Promise<CustomTool> {
    const validation = await this.validateTool(request);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const tool: CustomTool = {
      id: configStorage.generateId(),
      name: request.name,
      description: request.description,
      command: request.command,
      args: request.args,
      env: request.env,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    configStorage.saveCustomTool(tool);

    configStorage.addLog({
      level: 'info',
      operation: 'register_tool',
      message: `Registered custom tool: ${tool.name}`,
      details: { toolId: tool.id, command: tool.command },
    });

    return tool;
  }

  /**
   * Unregister a custom tool
   */
  unregisterTool(toolId: string): boolean {
    const tool = configStorage.getCustomToolById(toolId);
    if (!tool) {
      return false;
    }

    const deleted = configStorage.deleteCustomTool(toolId);
    if (deleted) {
      configStorage.addLog({
        level: 'info',
        operation: 'unregister_tool',
        message: `Unregistered custom tool: ${tool.name}`,
        details: { toolId },
      });
    }

    return deleted;
  }

  /**
   * List all registered tools
   */
  listTools(): CustomTool[] {
    return configStorage.getCustomTools();
  }

  /**
   * Get a tool by ID
   */
  getTool(toolId: string): CustomTool | null {
    return configStorage.getCustomToolById(toolId);
  }

  /**
   * Run a tool by ID
   */
  async runTool(
    toolId: string,
    args: string[] = []
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const tool = this.getTool(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    configStorage.addLog({
      level: 'info',
      operation: 'run_tool',
      message: `Running custom tool: ${tool.name}`,
      details: { toolId, args },
    });

    try {
      const result = await this.executeTool(tool, args);

      configStorage.addLog({
        level: result.exitCode === 0 ? 'info' : 'warn',
        operation: 'tool_result',
        message: `Tool ${tool.name} completed with exit code ${result.exitCode}`,
        details: { toolId, exitCode: result.exitCode },
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      configStorage.addLog({
        level: 'error',
        operation: 'tool_error',
        message: `Tool ${tool.name} failed: ${errorMessage}`,
        details: { toolId, error: errorMessage },
      });

      throw error;
    }
  }
}

// Export singleton instance
export const customCLIEngine = new CustomCLIEngine();
