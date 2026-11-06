import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import toast from 'react-hot-toast';
import { apiFetch } from '../services/api';
import '../styles/home.css';

const FALLBACK_PRODUCTS = [
  { id: 'p1', name: 'PRADH Desi Fuel Premium', price: 599, originalPrice: 799, category: 'Premium', image: '/product1.jpeg', rating: 4.8, reviews: 127, stock: 50, badge: 'hot' },
  { id: 'p2', name: 'PRADH Desi Fuel Classic', price: 349, originalPrice: 499, category: 'Classic', image: '/product2.jpeg', rating: 4.6, reviews: 89, stock: 35, badge: 'new' },
  { id: 'p3', name: 'PRADH Herbal Immunity Blend', price: 449, originalPrice: 599, category: 'Herbal', image: '/product1.jpeg', rating: 4.7, reviews: 56, stock: 20, badge: null },
  { id: 'p4', name: 'PRADH Combo Pack (2x500gm)', price: 999, originalPrice: 1199, category: 'Combo', image: '/product2.jpeg', rating: 4.9, reviews: 203, stock: 15, badge: 'hot' },
];

const USPS = [
  { icon: '🌿', title: '100% Natural', desc: 'Pure desi ingredients, no chemicals or preservatives.' },
  { icon: '🔥', title: 'Traditional Roasting', desc: 'Slow sand-roasting preserves every nutrient.' },
  { icon: '💪', title: 'Muscle Recovery', desc: 'Ashwagandha & Shatavari for strength and stamina.' },
  { icon: '🚚', title: 'Fast Delivery', desc: 'Free shipping on orders above ₹999. Delivered in 3-5 days.' },
];

const INGREDIENTS = [
  { icon: '🌾', title: 'Roasted Energy Base', desc: 'Skinless Roasted Chana, Split Yellow Moong Dal, Malted Ragi Flour & Rolled Oats.' },
  { icon: '🥜', title: 'Nuts & Superseeds', desc: 'Almond Kernels, Cashews, Walnuts, Fox Nuts, Pumpkin & Sunflower Seeds.' },
  { icon: '🪵', title: 'Ayurvedic Recovery', desc: 'Pure Ashwagandha & Shatavari Powder for strength, stamina, and immunity.' },
  { icon: '🍫', title: 'Natural Flavor', desc: 'Dutch Cocoa, Cardamom, Fennel, Vanilla & Dhaga Mishri (No refined sugar!).' },
];

const STEPS = [
  { icon: '🛒', title: 'Choose Your Blend', desc: 'Pick from Premium, Classic, Herbal, or Combo packs.' },
  { icon: '🚚', title: 'Free & Fast Delivery', desc: 'We deliver to your doorstep in 3-5 business days.' },
  { icon: '💪', title: 'Fuel Your Body', desc: 'Mix 2 tbsp with warm milk and feel the difference.' },
];

const TESTIMONIALS = [
  { text: "Honestly, the best organic supplement I've ever used. It keeps my energy levels solid all day long!", author: 'Vikram Singh', rating: 5 },
  { text: 'The best part is that it has absolutely no refined sugar. The taste is incredibly clean and authentic.', author: 'Dr. Rohan Mehta', rating: 5 },
  { text: 'My entire family loves PRADH Desi Fuel. It has become a daily ritual in our home. Quality is unmatched!', author: 'Priya Sharma', rating: 5 },
];

const FAQS = [
  { q: 'Is PRADH Desi Fuel 100% natural?', a: 'Yes! We use only pure desi ingredients — no chemicals, no preservatives, no refined sugar. Every batch is handcrafted with traditional sand-roasting techniques.' },
  { q: 'How do I consume Desi Fuel?', a: 'Mix 2 tablespoons with 250ml warm milk. Best consumed in the morning or after your workout. You can also add it to smoothies or protein shakes.' },
  { q: 'How long does delivery take?', a: 'Orders are dispatched within 24-48 hours. Delivery takes 3-7 business days depending on your location. Free shipping on orders above ₹999.' },
  { q: 'Can I return the product?', a: 'We accept returns only for products damaged during transit. Please share unboxing video proof within 24 hours of delivery.' },
  { q: 'Is it safe for children and elderly?', a: 'Absolutely! PRADH Desi Fuel is made from natural ingredients. Children above 2 years and elderly can consume it. For specific health conditions, consult your doctor.' },
  { q: 'What makes PRADH different?', a: 'Traditional sand-roasting, zero refined sugar, no whey concentrates, and 100% honest ingredient disclosure. We do not cut corners on quality.' },
];

// ✅ Default announcement settings (fallback if API fails)
const DEFAULT_ANNOUNCEMENT = {
  announcementEnabled: true,
  announcementText: 'Use code PRADH20 for 20% OFF on your first order — Limited time only',
  announcementCoupon: 'PRADH20',
  announcementDiscount: 20,
  ctaEnabled: true,
  ctaTitle: 'Ready to Fuel Your Desi Strength?',
  ctaDesc: 'Use this coupon code and get flat 20% off on your first order.',
};

const Home = () => {
  const [products, setProducts] = useState([]);
  const [productCount, setProductCount] = useState('0+');
  const [customerCount, setCustomerCount] = useState('0+');
  const [typewriterText, setTypewriterText] = useState('');
  const [openFaq, setOpenFaq] = useState(null);
  const [email, setEmail] = useState('');
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);
  const productStageRef = useRef(null);

  // ✅ Announcement + CTA settings from admin panel
  const [announcement, setAnnouncement] = useState(DEFAULT_ANNOUNCEMENT);

  const TEXTS = ['Pure Desi Fuel', 'No Preservatives', '100% Natural Energy', 'Traditional Nutrition'];

  // ✅ Fetch announcement settings from backend (admin-controlled)
  useEffect(() => {
    const loadAnnouncement = async () => {
      try {
        const res = await apiFetch('/api/announcement-settings');
        const data = await res.json();
        if (data.success) {
          setAnnouncement(data);
        }
      } catch (err) {
        console.warn('Announcement settings fetch failed, using defaults:', err);
      }
    };
    loadAnnouncement();
  }, []);

  // Load featured products
  useEffect(() => {
    const loadFeaturedProducts = async () => {
      try {
        const res = await apiFetch('/api/products');
        const data = await res.json();

        if (data.success && data.products?.length > 0) {
          const active = data.products.filter((p) => p.status === 'active' && (p.stock ?? 0) > 0);
          const featured = active.slice(0, 8);

          if (featured.length > 0) {
            const mapped = featured.map((p) => ({
              id: p.id || p._id,
              name: p.name,
              price: parseFloat(p.price),
              category: p.category || 'Premium Blend',
              image: p.image?.startsWith('http') || p.image?.startsWith('/') ? p.image : `/${p.image || 'product1.jpeg'}`,
              badge: p.badge,
            }));
            setProducts(mapped);
            setProductCount(`${active.length}+`);
            return;
          }
        }
        setProducts(FALLBACK_PRODUCTS);
        setProductCount('5+');
      } catch {
        setProducts(FALLBACK_PRODUCTS);
        setProductCount('5+');
      }
    };
    loadFeaturedProducts();
  }, []);

  // Customer counter
  useEffect(() => {
    const target = Math.floor(Math.random() * 500) + 1500;
    let current = 0;
    const step = Math.ceil(target / 50);
    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      setCustomerCount(`${current}+`);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Typewriter
  useEffect(() => {
    let textIndex = 0, charIndex = 0, deleting = false, timeout;
    const type = () => {
      const current = TEXTS[textIndex];
      if (!deleting) {
        setTypewriterText(current.substring(0, charIndex + 1));
        charIndex++;
        if (charIndex === current.length) {
          deleting = true;
          timeout = setTimeout(type, 2000);
          return;
        }
      } else {
        setTypewriterText(current.substring(0, charIndex - 1));
        charIndex--;
        if (charIndex === 0) {
          deleting = false;
          textIndex = (textIndex + 1) % TEXTS.length;
        }
      }
      timeout = setTimeout(type, deleting ? 40 : 100);
    };
    type();
    return () => clearTimeout(timeout);
  }, []);

  // Scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [products]);

  // Mouse-follow parallax
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = window.matchMedia('(min-width: 1025px)').matches;
    if (prefersReduced || !isDesktop || !productStageRef.current) return;

    const handleMove = (e) => {
      const rect = heroRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;
      setParallax({ x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const handleAddToCart = (product) => {
    let cart = [];
    try {
      cart = JSON.parse(localStorage.getItem('cart')) || [];
    } catch {
      cart = [];
    }
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        quantity: 1,
        variant: product.category || '',
        image: product.image,
      });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('storage'));
    toast.success(`${product.name} added to cart! 🛒`);
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    toast.success('Subscribed! Check your inbox 🎉');
    setEmail('');
  };

  return (
    <main className="pf-home">
      {/* ✅ ANNOUNCEMENT BAR — admin controlled (on/off + text) */}
      {announcement.announcementEnabled && (
        <div className="pf-announcement">
          <span className="pf-announcement-text">
            {announcement.announcementText}
          </span>
        </div>
      )}

      {/* HERO */}
      <section className="pf-hero" ref={heroRef}>
        <div className="pf-hero-bg" aria-hidden="true">
          <div className="pf-hero-grain" />
          <div className="pf-hero-orb pf-hero-orb--gold" />
          <div className="pf-hero-orb pf-hero-orb--brown" />
          <svg className="pf-hero-arch" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <circle cx="300" cy="300" r="260" fill="none" stroke="rgba(196,154,69,0.18)" strokeWidth="1.2" />
            <circle cx="300" cy="300" r="220" fill="none" stroke="rgba(196,154,69,0.12)" strokeWidth="1" strokeDasharray="2 8" />
          </svg>
        </div>

        <div className="pf-hero-inner">
          <div className="pf-hero-copy">
            <div className="pf-hero-eyebrow animate-on-scroll">
              <span className="pf-eyebrow-dot" />
              100% Pure Desi Fuel
            </div>

            <h1 className="pf-hero-title animate-on-scroll">
              <span className="pf-hero-title-line">Fuel Your</span>
              <span className="pf-hero-title-accent">Desi Strength</span>
            </h1>

            <p className="pf-hero-tagline animate-on-scroll">
              Just <span className="pf-typewriter">{typewriterText}<span className="pf-caret" /></span>
            </p>

            <p className="pf-hero-desc animate-on-scroll">
              Experience the power of traditional Indian nutrition with PRADH Desi Fuel.
              Crafted from premium roasted grains, nuts, and Ayurvedic herbs for unstoppable energy.
            </p>

            <div className="pf-hero-cta animate-on-scroll">
              <Link to="/products" className="pf-btn pf-btn--primary">
                <span>Shop Now</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link to="/about" className="pf-btn pf-btn--ghost">
                Our Story
              </Link>
            </div>

            <div className="pf-hero-stats animate-on-scroll">
              <div className="pf-stat">
                <span className="pf-stat-num">{productCount}</span>
                <span className="pf-stat-label">Premium Blends</span>
              </div>
              <span className="pf-stat-divider" />
              <div className="pf-stat">
                <span className="pf-stat-num">100%</span>
                <span className="pf-stat-label">Natural Ingredients</span>
              </div>
              <span className="pf-stat-divider" />
              <div className="pf-stat">
                <span className="pf-stat-num">{customerCount}</span>
                <span className="pf-stat-label">Happy Customers</span>
              </div>
            </div>
          </div>

          <div className="pf-hero-stage animate-on-scroll" ref={productStageRef}>
            <div
              className="pf-product-float"
              style={{
                transform: `translate3d(${parallax.x * 18}px, ${parallax.y * 18}px, 0)`,
              }}
            >
              <div className="pf-product-glow" aria-hidden="true" />
              <div className="pf-product-shadow" aria-hidden="true" />
              <img
                src="/product1.jpeg"
                alt="PRADH Desi Fuel premium nutrition pouch"
                className="pf-product-img"
                loading="eager"
                onError={(e) => { e.target.src = '/product2.jpeg'; }}
              />

              <span className="pf-ingredient-accent pf-ingredient-accent--1" aria-hidden="true">🌾</span>
              <span className="pf-ingredient-accent pf-ingredient-accent--2" aria-hidden="true">🥜</span>
              <span className="pf-ingredient-accent pf-ingredient-accent--3" aria-hidden="true">🌿</span>
              <span className="pf-ingredient-accent pf-ingredient-accent--4" aria-hidden="true">🍫</span>
            </div>

            <div className="pf-hero-badge-float" aria-hidden="true">
              <span className="pf-hero-badge-icon">★</span>
              <div>
                <span className="pf-hero-badge-num">4.8</span>
                <span className="pf-hero-badge-label">Rated by 1500+</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <div className="pf-trust">
        <div className="pf-trust-track">
          {[...Array(2)].map((_, i) => (
            <div className="pf-trust-group" key={i}>
              <span className="pf-trust-item"><span className="pf-trust-ico">🚚</span> Free Shipping Above ₹999</span>
              <span className="pf-trust-item"><span className="pf-trust-ico">🛡️</span> 100% Secure Payments</span>
              <span className="pf-trust-item"><span className="pf-trust-ico">🌿</span> 100% Natural Ingredients</span>
              <span className="pf-trust-item"><span className="pf-trust-ico">↩️</span> Easy Returns</span>
              <span className="pf-trust-item"><span className="pf-trust-ico">🎧</span> 24/7 Support</span>
              <span className="pf-trust-item"><span className="pf-trust-ico">★</span> Trusted by 1500+ Indians</span>
            </div>
          ))}
        </div>
      </div>

      {/* USP SECTION */}
      <section className="pf-section pf-usp">
        <div className="pf-section-head">
          <span className="pf-kicker animate-on-scroll">Why PRADH</span>
          <h2 className="pf-section-title animate-on-scroll">
            The Difference You Can <span className="pf-accent">Taste &amp; Feel</span>
          </h2>
          <p className="pf-section-sub animate-on-scroll">
            Every pouch is handcrafted with traditional sand-roasting techniques and honest ingredients.
          </p>
        </div>

        <div className="pf-usp-grid">
          {USPS.map((usp, i) => (
            <article className="pf-usp-card animate-on-scroll" key={i}>
              <div className="pf-usp-ico">{usp.icon}</div>
              <h3 className="pf-usp-title">{usp.title}</h3>
              <p className="pf-usp-desc">{usp.desc}</p>
              <span className="pf-usp-index">0{i + 1}</span>
            </article>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="pf-section pf-products">
        <div className="pf-section-head">
          <span className="pf-kicker animate-on-scroll">Bestsellers</span>
          <h2 className="pf-section-title animate-on-scroll">
            Featured <span className="pf-accent">Health Mixes</span>
          </h2>
          <p className="pf-section-sub animate-on-scroll">
            Discover our most loved traditional nutrition blends.
          </p>
        </div>

        <div className="animate-on-scroll">
          <Swiper
            modules={[Pagination, Autoplay]}
            spaceBetween={20}
            slidesPerView={1}
            loop
            autoplay={{ delay: 3500, disableOnInteraction: false, pauseOnMouseEnter: true }}
            pagination={{ clickable: true, dynamicBullets: true }}
            breakpoints={{
              640: { slidesPerView: 2, spaceBetween: 20 },
              1024: { slidesPerView: 3, spaceBetween: 28 },
            }}
            className="pf-swiper"
          >
            {products.map((product) => (
              <SwiperSlide key={product.id}>
                <article className="pf-product-card">
                  <Link to={`/product/${product.id}`} className="pf-product-link">
                    <div className="pf-product-media">
                      <img
                        src={product.image || '/product1.jpeg'}
                        alt={product.name}
                        loading="lazy"
                        onError={(e) => (e.target.src = '/product1.jpeg')}
                      />
                      {product.badge && (
                        <span className={`pf-product-badge pf-product-badge--${product.badge}`}>
                          {product.badge === 'hot' ? 'Bestseller' : 'New'}
                        </span>
                      )}
                    </div>
                    <div className="pf-product-body">
                      <span className="pf-product-cat">{product.category || 'Premium Blend'}</span>
                      <h3 className="pf-product-name">{product.name}</h3>
                      <div className="pf-product-foot">
                        <span className="pf-product-price">₹{parseFloat(product.price).toFixed(0)}</span>
                        <button
                          className="pf-btn pf-btn--mini"
                          onClick={(e) => {
                            e.preventDefault();
                            handleAddToCart(product);
                          }}
                          aria-label={`Add ${product.name} to cart`}
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </Link>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* INGREDIENTS */}
      <section className="pf-section pf-ingredients">
        <div className="pf-section-head">
          <span className="pf-kicker animate-on-scroll">Honest Disclosure</span>
          <h2 className="pf-section-title animate-on-scroll">
            What Goes Inside <span className="pf-accent">PRADH Desi Fuel</span>?
          </h2>
          <p className="pf-section-sub animate-on-scroll">
            100% Honest Disclosure. Pure Traditional Nutrition Blend.
          </p>
        </div>

        <div className="pf-ingredients-grid animate-on-scroll">
          {INGREDIENTS.map((item, i) => (
            <article className="pf-ingredient-card" key={i}>
              <div className="pf-ingredient-ico">{item.icon}</div>
              <h3 className="pf-ingredient-title">{item.title}</h3>
              <p className="pf-ingredient-desc">{item.desc}</p>
            </article>
          ))}
        </div>

        <div className="pf-ingredient-tags animate-on-scroll">
          <span className="pf-tag pf-tag--green">🌿 Contains Sendha Namak &amp; Herbs</span>
          <span className="pf-tag pf-tag--green">🚫 Zero Preservatives / Pure Veg</span>
        </div>

        <div className="pf-ingredient-download animate-on-scroll">
          <a href="/Ingredients.jpeg" download="Ingredients.jpeg" className="pf-btn pf-btn--outline">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download Original Packet Label
          </a>
          <p className="pf-download-note">Click to download the official back-panel packaging image.</p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="pf-section pf-steps">
        <div className="pf-section-head">
          <span className="pf-kicker animate-on-scroll">Simple Ritual</span>
          <h2 className="pf-section-title animate-on-scroll">
            How It <span className="pf-accent">Works</span>
          </h2>
          <p className="pf-section-sub animate-on-scroll">
            Three simple steps to fuel your body.
          </p>
        </div>

        <div className="pf-steps-grid">
          {STEPS.map((step, i) => (
            <article className="pf-step-card animate-on-scroll" key={i}>
              <div className="pf-step-top">
                <span className="pf-step-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="pf-step-ico">{step.icon}</span>
              </div>
              <h3 className="pf-step-title">{step.title}</h3>
              <p className="pf-step-desc">{step.desc}</p>
              {i < STEPS.length - 1 && <span className="pf-step-connector" aria-hidden="true" />}
            </article>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="pf-section pf-reviews">
        <div className="pf-section-head">
          <span className="pf-kicker animate-on-scroll">Real Stories</span>
          <h2 className="pf-section-title animate-on-scroll">
            What Our <span className="pf-accent">Community Says</span>
          </h2>
          <p className="pf-section-sub animate-on-scroll">
            Real stories from real customers.
          </p>
        </div>

        <div className="pf-reviews-grid animate-on-scroll">
          {TESTIMONIALS.map((t, i) => (
            <article className="pf-review-card" key={i}>
              <div className="pf-review-stars" aria-label={`Rated ${t.rating} out of 5`}>
                {Array.from({ length: t.rating }).map((_, s) => (
                  <span key={s}>★</span>
                ))}
              </div>
              <p className="pf-review-text">"{t.text}"</p>
              <div className="pf-review-author">
                <span className="pf-review-avatar" aria-hidden="true">{t.author.charAt(0)}</span>
                <span className="pf-review-name">{t.author}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ✅ CTA BANNER — admin controlled (on/off + title + desc + coupon) */}
      {announcement.ctaEnabled && (
        <section className="pf-section pf-cta-section">
          <div className="pf-cta-banner animate-on-scroll">
            <div className="pf-cta-inner">
              <span className="pf-kicker pf-kicker--light">First Order Offer</span>
              <h2 className="pf-cta-title">
                {announcement.ctaTitle}
              </h2>
              <p className="pf-cta-desc">
                {announcement.ctaDesc}
              </p>
              <div className="pf-cta-coupon" aria-label={`Coupon code ${announcement.announcementCoupon}`}>
                <span className="pf-cta-coupon-label">CODE</span>
                <span className="pf-cta-coupon-value">{announcement.announcementCoupon}</span>
              </div>
              <Link to="/products" className="pf-btn pf-btn--gold">
                <span>Shop Now</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="pf-section pf-faq">
        <div className="pf-section-head">
          <span className="pf-kicker animate-on-scroll">Help Center</span>
          <h2 className="pf-section-title animate-on-scroll">
            Frequently <span className="pf-accent">Asked Questions</span>
          </h2>
          <p className="pf-section-sub animate-on-scroll">
            Got questions? We've got answers.
          </p>
        </div>

        <div className="pf-faq-list animate-on-scroll">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className={`pf-faq-item ${openFaq === i ? 'open' : ''}`}
            >
              <button
                className="pf-faq-question"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
              >
                <span>{faq.q}</span>
                <span className="pf-faq-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
              <div className="pf-faq-answer">
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="pf-newsletter">
        <div className="pf-newsletter-inner animate-on-scroll">
          <span className="pf-kicker">Stay Connected</span>
          <h2 className="pf-newsletter-title">
            Join the <span className="pf-accent">PRADH Family</span>
          </h2>
          <p className="pf-newsletter-desc">
            Get exclusive offers, health tips &amp; product updates straight to your inbox.
          </p>
          <form className="pf-newsletter-form" onSubmit={handleNewsletterSubmit}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="Email address"
            />
            <button type="submit" className="pf-btn pf-btn--primary">
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default Home;
