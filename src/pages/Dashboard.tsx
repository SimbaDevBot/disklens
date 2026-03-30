import React from 'react'
import { useScanStore } from '../store/scanStore'

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = bytes
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export default function Dashboard() {
  const [path, setPath] = React.useState('C:\\')
  const [running, setRunning] = React.useState(false)
  const [progress, setProgress] = React.useState<any>(null)
  const [result, setResult] = React.useState<any>(null)
  const [error, setError] = React.useState<string | null>(null)
  const setLastResult = useScanStore((st) => st.setLastResult)

  React.useEffect(() => {
    window.electronAPI?.onScanProgress((p) => {
      setProgress(p)
    })
    window.electronAPI?.onScanComplete((r) => {
      setRunning(false)
      setResult(r)
      setLastResult(r)
      window.location.hash = '#/analyze'
    })
  }, [])

  const start = async () => {
    setError(null)
    setResult(null)
    setProgress(null)
    setRunning(true)
    try {
      await window.electronAPI?.startScan(path)
    } catch (e: any) {
      setRunning(false)
      setError(e?.message || String(e))
    }
  }

  const cancel = async () => {
    try {
      await window.electronAPI?.cancelScan()
    } catch {}
    setRunning(false)
  }

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Dashboard</h2>
      <p style={{ marginTop: 8, color: '#9A9AA0' }}>
        Phase 2: start a scan and watch progress.
      </p>

      <div style={{ marginTop: 14, display: 'grid', gap: 10, maxWidth: 720 }}>
        <label style={{ fontSize: 12, color: '#9A9AA0', fontWeight: 700 }}>
          Path to scan (MVP)
        </label>
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #2A2A2E',
            background: '#141416',
            color: '#F0F0F2',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
          placeholder="C:\\"
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={start}
            disabled={running}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #3A3A3F',
              background: running ? '#232327' : '#6C8CFF',
              color: '#0A0A0B',
              cursor: running ? 'not-allowed' : 'pointer',
              fontWeight: 800,
            }}
          >
            Start scan
          </button>
          <button
            onClick={cancel}
            disabled={!running}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #3A3A3F',
              background: 'transparent',
              color: running ? '#F87171' : '#6A6A70',
              cursor: running ? 'pointer' : 'not-allowed',
              fontWeight: 800,
            }}
          >
            Cancel
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: 12,
              border: '1px solid #3A3A3F',
              borderRadius: 8,
              color: '#F87171',
            }}
          >
            {error}
          </div>
        )}

        {running && progress && (
          <div
            style={{
              padding: 12,
              border: '1px solid #2A2A2E',
              borderRadius: 8,
              background: '#141416',
            }}
          >
            <div style={{ fontWeight: 800 }}>Scanning…</div>
            <div style={{ marginTop: 6, color: '#9A9AA0', fontSize: 12 }}>
              {progress.currentPath}
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 12, color: '#9A9AA0' }}>Files</div>
                <div style={{ fontWeight: 800 }}>{progress.filesScanned}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#9A9AA0' }}>Folders</div>
                <div style={{ fontWeight: 800 }}>{progress.foldersScanned}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#9A9AA0' }}>Total bytes</div>
                <div style={{ fontWeight: 800 }}>{formatBytes(progress.totalBytes)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#9A9AA0' }}>Elapsed</div>
                <div style={{ fontWeight: 800 }}>{Math.round((progress.elapsedMs || 0) / 1000)}s</div>
              </div>
            </div>
          </div>
        )}

        {!running && result && (
          <div
            style={{
              padding: 12,
              border: '1px solid #2A2A2E',
              borderRadius: 8,
              background: '#141416',
            }}
          >
            <div style={{ fontWeight: 800 }}>Scan complete</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 12, color: '#9A9AA0' }}>Files</div>
                <div style={{ fontWeight: 800 }}>{result.filesScanned}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#9A9AA0' }}>Folders</div>
                <div style={{ fontWeight: 800 }}>{result.foldersScanned}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#9A9AA0' }}>Total size</div>
                <div style={{ fontWeight: 800 }}>{formatBytes(result.totalBytes)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#9A9AA0' }}>Skipped</div>
                <div style={{ fontWeight: 800 }}>{result.skipped?.length || 0}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
