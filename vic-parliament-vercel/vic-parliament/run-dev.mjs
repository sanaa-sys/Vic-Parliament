// run-dev.mjs — starts both server and client in parallel
// Usage: node run-dev.mjs

import { spawn } from 'child_process';

function start(name, cmd, args, cwd) {
  const prefix = name === 'server' ? '\x1b[36m[server]\x1b[0m' : '\x1b[35m[client]\x1b[0m';
  const proc = spawn(cmd, args, { cwd, stdio: 'pipe', shell: true });

  proc.stdout.on('data', d => process.stdout.write(`${prefix} ${d}`));
  proc.stderr.on('data', d => process.stderr.write(`${prefix} ${d}`));
  proc.on('close', code => console.log(`${prefix} exited with code ${code}`));
  return proc;
}

console.log('\n\x1b[1m🚀 Starting Vic Parliament Platform\x1b[0m');
console.log('  Server → http://localhost:3001');
console.log('  Client → http://localhost:3000\n');

const server = start('server', 'npm', ['run', 'dev'], './server');
const client = start('client', 'npm', ['run', 'dev'], './client');

process.on('SIGINT', () => {
  server.kill();
  client.kill();
  process.exit(0);
});
