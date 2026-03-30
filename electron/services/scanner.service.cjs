const fs = require('node:fs');
const path = require('node:path');

function now() { return Date.now(); }

/**
 * Recursively walk a directory and accumulate total size.
 * Emits progress via callback (throttled).
 */
async function scanPath(rootPath, onProgress, signal) {
  const stack = [rootPath];
  let filesScanned = 0;
  let foldersScanned = 0;
  let totalBytes = 0;
  let lastEmit = 0;
  const startedAt = now();

  const skipped = [];

  while (stack.length) {
    if (signal && signal.aborted) {
      return { cancelled: true, filesScanned, foldersScanned, totalBytes, skipped };
    }

    const current = stack.pop();
    let dir;
    try {
      dir = await fs.promises.opendir(current);
    } catch (e) {
      skipped.push({ path: current, error: String(e.code || e.message || e) });
      continue;
    }

    foldersScanned++;

    for await (const entry of dir) {
      if (signal && signal.aborted) {
        return { cancelled: true, filesScanned, foldersScanned, totalBytes, skipped };
      }

      const full = path.join(current, entry.name);
      try {
        if (entry.isDirectory()) {
          stack.push(full);
        } else if (entry.isFile()) {
          const st = await fs.promises.stat(full);
          totalBytes += st.size;
          filesScanned++;
        }
      } catch (e) {
        skipped.push({ path: full, error: String(e.code || e.message || e) });
      }

      const t = now();
      if (onProgress && t - lastEmit > 500) {
        lastEmit = t;
        onProgress({
          phase: 'walking',
          filesScanned,
          foldersScanned,
          currentPath: full,
          elapsedMs: t - startedAt,
          totalBytes,
        });
      }
    }
  }

  return {
    cancelled: false,
    filesScanned,
    foldersScanned,
    totalBytes,
    skipped,
    elapsedMs: now() - startedAt,
  };
}

module.exports = { scanPath };
