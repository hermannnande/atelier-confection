import dotenv from 'dotenv';

dotenv.config({ path: process.env.ATELIER_ENV_FILE || '/home/defaultboutique/atelier-runtime/production.env' });
for (const name of ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET']) {
  if (!process.env[name]) throw new Error(`Required setting missing: ${name}`);
}
process.env.NODE_ENV = 'production';
process.env.ATELIER_MANAGED_START = 'true';
const { default: app } = await import('./server.js');
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');
app.get('/__vps_health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ status: 'OK', service: 'atelier-vps', version: 'c96a906-vps-1' });
});
const server = app.listen(Number(process.env.PORT || 15818), '127.0.0.1', () => {
  console.log('Atelier API ready on loopback');
});
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
