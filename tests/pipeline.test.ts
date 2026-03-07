import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, accessSync, constants, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dir, '..');
const CLI = join(PROJECT_ROOT, 'bin', 'claude-dhikr.js');

function run(args: string, tmpHome: string): string {
  return execSync(`node "${CLI}" ${args}`, {
    encoding: 'utf-8',
    cwd: PROJECT_ROOT,
    env: { ...process.env, HOME: tmpHome },
    timeout: 15_000,
  });
}

describe('full pipeline', () => {
  let tmpHome: string;
  let settingsPath: string;
  let configPath: string;
  let statuslinePath: string;

  beforeAll(() => {
    tmpHome = mkdtempSync(join(tmpdir(), 'claude-dhikr-e2e-'));
    settingsPath = join(tmpHome, '.claude', 'settings.json');
    configPath = join(tmpHome, '.claude-muslim', 'config.json');
    statuslinePath = join(tmpHome, '.claude', 'claude-dhikr-statusline.sh');

    mkdirSync(join(tmpHome, '.claude'), { recursive: true });
    writeFileSync(settingsPath, '{}');

    mkdirSync(join(tmpHome, '.claude-muslim'), { recursive: true });
    writeFileSync(configPath, JSON.stringify({
      latitude: 43.6532,
      longitude: -79.3832,
      method: 2,
      school: 1,
      city: 'Toronto',
    }));
  });

  afterAll(() => {
    rmSync(tmpHome, { recursive: true, force: true });
  });

  // ── Install both ───────────────────────────────────

  describe('install (both)', () => {
    let installOutput: string;

    it('runs without error and shows bismillah', () => {
      installOutput = run('', tmpHome);
      expect(installOutput).toContain('بسم الله');
    });

    it('shows the city name in output', () => {
      expect(installOutput).toContain('Toronto');
    });

    it('shows dhikr examples with the star marker', () => {
      expect(installOutput).toContain('✦');
    });

    it('shows command reference', () => {
      expect(installOutput).toContain('claude-dhikr');
      expect(installOutput).toContain('uninstall');
      expect(installOutput).toContain('shuffle');
      expect(installOutput).toContain('setup');
    });
  });

  // ── settings.json after install ─────────────────────

  describe('settings.json after install', () => {
    let settings: Record<string, any>;

    it('settings.json exists and is valid JSON', () => {
      expect(existsSync(settingsPath)).toBe(true);
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      expect(settings).toBeDefined();
    });

    it('has spinnerVerbs with mode "replace"', () => {
      expect(settings.spinnerVerbs).toBeDefined();
      expect(settings.spinnerVerbs.mode).toBe('replace');
    });

    it('spinnerVerbs contains exactly 7 adhkar', () => {
      expect(settings.spinnerVerbs.verbs).toHaveLength(7);
    });

    it('spinnerVerbs includes SubhanAllah', () => {
      const has = settings.spinnerVerbs.verbs.some((v: string) => v.includes('SubhanAllah'));
      expect(has).toBe(true);
    });

    it('spinnerVerbs includes Rabbi zidni ilma', () => {
      const has = settings.spinnerVerbs.verbs.some((v: string) => v.includes('Rabbi zidni ilma'));
      expect(has).toBe(true);
    });

    it('spinnerVerbs includes La hawla', () => {
      const has = settings.spinnerVerbs.verbs.some((v: string) => v.includes('La hawla'));
      expect(has).toBe(true);
    });

    it('has statusLine with type "command"', () => {
      expect(settings.statusLine).toBeDefined();
      expect(settings.statusLine.type).toBe('command');
    });

    it('statusLine command points to the installed script', () => {
      expect(settings.statusLine.command).toBe(statuslinePath);
    });
  });

  // ── Statusline script after install ──────────────────

  describe('statusline script after install', () => {
    let scriptContent: string;

    it('statusline script exists', () => {
      expect(existsSync(statuslinePath)).toBe(true);
    });

    it('statusline script is executable', () => {
      expect(() => accessSync(statuslinePath, constants.X_OK)).not.toThrow();
    });

    it('has Toronto coordinates patched in', () => {
      scriptContent = readFileSync(statuslinePath, 'utf-8');
      expect(scriptContent).toContain('PRAYER_LAT="43.6532"');
      expect(scriptContent).toContain('PRAYER_LNG="-79.3832"');
    });

    it('has ISNA method patched in', () => {
      expect(scriptContent).toContain('PRAYER_METHOD="2"');
    });

    it('has Hanafi school patched in', () => {
      expect(scriptContent).toContain('PRAYER_SCHOOL="1"');
    });

    it('has city name patched in', () => {
      expect(scriptContent).toContain('PRAYER_CITY="Toronto"');
    });

    it('has the jq extraction logic', () => {
      expect(scriptContent).toContain('jq');
    });

    it('produces output when fed real JSON', () => {
      const testJson = JSON.stringify({ workspace: { current_dir: '/tmp/test' } });
      const out = execSync(`echo '${testJson}' | bash "${statuslinePath}"`, {
        encoding: 'utf-8',
        env: { ...process.env, HOME: tmpHome },
        timeout: 10_000,
      });
      expect(out.length).toBeGreaterThan(0);
    });
  });

  // ── Spinner-only install ────────────────────────────

  describe('spinner-only install', () => {
    it('installs just the spinner', () => {
      // Uninstall first to get clean state
      run('uninstall', tmpHome);
      const out = run('spinner', tmpHome);
      expect(out).toContain('بسم الله');
      expect(out).toContain('Dhikr spinner installed');

      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      expect(settings.spinnerVerbs).toBeDefined();
      expect(settings.spinnerVerbs.verbs).toHaveLength(7);
      expect(settings.statusLine).toBeUndefined();
    });
  });

  // ── Statusline-only install ─────────────────────────

  describe('statusline-only install', () => {
    it('installs just the statusline', () => {
      run('uninstall', tmpHome);
      const out = run('statusline', tmpHome);
      expect(out).toContain('Prayer times statusline installed');
      expect(out).toContain('Toronto');

      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      expect(settings.statusLine).toBeDefined();
      expect(settings.spinnerVerbs).toBeUndefined();
    });
  });

  // ── Config file ─────────────────────────────────────

  describe('config file', () => {
    it('config.json exists', () => {
      expect(existsSync(configPath)).toBe(true);
    });

    it('config has all required fields', () => {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(config.latitude).toBe(43.6532);
      expect(config.longitude).toBe(-79.3832);
      expect(config.method).toBe(2);
      expect(config.school).toBe(1);
      expect(config.city).toBe('Toronto');
    });
  });

  // ── Shuffle command ─────────────────────────────────

  describe('shuffle', () => {
    beforeAll(() => {
      // Reinstall spinner so shuffle has something to work with
      run('spinner', tmpHome);
    });

    it('reports shuffled count', () => {
      const out = run('shuffle', tmpHome);
      expect(out).toContain('Shuffled 7 adhkar');
    });

    it('settings still has 7 verbs after shuffle', () => {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      expect(settings.spinnerVerbs.verbs).toHaveLength(7);
    });

    it('shuffle changes the order (run 10 times, compare)', () => {
      const orders: string[] = [];
      for (let i = 0; i < 10; i++) {
        run('shuffle', tmpHome);
        const s = JSON.parse(readFileSync(settingsPath, 'utf-8'));
        orders.push(s.spinnerVerbs.verbs.join('|'));
      }
      const unique = new Set(orders);
      expect(unique.size).toBeGreaterThan(1);
    });
  });

  // ── Help and version ────────────────────────────────

  describe('help', () => {
    it('--help shows usage', () => {
      const out = run('--help', tmpHome);
      expect(out).toContain('Usage:');
      expect(out).toContain('spinner');
      expect(out).toContain('statusline');
      expect(out).toContain('uninstall');
    });

    it('-h also works', () => {
      const out = run('-h', tmpHome);
      expect(out).toContain('Usage:');
    });

    it('help subcommand also works', () => {
      const out = run('help', tmpHome);
      expect(out).toContain('Usage:');
    });
  });

  describe('version', () => {
    it('--version shows 1.0.0', () => {
      const out = run('--version', tmpHome).trim();
      expect(out).toBe('1.0.0');
    });

    it('-v also works', () => {
      const out = run('-v', tmpHome).trim();
      expect(out).toBe('1.0.0');
    });
  });

  // ── Uninstall ───────────────────────────────────────

  describe('uninstall', () => {
    let uninstallOutput: string;

    beforeAll(() => {
      // Install both first
      run('', tmpHome);
    });

    it('runs without error', () => {
      uninstallOutput = run('uninstall', tmpHome);
      expect(uninstallOutput).toContain('Restored defaults');
    });

    it('removes spinnerVerbs from settings.json', () => {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      expect(settings.spinnerVerbs).toBeUndefined();
    });

    it('removes statusLine from settings.json', () => {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      expect(settings.statusLine).toBeUndefined();
    });

    it('settings.json is still valid JSON with no extra keys', () => {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      expect(settings).toEqual({});
    });
  });

  // ── Settings preservation ───────────────────────────

  describe('preserves existing settings', () => {
    it('does not clobber other settings keys', () => {
      writeFileSync(settingsPath, JSON.stringify({
        someOtherKey: 'preserve-me',
        nested: { deep: true },
      }));

      run('', tmpHome);
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      expect(settings.someOtherKey).toBe('preserve-me');
      expect(settings.nested).toEqual({ deep: true });
      expect(settings.spinnerVerbs).toBeDefined();
      expect(settings.statusLine).toBeDefined();

      run('uninstall', tmpHome);
      const after = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      expect(after.someOtherKey).toBe('preserve-me');
      expect(after.nested).toEqual({ deep: true });
      expect(after.spinnerVerbs).toBeUndefined();
      expect(after.statusLine).toBeUndefined();
    });
  });

  // ── City name sanitization ──────────────────────────

  describe('city name sanitization', () => {
    it('handles city names with apostrophes', () => {
      writeFileSync(configPath, JSON.stringify({
        latitude: 43.65, longitude: -79.38, method: 2, school: 1,
        city: "St. John's",
      }));

      run('', tmpHome);
      const script = readFileSync(statuslinePath, 'utf-8');
      expect(script).toContain('PRAYER_CITY=');
    });

    it('strips dangerous characters from city names', () => {
      writeFileSync(configPath, JSON.stringify({
        latitude: 43.65, longitude: -79.38, method: 2, school: 1,
        city: 'test"$(whoami)`id`',
      }));

      run('', tmpHome);
      const script = readFileSync(statuslinePath, 'utf-8');
      // Extract the PRAYER_CITY line and verify injection characters are stripped
      const cityLine = script.split('\n').find(l => l.startsWith('PRAYER_CITY='))!;
      expect(cityLine).toBe('PRAYER_CITY="test(whoami)id"');
      expect(cityLine).not.toContain('$');
      expect(cityLine).not.toContain('`');
      expect(cityLine).not.toContain('"$(');
    });
  });
});
