# Setup claude-dhikr

You are setting up claude-dhikr, a tool that replaces Claude Code's thinking spinner with dhikr (remembrance of Allah) and optionally adds a prayer times countdown to the statusline.

## Step 1: Ask the user

Ask these questions one at a time. Wait for each answer before continuing.

**First:** What would you like to install?
- Just the dhikr spinner (replaces Claude's thinking text with remembrance of Allah)
- Just the prayer times statusline (shows countdown to next salah)
- Both (recommended)

If the user wants the statusline (or both), ask:

**Second:** What city are you in?

**Third:** Do you follow the Hanafi school for Asr prayer time, or Shafi'i / Hanbali / Maliki?

If the user only wants the spinner, skip the city and school questions entirely.

## Step 2: Determine configuration

Only needed if installing the statusline. From the city name, use your knowledge to determine:

- **latitude** and **longitude** of the city
- **method** number for the Aladhan API based on the region the city is in (e.g. ISNA for North America, Umm Al-Qura for Saudi, MWL for Europe, Karachi for Pakistan). See `src/config.ts` for the full list of method IDs.
- **school**: `1` for Hanafi, `0` for Shafi'i/Hanbali/Maliki

## Step 3: Clone

```bash
git clone https://github.com/moizibnyousaf/claude-dhikr
cd claude-dhikr
```

No build step needed. The compiled output is included in the repo.

## Step 4: Write config and install

**Spinner only:**
```bash
node bin/claude-dhikr.js spinner
```

**Statusline only (or both):** Write the config file first, then install:
```bash
mkdir -p ~/.claude-muslim
cat > ~/.claude-muslim/config.json << 'CONF'
{
  "latitude": <lat>,
  "longitude": <lng>,
  "method": <method>,
  "school": <school>,
  "city": "<city>"
}
CONF
```

Then run:
```bash
node bin/claude-dhikr.js statusline   # statusline only
node bin/claude-dhikr.js              # both
```

## Step 5: Confirm

Tell the user:
- What was installed (show a few dhikr examples if the spinner was installed)
- They need to restart Claude Code (or start a new session) to see the changes
- `node claude-dhikr/bin/claude-dhikr.js setup` to reconfigure location
- `node claude-dhikr/bin/claude-dhikr.js uninstall` to remove everything

## Requirements

Node.js 18+ (no `npm install` needed; there are zero runtime dependencies). The statusline also needs `jq` and `curl`. If missing, help install with `brew install jq curl` (macOS) or the appropriate package manager.
