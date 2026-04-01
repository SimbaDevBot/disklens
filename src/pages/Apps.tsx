import React from 'react'

export default function Apps() {
  const [loading, setLoading] = React.useState(false)
  const [data, setData] = React.useState<any>(null)
  const [error, setError] = React.useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.electronAPI?.getInstalledApps?.()
      setData(res)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Installed Apps</h2>
      <p style={{ marginTop: 8, color: '#9A9AA0' }}>
        Phase 3 MVP: fetch installed apps via PowerShell and display raw JSON.
      </p>

      <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #3A3A3F',
            background: loading ? '#232327' : '#6C8CFF',
            color: '#0A0A0B',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 800,
          }}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <pre style={{ marginTop: 14, color: '#F87171', whiteSpace: 'pre-wrap' }}>{error}</pre>
      )}

      {data && (
        <pre
          style={{
            marginTop: 14,
            padding: 12,
            border: '1px solid #2A2A2E',
            borderRadius: 8,
            background: '#141416',
            maxWidth: 1000,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}
