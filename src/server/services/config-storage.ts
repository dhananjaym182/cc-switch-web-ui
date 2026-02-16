import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  AppConfig,
  Profile,
  CustomTool,
  LogEntry,
  ProfilesStorage,
  CustomToolsStorage,
  LogsStorage,
} from '../types/index.js';

/**
 * File-based configuration storage service
 * Stores data in ~/.cc-switch-web/ directory
 */
export class ConfigStorage {
  private readonly dataDir: string;
  private readonly configPath: string;
  private readonly profilesPath: string;
  private readonly customToolsPath: string;
  private readonly logsPath: string;

  private readonly DEFAULT_MAX_LOG_ENTRIES = 1000;

  constructor() {
    this.dataDir = path.join(os.homedir(), '.cc-switch-web');
    this.configPath = path.join(this.dataDir, 'config.json');
    this.profilesPath = path.join(this.dataDir, 'profiles.json');
    this.customToolsPath = path.join(this.dataDir, 'custom-tools.json');
    this.logsPath = path.join(this.dataDir, 'logs.json');

    this.ensureDataDir();
  }

  /**
   * Ensure the data directory exists
   */
  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  // ============================================
  // App Config
  // ============================================

  /**
   * Get the application config
   */
  getAppConfig(): AppConfig {
    const defaultConfig: AppConfig = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      settings: {
        lastProviderId: null,
        lastProfileId: null,
        autoSwitch: false,
        theme: 'dark',
        notifications: true,
      },
    };

    if (!fs.existsSync(this.configPath)) {
      this.saveAppConfig(defaultConfig);
      return defaultConfig;
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(content) as AppConfig;
    } catch (error) {
      console.error('Error reading config, returning default:', error);
      return defaultConfig;
    }
  }

  /**
   * Save the application config
   */
  saveAppConfig(config: AppConfig): void {
    config.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  // ============================================
  // Profiles
  // ============================================

  /**
   * Get all saved profiles
   */
  getProfiles(): Profile[] {
    const defaultStorage: ProfilesStorage = { profiles: [] };

    if (!fs.existsSync(this.profilesPath)) {
      this.saveProfiles(defaultStorage.profiles);
      return defaultStorage.profiles;
    }

    try {
      const content = fs.readFileSync(this.profilesPath, 'utf-8');
      const storage = JSON.parse(content) as ProfilesStorage;
      return storage.profiles || [];
    } catch (error) {
      console.error('Error reading profiles, returning empty:', error);
      return [];
    }
  }

  /**
   * Save all profiles
   */
  saveProfiles(profiles: Profile[]): void {
    const storage: ProfilesStorage = { profiles };
    fs.writeFileSync(this.profilesPath, JSON.stringify(storage, null, 2), 'utf-8');
  }

  /**
   * Get a profile by ID
   */
  getProfileById(id: string): Profile | null {
    const profiles = this.getProfiles();
    return profiles.find((p) => p.id === id) || null;
  }

  /**
   * Add or update a profile
   */
  saveProfile(profile: Profile): void {
    const profiles = this.getProfiles();
    const existingIndex = profiles.findIndex((p) => p.id === profile.id);

    if (existingIndex >= 0) {
      profiles[existingIndex] = {
        ...profile,
        updatedAt: new Date().toISOString(),
      };
    } else {
      profiles.push({
        ...profile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    this.saveProfiles(profiles);
  }

  /**
   * Delete a profile by ID
   */
  deleteProfile(id: string): boolean {
    const profiles = this.getProfiles();
    const filtered = profiles.filter((p) => p.id !== id);

    if (filtered.length === profiles.length) {
      return false; // Nothing was deleted
    }

    this.saveProfiles(filtered);
    return true;
  }

  // ============================================
  // Custom Tools
  // ============================================

  /**
   * Get all custom tools
   */
  getCustomTools(): CustomTool[] {
    const defaultStorage: CustomToolsStorage = { tools: [] };

    if (!fs.existsSync(this.customToolsPath)) {
      this.saveCustomTools(defaultStorage.tools);
      return defaultStorage.tools;
    }

    try {
      const content = fs.readFileSync(this.customToolsPath, 'utf-8');
      const storage = JSON.parse(content) as CustomToolsStorage;
      return storage.tools || [];
    } catch (error) {
      console.error('Error reading custom tools, returning empty:', error);
      return [];
    }
  }

  /**
   * Save all custom tools
   */
  saveCustomTools(tools: CustomTool[]): void {
    const storage: CustomToolsStorage = { tools };
    fs.writeFileSync(this.customToolsPath, JSON.stringify(storage, null, 2), 'utf-8');
  }

  /**
   * Get a custom tool by ID
   */
  getCustomToolById(id: string): CustomTool | null {
    const tools = this.getCustomTools();
    return tools.find((t) => t.id === id) || null;
  }

  /**
   * Add or update a custom tool
   */
  saveCustomTool(tool: CustomTool): void {
    const tools = this.getCustomTools();
    const existingIndex = tools.findIndex((t) => t.id === tool.id);

    if (existingIndex >= 0) {
      tools[existingIndex] = {
        ...tool,
        updatedAt: new Date().toISOString(),
      };
    } else {
      tools.push({
        ...tool,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    this.saveCustomTools(tools);
  }

  /**
   * Delete a custom tool by ID
   */
  deleteCustomTool(id: string): boolean {
    const tools = this.getCustomTools();
    const filtered = tools.filter((t) => t.id !== id);

    if (filtered.length === tools.length) {
      return false; // Nothing was deleted
    }

    this.saveCustomTools(filtered);
    return true;
  }

  // ============================================
  // Logs
  // ============================================

  /**
   * Get recent logs
   */
  getLogs(limit: number = 100): LogEntry[] {
    if (!fs.existsSync(this.logsPath)) {
      this.saveLogs([]);
      return [];
    }

    try {
      const content = fs.readFileSync(this.logsPath, 'utf-8');
      const storage = JSON.parse(content) as LogsStorage;
      const logs = storage.logs || [];
      return logs.slice(-limit);
    } catch (error) {
      console.error('Error reading logs, returning empty:', error);
      return [];
    }
  }

  /**
   * Save all logs
   */
  saveLogs(logs: LogEntry[]): void {
    const storage: LogsStorage = {
      logs,
      maxEntries: this.DEFAULT_MAX_LOG_ENTRIES,
    };
    fs.writeFileSync(this.logsPath, JSON.stringify(storage, null, 2), 'utf-8');
  }

  /**
   * Add a log entry
   */
  addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): LogEntry {
    const logs = this.getLogs(this.DEFAULT_MAX_LOG_ENTRIES);
    
    const newEntry: LogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    logs.push(newEntry);

    // Keep only the last N entries
    const trimmed = logs.slice(-this.DEFAULT_MAX_LOG_ENTRIES);
    this.saveLogs(trimmed);

    return newEntry;
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.saveLogs([]);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Generate a unique ID
   */
  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get the data directory path
   */
  getDataDir(): string {
    return this.dataDir;
  }

  /**
   * Check if storage is accessible
   */
  isAccessible(): boolean {
    try {
      this.ensureDataDir();
      const testFile = path.join(this.dataDir, '.test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const configStorage = new ConfigStorage();
