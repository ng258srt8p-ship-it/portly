/**
 * Global setup: ensure dev server is running before tests execute.
 */

import { spawn } from 'child_process';
import { type GlobalSetupContext } from '@playwright/test';

export default async function setup({ config }: GlobalSetupContext) {
  // Start the Next.js dev server if not already running
  const port = 3003;

  try {
    // Check if server is already running
    const check = spawn('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', `http://localhost:${port}/api/health`]);
    await new Promise<void>((resolve) => {
      check.on('close', (code) => resolve());
    });

    const result = await new Promise<string>((resolve) => {
      let out = '';
      check.stdout.on('data', (d) => (out += d.toString()));
      check.stderr.on('data', (d) => console.error(d.toString()));
      check.on('close', () => resolve(out.trim()));
    });

    if (result === '200') {
      console.log(`Server already running on port ${port}`);
      return;
    }
  } catch {
    // curl failed — server not running, start it
  }

  console.log(`Starting dev server on port ${port}...`);
  const child = spawn('npm', ['run', 'dev:port'], {
    cwd: config.projectDir,
    stdio: 'pipe',
  });

  child.stdout.on('data', (d) => console.log(`[server] ${d.toString().trim()}`));
  child.stderr.on('data', (d) => console.error(`[server] ${d.toString().trim()}`));

  // Wait for server to be ready
  const maxAttempts = 30;
  let attempts = 0;
  while (attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const check = spawn('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', `http://localhost:${port}/api/health`]);
      await new Promise<void>((resolve) => {
        check.on('close', () => resolve());
      });
      const result2 = await new Promise<string>((resolve) => {
        let out = '';
        check.stdout.on('data', (d) => (out += d.toString()));
        check.stderr.on('data', (d) => console.error(d.toString()));
        check.on('close', () => resolve(out.trim()));
      });
      if (result2 === '200') {
        console.log(`Server ready on port ${port}`);
        return;
      }
    } catch {
      // still waiting
    }
    attempts++;
  }

  throw new Error(`Server failed to start on port ${port} after ${maxAttempts} attempts`);
}
