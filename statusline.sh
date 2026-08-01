#!/bin/bash
# ─────────────────────────────────────────────────────────
#  claude-dhikr statusline
#  Prayer times + dev context for Claude Code
#
#  Two-line layout:
#    line 1 · volatile state — model+modes · context · cost · lines · rate limits
#    line 2 · identity+life — dir · git · prayer countdown
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
    read -r project_dir
    read -r model
    read -r cost
    read -r added
    read -r removed
    read -r ctx_size
    read -r ctx_used
    read -r used_pct
    read -r effort
    read -r thinking
    read -r fast_mode
    read -r session_id
    read -r rl5_pct
    read -r rl5_reset
    read -r rl7_pct
    read -r rl7_reset
} <<< "$(echo "$input" | jq -r '
    (.workspace.current_dir // .cwd // ""),
    (.workspace.project_dir // ""),
    (.model.display_name // .model.id // ""),
    (.cost.total_cost_usd // 0),
    (.cost.total_lines_added // 0),
    (.cost.total_lines_removed // 0),
    (.context_window.context_window_size // 0),
    (.context_window.current_usage // 0),
    (.context_window.used_percentage // 0),
    (.effort.level // ""),
    (.thinking.enabled // false),
    (.fast_mode // false),
    (.session_id // ""),
    (.rate_limits.five_hour.used_percentage // ""),
    (.rate_limits.five_hour.resets_at // ""),
    (.rate_limits.seven_day.used_percentage // ""),
    (.rate_limits.seven_day.resets_at // "")
' 2>/dev/null)"

line1=""
line2=""

# ── 1. Model + session modes ────────────────────────────
if [ -n "$model" ]; then
    case "$model" in
        *[Ff]able*)  m="fable"  ;;
        *[Oo]pus*)   m="opus"   ;;
        *[Ss]onnet*) m="sonnet" ;;
        *[Hh]aiku*)  m="haiku"  ;;
        *)           m="$model" ;;
    esac
    case "$effort" in
        low)    m="${m}:lo"  ;;
        high)   m="${m}:hi"  ;;
        xhigh)  m="${m}:xh"  ;;
        max)    m="${m}:max" ;;
    esac
    [ "$thinking" = "true" ]  && m="${m} 💭"
    [ "$fast_mode" = "true" ] && m="${m} ⚡"
    line1="${PURPLE}${m}${RESET}"
fi

# ── 2. Context battery (auto-compact aware) ────────────
# 100% used = about to auto-compact (~33k tokens of headroom), not the raw window
if [ "$ctx_size" -gt 0 ] 2>/dev/null; then
    usable=$((ctx_size - 33000))
    [ "$usable" -le 0 ] && usable=$ctx_size

    if [ "$ctx_used" -gt 0 ] 2>/dev/null; then
        used_tokens=$ctx_used
    else
        pct_int=$(printf "%.0f" "$used_pct" 2>/dev/null)
        used_tokens=$(( ${pct_int:-0} * ctx_size / 100 ))
    fi

    remaining=$((100 - used_tokens * 100 / usable))
    [ "$remaining" -lt 0 ] && remaining=0
    [ "$remaining" -gt 100 ] && remaining=100

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

    line1="${line1}${S}${bar_clr}${remaining}%${RESET} ${DIM}left${RESET} ${bar}"
fi

# ── 3. Session cost ─────────────────────────────────────
if [ -n "$cost" ] && [ "$cost" != "0" ] && [ "$cost" != "0.0" ]; then
    cost_fmt=$(printf '$%.2f' "$cost")
    line1="${line1}${S}${GOLD}${cost_fmt}${RESET}"
fi

# ── 4. Lines changed ───────────────────────────────────
lines=""
[ "${added:-0}" -gt 0 ]   && lines="${GREEN}+${added}${RESET}"
[ "${removed:-0}" -gt 0 ] && { [ -n "$lines" ] && lines="${lines} "; lines="${lines}${RED}-${removed}${RESET}"; }
[ -n "$lines" ] && line1="${line1}${S}${lines}"

# ── 5. Rate-limit windows with pace delta ──────────────
# delta = used% - elapsed%: positive means burning faster than the window refills
rate_seg() { # $1=used_pct $2=resets_at_epoch $3=window_secs $4=label
    local pct reset now secs elapsed delta sign clr cd=""
    pct=$(printf "%.0f" "$1" 2>/dev/null) || return
    [ -z "$pct" ] && return
    reset=${2%%.*}
    case "$reset" in ''|*[!0-9]*) return ;; esac
    now=$(date +%s)
    secs=$((reset - now)); [ "$secs" -lt 0 ] && secs=0
    elapsed=$(( 100 * ($3 - secs) / $3 ))
    [ "$elapsed" -lt 0 ] && elapsed=0
    delta=$((pct - elapsed))
    if   [ "$delta" -le 0 ];  then clr="${GREEN}"; sign=""
    elif [ "$delta" -le 10 ]; then clr="${GOLD}";  sign="+"
    else                           clr="${RED}";   sign="+"
    fi
    if [ "$secs" -ge 3600 ]; then cd="$((secs / 3600))h$(( (secs % 3600) / 60 ))m"
    else cd="$((secs / 60))m"; fi
    printf '%b' "${MUTED}$4${RESET} ${clr}${pct}%${RESET} ${clr}${sign}${delta}${RESET} ${DIM}⟳${cd}${RESET}"
}

rl=""
if [ -n "$rl5_pct" ] && [ -n "$rl5_reset" ]; then
    rl=$(rate_seg "$rl5_pct" "$rl5_reset" 18000 "5h")
fi
if [ -n "$rl7_pct" ] && [ -n "$rl7_reset" ]; then
    seg7=$(rate_seg "$rl7_pct" "$rl7_reset" 604800 "7d")
    [ -n "$seg7" ] && { [ -n "$rl" ] && rl="${rl}${DIM} | ${RESET}"; rl="${rl}${seg7}"; }
fi
[ -n "$rl" ] && line1="${line1}${S}${rl}"

# ── 6. Directory + drift breadcrumb ────────────────────
# When cwd has drifted below the project root, show root ▸ relative-path
dir="" drift=""
if [ -n "$project_dir" ] && [ "$cwd" != "$project_dir" ] && [ "${cwd#"$project_dir"/}" != "$cwd" ]; then
    dir=$(basename "$project_dir")
    drift="${cwd#"$project_dir"/}"
else
    dir=$(basename "$cwd" 2>/dev/null)
fi
[ -n "$dir" ] && line2="${BLUE}${dir}${RESET}"
[ -n "$drift" ] && line2="${line2} ${GOLD}▸ ${drift}${RESET}"

# ── 7. Git branch + dirty state (lock-free) ────────────
if [ -n "$cwd" ] && git_root=$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null); then
    # symbolic-ref only reads HEAD — never touches the index or its lock
    branch=$(git -C "$cwd" --no-optional-locks symbolic-ref --short -q HEAD 2>/dev/null)
    if [ -n "$branch" ]; then
        # Cache porcelain status briefly so renders never race Claude's own git
        cache="${TMPDIR:-/tmp}/claude-dhikr-git-${session_id:-solo}-$(echo "$git_root" | cksum | cut -d' ' -f1)"
        now=$(date +%s)
        cache_age=$(( now - $(stat -c %Y "$cache" 2>/dev/null || echo 0) ))
        if [ "$cache_age" -gt 5 ] || [ ! -f "$cache" ]; then
            git -C "$cwd" --no-optional-locks status --porcelain=v1 -uno 2>/dev/null > "$cache.tmp" \
                && mv "$cache.tmp" "$cache"
        fi
        dirty=$(grep -c '^.[MD]' "$cache" 2>/dev/null); dirty=${dirty:-0}
        staged=$(grep -c '^[MADRC]' "$cache" 2>/dev/null); staged=${staged:-0}
        git_info="${GREEN}${branch}${RESET}"
        [ "$dirty" -gt 0 ]  && git_info="${git_info} ${GOLD}~${dirty}${RESET}"
        [ "$staged" -gt 0 ] && git_info="${git_info} ${GREEN}+${staged}${RESET}"
        line2="${line2}${S}${git_info}"
    fi
fi

# ── 8. Prayer times ────────────────────────────────────
# These values are patched by `claude-dhikr` on install
PRAYER_LAT="21.4225"
PRAYER_LNG="39.8262"
PRAYER_METHOD="4"
PRAYER_SCHOOL="0"
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
    line2="${line2}${prayer_seg}"
fi

# ── Output ──────────────────────────────────────────────
line1="${line1#"$S"}"
line2="${line2#"$S"}"
if [ -n "$line1" ] && [ -n "$line2" ]; then
    printf '%b\n%b' "$line1" "$line2"
else
    printf '%b' "${line1}${line2}"
fi
