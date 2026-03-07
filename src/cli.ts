import { getShuffled } from './dhikr.js';
import { writeSpinnerVerbs, restoreDefaultVerbs, installStatusline, removeStatusline } from './settings.js';
import { readConfig, writeConfig, configExists, METHODS, SCHOOLS } from './config.js';
import { createInterface } from 'node:readline';

const args = process.argv.slice(2);

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
  console.log('  claude-muslim setup');
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

async function install() {
  let config = await readConfig();
  const hasConfig = await configExists();

  if (!hasConfig) {
    config = await setup();
  }

  const verbs = getShuffled();
  await writeSpinnerVerbs(verbs);

  const path = await installStatusline(config);

  console.log('');
  console.log('  بسم الله');
  console.log('  claude-muslim');
  console.log('  ────────────────────────────────────────');
  console.log('');
  console.log('  While Claude thinks, remember Allah.');
  console.log('');
  for (const v of verbs.slice(0, 5)) {
    console.log(`    ✦ ${v}`);
  }
  console.log('');
  console.log(`  Prayer times → statusline (${config.city})`);
  console.log('');
  console.log('  claude-muslim              install');
  console.log('  claude-muslim setup        reconfigure location');
  console.log('  claude-muslim shuffle      re-shuffle dhikr');
  console.log('  claude-muslim uninstall    restore defaults');
  console.log('');
}

async function main() {
  const cmd = args[0];

  if (cmd === 'uninstall' || cmd === '--uninstall') {
    await restoreDefaultVerbs();
    await removeStatusline();
    console.log('  Restored defaults. Run `claude-muslim` to bring it back.');
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

  await install();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
