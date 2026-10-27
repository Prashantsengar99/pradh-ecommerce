import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FaThList, FaStar, FaFire, FaLeaf, FaGift, FaBoxOpen, FaPlusCircle,
  FaSearch, FaTag, FaEye, FaShoppingCart, FaHeart, FaRegHeart, FaTimes,
  FaMinus, FaPlus, FaCheckCircle, FaTruck, FaShieldAlt, FaUndo,
  FaChevronLeft, FaChevronRight, FaExternalLinkAlt,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import '/src/styles/products.css';

const FALLBACK_PRODUCTS = [
  { id: 'p1', name: 'PRADH Desi Fuel Premium', price: 599, category: 'premium', image: '/product1.jpeg', stock: 50, badge: 'hot', description: 'Premium blend with extra nuts & ashwagandha for ultimate energy.' },
  { id: 'p2', name: 'PRADH Desi Fuel Classic', price: 349, category: 'classic', image: '/product2.jpeg', stock: 35, badge: 'new', description: 'Classic Desi blend for daily nutrition & wellness.' },
  { id: 'p3', name: 'PRADH Herbal Immunity Blend', price: 449, category: 'herbal', image: '/product1.jpeg', stock: 20, badge: null, description: 'Ayurvedic herbs for strong immunity & vitality.' },
  { id: 'p4', name: 'PRADH Combo Pack (2x500gm)', price: 999, category: 'combo', image: '/product2.jpeg', stock: 15, badge: 'hot', description: 'Save ₹200 with this combo pack. Includes 2 premium blends.' },
  { id: 'p5', name: 'PRADH Desi Fuel + Herbal', price: 799, category: 'combo', image: '/product1.jpeg', stock: 0, badge: 'sold-out', description: 'Desi Fuel + Herbal Immunity blend in one combo.' },
  { id: 'p6', name: 'PRADH Desi Fuel Classic 250gm', price: 199, category: 'classic', image: '/product2.jpeg', stock: 40, badge: null, description: 'Small pack for trying our classic Desi blend.' },
  { id: 'p7', name: 'PRADH Premium Plus', price: 799, category: 'premium', image: '/product1.jpeg', stock: 25, badge: 'new', description: 'Premium plus with extra protein & nutrients.' },
  { id: 'p8', name: 'PRADH Herbal Calm Blend', price: 399, category: 'herbal', image: '/product2.jpeg', stock: 18, badge: null, description: 'Herbal blend for relaxation & stress relief.' },
];

const FILTERS = [
  { key: 'all', label: 'All', icon: <FaThList /> },
  { key: 'premium', label: 'Premium', icon: <FaStar /> },
  { key: 'classic', label: 'Classic', icon: <FaFire /> },
  { key: 'herbal', label: 'Herbal', icon: <FaLeaf /> },
  { key: 'combo', label: 'Combos', icon: <FaGift /> },
];

const Products = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [ratingsMap, setRatingsMap] = useState({});
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('popular');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState([]);
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  // ✅ NEW: Quick View Modal state
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewImageIndex, setQuickViewImageIndex] = useState(0);
  const [quickViewQty, setQuickViewQty] = useState(1);

  const PER_PAGE = 8;

  // Load products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/admin/products');
        const data = await res.json();

        if (data.success && data.products?.length > 0) {
          const mapped = data.products.map((p) => {
            const mainImage = p.image?.startsWith('http') || p.image?.startsWith('/')
              ? p.image
              : `/${p.image || 'product1.jpeg'}`;

            const images = (p.images && p.images.length > 0)
              ? p.images.map((img) => img?.startsWith('http') || img?.startsWith('/') ? img : `/${img}`)
              : [mainImage, '/product11.jpeg', mainImage];

            return {
              id: p.id || p._id,
              name: p.name,
              price: parseFloat(p.price) || 0,
              originalPrice: parseFloat(p.originalPrice) || null,
              category: p.category || 'classic',
              image: mainImage,
              images,
              stock: p.stock ?? 50,
              badge: p.badge || null,
              description: p.description || 'Premium Desi Fuel blend',
              sku: p.sku || 'N/A',
              ingredients: p.ingredients,
              benefits: p.benefits,
              usage: p.usage,
              maxPurchasePerUser: p.maxPurchasePerUser || 0,
            };
          });
          setAllProducts(mapped);
        } else {
          setAllProducts(FALLBACK_PRODUCTS.map((p) => ({
            ...p,
            images: [p.image, '/product11.jpeg', p.image],
          })));
        }
      } catch (err) {
        console.warn('Server not available, using fallback products');
        setAllProducts(FALLBACK_PRODUCTS.map((p) => ({
          ...p,
          images: [p.image, '/product11.jpeg', p.image],
        })));
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Load real ratings
  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const res = await fetch('/api/reviews/ratings/all');
        const data = await res.json();
        if (data.success && data.ratings) {
          setRatingsMap(data.ratings);
        }
      } catch (err) {
        console.warn('Ratings fetch failed:', err);
        setRatingsMap({});
      }
    };
    fetchRatings();
  }, []);

  // Load wishlist
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wishlist') || '[]');
      setWishlist(saved);
    } catch {
      setWishlist([]);
    }
  }, []);

  // ✅ NEW: ESC key to close quick view
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && quickViewProduct) {
        closeQuickView();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickViewProduct]);

  // ✅ NEW: Lock body scroll when quick view open
  useEffect(() => {
    if (quickViewProduct) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [quickViewProduct]);

  // Filter + sort + search
  const filtered = useMemo(() => {
    let result = [...allProducts];

   if (searchQuery) {
  const q = searchQuery.toLowerCase().trim();
  // Multi-word search: split by space, sab words match hone chahiye
  const words = q.split(/\s+/).filter(Boolean);

  result = result.filter((p) => {
    const searchText = `${p.name} ${p.category} ${p.description}`.toLowerCase();
    // Har word searchText mein hona chahiye
    return words.every((word) => searchText.includes(word));
  });
}

    if (filter !== 'all') {
      result = result.filter((p) => p.category === filter);
    }

    switch (sort) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        result.reverse();
        break;
      case 'popular':
      default:
        result.sort((a, b) => {
          const ratingA = ratingsMap[a.id]?.avgRating || 0;
          const ratingB = ratingsMap[b.id]?.avgRating || 0;
          return ratingB - ratingA;
        });
        break;
    }

    return result.map((p) => ({
      ...p,
      originalPrice: p.originalPrice || (p.price > 300 ? Math.round(p.price * 1.2) : null),
    }));
  }, [allProducts, filter, sort, searchQuery, ratingsMap]);

  const visible = filtered.slice(0, page * PER_PAGE);
  const hasMore = filtered.length > visible.length;

  useEffect(() => {
    setPage(1);
  }, [filter, sort, searchQuery]);

  // ============ QUICK VIEW HANDLERS ============
  const openQuickView = (product) => {
    setQuickViewProduct(product);
    setQuickViewImageIndex(0);
    setQuickViewQty(1);
  };

  const closeQuickView = () => {
    setQuickViewProduct(null);
    setQuickViewImageIndex(0);
    setQuickViewQty(1);
  };

  const nextQuickViewImage = () => {
    if (!quickViewProduct) return;
    setQuickViewImageIndex((prev) => (prev + 1) % quickViewProduct.images.length);
  };

  const prevQuickViewImage = () => {
    if (!quickViewProduct) return;
    setQuickViewImageIndex((prev) => (prev - 1 + quickViewProduct.images.length) % quickViewProduct.images.length);
  };

  const quickViewAddToCart = () => {
    if (!quickViewProduct) return;
    handleAddToCart(quickViewProduct, quickViewQty);
    closeQuickView();
  };

  // Add to cart
  const handleAddToCart = (product, qty = 1) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: qty,
        image: product.image,
        variant: product.category?.charAt(0).toUpperCase() + product.category?.slice(1) || 'Standard',
      });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('storage'));
    toast.success(`${product.name} added to cart! 🛒`);
  };

  // Toggle wishlist
  const toggleWishlist = (product) => {
    const isInWishlist = wishlist.some((w) => w.id === product.id);
    let newWishlist;

    if (isInWishlist) {
      newWishlist = wishlist.filter((w) => w.id !== product.id);
      toast.success('Removed from wishlist 💔');
    } else {
      newWishlist = [...wishlist, {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
      }];
      toast.success('Added to wishlist ❤️');
    }

    setWishlist(newWishlist);
    localStorage.setItem('wishlist', JSON.stringify(newWishlist));
  };

  const isInWishlist = (id) => wishlist.some((w) => w.id === id);

  // Render stars
  const renderStars = (rating) => {
    const full = Math.floor(rating);
    return (
      <span className="stars">
        {'★'.repeat(full)}
        {'☆'.repeat(5 - full)}
      </span>
    );
  };

  return (
    <>
      {/* PAGE HEADER */}
      <div className="products-header">
        <div className="header-glow"></div>
        <h1>
          Our <span className="highlight">Fuel Packs</span>
        </h1>
        <p>Choose your blend of traditional Desi nutrition</p>
        {searchQuery && (
          <p className="search-info">
            <FaSearch /> Showing results for: <strong>"{searchQuery}"</strong>
          </p>
        )}
      </div>

      {/* FILTER SECTION */}
      <div className="filter-section">
        <div className="filter-container">
          <div className="filter-tabs">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`filter-btn ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>

          <div className="filter-right">
            <span className="product-count">
              Showing <span>{visible.length}</span> products
            </span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="popular">🔥 Most Popular</option>
              <option value="price-low">💰 Price: Low to High</option>
              <option value="price-high">💰 Price: High to Low</option>
              <option value="newest">✨ Newest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* PRODUCT GRID */}
      <main className="section">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading premium products...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="no-products">
            <FaBoxOpen />
            <h3>No Products Found</h3>
            <p>Try changing your filters or search query.</p>
          </div>
        ) : (
          <>
            <div className="product-grid">
              {visible.map((product, index) => {
                const badgeClass =
                  product.badge === 'sold-out' ? 'sold-out' :
                  product.badge === 'hot' ? 'hot' :
                  product.badge === 'new' ? 'new' : '';

                const badgeText =
                  product.badge === 'sold-out' ? 'Sold Out' :
                  product.badge === 'hot' ? '🔥 Hot' :
                  product.badge === 'new' ? '✨ New' : '';

                const inStock = (product.stock ?? 50) > 0;
                const inWishlist = isInWishlist(product.id);

                const productRating = ratingsMap[product.id]?.avgRating || 0;
                const productReviews = ratingsMap[product.id]?.totalReviews || 0;

                return (
                  <div
                    className="product-card"
                    key={product.id}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {badgeText && <span className={`badge ${badgeClass}`}>{badgeText}</span>}

                    <button
                      className={`wishlist-btn ${inWishlist ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleWishlist(product);
                      }}
                      title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      {inWishlist ? <FaHeart /> : <FaRegHeart />}
                    </button>

                    <div className="product-img-container">
                      <Link to={`/product/${product.id}`}>
                        <img
                          src={product.image || '/product1.jpeg'}
                          alt={product.name}
                          loading="lazy"
                          onError={(e) => (e.target.src = '/product1.jpeg')}
                        />
                      </Link>
                      {/* ✅ Quick View button — now opens modal */}
                      <button
                        className="quick-view"
                        onClick={(e) => {
                          e.preventDefault();
                          openQuickView(product);
                        }}
                      >
                        <FaEye /> Quick View
                      </button>
                    </div>

                    <div className="product-info">
                      <Link to={`/product/${product.id}`} className="product-title">
                        {product.name}
                      </Link>
                      <p className="product-category">
                        <FaTag style={{ fontSize: '10px' }} />
                        {product.category?.charAt(0).toUpperCase() + product.category?.slice(1) || 'Blend'}
                      </p>

                      <div className="product-rating">
                        {productReviews > 0 ? (
                          <>
                            {renderStars(productRating)}
                            <span className="count">
                              ({productRating.toFixed(1)}) · {productReviews} review{productReviews !== 1 ? 's' : ''}
                            </span>
                          </>
                        ) : (
                          <span className="count" style={{ color: '#64748b', fontSize: '12px' }}>
                            No reviews yet
                          </span>
                        )}
                      </div>

                      <p className="product-desc">{product.description}</p>

                      <div className="product-meta">
                        <div className="price-block">
                          <span className="product-price">
                            ₹{product.price}
                          </span>
                          {product.originalPrice && (
                            <span className="original">₹{product.originalPrice}</span>
                          )}
                        </div>

                        <button
                          className="btn-primary"
                          onClick={() => handleAddToCart(product)}
                          disabled={!inStock}
                        >
                          {inStock ? (
                            <>
                              <FaShoppingCart /> Add
                            </>
                          ) : (
                            'Sold Out'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="load-more-container">
                <button className="btn-load-more" onClick={() => setPage((p) => p + 1)}>
                  <FaPlusCircle /> Load More Products
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ===== QUICK VIEW MODAL ===== */}
      {quickViewProduct && (
        <div className="quick-view-overlay" onClick={closeQuickView}>
          <div className="quick-view-modal" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button className="quick-view-close" onClick={closeQuickView} title="Close (ESC)">
              <FaTimes />
            </button>

            <div className="quick-view-content">
              {/* LEFT — Images */}
              <div className="quick-view-images">
                <div className="quick-view-main-image">
                  <img
                    src={quickViewProduct.images[quickViewImageIndex] || quickViewProduct.image}
                    alt={quickViewProduct.name}
                    onError={(e) => (e.target.src = '/product1.jpeg')}
                  />

                  {quickViewProduct.images.length > 1 && (
                    <>
                      <button
                        className="quick-view-nav prev"
                        onClick={prevQuickViewImage}
                        title="Previous image"
                      >
                        <FaChevronLeft />
                      </button>
                      <button
                        className="quick-view-nav next"
                        onClick={nextQuickViewImage}
                        title="Next image"
                      >
                        <FaChevronRight />
                      </button>
                      <div className="quick-view-counter">
                        {quickViewImageIndex + 1} / {quickViewProduct.images.length}
                      </div>
                    </>
                  )}
                </div>

                {quickViewProduct.images.length > 1 && (
                  <div className="quick-view-thumbs">
                    {quickViewProduct.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Thumb ${i + 1}`}
                        onClick={() => setQuickViewImageIndex(i)}
                        className={quickViewImageIndex === i ? 'active' : ''}
                        onError={(e) => (e.target.src = '/product1.jpeg')}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT — Details */}
              <div className="quick-view-details">
                {/* Badge */}
                {quickViewProduct.badge && (
                  <span className={`quick-view-badge ${quickViewProduct.badge}`}>
                    {quickViewProduct.badge === 'hot' ? '🔥 Hot' :
                     quickViewProduct.badge === 'new' ? '✨ New' :
                     quickViewProduct.badge === 'sold-out' ? 'Sold Out' : ''}
                  </span>
                )}

                <h2 className="quick-view-title">{quickViewProduct.name}</h2>

                {/* Rating */}
                <div className="quick-view-rating">
                  {(() => {
                    const r = ratingsMap[quickViewProduct.id]?.avgRating || 0;
                    const c = ratingsMap[quickViewProduct.id]?.totalReviews || 0;
                    return c > 0 ? (
                      <>
                        {renderStars(r)}
                        <span className="quick-view-rating-text">
                          {r.toFixed(1)} ({c} review{c !== 1 ? 's' : ''})
                        </span>
                      </>
                    ) : (
                      <span className="quick-view-rating-text" style={{ color: '#64748b' }}>
                        No reviews yet
                      </span>
                    );
                  })()}
                  <span className="quick-view-verified">
                    <FaCheckCircle /> Verified
                  </span>
                </div>

                {/* Price */}
                <div className="quick-view-price-box">
                  <span className="quick-view-price">₹{quickViewProduct.price}</span>
                  {quickViewProduct.originalPrice && (
                    <>
                      <span className="quick-view-original">₹{quickViewProduct.originalPrice}</span>
                      <span className="quick-view-discount">
                        {Math.round(((quickViewProduct.originalPrice - quickViewProduct.price) / quickViewProduct.originalPrice) * 100)}% OFF
                      </span>
                    </>
                  )}
                </div>

                {/* Stock */}
                <div className="quick-view-stock">
                  <span className={`quick-view-stock-dot ${(quickViewProduct.stock ?? 0) > 0 ? 'in' : 'out'}`}></span>
                  <span className={(quickViewProduct.stock ?? 0) > 0 ? 'in' : 'out'}>
                    {(quickViewProduct.stock ?? 0) > 0 ? `In Stock (${quickViewProduct.stock} available)` : 'Out of Stock'}
                  </span>
                </div>

                {/* Description */}
                <p className="quick-view-description">{quickViewProduct.description}</p>

                {/* Trust Badges */}
                <div className="quick-view-trust">
                  <div><FaTruck /> Free Delivery</div>
                  <div><FaUndo /> 7 Days Return</div>
                  <div><FaShieldAlt /> 100% Genuine</div>
                </div>

                {/* Quantity + Add to Cart */}
                {(quickViewProduct.stock ?? 0) > 0 && (
                  <div className="quick-view-actions">
                    <div className="quick-view-qty">
                      <button
                        onClick={() => setQuickViewQty((q) => Math.max(1, q - 1))}
                        disabled={quickViewQty <= 1}
                      >
                        <FaMinus />
                      </button>
                      <span>{quickViewQty}</span>
                      <button
                        onClick={() => setQuickViewQty((q) => Math.min(quickViewProduct.stock || 99, q + 1))}
                        disabled={quickViewQty >= (quickViewProduct.stock || 99)}
                      >
                        <FaPlus />
                      </button>
                    </div>

                    <button className="quick-view-add-btn" onClick={quickViewAddToCart}>
                      <FaShoppingCart /> Add to Cart
                    </button>
                  </div>
                )}

                {/* View Full Details */}
                <Link
                  to={`/product/${quickViewProduct.id}`}
                  className="quick-view-full-link"
                  onClick={closeQuickView}
                >
                  View Full Details <FaExternalLinkAlt />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Products;