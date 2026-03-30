import React from 'react'
import Dashboard from './pages/Dashboard'

type RouteKey = 'dashboard' | 'analyze' | 'apps' | 'duplicates' | 'cleanup'

function useHashRoute(): [RouteKey, (r: RouteKey) => void] {
  const getRoute = (): RouteKey => {
    const h = (window.location.hash || '#/dashboard').toLowerCase()
    const m = h.match(/^#\/(dashboard|analyze|apps|duplicates|cleanup)/)
    return (m?.[1] as RouteKey) || 'dashboard'
  }

  const [route, setRoute] = React.useState<RouteKey>(getRoute)

  React.useEffect(() => {
    const onHash = () => setRoute(getRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const nav = (r: RouteKey) => {
    window.location.hash = `#/${r}`
  }

  return [route, nav]
}

function NavItem({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid transparent',
        background: active ? '#232327' : 'transparent',
        color: active ? '#F0F0F2' : '#9A9AA0',
        cursor: 'pointer',
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  )
}

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ margin: 0, fontSize: 20, color: '#F0F0F2' }}>{title}</h2>
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  )
}

export default function App() {
  const [route, nav] = useHashRoute()

  return (
    <div
      style={{
        height: '100vh',
        display: 'grid',
        gridTemplateColumns: '240px 1fr',
        background: '#0A0A0B',
        color: '#F0F0F2',
      }}
    >
      <aside
        style={{
          borderRight: '1px solid #2A2A2E',
          padding: 14,
          background: '#141416',
        }}
      >
        <div style={{ fontWeight: 800, letterSpacing: 0.3, marginBottom: 14 }}>
          DiskLens
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <NavItem label="Dashboard" active={route === 'dashboard' && <Dashboard />}
        {route === 'analyze' && (
          <Page title="Disk Analysis">
            <p style={{ margin: 0, color: '#9A9AA0' }}>Treemap + table in Phase 2.</p>
          </Page>
        )}
        {route === 'apps' && (
          <Page title="Installed Apps">
            <p style={{ margin: 0, color: '#9A9AA0' }}>Registry/AppX listing in Phase 3.</p>
          </Page>
        )}
        {route === 'duplicates' && (
          <Page title="Duplicates">
            <p style={{ margin: 0, color: '#9A9AA0' }}>Duplicate scanner in Phase 4.</p>
          </Page>
        )}
        {route === 'cleanup' && (
          <Page title="Cleanup">
            <p style={{ margin: 0, color: '#9A9AA0' }}>Cleanup categories in Phase 5.</p>
          </Page>
        )}
      </main>
    </div>
  )
}
