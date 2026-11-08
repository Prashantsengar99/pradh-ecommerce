// ============================================================
// 🎨 FESTIVAL THEME SELECTOR — User-facing theme picker
// Floating button + modal with all 12 themes + Auto mode
// ============================================================
import { useState } from 'react';
import { FaPalette, FaTimes, FaCheck, FaMagic } from 'react-icons/fa';
import { useFestival } from './FestivalProvider';
import { FESTIVAL_THEMES, FESTIVAL_ONLY_KEYS } from './festivalConfig';

const FestivalThemeSelector = () => {
  const { activeTheme, isAutoMode, detectedFestival, setManualTheme, setAutoMode } = useFestival();
  const [open, setOpen] = useState(false);

  // Don't show selector on admin pages
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      {/* Floating button */}
      <button
        className="theme-selector-fab"
        onClick={() => setOpen(true)}
        title="Change Festival Theme"
        aria-label="Change theme"
      >
        🎨
      </button>

      {/* Modal */}
      {open && (
        <div className="theme-selector-modal" onClick={() => setOpen(false)}>
          <div className="theme-selector-content" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--pf-chocolate)', margin: 0 }}>
                  🎨 Festival Themes
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--pf-text-muted)', margin: '4px 0 0' }}>
                  Choose your favorite festival theme
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--pf-text-muted)' }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Auto Mode toggle */}
            <div
              style={{
                marginBottom: '16px', padding: '14px', borderRadius: '12px',
                background: isAutoMode ? 'rgba(139,92,246,0.1)' : 'var(--pf-cream)',
                border: `2px solid ${isAutoMode ? '#8b5cf6' : 'var(--pf-border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
              }}
              onClick={() => !isAutoMode && setAutoMode()}
            >
              <div>
                <div style={{ fontWeight: 700, color: 'var(--pf-chocolate)', fontSize: '14px' }}>
                  <FaMagic style={{ marginRight: '6px', color: '#8b5cf6' }} />
                  Auto Mode {isAutoMode && '(Active)'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--pf-text-muted)', marginTop: '2px' }}>
                  {detectedFestival
                    ? `Currently celebrating ${FESTIVAL_THEMES[detectedFestival]?.name || ''}`
                    : 'Automatically activates festival themes on their dates'}
                </div>
              </div>
              {isAutoMode && <FaCheck style={{ color: '#8b5cf6', fontSize: '18px' }} />}
            </div>

            {/* Theme grid */}
            <div className="theme-grid" style={{ marginBottom: '16px' }}>
              {/* Default theme */}
              <div
                className={`theme-card ${activeTheme === 'default' && !isAutoMode ? 'active' : ''}`}
                onClick={() => setManualTheme('default')}
                style={{ cursor: 'pointer' }}
              >
                {activeTheme === 'default' && !isAutoMode && (
                  <span className="theme-active-badge"><FaCheck /> Selected</span>
                )}
                <div className="theme-preview theme-preview-default">{FESTIVAL_THEMES.default.emoji}</div>
                <div className="theme-info">
                  <div className="theme-name">{FESTIVAL_THEMES.default.name}</div>
                  <div className="theme-desc">{FESTIVAL_THEMES.default.tagline}</div>
                </div>
              </div>

              {/* Festival themes */}
              {FESTIVAL_ONLY_KEYS.map((key) => {
                const theme = FESTIVAL_THEMES[key];
                const isActive = activeTheme === key && !isAutoMode;
                const isDetected = detectedFestival === key;
                return (
                  <div
                    key={key}
                    className={`theme-card ${isActive ? 'active' : ''}`}
                    onClick={() => setManualTheme(key)}
                    style={{ cursor: 'pointer' }}
                  >
                    {isActive && <span className="theme-active-badge"><FaCheck /> Selected</span>}
                    {isDetected && isAutoMode && <span className="theme-auto-badge">Auto</span>}
                    <div className={`theme-preview theme-preview-${key}`}>{theme.emoji}</div>
                    <div className="theme-info">
                      <div className="theme-name">{theme.name}</div>
                      <div className="theme-desc">{theme.tagline}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer info */}
            <div style={{ fontSize: '11px', color: 'var(--pf-text-muted)', textAlign: 'center', padding: '8px 0' }}>
              {isAutoMode
                ? 'Auto Mode is active — themes change automatically with festivals'
                : `Manual theme: ${FESTIVAL_THEMES[activeTheme]?.name || 'Default'}. Switch to Auto Mode for automatic festival themes.`
              }
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FestivalThemeSelector;
