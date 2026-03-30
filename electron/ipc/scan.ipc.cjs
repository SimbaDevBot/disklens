const { ipcMain } = require('electron');
const { scanPath } = require('../services/scanner.service.cjs');

let currentController = null;

function registerScanIpc(mainWindow) {
  ipcMain.handle('scan:start', async (_evt, rootPath) => {
    if (!rootPath || typeof rootPath !== 'string') {
      throw new Error('rootPath must be a string');
    }

    // cancel any previous scan
    if (currentController) currentController.abort();
    currentController = new AbortController();

    const res = await scanPath(
      rootPath,
      (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('scan:progress', progress);
        }
      },
      currentController.signal
    );

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scan:complete', res);
    }

    return { ok: true };
  });

  ipcMain.handle('scan:cancel', async () => {
    if (currentController) currentController.abort();
    currentController = null;
    return { ok: true };
  });
}

module.exports = { registerScanIpc };
