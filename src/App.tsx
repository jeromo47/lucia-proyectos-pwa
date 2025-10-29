import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import CalendarPage from '@/pages/CalendarPage'
import Settings from '@/pages/Settings'
import ProjectDetail from '@/pages/ProjectDetail'
import CustomFields from '@/pages/CustomFields'
import Splash from '@/components/Splash'
import { useEffect, useState } from 'react'
import { rescheduleAll } from '@/lib/notifications'
import { SessionProvider } from '@/state/session' // ⬅️ añadido

export default function App() {
  const [boot, setBoot] = useState(false)
  useEffect(() => { rescheduleAll() }, [])

  if (!boot) return <Splash done={() => setBoot(true)} />

  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route index element={<Home />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/project/:id" element={<ProjectDetail />} />
          <Route path="/custom-fields" element={<CustomFields />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}
