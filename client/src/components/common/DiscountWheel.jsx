import { useState, useEffect, useRef } from 'react';
import { FaTimes, FaGift, FaSync, FaCopy, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { apiFetch } from '../../services/api';
import './DiscountWheel.css';

// ============================================
// DEFAULT FALLBACK (if API fails)
// ============================================
const DEFAULT_SETTINGS = {
  couponCode: 'PRADH20',
  discountPercent: 20,
  label: '20% OFF',
  enabled: true,
};

// Wheel colors — warm theme (alternating chocolate/gold)
const WHEEL_COLORS = [
  { color: '#39251B', textColor: '#F8F5EF' },
  { color: '#C49A45', textColor: '#FFFFFF' },
  { color: '#A67C2E', textColor: '#FFFFFF' },
  { color: '#8A5A3C', textColor: '#F8F5EF' },
  { color: '#39251B', textColor: '#F8F5EF' },
  { color: '#C49A45', textColor: '#FFFFFF' },
  { color: '#A67C2E', textColor: '#FFFFFF' },
  { color: '#8A5A3C', textColor: '#F8F5EF' },
];

// Celebration sound
const playCelebrationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const notes = [
      { freq: 523.25, time: 0 },
      { freq: 659.25, time: 0.12 },
      { freq: 783.99, time: 0.24 },
      { freq: 1046.5, time: 0.36 },
      { freq: 1318.5, time: 0.48 },
    ];

    notes.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + time);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + 0.7);
    });

    setTimeout(() => ctx.close(), 2000);
  } catch (err) {
    console.warn('Sound not available:', err);
  }
};

const playTickSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
    setTimeout(() => ctx.close(), 200);
  } catch (err) {}
};

const DiscountWheel = () => {
  const [show, setShow] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [wheelSettings, setWheelSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const wheelRef = useRef(null);
  const tickIntervalRef = useRef(null);

  // ✅ FETCH WHEEL SETTINGS FROM ADMIN PANEL (API)
  useEffect(() => {
    const fetchWheelSettings = async () => {
      try {
        const res = await apiFetch('/api/wheel-settings');
        const data = await res.json();
        if (data.success) {
          setWheelSettings({
            couponCode: data.couponCode || 'PRADH20',
            discountPercent: data.discountPercent || 20,
            label: data.label || `${data.discountPercent || 20}% OFF`,
            enabled: data.enabled !== false,
          });
        }
      } catch (err) {
        console.warn('Wheel settings fetch failed, using defaults:', err);
        // Keep default settings
      } finally {
        setSettingsLoaded(true);
      }
    };
    fetchWheelSettings();
  }, []);

  // Show wheel on first visit (only if enabled in admin settings)
  useEffect(() => {
    if (!settingsLoaded) return;
    if (!wheelSettings.enabled) return; // Admin disabled the wheel

    const hasSeenWheel = localStorage.getItem('pradh_wheel_seen');
    if (!hasSeenWheel) {
      setTimeout(() => setShow(true), 1500);
    }
  }, [settingsLoaded, wheelSettings.enabled]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, []);

  const handleSkip = () => {
    localStorage.setItem('pradh_wheel_seen', 'true');
    setShow(false);
  };

  const spinWheel = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    if (soundEnabled) {
      tickIntervalRef.current = setInterval(() => {
        playTickSound();
      }, 150);
    }

    const numSegments = WHEEL_COLORS.length;
    const randomIndex = Math.floor(Math.random() * numSegments);

    const segmentAngle = 360 / numSegments;
    const extraSpins = 6 + Math.floor(Math.random() * 3);
    const targetAngle = extraSpins * 360 + randomIndex * segmentAngle + segmentAngle / 2;

    setRotation(targetAngle);

    setTimeout(() => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    }, 4400);

    // ✅ ALWAYS show the admin-configured coupon
    setTimeout(() => {
      setSpinning(false);
      setResult({
        label: wheelSettings.label,
        code: wheelSettings.couponCode,
        discount: wheelSettings.discountPercent,
      });
      setShowCelebration(true);
      localStorage.setItem('pradh_coupon', JSON.stringify({
        label: wheelSettings.label,
        code: wheelSettings.couponCode,
        discount: wheelSettings.discountPercent,
      }));
      localStorage.setItem('pradh_wheel_seen', 'true');

      if (soundEnabled) {
        playCelebrationSound();
      }

      setTimeout(() => setShowCelebration(false), 5000);
    }, 4500);
  };

  const copyCoupon = () => {
    if (result?.code) {
      navigator.clipboard.writeText(result.code);
      toast.success(`Coupon ${result.code} copied! 🎉`);
    }
  };

  const closeResult = () => {
    setShow(false);
    setResult(null);
    setShowCelebration(false);
  };

  // Don't render if settings not loaded or wheel disabled
  if (!settingsLoaded || !show || !wheelSettings.enabled) return null;

  return (
    <>
      {/* CELEBRATION OVERLAY */}
      {showCelebration && (
        <div className="celebration-overlay">
          {[...Array(20)].map((_, i) => (
            <div
              key={`balloon-${i}`}
              className="balloon"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
                fontSize: `${28 + Math.random() * 16}px`,
              }}
            >
              {['🎉', '🎊', '✨', '⭐'][i % 4]}
            </div>
          ))}

          {[...Array(60)].map((_, i) => (
            <div
              key={`confetti-${i}`}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                background: ['#C49A45', '#A67C2E', '#D9B872', '#8A5A3C', '#39251B'][i % 5],
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}

          <div className="celebration-glow"></div>
        </div>
      )}

      {/* MODAL */}
      <div className="wheel-overlay" onClick={!spinning && !result ? handleSkip : undefined}>
        <div className="wheel-modal" onClick={(e) => e.stopPropagation()}>
          {/* TOP BAR */}
          <div className="wheel-top-bar">
            <button
              className="wheel-sound-btn"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            >
              {soundEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
            </button>
            <button className="wheel-skip-btn" onClick={handleSkip} disabled={spinning}>
              <FaTimes /> Skip
            </button>
          </div>

          {/* HEADER */}
          <div className="wheel-header">
            <div className="wheel-icon">🎁</div>
            <h2>Spin &amp; Win</h2>
            <p className="wheel-subtitle">
              You're guaranteed <strong>{wheelSettings.discountPercent}% OFF</strong>!
            </p>
            <p className="wheel-tagline">Spin the wheel to reveal your coupon</p>
          </div>

          {/* WHEEL — all segments show admin-configured label */}
          <div className="wheel-container">
            <div className="wheel-pointer">▼</div>

            <div
              ref={wheelRef}
              className={`wheel ${spinning ? 'spinning' : ''}`}
              style={{
                transform: `rotate(${rotation}deg)`,
                transitionDuration: spinning ? '4.5s' : '0s',
              }}
            >
              {WHEEL_COLORS.map((seg, i) => {
                const angle = (360 / WHEEL_COLORS.length) * i;
                const segAngle = 360 / WHEEL_COLORS.length;
                return (
                  <div
                    key={i}
                    className="wheel-segment"
                    style={{
                      transform: `rotate(${angle}deg)`,
                      background: seg.color,
                    }}
                  >
                    <span
                      style={{
                        color: seg.textColor,
                        transform: `rotate(${segAngle / 2}deg) translateY(-90px)`,
                      }}
                    >
                      {wheelSettings.label}
                    </span>
                  </div>
                );
              })}

              <div className="wheel-center">
                <div className="wheel-center-inner">🎁</div>
              </div>
            </div>

            <div className="wheel-dots">
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className="wheel-dot"
                  style={{
                    transform: `rotate(${(360 / 16) * i}deg) translateY(-150px)`,
                  }}
                ></div>
              ))}
            </div>
          </div>

          {/* RESULT — shows admin-configured coupon */}
          {result && (
            <div className="wheel-result win">
              <div className="result-emoji">🎉</div>
              <h3>Congratulations!</h3>
              <p className="result-subtitle">
                You won <strong>{wheelSettings.discountPercent}% OFF</strong> 🎊
              </p>
              <div className="coupon-code" onClick={copyCoupon}>
                <span>{wheelSettings.couponCode}</span>
                <FaCopy />
              </div>
              <p className="coupon-hint">Click to copy • Use at checkout</p>
              <button className="result-btn" onClick={closeResult}>
                Start Shopping →
              </button>
            </div>
          )}

          {/* SPIN BUTTON */}
          {!result && (
            <button className="spin-btn" onClick={spinWheel} disabled={spinning}>
              {spinning ? (
                <>
                  <FaSync className="spin-icon" /> Spinning...
                </>
              ) : (
                <>
                  <FaGift /> Spin to Win!
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default DiscountWheel;
