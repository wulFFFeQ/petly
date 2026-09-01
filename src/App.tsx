import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { AppProvider } from './context/AppContext'
import { CalendarPage } from './pages/CalendarPage'
import { CommunityPage } from './pages/CommunityPage'
import { DashboardPage } from './pages/DashboardPage'
import { DiscoverPage } from './pages/DiscoverPage'
import { HealthPage } from './pages/HealthPage'
import { HelpPage } from './pages/HelpPage'
import { MessagesPage } from './pages/MessagesPage'
import { MyPetsPage } from './pages/MyPetsPage'
import { PetProfilePage } from './pages/PetProfilePage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="pets" element={<MyPetsPage />} />
            <Route path="pets/:petId" element={<PetProfilePage />} />
            <Route path="discover" element={<DiscoverPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="health" element={<HealthPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="help" element={<HelpPage />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  )
}

export default App
