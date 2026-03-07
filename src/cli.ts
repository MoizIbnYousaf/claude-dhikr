import { getShuffled } from './dhikr.js';
import { writeSpinnerVerbs, restoreDefaultVerbs, installStatusline, removeStatusline } from './settings.js';
import { readConfig, writeConfig, configExists, METHODS, SCHOOLS } from './config.js';
import { createInterface } from 'node:readline';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);

function checkPrereqs(): void {
  const missing: string[] = [];
  for (const cmd of ['jq', 'curl']) {
    try { execSync(`which ${cmd}`, { stdio: 'ignore' }); }
    catch { missing.push(cmd); }
  }
  if (missing.length > 0) {
    console.log(`  Warning: ${missing.join(' and ')} not found. Prayer times statusline won't work.`);
    console.log(`  Install with: brew install ${missing.join(' ')}`);
    console.log('');
  }
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function setup() {
  console.log('');
  console.log('  claude-dhikr setup');
  console.log('  ────────────────────────────────────────');
  console.log('');

  const lat = await ask('  Latitude (e.g. 43.6532): ');
  const lng = await ask('  Longitude (e.g. -79.3832): ');
  const city = await ask('  City name (e.g. Toronto): ');
  console.log('');
  console.log('  Calculation methods:');
  for (const [id, name] of Object.entries(METHODS)) {
    console.log(`    ${id}. ${name}`);
  }
  const method = await ask('  Method [2]: ');
  console.log('');
  console.log('  Asr calculation:');
  for (const [id, name] of Object.entries(SCHOOLS)) {
    console.log(`    ${id}. ${name}`);
  }
  const school = await ask('  School [1]: ');

  const config = {
    latitude: parseFloat(lat) || 21.4225,
    longitude: parseFloat(lng) || 39.8262,
    method: parseInt(method) || 2,
    school: parseInt(school) || 1,
    city: city || 'Makkah',
  };

  await writeConfig(config);
  console.log('');
  console.log(`  Saved config for ${config.city}.`);
  return config;
}

async function installSpinner() {
  const verbs = getShuffled();
  await writeSpinnerVerbs(verbs);
  return verbs;
}

async function installPrayerTimes() {
  let config = await readConfig();
  const hasConfig = await configExists();
  if (!hasConfig) {
    config = await setup();
  }
  checkPrereqs();
  await installStatusline(config);
  return config;
}

async function install() {
  const verbs = await installSpinner();
  const config = await installPrayerTimes();

  console.log('');
  console.log('  بسم الله');
  console.log('  claude-dhikr');
  console.log('  ────────────────────────────────────────');
  console.log('');
  console.log('  While Claude thinks, remember Allah.');
  console.log('');
  for (const v of verbs.slice(0, 5)) {
    console.log(`    ✦ ${v}`);
  }
  console.log('');
  console.log(`  Prayer times in statusline (${config.city})`);
  console.log('');
  printCommands();
}

function printCommands() {
  console.log('  claude-dhikr              install everything');
  console.log('  claude-dhikr spinner      install dhikr spinner only');
  console.log('  claude-dhikr statusline   install prayer statusline only');
  console.log('  claude-dhikr setup        reconfigure location');
  console.log('  claude-dhikr shuffle      re-shuffle dhikr');
  console.log('  claude-dhikr uninstall    restore defaults');
  console.log('');
}

function printHelp() {
  console.log('');
  console.log('  claude-dhikr');
  console.log('  Dhikr spinner + prayer times statusline for Claude Code');
  console.log('');
  console.log('  Usage:');
  printCommands();
}

async function main() {
  const cmd = args[0];

  if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
    printHelp();
    return;
  }

  if (cmd === '--version' || cmd === '-v' || cmd === 'version') {
    const pkg = await import('../package.json', { with: { type: 'json' } });
    console.log(pkg.default.version);
    return;
  }

  if (cmd === 'uninstall' || cmd === '--uninstall') {
    await restoreDefaultVerbs();
    await removeStatusline();
    console.log('  Restored defaults. Run `claude-dhikr` to bring it back.');
    return;
  }

  if (cmd === 'shuffle' || cmd === '--shuffle') {
    const verbs = getShuffled();
    await writeSpinnerVerbs(verbs);
    console.log(`  Shuffled ${verbs.length} adhkar.`);
    return;
  }

  if (cmd === 'setup' || cmd === '--setup') {
    const config = await setup();
    await installStatusline(config);
    console.log('  Statusline updated.');
    return;
  }

  if (cmd === 'spinner') {
    const verbs = await installSpinner();
    console.log('');
    console.log('  بسم الله');
    console.log('  Dhikr spinner installed.');
    console.log('');
    for (const v of verbs.slice(0, 5)) {
      console.log(`    ✦ ${v}`);
    }
    console.log('');
    console.log('  Restart Claude Code to see it.');
    console.log('');
    return;
  }

  if (cmd === 'statusline') {
    const config = await installPrayerTimes();
    console.log('');
    console.log(`  Prayer times statusline installed (${config.city}).`);
    console.log('  Restart Claude Code to see it.');
    console.log('');
    return;
  }

  await install();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
