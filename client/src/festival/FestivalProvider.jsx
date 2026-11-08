// ============================================================
// 🎨 FESTIVAL PROVIDER — Admin-controlled theme system
// NO user manual override (removed). Only admin controls theme.
// Priority: Admin theme → Auto-detected festival → Default
// ============================================================
import { useState, useEffect, createContext, useContext } from 'react';
import { apiFetch } from '../services/api';
import { FESTIVAL_THEMES, ALL_THEME_KEYS } from './festivalConfig';
import { detectActiveFestival } from './festivalDetector';

const FestivalContext = createContext(null);

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
  const [detectedFestival, setDetectedFestival] = useState(null);
  const [adminTheme, setAdminTheme] = useState(null);
  const [showIntro, setShowIntro] = useState(false);
  const [introFestival, setIntroFestival] = useState(null);

  // On mount: detect festival + fetch admin's global theme
  useEffect(() => {
    // Clean up old localStorage values from removed user selector
    localStorage.removeItem('pradh_theme_mode');
    localStorage.removeItem('pradh_manual_theme');
    localStorage.removeItem('pradh_intro_shown');

    // Detect festival based on calendar
    const detected = detectActiveFestival();
    setDetectedFestival(detected);

    // Fetch admin's global theme setting
    const fetchAdminTheme = async () => {
      try {
        const res = await apiFetch('/api/theme-settings');
        const data = await res.json();
        if (data.success && data.activeTheme) {
          if (data.activeTheme === 'auto') {
            setAdminTheme(null); // Use auto-detection
          } else if (data.activeTheme !== 'default') {
            setAdminTheme(data.activeTheme); // Admin set specific theme
          }
        }
      } catch {
        // Backend not available — use auto detection only
      }
    };
    fetchAdminTheme();
  }, []);

  // Determine active theme:
  // Priority: Admin's specific theme → Auto-detected festival → Default
  const activeTheme = adminTheme || detectedFestival || 'default';
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

  // Show intro on EVERY page load if a festival theme is active
  useEffect(() => {
    if (activeTheme === 'default') return; // No intro for default theme

    const festivalKey = activeTheme;
    if (FESTIVAL_THEMES[festivalKey] && FESTIVAL_THEMES[festivalKey].isFestival) {
      // Delay slightly to let page render first
      const timer = setTimeout(() => {
        setIntroFestival(festivalKey);
        setShowIntro(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeTheme]);

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
        showIntro,
        introFestival,
        dismissIntro,
      }}
    >
      {children}
    </FestivalContext.Provider>
  );
};
