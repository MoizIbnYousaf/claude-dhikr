# Setup claude-dhikr

You are setting up claude-dhikr, a tool that replaces Claude Code's thinking spinner with dhikr and optionally adds prayer times to the statusline.

## Step 1: Ask the user three questions

Ask the user all three in a single message. Wait for their response before continuing.

1. **What would you like to install?**
   - Just the dhikr spinner (replaces Claude's thinking text with remembrance of Allah)
   - Just the prayer times statusline (shows countdown to next prayer)
   - Both (recommended)

2. **What city are you in?** (e.g. Toronto, London, Karachi, Dubai)
   - Only needed if installing the statusline

3. **Which school do you follow for Asr prayer time?**
   - Hanafi (later Asr time)
   - Shafi'i / Hanbali / Maliki (earlier Asr time)
   - Only needed if installing the statusline

If the user only wants the spinner, skip questions 2 and 3.

## Step 2: Determine configuration

Only needed if installing the statusline. From the city name, determine:

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
  - India: `1` (Karachi) or `15` (Moonsighting Committee)
  - Sub-Saharan Africa: `3` (MWL)
  - If unsure, default to `2` (ISNA)
- **school**: `1` for Hanafi, `0` for Shafi'i/Hanbali/Maliki

## Step 3: Clone and build

```bash
git clone https://github.com/moizibnyousaf/claude-dhikr
cd claude-dhikr
npm install && npm run build
```

## Step 4: Install based on user's choice

**Spinner only:**
```bash
node bin/claude-dhikr.js spinner
```

**Statusline only:** Write config first, then install:
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
node bin/claude-dhikr.js statusline
```

**Both:** Write config first, then install:
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
node bin/claude-dhikr.js
```

## Step 5: Confirm

Tell the user:
- What was installed (show a few dhikr examples if spinner was installed)
- They need to restart Claude Code (or start a new session) to see the changes
- They can run `node claude-dhikr/bin/claude-dhikr.js setup` to reconfigure location
- They can run `node claude-dhikr/bin/claude-dhikr.js uninstall` to remove everything

## Requirements

The user needs Node.js 18+. If installing the statusline, they also need `jq` and `curl`. If any are missing, help them install with brew (macOS) or their package manager.
