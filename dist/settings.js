import { readFile, writeFile, copyFile, chmod, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const CLAUDE_DIR = join(homedir(), '.claude');
const SETTINGS_PATH = join(CLAUDE_DIR, 'settings.json');
const STATUSLINE_DEST = join(CLAUDE_DIR, 'claude-dhikr-statusline.sh');
async function readSettings() {
    try {
        const raw = await readFile(SETTINGS_PATH, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
async function saveSettings(settings) {
    await mkdir(CLAUDE_DIR, { recursive: true });
    await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
}
// ── Spinner ──────────────────────────────────────
export async function writeSpinnerVerbs(verbs) {
    const settings = await readSettings();
    settings.spinnerVerbs = { mode: 'replace', verbs };
    await saveSettings(settings);
}
export async function restoreDefaultVerbs() {
    const settings = await readSettings();
    delete settings.spinnerVerbs;
    await saveSettings(settings);
}
// ── Statusline ───────────────────────────────────
function getPackageRoot() {
    return resolve(dirname(fileURLToPath(import.meta.url)), '..');
}
export async function installStatusline(config) {
    const src = join(getPackageRoot(), 'statusline.sh');
    await copyFile(src, STATUSLINE_DEST);
    await chmod(STATUSLINE_DEST, 0o755);
    let script = await readFile(STATUSLINE_DEST, 'utf-8');
    const safeCity = config.city.replace(/["\\\n$`]/g, '');
    script = script
        .replace(/^PRAYER_LAT=".*"$/m, `PRAYER_LAT="${config.latitude}"`)
        .replace(/^PRAYER_LNG=".*"$/m, `PRAYER_LNG="${config.longitude}"`)
        .replace(/^PRAYER_METHOD=".*"$/m, `PRAYER_METHOD="${config.method}"`)
        .replace(/^PRAYER_SCHOOL=".*"$/m, `PRAYER_SCHOOL="${config.school}"`)
        .replace(/^PRAYER_CITY=".*"$/m, `PRAYER_CITY="${safeCity}"`);
    await writeFile(STATUSLINE_DEST, script);
    const settings = await readSettings();
    settings.statusLine = { type: 'command', command: STATUSLINE_DEST };
    await saveSettings(settings);
    return STATUSLINE_DEST;
}
export async function removeStatusline() {
    const settings = await readSettings();
    if (settings.statusLine?.command?.includes('claude-dhikr')) {
        delete settings.statusLine;
        await saveSettings(settings);
    }
}
