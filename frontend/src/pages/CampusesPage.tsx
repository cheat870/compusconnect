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
    <div className="space-y-4 sm:space-y-6 pb-12 sm:pb-16 w-full max-w-full overflow-hidden">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{t.map.title}</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl">
          {language === 'km'
            ? 'ផែនទីផ្អែកលើទិន្នន័យ OpenStreetMap ពិតប្រាកដសម្រាប់បរិវេណសាកលវិទ្យាល័យ និងគ្រឹះស្ថានឧត្តមសិក្សានៅកម្ពុជា'
            : 'Geographic navigation powered by OpenStreetMap data for Cambodian universities and campuses.'}
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
