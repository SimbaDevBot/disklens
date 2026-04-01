const { ipcMain } = require('electron');
const { listInstalledApps } = require('../services/apps.service.cjs');

function registerAppsIpc() {
  ipcMain.handle('apps:list', async () => {
    return await listInstalledApps();
  });
}

module.exports = { registerAppsIpc };
