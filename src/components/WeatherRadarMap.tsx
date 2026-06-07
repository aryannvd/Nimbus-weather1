import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icons } from './WeatherIcons';
import { Location } from '../types';
import { cn } from '../lib/utils';
import { Haptic } from '../lib/haptics';

interface WeatherRadarMapProps {
  activeLocation: Location;
  onClose: () => void;
  hapticEnabled: boolean;
}

type RadarLayer = 'temp' | 'rain' | 'clouds' | 'wind';

export default function WeatherRadarMap({ activeLocation, onClose, hapticEnabled }: WeatherRadarMapProps) {
  const [activeLayer, setActiveLayer] = useState<RadarLayer>('rain');
  const [iframeLoading, setIframeLoading] = useState(true);

  // Re-trigger loading state when layer or city coordinates change
  useEffect(() => {
    setIframeLoading(true);
  }, [activeLayer, activeLocation.latitude, activeLocation.longitude]);

  const layers: { id: RadarLayer; label: string; icon: keyof typeof Icons; desc: string }[] = [
    { 
      id: 'rain', 
      label: 'Precipitation', 
      icon: 'CloudRain', 
      desc: 'Real-time rain, snow, thunder & precipitation forecast loops' 
    },
    { 
      id: 'temp', 
      label: 'Temperature', 
      icon: 'Thermometer', 
      desc: 'Thermal contour visualizer showing global heat and cold gradients' 
    },
    { 
      id: 'clouds', 
      label: 'Cloud Cover', 
      icon: 'Cloud', 
      desc: 'High-resolution satellite view mapping cloud density and visibility' 
    },
    { 
      id: 'wind', 
      label: 'Wind Speed', 
      icon: 'Wind', 
      desc: 'Dynamic streamline particle map depicting wind velocities and direction' 
    },
  ];

  const currentLayerObj = layers.find(l => l.id === activeLayer);

  // Construct Windy Embed URL centering on the active city coordinates
  const lat = activeLocation.latitude.toFixed(4);
  const lon = activeLocation.longitude.toFixed(4);
  const embedUrl = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&zoom=6&level=surface&overlay=${activeLayer}&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.99 }}
      transition={{ 
        type: "spring", 
        damping: 30, 
        stiffness: 300, 
        mass: 0.8
      }}
      className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-2xl gpu settings-panel flex flex-col will-change-transform"
      data-no-swipe
    >
      {/* Outer bounds constraints matching mobile structure */}
      <div className="max-w-[390px] mx-auto w-full h-full flex flex-col px-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-8 overflow-hidden">
        
        {/* HEADER */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col gap-1 pr-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em]">LIVE RADAR</p>
            </div>
            <h1 className="text-[28px] font-bold text-app-text tracking-tight leading-none">
              {activeLocation.name}
            </h1>
          </div>

          <button 
            type="button"
            onClick={() => {
              Haptic.medium(hapticEnabled);
              onClose();
            }}
            className="w-12 h-12 bg-app-text/5 border border-app-border rounded-full flex items-center justify-center text-app-text shadow-xl hover:bg-app-text/10 active:scale-95 transition-all"
            aria-label="Back"
          >
            <Icons.ChevronLeft className="w-5 h-5 text-app-text" strokeWidth={2.5} />
          </button>
        </div>

        {/* INTERACTIVE CONTROLS */}
        <div className="flex p-1 bg-app-text/[0.04] border border-app-border/30 rounded-[16px] w-full mb-4 relative">
          {layers.map((layer) => {
            const isSelected = activeLayer === layer.id;
            const IconComponent = Icons[layer.icon];
            return (
              <button
                key={layer.id}
                onClick={() => {
                  if (!isSelected) {
                    Haptic.light(hapticEnabled);
                    setActiveLayer(layer.id);
                  }
                }}
                className={cn(
                  "flex-1 py-2.5 flex flex-col items-center justify-center gap-1.5 text-[10px] font-bold rounded-[14px] transition-colors duration-200 relative z-10",
                  isSelected ? "text-black" : "text-app-text-dim hover:text-app-text/70"
                )}
              >
                <IconComponent className={cn("w-4 h-4", isSelected ? "text-black" : "text-app-text-dim")} />
                <span>{layer.label}</span>
                {isSelected && (
                  <motion.div
                    layoutId="radar-active-indicator"
                    className="absolute inset-0 bg-white rounded-[14px] -z-10 shadow-md will-change-transform"
                    transition={{ 
                      type: "spring", 
                      bounce: 0.1, 
                      duration: 0.3,
                      stiffness: 420,
                      damping: 32
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* MAP PANEL */}
        <div className="flex-1 relative rounded-[28px] overflow-hidden border border-app-border bg-black/40 shadow-2xl group justify-center items-center">
          
          {/* Live Embed Iframe */}
          <iframe
            id="radar-iframe"
            src={embedUrl}
            className="w-full h-full border-0 rounded-[28px] select-all relative z-10"
            allowFullScreen
            onLoad={() => setIframeLoading(false)}
          />

          {/* Loading Layer */}
          <AnimatePresence>
            {iframeLoading && (
              <motion.div 
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-20 gap-4"
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-12 h-12 border-2 border-indigo-500/10 rounded-full border-t-2 border-t-indigo-500 animate-spin" />
                  <Icons.Map className="w-5 h-5 text-indigo-400 absolute animate-pulse" />
                </div>
                <div className="flex flex-col items-center text-center gap-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#a5cbfb]">Loading Live Radar</p>
                  <p className="text-[10px] font-mono text-app-text-dim">Connecting to satellite sensors...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </motion.div>
  );
}
