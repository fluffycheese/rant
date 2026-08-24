import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar/Sidebar.tsx'

const styles: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', height: '100vh', overflow: 'hidden' },
  main:  { flex: 1, overflow: 'auto', background: '#0f1117' },
}

export default function Layout() {
  return (
    <div style={styles.shell}>
      <Sidebar />
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
