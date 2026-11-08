// ============================================================
// 🎬 FESTIVAL INTRO — Cinematic 8-10 second intro animation
// Shows once per festival per day. Skip button available.
// ============================================================
import { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { useFestival } from './FestivalProvider';
import { FESTIVAL_THEMES, INTRO_DURATION } from './festivalConfig';

const FestivalIntro = () => {
  const { showIntro, introFestival, dismissIntro } = useFestival();
  const [skipping, setSkipping] = useState(false);
  const [particles, setParticles] = useState([]);

  const theme = introFestival ? FESTIVAL_THEMES[introFestival] : null;

  // Generate decorative particles based on festival
  useEffect(() => {
    if (!showIntro || !theme) return;

    // Check reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Skip intro entirely for reduced motion users
      dismissIntro();
      return;
    }

    // Generate 15 particles
    const colors = {
      diwali: ['#FFD700', '#FF6B35', '#FFA500'],
      holi: ['#FF1493', '#00BFFF', '#FFD700', '#32CD32', '#FF69B4'],
      christmas: ['#FFFFFF', '#FFD700'],
      navratri: ['#DC143C', '#FF8C00', '#DAA520', '#8B008B'],
      durga: ['#DC143C', '#DAA520', '#FFFFFF'],
      lohri: ['#E25822', '#FFB347', '#FFD700'],
      sankranti: ['#87CEEB', '#FFD700', '#FF8C00'],
      ganesh: ['#FF8C00', '#DAA520', '#FFD700'],
      janmashtami: ['#1e3a8a', '#DAA520', '#0c4a6e'],
      rakhi: ['#FFB6C1', '#DC143C', '#DAA520'],
      republic: ['#FF9933', '#FFFFFF', '#138808'],
      independence: ['#FF9933', '#FFFFFF', '#138808'],
    };

    const themeColors = colors[introFestival] || ['#FFD700'];
    const newParticles = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 4 + Math.random() * 8,
      color: themeColors[Math.floor(Math.random() * themeColors.length)],
      duration: 4 + Math.random() * 4,
      delay: Math.random() * 3,
    }));
    setParticles(newParticles);

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      handleSkip();
    }, INTRO_DURATION);

    return () => clearTimeout(timer);
  }, [showIntro, introFestival]);

  const handleSkip = () => {
    if (skipping) return;
    setSkipping(true);
    setTimeout(() => {
      dismissIntro();
      setSkipping(false);
    }, 500);
  };

  if (!showIntro || !theme) return null;

  return (
    <div
      className={`festival-intro-overlay intro-${introFestival} ${skipping ? 'skip' : ''}`}
      onClick={handleSkip}
    >
      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="festival-intro-particle"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
        />
      ))}

      {/* Main content */}
      <div className="festival-intro-content">
        {/* Festival emoji */}
        <div className="festival-intro-emoji">{theme.emoji}</div>

        {/* Festival name + greeting */}
        <h1 className="festival-intro-greeting">{theme.greeting}</h1>

        {/* Brand logo */}
        <div className="festival-intro-logo">PRADH DESI FUEL</div>

        {/* Tagline */}
        <p className="festival-intro-tagline">{theme.tagline}</p>
      </div>

      {/* Skip button */}
      <button className="festival-intro-skip" onClick={(e) => { e.stopPropagation(); handleSkip(); }}>
        Skip Intro →
      </button>
    </div>
  );
};

export default FestivalIntro;
