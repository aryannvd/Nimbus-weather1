import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface AtmosphereFXProps {
  key?: string;
  weatherCode: number;
  isDay: boolean;
  moonPhase: number;
  locationName: string;
  mainIconName?: string;
  localHour?: number;
  timezone?: string;
  gradientAnimation?: 'off' | 'on' | 'static';
  fetchedAt?: number;
}

const STATIC_STARS = [
  { top: '12%', left: '8%', size: '1.5px', delay: 0.1, duration: 4.5 },
  { top: '18%', left: '45%', size: '2px', delay: 1.2, duration: 5.2 },
  { top: '25%', left: '82%', size: '1px', delay: 0.5, duration: 3.8 },
  { top: '8%', left: '60%', size: '1.5px', delay: 2.1, duration: 6.1 },
  { top: '32%', left: '22%', size: '2px', delay: 1.8, duration: 4.9 },
  { top: '40%', left: '75%', size: '1.2px', delay: 3.0, duration: 5.5 },
  { top: '15%', left: '92%', size: '2px', delay: 0.7, duration: 4.2 },
  { top: '28%', left: '38%', size: '1px', delay: 2.5, duration: 3.5 },
  { top: '48%', left: '15%', size: '1.5px', delay: 0.3, duration: 5.8 },
  { top: '22%', left: '55%', size: '2px', delay: 1.5, duration: 4.7 },
  { top: '35%', left: '90%', size: '1.5px', delay: 0.9, duration: 5.1 },
  { top: '55%', left: '62%', size: '1.2px', delay: 2.7, duration: 4.3 },
  { top: '5%', left: '28%', size: '2px', delay: 3.2, duration: 5.0 },
  { top: '65%', left: '42%', size: '1px', delay: 1.1, duration: 3.9 },
  { top: '60%', left: '88%', size: '1.5px', delay: 1.9, duration: 5.4 },
  { top: '72%', left: '25%', size: '2px', delay: 2.3, duration: 4.8 },
  { top: '50%', left: '72%', size: '1px', delay: 0.8, duration: 3.7 },
  { top: '78%', left: '54%', size: '1.5px', delay: 1.4, duration: 5.6 },
  { top: '83%', left: '12%', size: '2px', delay: 2.8, duration: 4.1 },
  { top: '68%', left: '78%', size: '1.2px', delay: 0.2, duration: 5.9 },
  { top: '88%', left: '33%', size: '1.8px', delay: 3.5, duration: 4.6 },
  { top: '42%', left: '50%', size: '1px', delay: 1.7, duration: 3.6 },
  { top: '3%', left: '70%', size: '1.5px', delay: 2.4, duration: 5.3 },
  { top: '92%', left: '65%', size: '1.2px', delay: 0.6, duration: 4.4 },
];

export default function AtmosphereFX({ 
  weatherCode, 
  isDay, 
  moonPhase, 
  locationName,
  mainIconName,
  localHour,
  timezone,
  gradientAnimation = 'on',
  fetchedAt
}: AtmosphereFXProps) {
  const [gradientVisible, setGradientVisible] = useState(() => {
    return gradientAnimation === 'on' || gradientAnimation === 'static';
  });
  
  useEffect(() => {
    if (gradientAnimation === 'on') {
      setGradientVisible(true);
      const timer = setTimeout(() => {
        setGradientVisible(false);
      }, 6500); // 6-7 seconds active
      return () => {
        clearTimeout(timer);
      };
    } else if (gradientAnimation === 'off') {
      setGradientVisible(false);
    } else if (gradientAnimation === 'static') {
      setGradientVisible(true);
    }
  }, [locationName, weatherCode, gradientAnimation, fetchedAt, mainIconName]);

  const getConfig = () => {
    let icon = mainIconName || 'Sun';
    
    // Safety check: if it is night time (!isDay), map day-specific icons to night equivalents to prevent yellow/day gradients at night
    if (!isDay) {
      if (icon === 'Sun' || icon === 'SunDim' || icon === 'Sunrise' || icon === 'Sunset') {
        icon = 'Moon';
      } else if (icon === 'CloudSun') {
        icon = 'CloudMoon';
      } else if (icon === 'CloudSunRain') {
        icon = 'CloudMoonRain';
      }
    }
    
    // Calculate precise local hour and minute based on timezone prop if available
    const now = new Date();
    let hour = localHour !== undefined ? localHour : now.getHours();
    let minute = now.getMinutes();

    if (timezone) {
      try {
        const dateStr = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone === 'auto' ? undefined : timezone,
          hour: 'numeric',
          minute: 'numeric',
          hour12: false
        }).format(now);
        const parts = dateStr.split(':');
        if (parts.length === 2) {
          hour = parseInt(parts[0], 10) % 24;
          minute = parseInt(parts[1], 10);
        }
      } catch (e) {
        // Fallback to localHour
        if (localHour !== undefined) {
          hour = localHour;
        }
      }
    }

    const totalMinutes = hour * 60 + minute;
    // Morning time: sunrise to 8:30 AM (5:00 AM to 8:30 AM = 300 to 510 minutes)
    const isMorningTime = totalMinutes >= 300 && totalMinutes <= 510;
    // Evening/dawn time: 5:00 PM to 8:15 PM (17:00 to 1215 minutes)
    const isEveningTime = totalMinutes >= 1020 && totalMinutes <= 1215;

    // 1. Sun (☀️)
    if (icon === 'Sun' || icon === 'Sunrise' || icon === 'Sunset' || icon === 'SunDim') {
      if (isMorningTime) {
        // Morning time (sunrise - 8:30 am): Yellow morning gradients with reddish tint below
        return {
          id: 'morning',
          colors: ['rgba(244, 63, 94, 0.35)', 'rgba(249, 115, 22, 0.22)', 'rgba(251, 191, 36, 0.12)', 'rgba(0, 0, 0, 0)'],
          hasSunBeam: true,
          iconColor: 'from-amber-300 to-rose-400',
        };
      } else if (isEveningTime) {
        // Evening/dawn time (5pm - sunset): Yellow reddish and little purple tiny sunset
        return {
          id: 'evening',
          colors: ['rgba(112, 26, 117, 0.35)', 'rgba(190, 18, 60, 0.22)', 'rgba(251, 191, 36, 0.10)', 'rgba(0, 0, 0, 0)'],
          hasSunBeam: true,
          iconColor: 'from-orange-400 to-fuchsia-500',
        };
      } else if (totalMinutes < 300 || totalMinutes > 1215) {
        // Night fallback if sun icon is active during deep night (e.g., summer or high latitudes)
        return {
          id: 'night',
          colors: ['rgba(30, 58, 138, 0.25)', 'rgba(17, 24, 39, 0.12)', 'rgba(15, 23, 42, 0)'],
          hasStars: true,
          hasPassingStars: true,
          iconColor: 'from-blue-200 to-cyan-100',
        };
      } else {
        // Normal ☀️ in the noon (8:30 AM - 5:00 PM) - golden yellow gradient
        return {
          id: 'noon',
          colors: ['rgba(251, 191, 36, 0.35)', 'rgba(253, 224, 71, 0.18)', 'rgba(254, 240, 138, 0.05)'],
          hasSunBeam: true,
          iconColor: 'from-amber-400 to-yellow-300',
        };
      }
    }

    // 2. Moon (🌙)
    if (icon === 'Moon' || icon === 'MoonStar' || (!isDay && (icon === 'Sun' || icon === 'SunDim'))) {
      // dark blues night tint with stars glowing and 1-2 stars passing ☄️ downside at 45° with tail light in the end.
      return {
        id: 'night',
        colors: ['rgba(30, 58, 138, 0.32)', 'rgba(17, 24, 39, 0.20)', 'rgba(15, 23, 42, 0)'],
        hasStars: true,
        hasPassingStars: true,
        iconColor: 'from-blue-200 to-cyan-100',
      };
    }

    // 3. Clouds (☁️)
    if (icon === 'Cloud') {
      // whitish-Grey Gradient
      return {
        id: 'clouds',
        colors: ['rgba(248, 250, 252, 0.45)', 'rgba(148, 163, 184, 0.20)', 'rgba(100, 116, 139, 0.05)'],
        hasClouds: true,
        iconColor: 'from-slate-200 to-zinc-400',
      };
    }

    // 4. Snowflake / CloudSnow (🌨️)
    if (icon === 'Snowflake' || icon === 'CloudSnow') {
      // snow particles with pure white gradients
      return {
        id: 'snow',
        colors: ['rgba(255, 255, 255, 0.50)', 'rgba(241, 245, 249, 0.22)', 'rgba(203, 213, 225, 0.05)'],
        hasSnow: true,
        hasClouds: true,
        iconColor: 'from-cyan-100 to-white',
      };
    }

    // 5. CloudRain / CloudDrizzle / CloudRainWind (🌧️)
    if (icon === 'CloudRain' || icon === 'CloudRainWind' || icon === 'CloudDrizzle' || icon === 'CloudSunRain' || icon === 'CloudMoonRain') {
      // dark grey gradient
      return {
        id: 'rain',
        colors: ['rgba(71, 85, 105, 0.35)', 'rgba(30, 41, 59, 0.18)', 'rgba(15, 23, 42, 0)'],
        hasRain: true,
        hasMist: true,
        iconColor: 'from-blue-400 to-slate-500',
      };
    }

    // 6a. Overcast cloud with sun / CloudSun (🌥️)
    if (icon === 'CloudSun') {
      // dim yellow gradient
      return {
        id: 'partly-cloudy',
        colors: ['rgba(234, 179, 8, 0.30)', 'rgba(251, 191, 36, 0.15)', 'rgba(148, 163, 184, 0.05)'],
        hasClouds: true,
        iconColor: 'from-amber-400 to-slate-400',
      };
    }

    // 6b. Overcast cloud with moon / CloudMoon (🌥️ but moon)
    if (icon === 'CloudMoon') {
      // dark blue/cyan night-cloudy gradient (similar to the moon/cloud colors)
      return {
        id: 'night',
        colors: ['rgba(30, 58, 138, 0.25)', 'rgba(17, 24, 39, 0.12)', 'rgba(15, 23, 42, 0)'],
        hasClouds: true,
        hasStars: true,
        iconColor: 'from-blue-200 to-indigo-900',
      };
    }

    // 7. Thunderstorms (🌩️)
    if (icon === 'CloudLightning' || icon === 'Zap') {
      // thunderstorm effect with dark grey gradient
      return {
        id: 'thunderstorm',
        colors: ['rgba(47, 56, 75, 0.40)', 'rgba(30, 41, 59, 0.22)', 'rgba(15, 23, 42, 0)'],
        hasFlashes: true,
        hasClouds: true,
        iconColor: 'from-yellow-400 to-indigo-950',
      };
    }

    // 8. CloudFog / Fog (🌫️)
    if (icon === 'CloudFog' || icon === 'Fog') {
      // misty/foggy soft gray gradient similar to the gray fog icon colors
      return {
        id: 'clouds',
        colors: isDay
          ? ['rgba(226, 232, 240, 0.35)', 'rgba(203, 213, 225, 0.18)', 'rgba(100, 116, 139, 0.05)']
          : ['rgba(51, 65, 85, 0.25)', 'rgba(30, 41, 59, 0.12)', 'rgba(15, 23, 42, 0)'],
        hasClouds: true,
        hasMist: true,
        iconColor: 'from-slate-300 to-zinc-500',
      };
    }

    // Fallback using original weather code logic
    if (weatherCode >= 95) {
      return {
        id: 'thunderstorm',
        colors: ['rgba(30, 41, 59, 0.40)', 'rgba(71, 85, 105, 0.20)', 'rgba(15, 23, 42, 0)'],
        hasFlashes: true,
        iconColor: 'from-yellow-500 to-slate-700',
      };
    }
    
    return {
      id: 'default',
      colors: isDay 
        ? ['rgba(251, 191, 36, 0.30)', 'rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0)']
        : ['rgba(29, 78, 216, 0.22)', 'rgba(30, 27, 75, 0.08)', 'rgba(255, 255, 255, 0)'],
      iconColor: 'from-yellow-400 to-white',
    };
  };

  const config = getConfig();

  useEffect(() => {
    if (!config) return;
    const root = document.documentElement;
    
    root.style.setProperty('--weather-glow-color-1', config.colors[0]);
    root.style.setProperty('--weather-glow-color-2', config.colors[1] || config.colors[0]);
    root.style.setProperty('--weather-glow-color-3', config.colors[2] || config.colors[1] || config.colors[0]);
    
    let shadowColor = 'rgba(255, 255, 255, 0.15)';
    if (config.id === 'morning') shadowColor = 'rgba(244, 63, 94, 0.45)';
    else if (config.id === 'evening') shadowColor = 'rgba(112, 26, 117, 0.45)';
    else if (config.id === 'noon') shadowColor = 'rgba(251, 191, 36, 0.5)';
    else if (config.id === 'night') shadowColor = 'rgba(59, 130, 246, 0.35)';
    else if (config.id === 'clouds') shadowColor = 'rgba(241, 245, 249, 0.35)';
    else if (config.id === 'snow') shadowColor = 'rgba(255, 255, 255, 0.6)';
    else if (config.id === 'rain') shadowColor = 'rgba(71, 85, 105, 0.35)';
    else if (config.id === 'partly-cloudy') shadowColor = 'rgba(234, 179, 8, 0.4)';
    else if (config.id === 'thunderstorm') shadowColor = 'rgba(234, 179, 8, 0.55)';
    root.style.setProperty('--weather-glow-color', shadowColor);
  }, [config]);

  const bgGradient = (() => {
    if (!config) return 'radial-gradient(ellipse 120% 90% at 50% 0%, rgba(0,0,0,0.9) 0%, #000000 100%)';
    if (config.id === 'morning') {
      return 'radial-gradient(ellipse 120% 90% at 50% 0%, rgba(244, 63, 94, 0.38) 0%, rgba(249, 115, 22, 0.25) 45%, rgba(251, 191, 36, 0.18) 75%, rgba(0, 0, 0, 0) 100%)';
    } else if (config.id === 'evening') {
      return 'radial-gradient(ellipse 120% 90% at 50% 0%, rgba(112, 26, 117, 0.38) 0%, rgba(190, 18, 60, 0.25) 50%, rgba(251, 191, 36, 0.12) 75%, rgba(0, 0, 0, 0) 100%)';
    } else if (config.id === 'noon') {
      return 'radial-gradient(ellipse 120% 90% at 50% 0%, rgba(251, 191, 36, 0.32) 0%, rgba(253, 224, 71, 0.14) 55%, rgba(0, 0, 0, 0) 100%)';
    } else if (config.id === 'night') {
      return 'radial-gradient(ellipse 120% 90% at 50% 0%, rgba(30, 58, 138, 0.25) 0%, rgba(17, 24, 39, 0.12) 55%, rgba(0, 0, 0, 0) 100%)';
    } else if (config.id === 'clouds') {
      return 'radial-gradient(ellipse 120% 90% at 50% 0%, rgba(148, 163, 184, 0.25) 0%, rgba(71, 85, 105, 0.10) 55%, rgba(0, 0, 0, 0) 100%)';
    } else if (config.id === 'snow') {
      return 'radial-gradient(ellipse 120% 90% at 50% 0%, rgba(255, 255, 255, 0.28) 0%, rgba(241, 245, 249, 0.12) 55%, rgba(0, 0, 0, 0) 100%)';
    } else if (config.id === 'rain') {
      return 'radial-gradient(ellipse 120% 90% at 50% 0%, rgba(71, 85, 105, 0.25) 0%, rgba(30, 41, 59, 0.10) 55%, rgba(0, 0, 0, 0) 100%)';
    } else if (config.id === 'partly-cloudy') {
      return 'radial-gradient(ellipse 120% 90% at 50% 0%, rgba(234, 179, 8, 0.22) 0%, rgba(251, 191, 36, 0.10) 55%, rgba(0, 0, 0, 0) 100%)';
    } else if (config.id === 'thunderstorm') {
      return 'radial-gradient(ellipse 120% 90% at 50% 0%, rgba(51, 65, 85, 0.28) 0%, rgba(30, 41, 59, 0.12) 55%, rgba(0, 0, 0, 0) 100%)';
    }
    return isDay
      ? 'radial-gradient(ellipse 120% 90% at 50% 0%, rgba(251, 191, 36, 0.18) 0%, rgba(255, 255, 255, 0) 100%)'
      : 'radial-gradient(ellipse 120% 90% at 50% 0%, rgba(29, 78, 216, 0.15) 0%, rgba(30, 27, 75, 0) 100%)';
  })();

  const showParticles = gradientAnimation !== 'off';

  if (gradientAnimation === 'off') {
    return null;
  }

  const glowOpacity = gradientAnimation === 'static' ? 1 : (gradientVisible ? 1 : 0);

  return (
    <AnimatePresence>
      {locationName && config && (
        <React.Fragment key={`${locationName}-${weatherCode}-${fetchedAt ?? 0}`}>
          {/* Main Overlay with Glow/Effects (limit to top half using a smooth semi-circular elliptical mask) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed top-0 left-0 right-0 z-0 h-[340px] pointer-events-none overflow-hidden gpu"
            style={{ 
              maskImage: 'radial-gradient(ellipse 120% 100% at 50% 0%, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 25%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.15) 85%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 120% 100% at 50% 0%, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 25%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.15) 85%, rgba(0,0,0,0) 100%)'
            }}
          >
            {/* Ambient Background Gradient + Glows (Smooth Transition based on setting options) */}
            <motion.div
              animate={{ opacity: glowOpacity }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
              className="absolute inset-0 pointer-events-none"
            >
              {/* Actual Background Gradient */}
              <div 
                className="absolute inset-0" 
                style={{ background: bgGradient }} 
              />

              {/* Depth Layer 1: Massive Ambient Base Glow */}
              <motion.div
                style={{
                  background: `radial-gradient(circle at center, ${config.colors[1] || config.colors[0]}, transparent 80%)`
                }}
                initial={{ scale: 1.4, opacity: 0 }}
                animate={{ 
                  scale: 1.8, 
                  opacity: [0, 0.5, 0.5, 0],
                }}
                transition={{ 
                  duration: 10, 
                  ease: "easeInOut",
                  times: [0, 0.2, 0.8, 1],
                  repeat: Infinity
                }}
                className="absolute top-[-40%] left-1/2 -translate-x-1/2 w-[220%] aspect-square rounded-full blur-[140px]"
              />

              {/* Depth Layer 2: Focused Core Atmosphere Animation */}
              <motion.div
                style={{
                  background: `radial-gradient(circle at center, ${config.colors[0]}, transparent 70%)`
                }}
                initial={{ scale: 1.0, opacity: 0, y: 0 }}
                animate={{ 
                  scale: 1.3, 
                  opacity: [0, 0.8, 0.8, 0],
                  y: [0, -15] 
                }}
                transition={{ 
                  duration: 8, 
                  ease: "easeInOut",
                  times: [0, 0.2, 0.8, 1],
                  delay: 0.5,
                  repeat: Infinity
                }}
                className="absolute top-[-50%] left-1/2 -translate-x-1/2 w-[180%] aspect-square rounded-full blur-[100px]"
              />

              {/* Atmospheric Mist/Glow Pulses */}
              {(config.hasClouds || config.hasMist) && (
                <div className="absolute inset-0">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <motion.div
                      key={`glow-${i}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ 
                        opacity: [0, 0.25, 0],
                        scale: [1, 1.3, 1]
                      }}
                      transition={{ 
                        duration: 8 + i * 4, 
                        ease: "easeInOut",
                        repeat: Infinity,
                        delay: i * 2
                      }}
                      className="absolute inset-0 bg-app-text/5 blur-[120px] rounded-full"
                      style={{ top: `${10 + i * 20}%` }}
                    />
                  ))}
                </div>
              )}
            </motion.div>

            {/* Loopable Particles - Visible when not Off, even when glows are deactivated */}
            {showParticles && (
              <>
                {/* Realistic Lightning Flashes */}
                {config.hasFlashes && (
                  <div className="absolute inset-0">
                    <motion.div
                      animate={{ 
                        opacity: [0, 0.4, 0, 0.3, 0],
                        scale: [1, 1.1, 1, 1.05, 1],
                      }}
                      transition={{ 
                        duration: 0.5, 
                        delay: 2.5,
                        repeat: Infinity,
                        repeatDelay: 3.5
                      }}
                      className="absolute inset-x-0 top-0 h-full bg-app-text/10 blur-[140px]"
                    />
                  </div>
                )}

                {/* Snow Particles */}
                {config.hasSnow && (
                  <div className="absolute inset-0 snow-container particles">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <motion.div
                        key={`snow-${i}`}
                        initial={{ 
                          y: -20, 
                          x: 0,
                          opacity: 0,
                          scale: 0.5 + Math.random() * 0.5
                        }}
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: 0,
                        }}
                        animate={{ 
                          y: 340,
                          x: (Math.random() - 0.5) * 60,
                          opacity: [0, 0.8, 0.8, 0],
                        }}
                        transition={{ 
                          duration: 5 + Math.random() * 5, 
                          repeat: Infinity,
                          delay: Math.random() * 12,
                          ease: "linear"
                        }}
                        className="absolute w-1.5 h-1.5 bg-white rounded-full blur-[1px] particle"
                      />
                    ))}
                  </div>
                )}

                {/* Ethereal Stars */}
                {config.hasStars && (
                  <div className="absolute inset-0 opacity-40 particles">
                    {STATIC_STARS.map((star, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ 
                          opacity: [0, 0.4, 0.8, 0.4, 0],
                          scale: [0.8, 1, 1.2, 1, 0.8]
                        }}
                        transition={{ 
                          duration: star.duration, 
                          delay: star.delay,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="absolute bg-white rounded-full particle"
                        style={{
                          top: star.top,
                          left: star.left,
                          width: star.size,
                          height: star.size,
                          boxShadow: '0 0 4px 1px rgba(255, 255, 255, 0.3)'
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>

          {/* Unmasked Animation Layer (e.g. Shooting Stars sliding across the entire screen) */}
          {showParticles && config.hasPassingStars && (
            <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes shootingStar {
                  0% {
                    transform: translate3d(0, 0, 0) rotate(145deg);
                    opacity: 0;
                  }
                  29.9% {
                    transform: translate3d(0, 0, 0) rotate(145deg);
                    opacity: 0;
                  }
                  30% {
                    transform: translate3d(0, 0, 0) rotate(145deg);
                    opacity: 0.1;
                  }
                  31% {
                    opacity: 1;
                  }
                  37% {
                    opacity: 1;
                  }
                  38% {
                    transform: translate3d(-130vw, 50vh, 0) rotate(145deg);
                    opacity: 0;
                  }
                  100% {
                    transform: translate3d(-130vw, 50vh, 0) rotate(145deg);
                    opacity: 0;
                  }
                }
              `}} />
              {/* Shooting Star */}
              <div
                className="absolute weather-fx"
                style={{
                  left: '105%',
                  top: '-10%',
                  width: '140px',
                  height: '20px',
                  transformOrigin: "right center",
                  animation: "shootingStar 10s linear infinite"
                }}
              >
                <svg width="140" height="20" viewBox="0 0 140 20" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="starGrad" x1="0" y1="10" x2="135" y2="10" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0"/>
                      <stop offset="80%" stopColor="#22d3ee" stopOpacity="0.45"/>
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="1"/>
                    </linearGradient>
                    <filter id="starGlow" x="-25%" y="-25%" width="150%" height="150%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <g filter="url(#starGlow)">
                    {/* Thin, tapered tail flaring out to the head */}
                    <path d="M 0 10 L 135 8 L 135 12 Z" fill="url(#starGrad)" />
                    {/* Circular gleaming head */}
                    <circle cx="135" cy="10" r="3" fill="#ffffff" />
                  </g>
                </svg>
              </div>
            </div>
          )}
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}
