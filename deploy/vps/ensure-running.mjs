import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const base = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '');
try {
  const response = await fetch('http://127.0.0.1:15819/health', {signal:AbortSignal.timeout(2000)});
  const status = await response.json();
  if (status.service === 'atelier-supervisor') process.exit(0);
} catch {}
const log = fs.openSync(`${base}/supervisor.log`, 'a', 0o600);
const input = fs.openSync(`${base}/empty`, 'a+', 0o600);
const child = spawn(`${base}/node-v22.23.2-linux-x64/bin/node`, [`${base}/supervisor.mjs`], {
  detached:true, cwd:base, stdio:[input,log,log], env:{...process.env,LD_LIBRARY_PATH:base}
});
child.unref();
fs.closeSync(log); fs.closeSync(input);
console.log('Atelier supervisor started');
