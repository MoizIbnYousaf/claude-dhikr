# Setup claude-muslim

You are setting up claude-muslim, a tool that replaces Claude Code's thinking spinner with dhikr and adds prayer times to the statusline.

## Step 1: Ask the user two questions

Use AskUserQuestion (or equivalent) to ask:

1. **What city are you in?** (e.g. Toronto, London, Karachi, Dubai)
2. **Which school do you follow for Asr prayer time?**
   - Hanafi (later Asr time, shadow = 2x object length)
   - Shafi'i / Hanbali / Maliki (earlier Asr time, shadow = 1x object length)

Ask both in a single message. Wait for their response before continuing.

## Step 2: Determine configuration

From the city name, determine:

- **latitude** and **longitude** (you know the coordinates of major cities)
- **calculation method** based on the region:
  - North America: `2` (ISNA)
  - Europe: `3` (Muslim World League) or `12` (UOIF for France)
  - Saudi Arabia / Gulf: `4` (Umm Al-Qura)
  - Pakistan / Bangladesh / Afghanistan: `1` (University of Islamic Sciences, Karachi)
  - Egypt / North Africa: `5` (Egyptian General Authority)
  - Turkey: `13` (DIANET)
  - Iran: `7` (Institute of Geophysics, Tehran)
  - Kuwait: `9`
  - Qatar: `10`
  - Singapore / SE Asia: `11` (MUIS)
  - Russia: `14`
  - If unsure, default to `2` (ISNA)
- **school**: `1` for Hanafi, `0` for Shafi'i/Hanbali/Maliki

## Step 3: Clone and build

```bash
git clone https://github.com/moizibnyousaf/claude-muslim ~/projects/claude-muslim
cd ~/projects/claude-muslim
npm install && npm run build
```

## Step 4: Write config and install

Write the config file directly so the CLI skips the interactive wizard:

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

Then run the installer:

```bash
cd ~/projects/claude-muslim
node bin/claude-muslim.js
```

## Step 5: Confirm

Tell the user:
- Dhikr is now in their spinner (show a few examples from the output)
- Prayer times are in their statusline
- They need to restart Claude Code (or start a new session) to see both
- They can run `node ~/projects/claude-muslim/bin/claude-muslim.js setup` to reconfigure later
- They can run `node ~/projects/claude-muslim/bin/claude-muslim.js uninstall` to remove everything

## Requirements

The user needs Node.js 18+, `jq`, and `curl` installed. If any are missing, help them install with brew (macOS) or their package manager.
