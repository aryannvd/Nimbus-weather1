import React from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { Icons, WeatherIcon } from './WeatherIcons';
import { Location, WeatherData } from '../types';
import { cn, GLASS_STYLE_SUBTLE } from '../lib/utils';
import { Haptic } from '../lib/haptics';
import { getWeatherInfo, getCountryCode } from '../services/weatherService';

interface CityManagerProps {
  locations: Location[];
  activeLocationIndex: number;
  weatherData: Record<number, WeatherData>;
  hapticEnabled: boolean;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onReorder: (newLocations: Location[]) => void;
  onClose: () => void;
  panelStackRef: React.MutableRefObject<(() => void)[]>;
}

interface CityListItemProps {
  key?: string;
  loc: Location;
  index: number;
  weather: WeatherData | undefined;
  hapticEnabled: boolean;
  isSelected: boolean;
  onSelect: (index: number) => void;
  onRemove: (e: React.MouseEvent, index: number) => void;
  onDragEnd?: () => void;
}

const CityListItem = ({
  loc,
  index,
  weather,
  hapticEnabled,
  isSelected,
  onSelect,
  onRemove,
  onDragEnd,
}: CityListItemProps) => {
  const dragControls = useDragControls();
  const info = weather ? getWeatherInfo(weather.current.weatherCode, weather.current.isDay) : null;

  return (
    <Reorder.Item 
      key={`${loc.latitude}-${loc.longitude}-${loc.name}`} 
      value={loc}
      className="relative select-none"
      drag={!loc.isCurrentLocation}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={() => {
        Haptic.light(hapticEnabled);
        onDragEnd?.();
      }}
      whileDrag={{ 
        scale: 1.03, 
        zIndex: 9999,
        boxShadow: "0 12px 30px rgba(0,0,0,0.5)"
      }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 38 
      }}
    >
      <motion.div
        onClick={() => {
          Haptic.light(hapticEnabled);
          onSelect(index);
        }}
        className={cn(
          "p-5 flex items-center justify-between rounded-[28px] border transition-colors duration-200 cursor-pointer",
          isSelected ? "bg-white/10 border-white/20" : "bg-white/5 border-white/5"
        )}
      >
        <div className="flex items-center gap-4">
          {!loc.isCurrentLocation ? (
            <div 
              onPointerDown={(e) => {
                Haptic.light(hapticEnabled);
                dragControls.start(e);
              }}
              className="flex flex-col gap-1 items-center opacity-40 cursor-grab active:cursor-grabbing p-1.5 -m-1.5 touch-none"
            >
              <Icons.GripVertical className="w-4 h-4" />
            </div>
          ) : (
            <div className="flex items-center justify-center shrink-0 w-4 h-4 text-white/90">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 10c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
              </svg>
            </div>
          )}
          
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[17px] font-semibold">{loc.name}</span>
            </div>
            <span className="text-[13px] text-white/45">
              {getCountryCode(loc.country)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {weather ? (
            <div className="flex items-center gap-3">
               <span className="text-2xl font-semibold tracking-tight">
                 {Math.round(weather.current.temperature)}°
               </span>
               {info && (
                 <WeatherIcon 
                   name={info.icon as any} 
                   className="w-7 h-7 text-white" 
                   style="outline" 
                 />
               )}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full border border-white/10 border-t-white animate-spin opacity-20" />
          )}

          {!loc.isCurrentLocation ? (
            <button 
              onClick={(e) => onRemove(e, index)}
              className="p-2 text-white/20 hover:text-red-400/60 transition-colors"
            >
              <Icons.Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>
      </motion.div>
    </Reorder.Item>
  );
};

const CityManager = ({ 
  locations, 
  activeLocationIndex, 
  weatherData, 
  hapticEnabled,
  onSelect, 
  onAdd, 
  onRemove, 
  onReorder,
  onClose,
  panelStackRef
}: CityManagerProps) => {
  const [localLocations, setLocalLocations] = React.useState<Location[]>(locations);

  React.useEffect(() => {
    setLocalLocations(locations);
  }, [locations]);

  const handleRemove = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    Haptic.warning(hapticEnabled);
    onRemove(index);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 10 }}
      transition={{ 
        duration: 0.4, 
        ease: [0.22, 1, 0.36, 1],
        scale: { duration: 0.5 },
        opacity: { duration: 0.3 }
      }}
      className="fixed inset-0 z-[99990] bg-black overflow-y-auto gpu"
      data-no-swipe
    >
      <div className="max-w-[390px] mx-auto min-h-screen px-6 pt-24 pb-24">
        <header className="flex flex-col gap-4 mb-8 px-1">
          <motion.button 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => {
              Haptic.light(hapticEnabled);
              onClose();
            }}
            className="w-10 h-10 bg-white/10 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 transition-all select-none self-start"
          >
            <Icons.ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
          </motion.button>
          <h1 className="text-[34px] font-semibold text-white tracking-tight leading-tight">Manage Locations</h1>
        </header>

        <Reorder.Group 
          values={localLocations} 
          onReorder={(newLocs) => {
            // Lock the location-based added city (isCurrentLocation = true) strictly as the first page/item
            const currentLoc = newLocs.find(l => l.isCurrentLocation);
            let finalLocations = [...newLocs];
            if (currentLoc) {
              const otherLocs = newLocs.filter(l => !l.isCurrentLocation);
              finalLocations = [currentLoc, ...otherLocs];
            }
            setLocalLocations(finalLocations);
          }}
          className="flex flex-col gap-3"
        >
          {localLocations.map((loc) => {
            const originalIndex = locations.findIndex(
              l => l.latitude === loc.latitude && l.longitude === loc.longitude
            );
            const useIndex = originalIndex !== -1 ? originalIndex : 0;
            return (
              <CityListItem
                key={`${loc.latitude}-${loc.longitude}-${loc.name}`}
                loc={loc}
                index={useIndex}
                weather={weatherData[useIndex]}
                hapticEnabled={hapticEnabled}
                isSelected={activeLocationIndex === useIndex}
                onSelect={onSelect}
                onRemove={handleRemove}
                onDragEnd={() => {
                  onReorder(localLocations);
                }}
              />
            );
          })}
        </Reorder.Group>

        <button 
          onClick={() => {
            Haptic.medium(hapticEnabled);
            onAdd();
          }}
          className="w-full mt-6 py-5 bg-white/10 border border-dashed border-white/20 rounded-[28px] flex items-center justify-center gap-3 text-white active:scale-95 transition-all text-[15px] font-medium"
        >
          <Icons.Plus className="w-5 h-5 text-white/60" />
          <span>Add new city</span>
        </button>
      </div>
    </motion.div>
  );
};

export default CityManager;
