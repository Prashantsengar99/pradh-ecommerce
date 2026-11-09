// ============================================================
// 🌙 DARK MODE PRO — Smart dark mode with auto-detection
// Modes: light | dark | auto (follows sunset/sunrise)
// Saves per-user preference in localStorage
// ============================================================
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'pradh_dark_mode'; // 'light' | 'dark' | 'auto'

/**
 * Calculate approximate sunset time for India (IST)
 * Returns hour (0-23) when sun sets ~ 6:30 PM IST
 */
const getSunsetHour = () => {
  const month = new Date().getMonth();
  // Summer (May-Jul): sunset ~7:15 PM → 19
  // Winter (Nov-Jan): sunset ~5:45 PM → 17
  // Spring/Autumn: ~6:30 PM → 18
  if (month >= 4 && month <= 6) return 19; // May-Jul
  if (month >= 10 || month <= 1) return 17; // Nov-Jan
  return 18; // Feb-Apr, Aug-Oct
};

/**
 * Check if it's currently night time (after sunset or before sunrise)
 */
const isNightTime = () => {
  const hour = new Date().getHours();
  const sunsetHour = getSunsetHour();
  // Night = after sunset (18/19) OR before sunrise (6 AM)
  return hour >= sunsetHour || hour < 6;
};

/**
 * Get system preference (if browser supports it)
 */
const getSystemPreference = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

export const useDarkMode = () => {
  // Read from localStorage IMMEDIATELY (not in useEffect — avoids empty className on load)
  const [mode, setModeState] = useState(() => {
    if (typeof window === 'undefined') return 'auto';
    return localStorage.getItem('pradh_dark_mode') || 'auto';
  });
  const [isDark, setIsDark] = useState(false);

  // Apply dark mode IMMEDIATELY on every render (not just useEffect)
  // This ensures the class is always in sync
  const shouldBeDark = mode === 'dark' || (mode === 'auto' && isNightTime());

  // useEffect to apply class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (shouldBeDark) {
      root.classList.add('dark-mode');
    } else {
      root.classList.remove('dark-mode');
    }

    // Update meta theme-color
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', shouldBeDark ? '#181614' : '#39251B');
    }

    setIsDark(shouldBeDark);
  }, [mode, shouldBeDark]);

  // Auto mode: check every 5 min for day→night transition
  useEffect(() => {
    if (mode !== 'auto') return;
    const interval = setInterval(() => {
      const night = isNightTime();
      if (night !== isDark) {
        setIsDark(night);
        const root = document.documentElement;
        if (night) root.classList.add('dark-mode');
        else root.classList.remove('dark-mode');
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [mode, isDark]);

  // Mode switcher — saves to localStorage + updates state + APPLIES CLASS IMMEDIATELY
  const setMode = (newMode) => {
    localStorage.setItem('pradh_dark_mode', newMode);
    setModeState(newMode);

    // Apply class IMMEDIATELY (don't wait for useEffect)
    const root = document.documentElement;
    const dark = newMode === 'dark' || (newMode === 'auto' && isNightTime());
    if (dark) {
      root.classList.add('dark-mode');
    } else {
      root.classList.remove('dark-mode');
    }

    // Update meta theme-color immediately
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#181614' : '#39251B');
  };

  return {
    mode,
    isDark: shouldBeDark,
    setMode,
  };
};
