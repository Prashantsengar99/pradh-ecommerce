// ============================================================
// 🎨 FESTIVAL PROVIDER — Admin-controlled theme system
// NO user manual override (removed). Only admin controls theme.
// Priority: Admin theme → Auto-detected festival → Default
//
// 🛡️ ANTI-FLASH FIX:
// On refresh, we used to briefly show detectedFestival (e.g. Diwali)
// before admin's 'default' override loaded from backend.
// Now we cache adminTheme in localStorage so it's available
// synchronously on next visit. While loading (first visit only),
// we force 'default' to avoid festival flash.
// ============================================================
import { useState, useEffect, createContext, useContext } from 'react';
import { apiFetch } from '../services/api';
import { FESTIVAL_THEMES, ALL_THEME_KEYS } from './festivalConfig';
import { detectActiveFestival } from './festivalDetector';

const FestivalContext = createContext(null);

const ADMIN_THEME_CACHE_KEY = 'pradh_admin_theme_cache';

// Safe localStorage read with try/catch (for private mode etc.)
function readCachedTheme() {
  try {
    return localStorage.getItem(ADMIN_THEME_CACHE_KEY); // 'auto' | 'default' | 'diwali' | null
  } catch {
    return null;
  }
}

function writeCachedTheme(value) {
  try {
    localStorage.setItem(ADMIN_THEME_CACHE_KEY, value);
  } catch {
    /* ignore */
  }
}

export const useFestival = () => {
  const ctx = useContext(FestivalContext);
  if (!ctx) {
    return {
      activeTheme: 'default',
      themeInfo: FESTIVAL_THEMES.default,
      detectedFestival: null,
      showIntro: false,
      introFestival: null,
      dismissIntro: () => {},
    };
  }
  return ctx;
};

export const FestivalProvider = ({ children }) => {
  // 🛡️ Initial state from cache (instant, no flash)
  // adminSetting can be: 'auto' | 'default' | 'diwali' | ... | null (no cache yet)
  const [adminSetting, setAdminSetting] = useState(readCachedTheme);
  // themeReady = true if we have a cached value; otherwise false until fetch completes
  const [themeReady, setThemeReady] = useState(() => readCachedTheme() !== null);
  const [detectedFestival, setDetectedFestival] = useState(null);
  const [showIntro, setShowIntro] = useState(false);
  const [introFestival, setIntroFestival] = useState(null);

  // On mount: detect festival + fetch admin's global theme
  useEffect(() => {
    // Clean up OLD localStorage values from removed user selector
    // (Do NOT remove ADMIN_THEME_CACHE_KEY — that's our new cache)
    localStorage.removeItem('pradh_theme_mode');
    localStorage.removeItem('pradh_manual_theme');
    localStorage.removeItem('pradh_intro_shown');

    // Detect festival based on calendar (synchronous, instant)
    const detected = detectActiveFestival();
    setDetectedFestival(detected);

    // Fetch admin's global theme setting (async)
    const fetchAdminTheme = async () => {
      try {
        const res = await apiFetch('/api/theme-settings');
        const data = await res.json();
        if (data.success && data.activeTheme) {
          // data.activeTheme can be: 'auto' | 'default' | specific festival
          setAdminSetting(data.activeTheme);
          writeCachedTheme(data.activeTheme);
        } else {
          // No admin setting stored — default to 'auto' (use festival calendar)
          setAdminSetting('auto');
          writeCachedTheme('auto');
        }
      } catch {
        // Backend unavailable — fallback to 'auto' (let detection decide)
        setAdminSetting('auto');
        writeCachedTheme('auto');
      } finally {
        setThemeReady(true);
      }
    };
    fetchAdminTheme();
  }, []);

  // 🛡️ Compute active theme WITHOUT flash:
  // - While not ready (first visit, no cache): FORCE 'default'
  //   (never show detectedFestival before admin's preference is known)
  // - After ready:
  //     adminSetting='auto' → use detectedFestival (admin wants calendar detection)
  //     adminSetting=specific theme → use that theme (admin override)
  //     adminSetting=null (shouldn't happen post-ready) → fall back to detected
  const activeTheme = !themeReady
    ? 'default'
    : (adminSetting === 'auto' || !adminSetting)
      ? (detectedFestival || 'default')
      : adminSetting;

  const themeInfo = FESTIVAL_THEMES[activeTheme] || FESTIVAL_THEMES.default;

  // Apply theme class to body
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;

    // Remove ALL theme classes first
    ALL_THEME_KEYS.forEach((key) => body.classList.remove(`theme-${key}`));

    // Add active theme class
    body.classList.add(`theme-${activeTheme}`);

    // Update meta theme-color for mobile browsers
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      const colors = {
        default: '#39251B', lohri: '#E25822', sankranti: '#87CEEB',
        republic: '#FF9933', holi: '#FF1493', ganesh: '#FF8C00',
        janmashtami: '#1e3a8a', independence: '#FF9933', rakhi: '#FFB6C1',
        navratri: '#DC143C', durga: '#DC143C', diwali: '#FF6B35',
        christmas: '#006400', eid: '#0d7a4f', onam: '#c3a35f',
        pongal: '#e8a838', baisakhi: '#f5a623', dussehra: '#b91c1c',
        gurpurab: '#ffa500', shivratri: '#1a237e',
      };
      themeColorMeta.setAttribute('content', colors[activeTheme] || colors.default);
    }
  }, [activeTheme]);

  // Show intro ONLY ONCE per session per festival (not every refresh)
  useEffect(() => {
    if (activeTheme === 'default') return;
    // While still loading on first visit, don't trigger intro
    // (intro will trigger after themeReady becomes true and activeTheme updates)
    if (!themeReady) return;

    const festivalKey = activeTheme;
    if (FESTIVAL_THEMES[festivalKey] && FESTIVAL_THEMES[festivalKey].isFestival) {
      // Check sessionStorage — intro shows only once per browser session
      const INTRO_KEY = 'pradh_intro_shown_' + festivalKey;
      if (sessionStorage.getItem(INTRO_KEY)) return; // Already shown this session

      const timer = setTimeout(() => {
        setIntroFestival(festivalKey);
        setShowIntro(true);
        sessionStorage.setItem(INTRO_KEY, 'true'); // Mark as shown
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeTheme, themeReady]);

  const dismissIntro = () => {
    setShowIntro(false);
    setTimeout(() => setIntroFestival(null), 500);
  };

  return (
    <FestivalContext.Provider
      value={{
        activeTheme,
        themeInfo,
        detectedFestival,
        adminSetting,
        themeReady,
        showIntro,
        introFestival,
        dismissIntro,
      }}
    >
      {children}
    </FestivalContext.Provider>
  );
};
