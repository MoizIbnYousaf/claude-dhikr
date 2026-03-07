# claude-dhikr

Dhikr spinner + prayer times statusline for Claude Code.

## Architecture

- `src/cli.ts` - CLI entry point, setup wizard, command routing
- `src/dhikr.ts` - 7 adhkar with Fisher-Yates shuffle
- `src/settings.ts` - reads/writes `~/.claude/settings.json` (spinnerVerbs + statusLine keys)
- `src/config.ts` - user config at `~/.claude-muslim/config.json` (lat, lng, method, school, city)
- `statusline.sh` - bash script installed to `~/.claude/claude-dhikr-statusline.sh`, patched with user's coordinates at install time
- `bin/claude-dhikr.js` - shebang wrapper that imports `dist/cli.js`

## Key contracts

- `spinnerVerbs`: `{ mode: "replace", verbs: string[] }` in settings.json
- `statusLine`: `{ type: "command", command: "/path/to/script.sh" }` in settings.json
- Statusline receives Claude's JSON on stdin, outputs ANSI text via `printf '%b'`
- Prayer times cached at `~/.cache/prayer-times/` (fetched once daily from Aladhan API)

## Commands

- `claude-dhikr` - install both spinner + statusline
- `claude-dhikr spinner` - install dhikr spinner only
- `claude-dhikr statusline` - install prayer statusline only (needs config)
- `claude-dhikr setup` - reconfigure location/method
- `claude-dhikr shuffle` - re-shuffle dhikr order
- `claude-dhikr uninstall` - remove everything

## Build and test

- `bun run build` (runs tsc)
- `bun test` (real e2e tests, no mocks, hits Aladhan API)
- `dist/` is gitignored, must build after cloning

## Statusline performance

- Single jq call with newline-separated output + `read` for multi-value extraction
- Statusline renders frequently; every subprocess matters
- `--no-optional-locks` on git commands to avoid blocking

## Style

- No emdash in prose or comments (emdash in dhikr display strings is fine)
- Keep console output minimal and tasteful
- Sanitize user input (strip `"`, `\`, `$`, `` ` ``) before patching into shell scripts
