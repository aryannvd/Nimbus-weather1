import React, { useState, useEffect } from 'react';
import { convertTemp, formatTemp, formatWind, formatVisibility, formatPrecipitation } from '../lib/units';
import { motion, AnimatePresence } from 'motion/react';
import { Icons, WeatherIcon } from './WeatherIcons';
import { Settings, WeatherData, Location } from '../types';
import { cn, GLASS_STYLE_SUBTLE } from '../lib/utils';
import { Haptic } from '../lib/haptics';
import { 
  initializeOneSignal, 
  requestNotificationPermission, 
  syncUserSettingsToFirebase, 
  fetchUserSettingsFromFirebase,
  wirePushToggle,
  wireMorningToggle,
  wireNightToggle,
  wireThresholdToggle,
  applyNotifToggleStates
} from '../services/oneSignalService';
import { Package, Cloud, FileText, Shield, ArrowUpRight, Info } from 'lucide-react';

interface SettingsScreenProps {
  settings: Settings;
  onUpdate: (settings: Settings) => void;
  onClose: () => void;
  activeWeather?: WeatherData;
  activeLocation?: Location;
  panelStackRef: React.MutableRefObject<(() => void)[]>;
  handleBack: () => void;
  pushPanel: (closeFn: () => void, name: string) => void;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h3 className="text-[11px] font-medium tracking-[0.1em] text-app-text-dim uppercase mb-3 px-1">{title}</h3>
    <div className={cn("overflow-hidden divide-y divide-app-border", "bg-app-surface backdrop-blur-3xl border border-app-border rounded-[32px]")}>
      {children}
    </div>
  </div>
);

const ToggleRow = ({ label, description, value, onToggle, hapticEnabled }: { label: string; description?: string; value: boolean; onToggle: () => void; hapticEnabled: boolean }) => (
  <div className="p-5 flex items-center justify-between">
    <div className="flex-1 pr-4">
      <p className="text-[16px] font-medium text-app-text tracking-tight">{label}</p>
      {description && <p className="text-[13px] text-app-text-dim mt-0.5 leading-tight opacity-70">{description}</p>}
    </div>
    <button 
      type="button"
      onClick={() => {
        Haptic.medium(hapticEnabled);
        onToggle();
      }}
      className={cn(
        "toggle w-[51px] h-[31px] rounded-full transition-all duration-300 relative focus:outline-none focus:ring-0",
        value ? "bg-[#34C759]" : "bg-app-text/10 outline-1 outline-app-border"
      )}
    >
      <div 
        className={cn(
          "absolute top-[2px] left-[2.5px] w-[27px] h-[27px] rounded-full bg-white shadow-md transition-transform duration-250 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-transform",
          value ? "translate-x-[19px]" : "translate-x-0"
        )} 
      />
    </button>
  </div>
);

const SegmentedControl = ({ value, options, onChange, hapticEnabled, layoutId }: { value: string; options: { label: string; value: string }[], onChange: (val: any) => void; hapticEnabled: boolean; layoutId: string }) => (
  <div className="flex p-1 bg-app-text/[0.04] rounded-[14px] w-full relative">
    {options.map((opt) => {
      const isSelected = value === opt.value;
      return (
        <button
          key={opt.value}
          onClick={() => {
            if (!isSelected) {
              Haptic.light(hapticEnabled);
              onChange(opt.value);
            }
          }}
          className={cn(
            "flex-1 py-1.5 text-[13px] font-semibold rounded-[10px] transition-colors duration-200 relative z-10",
            isSelected ? "text-app-text" : "text-app-text-dim hover:text-app-text/70"
          )}
        >
          {opt.label}
          {isSelected && (
            <motion.div
              layoutId={layoutId}
              className="absolute inset-0 bg-app-surface rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-app-border -z-10 will-change-transform"
              transition={{ 
                type: "spring", 
                bounce: 0.15, 
                duration: 0.35,
                stiffness: 400,
                damping: 30
              }}
            />
          )}
        </button>
      );
    })}
  </div>
);

const SelectRow = ({ label, value, options, onChange, hapticEnabled }: { label: string; value: string; options: { label: string; value: string }[], onChange: (val: any) => void; hapticEnabled: boolean }) => (
  <div className="px-5 py-4 flex flex-col gap-2.5">
    <div className="flex items-center justify-between px-0.5">
      <p className="text-[13px] font-semibold text-app-text tracking-tight">{label}</p>
      <p className="text-[12px] font-medium text-app-text-dim opacity-50 uppercase tracking-widest">{value}</p>
    </div>
    <SegmentedControl 
      value={value} 
      options={options} 
      onChange={onChange} 
      hapticEnabled={hapticEnabled} 
      layoutId={`segment-${label.toLowerCase().replace(/\s+/g, '-')}`}
    />
  </div>
);

const LinkRow = ({ label, value, onClick, hapticEnabled }: { label: string; value?: string; onClick?: () => void; hapticEnabled?: boolean }) => (
  <button 
    onClick={() => {
      if (hapticEnabled !== undefined) Haptic.medium(hapticEnabled);
      onClick?.();
    }} 
    className="w-full p-4 flex items-center justify-between text-left active:bg-app-text/5 transition-colors"
  >
    <p className="text-[15px] text-app-text">{label}</p>
    <div className="flex items-center gap-2">
      {value && <p className="text-[14px] text-app-text-dim">{value}</p>}
      <Icons.ChevronRight className="w-4 h-4 text-app-text-dim/20" />
    </div>
  </button>
);

const NumberInput = ({ 
  value, 
  onChange, 
  min = 0, 
  max = 100,
  hapticEnabled
}: { 
  value: number; 
  onChange: (val: number) => void; 
  min?: number; 
  max?: number; 
  hapticEnabled: boolean;
}) => (
  <div className="flex items-center gap-4 py-1">
    <div className="flex-1 relative">
      <input 
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const val = parseInt(e.target.value);
          if (!isNaN(val)) {
            Haptic.light(hapticEnabled);
            onChange(Math.max(min, Math.min(max, val)));
          }
        }}
        className="w-full bg-app-text/5 border border-app-border rounded-xl px-4 py-3 text-[17px] font-bold text-app-text outline-none focus:border-blue-500/50 transition-colors tabular-nums"
      />
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none opacity-30">
        <span className="text-[12px] font-black uppercase tracking-widest">%</span>
      </div>
    </div>
    
    <div className="flex gap-1">
      <button 
        onClick={() => {
          Haptic.light(hapticEnabled);
          onChange(Math.max(min, value - 5));
        }}
        className="w-12 h-12 rounded-xl bg-app-text/5 border border-app-border flex items-center justify-center text-app-text active:scale-90 transition-all"
      >
        <Icons.Minus className="w-5 h-5" strokeWidth={2.5} />
      </button>
      <button 
        onClick={() => {
          Haptic.light(hapticEnabled);
          onChange(Math.min(max, value + 5));
        }}
        className="w-12 h-12 rounded-xl bg-app-text/5 border border-app-border flex items-center justify-center text-app-text active:scale-90 transition-all"
      >
        <Icons.Plus className="w-5 h-5" strokeWidth={2.5} />
      </button>
    </div>
  </div>
);

const SliderRow = ({ 
  label, 
  value, 
  onToggle, 
  onValueChange, 
  currentValue,
  hapticEnabled
}: { 
  label: string; 
  value: boolean; 
  onToggle: () => void; 
  onValueChange: (val: number) => void;
  currentValue: number;
  hapticEnabled: boolean;
}) => {
  return (
    <div className="flex flex-col">
      <ToggleRow 
        label={label} 
        description={value ? `Threshold set to ${currentValue}%` : "Currently disabled"}
        value={value} 
        onToggle={onToggle} 
        hapticEnabled={hapticEnabled}
      />
      <AnimatePresence>
        {value && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 pt-1">
              <NumberInput value={currentValue} onChange={onValueChange} hapticEnabled={hapticEnabled} />
              <p className="text-[10px] text-app-text-dim/40 text-center mt-3 uppercase tracking-widest font-black">
                Type directly or use +/- for quick adjustment
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ExternalLinkIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.8" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const SourceCard = ({ 
  title, 
  subtitle, 
  url, 
  hapticEnabled 
}: { 
  title: string; 
  subtitle: string; 
  url: string; 
  hapticEnabled: boolean;
}) => (
  <a 
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    onClick={() => {
      Haptic.light(hapticEnabled);
    }}
    className="block w-full text-left py-3.5 px-4 mb-3 bg-white/[0.03] border border-white/[0.08] rounded-[16px] backdrop-blur-md active:scale-[0.98] transition-all duration-200 hover:border-white/15"
  >
    <div className="flex items-center justify-between gap-3">
      <h4 className="text-[15px] font-semibold text-white tracking-tight">{title}</h4>
      <div className="flex items-center gap-1.5 text-[12px] text-app-text-dim/55 font-mono select-none">
        <span>{url.replace('https://', '').replace('www.', '').replace(/\/$/, '')}</span>
        <ExternalLinkIcon className="w-3.5 h-3.5 opacity-70" />
      </div>
    </div>
    <p className="text-[12px] text-app-text-dim/75 mt-1 leading-snug">{subtitle}</p>
  </a>
);

interface AboutRowProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  rightElement?: React.ReactNode;
  onClick?: () => void;
  hapticEnabled: boolean;
}

const AboutRow = ({ 
  icon: IconComponent, 
  title, 
  subtitle, 
  rightElement, 
  onClick, 
  hapticEnabled 
}: AboutRowProps) => {
  const content = (
    <div className="flex items-center gap-4 w-full">
      <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white flex-shrink-0">
        <IconComponent className="w-5 h-5 text-app-text" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white tracking-tight leading-tight">{title}</p>
        <p className="text-[13px] text-app-text-dim mt-1 leading-snug">{subtitle}</p>
      </div>
      {rightElement && <div className="flex-shrink-0 ml-1">{rightElement}</div>}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => {
          Haptic.light(hapticEnabled);
          onClick();
        }}
        className="w-full p-5 flex items-center justify-between text-left active:bg-white/[0.03] transition-colors hover:bg-white/[0.01]"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="w-full p-5 flex items-center justify-between text-left">
      {content}
    </div>
  );
};

const LoopingWeatherIcon = () => {
  const [index, setIndex] = useState(0);
  const icons = ['Sun', 'Cloud', 'CloudLightning', 'CloudRain', 'Moon'];
  
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % icons.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={icons[index]}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <WeatherIcon 
            name={icons[index] as any} 
            className="w-16 h-16 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
            style="coloured" 
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const SettingsScreen = ({ 
  settings: globalSettings, 
  onUpdate, 
  onClose, 
  activeWeather, 
  activeLocation, 
  panelStackRef,
  handleBack,
  pushPanel
}: SettingsScreenProps) => {
  const [localSettings, setLocalSettings] = useState(globalSettings);

  useEffect(() => {
    setLocalSettings(globalSettings);
  }, [globalSettings]);
  const [showDataSources, setShowDataSources] = useState(false);
  const [showTilesCustomisation, setShowTilesCustomisation] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'none' | 'agreement' | 'privacy'>('none');
  const [pushStatus, setPushStatus] = useState<'idle' | 'registering' | 'synced' | 'error' | 'denied'>('idle');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const mainScrollRef = React.useRef<HTMLDivElement>(null);
  const savedMainScrollPos = React.useRef<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Track scroll position of the main panel and restore it when returning from subviews
  useEffect(() => {
    const isSubActive = activeSubView !== 'none' || showDataSources || showTilesCustomisation;
    
    if (isSubActive) {
      // User is exiting the main Settings panel into a subview: save position
      if (mainScrollRef.current) {
        savedMainScrollPos.current = mainScrollRef.current.scrollTop;
      }
    } else {
      // User is returning to the main Settings page: restore scroll position
      if (mainScrollRef.current && savedMainScrollPos.current > 0) {
        const restore = () => {
          if (mainScrollRef.current) {
            mainScrollRef.current.scrollTop = savedMainScrollPos.current;
          }
        };
        // Execute immediately and in multiple sequential microtasks to beat browser rendering cycles
        restore();
        requestAnimationFrame(restore);
        const t1 = setTimeout(restore, 20);
        const t2 = setTimeout(restore, 100);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }
    }
  }, [activeSubView, showDataSources, showTilesCustomisation]);

  useEffect(() => {
    const runInit = async () => {
      try {
        const playerId = await initializeOneSignal(async (newId) => {
          if (newId) {
            setLocalSettings(prev => {
              const updated = { ...prev, pushEnabled: true, oneSignalPlayerId: newId };
              onUpdate(updated);
              // Push local master settings up to Firebase (never block UI)
              syncUserSettingsToFirebase(newId, updated, activeLocation || null)
                .catch(err => console.warn(err));
              return updated;
            });
            setPushStatus('synced');
          } else {
            setLocalSettings(prev => {
              const updated = { ...prev, pushEnabled: false };
              onUpdate(updated);
              return updated;
            });
            setPushStatus('idle');
          }
        });

        if (playerId) {
          setLocalSettings(prev => {
            const updated = { ...prev, pushEnabled: true, oneSignalPlayerId: playerId };
            onUpdate(updated);
            // Push local master settings up to Firebase
            syncUserSettingsToFirebase(playerId, updated, activeLocation || null)
              .catch(err => console.warn(err));
            return updated;
          });
          setPushStatus('synced');
        }
      } catch (err) {
        console.warn('OneSignal initialization failed:', err);
      }
    };
    runInit();
  }, []);

  const handlePushToggle = async () => {
    if (localSettings.pushEnabled) {
      const updated = { ...localSettings, pushEnabled: false };
      setLocalSettings(updated);
      onUpdate(updated);
      setPushStatus('idle');
      await wirePushToggle(false, showToast);

      if (localSettings.oneSignalPlayerId) {
        syncUserSettingsToFirebase(localSettings.oneSignalPlayerId, updated, activeLocation || null)
          .catch(err => console.warn(err));
      }
    } else {
      // Toggle instantly in the UI with synced status to keep transition super snappy
      setPushStatus('synced');
      const updated = { ...localSettings, pushEnabled: true };
      setLocalSettings(updated);
      onUpdate(updated);
      await wirePushToggle(true, showToast);

      // Request permission asynchronously behind the scenes without blocking UI
      try {
        requestNotificationPermission().then((playerId) => {
          if (playerId) {
            const finalUpdated = { ...updated, oneSignalPlayerId: playerId };
            setLocalSettings(finalUpdated);
            onUpdate(finalUpdated);
            syncUserSettingsToFirebase(playerId, finalUpdated, activeLocation || null)
              .catch(err => console.warn(err));
          }
        }).catch((e) => {
          console.warn('Silent permission query failed:', e);
        });
      } catch (err) {
        console.warn('Async notification handle error:', err);
      }
    }
  };

  const currentTiles = {
    aqi: true,
    uv: true,
    humidity: true,
    visibility: true,
    precipitation: true,
    wind: true,
    forecast: true,
    sunMoon: true,
    aqiGraph: true,
    aqiPollutant: true,
    uvGraph: true,
    ...(localSettings.enabledTiles || {})
  };

  const handleToggleTile = (key: keyof Required<Settings>['enabledTiles']) => {
    const updatedTiles = {
      ...currentTiles,
      [key]: !currentTiles[key]
    };
    updateSetting('enabledTiles', updatedTiles);
  };

  const subViews = {
    agreement: {
      title: "Terms of Use",
      content: `Last Updated: June 2026\n\nBy using Nimbus Black, you agree to the following terms.\n\n## Informational Use Only\n\nWeather information, forecasts, alerts, radar imagery, and environmental data are provided for informational purposes only.\n\nForecasting is inherently uncertain and conditions may change rapidly.\n\n## No Guarantee of Accuracy\n\nNimbus Black and its data providers do not guarantee the accuracy, completeness, availability, or timeliness of any information displayed within the application.\n\n## Not for Critical Safety Decisions\n\nThe application should not be relied upon for:\n- Aviation operations\n- Maritime navigation\n- Emergency management\n- Disaster response\n- Life-safety decisions\n- Any activity where inaccurate weather information could result in injury, damage, or loss\n\nAlways consult official government meteorological agencies when safety-critical decisions are involved.\n\n## Service Availability\n\nThe application depends on third-party data providers and internet connectivity.\n\nFeatures, services, data sources, and availability may change without notice.\n\nTemporary outages may occur due to maintenance, infrastructure issues, or provider interruptions.\n\n## Open Source Software\n\nNimbus Black is provided as open-source software and may be modified, forked, or redistributed according to the project's license.\n\n## Disclaimer of Warranties\n\nThe application is provided "as is" and "as available" without warranties of any kind, express or implied.\n\n## Limitation of Liability\n\nTo the maximum extent permitted by applicable law, Nimbus Black and its contributors shall not be liable for any direct, indirect, incidental, consequential, or special damages arising from the use of, or inability to use, the application.\n\n## Acceptance of Terms\n\nBy using Nimbus Black, you acknowledge that you have read and agree to these Terms of Use.`
    },
    privacy: {
      title: "Privacy Policy",
      content: `Last Updated: June 2026\n\nNimbus Black is designed with a privacy-first approach. The application does not require user accounts, subscriptions, or personal information to function.\n\n## What Data Is Used\n\nTo provide weather forecasts, radar imagery, alerts, and environmental information, the application may access:\n- Your selected locations\n- Device location (only when permission is granted)\n- Application preferences and settings\n\nThis information is used solely to provide weather-related functionality.\n\n## Local-First Storage\n\nYour preferences, saved locations, units, themes, and alert settings are stored locally on your device using browser storage.\n\nNimbus Black does not operate user accounts and does not maintain a database of user profiles.\n\n## Third-Party Weather Services\n\nWeather forecasts, alerts, and environmental data are obtained from third-party providers such as Open-Meteo and related meteorological data sources.\n\nWhen weather information is requested, certain data such as your approximate IP address or requested coordinates may be processed by these providers according to their own privacy policies.\n\nNimbus Black does not control how third-party providers process data.\n\n## Analytics and Tracking\n\n- No user accounts\n- No advertising networks\n- No behavioral profiling\n- No sale of personal data\n- No third-party tracking libraries\n\nThe application does not intentionally collect personal information for marketing or advertising purposes.\n\n## Your Data\n\nYou remain in control of your data.\n\nRemoving saved locations, clearing browser storage, uninstalling the PWA, or clearing site data will remove locally stored application information.\n\n## Open Source\n\nNimbus Black is an open-source project. The source code is publicly available for inspection, review, and contribution under the project's license.\n\n## Changes\n\nThis Privacy Policy may be updated occasionally to reflect changes in functionality or service providers. Continued use of the application constitutes acceptance of the updated policy.`
    }
  };

  useEffect(() => {
    if (showDataSources || showTilesCustomisation || activeSubView !== 'none') {
      const resetScroll = () => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = 0;
          scrollRef.current.scrollLeft = 0;
        }
        window.scrollTo(0, 0);
        
        // Direct DOM access to ensure absolute top-alignment
        const sourcesPage = document.getElementById("sources-page");
        if (sourcesPage) {
          sourcesPage.scrollTop = 0;
          sourcesPage.scrollLeft = 0;
        }
        const tilesPage = document.getElementById("tiles-page");
        if (tilesPage) {
          tilesPage.scrollTop = 0;
          tilesPage.scrollLeft = 0;
        }
        const subviewPage = document.getElementById("subview-page");
        if (subviewPage) {
          subviewPage.scrollTop = 0;
          subviewPage.scrollLeft = 0;
        }
      };

      // Execute across multiple animation cycles to defeat browsers dynamic scroll restoration
      resetScroll();
      requestAnimationFrame(resetScroll);
      const t1 = setTimeout(resetScroll, 50);
      const t2 = setTimeout(resetScroll, 120);
      const t3 = setTimeout(resetScroll, 280);
      
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [showDataSources, showTilesCustomisation, activeSubView]);

  // pushPanel and handleBack passed down from parent to maintain unified browser state

  useEffect(() => {
    const handleSwipeLeft = () => {
      if (showDataSources || showTilesCustomisation || activeSubView !== 'none') return;
      // Increase thresholds
      Haptic.medium(localSettings.hapticEnabled);
      const newRain = Math.min(100, localSettings.rainThreshold + 5);
      const newSnow = Math.min(100, localSettings.snowThreshold + 5);
      const updated = { ...localSettings, rainThreshold: newRain, snowThreshold: newSnow };
      setLocalSettings(updated);
      onUpdate(updated);
    };

    const handleSwipeRight = () => {
      if (showDataSources || showTilesCustomisation || activeSubView !== 'none') return;
      // Decrease thresholds
      Haptic.medium(localSettings.hapticEnabled);
      const newRain = Math.max(0, localSettings.rainThreshold - 5);
      const newSnow = Math.max(0, localSettings.snowThreshold - 5);
      const updated = { ...localSettings, rainThreshold: newRain, snowThreshold: newSnow };
      setLocalSettings(updated);
      onUpdate(updated);
    };

    window.addEventListener('swipe-left', handleSwipeLeft);
    window.addEventListener('swipe-right', handleSwipeRight);
    return () => {
      window.removeEventListener('swipe-left', handleSwipeLeft);
      window.removeEventListener('swipe-right', handleSwipeRight);
    };
  }, [localSettings, showDataSources, showTilesCustomisation, activeSubView, onUpdate]);

  const updateSetting = async <T extends keyof Settings>(key: T, value: Settings[T]) => {
    Haptic.light(localSettings.hapticEnabled);
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onUpdate(newSettings);

    // Synchronize setting change with local NotifSettings and real OneSignal Push actions
    if (key === 'pushEnabled') {
      await wirePushToggle(value as boolean, showToast);
    } else if (key === 'alertMorningSummary') {
      await wireMorningToggle(value as boolean, showToast);
    } else if (key === 'alertNightSummary') {
      await wireNightToggle(value as boolean, showToast);
    } else if (key === 'alertRain') {
      wireThresholdToggle('rain', value as boolean, showToast);
    } else if (key === 'alertDaily') {
      wireThresholdToggle('snow', value as boolean, showToast);
    } else if (key === 'stormThreshold') {
      wireThresholdToggle('storm', value as boolean, showToast);
    } else if (key === 'alertSevere') {
      wireThresholdToggle('severe', value as boolean, showToast);
    }

    if (newSettings.pushEnabled && newSettings.oneSignalPlayerId) {
      // Run in background without awaiting to prevent UI freeze/lag
      syncUserSettingsToFirebase(newSettings.oneSignalPlayerId, newSettings, activeLocation || null)
        .catch(err => console.warn("Failed to sync user settings asynchronously:", err));
    }
  };



  return (
    <motion.div
      key="settings-screen-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ 
        duration: 0.2, 
        ease: "easeOut"
      }}
      className="fixed inset-0 z-[99999] bg-black overflow-hidden"
    >
      <AnimatePresence mode="sync">
        <motion.div 
          key="settings-main-panel"
          ref={mainScrollRef}
          initial={{ opacity: 1, x: 0 }}
          animate={{ 
            opacity: (activeSubView !== 'none' || showDataSources || showTilesCustomisation) ? 0 : 1,
            x: (activeSubView !== 'none' || showDataSources || showTilesCustomisation) ? -15 : 0,
            pointerEvents: (activeSubView !== 'none' || showDataSources || showTilesCustomisation) ? 'none' : 'auto' as any
          }}
          exit={{ opacity: 1 }}
          transition={{ 
            type: "spring", 
            damping: 30, 
            stiffness: 280
          }}
          className="absolute inset-0 z-[1005] bg-app-bg overflow-y-auto overscroll-contain gpu settings-panel touch-pan-y"
          data-no-swipe
        >
            <div className="max-w-[390px] mx-auto min-h-screen px-6 pt-[calc(env(safe-area-inset-top)+24px)] pb-24">
              <header className="flex items-center justify-between mb-8 h-10 w-full px-1">
                <h1 className="text-[34px] font-bold text-app-text tracking-tight">Settings</h1>
                <motion.button 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  onClick={() => {
                    Haptic.light(localSettings.hapticEnabled);
                    onClose();
                  }}
                  className="w-12 h-12 bg-white/10 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 transition-all shadow-xl select-none"
                >
                  <Icons.ChevronLeft className="w-5.5 h-5.5 text-app-text" strokeWidth={2.5} />
                </motion.button>
              </header>

              <Section title="Push alerts & summaries">
                <ToggleRow 
                  label="Enable push alerts" 
                  description={
                    pushStatus === 'registering' ? 'Requesting permission...' :
                    pushStatus === 'synced' ? 'Active & Synced with Cloud' :
                    pushStatus === 'denied' ? 'Permission Denied' :
                    'Get native reports on your device'
                  }
                  value={localSettings.pushEnabled} 
                  hapticEnabled={localSettings.hapticEnabled}
                  onToggle={handlePushToggle} 
                />
                <AnimatePresence>
                  {localSettings.pushEnabled && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      className="overflow-hidden bg-white/[0.01]"
                    >
                      <div className="divide-y divide-app-border">
                        <ToggleRow 
                          label="Morning weather summary" 
                          description="Get today's dynamic weather report delivered in the morning"
                          value={localSettings.alertMorningSummary} 
                          hapticEnabled={localSettings.hapticEnabled}
                          onToggle={() => updateSetting('alertMorningSummary', !localSettings.alertMorningSummary)} 
                        />
                        <ToggleRow 
                          label="Night weather summary" 
                          description="Get tomorrow's weather outlook delivered in the evening"
                          value={localSettings.alertNightSummary} 
                          hapticEnabled={localSettings.hapticEnabled}
                          onToggle={() => updateSetting('alertNightSummary', !localSettings.alertNightSummary)} 
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Section>

              <Section title="Threshold triggers">
                <SliderRow 
                  label="Rain threshold" 
                  value={localSettings.alertRain} 
                  currentValue={localSettings.rainThreshold}
                  hapticEnabled={localSettings.hapticEnabled}
                  onToggle={() => updateSetting('alertRain', !localSettings.alertRain)} 
                  onValueChange={(val) => updateSetting('rainThreshold', val)}
                />
                <SliderRow 
                  label="Snow threshold" 
                  value={localSettings.alertDaily} 
                  currentValue={localSettings.snowThreshold}
                  hapticEnabled={localSettings.hapticEnabled}
                  onToggle={() => updateSetting('alertDaily', !localSettings.alertDaily)} 
                  onValueChange={(val) => updateSetting('snowThreshold', val)}
                />
                <ToggleRow 
                  label="Thunderstorm alerts" 
                  value={localSettings.stormThreshold} 
                  hapticEnabled={localSettings.hapticEnabled}
                  onToggle={() => updateSetting('stormThreshold', !localSettings.stormThreshold)} 
                />
                <ToggleRow 
                  label="Severe weather alerts" 
                  value={localSettings.alertSevere} 
                  hapticEnabled={localSettings.hapticEnabled}
                  onToggle={() => updateSetting('alertSevere', !localSettings.alertSevere)} 
                />
              </Section>

              <Section title="Units">
                <SelectRow 
                  label="Temperature" 
                  value={localSettings.unitTemp} 
                  hapticEnabled={localSettings.hapticEnabled}
                  options={[
                    { label: '°C', value: 'C' },
                    { label: '°F', value: 'F' }
                  ]}
                  onChange={(val) => updateSetting('unitTemp', val)}
                />
                <SelectRow 
                  label="Wind" 
                  value={localSettings.unitWind} 
                  hapticEnabled={localSettings.hapticEnabled}
                  options={[
                    { label: 'km/h', value: 'km/h' },
                    { label: 'mph', value: 'mph' },
                    { label: 'm/s', value: 'm/s' }
                  ]}
                  onChange={(val) => updateSetting('unitWind', val)}
                />
                <SelectRow 
                  label="Visibility" 
                  value={localSettings.unitVisibility} 
                  hapticEnabled={localSettings.hapticEnabled}
                  options={[
                    { label: 'km', value: 'km' },
                    { label: 'mi', value: 'miles' }
                  ]}
                  onChange={(val) => updateSetting('unitVisibility', val)}
                />
                <SelectRow 
                  label="Time Format" 
                  value={localSettings.timeFormat === '24h' ? '24h' : '12h'} 
                  hapticEnabled={localSettings.hapticEnabled}
                  options={[
                    { label: '12-hour', value: '12h' },
                    { label: '24-hour', value: '24h' }
                  ]}
                  onChange={(val) => updateSetting('timeFormat', val)}
                />
              </Section>

              <Section title="Icons & Atmosphere">
                <div className="p-8 flex items-center justify-center gap-12 bg-white/[0.02]">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      Haptic.medium(localSettings.hapticEnabled);
                      updateSetting('iconStyle', 'outline');
                    }}
                    className="flex flex-col items-center gap-4 transition-all duration-300 group touch-manipulation"
                  >
                    <div className={cn(
                      "transition-all duration-500 ease-[0.22,1,0.36,1]",
                      localSettings.iconStyle === 'outline' ? "scale-125 saturate-100" : "scale-100 saturate-0 opacity-40 group-hover:opacity-60"
                    )}>
                      <WeatherIcon name="Sun" style="outline" className="w-12 h-12" />
                    </div>
                    <p className={cn(
                      "text-[10px] uppercase font-bold tracking-[0.2em] transition-colors",
                      localSettings.iconStyle === 'outline' ? "text-white" : "text-white/20"
                    )}>Outline</p>
                  </button>
                  
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      Haptic.medium(localSettings.hapticEnabled);
                      updateSetting('iconStyle', 'coloured');
                    }}
                    className="flex flex-col items-center gap-4 transition-all duration-300 group touch-manipulation"
                  >
                    <div className={cn(
                      "transition-all duration-500 ease-[0.22,1,0.36,1]",
                      localSettings.iconStyle === 'coloured' ? "scale-125 saturate-100" : "scale-100 saturate-0 opacity-40 group-hover:opacity-60"
                    )}>
                      <WeatherIcon name="Sun" style="coloured" className="w-12 h-12" />
                    </div>
                    <p className={cn(
                      "text-[10px] uppercase font-bold tracking-[0.2em] transition-colors",
                      localSettings.iconStyle === 'coloured' ? "text-white" : "text-white/20"
                    )}>Coloured</p>
                  </button>
                </div>
                <SelectRow 
                  label="Atmosphere Glow" 
                  value={localSettings.backgroundGlow || 'on'} 
                  hapticEnabled={localSettings.hapticEnabled}
                  options={[
                    { label: 'ON', value: 'on' },
                    { label: 'OFF', value: 'off' },
                    { label: 'STATIC', value: 'static' }
                  ]}
                  onChange={(val) => updateSetting('backgroundGlow', val)}
                />
              </Section>

              {/* Performance guidance footnote */}
              <div className="px-5 -mt-5 mb-8 flex gap-3 text-app-text-dim/80 text-[11px] leading-relaxed max-w-[342px]">
                <Info className="w-3.5 h-3.5 text-app-text-dim/50 shrink-0 mt-0.5" strokeWidth={2} />
                <p>
                  Experience minor UI lag on older devices? Try turning off the atmosphere glow for a smoother experience.
                </p>
              </div>

              <Section title="General">
                <ToggleRow 
                  label="Haptic feedback" 
                  description="Subtle vibrations for buttons and scrolling"
                  value={localSettings.hapticEnabled} 
                  hapticEnabled={localSettings.hapticEnabled}
                  onToggle={() => updateSetting('hapticEnabled', !localSettings.hapticEnabled)} 
                />
                <LinkRow 
                  label="Tiles Customisation" 
                  hapticEnabled={localSettings.hapticEnabled}
                  onClick={() => {
                    setShowTilesCustomisation(true);
                    pushPanel(() => setShowTilesCustomisation(false), 'tiles_customisation');
                  }}
                />
              </Section>

              <Section title="About">
                <AboutRow 
                  icon={Package} 
                  title="App version" 
                  subtitle="1.0.2" 
                  hapticEnabled={localSettings.hapticEnabled}
                />
                <AboutRow 
                  icon={Cloud} 
                  title="Data sources" 
                  subtitle="Weather, alerts and environmental data sources" 
                  rightElement={<Icons.ChevronRight className="w-5 h-5 text-app-text-dim/30" />}
                  onClick={() => {
                    setShowDataSources(true);
                    pushPanel(() => setShowDataSources(false), 'data_sources');
                  }}
                  hapticEnabled={localSettings.hapticEnabled}
                />
                <AboutRow 
                  icon={FileText} 
                  title="Terms of Service" 
                  subtitle="Terms and conditions" 
                  rightElement={<ArrowUpRight className="w-4.5 h-4.5 text-app-text-dim/40" />}
                  onClick={() => {
                    setActiveSubView('agreement');
                    pushPanel(() => setActiveSubView('none'), 'agreement');
                  }}
                  hapticEnabled={localSettings.hapticEnabled}
                />
                <AboutRow 
                  icon={Shield} 
                  title="Privacy" 
                  subtitle="Privacy policy & data practices" 
                  rightElement={<ArrowUpRight className="w-4.5 h-4.5 text-app-text-dim/40" />}
                  onClick={() => {
                    setActiveSubView('privacy');
                    pushPanel(() => setActiveSubView('none'), 'privacy');
                  }}
                  hapticEnabled={localSettings.hapticEnabled}
                />
              </Section>

              {/* Footer */}
              <div className="flex flex-col items-center justify-center pt-8 pb-4 text-center w-full">
                <p className="text-[12px] font-semibold text-app-text-dim opacity-40 tracking-tight">&copy; 2026 Nimbus Black</p>
              </div>
            </div>
          </motion.div>

        {showDataSources && (
          <motion.div 
            key="settings-data-sources-panel"
            ref={scrollRef}
            id="sources-page"
            data-no-swipe
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-0 z-[1010] bg-app-bg overflow-y-auto overscroll-contain sources-page touch-pan-y"
          >
            <div className="max-w-[390px] mx-auto min-h-screen px-6 pt-[calc(env(safe-area-inset-top)+24px)] pb-32">
              <header className="flex items-center justify-between mb-8 px-1 h-10 w-full">
                <h1 className="text-[28px] font-bold text-app-text tracking-tight">Data Sources</h1>
                <motion.button 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  onClick={() => {
                    Haptic.light(localSettings.hapticEnabled);
                    setShowDataSources(false);
                    handleBack();
                  }}
                  className="w-12 h-12 bg-white/10 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 transition-all shadow-xl select-none"
                >
                  <Icons.ChevronLeft className="w-5.5 h-5.5 text-app-text" strokeWidth={2.5} />
                </motion.button>
              </header>

              <div className="flex flex-col items-center px-0 w-full">
                 <div className="w-full mb-10">
                    <SourceCard 
                      title="Open-Meteo" 
                      subtitle="High-resolution global weather forecasts, hourly UV Index modeling, and local temperature projections." 
                      url="https://open-meteo.com/" 
                      hapticEnabled={localSettings.hapticEnabled} 
                    />
                    <SourceCard 
                      title="WAQI (AQI)" 
                      subtitle="Real-time, hyper-local PM2.5, PM10, and ozone monitoring from official stations globally." 
                      url="https://waqi.info/" 
                      hapticEnabled={localSettings.hapticEnabled} 
                    />
                    <SourceCard 
                      title="Windy.com" 
                      subtitle="Interactive composite weather radar mapping tiles, wind vectors, and meteorological modeling visualizations." 
                      url="https://www.windy.com/" 
                      hapticEnabled={localSettings.hapticEnabled} 
                    />
                    <SourceCard 
                      title="OpenStreetMap" 
                      subtitle="Precise device reverse coordinate translation to match human-readable city labels." 
                      url="https://www.openstreetmap.org/" 
                      hapticEnabled={localSettings.hapticEnabled} 
                    />
                 </div>
              </div>
              
              {/* Footer */}
              <div className="flex flex-col items-center justify-center pt-8 pb-4 text-center w-full">
                <p className="text-[12px] font-semibold text-app-text-dim opacity-40 tracking-tight">&copy; 2026 Nimbus Black</p>
              </div>
            </div>
          </motion.div>
        )}

        {showTilesCustomisation && (
          <motion.div 
            key="settings-tiles-customisation-panel"
            ref={scrollRef}
            id="tiles-page"
            data-no-swipe
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-0 z-[1010] bg-app-bg overflow-y-auto overscroll-contain tiles-page touch-pan-y"
          >
            <div className="max-w-[390px] mx-auto min-h-screen px-6 pt-[calc(env(safe-area-inset-top)+24px)] pb-32">
              <header className="flex items-center justify-between mb-12 px-1 h-10 w-full">
                <h1 className="text-[28px] font-bold text-app-text tracking-tight">Tiles</h1>
                <motion.button 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  onClick={() => {
                    Haptic.light(localSettings.hapticEnabled);
                    handleBack();
                  }}
                  className="w-12 h-12 bg-white/10 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 transition-all shadow-xl select-none"
                >
                  <Icons.ChevronLeft className="w-5.5 h-5.5 text-app-text" strokeWidth={2.5} />
                </motion.button>
              </header>

              <Section title="Active Weather Cards">
                <ToggleRow 
                  label="Air Quality (AQI)" 
                  description="Air Quality Index & station details"
                  value={!!currentTiles.aqi} 
                  hapticEnabled={localSettings.hapticEnabled}
                  onToggle={() => handleToggleTile('aqi')} 
                />
                <ToggleRow 
                  label="UV Index" 
                  description="Solar radiation and exposure levels"
                  value={!!currentTiles.uv} 
                  hapticEnabled={localSettings.hapticEnabled}
                  onToggle={() => handleToggleTile('uv')} 
                />
                <ToggleRow 
                  label="7-Day Forecast" 
                  description="Future meteorological trend projections"
                  value={currentTiles.forecast !== false} 
                  hapticEnabled={localSettings.hapticEnabled}
                  onToggle={() => handleToggleTile('forecast')} 
                />
                <ToggleRow 
                  label="Sun & Moon Path" 
                  description="Solar & lunar altitude and transit lines"
                  value={currentTiles.sunMoon !== false} 
                  hapticEnabled={localSettings.hapticEnabled}
                  onToggle={() => handleToggleTile('sunMoon')} 
                />
                <ToggleRow 
                  label="Humidity" 
                  description="Relative humidity percentage"
                  value={!!currentTiles.humidity} 
                  hapticEnabled={localSettings.hapticEnabled}
                  onToggle={() => handleToggleTile('humidity')} 
                />
                <ToggleRow 
                  label="Visibility" 
                  description="Horizontal visibility distance"
                  value={!!currentTiles.visibility} 
                  hapticEnabled={localSettings.hapticEnabled}
                  onToggle={() => handleToggleTile('visibility')} 
                />
                <ToggleRow 
                  label="Precipitation" 
                  description="Expected rain/snow accumulation"
                  value={!!currentTiles.precipitation} 
                  hapticEnabled={localSettings.hapticEnabled}
                  onToggle={() => handleToggleTile('precipitation')} 
                />
                <ToggleRow 
                  label="Wind Speed" 
                  description="Wind speed and direction details"
                  value={!!currentTiles.wind} 
                  hapticEnabled={localSettings.hapticEnabled}
                  onToggle={() => handleToggleTile('wind')} 
                />
              </Section>

              {(currentTiles.aqi || currentTiles.uv) && (
                <Section title="Detailed Card Elements">
                  {currentTiles.aqi && (
                    <>
                      <ToggleRow 
                        label="AQI Graph" 
                        description="24-hour historical trend sparkline"
                        value={currentTiles.aqiGraph !== false} 
                        hapticEnabled={localSettings.hapticEnabled}
                        onToggle={() => handleToggleTile('aqiGraph')} 
                      />
                      <ToggleRow 
                        label="AQI Pollutants & Recommendation" 
                        description="Station statistics and health advisory"
                        value={currentTiles.aqiPollutant !== false} 
                        hapticEnabled={localSettings.hapticEnabled}
                        onToggle={() => handleToggleTile('aqiPollutant')} 
                      />
                    </>
                  )}
                  {currentTiles.uv && (
                    <ToggleRow 
                      label="UV Graph" 
                      description="12-hour exposure curve & index projections"
                      value={currentTiles.uvGraph !== false} 
                      hapticEnabled={localSettings.hapticEnabled}
                      onToggle={() => handleToggleTile('uvGraph')} 
                    />
                  )}
                </Section>
              )}
            </div>
          </motion.div>
        )}

        {activeSubView !== 'none' && (
          <motion.div 
            key="settings-subview-panel"
            ref={scrollRef}
            id="subview-page"
            data-no-swipe
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ 
              type: "spring",
              stiffness: 280,
              damping: 30
            }}
            className="fixed inset-0 z-[1020] bg-app-bg overflow-y-auto overscroll-contain subview-page touch-pan-y"
          >
            <div className="max-w-[390px] mx-auto min-h-screen px-6 pt-[calc(env(safe-area-inset-top)+24px)] pb-32">
              <header className="flex items-center justify-between mb-8 px-1 h-10 w-full">
                <h1 className="text-[28px] font-bold text-app-text tracking-tight">{subViews[activeSubView].title}</h1>
                <motion.button 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  onClick={() => {
                    Haptic.light(localSettings.hapticEnabled);
                    handleBack();
                  }} 
                  className="w-12 h-12 bg-white/10 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 transition-all shadow-xl select-none"
                >
                  <Icons.ChevronLeft className="w-5.5 h-5.5 text-app-text" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </motion.button>
              </header>
              <div className="text-[14px] p-1 font-normal leading-relaxed text-app-text/75 space-y-5">
                {subViews[activeSubView].content.split('\n\n').map((block, i) => {
                  const trimmed = block.trim();
                  if (trimmed.startsWith('## ')) {
                    return (
                      <h2 key={i} className="text-[15px] font-bold text-white tracking-tight pt-3">
                        {trimmed.substring(3)}
                      </h2>
                    );
                  }
                  if (trimmed.startsWith('- ')) {
                    const items = trimmed.split('\n').map(line => line.replace(/^-\s*/, '').trim());
                    return (
                      <ul key={i} className="list-disc pl-5 space-y-2 text-app-text-dim">
                        {items.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <p key={i} className="whitespace-pre-line leading-relaxed">
                      {trimmed}
                    </p>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Floating Toast notification */}
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-12 left-1/2 z-[200] px-5 py-3 bg-[#1e293b]/95 border border-white/10 text-white rounded-2xl text-[13px] font-semibold shadow-2xl pointer-events-none select-none text-center"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SettingsScreen;
