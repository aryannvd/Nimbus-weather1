import React from 'react';
import { WeatherData, Location, Settings } from '../types';
import { WeatherIcon, Icons } from './WeatherIcons';
import { getCurrentWeatherState, getMoonPhaseInfo } from '../services/weatherService';
import { formatTemp } from '../lib/units';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { RawIcons } from './WeatherIcons';
import { cn } from '../lib/utils';
import { Haptic } from '../lib/haptics';

interface WeatherHeroProps {
  weather: WeatherData;
  location: Location;
  settings: Settings;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  slideDirection?: 'left' | 'right' | null;
}

export default function WeatherHero({ weather, location, settings, onRefresh, isRefreshing, slideDirection }: WeatherHeroProps) {
  if (!weather || !weather.current) return null;
  const info = getCurrentWeatherState(weather);
  const moonPhase = getMoonPhaseInfo(weather.daily.moonPhase?.[0] ?? 0);

  const formatDate = (dateStr: string) => {
    try {
      const d = parseISO(dateStr.includes('Z') ? dateStr : `${dateStr}:00Z`);
      return d.toLocaleDateString("en-US", {
        timeZone: "UTC",
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    } catch {
      return 'Today';
    }
  };

  const formatLastUpdated = (ts: number) => {
    const minutes = Math.floor((Date.now() - ts) / 60000);
    if (minutes < 1) return 'NOW';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const slideTransition = {
    type: "spring",
    stiffness: 140,
    damping: 18,
    mass: 1
  };

  return (
    <div className="flex flex-col items-center text-center pt-1 pb-6 overflow-visible">
      {/* Status Bar - Moon Phase & Last Updated */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={slideTransition}
        className="flex items-center gap-2 mb-4"
      >
        <div className="flex items-center gap-2 bg-app-surface py-1.5 px-3 rounded-full border border-app-border">
          <span className="text-[10px] uppercase font-bold tracking-widest text-app-text-dim whitespace-nowrap">
            {moonPhase.emoji} {moonPhase.label} • {moonPhase.illumination}%
          </span>
        </div>

        {weather.fetchedAt && (
          <div className="flex items-center">
            {onRefresh ? (
              <motion.button
                id="refresh-label-btn"
                onClick={() => {
                  Haptic.medium(settings.hapticEnabled);
                  onRefresh();
                }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 bg-app-surface py-1.5 px-3 rounded-full border border-app-border hover:border-app-border/80 transition-colors duration-200 select-none text-app-text-dim cursor-pointer"
              >
                <Icons.Clock className={cn("w-3 h-3 text-app-text-dim/70", isRefreshing && "animate-pulse")} />
                <span className="text-[10px] uppercase font-bold tracking-widest">
                  {formatLastUpdated(weather.fetchedAt)}
                </span>
              </motion.button>
            ) : (
              <div className="flex items-center gap-2 bg-app-surface py-1.5 px-3 rounded-full border border-app-border select-none">
                <Icons.Clock className="w-3 h-3 text-app-text-dim/60" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-app-text-dim/60">
                  {formatLastUpdated(weather.fetchedAt)}
                </span>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Core weather statistics container */}
      <div
        className="flex flex-col items-center overflow-visible w-full"
      >
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={slideTransition}
          className="mb-4 flex flex-col items-center overflow-visible"
        >
          <WeatherIcon 
            name={info.icon as any} 
            style={settings.iconStyle}
            className="w-32 h-32 text-app-text main-weather-svg-icon" 
            strokeWidth={1.2} 
          />
        </motion.div>
        
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={slideTransition}
          className="relative flex justify-center -mr-6"
        >
          <span className="text-[140px] leading-none font-[200] tracking-tighter text-app-text">
            {formatTemp(weather.current.temperature, settings.unitTemp)}
          </span>
          <span className="text-3xl font-light text-app-text-dim mt-6 ml-2">°</span>
        </motion.div>

        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={slideTransition}
          className="flex flex-col items-center gap-2 mt-4"
        >
          <span className="text-xl font-medium text-app-text/90">{info.label}</span>
          <div className="flex items-center gap-3 text-app-text-dim text-[14px] font-medium tracking-wide">
            <span>H: {formatTemp(weather.daily.temperatureMax?.[0] ?? 0, settings.unitTemp)}°</span>
            <span className="w-1 h-1 bg-app-border rounded-full" />
            <span>L: {formatTemp(weather.daily.temperatureMin?.[0] ?? 0, settings.unitTemp)}°</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
