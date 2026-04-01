declare global {
  interface Window {
    electronAPI?: {
      ping: () => string
      startScan: (rootPath: string) => Promise<{ ok: boolean }>
      cancelScan: () => Promise<{ ok: boolean }>
      onScanProgress: (cb: (p: any) => void) => void
      onScanComplete: (cb: (r: any) => void) => void
    }
  }
}
export {}
