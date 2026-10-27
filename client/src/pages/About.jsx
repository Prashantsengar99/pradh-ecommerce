import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '/src/styles/about.css';

const About = () => {
  // ============================================
  // SCROLL ANIMATIONS
  // ============================================
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // ============================================
  // COUNTER ANIMATION
  // ============================================
  useEffect(() => {
    const statsSection = document.querySelector('.stats-section');
    if (!statsSection) return;

    const animateCounters = () => {
      const counters = document.querySelectorAll('.stat-item .number');
      counters.forEach((counter) => {
        const target = parseInt(counter.dataset.target);
        if (target === 0) return;

        const duration = 2000;
        const startTime = Date.now();
        const isFloat = target % 1 !== 0;

        const updateCounter = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = eased * target;

          if (isFloat) {
            counter.textContent = current.toFixed(1);
          } else {
            counter.textContent = Math.floor(current);
          }

          if (progress < 1) {
            requestAnimationFrame(updateCounter);
          } else {
            counter.textContent = isFloat ? target.toFixed(1) : target;
          }
        };
        updateCounter();
      });
    };

    const statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounters();
            statsObserver.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );

    statsObserver.observe(statsSection);
    return () => statsObserver.disconnect();
  }, []);

  return (
    <>
     {/* ===== ABOUT HERO ===== */}
<section className="about-hero">
  <div className="hero-glow-orb orb-a"></div>
  <div className="hero-glow-orb orb-b"></div>
  <div className="hero-glow-orb orb-c"></div>

  <div className="hero-particles">
    {[...Array(12)].map((_, i) => (
      <span key={i} style={{ left: `${(i * 8) + Math.random() * 5}%`, animationDelay: `${Math.random() * 8}s`, animationDuration: `${12 + Math.random() * 10}s` }}></span>
    ))}
  </div>

  <div className="about-hero-content">
    <div className="badge"></div>
          <h1>
            The <span className="highlight">PRADH</span> Story
          </h1>
          <p>
            We're on a mission to bring back the <strong>authentic Desi nutrition</strong>
            {' '}— pure, natural, and free from chemicals. Just like our ancestors intended.
          </p>
          <div className="hero-cta">
            <Link to="/products" className="btn-primary">
              <i className="fas fa-shopping-bag"></i> Explore Products
            </Link>
            <a href="#journey" className="btn-secondary">
              <i className="fas fa-arrow-down"></i> Our Journey
            </a>
          </div>
        </div>
      </section>

      {/* ===== MISSION & VISION ===== */}
      <section className="section" id="journey">
        <h2 className="section-title animate-on-scroll">
          Our <span className="highlight">Mission &amp; Vision</span>
        </h2>
        <p className="section-subtitle animate-on-scroll">
          We believe in pure, traditional nutrition that fuels the body naturally.
        </p>

        <div className="mission-vision-grid">
          <div className="mv-card animate-on-scroll">
            <div className="icon">
              <i className="fas fa-rocket"></i>
            </div>
            <h3>Our Mission</h3>
            <p>
              To make <strong>100% natural, traditional nutrition</strong> accessible to every health-conscious
              Indian. We're bridging the gap between ancient wisdom and modern health needs.
            </p>
          </div>
          <div className="mv-card animate-on-scroll">
            <div className="icon">
              <i className="fas fa-eye"></i>
            </div>
            <h3>Our Vision</h3>
            <p>
              To become India's most trusted <strong>Desi nutrition brand</strong> — where purity,
              transparency, and traditional values are the foundation of everything we make.
            </p>
          </div>
        </div>
      </section>

      {/* ===== STORY ===== */}
      <section className="section">
        <div className="story-section animate-on-scroll">
          <div className="story-content">
            <div className="story-text">
              <h2 style={{ color: '#ffffff', fontSize: '24px', marginBottom: '12px' }}>
                The <span style={{ color: 'var(--primary)' }}>Desi Fuel</span> Revolution
              </h2>
              <p>
                At <strong>PRADH</strong>, we're committed to changing how modern India refuels.
                We're bridging the gap between <strong>old-school holistic diet frameworks</strong>
                {' '}and modern high-protein demands.
              </p>
              <p>
                Our signature nutritional mix is <strong>handcrafted</strong> specifically for
                health-conscious consumers who choose <strong>pure fuel</strong> over chemical shortcuts.
              </p>
              <p style={{ marginBottom: 0 }}>
                <strong>Every batch</strong> undergoes traditional sand-roasting processes. This
                maintains essential delicate amino structures, unlocks pristine natural taste profiles,
                and facilitates <strong>effortless gut breakdown</strong> and absorption.
              </p>
            </div>
            <div className="story-image">
              <div className="big-icon">🌾</div>
              <h3>Traditional Slow Roasting</h3>
              <p>Authentic Desi preparation methods</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TIMELINE ===== */}
      <section className="section">
        <h2 className="section-title animate-on-scroll">
          Our <span className="highlight">Journey</span>
        </h2>
        <p className="section-subtitle animate-on-scroll">
          From a small kitchen experiment to India's trusted Desi nutrition brand.
        </p>

        <div className="timeline">
          <div className="timeline-item animate-on-scroll">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <span className="year">2024</span>
              <h4>🌱 The Beginning</h4>
              <p>Started with a simple mission — create a pure, natural health mix using traditional ingredients.</p>
            </div>
          </div>
          <div className="timeline-item animate-on-scroll">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <span className="year">2024</span>
              <h4>🔥 First Batch</h4>
              <p>Our first batch of Desi Fuel was crafted using traditional sand-roasting techniques.</p>
            </div>
          </div>
          <div className="timeline-item animate-on-scroll">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <span className="year">2025</span>
              <h4>🚀 Brand Launch</h4>
              <p>PRADH Desi Fuel officially launched with a mission to bring Desi nutrition to every home.</p>
            </div>
          </div>
          <div className="timeline-item animate-on-scroll">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <span className="year">2025</span>
              <h4>💪 Community Growth</h4>
              <p>Thousands of health-conscious Indians joined the Desi Fuel revolution.</p>
            </div>
          </div>
          <div className="timeline-item animate-on-scroll">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <span className="year">2026</span>
              <h4>⭐ The Future</h4>
              <p>Expanding our range while staying true to our core values — purity, quality, tradition.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== VALUES ===== */}
      <section className="section">
        <h2 className="section-title animate-on-scroll">
          Our <span className="highlight">Core Values</span>
        </h2>
        <p className="section-subtitle animate-on-scroll">
          The principles that guide everything we do.
        </p>

        <div className="values-grid">
          <div className="value-card animate-on-scroll">
            <span className="icon">🌿</span>
            <h4>100% Natural</h4>
            <p>Only wholesome nutritious grains, super-nuts, and natural plant components.</p>
          </div>
          <div className="value-card animate-on-scroll">
            <span className="icon">🚫</span>
            <h4>Zero Refined Sugar</h4>
            <p>No clean eating compromises. Free from harmful processing extracts.</p>
          </div>
          <div className="value-card animate-on-scroll">
            <span className="icon">🔥</span>
            <h4>Traditional Processing</h4>
            <p>Slow sand-roasting techniques preserve essential nutrients and taste.</p>
          </div>
          <div className="value-card animate-on-scroll">
            <span className="icon">💚</span>
            <h4>Transparency</h4>
            <p>100% honest disclosure of ingredients. No hidden additives.</p>
          </div>
          <div className="value-card animate-on-scroll">
            <span className="icon">🌟</span>
            <h4>Quality First</h4>
            <p>Every batch is carefully crafted with premium, select-picked ingredients.</p>
          </div>
          <div className="value-card animate-on-scroll">
            <span className="icon">🤝</span>
            <h4>Customer Trust</h4>
            <p>Building a community of health-conscious Indians who trust our brand.</p>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="section">
        <div className="stats-section animate-on-scroll">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="number" data-target="1500">0</span>
              <span className="label">Happy Customers</span>
            </div>
            <div className="stat-item">
              <span className="number" data-target="100">0</span>
              <span className="label">% Natural Ingredients</span>
            </div>
            <div className="stat-item">
              <span className="number" data-target="5">0</span>
              <span className="label">Premium Blends</span>
            </div>
            <div className="stat-item">
              <span className="number" data-target="4.9">0</span>
              <span className="label">Average Rating ⭐</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PROCESS ===== */}
      <section className="section">
        <h2 className="section-title animate-on-scroll">
          How We Make <span className="highlight">Desi Fuel</span>
        </h2>
        <p className="section-subtitle animate-on-scroll">
          From farm to your table — pure, traditional, and natural.
        </p>

        <div className="process-grid">
          <div className="process-step animate-on-scroll">
            <div className="step-number">1</div>
            <span className="step-icon">🌾</span>
            <h4>Select Ingredients</h4>
            <p>Premium grains, nuts, and Ayurvedic herbs from trusted sources.</p>
          </div>
          <div className="process-step animate-on-scroll">
            <div className="step-number">2</div>
            <span className="step-icon">🔥</span>
            <h4>Traditional Roasting</h4>
            <p>Slow sand-roasting to preserve nutrients and enhance flavor.</p>
          </div>
          <div className="process-step animate-on-scroll">
            <div className="step-number">3</div>
            <span className="step-icon">⚡</span>
            <h4>Precision Grinding</h4>
            <p>Carefully ground to maintain optimal texture and digestion.</p>
          </div>
          <div className="process-step animate-on-scroll">
            <div className="step-number">4</div>
            <span className="step-icon">📦</span>
            <h4>Fresh Packing</h4>
            <p>Hygienically packed to retain freshness and nutritional value.</p>
          </div>
        </div>
      </section>

      {/* ===== FOUNDER ===== */}
      <section className="section">
        <div className="founder-section animate-on-scroll">
          <div className="founder-avatar">
            <i className="fas fa-user"></i>
          </div>
          <div className="founder-info">
            <h3>Pradh Desi Fuel Team</h3>
            <div className="title">💪 Passionate About Desi Nutrition</div>
            <p>
              We're a team of health enthusiasts who believe in the power of
              {' '}<strong>traditional Indian nutrition</strong>. Our mission is to make
              pure, natural, and affordable Desi Fuel available to every Indian who
              wants to live a healthier life.
            </p>
            <p style={{ marginTop: '8px' }}>
              <strong style={{ color: 'var(--primary)' }}>
                "Just Pure Desi Fuel — No Fillers, No Preservatives"
              </strong>
            </p>
          </div>
        </div>
      </section>

      {/* ===== CTA BANNER ===== */}
      <section className="section">
        <div className="cta-banner animate-on-scroll">
          <h2>
            Ready to <span style={{ color: 'var(--primary)' }}>Fuel Your Desi Strength</span>?
          </h2>
          <p>Experience the power of traditional Indian nutrition today.</p>
          <Link to="/products" className="btn-primary">
            <i className="fas fa-shopping-bag"></i> Shop Now
            <i className="fas fa-arrow-right"></i>
          </Link>
        </div>
      </section>
    </>
  );
};

export default About;