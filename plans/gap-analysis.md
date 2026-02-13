# CC-Switch Web UI - Comprehensive Gap Analysis

**Generated:** 2026-02-13  
**Purpose:** Identify all gaps between backend APIs and frontend UI components

---

## Table of Contents

1. [API Endpoint Inventory](#1-api-endpoint-inventory)
2. [Frontend API Service Coverage](#2-frontend-api-service-coverage)
3. [UI Component Coverage](#3-ui-component-coverage)
4. [Gap Analysis](#4-gap-analysis)
5. [Custom Apps Analysis](#5-custom-apps-analysis)
6. [Priority Fixes](#6-priority-fixes)

---

## 1. API Endpoint Inventory

### 1.1 Providers API (`/api/providers`)

| Method | Endpoint | Description | CLI Equivalent |
|--------|----------|-------------|----------------|
| GET | `/api/providers` | List all providers | `provider list` |
| GET | `/api/providers/current` | Get current active provider | `provider current` |
| POST | `/api/providers/switch` | Switch to a provider | `provider switch <id>` |
| POST | `/api/providers/add` | Add a new provider | `provider add` |
| POST | `/api/providers/edit` | Edit an existing provider | `provider edit <id>` |
| POST | `/api/providers/duplicate` | Duplicate a provider | `provider duplicate <id>` |
| POST | `/api/providers/speedtest` | Run speedtest for a provider | `provider speedtest <id>` |
| DELETE | `/api/providers/:providerId` | Delete a provider | `provider delete <id>` |

### 1.2 MCP API (`/api/mcp`)

| Method | Endpoint | Description | CLI Equivalent |
|--------|----------|-------------|----------------|
| GET | `/api/mcp` | List all MCP servers | `mcp list` |
| POST | `/api/mcp` | Add a new MCP server | `mcp add` |
| POST | `/api/mcp/edit` | Edit an MCP server | `mcp edit <id>` |
| POST | `/api/mcp/toggle` | Toggle MCP server enabled state | `mcp enable/disable <id>` |
| DELETE | `/api/mcp/:serverId` | Delete an MCP server | `mcp delete <id>` |
| POST | `/api/mcp/sync` | Sync MCP servers | `mcp sync` |

### 1.3 Prompts API (`/api/prompts`)

| Method | Endpoint | Description | CLI Equivalent |
|--------|----------|-------------|----------------|
| GET | `/api/prompts` | List all prompts | `prompts list` |
| POST | `/api/prompts/:promptId/activate` | Activate a prompt | `prompts activate <id>` |
| POST | `/api/prompts/create` | Create a new prompt | `prompts create` |
| POST | `/api/prompts/edit` | Edit a prompt | `prompts edit <id>` |
| DELETE | `/api/prompts/:promptId` | Delete a prompt | `prompts delete <id>` |

### 1.4 Skills API (`/api/skills`)

| Method | Endpoint | Description | CLI Equivalent |
|--------|----------|-------------|----------------|
| GET | `/api/skills` | List all skills | `skills list` |
| GET | `/api/skills/search` | Search skills | `skills search <query>` |
| POST | `/api/skills/install` | Install a skill | `skills install <name>` |
| POST | `/api/skills/uninstall` | Uninstall a skill | `skills uninstall <name>` |
| GET | `/api/skills/repos` | List skill repos | `skills repos list` |
| POST | `/api/skills/repos` | Add a skill repo | `skills repos add <repo>` |
| DELETE | `/api/skills/repos` | Remove a skill repo | `skills repos remove <repo>` |

### 1.5 Config API (`/api/config`)

| Method | Endpoint | Description | CLI Equivalent |
|--------|----------|-------------|----------------|
| GET | `/api/config` | Get current configuration | `config show` |
| GET | `/api/config/path` | Get configuration file path | `config path` |
| POST | `/api/config/export` | Export configuration | `config export <path>` |
| POST | `/api/config/import` | Import configuration | `config import <path>` |
| POST | `/api/config/backup` | Backup configuration | `config backup` |
| POST | `/api/config/restore` | Restore configuration | `config restore` |

### 1.6 Environment Variables API (`/api/env`)

| Method | Endpoint | Description | CLI Equivalent |
|--------|----------|-------------|----------------|
| GET | `/api/env` | List environment variables | `env list` |

### 1.7 Custom Tools API (`/api/custom-tools`)

| Method | Endpoint | Description | CLI Equivalent |
|--------|----------|-------------|----------------|
| GET | `/api/custom-tools` | List all custom tools | N/A - Web UI specific |
| GET | `/api/custom-tools/:id` | Get a specific tool | N/A - Web UI specific |
| POST | `/api/custom-tools/register` | Register a new tool | N/A - Web UI specific |
| POST | `/api/custom-tools/:id/run` | Run a custom tool | N/A - Web UI specific |
| DELETE | `/api/custom-tools/:id` | Unregister a tool | N/A - Web UI specific |

### 1.8 Settings API (`/api/settings`)

| Method | Endpoint | Description | CLI Equivalent |
|--------|----------|-------------|----------------|
| GET | `/api/settings` | Get application settings | N/A - Web UI specific |
| PUT | `/api/settings` | Update settings | N/A - Web UI specific |

---

## 2. Frontend API Service Coverage

### 2.1 providersApi Coverage

| Backend Endpoint | Frontend Method | Status |
|-----------------|-----------------|--------|
| `GET /api/providers` | `list()` | ✅ Implemented |
| `GET /api/providers/current` | - | ❌ **MISSING** |
| `POST /api/providers/switch` | `switch(providerId)` | ✅ Implemented |
| `POST /api/providers/add` | `add(data)` | ✅ Implemented |
| `POST /api/providers/edit` | `edit(data)` | ✅ Implemented |
| `POST /api/providers/duplicate` | `duplicate(data)` | ✅ Implemented |
| `POST /api/providers/speedtest` | `speedtest(providerId, app?)` | ✅ Implemented |
| `DELETE /api/providers/:providerId` | `delete(providerId)` | ✅ Implemented |

### 2.2 mcpApi Coverage

| Backend Endpoint | Frontend Method | Status |
|-----------------|-----------------|--------|
| `GET /api/mcp` | `list(app?)` | ✅ Implemented |
| `POST /api/mcp` | `add(data)` | ✅ Implemented |
| `POST /api/mcp/edit` | `edit(data)` | ✅ Implemented |
| `POST /api/mcp/toggle` | `toggle(id, enabled, app)` | ✅ Implemented |
| `DELETE /api/mcp/:serverId` | `delete(serverId, app?)` | ✅ Implemented |
| `POST /api/mcp/sync` | `sync(app?)` | ✅ Implemented |

### 2.3 promptsApi Coverage

| Backend Endpoint | Frontend Method | Status |
|-----------------|-----------------|--------|
| `GET /api/prompts` | `list(app?)` | ✅ Implemented |
| `POST /api/prompts/:promptId/activate` | `activate(promptId, app?)` | ✅ Implemented |
| `POST /api/prompts/create` | `create(data)` | ✅ Implemented |
| `POST /api/prompts/edit` | `edit(data)` | ✅ Implemented |
| `DELETE /api/prompts/:promptId` | `delete(promptId, app?)` | ✅ Implemented |

### 2.4 skillsApi Coverage

| Backend Endpoint | Frontend Method | Status |
|-----------------|-----------------|--------|
| `GET /api/skills` | `list(app?)` | ✅ Implemented |
| `GET /api/skills/search` | `search(query)` | ✅ Implemented |
| `POST /api/skills/install` | `install(skillName, app?)` | ✅ Implemented |
| `POST /api/skills/uninstall` | `uninstall(skillName, app?)` | ✅ Implemented |
| `GET /api/skills/repos` | `listRepos()` | ✅ Implemented |
| `POST /api/skills/repos` | `addRepo(repo)` | ✅ Implemented |
| `DELETE /api/skills/repos` | - | ❌ **MISSING** |

### 2.5 configApi Coverage

| Backend Endpoint | Frontend Method | Status |
|-----------------|-----------------|--------|
| `GET /api/config` | `get()` | ✅ Implemented |
| `GET /api/config/path` | `getPath(app?)` | ✅ Implemented |
| `POST /api/config/export` | `export(request)` | ✅ Implemented |
| `POST /api/config/import` | `import(request)` | ✅ Implemented |
| `POST /api/config/backup` | `backup(app?)` | ✅ Implemented |
| `POST /api/config/restore` | `restore(request)` | ✅ Implemented |

### 2.6 envApi Coverage

| Backend Endpoint | Frontend Method | Status |
|-----------------|-----------------|--------|
| `GET /api/env` | `list(app?)` | ✅ Implemented |

### 2.7 customToolsApi Coverage

| Backend Endpoint | Frontend Method | Status |
|-----------------|-----------------|--------|
| `GET /api/custom-tools` | `list()` | ✅ Implemented |
| `GET /api/custom-tools/:id` | - | ❌ **MISSING** |
| `POST /api/custom-tools/register` | `register(tool)` | ✅ Implemented |
| `POST /api/custom-tools/:id/run` | - | ❌ **MISSING** |
| `DELETE /api/custom-tools/:id` | `delete(toolId)` | ✅ Implemented |

### 2.8 settingsApi Coverage

| Backend Endpoint | Frontend Method | Status |
|-----------------|-----------------|--------|
| `GET /api/settings` | `get()` | ✅ Implemented |
| `PUT /api/settings` | `update(settings)` | ✅ Implemented |

---

## 3. UI Component Coverage

### 3.1 Providers.tsx

| API Method | UI Usage | Status |
|------------|----------|--------|
| `providersApi.list()` | ✅ Used in `fetchProviders()` | ✅ Implemented |
| `providersApi.switch()` | ✅ Used in `handleSwitch()` | ✅ Implemented |
| `providersApi.delete()` | ✅ Used in `handleDelete()` | ✅ Implemented |
| `providersApi.add()` | ✅ Used in `handleAdd()` | ✅ Implemented |
| `providersApi.edit()` | ❌ Not used | ⚠️ **API exists, no UI** |
| `providersApi.duplicate()` | ❌ Not used | ⚠️ **API exists, no UI** |
| `providersApi.speedtest()` | ❌ Not used | ⚠️ **API exists, no UI** |

### 3.2 McpServers.tsx

| API Method | UI Usage | Status |
|------------|----------|--------|
| `mcpApi.list()` | ✅ Used in `fetchServers()` | ✅ Implemented |
| `mcpApi.sync()` | ✅ Used in `handleSync()` | ✅ Implemented |
| `mcpApi.delete()` | ✅ Used in `handleDelete()` | ✅ Implemented |
| `mcpApi.add()` | ❌ Shows alert to use CLI | ⚠️ **API exists, no UI** |
| `mcpApi.edit()` | ❌ Not used | ⚠️ **API exists, no UI** |
| `mcpApi.toggle()` | ❌ Not used | ⚠️ **API exists, no UI** |

### 3.3 Prompts.tsx

| API Method | UI Usage | Status |
|------------|----------|--------|
| `promptsApi.list()` | ✅ Used in `fetchPrompts()` | ✅ Implemented |
| `promptsApi.activate()` | ✅ Used in `handleActivate()` | ✅ Implemented |
| `promptsApi.create()` | ✅ Used in `handleCreate()` | ✅ Implemented |
| `promptsApi.edit()` | ✅ Used in `handleEdit()` | ✅ Implemented |
| `promptsApi.delete()` | ✅ Used in `handleDelete()` | ✅ Implemented |

**Status: ✅ FULL COVERAGE**

### 3.4 Skills.tsx

| API Method | UI Usage | Status |
|------------|----------|--------|
| `skillsApi.list()` | ✅ Used in `fetchSkills()` | ✅ Implemented |
| `skillsApi.search()` | ✅ Used in `handleSearch()` | ✅ Implemented |
| `skillsApi.install()` | ✅ Used in `handleInstall()` | ✅ Implemented |
| `skillsApi.uninstall()` | ✅ Used in `handleUninstall()` | ✅ Implemented |
| `skillsApi.listRepos()` | ❌ Not used | ⚠️ **API exists, no UI** |
| `skillsApi.addRepo()` | ❌ Not used | ⚠️ **API exists, no UI** |

### 3.5 Config.tsx

| API Method | UI Usage | Status |
|------------|----------|--------|
| `configApi.getPath()` | ✅ Used in `fetchConfigPath()` | ✅ Implemented |
| `configApi.export()` | ✅ Used in `handleExport()` | ✅ Implemented |
| `configApi.import()` | ✅ Used in `handleImport()` | ✅ Implemented |
| `configApi.backup()` | ✅ Used in `handleBackup()` | ✅ Implemented |
| `configApi.restore()` | ✅ Used in `handleRestore()` | ✅ Implemented |
| `configApi.get()` | ❌ Not used | ⚠️ **API exists, no UI** |

### 3.6 EnvVars.tsx

| API Method | UI Usage | Status |
|------------|----------|--------|
| `envApi.list()` | ✅ Used in `fetchEnvVars()` | ✅ Implemented |

**Status: ✅ FULL COVERAGE** (read-only as designed)

### 3.7 CustomTools.tsx

| API Method | UI Usage | Status |
|------------|----------|--------|
| `customToolsApi.list()` | ✅ Used in `fetchTools()` | ✅ Implemented |
| `customToolsApi.register()` | ✅ Used in `handleSubmit()` | ✅ Implemented |
| `customToolsApi.delete()` | ✅ Used in `handleDelete()` | ✅ Implemented |
| `customToolsApi.get()` | ❌ Not available | ❌ **Missing in API service** |
| `customToolsApi.run()` | ❌ Not available | ❌ **Missing in API service** |

### 3.8 Settings.tsx

| API Method | UI Usage | Status |
|------------|----------|--------|
| `settingsApi.get()` | ✅ Used in `fetchSettings()` | ✅ Implemented |
| `settingsApi.update()` | ✅ Used in `handleSave()` | ✅ Implemented |

**Status: ✅ FULL COVERAGE**

---

## 4. Gap Analysis

### 4.1 Backend Endpoints Not Called from Frontend API Service

| Category | Endpoint | Impact |
|----------|----------|--------|
| Providers | `GET /api/providers/current` | Medium - Cannot show current provider indicator |
| Skills | `DELETE /api/skills/repos` | Low - Cannot remove skill repos |
| Custom Tools | `GET /api/custom-tools/:id` | Low - Minor feature |
| Custom Tools | `POST /api/custom-tools/:id/run` | Medium - Cannot run tools from UI |

### 4.2 Frontend API Methods Not Used in UI Components

| Page | API Method | Impact |
|------|------------|--------|
| Providers | `providersApi.edit()` | High - Cannot edit providers |
| Providers | `providersApi.duplicate()` | Medium - Cannot duplicate providers |
| Providers | `providersApi.speedtest()` | Medium - Cannot test provider latency |
| MCP Servers | `mcpApi.add()` | High - Cannot add MCP servers |
| MCP Servers | `mcpApi.edit()` | High - Cannot edit MCP servers |
| MCP Servers | `mcpApi.toggle()` | High - Cannot enable/disable servers |
| Skills | `skillsApi.listRepos()` | Medium - Cannot manage repos |
| Skills | `skillsApi.addRepo()` | Medium - Cannot add repos |
| Config | `configApi.get()` | Low - Raw config display not needed |

### 4.3 CLI Commands Missing Backend Support

| Category | CLI Command | Priority |
|----------|-------------|----------|
| MCP | `mcp validate <command>` | Low |
| MCP | `mcp import --app` | Medium |
| Prompts | `prompts current` | Medium |
| Prompts | `prompts deactivate` | Medium |
| Prompts | `prompts show <id>` | Low |
| Skills | `skills enable <name>` | High |
| Skills | `skills disable <name>` | High |
| Skills | `skills info <name>` | Low |
| Skills | `skills sync` | Medium |
| Skills | `skills sync-method` | Low |
| Skills | `skills scan-unmanaged` | Low |
| Skills | `skills import-from-apps` | Low |
| Config | `config validate` | Low |
| Config | `config common show` | Medium |
| Config | `config common set` | Medium |
| Config | `config common clear` | Medium |
| Config | `config reset` | Medium |
| Env | `env check` | Medium |

### 4.4 UI Features Lacking Backend Support

| Feature | Description | Priority |
|---------|-------------|----------|
| Run Custom Tools | Execute registered custom tools | Medium |
| Skill Enable/Disable | Toggle skills per app | High |
| Prompt Deactivate | Deactivate current prompt | Medium |
| Config Validation | Validate config before save | Low |

---

## 5. Custom Apps Analysis

### 5.1 Supported Apps

The CLI supports three applications via the `--app` flag:
- `claude` (default)
- `codex`
- `gemini`

### 5.2 Backend App Support

The backend properly supports the `app` parameter in most endpoints:

| Endpoint Category | App Parameter Support |
|-------------------|----------------------|
| Providers | ✅ Via query/body param |
| MCP | ✅ Via query/body param |
| Prompts | ✅ Via query/body param |
| Skills | ✅ Via query/body param |
| Config | ✅ Via query/body param |
| Env | ✅ Via query param |

### 5.3 Frontend App Support

| Page | App Selector UI | Status |
|------|-----------------|--------|
| Providers | ✅ In Add Provider modal | Partial |
| MCP Servers | ❌ Not present | Missing |
| Prompts | ❌ Not present | Missing |
| Skills | ❌ Not present | Missing |
| Config | ❌ Not present | Missing |
| Env Vars | ❌ Not present | Missing |

### 5.4 Custom Apps (kilocode-cli, opencode, amp)

**Finding:** The mentioned custom apps (`kilocode-cli`, `opencode`, `amp`) are **NOT** implemented in the codebase. The CLI only supports `claude`, `codex`, and `gemini`.

**Recommendation:** If support for these custom apps is required, significant development is needed:
1. Extend CLI adapter to recognize custom app configurations
2. Add app type definitions to types
3. Create app selection UI components
4. Update all API endpoints to handle custom app types

---

## 6. Priority Fixes

### 6.1 High Priority (Core Functionality Gaps)

| # | Issue | Fix Required | Impact |
|---|-------|--------------|--------|
| 1 | MCP Add/Edit/Toggle UI missing | Add modal forms and toggle switches | Users cannot manage MCP servers from UI |
| 2 | Provider Edit UI missing | Add edit modal to Providers page | Users cannot modify existing providers |
| 3 | Skills enable/disable missing | Add backend endpoint and UI | Cannot control which apps use which skills |
| 4 | App selector missing on most pages | Add global app context/selector | Users can only manage Claude config |

### 6.2 Medium Priority (Feature Completeness)

| # | Issue | Fix Required | Impact |
|---|-------|--------------|--------|
| 5 | Provider duplicate UI missing | Add duplicate button/action | Users cannot easily copy providers |
| 6 | Provider speedtest UI missing | Add speedtest button with results | Users cannot test provider latency |
| 7 | Skill repos management UI missing | Add repos section to Skills page | Users cannot manage skill repositories |
| 8 | Run custom tools missing | Add API method and UI | Users cannot execute registered tools |
| 9 | Prompt deactivate missing | Add backend endpoint and UI button | Cannot deactivate active prompt |
| 10 | Current provider indicator missing | Add API call for `/current` endpoint | Dashboard cannot show current state |

### 6.3 Low Priority (Nice to Have)

| # | Issue | Fix Required | Impact |
|---|-------|--------------|--------|
| 11 | Remove skill repo API missing | Add `removeRepo()` to skillsApi | Cannot remove repos from UI |
| 12 | Get single custom tool missing | Add `get()` to customToolsApi | Minor - list is usually sufficient |
| 13 | Raw config display missing | Add config viewer to Config page | Users cannot view raw config |
| 14 | Config validation missing | Add backend endpoint | Minor validation feature |
| 15 | Prompt show content missing | Add backend endpoint | Cannot view full prompt content |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total Backend Endpoints | 35 |
| Frontend API Methods Implemented | 31 |
| Frontend API Methods Missing | 4 |
| UI Components with Full Coverage | 4/8 |
| CLI Commands Missing Backend | 17 |
| High Priority Fixes | 4 |
| Medium Priority Fixes | 6 |
| Low Priority Fixes | 5 |

---

## Next Steps

1. **Immediate:** Implement MCP Add/Edit/Toggle UI (highest user impact)
2. **Short-term:** Add Provider Edit, Duplicate, Speedtest UI
3. **Short-term:** Implement global app selector context
4. **Medium-term:** Add Skills enable/disable and repos management
5. **Medium-term:** Add Custom Tools run functionality
6. **Long-term:** Implement remaining CLI command coverage
