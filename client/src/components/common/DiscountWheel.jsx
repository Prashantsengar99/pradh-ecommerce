import { useState, useEffect, useRef } from 'react';
import {
  FaTimes, FaGift, FaSync, FaCopy, FaVolumeUp, FaVolumeMute,
  FaEnvelope, FaWhatsapp, FaSpinner, FaClock, FaCheckCircle, FaStar,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { apiFetch } from '../../services/api';
import './DiscountWheel.css';

// ============================================
// DEFAULT FALLBACK (single-prize, if API fails)
// ============================================
const DEFAULT_SETTINGS = {
  couponCode: 'PRADH20',
  discountPercent: 20,
  label: '20% OFF',
  enabled: true,
  prizes: [],
  countdownHours: 24,
  requireEmail: true,
};

// Default prizes if admin hasn't configured any (frontend-only fallback)
const DEFAULT_PRIZES = [
  { label: '5% OFF',  code: 'SPIN5',  discount: 5,  weight: 30, color: '#8A5A3C', textColor: '#F8F5EF', isGrandPrize: false },
  { label: '10% OFF', code: 'SPIN10', discount: 10, weight: 25, color: '#A67C2E', textColor: '#FFFFFF', isGrandPrize: false },
  { label: '15% OFF', code: 'SPIN15', discount: 15, weight: 18, color: '#C49A45', textColor: '#FFFFFF', isGrandPrize: false },
  { label: '20% OFF', code: 'PRADH20',discount: 20, weight: 12, color: '#D9B872', textColor: '#39251B', isGrandPrize: false },
  { label: '25% OFF', code: 'SPIN25', discount: 25, weight: 8,  color: '#39251B', textColor: '#F8F5EF', isGrandPrize: false },
  { label: 'FREE GIFT', code: 'GRAND', discount: 100, weight: 2, color: '#b91c1c', textColor: '#FFD700', isGrandPrize: true },
  { label: '10% OFF', code: 'SPIN10', discount: 10, weight: 25, color: '#A67C2E', textColor: '#FFFFFF', isGrandPrize: false },
  { label: '5% OFF',  code: 'SPIN5',  discount: 5,  weight: 30, color: '#8A5A3C', textColor: '#F8F5EF', isGrandPrize: false },
];

// ============================================
// SOUND EFFECTS
// ============================================
const playCelebrationSound = (isGrand = false) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const notes = isGrand
      ? [{ freq: 523.25, time: 0 }, { freq: 659.25, time: 0.1 }, { freq: 783.99, time: 0.2 },
         { freq: 1046.5, time: 0.3 }, { freq: 1318.5, time: 0.4 }, { freq: 1568, time: 0.55 },
         { freq: 2093, time: 0.7 }]
      : [{ freq: 523.25, time: 0 }, { freq: 659.25, time: 0.12 }, { freq: 783.99, time: 0.24 },
         { freq: 1046.5, time: 0.36 }, { freq: 1318.5, time: 0.48 }];

    notes.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + time);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + 0.7);
    });
    setTimeout(() => ctx.close(), 2200);
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
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
    setTimeout(() => ctx.close(), 200);
  } catch (err) {}
};

// ============================================
// WEIGHTED RANDOM PRIZE SELECTION
// ============================================
function pickWeightedPrize(prizes) {
  const totalWeight = prizes.reduce((sum, p) => sum + (p.weight || 1), 0);
  let rand = Math.random() * totalWeight;
  for (let i = 0; i < prizes.length; i++) {
    rand -= (prizes[i].weight || 1);
    if (rand <= 0) return i;
  }
  return prizes.length - 1;
}

// ============================================
// COMPONENT
// ============================================
const DiscountWheel = () => {
  const [show, setShow] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);            // { label, code, discount, isGrandPrize }
  const [showEmailForm, setShowEmailForm] = useState(false); // After spin → ask email
  const [couponRevealed, setCouponRevealed] = useState(false); // After email submit → reveal code
  const [showCelebration, setShowCelebration] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [countdown, setCountdown] = useState({ h: 0, m: 0, s: 0 });

  // Email form state
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  const wheelRef = useRef(null);
  const tickIntervalRef = useRef(null);

  // Use prizes from admin settings, or fallback to DEFAULT_PRIZES
  const prizes = (settings.prizes && settings.prizes.length >= 2)
    ? settings.prizes
    : DEFAULT_PRIZES;

  // ✅ FETCH WHEEL SETTINGS FROM ADMIN
  useEffect(() => {
    const fetchWheelSettings = async () => {
      try {
        const res = await apiFetch('/api/wheel-settings');
        const data = await res.json();
        if (data.success) {
          setSettings({
            couponCode: data.couponCode || 'PRADH20',
            discountPercent: data.discountPercent || 20,
            label: data.label || `${data.discountPercent || 20}% OFF`,
            enabled: data.enabled !== false,
            prizes: data.prizes || [],
            countdownHours: data.countdownHours || 24,
            requireEmail: data.requireEmail !== false,
          });
        }
      } catch (err) {
        console.warn('Wheel settings fetch failed, using defaults:', err);
      } finally {
        setSettingsLoaded(true);
      }
    };
    fetchWheelSettings();
  }, []);

  // Show wheel on first visit (only if enabled)
  useEffect(() => {
    if (!settingsLoaded) return;
    if (!settings.enabled) return;
    const hasSeenWheel = localStorage.getItem('pradh_wheel_seen');
    if (!hasSeenWheel) {
      const timer = setTimeout(() => setShow(true), 1800);
      return () => clearTimeout(timer);
    }
  }, [settingsLoaded, settings.enabled]);

  // 🕒 COUNTDOWN TIMER — set expiry on first wheel show, persist
  useEffect(() => {
    if (!show) return;
    let expiry = localStorage.getItem('pradh_wheel_expiry');
    if (!expiry) {
      expiry = String(Date.now() + settings.countdownHours * 3600 * 1000);
      localStorage.setItem('pradh_wheel_expiry', expiry);
    }
    const tick = () => {
      const remaining = parseInt(expiry, 10) - Date.now();
      if (remaining <= 0) {
        setCountdown({ h: 0, m: 0, s: 0 });
        return;
      }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setCountdown({ h, m, s });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [show, settings.countdownHours]);

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
    setShowEmailForm(false);
    setCouponRevealed(false);

    if (soundEnabled) {
      tickIntervalRef.current = setInterval(() => playTickSound(), 150);
    }

    const numSegments = prizes.length;
    const winnerIndex = pickWeightedPrize(prizes);

    const segmentAngle = 360 / numSegments;
    const extraSpins = 6 + Math.floor(Math.random() * 3);
    // Pointer is at TOP (12 o'clock = 0deg). Wheel rotates clockwise.
    // To bring segment `winnerIndex` to the top, we need to rotate by:
    //   extraSpins * 360 - (winnerIndex * segmentAngle + segmentAngle/2)
    const targetAngle = extraSpins * 360 - (winnerIndex * segmentAngle + segmentAngle / 2);

    // 🛠️ SPIN FIX (bulletproof): Apply rotation in the NEXT animation frame.
    // Double rAF guarantees the browser paints the "spinning" class first,
    // THEN applies the new transform value in a separate frame — so the CSS
    // transition fires reliably on every browser. Without this, React batches
    // setSpinning + setRotation into one render and some engines skip the
    // transition (MDN: "Transition effects are not applied when the transition
    // property is changed in the same frame").
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setRotation(targetAngle);
      });
    });

    setTimeout(() => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    }, 4400);

    // ✅ Reveal prize based on actual weighted random selection
    setTimeout(() => {
      const wonPrize = prizes[winnerIndex];
      setSpinning(false);
      setResult(wonPrize);
      setShowCelebration(true);
      localStorage.setItem('pradh_coupon', JSON.stringify(wonPrize));
      localStorage.setItem('pradh_wheel_seen', 'true');

      if (soundEnabled) {
        playCelebrationSound(wonPrize.isGrandPrize);
      }

      // If requireEmail is on → show email form before revealing code
      if (settings.requireEmail) {
        setTimeout(() => setShowEmailForm(true), 2500);
      } else {
        setCouponRevealed(true);
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

  const shareOnWhatsApp = () => {
    const text = `🎮 I just spun the PRADH Desi Fuel wheel and won ${result?.label}! Spin yours: ${window.location.origin}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const submitEmail = async (e) => {
    e.preventDefault();
    if (!emailInput.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      toast.error('Please enter a valid email');
      return;
    }
    setEmailSubmitting(true);
    try {
      const res = await apiFetch('/api/wheel/email-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim(),
          phone: phoneInput.trim(),
          prizeWon: result?.label || '',
          couponCode: result?.code || '',
          discountPercent: result?.discount || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('🎉 Coupon unlocked!');
        setCouponRevealed(true);
        setShowEmailForm(false);
      } else {
        toast.error(data.error || 'Failed to save email');
      }
    } catch (err) {
      // Backend down — still reveal coupon (don't block user)
      console.warn('Email capture failed (network):', err);
      toast('Coupon unlocked (offline mode)', { icon: '✅' });
      setCouponRevealed(true);
      setShowEmailForm(false);
    } finally {
      setEmailSubmitting(false);
    }
  };

  const skipEmail = () => {
    setCouponRevealed(true);
    setShowEmailForm(false);
    toast('You can still spin later, but email helps you save the code!', { icon: '💡' });
  };

  const closeResult = () => {
    setShow(false);
    setResult(null);
    setShowEmailForm(false);
    setCouponRevealed(false);
  };

  if (!settingsLoaded || !show || !settings.enabled) return null;

  const segmentAngle = 360 / prizes.length;
  const countdownStr = `${String(countdown.h).padStart(2, '0')}:${String(countdown.m).padStart(2, '0')}:${String(countdown.s).padStart(2, '0')}`;

  return (
    <>
      {/* CELEBRATION OVERLAY */}
      {showCelebration && (
        <div className={`celebration-overlay ${result?.isGrandPrize ? 'grand-prize' : ''}`}>
          {/* 🚀 PERF: Reduced from 20 → 12 balloons for smoother animation */}
          {[...Array(12)].map((_, i) => (
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
          {/* 🚀 PERF: Reduced from 60/100 → 40/60 confetti for smoother FPS */}
          {[...Array(result?.isGrandPrize ? 60 : 40)].map((_, i) => (
            <div
              key={`confetti-${i}`}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                background: result?.isGrandPrize
                  ? ['#FFD700', '#FFA500', '#FF6B35', '#C49A45', '#FFEC8B'][i % 5]
                  : ['#C49A45', '#A67C2E', '#D9B872', '#8A5A3C', '#39251B'][i % 5],
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
            <div className="countdown-pill" title="Offer expires soon — spin now!">
              <FaClock /> <span>{countdownStr}</span>
            </div>
            <div className="top-bar-actions">
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
          </div>

          {/* HEADER */}
          <div className="wheel-header">
            <div className="wheel-icon">🎁</div>
            <h2>Spin &amp; Win</h2>
            <p className="wheel-subtitle">
              Win up to <strong>{Math.max(...prizes.map(p => p.discount))}% OFF</strong>
              {prizes.some(p => p.isGrandPrize) && <span> + Grand Prize!</span>}
            </p>
            <p className="wheel-tagline">Spin the wheel — your luck, your discount</p>
          </div>

          {/* WHEEL */}
          <div className="wheel-container">
            <div className="wheel-pointer-wrap">
              <div className="wheel-pointer">▼</div>
              <div className="wheel-pointer-shadow"></div>
            </div>

            <div className="wheel-glow-ring"></div>

            <div
              ref={wheelRef}
              className={`wheel ${spinning ? 'spinning' : ''}`}
              style={{
                transform: `rotate(${rotation}deg)`,
                // 🛠️ SPIN FIX: Do NOT toggle transitionDuration here.
                // Changing the transition property in the same frame as the
                // transform value causes the browser to SKIP the animation
                // (MDN: "Transition effects are not applied when the transition
                // property is changed"). The transition is defined once in CSS
                // (.wheel { transition: transform 4.5s ... }) and stays active.
                willChange: 'transform',
                translateZ: 0,
                backfaceVisibility: 'hidden',
              }}
            >
              {prizes.map((seg, i) => {
                const angle = segmentAngle * i;
                return (
                  <div
                    key={i}
                    className={`wheel-segment ${seg.isGrandPrize ? 'grand-prize-seg' : ''}`}
                    style={{
                      transform: `rotate(${angle}deg)`,
                      background: seg.isGrandPrize
                        ? `linear-gradient(135deg, #b91c1c, #7f1d1d)`
                        : `linear-gradient(135deg, ${seg.color}, ${seg.color}cc)`,
                      borderColor: seg.isGrandPrize ? '#FFD700' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <span
                      style={{
                        color: seg.textColor,
                        transform: `rotate(${segmentAngle / 2}deg) translateY(-95px)`,
                        textShadow: seg.isGrandPrize ? '0 0 8px rgba(255,215,0,0.8)' : '0 1px 2px rgba(0,0,0,0.3)',
                      }}
                    >
                      {seg.isGrandPrize && <FaStar className="grand-star" />}
                      {seg.label}
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

          {/* EMAIL CAPTURE FORM (after spin, before reveal) */}
          {showEmailForm && !couponRevealed && (
            <div className="email-capture-card">
              <div className="email-icon"><FaEnvelope /></div>
              <h3>Save Your Coupon!</h3>
              <p className="email-subtitle">
                You won <strong>{result?.label}</strong>! Enter email to reveal code + save it for later.
              </p>
              <form onSubmit={submitEmail} className="email-form">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                  autoFocus
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                />
                <button type="submit" className="email-submit-btn" disabled={emailSubmitting}>
                  {emailSubmitting ? (
                    <><FaSpinner className="spin-icon" /> Saving...</>
                  ) : (
                    <><FaEnvelope /> Reveal My Coupon →</>
                  )}
                </button>
                <button type="button" className="email-skip-btn" onClick={skipEmail}>
                  No thanks, just show code
                </button>
              </form>
              <p className="email-trust-note">
                🔒 Your email is safe. We'll only use it to send your coupon + product updates.
              </p>
            </div>
          )}

          {/* RESULT — revealed coupon */}
          {result && couponRevealed && (
            <div className={`wheel-result win ${result.isGrandPrize ? 'grand-prize-result' : ''}`}>
              <div className="result-emoji">{result.isGrandPrize ? '🏆' : '🎉'}</div>
              <h3>{result.isGrandPrize ? 'JACKPOT!' : 'Congratulations!'}</h3>
              <p className="result-subtitle">
                You won <strong>{result.label}</strong> 🎊
              </p>
              <div className="coupon-code" onClick={copyCoupon}>
                <span>{result.code}</span>
                <FaCopy />
              </div>
              <p className="coupon-hint">Click to copy • Use at checkout</p>
              <div className="result-actions">
                <button className="share-btn" onClick={shareOnWhatsApp}>
                  <FaWhatsapp /> Share
                </button>
                <button className="result-btn" onClick={closeResult}>
                  Start Shopping →
                </button>
              </div>
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