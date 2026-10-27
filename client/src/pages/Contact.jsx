import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import '/src/styles/contact.css';

const Contact = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnForm, setReturnForm] = useState({
    name: '',
    email: '',
    phone: '',
    orderId: '',
    productName: '',
    reason: 'damaged',
    requestType: 'return',
    issueDate: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [userOrders, setUserOrders] = useState([]);

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

  useEffect(() => {
    if (showReturnModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showReturnModal]);

  // Auto-fill user info + fetch user orders if logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!token || !user) return;

    setReturnForm((prev) => ({
      ...prev,
      name: user.username || user.name || '',
      email: user.email || '',
      phone: user.phone || '',
    }));

    // Fetch user orders for dropdown
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/auth/orders', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setUserOrders(data.orders || []);
      } catch (err) {
        console.warn('Orders fetch failed:', err);
      }
    };
    fetchOrders();
  }, []);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleReturnChange = (e) => {
    const { name, value } = e.target;
    setReturnForm({ ...returnForm, [name]: value });
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();

    if (!returnForm.name || !returnForm.phone || !returnForm.orderId || !returnForm.description) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/return-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(returnForm),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('✅ Request submitted! We will contact you on WhatsApp within 24 hours.');
        setShowReturnModal(false);
        setReturnForm({
          name: '', email: '', phone: '', orderId: '', productName: '',
          reason: 'damaged', requestType: 'return', issueDate: '', description: '',
        });
      } else {
        toast.error(data.message || 'Failed to submit request');
      }
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const faqs = [
    { q: 'How long does delivery take?', a: "Orders are dispatched within 24-48 hours. Delivery takes 3-7 business days depending on your location. You'll receive a tracking link once your order is shipped." },
    { q: 'Do you offer Cash on Delivery?', a: 'Yes! We offer Cash on Delivery (COD) on all orders. You can also pay online via UPI, Cards, or Net Banking.' },
    { q: 'Can I return a product?', a: 'We accept returns only for products damaged during transit. You must provide unboxing video proof within 24 hours of delivery via email or WhatsApp.' },
    { q: 'How do I contact customer support?', a: 'You can reach us via WhatsApp at +91 89799 93655, email at pradhfoods@gmail.com, or through our Instagram DM. We respond within 12 hours.' },
  ];

  const socialLinks = [
    { name: 'Instagram', handle: '@pradhfoods', url: 'https://www.instagram.com/pradhfoods?igsh=MTJ6c21kM3lpMjY4Mg==', icon: 'fab fa-instagram', className: 'instagram', color: '#E4405F' },
    { name: 'Facebook', handle: 'PRADH Foods', url: 'https://www.facebook.com/share/191E8hq2JA/', icon: 'fab fa-facebook-f', className: 'facebook', color: '#1877F2' },
    { name: 'WhatsApp', handle: '+91 89799 93655', url: 'https://wa.me/918979993655', icon: 'fab fa-whatsapp', className: 'whatsapp', color: '#25D366' },
    { name: 'YouTube', handle: 'PRADH Desi Fuel', url: '#', icon: 'fab fa-youtube', className: 'youtube', color: '#FF0000' },
  ];

  return (
    <>
      {/* ===== CONTACT HERO ===== */}
      <section className="contact-hero">
        <div className="hero-glow-orb orb-a"></div>
        <div className="hero-glow-orb orb-b"></div>
        <div className="hero-glow-orb orb-c"></div>

        <div className="hero-particles">
          {[...Array(12)].map((_, i) => (
            <span key={i} style={{ left: `${(i * 8) + Math.random() * 5}%`, animationDelay: `${Math.random() * 8}s`, animationDuration: `${12 + Math.random() * 10}s` }}></span>
          ))}
        </div>

        <div className="badge">
          <i className="fas fa-headset"></i> We're Here to Help
        </div>
        <h1>
          Get in <span className="highlight">Touch</span> With Us
        </h1>
        <p>
          Have questions about our products, orders, or policies?
          Reach out to us — we're always happy to help!
        </p>
        <div className="hero-cta-buttons">
          <a href="#contact-cards" className="hero-btn primary">
            <i className="fas fa-comments"></i> Contact Us
          </a>
          <button className="hero-btn secondary" onClick={() => setShowReturnModal(true)}>
            <i className="fas fa-undo-alt"></i> Return / Replace
          </button>
        </div>
      </section>

      {/* ===== STATS STRIP ===== */}
      <div className="stats-strip">
        <div className="stat-item-mini"><div className="stat-icon">⚡</div><div><strong>Under 12 hrs</strong><span>Response Time</span></div></div>
        <div className="stat-item-mini"><div className="stat-icon">🎯</div><div><strong>1000+</strong><span>Happy Customers</span></div></div>
        <div className="stat-item-mini"><div className="stat-icon">⭐</div><div><strong>4.8/5</strong><span>Customer Rating</span></div></div>
        <div className="stat-item-mini"><div className="stat-icon">🛡️</div><div><strong>24/7</strong><span>Support Available</span></div></div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main className="section">
        <div className="contact-grid" id="contact-cards">
          <div className="contact-cards">
            <h2 className="mini-section-title">
              <i className="fas fa-headset" style={{ color: 'var(--primary)' }}></i> How Can We Help?
            </h2>
            <p className="mini-section-desc">Choose the best way to reach us</p>

            <div className="contact-card animate-on-scroll">
              <div className="icon-wrapper email"><i className="fas fa-envelope"></i></div>
              <div className="info">
                <h4>Email</h4>
                <p><a href="mailto:pradhfoods@gmail.com">pradhfoods@gmail.com</a></p>
              </div>
              <i className="fas fa-arrow-right card-arrow"></i>
            </div>

            <div className="contact-card animate-on-scroll">
              <div className="icon-wrapper whatsapp"><i className="fab fa-whatsapp"></i></div>
              <div className="info">
                <h4>WhatsApp Support</h4>
                <p><a href="https://wa.me/918979993655" target="_blank" rel="noopener noreferrer">+91 89799 93655</a></p>
              </div>
              <i className="fas fa-arrow-right card-arrow"></i>
            </div>

            <div className="contact-card animate-on-scroll">
              <div className="icon-wrapper phone"><i className="fas fa-phone"></i></div>
              <div className="info">
                <h4>Phone</h4>
                <p><a href="tel:+918979993655">+91 89799 93655</a></p>
              </div>
              <i className="fas fa-arrow-right card-arrow"></i>
            </div>

            <div className="contact-card animate-on-scroll">
              <div className="icon-wrapper location"><i className="fas fa-map-marker-alt"></i></div>
              <div className="info">
                <h4>Location</h4>
                <p>Uttar Pradesh, India</p>
              </div>
              <i className="fas fa-arrow-right card-arrow"></i>
            </div>

            <div className="hours-card animate-on-scroll">
              <h3><i className="far fa-clock"></i> Business Hours</h3>
              <div className="hours-row"><span className="day">Monday - Friday</span><span className="time">9:00 AM - 8:00 PM</span></div>
              <div className="hours-row"><span className="day">Saturday</span><span className="time">9:00 AM - 6:00 PM</span></div>
              <div className="hours-row"><span className="day">Sunday</span><span className="time"><span className="status">Closed</span></span></div>
            </div>
          </div>

          <div className="right-column">
            <div className="social-section animate-on-scroll">
              <h3><i className="fas fa-share-alt" style={{ color: 'var(--primary)' }}></i> Connect With Us</h3>
              <p className="social-desc">Follow us on social media for updates, offers & more</p>

              <div className="social-links-grid">
                {socialLinks.map((s) => (
                  <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className={`social-link-item ${s.className}`}>
                    <div className="social-icon-box"><i className={s.icon}></i></div>
                    <div className="social-info">
                      <span className="social-name">{s.name}</span>
                      <span className="social-handle">{s.handle}</span>
                    </div>
                    <i className="fas fa-arrow-up-right-from-square social-arrow"></i>
                  </a>
                ))}
              </div>
            </div>

            <div className="policies-section">
              <h2 className="mini-section-title"><i className="fas fa-shield-alt" style={{ color: 'var(--primary)' }}></i> Our Policies</h2>
              <p className="mini-section-desc">Everything you need to know</p>

              <div className="policies-grid">
                <div className="policy-card animate-on-scroll">
                  <span className="icon">🚚</span>
                  <h3>Shipping Policy</h3>
                  <p>Dispatched within <span className="highlight-text">24–48 hours</span>. Delivery in <span className="highlight-text">3–7 business days</span>. Free shipping above ₹499.</p>
                </div>
                <div className="policy-card animate-on-scroll">
                  <span className="icon">🔄</span>
                  <h3>Return Policy</h3>
                  <p>Returns only for <span className="highlight-text">damaged products</span>. Need <span className="highlight-text">unboxing video proof</span> within 24 hours.</p>
                </div>
                <div className="policy-card animate-on-scroll">
                  <span className="icon">🔒</span>
                  <h3>Privacy Policy</h3>
                  <p>Your data is <span className="highlight-text">100% safe</span>. Never shared or sold to external networks.</p>
                </div>
                <div className="policy-card animate-on-scroll">
                  <span className="icon">💳</span>
                  <h3>Payment Policy</h3>
                  <p>Accept <span className="highlight-text">COD</span> and <span className="highlight-text">Online payments</span>. 100% secure & encrypted.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="return-section animate-on-scroll">
          <div className="return-banner">
            <div className="return-banner-left">
              <div className="return-icon-wrapper">
                <div className="return-icon-ring"></div>
                <i className="fas fa-undo-alt return-icon"></i>
              </div>
            </div>

            <div className="return-banner-content">
              <span className="return-tag">🛡️ Customer Protection</span>
              <h2>Return or <span className="highlight">Replace</span> Your Order</h2>
              <p>Damaged product? Wrong item? Missing something? We've got you covered. Submit a request and we'll resolve it within 24 hours.</p>

              <div className="return-features">
                <div className="return-feature"><i className="fas fa-bolt"></i><div><strong>Fast Resolution</strong><span>Within 24 hours</span></div></div>
                <div className="return-feature"><i className="fas fa-whatsapp fab"></i><div><strong>WhatsApp Support</strong><span>Direct chat</span></div></div>
                <div className="return-feature"><i className="fas fa-shield-alt"></i><div><strong>100% Safe</strong><span>No questions asked</span></div></div>
              </div>

              <button className="return-cta-btn" onClick={() => setShowReturnModal(true)}>
                <i className="fas fa-undo-alt"></i> Request Return / Replace
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </section>

        <div className="faq-section">
          <h2 className="faq-title"><i className="fas fa-question-circle" style={{ color: 'var(--primary)' }}></i> Frequently Asked Questions</h2>
          <p className="faq-subtitle">Everything you need to know about PRADH</p>

          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div key={index} className={`faq-item animate-on-scroll ${openFaq === index ? 'active' : ''}`}>
                <button className="faq-question" onClick={() => toggleFaq(index)}>
                  <span>{faq.q}</span>
                  <span className="faq-icon">{openFaq === index ? '✕' : '+'}</span>
                </button>
                <div className="faq-answer" style={{ maxHeight: openFaq === index ? '300px' : '0' }}>
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="trust-section">
          <div className="trust-item"><i className="fas fa-shield-alt"></i><span>100% Secure Payments</span></div>
          <div className="trust-item"><i className="fas fa-truck"></i><span>Free Shipping Above ₹499</span></div>
          <div className="trust-item"><i className="fas fa-undo"></i><span>Easy Returns</span></div>
          <div className="trust-item"><i className="fas fa-headset"></i><span>24/7 Support</span></div>
          <div className="trust-item"><i className="fas fa-leaf"></i><span>100% Natural</span></div>
        </div>
      </main>

      {/* ===== RETURN MODAL ===== */}
      {showReturnModal && (
        <div className="return-modal-overlay" onClick={() => !submitting && setShowReturnModal(false)}>
          <div className="return-modal" onClick={(e) => e.stopPropagation()}>
            <div className="return-modal-header">
              <div>
                <h2><i className="fas fa-undo-alt" style={{ color: 'var(--primary)' }}></i> Return / Replace Request</h2>
                <p>Fill the form below and we'll get back to you on WhatsApp within 24 hours</p>
              </div>
              <button className="return-modal-close" onClick={() => !submitting && setShowReturnModal(false)} disabled={submitting}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form className="return-form" onSubmit={handleReturnSubmit}>
              <div className="form-row-2">
                <div className="return-form-group">
                  <label>Full Name <span className="required">*</span></label>
                  <input type="text" name="name" placeholder="Enter your name" value={returnForm.name} onChange={handleReturnChange} required />
                </div>
                <div className="return-form-group">
                  <label>Phone (WhatsApp) <span className="required">*</span></label>
                  <input type="tel" name="phone" placeholder="9876543210" value={returnForm.phone} onChange={handleReturnChange} required />
                </div>
              </div>

              <div className="form-row-2">
                <div className="return-form-group">
                  <label>Email</label>
                  <input type="email" name="email" placeholder="your@email.com" value={returnForm.email} onChange={handleReturnChange} />
                </div>
                <div className="return-form-group">
                  <label>Order ID <span className="required">*</span></label>
                  {userOrders.length > 0 ? (
                    <select name="orderId" value={returnForm.orderId} onChange={handleReturnChange} required>
                      <option value="">Select your order</option>
                      {userOrders.map((o) => (
                        <option key={o.id || o._id} value={o.id || o.order_id}>
                          {o.id || o.order_id} — ₹{o.total} ({new Date(o.date || o.createdAt).toLocaleDateString('en-IN')})
                        </option>
                      ))}
                      <option value="other">Other / Not in list</option>
                    </select>
                  ) : (
                    <input type="text" name="orderId" placeholder="e.g. ORD-12345" value={returnForm.orderId} onChange={handleReturnChange} required />
                  )}
                </div>
              </div>

              <div className="form-row-2">
                <div className="return-form-group">
                  <label>Product Name</label>
                  <input type="text" name="productName" placeholder="e.g. PRADH Desi Fuel" value={returnForm.productName} onChange={handleReturnChange} />
                </div>
                <div className="return-form-group">
                  <label>Request Type <span className="required">*</span></label>
                  <select name="requestType" value={returnForm.requestType} onChange={handleReturnChange}>
                    <option value="return">Return (Refund)</option>
                    <option value="replace">Replace Product</option>
                    <option value="refund">Refund Only</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="return-form-group">
                  <label>Reason <span className="required">*</span></label>
                  <select name="reason" value={returnForm.reason} onChange={handleReturnChange}>
                    <option value="damaged">Damaged Product</option>
                    <option value="wrong">Wrong Product Received</option>
                    <option value="missing">Missing Item</option>
                    <option value="quality">Quality Issue</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="return-form-group">
                  <label>Delivery Date</label>
                  <input type="date" name="issueDate" value={returnForm.issueDate} onChange={handleReturnChange} max={new Date().toISOString().split('T')[0]} />
                </div>
              </div>

              <div className="return-form-group">
                <label>Issue Description <span className="required">*</span></label>
                <textarea name="description" rows="4" placeholder="Describe the issue in detail..." value={returnForm.description} onChange={handleReturnChange} required />
              </div>

              <div style={{ background: 'rgba(37, 211, 102, 0.08)', border: '1px solid rgba(37, 211, 102, 0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#25D366', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fab fa-whatsapp" style={{ fontSize: '18px' }}></i>
                <span>Our team will contact you on <strong>WhatsApp</strong> within 24 hours to process your request.</span>
              </div>

              <div className="return-modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowReturnModal(false)} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn-submit-return" disabled={submitting}>
                  {submitting ? (<><i className="fas fa-spinner fa-spin"></i> Submitting...</>) : (<><i className="fas fa-paper-plane"></i> Submit Request</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Contact;