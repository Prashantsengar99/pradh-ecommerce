import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FaSearchPlus, FaCheckCircle, FaTruck, FaMoneyBillWave, FaUndo, FaShieldAlt,
  FaMinus, FaPlus, FaShoppingCart, FaShoppingBag, FaPen, FaPaperPlane,
  FaSpinner, FaComment, FaCalendarAlt, FaTimesCircle, FaExclamationTriangle,
  FaTimes, FaChevronLeft, FaChevronRight, FaExpand, FaCompress,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import '/src/styles/product-detail.css';

const FALLBACK_PRODUCTS = {
  'p1': {
    id: 'p1',
    name: 'PRADH Desi Fuel Premium',
    price: 599,
    originalPrice: 799,
    description: 'Premium blend with extra nuts & ashwagandha for ultimate energy.',
    image: '/product1.jpeg',
    images: ['/product1.jpeg', '/product11.jpeg'],
    category: 'Premium',
    stock: 50,
    sku: 'PDF-500G',
    ingredients: 'Roasted Chana, Almonds, Cashews, Ashwagandha, Shatavari',
    benefits: 'Energy Boost, Muscle Recovery, Immunity Support',
    usage: '2 tbsp with 250ml warm milk',
  },
  'p2': {
    id: 'p2',
    name: 'PRADH Desi Fuel Classic',
    price: 349,
    originalPrice: 499,
    description: 'Classic Desi blend for daily nutrition & wellness.',
    image: '/product2.jpeg',
    images: ['/product2.jpeg', '/product11.jpeg'],
    category: 'Classic',
    stock: 35,
    sku: 'PDF-250G',
    ingredients: 'Roasted Chana, Almonds, Cashews, Ashwagandha',
    benefits: 'Daily Energy, Immunity',
    usage: '2 tbsp with 250ml warm milk',
  },
};

const FAQS = [
  { q: 'Kya DESI FUEL me refined sugar hai?', a: 'Bilkul nahi! Hum zero refined sugar use karte hain. Isme mithaas ke liye sirf premium Artisanal Thread Mishri (Dhaga Mishri) crystals ka use kiya gaya hai.' },
  { q: 'Ise kaun kaun consume kar sakta hai?', a: 'Yeh 100% natural roasted grains aur nuts ka blend hai. 2 saal se bade bacchon se lekar ghar ke buzurgon tak sabhi ise pee sakte hain.' },
  { q: 'Ashwagandha aur Shatavari ka kya role hai?', a: 'Ashwagandha body me energy, stamina aur stress management improve karta hai, jabki Shatavari overall strength aur immunity badhati hai.' },
  { q: 'Delivery me kitna samay lagta hai?', a: 'Uttar Pradesh aur Delhi-NCR me 2-3 din, baaki India me 3-5 working days mein order aapke ghar pahunch jayega.' },
];

const RATING_TEXTS = {
  1: 'Poor - Needs improvement',
  2: 'Fair - Average',
  3: 'Good - Satisfactory',
  4: 'Great - Recommended',
  5: 'Excellent - Highly recommended!',
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('specs');
  const [openFaq, setOpenFaq] = useState(null);
  const [reviewsData, setReviewsData] = useState({
    reviews: [], total: 0, avgRating: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // ✅ NEW: Image zoom + fullscreen state
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const imageContainerRef = useRef(null);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  // ============ LOAD PRODUCT ============
  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/products');
        const data = await res.json();
        if (data.success && data.products) {
          const found = data.products.find((p) => (p.id || p._id) === id);
          if (found) {
            const mainImage = found.image?.startsWith('http') || found.image?.startsWith('/')
              ? found.image
              : `/${found.image || 'product1.jpeg'}`;

            const galleryImages = (found.images && found.images.length > 0)
              ? found.images.map((img) => img?.startsWith('http') || img?.startsWith('/') ? img : `/${img}`)
              : [mainImage, '/product11.jpeg', mainImage];

            setProduct({
              id: found.id || found._id,
              name: found.name,
              price: parseFloat(found.price) || 0,
              originalPrice: parseFloat(found.originalPrice) || null,
              description: found.description,
              image: mainImage,
              images: galleryImages,
              category: found.category || 'Classic',
              stock: found.stock ?? 50,
              sku: found.sku || 'N/A',
              ingredients: found.ingredients,
              benefits: found.benefits,
              usage: found.usage,
            });
            return;
          }
        }
        setProduct(FALLBACK_PRODUCTS[id] || null);
      } catch {
        setProduct(FALLBACK_PRODUCTS[id] || null);
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [id]);

  // ============ LOAD REVIEWS ============
  const fetchReviews = async () => {
    if (!id) return;
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/reviews/product/${id}`);
      const data = await res.json();
      if (data.success) {
        const normalized = (data.reviews || []).map((r) => ({
          _id: r._id || r.id,
          rating: r.rating,
          comment: r.comment || '',
          userName: r.userName || 'Anonymous',
          createdAt: r.createdAt || new Date().toISOString(),
        }));
        setReviewsData({
          reviews: normalized,
          total: data.total ?? normalized.length,
          avgRating: Number(data.avgRating) || 0,
          distribution: data.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        });
      } else {
        setReviewsData({ reviews: [], total: 0, avgRating: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
      }
    } catch {
      setReviewsData({ reviews: [], total: 0, avgRating: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, [id]);

  // ============ LOAD RELATED ============
  useEffect(() => {
    if (!product) return;
    const loadRelated = async () => {
      try {
        const res = await fetch('/api/admin/products');
        const data = await res.json();
        if (data.success && data.products) {
          const related = data.products
            .filter((p) => (p.id || p._id) !== product.id)
            .slice(0, 4)
            .map((p) => ({
              id: p.id || p._id,
              name: p.name,
              price: parseFloat(p.price),
              image: p.image?.startsWith('http') || p.image?.startsWith('/') ? p.image : `/${p.image || 'product1.jpeg'}`,
            }));
          setRelatedProducts(related);
          return;
        }
      } catch {}
      setRelatedProducts([]);
    };
    loadRelated();
  }, [product]);

  // ============ SCROLL LOCK ============
  useEffect(() => {
    if (showReviewModal || showFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showReviewModal, showFullscreen]);

  // ============ ZOOM HANDLERS ============
  const handleMouseMove = (e) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const handleMouseEnter = () => {
    if (window.innerWidth >= 1024) setIsZooming(true);
  };

  const handleMouseLeave = () => {
    setIsZooming(false);
  };

  // ============ FULLSCREEN HANDLERS ============
  const openFullscreen = (index) => {
    setFullscreenIndex(index);
    setShowFullscreen(true);
  };

  const closeFullscreen = () => {
    setShowFullscreen(false);
  };

  const nextImage = () => {
    setFullscreenIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    setFullscreenIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  // ============ SWIPE HANDLERS (mobile) ============
  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].screenX;
    handleSwipe();
  };

  const handleSwipe = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) < 50) return;

    if (diff > 0) {
      // Swipe left → next image
      if (showFullscreen) {
        nextImage();
      } else {
        setActiveImage((prev) => (prev + 1) % product.images.length);
      }
    } else {
      // Swipe right → prev image
      if (showFullscreen) {
        prevImage();
      } else {
        setActiveImage((prev) => (prev - 1 + product.images.length) % product.images.length);
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // ============ ADD TO CART ============
  const handleAddToCart = () => {
    if (!product || product.stock <= 0) return;
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity,
        image: product.image,
        variant: product.category,
      });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('storage'));
    toast.success(`${product.name} added to cart! 🛒`);
    setQuantity(1);
  };

  // ============ SUBMIT REVIEW ============
  const handleSubmitReview = async () => {
    if (selectedRating === 0) { setReviewMessage('❌ Please select a rating'); return; }
    if (!reviewComment.trim()) { setReviewMessage('❌ Please write a review'); return; }

    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          rating: selectedRating,
          comment: reviewComment.trim(),
          userName: reviewerName.trim() || 'Anonymous',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReviewMessage('✅ Review submitted! Waiting for admin approval.');
        setReviewComment('');
        setReviewerName('');
        setSelectedRating(0);
        setHoverRating(0);
        toast.success('Review submitted! Admin approval ke baad dikhega. 🎉');
        setTimeout(() => {
          setShowReviewModal(false);
          setReviewMessage('');
        }, 1800);
      } else {
        setReviewMessage('❌ ' + (data.error || data.message || 'Failed to submit'));
      }
    } catch {
      setReviewMessage('❌ Network error. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // ============ LOADING ============
  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FaSpinner style={{ fontSize: '40px', color: 'var(--primary)' }} className="fa-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <FaExclamationTriangle style={{ fontSize: '48px', color: 'var(--primary)', marginBottom: '16px' }} />
        <h1 style={{ fontSize: '28px', color: '#fff', marginBottom: '8px' }}>Product Not Found</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>The product you're looking for doesn't exist.</p>
        <Link to="/products" className="btn-primary">Back to Products</Link>
      </div>
    );
  }

  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  const inStock = product.stock > 0;

  const { reviews, total: totalReviews, avgRating, distribution } = reviewsData;
  const ratingValue = Number(avgRating) || 0;
  const fullStars = Math.floor(ratingValue);
  const halfStar = ratingValue % 1 >= 0.5 ? '★' : '';
  const starDisplay = '★'.repeat(fullStars) + halfStar + '☆'.repeat(5 - fullStars - (halfStar ? 1 : 0));

  const specs = [
    ['Product Name', product.name],
    ['Category', product.category],
    ['Price', `₹${product.price}`],
    ['Stock', inStock ? 'In Stock' : 'Out of Stock'],
    ['SKU', product.sku],
    ['Ingredients', product.ingredients || 'Pure Roasted Chana, Almonds, Cashews, Ashwagandha, Shatavari'],
    ['Benefits', product.benefits || 'Energy Boost, Muscle Recovery, Immunity Support'],
    ['Usage', product.usage || '2 tbsp with 250ml warm milk'],
  ];

  return (
    <>
      {/* BREADCRUMB */}
      <div className="breadcrumb">
        <Link to="/">Home</Link> &gt; <Link to="/products">Products</Link> &gt; <span>{product.name}</span>
      </div>

      {/* PRODUCT DETAIL */}
      <main className="p-detail-container">
        {/* LEFT — IMAGE GALLERY */}
        <div className="p-image-section">
          {/* Main Image with Zoom */}
          <div
            className="main-image-wrapper"
            ref={imageContainerRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={product.images[activeImage] || product.image}
              alt={product.name}
              loading="lazy"
              onError={(e) => (e.target.src = '/product1.jpeg')}
              className={isZooming ? 'zoomed-image' : ''}
              style={
                isZooming
                  ? {
                      transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                      transform: 'scale(2.2)',
                    }
                  : {}
              }
            />

            {/* Zoom hint */}
            <div className={`zoom-hint ${isZooming ? 'hidden' : ''}`}>
              <FaSearchPlus /> Hover to zoom · Click to expand
            </div>

            {/* Fullscreen button */}
            <button
              className="fullscreen-btn"
              onClick={() => openFullscreen(activeImage)}
              title="View fullscreen"
            >
              <FaExpand />
            </button>

            {/* Mobile swipe arrows */}
            {product.images.length > 1 && (
              <>
                <button
                  className="mobile-nav-arrow left"
                  onClick={() => setActiveImage((prev) => (prev - 1 + product.images.length) % product.images.length)}
                >
                  <FaChevronLeft />
                </button>
                <button
                  className="mobile-nav-arrow right"
                  onClick={() => setActiveImage((prev) => (prev + 1) % product.images.length)}
                >
                  <FaChevronRight />
                </button>
              </>
            )}

            {/* Image counter */}
            {product.images.length > 1 && (
              <div className="image-counter">
                {activeImage + 1} / {product.images.length}
              </div>
            )}
          </div>

          {/* Thumbnails */}
          <div className="thumb-images-wrapper">
            {product.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`View ${i + 1}`}
                onClick={() => setActiveImage(i)}
                onError={(e) => (e.target.src = '/product1.jpeg')}
                className={`thumb-img ${activeImage === i ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* RIGHT — INFO */}
        <div className="p-info-section">
          <h1 className="p-title">{product.name}</h1>

          <div className="p-rating-summary">
            {totalReviews > 0 ? (
              <>
                <span className="stars">{starDisplay}</span>
                <span className="count">
                  {ratingValue.toFixed(1)} ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
                </span>
              </>
            ) : (
              <span className="count" style={{ color: 'var(--text-muted)' }}>No reviews yet</span>
            )}
            <span className="verified-badge"><FaCheckCircle /> Verified Seller</span>
          </div>

          <div className="p-price-box">
            <span className="p-price">₹{product.price}</span>
            {product.originalPrice && (
              <>
                <span className="p-original-price">₹{product.originalPrice}</span>
                <span className="p-discount-tag">{discount}% OFF</span>
              </>
            )}
          </div>

          <div className="p-stock-status">
            <span className={`dot ${inStock ? 'in-stock' : 'out-of-stock'}`}></span>
            <span className={inStock ? 'in-stock' : 'out-of-stock'}>
              {inStock ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>

          <p className="p-description">{product.description}</p>

          <div className="trust-badges">
            <div className="trust-badge"><FaTruck /> Free Delivery</div>
            <div className="trust-badge"><FaMoneyBillWave /> Cash on Delivery</div>
            <div className="trust-badge"><FaUndo /> 7 Days Return</div>
            <div className="trust-badge"><FaShieldAlt /> 100% Genuine</div>
          </div>

          <div className="p-actions">
            <div className="quantity-selector">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}><FaMinus /></button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))}><FaPlus /></button>
            </div>

            <button className="btn-primary" onClick={handleAddToCart} disabled={!inStock}>
              {inStock ? (<><FaShoppingCart /> Add to Cart</>) : (<><FaTimesCircle /> Out of Stock</>)}
            </button>

            <button className="btn-secondary" onClick={() => navigate('/cart')}>
              <FaShoppingBag /> View Cart
            </button>
          </div>

          <div className="p-tabs">
            <div className="p-tabs-nav">
              <button className={activeTab === 'specs' ? 'active' : ''} onClick={() => setActiveTab('specs')}>
                📋 Specifications
              </button>
              <button className={activeTab === 'faq' ? 'active' : ''} onClick={() => setActiveTab('faq')}>
                ❓ FAQs
              </button>
            </div>

            <div className="p-tabs-content">
              {activeTab === 'specs' && (
                <table className="specs-table">
                  <tbody>
                    {specs.map(([k, v]) => (
                      <tr key={k}><td>{k}</td><td>{v}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
              {activeTab === 'faq' && (
                <div>
                  {FAQS.map((faq, i) => (
                    <div key={i} className={`faq-item ${openFaq === i ? 'active' : ''}`}>
                      <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                        <span>{faq.q}</span>
                        <span className="faq-icon">{openFaq === i ? '✕' : '+'}</span>
                      </button>
                      <div className="faq-answer"><p>{faq.a}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ===== FULLSCREEN IMAGE VIEWER ===== */}
      {showFullscreen && (
        <div
          className="fullscreen-overlay"
          onClick={closeFullscreen}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button className="fullscreen-close" onClick={closeFullscreen}>
            <FaTimes />
          </button>

          <button
            className="fullscreen-nav prev"
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            disabled={product.images.length <= 1}
          >
            <FaChevronLeft />
          </button>

          <img
            src={product.images[fullscreenIndex] || product.image}
            alt={product.name}
            onClick={(e) => e.stopPropagation()}
            onError={(e) => (e.target.src = '/product1.jpeg')}
            className="fullscreen-image"
          />

          <button
            className="fullscreen-nav next"
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            disabled={product.images.length <= 1}
          >
            <FaChevronRight />
          </button>

          <div className="fullscreen-counter">
            {fullscreenIndex + 1} / {product.images.length}
          </div>

          <div className="fullscreen-thumbs" onClick={(e) => e.stopPropagation()}>
            {product.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Thumb ${i + 1}`}
                onClick={() => setFullscreenIndex(i)}
                className={fullscreenIndex === i ? 'active' : ''}
                onError={(e) => (e.target.src = '/product1.jpeg')}
              />
            ))}
          </div>
        </div>
      )}

      {/* ===== REVIEWS SECTION ===== */}
      <section className="reviews-section-full">
        <div className="reviews-header">
          <h2>Customer <span>Reviews</span></h2>
          <button className="write-review-btn" onClick={() => setShowReviewModal(true)}>
            <FaPen /> Write a Review
          </button>
        </div>

        <div className="reviews-summary-box">
          <div className="rating-big-box">
            <div className="rating-big-number">{totalReviews > 0 ? ratingValue.toFixed(1) : '—'}</div>
            <div className="rating-big-stars">
              {'★'.repeat(Math.floor(ratingValue))}
              {'☆'.repeat(5 - Math.floor(ratingValue))}
            </div>
            <div className="rating-big-text">
              {totalReviews} {totalReviews === 1 ? 'Review' : 'Reviews'}
            </div>
          </div>

          <div className="rating-bars-full">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star] || 0;
              const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={star} className="bar-row-full">
                  <span className="bar-label">{star} ★</span>
                  <div className="bar-track-full">
                    <div className="bar-fill-full" style={{ width: `${pct}%` }}></div>
                  </div>
                  <span className="bar-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {reviewsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <FaSpinner className="fa-spin" style={{ fontSize: '24px' }} />
            <p style={{ marginTop: '10px' }}>Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="no-reviews-full">
            <FaComment />
            <h3>No reviews yet</h3>
            <p>Be the first to review this product!</p>
          </div>
        ) : (
          <div className="reviews-list-full">
            {reviews.map((r, i) => (
              <div key={r._id || i} className="review-card-full" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="review-header-full">
                  <div className="review-user-info">
                    <div className="review-avatar">{(r.userName || 'A').charAt(0).toUpperCase()}</div>
                    <div className="review-user-details">
                      <h4>{r.userName || 'Anonymous'}</h4>
                      <div className="review-stars-full">
                        {'★'.repeat(r.rating)}
                        {'☆'.repeat(5 - r.rating)}
                      </div>
                    </div>
                  </div>
                  <div className="review-date-full">
                    <FaCalendarAlt />{' '}
                    {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <p className="review-comment-full">{r.comment}</p>
                <div className="review-verified-full"><FaCheckCircle /> Verified Purchase</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== REVIEW MODAL ===== */}
      {showReviewModal && (
        <div className="review-modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="review-modal-header">
              <div>
                <h2><FaPen style={{ color: 'var(--primary)' }} /> Write a Review</h2>
                <p>Share your experience with {product.name}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowReviewModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="review-form-group">
              <label>Your Rating <span className="required">*</span></label>
              <div className="star-rating-input">
                {[1, 2, 3, 4, 5].map((v) => {
                  const active = hoverRating ? v <= hoverRating : v <= selectedRating;
                  return (
                    <span
                      key={v}
                      className={`star-input ${active ? 'active' : ''}`}
                      onClick={() => setSelectedRating(v)}
                      onMouseEnter={() => setHoverRating(v)}
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      {active ? '★' : '☆'}
                    </span>
                  );
                })}
              </div>
              <div className="rating-text-input">
                {selectedRating ? RATING_TEXTS[selectedRating] : 'Select a rating'}
              </div>
            </div>

            <div className="review-form-group">
              <label>Your Name</label>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className="review-form-group">
              <label>Your Review <span className="required">*</span></label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={4}
                placeholder="Share your experience with this product..."
              />
            </div>

            {reviewMessage && (
              <div style={{
                color: reviewMessage.startsWith('✅') ? '#22c55e' : '#ef4444',
                fontSize: '13px', marginBottom: '12px', fontWeight: '600',
              }}>
                {reviewMessage}
              </div>
            )}

            <div className="review-modal-footer">
              <button className="btn-cancel-modal" onClick={() => setShowReviewModal(false)} disabled={submittingReview}>
                Cancel
              </button>
              <button className="btn-submit-review-modal" onClick={handleSubmitReview} disabled={submittingReview}>
                {submittingReview ? (<><FaSpinner className="fa-spin" /> Submitting...</>) : (<><FaPaperPlane /> Submit Review</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RELATED */}
      {relatedProducts.length > 0 && (
        <section className="related-products">
          <h2>You Might Also <span>Like</span></h2>
          <div className="related-grid">
            {relatedProducts.map((p) => (
              <Link key={p.id} to={`/product/${p.id}`} className="related-card">
                <img src={p.image} alt={p.name} loading="lazy" onError={(e) => (e.target.src = '/product1.jpeg')} />
                <div className="info">
                  <h4>{p.name}</h4>
                  <div className="price">₹{p.price}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
};

export default ProductDetail;