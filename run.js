import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distServer = path.join(__dirname, 'dist', 'server.cjs');

if (!fs.existsSync(distServer)) {
  console.log('[Kitchen Cruze] dist/server.cjs not found. Automatically executing production build...');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
  } catch {
    try {
      execSync('bun run build', { stdio: 'inherit', cwd: __dirname });
    } catch (err) {
      console.error('[Kitchen Cruze] Build error during auto-build:', err);
      process.exit(1);
    }
  }
}

console.log('[Kitchen Cruze] Starting production server on port ' + (process.env.PORT || 3000) + '...');
await import(`file://${distServer}`);
