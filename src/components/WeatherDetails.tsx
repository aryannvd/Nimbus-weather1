import React from 'react';
import { WeatherData, Settings } from '../types';
import { RawIcons, WeatherIcon } from './WeatherIcons';
import { cn, GLASS_STYLE_SUBTLE } from '../lib/utils';
import { formatTemp, formatWind, formatVisibility, formatPrecipitation } from '../lib/units';
import { format, parseISO } from 'date-fns';
import { motion } from 'motion/react';

interface WeatherDetailsProps {
  weather: WeatherData;
  settings: Settings;
}

export default function WeatherDetails({ weather, settings }: WeatherDetailsProps) {
  if (!weather || !weather.current) return null;
  const aqi = weather.airQuality;
  
  const getCurrentIndex = () => {
    // Current time in the city's timezone
    const baseCityTime = parseISO(weather.current.time.includes('Z') ? weather.current.time : `${weather.current.time}:00Z`);
    const elapsedMs = Date.now() - weather.fetchedAt;
    const cityNow = new Date(baseCityTime.getTime() + elapsedMs);

    // Find the hourly index closest to the current time
    const index = weather.hourly.time.findIndex(t => {
      const time = parseISO(t.includes('Z') ? t : `${t}:00Z`);
      return time.getTime() >= cityNow.getTime() - 1800000; // Half hour grace
    });

    return index === -1 ? 0 : index;
  };

  const currentIdx = getCurrentIndex();
  const rainChance = weather.hourly.precipitationProbability?.[currentIdx] ?? 0;

  const details = [
    {
      label: 'Humidity',
      value: Math.round(weather.current.relativeHumidity || 0),
      unit: '%',
      icon: 'Droplets'
    },
    {
      label: 'Visibility',
      value: formatVisibility(weather.current.visibility || 0, settings.unitVisibility),
      unit: settings.unitVisibility === 'miles' ? 'mi' : 'km',
      icon: 'Eye'
    },
    {
      label: 'Precipitation',
      value: formatPrecipitation(weather?.daily?.precipitationSum?.[0] || 0, settings.unitPrecipitation as any),
      unit: settings.unitPrecipitation === 'inches' ? 'in' : 'mm',
      icon: 'CloudRain',
      desc: `Today • Chance: ${rainChance}%`,
      isPrecip: true
    },
    {
      label: 'Wind Speed',
      value: formatWind(weather.current.windSpeed || 0, settings.unitWind),
      unit: settings.unitWind,
      icon: 'Wind',
      desc: getWindDir(weather.current.windDirection || 0),
      isWind: true
    }
  ];

  return (
    <div className="flex flex-col gap-6 px-0">
      {/* 1. Enhanced AQI Card (Full Width) */}
      <div className="w-full bg-app-surface backdrop-blur-[32px] border border-app-border rounded-[32px] pt-6 pb-7 px-6 flex flex-col gap-6 overflow-hidden shadow-2xl relative group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-app-text/5 flex items-center justify-center transition-transform group-hover:scale-110 duration-500">
              <WeatherIcon name="Wind" className="w-5 h-5" strokeWidth={2} forceColoured={true} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-[0.15em] uppercase text-app-text-dim/60 leading-none mb-1">Air Quality</span>
              <span className="text-[13px] font-bold text-app-text tracking-tight uppercase">WAQI Station Data</span>
            </div>
          </div>
        </div>

        {!aqi ? (
          <div className="py-12 flex flex-col items-center gap-4 text-center">
             <div className="w-12 h-12 rounded-full border-2 border-dashed border-app-border animate-spin-slow flex items-center justify-center">
                <WeatherIcon name="Info" className="w-5 h-5 text-app-text-dim/40" />
             </div>
             <div className="flex flex-col gap-1">
               <span className="text-app-text font-bold text-base tracking-tight">AQI Data Unavailable</span>
               <p className="text-app-text-dim text-xs max-w-[200px] leading-relaxed">
                 We couldn't reach the air quality station for this location right now.
               </p>
             </div>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-7xl font-[200] tracking-tighter text-app-text leading-none">
                    {aqi.isUnavailable ? "--" : aqi.usAqi}
                  </span>
                  <span className="text-[13px] font-black text-app-text-dim uppercase tracking-widest mb-1.5">
                    {(aqi.standardLabel || 'AQI · US Standard').replace(/^AQI\s*[·•]\s*/i, '')}
                  </span>
                </div>
                <div className="flex flex-col mt-3">
                  <span className="text-[20px] font-bold tracking-tight leading-tight flex items-center gap-2" style={{ color: aqi.isUnavailable ? 'inherit' : aqi.color }}>
                    {aqi.isUnavailable ? "Limited Data Availability" : aqi.description}
                  </span>
                  {aqi.lastUpdated && !aqi.isUnavailable && (() => {
                    let ageHours = 0;
                    try {
                      const cleanTime = aqi.lastUpdated.includes(' ') && !aqi.lastUpdated.includes('T') ? aqi.lastUpdated.replace(' ', 'T') : aqi.lastUpdated;
                      const updated = new Date(cleanTime);
                      ageHours = (Date.now() - updated.getTime()) / (1000 * 60 * 60);
                    } catch {
                      ageHours = 999;
                    }

                    let labelColor = "#4ade80";
                    let labelText = "Live";

                    if (ageHours > 6) {
                      labelColor = "#f59e0b";
                      labelText = `⚠ Data from ${Math.round(ageHours)}h ago`;
                    } else if (ageHours > 2) {
                      labelColor = "#94a3b8";
                      labelText = `Updated ${Math.round(ageHours)}h ago`;
                    }

                    return (
                      <span className="text-[10px] font-black uppercase tracking-[0.1em] mt-2 flex items-center gap-1.5 aqi-time aqi-updated">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: labelColor }} />
                        <span style={{ color: labelColor }}>{labelText}</span>
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <div className="w-full h-[10px] rounded-full bg-app-text/5 relative overflow-hidden">
                {/* Visual Gradient Track based on defined categories */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#32D74B] via-[#FFD60A] via-[#FF9F0A] via-[#FF453A] via-[#BF5AF2] to-[#8E3020] opacity-90" />
                
                {/* Indicator Thumb */}
                <motion.div 
                  className="absolute top-0 w-4 h-full bg-app-text shadow-[0_0_15px_rgba(255,255,255,1)] border-x border-black/20 z-10"
                  style={{ borderRadius: '9999px' }}
                  initial={{ left: '0%', x: '0%' }}
                  animate={{ 
                    left: `${Math.min(100, (aqi.usAqi / 500) * 100)}%`,
                    x: `-${Math.min(100, (aqi.usAqi / 500) * 100)}%` 
                  }}
                  transition={{ duration: 1.8, ease: [0.34, 1.56, 0.64, 1] }}
                />
              </div>
            </div>

            <div className="bg-app-text/[0.04] rounded-[24px] p-5 border border-app-border/50">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-app-text/5 shrink-0 flex items-center justify-center">
                  <WeatherIcon name="Info" className="w-4 h-4 text-app-text/40" />
                </div>
                <p className="text-[14px] text-app-text/80 font-medium leading-[1.5] py-1">
                  {aqi.recommendation}
                </p>
              </div>
              
              <div className="grid grid-cols-5 gap-3 pt-5 mt-5 border-t border-app-border/30">
                {[
                  { label: 'PM2.5', value: aqi.pm2_5, unit: 'µg/m³' },
                  { label: 'PM10', value: aqi.pm10, unit: 'µg/m³' },
                  { label: 'CO', value: aqi.co, unit: 'µg/m³' },
                  { label: 'NO₂', value: aqi.no2, unit: 'µg/m³' },
                  { label: 'O₃', value: aqi.o3, unit: 'µg/m³' }
                ].map((p, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-black text-app-text-dim/50 uppercase tracking-[0.05em] truncate">{p.label}</span>
                    <div className="flex flex-col">
                      <span className="text-[16px] font-bold text-app-text tracking-tighter leading-none">{Math.round(p.value || 0)}</span>
                      <span className="text-[9px] text-app-text-dim/60 font-bold leading-tight mt-0.5">{p.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-5 w-full pb-6">
        {details.map((detail, i) => (
          <div 
            key={i} 
            className={cn(
              "px-4 py-6 flex flex-col justify-between bg-app-surface backdrop-blur-[32px] border border-app-border rounded-[28px] h-[140px] shadow-lg transition-all duration-300 hover:bg-app-text/[0.05]",
              ('isWind' in detail) && "py-5"
            )}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="shrink-0">
                <WeatherIcon 
                  name={detail.icon as any} 
                  className={cn(
                    "w-5 h-5",
                    settings.iconStyle === 'coloured' ? "" : "text-app-text"
                  )} 
                  strokeWidth={2.2} 
                  style={settings.iconStyle === 'coloured' ? 'coloured' : 'outline'} 
                />
              </div>
              <span className="text-[11px] font-bold uppercase text-app-text-dim break-all leading-none">
                {detail.label}
              </span>
            </div>
            
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-1.5 overflow-hidden">
                  <span className="text-[34px] font-medium tracking-tighter text-app-text leading-none">
                    {detail.value}
                  </span>
                  {detail.unit && (
                    <span className="text-[14px] font-bold text-app-text-dim tracking-tight">
                      {detail.unit}
                    </span>
                  )}
                </div>
                {('desc' in detail) && detail.desc && (
                  <span className="text-[11px] text-app-text-dim font-semibold tracking-tight truncate">
                    {detail.desc}
                  </span>
                )}
              </div>
              {'extra' in detail && detail.extra}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getAQIRecommendation(aqi: number) {
  if (aqi <= 50) return 'Ideal for outdoor activities and fresh air.';
  if (aqi <= 100) return 'Acceptable quality; sensitive groups should limit exertion.';
  if (aqi <= 150) return 'Reduce prolonged outdoor exertion; masks recommended.';
  if (aqi <= 200) return 'Avoid outdoor activities; everyone may experience health effects.';
  return 'Health warning: serious risks. Stay indoors with air filtration.';
}

function getUVDesc(index: number) {
  if (index <= 2) return 'Low risk';
  if (index <= 5) return 'Moderate risk';
  if (index <= 7) return 'High risk';
  if (index <= 10) return 'Very high risk';
  return 'Extreme risk';
}

function getWindBeaufort(speed: number) {
  // speed in m/s
  if (speed < 0.3) return 'Calm';
  if (speed < 1.6) return 'Light Air';
  if (speed < 3.4) return 'Light Breeze';
  if (speed < 5.5) return 'Gentle Breeze';
  if (speed < 8.0) return 'Mod Breeze';
  if (speed < 10.8) return 'Fresh Breeze';
  if (speed < 13.9) return 'Strong Breeze';
  if (speed < 17.2) return 'Near Gale';
  return 'Gale';
}

function getWindDir(item: number) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(item / 45) % 8];
}
