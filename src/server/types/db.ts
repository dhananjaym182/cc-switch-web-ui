export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
  autoUpdate?: boolean;
}

export interface McpServerRecord {
  id: string;
  name: string;
  server_config: string; // JSON string of McpServerConfig
  description?: string;
  homepage?: string;
  docs?: string;
  tags?: string; // JSON string array
  enabled_claude: boolean;
  enabled_codex: boolean;
  enabled_gemini: boolean;
  enabled_opencode: boolean;
}
