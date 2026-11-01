import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './i18n/context.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { api } from './services/api.js';

import Navbar from './components/Navbar.js';
import Footer from './components/Footer.js';
import AuthModal from './components/AuthModal.js';
import ProfileModal from './components/ProfileModal.js';

import HomePage from './pages/HomePage.js';
import UniversitiesPage from './pages/UniversitiesPage.js';
import CampusesPage from './pages/CampusesPage.js';
import FacilitiesPage from './pages/FacilitiesPage.js';
import EventsPage from './pages/EventsPage.js';
import EventDetailPage from './pages/EventDetailPage.js';
import MyRegistrationsPage from './pages/MyRegistrationsPage.js';
import StudentDashboard from './pages/StudentDashboard.js';
import OrganizerDashboard from './pages/OrganizerDashboard.js';
import AdminDashboard from './pages/AdminDashboard.js';
import ErrorBoundary from './components/ErrorBoundary.js';
import {
  FALLBACK_UNIVERSITIES,
  FALLBACK_CAMPUSES,
  FALLBACK_BUILDINGS,
  FALLBACK_EVENTS,
} from './data/fallbackData.js';

function MainApp() {
  const { language } = useLanguage();
  const { user } = useAuth();

  const [currentTab, setCurrentTab] = useState<string>('campuses');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [activeBuildingId, setActiveBuildingId] = useState<number | null>(null);

  const [universities, setUniversities] = useState<any[]>(FALLBACK_UNIVERSITIES);
  const [selectedUniversityId, setSelectedUniversityId] = useState<number>(1);
  const [campuses, setCampuses] = useState<any[]>(FALLBACK_CAMPUSES);
  const [selectedCampusId, setSelectedCampusId] = useState<number>(1);
  const [buildings, setBuildings] = useState<any[]>(FALLBACK_BUILDINGS);
  const [events, setEvents] = useState<any[]>(FALLBACK_EVENTS);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load universities and initial data
  const loadInitialData = async () => {
    try {
      const uniRes = await api.get('/universities');
      let currentUniId = 1;

      if (uniRes.data?.success && uniRes.data.data?.length > 0) {
        setUniversities(uniRes.data.data);
        currentUniId = uniRes.data.data[0].id;
        setSelectedUniversityId(currentUniId);
      } else {
        setUniversities(FALLBACK_UNIVERSITIES);
      }

      const [campusesRes, eventsRes] = await Promise.allSettled([
        api.get(`/campuses?university_id=${currentUniId}`),
        api.get('/events?include_all=true'),
      ]);

      if (campusesRes.status === 'fulfilled' && campusesRes.value.data?.success && campusesRes.value.data.data?.length > 0) {
        const firstCampus = campusesRes.value.data.data[0];
        setCampuses(campusesRes.value.data.data);
        setSelectedCampusId(firstCampus.id);

        const buildingsRes = await api.get(`/buildings?campus_id=${firstCampus.id}`);
        if (buildingsRes.data?.success && buildingsRes.data.data?.length > 0) {
          setBuildings(buildingsRes.data.data);
        }
      } else {
        const uniCampuses = FALLBACK_CAMPUSES.filter((c) => c.university_id === currentUniId);
        setCampuses(uniCampuses.length > 0 ? uniCampuses : FALLBACK_CAMPUSES.slice(0, 1));
        const firstCampusId = uniCampuses.length > 0 ? uniCampuses[0].id : 1;
        setSelectedCampusId(firstCampusId);
        const campusBuildings = FALLBACK_BUILDINGS.filter((b) => b.campus_id === firstCampusId);
        setBuildings(campusBuildings);
      }

      if (eventsRes.status === 'fulfilled' && eventsRes.value.data?.success) {
        setEvents(eventsRes.value.data.data);
      } else {
        const uniEvents = FALLBACK_EVENTS.filter((e) => e.university_id === currentUniId);
        setEvents(uniEvents.length > 0 ? uniEvents : FALLBACK_EVENTS);
      }
    } catch (err) {
      console.warn('Backend API offline, using verified fallback data:', err);
      setUniversities(FALLBACK_UNIVERSITIES);
      const uniCampuses = FALLBACK_CAMPUSES.filter((c) => c.university_id === 1);
      setCampuses(uniCampuses);
      setSelectedCampusId(1);
      setBuildings(FALLBACK_BUILDINGS.filter((b) => b.campus_id === 1));
      setEvents(FALLBACK_EVENTS);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // When university selector changes
  const handleSelectUniversity = async (uniId: number) => {
    setSelectedUniversityId(uniId);
    try {
      const [campusesRes, eventsRes] = await Promise.allSettled([
        api.get(`/campuses?university_id=${uniId}`),
        api.get(`/events?university_id=${uniId}&include_all=true`),
      ]);

      if (campusesRes.status === 'fulfilled' && campusesRes.value.data?.success && campusesRes.value.data.data?.length > 0) {
        const firstCampus = campusesRes.value.data.data[0];
        setCampuses(campusesRes.value.data.data);
        setSelectedCampusId(firstCampus.id);

        const bRes = await api.get(`/buildings?campus_id=${firstCampus.id}`);
        if (bRes.data?.success && bRes.data.data?.length > 0) {
          setBuildings(bRes.data.data);
        }
      } else {
        // Fallback for all universities (RUPP, ITC, NUM, NU, Paragon.U, RULE, CADT, etc.)
        const uniCampuses = FALLBACK_CAMPUSES.filter((c) => c.university_id === uniId);
        if (uniCampuses.length > 0) {
          setCampuses(uniCampuses);
          const firstCampusId = uniCampuses[0].id;
          setSelectedCampusId(firstCampusId);
          const campusBuildings = FALLBACK_BUILDINGS.filter((b) => b.campus_id === firstCampusId);
          setBuildings(campusBuildings);
        } else {
          setCampuses([]);
          setBuildings([]);
        }
      }

      if (eventsRes.status === 'fulfilled' && eventsRes.value.data?.success) {
        setEvents(eventsRes.value.data.data);
      } else {
        const uniEvents = FALLBACK_EVENTS.filter((e) => e.university_id === uniId);
        setEvents(uniEvents);
      }
    } catch (err) {
      console.warn('Failed to load university details:', err);
    } finally {
      setLoading(false);
    }
  };

  // When campus changes, load its buildings
  const handleSelectCampus = async (campusId: number) => {
    setSelectedCampusId(campusId);
    try {
      const res = await api.get(`/buildings?campus_id=${campusId}`);
      if (res.data?.success && res.data.data?.length > 0) {
        setBuildings(res.data.data);
        return;
      }
    } catch (err) {
      console.warn('Failed to load campus buildings from API, reading fallback:', err);
    }
    const campusBuildings = FALLBACK_BUILDINGS.filter((b) => b.campus_id === campusId);
    if (campusBuildings.length > 0) {
      setBuildings(campusBuildings);
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
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans w-full max-w-full overflow-x-hidden">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        selectedUniversityId={selectedUniversityId}
        onSelectUniversity={handleSelectUniversity}
        universities={universities}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 overflow-x-hidden">
        {loading ? (
          <div className="p-20 text-center text-slate-500 text-xs">
            <div className="animate-spin w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
            Initializing CampusConnect V2.0 Pilot Data...
          </div>
        ) : (
          <ErrorBoundary key={currentTab} onReset={() => setCurrentTab('home')}>
            {currentTab === 'home' && (
              <HomePage
                onNavigate={setCurrentTab}
                onSelectEvent={handleSelectEvent}
                onSelectBuilding={(bId) => handleNavigateToMap(selectedCampusId, bId)}
                events={events}
                buildings={buildings}
              />
            )}

            {currentTab === 'universities' && (
              <UniversitiesPage
                onSelectUniversity={handleSelectUniversity}
                onNavigate={setCurrentTab}
              />
            )}

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

            {currentTab === 'facilities' && (
              <FacilitiesPage
                buildings={buildings}
                onFocusBuildingOnMap={handleNavigateToMap}
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

            {currentTab === 'my-registrations' && (
              <MyRegistrationsPage
                onSelectEvent={handleSelectEvent}
                onNavigateToMap={handleNavigateToMap}
              />
            )}

            {currentTab === 'student' && (
              <StudentDashboard onSelectEvent={handleSelectEvent} />
            )}

            {currentTab === 'organizer' && (
              <OrganizerDashboard onSelectEvent={handleSelectEvent} />
            )}

            {currentTab === 'admin' && <AdminDashboard />}
          </ErrorBoundary>
        )}
      </main>

      <Footer />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
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
