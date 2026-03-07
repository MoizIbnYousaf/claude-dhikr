import { describe, it, expect, beforeAll } from 'bun:test';
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const SCRIPT = resolve(import.meta.dir, '../statusline.sh');

function runStatusline(json: string, env?: Record<string, string>): string {
  return execSync(`echo '${json.replace(/'/g, "'\\''")}' | bash "${SCRIPT}"`, {
    encoding: 'utf-8',
    env: { ...process.env, ...env },
    timeout: 10_000,
  });
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

const FULL_JSON = JSON.stringify({
  workspace: { current_dir: '/tmp/test-project' },
  model: { display_name: 'Claude Opus 4.6' },
  cost: { total_cost_usd: 2.47, total_lines_added: 120, total_lines_removed: 30 },
  context_window: { context_window_size: 200000, used_percentage: 40 },
});

describe('statusline script', () => {
  describe('JSON extraction', () => {
    it('extracts directory name from workspace', () => {
      const out = stripAnsi(runStatusline(FULL_JSON));
      expect(out).toContain('test-project');
    });

    it('normalizes Opus model name to lowercase', () => {
      const out = stripAnsi(runStatusline(FULL_JSON));
      expect(out).toContain('opus');
    });

    it('normalizes Sonnet model name to lowercase', () => {
      const json = JSON.stringify({
        workspace: { current_dir: '/tmp/x' },
        model: { display_name: 'Claude Sonnet 4.6' },
      });
      const out = stripAnsi(runStatusline(json));
      expect(out).toContain('sonnet');
    });

    it('normalizes Haiku model name to lowercase', () => {
      const json = JSON.stringify({
        workspace: { current_dir: '/tmp/x' },
        model: { display_name: 'Claude Haiku 4.5' },
      });
      const out = stripAnsi(runStatusline(json));
      expect(out).toContain('haiku');
    });

    it('shows session cost formatted as dollars', () => {
      const out = stripAnsi(runStatusline(FULL_JSON));
      expect(out).toContain('$2.47');
    });

    it('shows lines added and removed', () => {
      const out = stripAnsi(runStatusline(FULL_JSON));
      expect(out).toContain('+120');
      expect(out).toContain('-30');
    });

    it('shows context percentage remaining', () => {
      const out = stripAnsi(runStatusline(FULL_JSON));
      expect(out).toContain('60%');
      expect(out).toContain('left');
    });

    it('hides cost when zero', () => {
      const json = JSON.stringify({
        workspace: { current_dir: '/tmp/x' },
        cost: { total_cost_usd: 0 },
      });
      const out = stripAnsi(runStatusline(json));
      expect(out).not.toContain('$');
    });

    it('hides lines when zero', () => {
      const json = JSON.stringify({
        workspace: { current_dir: '/tmp/x' },
        cost: { total_lines_added: 0, total_lines_removed: 0 },
      });
      const out = stripAnsi(runStatusline(json));
      expect(out).not.toMatch(/[+-]\d+/);
    });
  });

  describe('context battery bar', () => {
    it('shows 10 filled blocks at 0% used', () => {
      const json = JSON.stringify({
        workspace: { current_dir: '/tmp/x' },
        context_window: { context_window_size: 200000, used_percentage: 0 },
      });
      const out = runStatusline(json);
      const blocks = (out.match(/▰/g) || []).length;
      expect(blocks).toBe(10);
    });

    it('shows remaining percentage at high usage', () => {
      const json = JSON.stringify({
        workspace: { current_dir: '/tmp/x' },
        context_window: { context_window_size: 200000, used_percentage: 85 },
      });
      const out = stripAnsi(runStatusline(json));
      expect(out).toContain('15%');
    });
  });

  describe('prayer times with cache', () => {
    let tmpHome: string;

    beforeAll(() => {
      tmpHome = mkdtempSync(join(tmpdir(), 'claude-dhikr-test-'));
      const cacheDir = join(tmpHome, '.cache', 'prayer-times');
      mkdirSync(cacheDir, { recursive: true });

      const timings = {
        Fajr: '05:30', Sunrise: '06:45', Dhuhr: '12:15',
        Asr: '15:45', Sunset: '18:30', Maghrib: '18:30',
        Isha: '20:00', Imsak: '05:20', Midnight: '00:15',
        Firstthird: '22:10', Lastthird: '02:20',
      };
      writeFileSync(join(cacheDir, 'times.json'), JSON.stringify(timings));
      const today = new Date().toISOString().split('T')[0];
      writeFileSync(join(cacheDir, 'times.date'), today);
    });

    it('shows a prayer name from the cache', () => {
      const json = JSON.stringify({ workspace: { current_dir: '/tmp/x' } });
      const out = stripAnsi(runStatusline(json, { HOME: tmpHome }));
      const hasPrayer = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].some(p => out.includes(p));
      expect(hasPrayer).toBe(true);
    });

    it('shows a countdown with h/m format', () => {
      const json = JSON.stringify({ workspace: { current_dir: '/tmp/x' } });
      const out = stripAnsi(runStatusline(json, { HOME: tmpHome }));
      expect(out).toMatch(/\d+h?\d+m/);
    });

    it('shows the clock time', () => {
      const json = JSON.stringify({ workspace: { current_dir: '/tmp/x' } });
      const out = stripAnsi(runStatusline(json, { HOME: tmpHome }));
      expect(out).toMatch(/\d+:\d+(am|pm)/);
    });

    it('shows the bracket delimiters', () => {
      const json = JSON.stringify({ workspace: { current_dir: '/tmp/x' } });
      const out = stripAnsi(runStatusline(json, { HOME: tmpHome }));
      expect(out).toContain('「');
      expect(out).toContain('」');
    });
  });

  describe('graceful degradation', () => {
    it('does not crash with empty JSON', () => {
      const out = runStatusline('{}');
      expect(typeof out).toBe('string');
    });

    it('shows directory with minimal JSON', () => {
      const json = JSON.stringify({ workspace: { current_dir: '/tmp/x' } });
      const out = stripAnsi(runStatusline(json));
      expect(out).toContain('x');
    });

    it('handles missing cost fields', () => {
      const json = JSON.stringify({ workspace: { current_dir: '/tmp/x' }, model: { id: 'opus' } });
      const out = stripAnsi(runStatusline(json));
      expect(out).toContain('x');
      expect(out).not.toContain('$');
    });
  });

  describe('git integration', () => {
    let gitDir: string;

    beforeAll(() => {
      gitDir = mkdtempSync(join(tmpdir(), 'claude-dhikr-git-'));
      execSync('git init && git commit --allow-empty -m "init"', { cwd: gitDir, stdio: 'ignore' });
    });

    it('shows the git branch name', () => {
      const json = JSON.stringify({ workspace: { current_dir: gitDir } });
      const out = stripAnsi(runStatusline(json));
      const hasBranch = out.includes('main') || out.includes('master');
      expect(hasBranch).toBe(true);
    });

    it('shows dirty file count when tracked files are modified', () => {
      writeFileSync(join(gitDir, 'tracked.txt'), 'original');
      execSync('git add tracked.txt && git commit -m "add"', { cwd: gitDir, stdio: 'ignore' });
      writeFileSync(join(gitDir, 'tracked.txt'), 'modified');
      const json = JSON.stringify({ workspace: { current_dir: gitDir } });
      const out = stripAnsi(runStatusline(json));
      expect(out).toContain('~1');
    });
  });
});
