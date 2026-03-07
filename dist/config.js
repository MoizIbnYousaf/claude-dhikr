import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
const DEFAULT_CONFIG = {
    latitude: 21.4225,
    longitude: 39.8262,
    method: 2,
    school: 1,
    city: 'Makkah',
};
// Aladhan API calculation methods
export const METHODS = {
    1: 'University of Islamic Sciences, Karachi',
    2: 'Islamic Society of North America (ISNA)',
    3: 'Muslim World League (MWL)',
    4: 'Umm Al-Qura University, Makkah',
    5: 'Egyptian General Authority of Survey',
    7: 'Institute of Geophysics, University of Tehran',
    8: 'Gulf Region',
    9: 'Kuwait',
    10: 'Qatar',
    11: 'Majlis Ugama Islam Singapura',
    12: 'UOIF (France)',
    13: 'DIANET (Turkey)',
    14: 'Spiritual Administration of Muslims of Russia',
    15: 'Moonsighting Committee Worldwide',
};
export const SCHOOLS = {
    0: 'Shafi\'i / Hanbali / Maliki',
    1: 'Hanafi',
};
function getConfigDir() {
    return join(homedir(), '.claude-muslim');
}
function getConfigPath() {
    return join(getConfigDir(), 'config.json');
}
export async function readConfig() {
    try {
        const raw = await readFile(getConfigPath(), 'utf-8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
    catch {
        return { ...DEFAULT_CONFIG };
    }
}
export async function writeConfig(config) {
    const dir = getConfigDir();
    await mkdir(dir, { recursive: true });
    await writeFile(getConfigPath(), JSON.stringify(config, null, 2) + '\n');
}
export async function configExists() {
    try {
        await readFile(getConfigPath(), 'utf-8');
        return true;
    }
    catch {
        return false;
    }
}
