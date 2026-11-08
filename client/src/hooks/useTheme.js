// ============================================================
// 🎨 useTheme Hook — Fetches active theme from backend
// and applies it to <body> as a CSS class.
// ============================================================
import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

const VALID_THEMES = ['default', 'diwali', 'holi', 'rakshabandhan', 'independence', 'christmas'];

// Theme metadata for display
export const THEME_INFO = {
  default: {
    name: 'Default',
    icon: '🌿',
    desc: 'Warm Editorial Luxury',
    emoji: '🌿',
  },
  diwali: {
    name: 'Diwali',
    icon: '🪔',
    desc: 'Festival of Lights',
    emoji: '🪔',
  },
  holi: {
    name: 'Holi',
    icon: '🎨',
    desc: 'Festival of Colors',
    emoji: '🎨',
  },
  rakshabandhan: {
    name: 'Rakshabandhan',
    icon: '🧵',
    desc: 'Bond of Protection',
    emoji: '🧵',
  },
  independence: {
    name: 'Independence Day',
    icon: '🇮🇳',
    desc: 'Tiranga Tricolor',
    emoji: '🇮🇳',
  },
  christmas: {
    name: 'Christmas',
    icon: '🎄',
    desc: 'Joy & Snow',
    emoji: '🎄',
  },
};

export const useTheme = () => {
  const [activeTheme, setActiveTheme] = useState('default');
  const [loading, setLoading] = useState(true);

  // Fetch theme on mount
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const res = await apiFetch('/api/theme-settings');
        const data = await res.json();
        if (data.success && VALID_THEMES.includes(data.activeTheme)) {
          setActiveTheme(data.activeTheme);
        }
      } catch (err) {
        // Silently use default — don't break the site
        console.log('[Theme] Using default theme (fetch failed)');
      } finally {
        setLoading(false);
      }
    };
    fetchTheme();
  }, []);

  // Apply theme class to <body> whenever activeTheme changes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;

    // Remove all theme classes
    VALID_THEMES.forEach((theme) => {
      body.classList.remove(`theme-${theme}`);
    });

    // Add active theme class
    body.classList.add(`theme-${activeTheme}`);

    // Also update the meta theme-color for mobile browsers
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      const colors = {
        default: '#39251B',
        diwali: '#8B0000',
        holi: '#FF1493',
        rakshabandhan: '#DC143C',
        independence: '#FF9933',
        christmas: '#006400',
      };
      themeColorMeta.setAttribute('content', colors[activeTheme] || colors.default);
    }
  }, [activeTheme]);

  return { activeTheme, setActiveTheme, loading };
};
