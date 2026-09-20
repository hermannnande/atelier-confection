import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
const base = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '');
const app = `${base}/../atelier-app/current/backend`;
const executable = `${base}/node-v22.23.2-linux-x64/bin/node`;
let child, stopping = false, delay = 1000;
const control = http.createServer((req, res) => {
  res.writeHead(req.url === '/health' ? 200 : 404, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({service:'atelier-supervisor', pid:process.pid, child:child?.pid || null}));
});
function launch() {
  if (stopping) return;
  const logFile = `${base}/api.log`;
  try { if (fs.statSync(logFile).size > 10 * 1024 * 1024) fs.renameSync(logFile, `${logFile}.previous`); } catch {}
  const log = fs.openSync(logFile, 'a', 0o600);
  const input = fs.openSync(`${base}/empty`, 'a+', 0o600);
  const started = Date.now();
  child = spawn(executable, ['vps-server.js'], {cwd: app, stdio:[input,log,log], env:{...process.env, LD_LIBRARY_PATH:base, ATELIER_ENV_FILE:`${base}/production.env`}});
  fs.closeSync(log); fs.closeSync(input);
  child.once('error', err => console.error('API spawn:', err.code));
  child.once('close', code => {
    console.log(`API exited (${code}); restart in ${delay} ms`);
    if (Date.now() - started > 60000) delay = 1000;
    if (!stopping) setTimeout(launch, delay);
    delay = Math.min(delay * 2, 30000);
  });
}
control.on('error', err => { console.error('Supervisor listen:', err.code); process.exit(1); });
control.listen(15819, '127.0.0.1', () => {
  fs.writeFileSync(`${base}/supervisor.pid`, String(process.pid), {mode:0o600});
  launch();
});
for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => {
  stopping = true;
  child?.kill('SIGTERM');
  control.close();
  setTimeout(() => process.exit(0), 11000).unref();
});
