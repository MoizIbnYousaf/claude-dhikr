# claude-muslim

Dhikr spinner + prayer times statusline for Claude Code.

## Architecture

- `src/cli.ts` - CLI entry point, setup wizard, command routing
- `src/dhikr.ts` - 7 adhkar with Fisher-Yates shuffle
- `src/settings.ts` - reads/writes `~/.claude/settings.json` (spinnerVerbs + statusLine keys)
- `src/config.ts` - user config at `~/.claude-muslim/config.json` (lat, lng, method, school, city)
- `statusline.sh` - bash script installed to `~/.claude/claude-muslim-statusline.sh`, patched with user's coordinates at install time
- `bin/claude-muslim.js` - shebang wrapper that imports `dist/cli.js`

## Key contracts

- `spinnerVerbs`: `{ mode: "replace", verbs: string[] }` in settings.json
- `statusLine`: `{ type: "command", command: "/path/to/script.sh" }` in settings.json
- Statusline receives Claude's JSON on stdin, outputs ANSI text via `printf '%b'`
- Prayer times cached at `~/.cache/prayer-times/` (fetched once daily from Aladhan API)

## Build

- `bun run build` (runs tsc)
- `dist/` is gitignored, must build after cloning
- `bun install` for deps (only @types/node and typescript)

## Testing

- No test framework; test manually with `node bin/claude-muslim.js`
- Test statusline: `echo '<json>' | ~/.claude/claude-muslim-statusline.sh`
- Verify settings.json after install/uninstall with `cat ~/.claude/settings.json | jq '.spinnerVerbs, .statusLine'`

## Statusline performance

- Minimize jq invocations; use `@tsv` + `read` to extract multiple values in one call
- Statusline renders frequently; every subprocess matters
- `--no-optional-locks` on git commands to avoid blocking

## Style

- No emdash in prose or comments (emdash in dhikr display strings is fine)
- Keep console output minimal and tasteful
- Sanitize user input before patching into shell scripts
