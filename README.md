# DiskLens

Windows 10/11 disk space analysis and cleanup app.

## MVP scope (Phase 1)
- Electron + React + Vite + TypeScript scaffold
- Secure IPC bridge (contextIsolation, preload via contextBridge)
- App shell (sidebar + routes)
- Drive enumeration (list drives with used/free)

See: `docs/spec.md`

## Development

### Prerequisites
- Node.js 20+
- Windows 10/11 for full functionality (drive enumeration)

### Run

```bash
npm install
npm run dev
```

## Models used
- Planning/spec review: Sonnet (anthropic/claude-sonnet-4-6)
- Coding/execution: Codex (openai-codex/gpt-5.2)
