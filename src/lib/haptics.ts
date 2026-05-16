
/**
 * Robust Haptic Feedback Implementation
 * Fixes issues on Android/Vercel by unlocking vibration on user interaction.
 */

let unlocked = false;

if (typeof window !== 'undefined') {
  // Unlock vibration on first user touch - required for many mobile browsers
  const unlock = () => {
    if (!unlocked && navigator.vibrate) {
      try {
        navigator.vibrate(1); // silent 1ms wake-up
        unlocked = true;
        // console.log("[Haptics] Unlocked");
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('touchstart', unlock);
      } catch (e) {
        console.warn("[Haptics] Unlock failed:", e);
      }
    }
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("touchstart", unlock, { passive: true });
}

export const Haptic = {
  light:   (enabled: boolean = true) => {
    if (!enabled || typeof navigator === 'undefined') return;
    navigator.vibrate?.([10]);
    // console.log("[Haptics] light");
  },
  medium:  (enabled: boolean = true) => {
    if (!enabled || typeof navigator === 'undefined') return;
    navigator.vibrate?.([30]);
    // console.log("[Haptics] medium");
  },
  heavy:   (enabled: boolean = true) => {
    if (!enabled || typeof navigator === 'undefined') return;
    navigator.vibrate?.([60]);
    // console.log("[Haptics] heavy");
  },
  success: (enabled: boolean = true) => {
    if (!enabled || typeof navigator === 'undefined') return;
    navigator.vibrate?.([10, 50, 10]);
    // console.log("[Haptics] success");
  },
  error:   (enabled: boolean = true) => {
    if (!enabled || typeof navigator === 'undefined') return;
    navigator.vibrate?.([60, 50, 60]);
    // console.log("[Haptics] error");
  },
  warning: (enabled: boolean = true) => {
    if (!enabled || typeof navigator === 'undefined') return;
    navigator.vibrate?.([30, 50, 30]);
    // console.log("[Haptics] warning");
  },
};
