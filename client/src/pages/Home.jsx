import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import toast from 'react-hot-toast';
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
  { icon: '🚚', title: 'Fast Delivery', desc: 'Free shipping on orders above ₹499. Delivered in 3-5 days.' },
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
  { q: 'How long does delivery take?', a: 'Orders are dispatched within 24-48 hours. Delivery takes 3-7 business days depending on your location. Free shipping on orders above ₹499.' },
  { q: 'Can I return the product?', a: 'We accept returns only for products damaged during transit. Please share unboxing video proof within 24 hours of delivery.' },
  { q: 'Is it safe for children and elderly?', a: 'Absolutely! PRADH Desi Fuel is made from natural ingredients. Children above 2 years and elderly can consume it. For specific health conditions, consult your doctor.' },
  { q: 'What makes PRADH different?', a: 'Traditional sand-roasting, zero refined sugar, no whey concentrates, and 100% honest ingredient disclosure. We do not cut corners on quality.' },
];

const Home = () => {
  const [products, setProducts] = useState([]);
  const [productCount, setProductCount] = useState('0+');
  const [customerCount, setCustomerCount] = useState('0+');
  const [typewriterText, setTypewriterText] = useState('');
  const [openFaq, setOpenFaq] = useState(null);
  const [email, setEmail] = useState('');
  const heroRef = useRef(null);

  const TEXTS = ['Pure Desi Fuel', 'No Preservatives', '100% Natural Energy', 'Traditional Nutrition'];

  // Load featured products
  useEffect(() => {
    const loadFeaturedProducts = async () => {
      try {
        const res = await fetch('/api/admin/products');
        const data = await res.json();

        if (data.success && data.products?.length > 0) {
          const active = data.products.filter((p) => p.status === 'active' || p.stock > 0);
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

  // Add to cart
  const handleAddToCart = (product) => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
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

  // Newsletter submit
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
    <main>
      {/* ANNOUNCEMENT BAR */}
      <div className="announcement-bar">
        🎉 Use code <span className="coupon-highlight">PRADH20</span> for 20% OFF on your first order! 🔥 Limited time only!
      </div>

      {/* HERO */}
      <section className="hero-premium" ref={heroRef}>
        <div className="hero-bg-animation">
          <div className="circle"></div>
          <div className="circle"></div>
        </div>
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>

        <div className="particle" style={{ left: '10%', top: '20%', animationDuration: '12s' }}></div>
        <div className="particle" style={{ left: '85%', top: '15%', animationDuration: '15s', animationDelay: '2s' }}></div>
        <div className="particle" style={{ left: '20%', top: '70%', animationDuration: '18s', animationDelay: '4s' }}></div>
        <div className="particle" style={{ left: '75%', top: '65%', animationDuration: '14s', animationDelay: '1s' }}></div>
        <div className="particle" style={{ left: '50%', top: '10%', animationDuration: '20s', animationDelay: '3s' }}></div>

        <div className="hero-content-new">
          <div className="hero-badge">
            <i className="fas fa-fire"></i> 100% Pure Desi Fuel
          </div>

          <h1 className="hero-title">
            <span className="highlight-text">Fuel Your</span>
            <span className="highlight">Desi Strength</span>
          </h1>

          <p className="hero-subtitle">
            Just <span className="typewriter-text">{typewriterText}</span>
          </p>

          <p className="hero-description">
            Experience the power of traditional Indian nutrition with PRADH Desi Fuel.
            Crafted from premium roasted grains, nuts, and Ayurvedic herbs for unstoppable energy.
          </p>

          <div className="hero-buttons-new">
            <Link to="/products" className="btn-hero-primary">
              <i className="fas fa-shopping-bag"></i> Shop Now
              <i className="fas fa-arrow-right"></i>
            </Link>
            <Link to="/about" className="btn-hero-secondary">
              <i className="fas fa-play-circle"></i> Our Story
              <i className="fas fa-arrow-right"></i>
            </Link>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">{productCount}</span>
              <span className="stat-label">Premium Blends</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">100%</span>
              <span className="stat-label">Natural Ingredients</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{customerCount}</span>
              <span className="stat-label">Happy Customers</span>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <div className="trust-strip">
        <div className="trust-strip-inner">
          {[...Array(2)].map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: '60px' }}>
              <span className="trust-item-strip"><i className="fas fa-truck"></i> Free Shipping Above ₹499</span>
              <span className="trust-item-strip"><i className="fas fa-shield-alt"></i> 100% Secure Payments</span>
              <span className="trust-item-strip"><i className="fas fa-leaf"></i> 100% Natural Ingredients</span>
              <span className="trust-item-strip"><i className="fas fa-undo"></i> Easy Returns</span>
              <span className="trust-item-strip"><i className="fas fa-headset"></i> 24/7 Support</span>
              <span className="trust-item-strip"><i className="fas fa-star"></i> Trusted by 1500+ Indians</span>
            </div>
          ))}
        </div>
      </div>

      {/* USP SECTION */}
      <section className="usp-section">
        <h2 className="section-title animate-on-scroll">
          Why <span className="highlight">PRADH Desi Fuel</span>?
        </h2>
        <p className="section-subtitle animate-on-scroll">
          The difference you can taste and feel
        </p>

        <div className="usp-grid">
          {USPS.map((usp, i) => (
            <div className="usp-card animate-on-scroll" key={i}>
              <div className="usp-icon">{usp.icon}</div>
              <h3>{usp.title}</h3>
              <p>{usp.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="section">
        <h2 className="section-title animate-on-scroll">
          Featured <span className="highlight">Health Mixes</span>
        </h2>
        <p className="section-subtitle animate-on-scroll">
          Discover our most loved traditional nutrition blends
        </p>

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
            className="mySwiper"
          >
            {products.map((product) => (
              <SwiperSlide key={product.id}>
                <div className="product-card">
                  <Link to={`/product/${product.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                    <div className="product-img-container">
                      <img
                        src={product.image || '/product1.jpeg'}
                        alt={product.name}
                        loading="lazy"
                        onError={(e) => (e.target.src = '/product1.jpeg')}
                      />
                    </div>
                    <div className="product-info">
                      <h3 className="product-title">{product.name}</h3>
                      <p className="product-category">{product.category || 'Premium Blend'}</p>
                      <div className="product-meta">
                        <span className="product-price">₹{parseFloat(product.price).toFixed(0)}</span>
                        <button
                          className="btn-primary"
                          onClick={(e) => {
                            e.preventDefault();
                            handleAddToCart(product);
                          }}
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </Link>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* INGREDIENTS */}
      <section className="section">
        <h2 className="section-title animate-on-scroll">
          🌱 What Goes Inside <span className="highlight">PRADH Desi Fuel</span>?
        </h2>
        <p className="section-subtitle animate-on-scroll">
          100% Honest Disclosure. Pure Traditional Nutrition Blend.
        </p>

        <div className="ingredients-grid animate-on-scroll">
          {INGREDIENTS.map((item, i) => (
            <div className="ingredient-card" key={i}>
              <div className="icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="ingredient-tags animate-on-scroll">
          <span>🌿 Contains Sendha Namak &amp; Herbs</span>
          <span>🚫 Zero Preservatives / Pure Veg</span>
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px' }} className="animate-on-scroll">
          <a href="/Ingredients.jpeg" download="Ingredients.jpeg" className="download-btn">
            <i className="fas fa-download"></i> Download Original Packet Label
          </a>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '12px' }}>
            Click to download the official back-panel packaging image.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works">
        <h2 className="section-title animate-on-scroll">
          How It <span className="highlight">Works</span>
        </h2>
        <p className="section-subtitle animate-on-scroll">
          Three simple steps to fuel your body
        </p>

        <div className="steps-grid">
          {STEPS.map((step, i) => (
            <div className="step-card animate-on-scroll" key={i}>
              <div className="step-number">{i + 1}</div>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>{step.icon}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section">
        <h2 className="section-title animate-on-scroll">
          What Our <span className="highlight">Community Says</span>
        </h2>
        <p className="section-subtitle animate-on-scroll">
          Real stories from real customers
        </p>

        <div className="reviews-grid animate-on-scroll">
          {TESTIMONIALS.map((t, i) => (
            <div className="review-card" key={i}>
              <p>"{t.text}"</p>
              <div className="author">— {t.author}</div>
              <div className="review-stars">{'★'.repeat(t.rating)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <h2 className="section-title animate-on-scroll">
          Frequently <span className="highlight">Asked Questions</span>
        </h2>
        <p className="section-subtitle animate-on-scroll">
          Got questions? We've got answers
        </p>

        <div className="animate-on-scroll">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className={`faq-item ${openFaq === i ? 'open' : ''}`}
            >
              <button
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{faq.q}</span>
                <span className="faq-icon">+</span>
              </button>
              <div className="faq-answer">
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="newsletter-section">
        <h2>
          Join the <span>PRADH Family</span>
        </h2>
        <p>Get exclusive offers, health tips & product updates straight to your inbox</p>
        <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">Subscribe 🎉</button>
        </form>
      </section>

      {/* CTA BANNER */}
      <div className="cta-banner animate-on-scroll">
        <h2>
          Ready to <span className="highlight">Fuel Your Desi Strength</span>?
        </h2>
        <p>Use this coupon code and get flat 20% off on your first order</p>
        <div className="cta-coupon">PRADH20</div>
        <div>
          <Link to="/products" className="btn-hero-primary">
            <i className="fas fa-shopping-bag"></i> Shop Now
            <i className="fas fa-arrow-right"></i>
          </Link>
        </div>
      </div>
    </main>
  );
};

export default Home;