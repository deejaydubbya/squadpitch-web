import { cpSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const standalone = join(root, '.next', 'standalone');

if (!existsSync(join(standalone, 'server.js'))) {
  throw new Error('Missing .next/standalone/server.js. Run npm run build first.');
}

// Next's standalone output intentionally excludes static assets. Assemble the
// runnable artifact exactly as deployment requires before the browser audit.
cpSync(join(root, 'public'), join(standalone, 'public'), { recursive: true });
cpSync(join(root, '.next', 'static'), join(standalone, '.next', 'static'), { recursive: true });

const server = spawn(process.execPath, [join(standalone, 'server.js')], {
  cwd: standalone,
  env: { ...process.env, HOSTNAME: '127.0.0.1', PORT: '3001' },
  stdio: 'inherit',
});

const stop = (signal) => server.kill(signal);
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
server.on('exit', (code) => process.exit(code ?? 0));
