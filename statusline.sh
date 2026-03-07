#!/bin/bash
# ─────────────────────────────────────────────────────────
#  claude-dhikr statusline
#  Prayer times + dev context for Claude Code
# ─────────────────────────────────────────────────────────

input=$(cat)

# ── Colors ───────────────────────────────────────────────
BLUE='\033[38;2;122;162;247m'
GREEN='\033[38;2;158;206;106m'
PURPLE='\033[38;2;187;154;247m'
GOLD='\033[38;2;224;175;104m'
RED='\033[38;2;247;118;142m'
DIM='\033[38;2;86;95;137m'
MUTED='\033[38;2;115;122;162m'
RESET='\033[0m'

S="${DIM} · ${RESET}"

# ── Extract data from Claude's JSON (single jq call) ─────
{
    read -r cwd
    read -r model
    read -r cost
    read -r added
    read -r removed
    read -r ctx_size
    read -r used_pct
} <<< "$(echo "$input" | jq -r '
    (.workspace.current_dir // .cwd // ""),
    (.model.display_name // .model.id // ""),
    (.cost.total_cost_usd // 0),
    (.cost.total_lines_added // 0),
    (.cost.total_lines_removed // 0),
    (.context_window.context_window_size // 0),
    (.context_window.used_percentage // 0)
' 2>/dev/null)"

out=""

# ── 1. Directory ────────────────────────────────────────
dir=$(basename "$cwd" 2>/dev/null)
[ -n "$dir" ] && out="${BLUE}${dir}${RESET}"

# ── 2. Git branch + dirty state ────────────────────────
if [ -n "$cwd" ] && git -C "$cwd" rev-parse --git-dir >/dev/null 2>&1; then
    branch=$(git -C "$cwd" --no-optional-locks branch --show-current 2>/dev/null)
    if [ -n "$branch" ]; then
        dirty=$(git -C "$cwd" --no-optional-locks diff --name-only 2>/dev/null | wc -l | tr -d ' ')
        staged=$(git -C "$cwd" --no-optional-locks diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
        git_info="${GREEN}${branch}${RESET}"
        [ "$dirty" -gt 0 ]  && git_info="${git_info} ${GOLD}~${dirty}${RESET}"
        [ "$staged" -gt 0 ] && git_info="${git_info} ${GREEN}+${staged}${RESET}"
        out="${out}${S}${git_info}"
    fi
fi

# ── 3. Model ────────────────────────────────────────────
if [ -n "$model" ]; then
    case "$model" in
        *[Oo]pus*)   m="opus"   ;;
        *[Ss]onnet*) m="sonnet" ;;
        *[Hh]aiku*)  m="haiku"  ;;
        *)           m="$model" ;;
    esac
    out="${out}${S}${PURPLE}${m}${RESET}"
fi

# ── 4. Context battery ─────────────────────────────────
if [ "$ctx_size" -gt 0 ] 2>/dev/null; then
    pct=$(printf "%.0f" "$used_pct" 2>/dev/null)
    [ -z "$pct" ] && pct=0
    remaining=$((100 - pct))

    if   [ "$remaining" -gt 50 ]; then bar_clr="${GREEN}"
    elif [ "$remaining" -gt 20 ]; then bar_clr="${GOLD}"
    else                               bar_clr="${RED}"
    fi

    filled=$(( (remaining + 5) / 10 ))
    [ "$remaining" -gt 0 ] && [ "$filled" -eq 0 ] && filled=1
    [ "$filled" -gt 10 ] && filled=10
    empty=$((10 - filled))

    bar=""
    i=0; while [ $i -lt $filled ]; do bar="${bar}${bar_clr}▰${RESET}"; i=$((i+1)); done
    i=0; while [ $i -lt $empty  ]; do bar="${bar}${DIM}▰${RESET}"; i=$((i+1)); done

    out="${out}${S}${bar_clr}${remaining}%${RESET} ${DIM}left${RESET} ${bar}"
fi

# ── 5. Session cost ─────────────────────────────────────
if [ -n "$cost" ] && [ "$cost" != "0" ] && [ "$cost" != "0.0" ]; then
    cost_fmt=$(printf '$%.2f' "$cost")
    out="${out}${S}${GOLD}${cost_fmt}${RESET}"
fi

# ── 6. Lines changed ───────────────────────────────────
lines=""
[ "${added:-0}" -gt 0 ]   && lines="${GREEN}+${added}${RESET}"
[ "${removed:-0}" -gt 0 ] && { [ -n "$lines" ] && lines="${lines} "; lines="${lines}${RED}-${removed}${RESET}"; }
[ -n "$lines" ] && out="${out}${S}${lines}"

# ── 7. Prayer times ────────────────────────────────────
# These values are patched by `claude-dhikr` on install
PRAYER_LAT="21.4225"
PRAYER_LNG="39.8262"
PRAYER_METHOD="2"
PRAYER_SCHOOL="1"
PRAYER_CITY="Makkah"
PRAYER_CACHE_DIR="$HOME/.cache/prayer-times"
PRAYER_CACHE="$PRAYER_CACHE_DIR/times.json"
PRAYER_DATE_FILE="$PRAYER_CACHE_DIR/times.date"

TODAY=$(date +%Y-%m-%d)
if [ ! -f "$PRAYER_DATE_FILE" ] || [ "$(cat "$PRAYER_DATE_FILE" 2>/dev/null)" != "$TODAY" ] || [ ! -f "$PRAYER_CACHE" ]; then
    mkdir -p "$PRAYER_CACHE_DIR"
    api_resp=$(curl -s --max-time 4 --connect-timeout 2 \
        "https://api.aladhan.com/v1/timings/$(date +%d-%m-%Y)?latitude=${PRAYER_LAT}&longitude=${PRAYER_LNG}&method=${PRAYER_METHOD}&school=${PRAYER_SCHOOL}" 2>/dev/null)
    if echo "$api_resp" | jq -e '.code == 200' >/dev/null 2>&1; then
        echo "$api_resp" | jq '.data.timings' > "$PRAYER_CACHE"
        echo "$TODAY" > "$PRAYER_DATE_FILE"
    fi
fi

if [ -f "$PRAYER_CACHE" ]; then
    now_mins=$(( 10#$(date +%H) * 60 + 10#$(date +%M) ))

    {
        read -r p_fajr
        read -r p_dhuhr
        read -r p_asr
        read -r p_maghrib
        read -r p_isha
    } <<< "$(jq -r '.Fajr, .Dhuhr, .Asr, .Maghrib, .Isha' "$PRAYER_CACHE" 2>/dev/null)"

    to_mins() { echo $(( 10#${1%%:*} * 60 + 10#${1##*:} )); }

    to_12h() {
        local hr=$((10#${1%%:*})) min=${1##*:} suffix="am"
        if [ $hr -ge 12 ]; then suffix="pm"; [ $hr -gt 12 ] && hr=$((hr - 12)); fi
        [ $hr -eq 0 ] && hr=12
        echo "${hr}:${min}${suffix}"
    }

    m_fajr=$(to_mins "$p_fajr")
    m_dhuhr=$(to_mins "$p_dhuhr")
    m_asr=$(to_mins "$p_asr")
    m_maghrib=$(to_mins "$p_maghrib")
    m_isha=$(to_mins "$p_isha")

    next_name="" next_time="" next_mins=0
    if   [ $now_mins -lt $m_fajr ];    then next_name="Fajr";    next_time="$(to_12h "$p_fajr")";    next_mins=$m_fajr
    elif [ $now_mins -lt $m_dhuhr ];   then next_name="Dhuhr";   next_time="$(to_12h "$p_dhuhr")";   next_mins=$m_dhuhr
    elif [ $now_mins -lt $m_asr ];     then next_name="Asr";     next_time="$(to_12h "$p_asr")";     next_mins=$m_asr
    elif [ $now_mins -lt $m_maghrib ]; then next_name="Maghrib"; next_time="$(to_12h "$p_maghrib")"; next_mins=$m_maghrib
    elif [ $now_mins -lt $m_isha ];    then next_name="Isha";    next_time="$(to_12h "$p_isha")";    next_mins=$m_isha
    else
        next_name="Fajr"; next_time="$(to_12h "$p_fajr")"; next_mins=$((m_fajr + 1440))
    fi

    remaining=$((next_mins - now_mins))

    if [ $remaining -ge 60 ]; then
        countdown="$((remaining / 60))h$((remaining % 60))m"
    else
        countdown="${remaining}m"
    fi

    clock=$(date +%l:%M%p | tr -d ' ' | tr '[:upper:]' '[:lower:]')

    if [ $remaining -gt 60 ]; then
        diamond="${DIM}◇${RESET}"
        dashes="${DIM} ─── ${RESET}"
        cd_clr="${PURPLE}"
    elif [ $remaining -gt 15 ]; then
        diamond="${DIM}◇${RESET}"
        dashes="${DIM} ── ${RESET}"
        cd_clr="${PURPLE}"
    elif [ $remaining -gt 5 ]; then
        diamond="${GOLD}◆${RESET}"
        dashes="${GOLD} ─ ${RESET}"
        cd_clr="${GOLD}"
    else
        diamond="${RED}◆${RESET}"
        dashes=" "
        cd_clr="${RED}"
    fi

    prayer_seg="  ${DIM}「${RESET} ${MUTED}${clock}${RESET} ${diamond} ${BLUE}${next_name}${RESET} ${DIM}${next_time}${RESET}${dashes}${cd_clr}${countdown}${RESET} ${DIM}」${RESET}"
    out="${out}${prayer_seg}"
fi

# ── Output ──────────────────────────────────────────────
printf '%b' "$out"
