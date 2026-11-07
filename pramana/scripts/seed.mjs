import { spawnSync } from 'node:child_process';
import { mkdirSync, renameSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
// A reset keeps a backup rather than deleting inspection evidence.
const data = resolve(process.env.DATA_DIR || './data');
mkdirSync(data, { recursive: true });
if (!process.argv.includes('--if-empty')) {
  const backup = join(data, `backup-${Date.now()}`);
  for (const name of ['pramana.sqlite', 'pramana.sqlite-wal', 'pramana.sqlite-shm']) {
    if (existsSync(join(data, name))) {
      mkdirSync(backup, { recursive: true });
      renameSync(join(data, name), join(backup, name));
    }
  }
}
const child = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', "import { database, listRencana } from './lib/db.ts'; database(); console.log('Database ready:', listRencana().length, 'inspection plan(s).');"], { stdio: 'inherit' });
process.exitCode = child.status ?? 1;
