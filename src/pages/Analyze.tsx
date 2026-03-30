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

export default function Analyze() {
  const last = useScanStore((st) => st.lastResult)

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Disk Analysis</h2>
      {!last ? (
        <p style={{ marginTop: 10, color: '#9A9AA0' }}>
          No scan results yet. Start a scan from the Dashboard.
        </p>
      ) : (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            border: '1px solid #2A2A2E',
            borderRadius: 8,
            background: '#141416',
            maxWidth: 760,
          }}
        >
          <div style={{ fontWeight: 800 }}>Latest scan summary</div>
          <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, color: '#9A9AA0' }}>Files</div>
              <div style={{ fontWeight: 800 }}>{last.filesScanned}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#9A9AA0' }}>Folders</div>
              <div style={{ fontWeight: 800 }}>{last.foldersScanned}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#9A9AA0' }}>Total size</div>
              <div style={{ fontWeight: 800 }}>{formatBytes(last.totalBytes)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#9A9AA0' }}>Skipped</div>
              <div style={{ fontWeight: 800 }}>{last.skipped?.length || 0}</div>
            </div>
          </div>

          <p style={{ marginTop: 12, color: '#9A9AA0', fontSize: 13 }}>
            Next: TreeTable + Treemap (this is just the first Analysis placeholder).
          </p>
        </div>
      )}
    </div>
  )
}
