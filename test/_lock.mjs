// Imported first by every browser script. It makes sure the dev server is up, then re-runs the
// script under a machine-wide lock so only one software-rendered browser is working at a time.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
if (!process.env.SKEP_LOCKED) {
  spawnSync('bash', [path.join(import.meta.dirname, 'serve.sh')], { stdio: 'ignore' });
  const r = spawnSync('flock', ['/tmp/skep-browser.lock', process.execPath, ...process.argv.slice(1)], { stdio: 'inherit', env: { ...process.env, SKEP_LOCKED: '1' } });
  process.exit(r.status ?? 1);
}
