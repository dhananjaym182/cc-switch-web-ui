cc-switch command provide so many setup option that is not implemented api provider configuration is still completly incomplete and non working  since you had sqlite level access check which all things it provide and add it proelrly to the api provider configuration

]$ cc-switch provider add -a codex
Add New Provider
==================================================
> Select provider type: Add Third-Party Provider
> Provider Name: custom
> Website URL (opt.): https://custom.com/v1
Generated ID: custom

Configure Codex Provider:
> OpenAI API Key: sk-local
> Base URL: https://custom.com/v1
> Model:
> Configure optional fields (notes, sort index)? Yes

Optional Fields Configuration:
> Notes: note
> Sort Index:

=== Provider Configuration Summary ===
ID: custom
Provider Name:: custom
Website: https://custom.com/v1

Core Configuration:
  API Key: ***
  Config (TOML): 6 lines

Optional Fields:
  Notes: note
======================
>
Confirm create this provider? No
Cancelled.


$ cc-switch skills
Manage skills (list, install, uninstall)

Usage: cc-switch skills [OPTIONS] <COMMAND>

Commands:
  list              List installed skills (from ~/.cc-switch/skills.json)
  discover          Discover available skills (from enabled repos)
  install           Install a skill (SSOT -> app skills dir)
  uninstall         Uninstall a skill (remove from SSOT and app dirs)
  enable            Enable a skill for the selected app
  disable           Disable a skill for the selected app
  sync              Sync enabled skills to app skills dirs
  scan-unmanaged    Scan unmanaged skills in app skills dirs
  import-from-apps  Import unmanaged skills from app skills dirs into SSOT
  info              Show skill information
  sync-method       Get or set the skills sync method (auto|symlink|copy)
  repos             Manage skill repositories
  help              Print this message or the help of the given subcommand(s)

Options:
  -a, --app <APP>  Specify the application type [possible values: claude, codex, gemini]
  -v, --verbose    Enable verbose output
  -h, --help       Print help
