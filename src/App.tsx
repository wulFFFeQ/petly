import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { AppProvider } from './context/AppContext'
import { CalendarPage } from './pages/CalendarPage'
import { CommunityPage } from './pages/CommunityPage'
import { ConciergePage } from './pages/ConciergePage'
import { ContactsPage } from './pages/ContactsPage'
import { DashboardPage } from './pages/DashboardPage'
import { DiscoverPage } from './pages/DiscoverPage'
import { DiscoverPetPage } from './pages/DiscoverPetPage'
import { HealthPage } from './pages/HealthPage'
import { HelpPage } from './pages/HelpPage'
import { MessagesPage } from './pages/MessagesPage'
import { MyPetsPage } from './pages/MyPetsPage'
import { PetProfilePage } from './pages/PetProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import { TravelPage } from './pages/TravelPage'

function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

  return (
    <BrowserRouter basename={basename}>
      <AppProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="pets" element={<MyPetsPage />} />
            <Route path="pets/:petId" element={<PetProfilePage />} />
            <Route path="discover" element={<DiscoverPage />} />
            <Route path="discover/:petId" element={<DiscoverPetPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="health" element={<HealthPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="travel" element={<TravelPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="concierge" element={<ConciergePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="help" element={<HelpPage />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  )
}

export default App
