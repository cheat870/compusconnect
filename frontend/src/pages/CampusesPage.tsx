import React from 'react';
import { useLanguage } from '../i18n/context.js';
import CampusMap from '../components/CampusMap.js';

interface CampusesPageProps {
  campuses: any[];
  selectedCampusId: number;
  onSelectCampus: (campusId: number) => void;
  buildings: any[];
  events: any[];
  onSelectEvent: (eventId: number) => void;
  activeBuildingId?: number | null;
}

export const CampusesPage: React.FC<CampusesPageProps> = ({
  campuses,
  selectedCampusId,
  onSelectCampus,
  buildings,
  events,
  onSelectEvent,
  activeBuildingId,
}) => {
  const { language, t } = useLanguage();

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h2 className="text-2xl font-black text-slate-900">{t.map.title}</h2>
        <p className="text-xs text-slate-500 mt-1">
          {language === 'km'
            ? 'ផែនទីផ្អែកលើទិន្នន័យ OpenStreetMap ពិតប្រាកដសម្រាប់បរិវេណសាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ'
            : 'Geographic navigation powered by OpenStreetMap data for Royal University of Phnom Penh campuses.'}
        </p>
      </div>

      <CampusMap
        campuses={campuses}
        selectedCampusId={selectedCampusId}
        onSelectCampus={onSelectCampus}
        buildings={buildings}
        events={events}
        onSelectEvent={onSelectEvent}
        activeBuildingId={activeBuildingId}
      />
    </div>
  );
};

export default CampusesPage;
