const { runPowerShell } = require('./powershell.service.cjs');

// Minimal MVP: query uninstall registry keys and store apps.
async function listInstalledApps() {
  if (process.platform !== 'win32') {
    return { apps: [], note: 'Installed apps listing is supported on Windows only.' };
  }

  const regScript = `
$paths = @(
  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
)
$items = foreach ($p in $paths) {
  Get-ItemProperty $p -ErrorAction SilentlyContinue |
    Select-Object DisplayName, Publisher, DisplayVersion, InstallDate, EstimatedSize, InstallLocation, UninstallString
}
$items | Where-Object { $_.DisplayName } | ConvertTo-Json -Depth 4
`;

  const appxScript = `
Get-AppxPackage | Select-Object Name, Publisher, Version, InstallLocation | ConvertTo-Json -Depth 4
`;

  const [regJson, appxJson] = await Promise.all([
    runPowerShell(regScript),
    runPowerShell(appxScript),
  ]);

  let reg = [];
  let appx = [];

  try { reg = JSON.parse(regJson || '[]'); } catch { reg = []; }
  try { appx = JSON.parse(appxJson || '[]'); } catch { appx = []; }

  // Normalize to array
  if (reg && !Array.isArray(reg)) reg = [reg];
  if (appx && !Array.isArray(appx)) appx = [appx];

  const apps = reg.map((a) => ({
    name: a.DisplayName,
    publisher: a.Publisher || null,
    version: a.DisplayVersion || null,
    installDate: a.InstallDate || null,
    estimatedSizeBytes: a.EstimatedSize ? Number(a.EstimatedSize) * 1024 : null,
    installLocation: a.InstallLocation || null,
    uninstallString: a.UninstallString || null,
    isStoreApp: false,
  }));

  const storeApps = appx.map((a) => ({
    name: a.Name,
    publisher: a.Publisher || null,
    version: a.Version || null,
    installDate: null,
    estimatedSizeBytes: null,
    installLocation: a.InstallLocation || null,
    uninstallString: null,
    isStoreApp: true,
  }));

  return { apps: [...apps, ...storeApps] };
}

module.exports = { listInstalledApps };
