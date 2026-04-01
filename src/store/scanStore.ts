import { create } from 'zustand'

type ScanSummary = {
  cancelled: boolean
  filesScanned: number
  foldersScanned: number
  totalBytes: number
  elapsedMs?: number
  skipped?: { path: string; error: string }[]
}

type ScanState = {
  lastResult: ScanSummary | null
  setLastResult: (r: ScanSummary) => void
}

export const useScanStore = create<ScanState>((set) => ({
  lastResult: null,
  setLastResult: (r) => set({ lastResult: r }),
}))
