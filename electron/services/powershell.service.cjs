const { spawn } = require('node:child_process');

function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    // Use pwsh if available, else powershell (Windows)
    const cmd = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
    const args = process.platform === 'win32'
      ? ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script]
      : ['-NoProfile', '-NonInteractive', '-Command', script];

    const child = spawn(cmd, args, { windowsHide: true });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('error', (e) => reject(e));
    child.on('close', (code) => {
      if (code === 0) return resolve(out);
      reject(new Error(`PowerShell exited ${code}: ${err || out}`));
    });
  });
}

module.exports = { runPowerShell };
