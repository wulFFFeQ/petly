import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { OnboardingGate } from './components/account/OnboardingGate'
import { ProfessionalGate } from './components/account/ProfessionalGate'
import { AppLayout } from './components/layout/AppLayout'
import { ProfessionalLayout } from './components/layout/ProfessionalLayout'
import { ScrollToTop } from './components/layout/ScrollToTop'
import { ToastContainer } from './components/ui/Toast'
import { AppProvider } from './context/AppContext'
import { CalendarPage } from './pages/CalendarPage'
import { CommunityPage } from './pages/CommunityPage'
import { ConciergePage } from './pages/ConciergePage'
import { ContactsPage } from './pages/ContactsPage'
import { DashboardPage } from './pages/DashboardPage'
import { MyBookingsPage } from './pages/MyBookingsPage'
import { MyBookingDetailPage } from './pages/MyBookingDetailPage'
import { DiscoverPage } from './pages/DiscoverPage'
import { DiscoverPetPage } from './pages/DiscoverPetPage'
import { FoundPetPage } from './pages/FoundPetPage'
import { LostPetPage } from './pages/LostPetPage'
import { EmergencyPetPage } from './pages/EmergencyPetPage'
import { HealthPage } from './pages/HealthPage'
import { HelpPage } from './pages/HelpPage'
import { MessagesPage } from './pages/MessagesPage'
import { MyPetsPage } from './pages/MyPetsPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { OwnerPublicPage } from './pages/OwnerPublicPage'
import { PetProfilePage } from './pages/PetProfilePage'
import { ProfessionalPublicPage } from './pages/ProfessionalPublicPage'
import { ProfessionalPetAccessPage } from './pages/ProfessionalPetAccessPage'
import { ProfessionalsCatalogPage } from './pages/ProfessionalsCatalogPage'
import { ProfessionalOverviewPage } from './pages/professional/ProfessionalOverviewPage'
import { ProfessionalPetsPage } from './pages/professional/ProfessionalPetsPage'
import { ProfessionalPetPage } from './pages/professional/ProfessionalPetPage'
import { ProfessionalAccessPage } from './pages/professional/ProfessionalAccessPage'
import { ProfessionalCalendarPage } from './pages/professional/ProfessionalCalendarPage'
import { ProfessionalRecordsPage } from './pages/professional/ProfessionalRecordsPage'
import { ProfessionalProfilePage } from './pages/professional/ProfessionalProfilePage'
import { ProfessionalBookingsPage } from './pages/professional/ProfessionalBookingsPage'
import { ProfessionalBookingDetailPage } from './pages/professional/ProfessionalBookingDetailPage'
import { ProfessionalServicesPage } from './pages/professional/ProfessionalServicesPage'
import { ProfessionalAvailabilityPage } from './pages/professional/ProfessionalAvailabilityPage'
import { ProfessionalBookingRulesPage } from './pages/professional/ProfessionalBookingRulesPage'
import { ProfessionalMessagesPage } from './pages/professional/ProfessionalMessagesPage'
import { ProfessionalPaymentsPage } from './pages/professional/ProfessionalPaymentsPage'
import { MembershipPage } from './pages/MembershipPage'
import { SettingsPage } from './pages/SettingsPage'
import { TravelPage } from './pages/TravelPage'

function FoundPetLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAF8F5]">
      <FoundPetPage />
      <ToastContainer />
    </div>
  )
}

function LostPetLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAF8F5]">
      <LostPetPage />
      <ToastContainer />
    </div>
  )
}

function EmergencyPetLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAF8F5]">
      <EmergencyPetPage />
      <ToastContainer />
    </div>
  )
}

function OnboardingLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAF8F5]">
      <OnboardingPage />
      <ToastContainer />
    </div>
  )
}

function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

  return (
    <BrowserRouter basename={basename}>
      <ScrollToTop />
      <AppProvider>
        <Routes>
          <Route path="found/:token" element={<FoundPetLayout />} />
          <Route path="lost/:token" element={<LostPetLayout />} />
          <Route path="pet/:slug/emergency" element={<EmergencyPetLayout />} />
          <Route path="onboarding" element={<OnboardingLayout />} />
          <Route element={<OnboardingGate />}>
            <Route path="professional" element={<ProfessionalGate />}>
              <Route element={<ProfessionalLayout />}>
                <Route index element={<ProfessionalOverviewPage />} />
                <Route path="pets" element={<ProfessionalPetsPage />} />
                <Route path="pets/:petId" element={<ProfessionalPetPage />} />
                <Route path="access" element={<ProfessionalAccessPage />} />
                <Route path="bookings" element={<ProfessionalBookingsPage />} />
                <Route path="bookings/:id" element={<ProfessionalBookingDetailPage />} />
                <Route path="messages" element={<ProfessionalMessagesPage />} />
                <Route path="services" element={<ProfessionalServicesPage />} />
                <Route path="availability" element={<ProfessionalAvailabilityPage />} />
                <Route path="booking-rules" element={<ProfessionalBookingRulesPage />} />
                <Route path="payments" element={<ProfessionalPaymentsPage />} />
                <Route path="calendar" element={<ProfessionalCalendarPage />} />
                <Route path="records" element={<ProfessionalRecordsPage />} />
                <Route path="profile" element={<ProfessionalProfilePage />} />
                <Route path="settings" element={<Navigate to="/settings" replace />} />
                <Route path="help" element={<Navigate to="/help" replace />} />
              </Route>
            </Route>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="pets" element={<MyPetsPage />} />
              <Route path="pets/:petId" element={<PetProfilePage />} />
              <Route path="discover" element={<DiscoverPage />} />
              <Route path="discover/:petId" element={<DiscoverPetPage />} />
              <Route path="owners/:ownerId" element={<OwnerPublicPage />} />
              <Route path="professionals" element={<ProfessionalsCatalogPage />} />
              <Route
                path="professionals/:professionalId/pets/:petId"
                element={<ProfessionalPetAccessPage />}
              />
              <Route
                path="professionals/:professionalId"
                element={<ProfessionalPublicPage />}
              />
              <Route path="community" element={<CommunityPage />} />
              <Route path="health" element={<HealthPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="bookings" element={<MyBookingsPage />} />
              <Route path="bookings/:id" element={<MyBookingDetailPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="travel" element={<TravelPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="concierge" element={<ConciergePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="membership" element={<MembershipPage />} />
              <Route path="help" element={<HelpPage />} />
            </Route>
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  )
}

export default App
