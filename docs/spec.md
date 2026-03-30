# DiskLens — Technical & Functional Documentation

## Product Overview

**DiskLens** is a Windows 11 desktop application for disk space analysis and cleanup. It scans local drives, visualizes storage consumption via an interactive treemap, identifies duplicate files, and provides one-click cleanup of temporary/cached files — all through a clean, minimal UI.

**Target platform:** Windows 10/11 (x64)
**Architecture:** Electron (Chromium + Node.js)
**License strategy:** TBD — code structured to support both open-source and commercial distribution.

---

## 1. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Shell / Runtime | Electron 33+ | Cross-platform desktop, but targeting Windows. Provides Node.js backend + Chromium renderer |
| Frontend Framework | React 19 | Component-based UI, large ecosystem |
| UI Components | Radix UI primitives + custom styling | Unstyled accessible primitives, style from scratch for a clean minimal look |
| Styling | Tailwind CSS 4 | Utility-first, fast iteration, easy dark/light theming |
| State Management | Zustand | Lightweight, minimal boilerplate, familiar from your stack |
| Treemap Rendering | D3.js (d3-hierarchy + d3-treemap) | Industry standard for hierarchical data visualization |
| Backend scanning | Node.js `fs` + `child_process` | Native filesystem access; shell out to PowerShell for installed apps |
| Duplicate detection | Node.js `crypto` (xxHash via `xxhash-addon` or SHA-256 fallback) | Fast hashing for file comparison |
| IPC | Electron IPC (contextBridge + ipcRenderer/ipcMain) | Secure communication between renderer and main process |
| Build / Package | electron-builder | MSI/NSIS installer generation, auto-update support, code signing ready |
| Dev tooling | TypeScript 5.x, ESLint, Prettier | Type safety and code quality |

### Why Electron over alternatives

| Alternative | Why not (for MVP) |
|---|---|
| Tauri | Smaller binary, but Rust backend adds complexity for a JS-focused team. Consider for v2 if performance matters |
| .NET MAUI / WPF | Would need C# — adds a language to the stack. Good for native feel but slower iteration |
| Flutter | Dart ecosystem, less natural for filesystem-heavy work |

> **Note to agent:** If the developer later decides performance is critical (scanning very large drives), the scanning engine can be extracted into a Rust sidecar binary invoked via `child_process`, keeping Electron for UI only.

---

## 2. Functional Requirements

### 2.1 Core: Disk Space Analysis

**FR-1: Drive Selection**
- On launch, detect all mounted drives (C:, D:, etc.) with total/used/free space
- Display drive cards showing drive letter, label, capacity bar, and used/free in GB
- User clicks a drive to start scanning

**FR-2: Filesystem Scanning**
- Recursively walk the selected drive's directory tree
- Collect: file path, file name, extension, size in bytes, last modified date, last accessed date
- Aggregate folder sizes (sum of children)
- Build an in-memory tree structure representing the filesystem hierarchy
- Show real-time scanning progress: files scanned count, current directory, elapsed time
- Allow cancellation mid-scan
- Handle permission errors gracefully (skip inaccessible directories like `System Volume Information`, log them)

**FR-3: Results View — File Explorer Tree**
- Display scanned results as a sortable, expandable tree table
- Columns: Name, Size (human-readable), % of Parent, % of Drive, File Count, Last Modified
- Default sort: largest first
- Click a row to select it; selection enables action buttons
- Breadcrumb navigation showing current path depth

**FR-4: Results View — Interactive Treemap**
- Full-width treemap visualization of disk usage (d3-treemap, squarified layout)
- Each rectangle = a file or folder, sized proportionally to disk usage
- Color coding by file type category (see Section 5)
- Hover: tooltip with file/folder name, size, full path
- Click a folder rectangle: zoom into that folder (drill down)
- Breadcrumb trail to navigate back up
- Toggle between treemap and tree-table views

**FR-5: Navigation & Actions on Files/Folders**
- For any selected file or folder, provide these actions:
  - **"Open in Explorer"** — opens the parent folder in Windows File Explorer with the item selected (`explorer /select,"<path>"`)
  - **"Open"** — opens the file with its default application (`shell.openPath()`)
  - **"Delete"** — moves to Recycle Bin (default) or permanent delete (with confirmation dialog)
  - **"Copy path"** — copies absolute path to clipboard
- Context menu (right-click) with same actions

### 2.2 Installed Applications View

**FR-6: Installed Apps List**
- Query Windows Registry for installed applications:
  - `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`
  - `HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall`
  - `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`
- Also query Windows Store apps via PowerShell: `Get-AppxPackage`
- Display: App name, Publisher, Installed size (estimated), Install date, Install location
- Sort by size (largest first by default)
- Actions per app:
  - **"Uninstall"** — launches the app's `UninstallString` from registry (opens the native uninstaller)
  - **"Open install folder"** — opens `InstallLocation` in Explorer
  - For Store apps: launches `ms-settings:appsfeatures` with the app focused

### 2.3 Duplicate File Detection

**FR-7: Duplicate Scanner**
- User selects one or more directories to scan for duplicates
- Scanning strategy (performance-optimized pipeline):
  1. Group files by exact size (only files with size matches proceed)
  2. Compare first 4KB hash (quick reject for non-duplicates)
  3. Full file hash (xxHash64 preferred for speed, SHA-256 fallback) for remaining candidates
- Minimum file size threshold: configurable, default 1MB (skip tiny files)
- Results grouped by duplicate sets, sorted by total wasted space (copies × size)
- Per group: show all file paths, sizes, last modified dates
- Actions per group:
  - **"Keep newest"** — auto-select all but the most recently modified for deletion
  - **"Keep oldest"** — inverse
  - **"Manual select"** — checkboxes to pick which to delete
  - **"Open in Explorer"** — for each individual file
- Deletion sends to Recycle Bin by default
- Summary: total duplicate groups found, total reclaimable space

### 2.4 Temp & Cache Cleanup

**FR-8: One-Click Cleanup**
- Pre-configured scan locations (all paths resolved per-user):

| Category | Paths |
|---|---|
| Windows Temp | `%TEMP%`, `C:\Windows\Temp` |
| Browser Caches | Chrome: `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache` / `Code Cache`; Firefox: `%LOCALAPPDATA%\Mozilla\Firefox\Profiles\*\cache2`; Edge: `%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Cache` |
| Windows Update Cache | `C:\Windows\SoftwareDistribution\Download` |
| Recycle Bin | Per-drive `$Recycle.Bin` |
| Thumbnail Cache | `%LOCALAPPDATA%\Microsoft\Windows\Explorer\thumbcache_*.db` |
| Windows Logs | `C:\Windows\Logs` (selected subdirectories) |
| npm / yarn cache | `%APPDATA%\npm-cache`, `%LOCALAPPDATA%\Yarn\Cache` |

- Display each category with: file count, total size, last cleaned date
- Checkboxes per category (all checked by default except Recycle Bin)
- **"Clean Selected"** button with confirmation showing total space to reclaim
- Show results: space freed per category, total freed

### 2.5 General UI/UX

**FR-9: Global Features**
- Persistent sidebar navigation: Dashboard, Disk Analysis, Installed Apps, Duplicates, Cleanup
- Dark mode only for MVP (matches "clean minimal" aesthetic; light mode can be added later)
- System tray icon with "Quick Cleanup" shortcut
- All long-running operations (scan, hash, cleanup) run in background with:
  - Progress bar in the UI
  - Ability to cancel
  - Notification on completion (native Windows toast via Electron `Notification` API)

---

## 3. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Scan speed | < 60s for 500K files (on SSD) |
| Memory usage | < 300MB RAM during scan of 1M+ files |
| Installer size | < 100MB (compressed) |
| Startup time | < 3s to interactive |
| Accessibility | Keyboard navigable, screen reader labels on all interactive elements |
| Security | No internet required. No telemetry in MVP. contextIsolation + nodeIntegration: false |
| Error handling | All filesystem errors caught and logged; never crash on permission denied |

---

## 4. Application Architecture

### 4.1 Process Model

```
┌─────────────────────────────────────────────────┐
│                  Main Process                    │
│  (Node.js — full filesystem + OS access)         │
│                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │ ScanService │  │ HashService  │  │ Cleanup  │ │
│  │ (fs.walk)   │  │ (xxHash/SHA) │  │ Service  │ │
│  └──────┬──────┘  └──────┬───────┘  └────┬────┘ │
│         │                │               │       │
│  ┌──────┴────────────────┴───────────────┴────┐  │
│  │          IPC Handler (ipcMain)              │  │
│  └──────────────────┬─────────────────────────┘  │
│                     │ contextBridge (preload.ts)  │
├─────────────────────┼───────────────────────────-┤
│                     │                             │
│  ┌──────────────────┴──────────────────────────┐  │
│  │           Renderer Process                   │  │
│  │  (React + Zustand + Tailwind + D3)           │  │
│  │                                              │  │
│  │  Pages: Dashboard | Analyze | Apps |          │  │
│  │         Duplicates | Cleanup                  │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 4.2 Directory Structure

```
disklens/
├── electron/                    # Main process code
│   ├── main.ts                  # Electron entry point, window creation
│   ├── preload.ts               # contextBridge API exposure
│   ├── ipc/                     # IPC handler registration
│   │   ├── index.ts             # Register all handlers
│   │   ├── scan.ipc.ts          # Disk scanning IPC
│   │   ├── apps.ipc.ts          # Installed apps IPC
│   │   ├── duplicates.ipc.ts    # Duplicate detection IPC
│   │   ├── cleanup.ipc.ts       # Temp cleanup IPC
│   │   └── filesystem.ipc.ts    # Open/delete/reveal file actions
│   ├── services/                # Business logic (main process)
│   │   ├── scanner.service.ts   # Recursive directory walker
│   │   ├── hash.service.ts      # File hashing (xxHash/SHA-256)
│   │   ├── apps.service.ts      # Registry + AppX queries
│   │   ├── cleanup.service.ts   # Temp file detection & deletion
│   │   └── drive.service.ts     # Drive enumeration (wmic/PowerShell)
│   └── utils/
│       ├── permissions.ts       # Check/handle admin elevation
│       ├── powershell.ts        # PowerShell command runner helper
│       └── logger.ts            # File-based logging
├── src/                         # Renderer process (React app)
│   ├── main.tsx                 # React entry
│   ├── App.tsx                  # Root component + router
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   │   ├── Header.tsx       # Top bar with drive selector
│   │   │   └── Shell.tsx        # App shell layout wrapper
│   │   ├── dashboard/
│   │   │   ├── DriveCard.tsx     # Individual drive summary card
│   │   │   └── QuickActions.tsx  # Shortcut buttons
│   │   ├── analyze/
│   │   │   ├── Treemap.tsx       # D3 treemap visualization
│   │   │   ├── TreeTable.tsx     # Expandable file/folder tree
│   │   │   ├── Breadcrumbs.tsx   # Path breadcrumb navigation
│   │   │   ├── FileActions.tsx   # Action buttons/context menu
│   │   │   └── ScanProgress.tsx  # Scanning progress overlay
│   │   ├── apps/
│   │   │   ├── AppsList.tsx      # Installed applications table
│   │   │   └── AppActions.tsx    # Uninstall/open folder buttons
│   │   ├── duplicates/
│   │   │   ├── DuplicateScanner.tsx  # Config + trigger scan
│   │   │   ├── DuplicateGroup.tsx    # Single group of duplicates
│   │   │   └── DuplicateResults.tsx  # All results container
│   │   ├── cleanup/
│   │   │   ├── CleanupCategory.tsx   # Single cleanup category row
│   │   │   └── CleanupPanel.tsx      # All categories + action
│   │   └── shared/
│   │       ├── ProgressBar.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── Tooltip.tsx
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Table.tsx
│   │       └── EmptyState.tsx
│   ├── stores/
│   │   ├── scan.store.ts        # Scan state + file tree data
│   │   ├── apps.store.ts        # Installed apps state
│   │   ├── duplicates.store.ts  # Duplicate detection state
│   │   ├── cleanup.store.ts     # Cleanup categories state
│   │   └── ui.store.ts          # UI state (active view, modals)
│   ├── hooks/
│   │   ├── useIpc.ts            # Generic IPC invocation hook
│   │   ├── useScan.ts           # Scan lifecycle hook
│   │   ├── useDrives.ts         # Drive enumeration hook
│   │   └── useTreemap.ts        # D3 treemap rendering hook
│   ├── lib/
│   │   ├── ipc-api.ts           # Typed wrapper around window.electronAPI
│   │   ├── format.ts            # File size formatting, date formatting
│   │   ├── file-categories.ts   # Extension → category mapping
│   │   └── constants.ts         # Cleanup paths, default configs
│   ├── types/
│   │   ├── scan.types.ts        # FileNode, FolderNode, ScanResult
│   │   ├── apps.types.ts        # InstalledApp
│   │   ├── duplicates.types.ts  # DuplicateGroup, DuplicateFile
│   │   └── cleanup.types.ts     # CleanupCategory, CleanupResult
│   └── styles/
│       └── globals.css          # Tailwind directives + custom CSS vars
├── resources/                   # App icons, installer assets
│   └── icon.ico
├── package.json
├── tsconfig.json
├── tsconfig.node.json           # TS config for electron/ directory
├── tailwind.config.ts
├── vite.config.ts               # Vite for renderer bundling
├── electron-builder.yml         # Build/packaging configuration
└── README.md
```

### 4.3 IPC API Contract

All communication between renderer and main process goes through a typed preload bridge. Below is the complete API surface.

#### preload.ts — Exposed API

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Drives
  getDrives: () => ipcRenderer.invoke('drives:list'),

  // Scanning
  startScan: (driveLetter: string) => ipcRenderer.invoke('scan:start', driveLetter),
  cancelScan: () => ipcRenderer.invoke('scan:cancel'),
  onScanProgress: (cb: (progress: ScanProgress) => void) =>
    ipcRenderer.on('scan:progress', (_e, data) => cb(data)),
  onScanComplete: (cb: (result: ScanResult) => void) =>
    ipcRenderer.on('scan:complete', (_e, data) => cb(data)),

  // File actions
  openInExplorer: (filePath: string) => ipcRenderer.invoke('fs:reveal', filePath),
  openFile: (filePath: string) => ipcRenderer.invoke('fs:open', filePath),
  deleteFile: (filePath: string, permanent: boolean) =>
    ipcRenderer.invoke('fs:delete', filePath, permanent),
  copyPath: (filePath: string) => ipcRenderer.invoke('fs:copyPath', filePath),

  // Installed apps
  getInstalledApps: () => ipcRenderer.invoke('apps:list'),
  uninstallApp: (uninstallString: string) => ipcRenderer.invoke('apps:uninstall', uninstallString),
  openAppFolder: (installPath: string) => ipcRenderer.invoke('apps:openFolder', installPath),

  // Duplicates
  startDuplicateScan: (directories: string[], minSize: number) =>
    ipcRenderer.invoke('duplicates:start', directories, minSize),
  cancelDuplicateScan: () => ipcRenderer.invoke('duplicates:cancel'),
  onDuplicateProgress: (cb: (progress: DuplicateProgress) => void) =>
    ipcRenderer.on('duplicates:progress', (_e, data) => cb(data)),
  onDuplicateComplete: (cb: (result: DuplicateGroup[]) => void) =>
    ipcRenderer.on('duplicates:complete', (_e, data) => cb(data)),
  deleteDuplicates: (filePaths: string[]) =>
    ipcRenderer.invoke('duplicates:delete', filePaths),

  // Cleanup
  getCleanupCategories: () => ipcRenderer.invoke('cleanup:scan'),
  executeCleanup: (categoryIds: string[]) => ipcRenderer.invoke('cleanup:execute', categoryIds),
  onCleanupProgress: (cb: (progress: CleanupProgress) => void) =>
    ipcRenderer.on('cleanup:progress', (_e, data) => cb(data)),
});
```

#### IPC Channel Reference

| Channel | Direction | Payload | Response |
|---|---|---|---|
| `drives:list` | invoke | — | `DriveInfo[]` |
| `scan:start` | invoke | `driveLetter: string` | `void` (results via events) |
| `scan:cancel` | invoke | — | `void` |
| `scan:progress` | event→renderer | `ScanProgress` | — |
| `scan:complete` | event→renderer | `ScanResult` | — |
| `fs:reveal` | invoke | `filePath: string` | `void` |
| `fs:open` | invoke | `filePath: string` | `void` |
| `fs:delete` | invoke | `filePath, permanent` | `{ success, freedBytes }` |
| `fs:copyPath` | invoke | `filePath: string` | `void` |
| `apps:list` | invoke | — | `InstalledApp[]` |
| `apps:uninstall` | invoke | `uninstallString: string` | `void` |
| `apps:openFolder` | invoke | `installPath: string` | `void` |
| `duplicates:start` | invoke | `dirs[], minSize` | `void` (results via events) |
| `duplicates:cancel` | invoke | — | `void` |
| `duplicates:progress` | event→renderer | `DuplicateProgress` | — |
| `duplicates:complete` | event→renderer | `DuplicateGroup[]` | — |
| `duplicates:delete` | invoke | `filePaths: string[]` | `{ deleted, freedBytes }` |
| `cleanup:scan` | invoke | — | `CleanupCategory[]` |
| `cleanup:execute` | invoke | `categoryIds: string[]` | `CleanupResult` |
| `cleanup:progress` | event→renderer | `CleanupProgress` | — |

---

## 5. Type Definitions

```typescript
// ── Drive ──
interface DriveInfo {
  letter: string;          // "C:"
  label: string;           // "Windows"
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  fileSystem: string;      // "NTFS"
}

// ── Scan / File Tree ──
interface FileNode {
  name: string;
  path: string;
  sizeBytes: number;
  type: 'file';
  extension: string;       // ".pdf", ".exe", etc.
  category: FileCategory;
  lastModified: string;    // ISO 8601
}

interface FolderNode {
  name: string;
  path: string;
  sizeBytes: number;       // Sum of all descendants
  type: 'folder';
  children: (FileNode | FolderNode)[];
  fileCount: number;       // Total files in subtree
  lastModified: string;
}

type FileTreeNode = FileNode | FolderNode;

type FileCategory =
  | 'documents'    // .pdf, .doc, .docx, .xls, .xlsx, .ppt, .txt, .md, .csv
  | 'images'       // .jpg, .jpeg, .png, .gif, .webp, .svg, .bmp, .ico, .tiff
  | 'video'        // .mp4, .avi, .mkv, .mov, .wmv, .flv, .webm
  | 'audio'        // .mp3, .wav, .flac, .aac, .ogg, .wma, .m4a
  | 'code'         // .js, .ts, .py, .java, .cpp, .cs, .html, .css, .json, .xml
  | 'archives'     // .zip, .rar, .7z, .tar, .gz, .bz2
  | 'executables'  // .exe, .msi, .dll, .bat, .cmd, .ps1
  | 'system'       // .sys, .log, .tmp, .dat, .ini, .cfg
  | 'other';       // Everything else

interface ScanProgress {
  phase: 'walking' | 'calculating';
  filesScanned: number;
  currentDirectory: string;
  elapsedMs: number;
}

interface ScanResult {
  rootNode: FolderNode;
  totalFiles: number;
  totalFolders: number;
  totalSizeBytes: number;
  scanDurationMs: number;
  skippedPaths: string[];  // Permission denied, etc.
}

// ── Installed Apps ──
interface InstalledApp {
  name: string;
  publisher: string;
  version: string;
  installDate: string | null;
  estimatedSizeBytes: number | null;
  installLocation: string | null;
  uninstallString: string | null;
  isStoreApp: boolean;
  icon: string | null;      // Path to icon if available
}

// ── Duplicates ──
interface DuplicateFile {
  path: string;
  sizeBytes: number;
  lastModified: string;
  hash: string;
}

interface DuplicateGroup {
  hash: string;
  fileSize: number;
  files: DuplicateFile[];
  wastedBytes: number;      // fileSize * (files.length - 1)
}

interface DuplicateProgress {
  phase: 'sizing' | 'hashing-partial' | 'hashing-full';
  filesProcessed: number;
  totalFiles: number;
  currentFile: string;
  duplicatesFound: number;
}

// ── Cleanup ──
interface CleanupCategory {
  id: string;               // 'windows-temp', 'chrome-cache', etc.
  label: string;
  description: string;
  paths: string[];
  fileCount: number;
  totalSizeBytes: number;
  riskLevel: 'safe' | 'moderate';  // 'moderate' = warn user
}

interface CleanupResult {
  categoriesProcessed: string[];
  totalFreedBytes: number;
  errors: { path: string; error: string }[];
}

interface CleanupProgress {
  categoryId: string;
  filesDeleted: number;
  totalFiles: number;
  freedBytes: number;
}
```

---

## 6. Service Implementation Details

### 6.1 Scanner Service

The scanner is the most performance-critical service. Implementation notes:

```
Strategy: Iterative BFS with a manual stack (avoid call stack overflow on deep trees)

1. Use `fs.opendir()` with `{ recursive: false }` and iterate entries manually
2. For each entry, call `entry.isDirectory()` and `entry.isFile()`
3. For files: `fs.stat()` to get size and dates — batch stat calls with concurrency limit (p-limit, concurrency: 50)
4. Build tree in memory as nested FolderNode/FileNode objects
5. Post-walk: calculate folder sizes bottom-up (already accumulated during walk)
6. Emit 'scan:progress' every 500ms (throttled) with current counts and directory
7. Skip known system directories: ['$Recycle.Bin', 'System Volume Information', 'pagefile.sys', 'hiberfil.sys', 'swapfile.sys']
8. Wrap all fs calls in try/catch — EPERM/EACCES → add to skippedPaths, continue
```

**Memory optimization:** For drives with millions of files, the full tree may exceed 200MB in memory. Mitigation:
- Store only top N levels in full detail (default: 5 levels deep)
- Below that depth, aggregate into a summary node: `{ name: "123 files", sizeBytes: total, type: "aggregate" }`
- User can expand aggregated nodes on demand (triggers a targeted sub-scan via IPC)

### 6.2 Hash Service

```
Pipeline for duplicate detection:

Phase 1 — Size grouping:
  - Build a Map<number, string[]> of fileSize → [filePaths]
  - Discard entries with only 1 file (unique size = unique file)
  - Discard files below minSize threshold

Phase 2 — Partial hash:
  - For remaining candidates, read first 4096 bytes of each file
  - Hash with xxHash64 (via xxhash-addon npm package)
  - Group by partial hash; discard unique partial hashes

Phase 3 — Full hash:
  - Stream-hash entire file content for remaining candidates
  - Use createReadStream + incremental hash update
  - Group by full hash → these are confirmed duplicates

Concurrency: Use a worker pool (4 workers via worker_threads) for Phase 2 and 3
Progress: Emit after each file hashed with counts
```

### 6.3 Apps Service

```
Registry reading strategy:

Option A (recommended): Use PowerShell via child_process
  Script: Get-ItemProperty HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\* |
          Select-Object DisplayName, Publisher, DisplayVersion, InstallDate,
                        EstimatedSize, InstallLocation, UninstallString |
          ConvertTo-Json

  Repeat for WOW6432Node and HKCU paths.

Option B: Use the 'windows-registry' npm package for direct registry access
  (adds a native dependency — use Option A for MVP simplicity)

For Store apps:
  PowerShell: Get-AppxPackage | Select-Object Name, Publisher, InstallLocation,
              Version | ConvertTo-Json

Merge results, deduplicate by name, sort by EstimatedSize descending.
Note: EstimatedSize from registry is in KB — multiply by 1024 for bytes.
```

### 6.4 Cleanup Service

```
For each CleanupCategory:

1. Resolve all paths (expand %TEMP%, %LOCALAPPDATA%, etc. via process.env)
2. Walk each path, collect all files (not directories themselves)
3. Return category summary with file count and total size
4. On execute: delete files in batches of 100
   - Use fs.unlink() for files
   - Use fs.rm({ recursive: true }) for cache directories (delete contents, not the dir itself)
   - Track failures (locked files are common — skip and report)
   - Emit progress per batch
5. Browser caches: ONLY delete if the browser is not running
   - Check via PowerShell: Get-Process chrome, msedge, firefox -ErrorAction SilentlyContinue
   - If running, warn user and skip (or offer to force-close)
```

---

## 7. UI Specifications

### 7.1 Design System Foundation

```
Color palette (dark mode):
  --bg-primary:     #0A0A0B       (app background)
  --bg-secondary:   #141416       (sidebar, cards)
  --bg-tertiary:    #1C1C1F       (hover states, nested panels)
  --bg-elevated:    #232327       (modals, dropdowns)
  --border-subtle:  #2A2A2E
  --border-default: #3A3A3F

  --text-primary:   #F0F0F2
  --text-secondary: #9A9AA0
  --text-tertiary:  #6A6A70

  --accent-primary:    #6C8CFF    (buttons, links, active states)
  --accent-hover:      #8BA3FF
  --accent-subtle:     #6C8CFF1A  (12% opacity backgrounds)

  --success:  #4ADE80
  --warning:  #FBBF24
  --danger:   #F87171

  --treemap-documents:   #6C8CFF
  --treemap-images:      #A78BFA
  --treemap-video:       #F472B6
  --treemap-audio:       #34D399
  --treemap-code:        #FBBF24
  --treemap-archives:    #FB923C
  --treemap-executables: #F87171
  --treemap-system:      #6A6A70
  --treemap-other:       #4A4A50

Typography:
  Font family: 'Inter', system-ui, sans-serif
  Font sizes:  12px (small/labels), 14px (body), 16px (subheadings),
               20px (page titles), 28px (hero numbers)
  Font weights: 400 (regular), 500 (medium), 600 (semibold)

Spacing scale: 4px base — 4, 8, 12, 16, 20, 24, 32, 40, 48, 64

Border radius: 6px (buttons, inputs), 8px (cards), 12px (modals)

Transitions: 150ms ease for hover states, 200ms ease for expand/collapse
```

### 7.2 Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌─────────────────────────────────────────┐ │
│ │          │ │  Header                                  │ │
│ │          │ │  [Drive selector dropdown]  [Scan btn]   │ │
│ │ Sidebar  │ ├─────────────────────────────────────────┤ │
│ │          │ │                                          │ │
│ │ • Dash   │ │  Main Content Area                      │ │
│ │ • Analyze│ │                                          │ │
│ │ • Apps   │ │  (changes based on active nav item)      │ │
│ │ • Dupes  │ │                                          │ │
│ │ • Clean  │ │                                          │ │
│ │          │ │                                          │ │
│ │          │ │                                          │ │
│ └──────────┘ └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘

Sidebar: 220px fixed width, collapsible to 56px (icon-only)
Header: 56px height
Main content: fills remaining space, scrollable
```

### 7.3 Key Screen Mockups (Behavioral Specs)

**Dashboard Screen:**
- Grid of DriveCards (2-3 per row depending on drive count)
- Each card: drive icon, letter + label, usage bar (colored segment for used), "X GB free of Y GB"
- Below cards: "Quick Actions" row — buttons for "Clean Temp Files" and "Find Duplicates"
- At bottom: "Last scanned: [date]" per drive if previously scanned

**Analyze Screen (after scan):**
- Top: toggle buttons — "Treemap" | "Table" (pill-style toggle)
- Treemap view: full-width treemap, legend bar at top showing category colors
- Table view: columns as specified in FR-3
- Bottom panel (collapsible): selected file details + action buttons
- Both views: breadcrumb bar above the visualization

**Apps Screen:**
- Search/filter input at top
- Table: columns — App Name, Publisher, Size, Install Date
- Row hover reveals "Uninstall" and "Open Folder" buttons
- Size column right-aligned with bar indicators

**Duplicates Screen:**
- Config panel: directory picker (multi-select), min file size slider, "Scan" button
- Results: expandable cards per duplicate group
  - Header: file name, size, "× N copies", "Wasted: X MB"
  - Expanded: list of file paths with checkboxes, quick-select buttons
  - "Delete Selected" button per group + "Delete All Selected" global button

**Cleanup Screen:**
- Vertical list of category cards
- Each card: checkbox, icon, category name, file count, size, risk badge
- "Scan" button to refresh sizes, "Clean Selected" button
- After cleanup: success summary with before/after comparison

---

## 8. Security Considerations

1. **Context Isolation:** `contextIsolation: true`, `nodeIntegration: false` — renderer has zero direct Node.js access
2. **Preload whitelist:** Only expose specific IPC channels via `contextBridge` (see Section 4.3)
3. **Input validation:** All file paths received from renderer are validated:
   - Must be absolute paths
   - Must not contain `..` traversal
   - Must exist on disk before any action
4. **Deletion safety:** Default to Recycle Bin (`shell.trashItem()`) — permanent delete requires explicit flag + confirmation dialog
5. **Admin elevation:** Some temp directories (e.g., `C:\Windows\Temp`) require admin. Handle via:
   - Try without elevation first
   - If EPERM, show "Run as Administrator" prompt (restart app elevated)
   - Never silently skip — inform user what couldn't be cleaned
6. **No remote content:** CSP set to block all external scripts/styles. Everything bundled locally
7. **No telemetry:** Zero network calls in MVP. No crash reporting, no analytics. Add opt-in later if distributing

---

## 9. Build & Distribution

### electron-builder.yml

```yaml
appId: com.disklens.app
productName: DiskLens
copyright: Copyright © 2026

win:
  target:
    - target: nsis
      arch: [x64]
  icon: resources/icon.ico
  requestedExecutionLevel: asInvoker  # Don't require admin by default

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true

directories:
  output: dist
  buildResources: resources
```

### package.json scripts

```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "build": "tsc && vite build && electron-builder --win",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## 10. Development Phases (MVP Roadmap)

### Phase 1 — Scaffold & Shell (Day 1-2)
- [ ] Initialize Electron + React + Vite + TypeScript project
- [ ] Configure Tailwind with custom design tokens
- [ ] Set up main/renderer/preload structure with contextBridge
- [ ] Build app shell: Sidebar, Header, routing between 5 pages
- [ ] Implement drive enumeration and DriveCard component
- [ ] Create shared UI components: Button, ProgressBar, ConfirmDialog, Table, Badge

### Phase 2 — Disk Scanner + Treemap (Day 3-5)
- [ ] Implement scanner.service.ts with iterative BFS walker
- [ ] Wire up IPC for scan start/cancel/progress/complete
- [ ] Build TreeTable component (expandable, sortable)
- [ ] Build Treemap component with D3 (drill-down, tooltips, color coding)
- [ ] Build Breadcrumbs component
- [ ] Implement file actions: reveal in Explorer, open, delete, copy path
- [ ] Add ScanProgress overlay with cancel support

### Phase 3 — Installed Apps (Day 6)
- [ ] Implement apps.service.ts (registry + AppX queries)
- [ ] Build AppsList table with search/filter
- [ ] Wire up uninstall and open-folder actions
- [ ] Handle Store apps vs traditional apps UX differences

### Phase 4 — Duplicate Detection (Day 7-8)
- [ ] Implement hash.service.ts with 3-phase pipeline
- [ ] Add worker_threads pool for parallel hashing
- [ ] Build DuplicateScanner config UI (directory picker, min size)
- [ ] Build DuplicateResults + DuplicateGroup components
- [ ] Implement batch deletion of selected duplicates

### Phase 5 — Cleanup + Polish (Day 9-10)
- [ ] Implement cleanup.service.ts with all category paths
- [ ] Build CleanupPanel with category cards and checkboxes
- [ ] Add browser-running detection before cache cleanup
- [ ] System tray icon with quick-cleanup action
- [ ] Notification on completion (Windows toast)
- [ ] Error handling pass: graceful failures, user-facing error messages
- [ ] Performance testing on large drives (500K+ files)

---

## 11. Key Dependencies

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@radix-ui/react-checkbox": "^1.x",
    "@radix-ui/react-dialog": "^1.x",
    "@radix-ui/react-dropdown-menu": "^1.x",
    "@radix-ui/react-progress": "^1.x",
    "@radix-ui/react-tooltip": "^1.x",
    "@radix-ui/react-toggle-group": "^1.x",
    "@radix-ui/react-context-menu": "^1.x",
    "zustand": "^5.x",
    "d3-hierarchy": "^3.x",
    "d3-scale": "^4.x",
    "d3-selection": "^3.x",
    "p-limit": "^6.x",
    "xxhash-addon": "^2.x",
    "lucide-react": "^0.400"
  },
  "devDependencies": {
    "electron": "^33.x",
    "electron-builder": "^25.x",
    "vite": "^6.x",
    "@vitejs/plugin-react": "^4.x",
    "typescript": "^5.7",
    "tailwindcss": "^4.x",
    "concurrently": "^9.x",
    "wait-on": "^8.x",
    "eslint": "^9.x",
    "prettier": "^3.x"
  }
}
```

---

## 12. Known Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Scanning very large drives (2TB+, millions of files) causes high memory usage | App becomes slow or crashes | Implement depth-limited tree + on-demand expansion (Section 6.1). Consider streaming results to disk as SQLite if needed in v2 |
| Some temp files are locked by running processes | Cleanup reports errors | Catch EBUSY/EPERM per file, skip gracefully, report to user which files couldn't be deleted |
| Windows Registry structure varies across app installers | Missing or incorrect app data | Validate each registry field, use fallbacks (null for missing fields), don't crash on unexpected formats |
| xxhash-addon native module may fail to compile on some systems | Duplicate detection breaks | Fallback to Node.js built-in `crypto.createHash('sha256')` — slower but zero native deps |
| Electron app size is large (~150MB unpacked) | Users may perceive as bloated for a utility | Use `electron-builder` ASAR packing. Note in README. Consider Tauri rewrite for v2 if this is a concern |
| User accidentally deletes important files | Data loss | Always default to Recycle Bin. Permanent delete requires double confirmation. Show full path before any deletion. Never auto-delete without user action |
| UAC prompts when cleaning system directories | Confusing UX | Clearly explain why elevation is needed. Separate "user-level" cleanup (no admin) from "system-level" cleanup (needs admin). Default to user-level only |

---

## 13. Future Enhancements (Post-MVP)

These are out of scope for MVP but the architecture should not prevent them:

- **Light mode** toggle (design tokens already support it via CSS variables)
- **Scheduled scans** — Windows Task Scheduler integration to run cleanup on schedule
- **Cloud storage analysis** — OneDrive, Google Drive folder scanning
- **Export reports** — PDF/CSV export of scan results and duplicate reports
- **Large file finder** — quick view of top 50 largest files across all drives
- **Folder comparison** — diff two directories
- **Auto-update** — electron-updater with GitHub Releases or custom update server
- **Portable mode** — run without installing (single .exe)
- **Tauri migration** — rewrite main process in Rust for smaller binary and better performance

---

*End of DiskLens Technical & Functional Documentation*
*Version: 1.0 — March 2026*
*Prepared for: OpenClaw Agent Implementation*
