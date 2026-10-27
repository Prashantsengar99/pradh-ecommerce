import { useState, useEffect, useRef } from 'react';
import { FaTimes, FaGift, FaSync, FaCopy, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import toast from 'react-hot-toast';
import './DiscountWheel.css';

const SEGMENTS = [
  { label: '10% OFF', code: 'PRADH10', color: '#f59e0b', textColor: '#ffffff', discount: 10 },
  { label: 'Try Again', code: null, color: '#1e293b', textColor: '#94a3b8', discount: 0 },
  { label: '20% OFF', code: 'PRADH20', color: '#22c55e', textColor: '#ffffff', discount: 20 },
  { label: '5% OFF', code: 'PRADH5', color: '#ef4444', textColor: '#ffffff', discount: 5 },
  { label: 'Try Again', code: null, color: '#1e293b', textColor: '#94a3b8', discount: 0 },
  { label: '15% OFF', code: 'PRADH15', color: '#8b5cf6', textColor: '#ffffff', discount: 15 },
  { label: 'Try Again', code: null, color: '#1e293b', textColor: '#94a3b8', discount: 0 },
  { label: '25% OFF', code: 'PRADH25', color: '#facc15', textColor: '#0f172a', discount: 25 },
];

// Generate celebration sound with Web Audio API (no external file needed)
const playCelebrationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    // Play a happy tune: C-E-G-C (major chord arpeggio)
    const notes = [
      { freq: 523.25, time: 0 },     // C5
      { freq: 659.25, time: 0.12 },  // E5
      { freq: 783.99, time: 0.24 },  // G5
      { freq: 1046.5, time: 0.36 },  // C6
      { freq: 1318.5, time: 0.48 },  // E6
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

    // Add a "sparkle" sound effect
    setTimeout(() => {
      const sparkleOsc = ctx.createOscillator();
      const sparkleGain = ctx.createGain();

      sparkleOsc.type = 'sine';
      sparkleOsc.frequency.setValueAtTime(2000, ctx.currentTime);
      sparkleOsc.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + 0.3);

      sparkleGain.gain.setValueAtTime(0.1, ctx.currentTime);
      sparkleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      sparkleOsc.connect(sparkleGain);
      sparkleGain.connect(ctx.destination);

      sparkleOsc.start();
      sparkleOsc.stop(ctx.currentTime + 0.3);
    }, 600);

    // Cleanup
    setTimeout(() => ctx.close(), 2000);
  } catch (err) {
    console.warn('Sound not available:', err);
  }
};

// Simple tick sound during spin
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
  const wheelRef = useRef(null);
  const tickIntervalRef = useRef(null);

  // Show wheel on first visit
  useEffect(() => {
    const hasSeenWheel = localStorage.getItem('pradh_wheel_seen');
    if (!hasSeenWheel) {
      setTimeout(() => setShow(true), 1000);
    }
  }, []);

  // Cleanup tick interval
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

    // Start ticking sound
    if (soundEnabled) {
      tickIntervalRef.current = setInterval(() => {
        playTickSound();
      }, 150);
    }

    // Random index (bias towards winning)
    const winningIndices = [0, 2, 3, 5, 7]; // indices with codes
    const randomIndex = winningIndices[Math.floor(Math.random() * winningIndices.length)];

    const segmentAngle = 360 / SEGMENTS.length;
    const extraSpins = 6 + Math.floor(Math.random() * 3);
    const targetAngle = extraSpins * 360 + randomIndex * segmentAngle + segmentAngle / 2;

    setRotation(targetAngle);

    // Stop tick sound after 4.4s (before wheel stops)
    setTimeout(() => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    }, 4400);

    setTimeout(() => {
      const wonSegment = SEGMENTS[randomIndex];
      setSpinning(false);

      if (wonSegment.code) {
        setResult(wonSegment);
        setShowCelebration(true);
        localStorage.setItem('pradh_coupon', JSON.stringify(wonSegment));
        localStorage.setItem('pradh_wheel_seen', 'true');

        // Play celebration sound
        if (soundEnabled) {
          playCelebrationSound();
        }

        setTimeout(() => setShowCelebration(false), 5000);
      } else {
        setResult({ label: 'Try Again', code: null, discount: 0 });
        localStorage.setItem('pradh_wheel_seen', 'true');
      }
    }, 4500);
  };

  const copyCoupon = () => {
    if (result?.code) {
      navigator.clipboard.writeText(result.code);
      toast.success('Coupon copied! 🎉');
    }
  };

  const closeResult = () => {
    setShow(false);
    setResult(null);
    setShowCelebration(false);
  };

  if (!show) return null;

  return (
    <>
      {/* CELEBRATION OVERLAY */}
      {showCelebration && (
        <div className="celebration-overlay">
          {/* Balloons */}
          {[...Array(25)].map((_, i) => (
            <div
              key={`balloon-${i}`}
              className="balloon"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
                fontSize: `${30 + Math.random() * 20}px`,
              }}
            >
              {['🎈', '🎈', '🎈', '🎉', '🎊'][i % 5]}
            </div>
          ))}

          {/* Fireworks / Patake */}
          {[...Array(25)].map((_, i) => (
            <div
              key={`firework-${i}`}
              className="firework"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 70}%`,
                animationDelay: `${Math.random() * 3}s`,
                fontSize: `${20 + Math.random() * 25}px`,
              }}
            >
              {['✨', '💥', '⭐', '🌟', '💫', '🎆'][i % 6]}
            </div>
          ))}

          {/* Confetti dots */}
          {[...Array(80)].map((_, i) => (
            <div
              key={`confetti-${i}`}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                background: ['#facc15', '#ef4444', '#22c55e', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6'][i % 7],
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}

          {/* Glow burst */}
          <div className="celebration-glow"></div>
        </div>
      )}

      {/* MODAL */}
      <div className="wheel-overlay" onClick={!spinning && !result ? handleSkip : undefined}>
        <div className="wheel-modal" onClick={(e) => e.stopPropagation()}>
          {/* TOP BAR: Skip + Sound toggle */}
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
            <div className="diwali-lamps">
              <span>🪔</span>
              <span>🎆</span>
              <span>🪔</span>
            </div>
            <h2>
              <span>Diwali Special</span>
            </h2>
            <h3 className="wheel-subtitle">
              Spin & Win up to <strong>25% OFF</strong>!
            </h3>
            <p>Limited time offer 🎇</p>
          </div>

          {/* WHEEL */}
          <div className="wheel-container">
            {/* Top pointer */}
            <div className="wheel-pointer">▼</div>

            {/* Rotating wheel */}
            <div
              ref={wheelRef}
              className={`wheel ${spinning ? 'spinning' : ''}`}
              style={{
                transform: `rotate(${rotation}deg)`,
                transitionDuration: spinning ? '4.5s' : '0s',
              }}
            >
              {SEGMENTS.map((segment, i) => {
                const angle = (360 / SEGMENTS.length) * i;
                const segAngle = 360 / SEGMENTS.length;
                return (
                  <div
                    key={i}
                    className="wheel-segment"
                    style={{
                      transform: `rotate(${angle}deg)`,
                      background: `linear-gradient(135deg, ${segment.color}, ${segment.color}dd)`,
                    }}
                  >
                    <span
                      style={{
                        color: segment.textColor,
                        transform: `rotate(${segAngle / 2}deg) translateY(-90px)`,
                      }}
                    >
                      {segment.label}
                    </span>
                  </div>
                );
              })}

              {/* Wheel center */}
              <div className="wheel-center">
                <div className="wheel-center-inner">🎉</div>
              </div>
            </div>

            {/* Decorative dots around wheel */}
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

          {/* RESULT */}
          {result && (
            <div className={`wheel-result ${result.code ? 'win' : 'lose'}`}>
              {result.code ? (
                <>
                  <div className="result-emoji">🎉</div>
                  <h3>Congratulations!</h3>
                  <p className="result-subtitle">
                    You won <strong>{result.discount}% OFF</strong> 🎊
                  </p>
                  <div className="coupon-code" onClick={copyCoupon}>
                    <span>{result.code}</span>
                    <FaCopy />
                  </div>
                  <p className="coupon-hint">Click to copy • Use at checkout</p>
                  <button className="result-btn" onClick={closeResult}>
                    Start Shopping →
                  </button>
                </>
              ) : (
                <>
                  <div className="result-emoji">😢</div>
                  <h3>Better luck next time!</h3>
                  <p className="result-subtitle">
                    But hey, you still get <strong>5% OFF</strong> with code
                  </p>
                  <div
                    className="coupon-code"
                    onClick={() => {
                      navigator.clipboard.writeText('WELCOME5');
                      toast.success('Coupon copied!');
                    }}
                  >
                    <span>WELCOME5</span>
                    <FaCopy />
                  </div>
                  <button className="result-btn" onClick={closeResult}>
                    Continue →
                  </button>
                </>
              )}
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














//localStorage.removeItem('pradh_wheel_seen')//