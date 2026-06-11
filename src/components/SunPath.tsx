import React, { useEffect } from 'react';
import { motion, useInView, animate, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { WeatherData, Settings } from '../types';
import { WeatherIcon, RawIcons } from './WeatherIcons';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { cn } from '../lib/utils';
import { Haptic } from '../lib/haptics';

interface SunPathProps {
  weather: WeatherData;
  settings: Settings;
}

const width = 350;
const height = 150; 
const horizonY = 90;
const curveHeight = 60; 
const startX = 60;
const endX = 290;
const centerX = (startX + endX) / 2;
const daylightControlY = horizonY - (2 * curveHeight);

const SunriseIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.8" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={cn("text-amber-400", className)}
  >
    <path d="M2 21h20" />
    <path d="M10 7a5 5 0 0 0 5 5 5 5 0 1 1-5-5Z" />
    <path d="M18 12V4" />
    <path d="m15 7 3-3 3 3" />
  </svg>
);

const SunsetIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.8" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={cn("text-amber-400/90", className)}
  >
    <path d="M2 21h20" />
    <path d="M10 7a5 5 0 0 0 5 5 5 5 0 1 1-5-5Z" />
    <path d="M18 4v8" />
    <path d="m15 9 3 3 3-3" />
  </svg>
);

export default function SunPath({ weather, settings }: SunPathProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.1 });
  
  // Local state to force re-renders for real-time sun movement
  const [, setTick] = React.useState(0);
  
  // Motion setup for smooth, path-aligned animation
  const motionProgress = useMotionValue(0);

  // HUD dynamic information overlay state
  const [showHUD, setShowHUD] = React.useState(false);
  const hudTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => {
      clearInterval(interval);
      if (hudTimeoutRef.current) {
        clearTimeout(hudTimeoutRef.current);
      }
    };
  }, []);

  const iconX = useTransform(motionProgress, (v) => 
    Math.pow(1 - v, 2) * startX + 2 * (1 - v) * v * centerX + Math.pow(v, 2) * endX
  );
  const iconY = useTransform(motionProgress, (v) => 
    Math.pow(1 - v, 2) * horizonY + 2 * (1 - v) * v * daylightControlY + Math.pow(v, 2) * horizonY
  );

  // BUG 1 FIX: Calculate current time in the target location's timezone
  const getNowInLocation = (timezone: string) => {
    try {
      const now = new Date();
      const resolvedTZ = timezone === 'auto' ? undefined : timezone;
      // Use toLocaleString to get the time in the target timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: resolvedTZ,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      });
      
      const parts = formatter.formatToParts(now);
      const partValues: Record<string, any> = {};
      parts.forEach(p => partValues[p.type] = p.value);
      
      const yr = parseInt(partValues.year);
      const mo = parseInt(partValues.month);
      const dy = parseInt(partValues.day);
      const hr = parseInt(partValues.hour);
      const mn = parseInt(partValues.minute);
      const sc = parseInt(partValues.second) || 0;
      
      if (isNaN(yr) || isNaN(mo) || isNaN(dy) || isNaN(hr) || isNaN(mn)) {
        throw new Error('Invalid date components');
      }
      // Construct a Date object that represents the local time in that city
      return new Date(yr, mo - 1, dy, hr, mn, sc);
    } catch (e) {
      console.warn('Timezone conversion failed, falling back to naive:', e);
      return new Date();
    }
  };

  const nowInLocation = getNowInLocation(weather?.timezone || "UTC");
  const currentHour = nowInLocation.getHours();
  const currentMinute = nowInLocation.getMinutes();
  const nowMinutes = currentHour * 60 + currentMinute;

  // Helper to get minutes from H:M format
  const getMinutesFromISO = (iso: string) => {
    if (!iso) return null;
    // Open-Meteo with timezone=auto returns "YYYY-MM-DDTHH:MM"
    const timePart = iso.split('T')[1] || iso;
    if (!timePart || !timePart.includes(':')) return null;
    const [h, m] = timePart.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Display formatting for labels using the target timezone
  const formatTime = (iso: string) => {
    if (!iso) return "";
    try {
      const date = parseISO(iso.includes('Z') ? iso : `${iso}:00Z`);
      const is24h = settings.timeFormat === '24h';
      return date.toLocaleTimeString("en-US", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        hour12: !is24h,
        ...(is24h ? { hourCycle: 'h23' } : {})
      });
    } catch {
      return iso;
    }
  };

  const sunriseMinutes = getMinutesFromISO(weather?.daily?.sunrise?.[0] || "") || 360;
  const sunsetMinutes = getMinutesFromISO(weather?.daily?.sunset?.[0] || "") || 1080;
  const moonriseMinutes = getMinutesFromISO(weather?.daily?.moonrise?.[0] || "");
  const moonsetMinutes = getMinutesFromISO(weather?.daily?.moonset?.[0] || "");
  
  // Determine if it is Day or Night for the cycle
  const isNight = nowMinutes < sunriseMinutes || nowMinutes > sunsetMinutes;

  // Calculate active span for the current path (Day or Night)
  let activeStartMinutes: number;
  let activeEndMinutes: number;
  let cycleProgress: number;
  let cycleLabelStart: string;
  let cycleLabelEnd: string;
  let cycleStartName: string;
  let cycleEndName: string;

  if (!isNight) {
    // Day Cycle: Sunrise to Sunset
    activeStartMinutes = sunriseMinutes;
    activeEndMinutes = sunsetMinutes;
    cycleLabelStart = formatTime(weather?.daily?.sunrise?.[0] || "2026-05-19T06:00");
    cycleLabelEnd = formatTime(weather?.daily?.sunset?.[0] || "2026-05-19T18:00");
    cycleStartName = "Sunrise";
    cycleEndName = "Sunset";
  } else {
    // Night Cycle: Prefer actual Moonrise->Moonset if available, 
    // but fallback to a pure "Night" cycle (Sunset -> Sunrise next day) if moon data is missing
    if (moonriseMinutes !== null && moonsetMinutes !== null && moonriseMinutes !== moonsetMinutes) {
      activeStartMinutes = moonriseMinutes;
      activeEndMinutes = moonsetMinutes;
      cycleLabelStart = formatTime(weather?.daily?.moonrise?.[0] || "");
      cycleLabelEnd = formatTime(weather?.daily?.moonset?.[0] || "");
      cycleStartName = "Moonrise";
      cycleEndName = "Moonset";
    } else {
      // Fallback: Night is from Sunset to next Sunrise
      if (nowMinutes >= sunsetMinutes) {
        activeStartMinutes = sunsetMinutes;
        const tomorrowSunrise = getMinutesFromISO(weather?.daily?.sunrise?.[1] || "");
        activeEndMinutes = (tomorrowSunrise !== null) ? (tomorrowSunrise + 1440) : (sunriseMinutes + 1440);
        cycleLabelStart = formatTime(weather?.daily?.sunset?.[0] || "2026-05-19T18:00");
        cycleLabelEnd = weather?.daily?.sunrise?.[1] ? formatTime(weather.daily.sunrise[1]) : formatTime(weather?.daily?.sunrise?.[0] || "2026-05-19T06:00");
      } else {
        // After Midnight, before Sunrise
        activeStartMinutes = sunsetMinutes - 1440;
        activeEndMinutes = sunriseMinutes;
        cycleLabelStart = formatTime(weather?.daily?.sunset?.[0] || "2026-05-19T18:00");
        cycleLabelEnd = formatTime(weather?.daily?.sunrise?.[0] || "2026-05-19T06:00");
      }
      cycleStartName = "Sunset";
      cycleEndName = "Sunrise";
    }

    if (activeStartMinutes > activeEndMinutes) {
      if (nowMinutes >= activeStartMinutes) {
        activeEndMinutes += 1440;
      } else {
        activeStartMinutes -= 1440;
      }
    }
  }

  const cycleDuration = activeEndMinutes - activeStartMinutes;
  const cycleElapsed = nowMinutes - activeStartMinutes;
  
  cycleProgress = Math.max(0, Math.min(1, cycleElapsed / cycleDuration));
  const isIconVisible = cycleProgress > 0 && cycleProgress < 1;

  // Calculate crisp and precise Daylight and Nightlight durations
  const daylightDurationMins = Math.max(0, sunsetMinutes - sunriseMinutes);
  const daylightHours = Math.floor(daylightDurationMins / 60);
  const daylightMins = Math.round(daylightDurationMins % 60);
  const daylightDurationStr = `${daylightHours}h ${daylightMins}m`;

  const tomorrowSunriseMinutes = getMinutesFromISO(weather?.daily?.sunrise?.[1] || "") || sunriseMinutes;
  const nightDurationMins = Math.max(0, (tomorrowSunriseMinutes + 1440) - sunsetMinutes);
  const nightHours = Math.floor(nightDurationMins / 60);
  const nightMins = Math.round(nightDurationMins % 60);
  const nightDurationStr = `${nightHours}h ${nightMins}m`;

  const [isPressed, setIsPressed] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const hasAnimatedInRef = React.useRef(false);

  // Stats for the live counting capsule
  const [hudHours, setHudHours] = React.useState(0);
  const [hudMins, setHudMins] = React.useState(0);

  // Dynamic count-in animation for HUD duration capsule
  useEffect(() => {
    if (showHUD) {
      const targetHours = isNight ? nightHours : daylightHours;
      const targetMins = isNight ? nightMins : daylightMins;

      // Snappy and direct digit count-in animation
      const animH = animate(0, targetHours, {
        duration: 0.5,
        ease: "easeOut",
        onUpdate: (latest) => setHudHours(Math.round(latest))
      });

      const animM = animate(0, targetMins, {
        duration: 0.65,
        ease: "easeOut",
        onUpdate: (latest) => setHudMins(Math.round(latest))
      });

      return () => {
        animH.stop();
        animM.stop();
      };
    } else {
      setHudHours(0);
      setHudMins(0);
    }
  }, [showHUD, isNight, nightHours, daylightHours, nightMins, daylightMins]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    
    // Release pointer capture to prevent pointer lock/stuck-state issues on touch devices
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    
    setIsPressed(true);
    
    // Trigger medium haptic feedback
    Haptic.medium(settings.hapticEnabled);
    
    // Toggle HUD display and keep it open during hold
    setShowHUD(true);
    if (hudTimeoutRef.current) {
      clearTimeout(hudTimeoutRef.current);
      hudTimeoutRef.current = null;
    }

    // Animate path length fully to 1.0 (draw in from wherever it currently is)
    animate(motionProgress, 1.0, {
      duration: 0.6,
      ease: [0.25, 1, 0.5, 1]
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!isPressed) return;
    setIsPressed(false);
    
    // Trigger subtle release haptic feedback
    Haptic.light(settings.hapticEnabled);

    // Animate path length back to current cycle progress
    animate(motionProgress, cycleProgress, {
      duration: 0.6,
      ease: [0.25, 1, 0.5, 1]
    });

    // Auto-dismiss HUD after 3 seconds on release
    if (hudTimeoutRef.current) {
      clearTimeout(hudTimeoutRef.current);
    }
    hudTimeoutRef.current = setTimeout(() => {
      setShowHUD(false);
    }, 3000);
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    setIsHovered(false);
    if (isPressed) {
      handlePointerUp(e);
    }
  };

  const handlePointerEnter = () => {
    setIsHovered(true);
  };

  const troughHeight = curveHeight * 0.4;

  const daylightArch = `M ${startX} ${horizonY} Q ${centerX} ${daylightControlY} ${endX} ${horizonY}`;
  const leftTrough = `M 10 ${horizonY + troughHeight} Q 35 ${horizonY + troughHeight} ${startX} ${horizonY}`;
  const rightTrough = `M ${endX} ${horizonY} Q ${width - 35} ${horizonY + troughHeight} ${width - 10} ${horizonY + troughHeight}`;

  useEffect(() => {
    if (isInView && !hasAnimatedInRef.current) {
      hasAnimatedInRef.current = true;
      animate(motionProgress, cycleProgress, { 
        duration: 2.5, 
        ease: [0.34, 1.56, 0.64, 1] 
      });
    }
  }, [isInView, cycleProgress, motionProgress]);

  return (
    <div ref={containerRef} className="w-full px-2 mt-8 mb-4 overflow-hidden relative">
      {/* Dynamic HUD popup inside the negative space under/around the arc */}
      <AnimatePresence>
        {showHUD && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15, x: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, scale: 0.85, y: 10, x: "-50%" }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className="absolute top-[62px] left-1/2 bg-black/95 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5 pointer-events-none select-none z-10 shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
          >
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isNight ? "bg-blue-400" : "bg-amber-400")} />
            <span className="text-[11px] font-semibold text-white tracking-tight">
              {isNight ? `Night: ${hudHours}h ${hudMins}m` : `Daylight: ${hudHours}h ${hudMins}m`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative w-full h-[150px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible translate-x-0">
          <defs>
            {/* Day Gradient */}
            <linearGradient id="sunDayGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9C27B0" /> 
              <stop offset="15%" stopColor="#FF3D00" />
              <stop offset="35%" stopColor="#FFD600" />
              <stop offset="50%" stopColor="#FFFFFF" />
              <stop offset="65%" stopColor="#FFD600" />
              <stop offset="85%" stopColor="#FF3D00" />
              <stop offset="100%" stopColor="#9C27B0" />
            </linearGradient>

            {/* Moon Gradient */}
            <linearGradient id="moonNightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2D3B4E" /> 
              <stop offset="25%" stopColor="#B3E5FC" />
              <stop offset="50%" stopColor="#FFFFFF" />
              <stop offset="75%" stopColor="#B3E5FC" />
              <stop offset="100%" stopColor="#2D3B4E" />
            </linearGradient>

            {/* Day Glow Filter (Golden Amber glow, unclipped bounds) */}
            <filter id="sunGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Moon Glow Filter (Lunar Ice Blue glow, unclipped bounds) */}
            <filter id="moonGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <clipPath id="horizonClip">
              <rect x="-50" y="-50" width={width + 100} height={horizonY + 50} />
            </clipPath>

            <mask id="iconGap" maskUnits="userSpaceOnUse">
              <rect x="-50" y="-50" width={width + 100} height={height + 100} fill="white" />
              <motion.circle 
                cx={iconX}
                cy={iconY}
                animate={{ r: (isIconVisible && !isPressed) ? 18 : 0 }}
                transition={
                  isPressed 
                    ? { duration: 0.08 } 
                    : { delay: 0.55, duration: 0.2 }
                }
                fill="black" 
              />
            </mask>
          </defs>

          {/* Horizon Line */}
          <line 
            x1="0" y1={horizonY} x2={width} y2={horizonY} 
            stroke="var(--border-color)" 
            strokeWidth="1" 
            opacity="0.5"
          />

          {/* Troughs */}
          <path d={leftTrough} fill="none" stroke="var(--border-color)" strokeWidth="4.5" strokeLinecap="round" opacity="0.3" />
          <path d={rightTrough} fill="none" stroke="var(--border-color)" strokeWidth="4.5" strokeLinecap="round" opacity="0.3" />

          {/* Elements ABOVE horizon */}
          <g clipPath="url(#horizonClip)">
            <motion.g
              className="cursor-pointer"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              onPointerEnter={handlePointerEnter}
              onPointerCancel={handlePointerUp}
              whileHover="hover"
              whileTap="tap"
              initial="initial"
              animate="initial"
              style={{ touchAction: "none" }}
            >
              {/* Thicker, invisible path overlay to dramatically increase hover/tap target area */}
              <path 
                d={daylightArch}
                fill="none" 
                stroke="transparent" 
                strokeWidth="24" 
                className="cursor-pointer"
              />

              <g mask="url(#iconGap)">
                {/* Future Path */}
                <motion.path 
                  d={daylightArch}
                  fill="none" 
                  stroke="white" 
                  strokeWidth="4" 
                  strokeLinecap="round"
                  variants={{
                    initial: { strokeOpacity: 0.1, strokeWidth: 4 },
                    hover: { strokeOpacity: 0.22, strokeWidth: 5 },
                    tap: { strokeOpacity: 0.28, strokeWidth: 5 }
                  }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />

                {/* Glow Backing Path (Smooth, hardware-accelerated fade-out) */}
                <motion.path 
                  d={daylightArch}
                  fill="none" 
                  stroke={isNight ? "#B3E5FC" : "#FFD600"} 
                  strokeWidth="7" 
                  strokeLinecap="round"
                  filter={isNight ? "url(#moonGlowFilter)" : "url(#sunGlowFilter)"}
                  style={{ pathLength: motionProgress }}
                  animate={{
                    opacity: isPressed ? 1.0 : (isHovered ? 0.65 : 0),
                    strokeWidth: isPressed ? 8.5 : (isHovered ? 7.5 : 6)
                  }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />

                {/* Active Path */}
                <motion.path 
                  d={daylightArch}
                  fill="none" 
                  stroke={isNight ? "url(#moonNightGradient)" : "url(#sunDayGradient)"} 
                  strokeWidth="5.5" 
                  strokeLinecap="round"
                  style={{ pathLength: motionProgress }}
                  animate={{
                    strokeWidth: isPressed ? 7 : (isHovered ? 6.5 : 5.5)
                  }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </g>
            </motion.g>

            {/* Current Cycle Icon */}
            <motion.g
              style={{ x: iconX, y: iconY, originX: 0.5, originY: 0.5 }}
              initial={{ opacity: 0, scale: 0, rotate: -180 }}
              animate={{
                opacity: (isInView && isIconVisible && !isPressed) ? 1 : 0,
                scale: (isInView && isIconVisible && !isPressed) ? 1 : 0,
                rotate: isPressed ? -180 : 0
              }}
              transition={
                isPressed
                  ? { duration: 0.08, ease: "easeIn" }
                  : { delay: 0.55, duration: 0.2, ease: "easeOut" }
              }
            >
              <foreignObject x="-14" y="-14" width="28" height="28">
                <div className="flex items-center justify-center w-full h-full">
                  {isNight ? (
                    <WeatherIcon 
                      name="Moon" 
                      className="w-7 h-7" 
                      style="coloured"
                      strokeWidth={1.8}
                      forceColoured={true}
                    />
                  ) : (
                    <WeatherIcon 
                      name="Sun" 
                      forceColoured={true} 
                      className="w-7 h-7" 
                      strokeWidth={2}
                    />
                  )}
                </div>
              </foreignObject>
            </motion.g>
          </g>

          {/* Labels */}
          <foreignObject x="-25" y={horizonY + 30} width="105" height="24">
            <div className="flex items-center justify-end gap-1.5 text-app-text font-bold text-[13px] tracking-tight h-full select-none whitespace-nowrap">
              <span>{cycleLabelStart}</span>
            </div>
          </foreignObject>

          <foreignObject x={endX - 15} y={horizonY + 30} width="105" height="24">
            <div className="flex items-center justify-start gap-1.5 text-app-text font-bold text-[13px] tracking-tight h-full select-none whitespace-nowrap">
              <span>{cycleLabelEnd}</span>
            </div>
          </foreignObject>
        </svg>
      </div>

      {/* Daylight Duration labeled directly below the sunrise/sunset values in the tile */}
      <div className="flex flex-col items-center justify-center mt-2.5 mb-1.5 select-none animate-fadeIn">
        <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-app-text-dim text-white/45">
          Daylight Duration
        </span>
        <span className="text-[16px] font-light tracking-tight text-white mt-0.5">
          {daylightDurationStr}
        </span>
      </div>
    </div>
  );
}
