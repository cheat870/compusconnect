import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './i18n/context.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { api } from './services/api.js';

import Navbar from './components/Navbar.js';
import Footer from './components/Footer.js';
import AuthModal from './components/AuthModal.js';

import HomePage from './pages/HomePage.js';
import UniversitiesPage from './pages/UniversitiesPage.js';
import CampusesPage from './pages/CampusesPage.js';
import EventsPage from './pages/EventsPage.js';
import EventDetailPage from './pages/EventDetailPage.js';
import StudentDashboard from './pages/StudentDashboard.js';
import OrganizerDashboard from './pages/OrganizerDashboard.js';
import AdminDashboard from './pages/AdminDashboard.js';

function MainApp() {
  const { language } = useLanguage();
  const { user } = useAuth();

  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [activeBuildingId, setActiveBuildingId] = useState<number | null>(null);

  const [campuses, setCampuses] = useState<any[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState<number>(1);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load initial public datasets
  const loadData = async () => {
    try {
      setLoading(true);
      const [campusesRes, buildingsRes, eventsRes] = await Promise.all([
        api.get('/campuses?university_id=1'),
        api.get('/buildings?campus_id=1'),
        api.get('/events?include_all=true'), // load all so tabs can filter
      ]);

      if (campusesRes.data.success && campusesRes.data.data.length > 0) {
        setCampuses(campusesRes.data.data);
        setSelectedCampusId(campusesRes.data.data[0].id);
      }
      if (buildingsRes.data.success) {
        setBuildings(buildingsRes.data.data);
      }
      if (eventsRes.data.success) {
        setEvents(eventsRes.data.data);
      }
    } catch (err) {
      console.error('Initial data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When campus changes, load its buildings
  const handleSelectCampus = async (campusId: number) => {
    setSelectedCampusId(campusId);
    try {
      const res = await api.get(`/buildings?campus_id=${campusId}`);
      if (res.data.success) {
        setBuildings(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load campus buildings:', err);
    }
  };

  const handleSelectEvent = (eventId: number) => {
    setSelectedEventId(eventId);
    setCurrentTab('event-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToMap = (campusId: number, buildingId?: number) => {
    setSelectedCampusId(campusId);
    setActiveBuildingId(buildingId || null);
    setCurrentTab('campuses');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {loading ? (
          <div className="p-20 text-center text-slate-500 text-xs">
            <div className="animate-spin w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
            Initializing CampusConnect RUPP Pilot Data...
          </div>
        ) : (
          <>
            {currentTab === 'home' && (
              <HomePage
                onNavigate={setCurrentTab}
                onSelectEvent={handleSelectEvent}
                onSelectBuilding={(bId) => handleNavigateToMap(selectedCampusId, bId)}
                events={events}
                buildings={buildings}
              />
            )}

            {currentTab === 'universities' && <UniversitiesPage />}

            {currentTab === 'campuses' && (
              <CampusesPage
                campuses={campuses}
                selectedCampusId={selectedCampusId}
                onSelectCampus={handleSelectCampus}
                buildings={buildings}
                events={events}
                onSelectEvent={handleSelectEvent}
                activeBuildingId={activeBuildingId}
              />
            )}

            {currentTab === 'events' && (
              <EventsPage
                events={events}
                onSelectEvent={handleSelectEvent}
                onNavigateToOrganizer={() => setCurrentTab('organizer')}
              />
            )}

            {currentTab === 'event-detail' && selectedEventId && (
              <EventDetailPage
                eventId={selectedEventId}
                onBack={() => setCurrentTab('events')}
                onNavigateToMap={handleNavigateToMap}
                onOpenAuth={() => setIsAuthModalOpen(true)}
              />
            )}

            {currentTab === 'student' && (
              <StudentDashboard onSelectEvent={handleSelectEvent} />
            )}

            {currentTab === 'organizer' && (
              <OrganizerDashboard onSelectEvent={handleSelectEvent} />
            )}

            {currentTab === 'admin' && <AdminDashboard />}
          </>
        )}
      </main>

      <Footer />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
