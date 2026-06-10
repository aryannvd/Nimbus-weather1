import React, { useEffect, useRef } from 'react';
import { Settings } from '../types';

interface AtmosphereCanvasProps {
  weatherCode: number;
  isNight: boolean;
  settings: Settings;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  extra?: number; // wobble phase or random variance
}

// Convert Hex colors to RGB structure
const hexToRgb = (hex: string): RGB => {
  const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return res ? {
    r: parseInt(res[1], 16),
    g: parseInt(res[2], 16),
    b: parseInt(res[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  active: boolean;
  timer: number;
}

// Map condition variables to specific 5-stop color palettes
const getTargetGradientColors = (weatherCode: number, isNight: boolean): RGB[] => {
  let hexes: string[];
  if (isNight) {
    if (weatherCode === 0 || weatherCode === 1) { // Clear
      hexes = ["#0a1122", "#070c18", "#040810", "#020408", "#000000"];
    } else if (weatherCode === 2 || weatherCode === 3) { // Cloudy
      hexes = ["#10141b", "#0c0f14", "#080a0e", "#040507", "#000000"];
    } else if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) { // Rain
      hexes = ["#0f1726", "#0b111c", "#070b13", "#030509", "#000000"];
    } else if ((weatherCode >= 71 && weatherCode <= 77) || weatherCode === 85 || weatherCode === 86) { // Snow
      hexes = ["#192841", "#131e31", "#0d1421", "#060a10", "#000000"];
    } else if (weatherCode >= 95 && weatherCode <= 99) { // Storm
      hexes = ["#140f1e", "#0f0b17", "#0a0710", "#050308", "#000000"];
    } else { // Fog/other night
      hexes = ["#080b13", "#05070d", "#030409", "#010204", "#000000"];
    }
  } else {
    if (weatherCode === 0 || weatherCode === 1) { // Clear Day
      hexes = ["#142456", "#0f1c44", "#0b1433", "#060b1e", "#000000"];
    } else if (weatherCode === 2 || weatherCode === 3) { // Cloudy Day
      hexes = ["#20293c", "#171e2c", "#10151f", "#080a10", "#000000"];
    } else if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) { // Rain Day
      hexes = ["#1c273e", "#141c2c", "#0e1320", "#070a11", "#000000"];
    } else if ((weatherCode >= 71 && weatherCode <= 77) || weatherCode === 85 || weatherCode === 86) { // Snow Day
      hexes = ["#223c6c", "#182b4f", "#111e38", "#09101f", "#000000"];
    } else if (weatherCode >= 95 && weatherCode <= 99) { // Storm Day
      hexes = ["#1a2032", "#121825", "#0c101a", "#06080d", "#000000"];
    } else { // Other day
      hexes = ["#0e1830", "#0a1122", "#070c18", "#03060c", "#000000"];
    }
  }
  return hexes.map(hexToRgb);
};

export default function AtmosphereCanvas({ weatherCode, isNight, settings }: AtmosphereCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  // Maintain actual color states for smooth transition lerping
  const currentColors = useRef<RGB[]>([]);
  const targetColors = useRef<RGB[]>([]);

  // Sound particle/lightning tracking objects
  const particles = useRef<Particle[]>([]);
  const lastWeatherState = useRef<{ code: number; night: boolean } | null>(null);
  const lightningFlash = useRef<number>(0); // opacity offset of lightning
  
  const shootingStar = useRef<ShootingStar>({
    x: 0,
    y: 0,
    length: 0,
    speed: 0,
    active: false,
    timer: 0
  });

  useEffect(() => {
    // Prime values
    const tG = getTargetGradientColors(weatherCode, isNight);
    targetColors.current = tG;
    if (currentColors.current.length === 0) {
      currentColors.current = tG.map(c => ({ ...c }));
    }
  }, [weatherCode, isNight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Fast resize handling using high-DPI scaling
    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Weather particles creator (disabled to ensure zero CPU overhead and lag-free transitions)
    const initParticles = (code: number, night: boolean) => {
      particles.current = [];
    };

    // Main animation ticking loop
    const tick = () => {
      const gC = canvas.getBoundingClientRect();
      const w = gC.width;
      const h = gC.height;

      if (w === 0 || h === 0) {
        animationFrameId.current = requestAnimationFrame(tick);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameId.current = requestAnimationFrame(tick);
        return;
      }

      // 1. Smoothly interpolate (lerp) color stopped values
      let needLerp = false;
      const step = 0.055; // buttery lerp rate, extremely responsive but smooth

      for (let i = 0; i < targetColors.current.length; i++) {
        const cur = currentColors.current[i];
        const tar = targetColors.current[i];
        if (!cur || !tar) continue;

        const rd = tar.r - cur.r;
        const gd = tar.g - cur.g;
        const bd = tar.b - cur.b;

        if (Math.abs(rd) > 0.1 || Math.abs(gd) > 0.1 || Math.abs(bd) > 0.1) {
          cur.r += rd * step;
          cur.g += gd * step;
          cur.b += bd * step;
          needLerp = true;
        } else {
          cur.r = tar.r;
          cur.g = tar.g;
          cur.b = tar.b;
        }
      }

      // Check if code has changed to rebuild particle structures
      const stateKey = lastWeatherState.current;
      if (!stateKey || stateKey.code !== weatherCode || stateKey.night !== isNight) {
        lastWeatherState.current = { code: weatherCode, night: isNight };
        initParticles(weatherCode, isNight);
      }

      // Manage random lightning flash in severe thunderstorms
      if (weatherCode >= 95 && weatherCode <= 99) {
        if (lightningFlash.current > 0) {
          lightningFlash.current -= 0.12; // fade out fast
        } else if (Math.random() < 0.003) { // random strike rate
          lightningFlash.current = 0.6 + Math.random() * 0.4;
        }
      } else {
        lightningFlash.current = 0;
      }

      // 2. Clear & paint the custom hardware accelerated gradient
      ctx.clearRect(0, 0, w, h);

      // Create beautiful atmospheric radial gradient mimicking high end weather backdrops
      // Centered at (50% of screen, 220px from top) with radius 550px
      const cx = w / 2;
      const cy = 220;
      const rad = 550;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      currentColors.current.forEach((color, idx) => {
        const stop = idx * 0.25; // 0, 0.25, 0.50, 0.75, 1.0
        // Apply random lightning flash overlay if any
        let rVal = Math.min(255, Math.max(0, color.r + lightningFlash.current * 90));
        let gVal = Math.min(255, Math.max(0, color.g + lightningFlash.current * 110));
        let bVal = Math.min(255, Math.max(0, color.b + lightningFlash.current * 140));
        
        grad.addColorStop(stop, `rgb(${Math.round(rVal)},${Math.round(gVal)},${Math.round(bVal)})`);
      });

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      
      // 2.5. If night, render the beautiful 45-degree shooting star
      if (isNight) {
        const star = shootingStar.current;
        if (!star.active) {
          const now = Date.now();
          if (star.timer === 0) star.timer = now;
          if (now - star.timer > 4000 + Math.random() * 1000) {
            star.active = true;
            // Start near the top-right corner
            star.x = w * (0.75 + Math.random() * 0.25);
            star.y = h * (0.02 + Math.random() * 0.08); 
            star.speed = 5 + Math.random() * 3; 
            star.length = 65 + Math.random() * 35; 
            star.timer = now;
          }
        } else {
          // Travel at exact 45-degree angle downwards and leftwards
          const dist = star.speed;
          const dxArr = -dist / Math.SQRT2;
          const dyArr = dist / Math.SQRT2;
          star.x += dxArr;
          star.y += dyArr;

          if (star.x < -100 || star.y > h + 100) {
            star.active = false;
            star.timer = Date.now();
          } else {
            ctx.save();
            ctx.beginPath();
            
            // Draw 45-degree line from tail (up & right) to head (down & left)
            const dxOff = star.length / Math.SQRT2;
            const dyOff = star.length / Math.SQRT2;

            ctx.shadowBlur = 12;
            ctx.shadowColor = "rgba(255, 255, 255, 0.4)";

            const gradLine = ctx.createLinearGradient(star.x + dxOff, star.y - dyOff, star.x, star.y);
            gradLine.addColorStop(0, 'rgba(255, 255, 255, 0)');
            gradLine.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
            gradLine.addColorStop(0.8, 'rgba(255, 255, 255, 0.55)');
            gradLine.addColorStop(1, 'rgba(255, 255, 255, 1.0)');

            ctx.strokeStyle = gradLine;
            ctx.lineWidth = 1.2;
            ctx.lineCap = 'round';
            ctx.moveTo(star.x + dxOff, star.y - dyOff);
            ctx.lineTo(star.x, star.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // 3. Update & render particles (Particle rendering disabled for maximum performance)

      animationFrameId.current = requestAnimationFrame(tick);
    };

    animationFrameId.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [weatherCode, isNight, settings]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
      style={{ 
        display: settings.backgroundGlow === 'off' ? 'none' : 'block',
        willChange: 'transform',
        imageRendering: 'auto'
      }} 
    />
  );
}
