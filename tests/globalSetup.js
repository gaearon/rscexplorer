import { spawn, execSync } from 'child_process';

let devServer;

export async function setup() {
  await new Promise((resolve, reject) => {
    devServer = spawn('npm', ['run', 'dev', '--', '--port', '5599'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    devServer.stdout.on('data', (data) => {
      if (data.toString().includes('Local:')) {
        resolve();
      }
    });

    devServer.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    devServer.on('error', reject);

    // Timeout after 30s
    setTimeout(() => reject(new Error('Dev server failed to start')), 30000);
  });
}

export async function teardown() {
  if (devServer) {
    devServer.kill('SIGTERM');
    // Also kill any process on the port
    try {
      execSync('lsof -ti:5599 | xargs kill -9 2>/dev/null || true');
    } catch {}
  }
}
