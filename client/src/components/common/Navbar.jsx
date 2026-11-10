import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSearch, FaShoppingCart, FaUser, FaHome, FaBox, FaLeaf, FaEnvelope, FaShoppingBag, FaTimes, FaMoon, FaSun, FaMagic } from 'react-icons/fa';
import { apiFetch } from '../../services/api';
import { useDarkMode } from '../../hooks/useDarkMode';
import '../../styles/navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const { mode, setMode } = useDarkMode();
  const [darkMenuOpen, setDarkMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);
  const darkMenuRef = useRef(null);        // desktop dropdown
  const darkMobileMenuRef = useRef(null);  // mobile menu — SEPARATE ref!

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cart count
  useEffect(() => {
    const updateCart = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const total = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        setCartCount(total);
      } catch {
        setCartCount(0);
      }
    };
    updateCart();
    window.addEventListener('storage', updateCart);
    window.addEventListener('cart-updated', updateCart);
    return () => {
      window.removeEventListener('storage', updateCart);
      window.removeEventListener('cart-updated', updateCart);
    };
  }, []);

  // Fetch products for search
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await apiFetch('/api/products');
        const data = await res.json();
        if (data.success && data.products) {
          setAllProducts(
            data.products.map((p) => ({
              id: p.id || p._id,
              name: p.name,
              price: parseFloat(p.price) || 0,
              category: p.category || '',
              image: p.image?.startsWith('http') || p.image?.startsWith('/')
                ? p.image
                : `/${p.image || 'product1.jpeg'}`,
            }))
          );
        }
      } catch (err) {
        console.warn('Products load failed:', err);
      }
    };
    fetchProducts();
  }, []);

  // Live search filtering
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const q = searchQuery.trim().toLowerCase();
    const filtered = allProducts
      .filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
      )
      .slice(0, 6);

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setHighlightedIndex(-1);
  }, [searchQuery, allProducts]);

  // Click outside → close (uses 'click' NOT 'mousedown' — mousedown fires before button onClick)
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Close search suggestions
      if (
        searchRef.current && !searchRef.current.contains(e.target) &&
        suggestionsRef.current && !suggestionsRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
      // Close dark mode menu — check BOTH refs
      const clickedInsideDesktop = darkMenuRef.current && darkMenuRef.current.contains(e.target);
      const clickedInsideMobile = darkMobileMenuRef.current && darkMobileMenuRef.current.contains(e.target);
      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setDarkMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        e.preventDefault();
        navigate(`/product/${suggestions[highlightedIndex].id}`);
        setSearchQuery('');
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (product) => {
    navigate(`/product/${product.id}`);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleDarkModeSelect = (newMode, e) => {
    if (e) e.stopPropagation();
    setMode(newMode);
    setDarkMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Home', icon: <FaHome /> },
    { path: '/products', label: 'Products', icon: <FaBox /> },
    { path: '/about', label: 'Story', icon: <FaLeaf /> },
    { path: '/contact', label: 'Contact', icon: <FaEnvelope /> },
  ];

  return (
    <>
      {/* ===== TOP NAVBAR ===== */}
      <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-inner">
          {/* Logo */}
          <Link to="/" className="nav-logo">
            <img src="/logo.jpeg" alt="PRADH Logo" loading="lazy" />
            <div className="logo-text">
              <span className="brand">PRADH<span>.</span></span>
              <span className="tagline">Desi Fuel</span>
            </div>
          </Link>

          {/* Search Bar with Live Suggestions */}
          <div className="nav-search-wrapper" ref={searchRef}>
            <form className="nav-search" onSubmit={handleSearch}>
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search health mixes, products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                aria-label="Search products"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => { setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); }}
                  title="Clear"
                >
                  <FaTimes />
                </button>
              )}
              <button type="submit">Search</button>
            </form>

            {/* Live Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="search-suggestions" ref={suggestionsRef}>
                <div className="suggestions-header">
                  <FaSearch /> {suggestions.length} result{suggestions.length !== 1 ? 's' : ''} for "{searchQuery}"
                </div>
                {suggestions.map((product, idx) => (
                  <button
                    key={product.id}
                    className={`suggestion-item ${highlightedIndex === idx ? 'highlighted' : ''}`}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSuggestionClick(product)}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      onError={(e) => (e.target.src = '/product1.jpeg')}
                    />
                    <div className="suggestion-info">
                      <div className="suggestion-name">{product.name}</div>
                      <div className="suggestion-meta">
                        {product.category && <span>{product.category}</span>}
                        <span className="suggestion-price">₹{product.price}</span>
                      </div>
                    </div>
                  </button>
                ))}
                <button
                  className="suggestion-view-all"
                  onClick={handleSearch}
                >
                  View all results for "{searchQuery}" →
                </button>
              </div>
            )}

            {/* No results */}
            {showSuggestions && searchQuery.trim().length >= 2 && suggestions.length === 0 && (
              <div className="search-suggestions">
                <div className="no-suggestions">
                  <FaSearch />
                  <p>No products found for "{searchQuery}"</p>
                  <span>Try different keywords</span>
                </div>
              </div>
            )}
          </div>

          {/* Right — Desktop Nav Links + Account + Cart + Dark Mode */}
          <div className="nav-right">
            <ul className="nav-links-desktop">
              {navLinks.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className={isActive(link.path) ? 'active' : ''}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <Link to="/account" className="nav-icon-btn" title="Account">
              <FaUser />
              <span className="icon-label">Account</span>
            </Link>

            <Link to="/cart" className="nav-icon-btn cart-btn" title="Cart">
              <FaShoppingCart />
              <span className="icon-label">Cart</span>
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>

            {/* 🌙 Dark Mode Pro — Dropdown inside navbar */}
            <div className="darkmode-dropdown-wrapper" ref={darkMenuRef}>
              <button
                className="darkmode-toggle"
                onClick={() => setDarkMenuOpen(!darkMenuOpen)}
                title="Theme Settings"
                aria-label="Theme settings"
              >
                {mode === 'light' ? <FaSun /> : mode === 'dark' ? <FaMoon /> : <FaMagic />}
              </button>

              {darkMenuOpen && (
                <div className="darkmode-dropdown-menu">
                  <div className="darkmode-dropdown-header">Theme</div>
                  <button
                    className={`darkmode-dropdown-item ${mode === 'light' ? 'active' : ''}`}
                    onClick={(e) => handleDarkModeSelect('light', e)}
                  >
                    <FaSun /> Light
                  </button>
                  <button
                    className={`darkmode-dropdown-item ${mode === 'dark' ? 'active' : ''}`}
                    onClick={(e) => handleDarkModeSelect('dark', e)}
                  >
                    <FaMoon /> Dark
                  </button>
                  <button
                    className={`darkmode-dropdown-item ${mode === 'auto' ? 'active' : ''}`}
                    onClick={(e) => handleDarkModeSelect('auto', e)}
                  >
                    <FaMagic /> Auto
                    <span className="darkmode-dropdown-hint">Follows sunset</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===== BOTTOM NAVIGATION (Mobile only) ===== */}
      <nav className="bottom-nav">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`bottom-nav-item ${isActive(link.path) ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">{link.icon}</span>
            <span className="bottom-nav-label">{link.label}</span>
          </Link>
        ))}
        <Link
          to="/account"
          className={`bottom-nav-item ${isActive('/account') ? 'active' : ''}`}
        >
          <span className="bottom-nav-icon"><FaUser /></span>
          <span className="bottom-nav-label">Account</span>
        </Link>
        <Link
          to="/cart"
          className={`bottom-nav-item ${isActive('/cart') ? 'active' : ''}`}
        >
          <span className="bottom-nav-icon">
            <FaShoppingBag />
            {cartCount > 0 && <span className="bottom-nav-badge">{cartCount}</span>}
          </span>
          <span className="bottom-nav-label">Cart</span>
        </Link>

        {/* 🌙 Dark Mode (mobile bottom nav) */}
        <button
          className="bottom-nav-item"
          onClick={(e) => { e.stopPropagation(); setDarkMenuOpen(!darkMenuOpen); }}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <span className="bottom-nav-icon">
            {mode === 'light' ? <FaSun /> : mode === 'dark' ? <FaMoon /> : <FaMagic />}
          </span>
          <span className="bottom-nav-label">Theme</span>
        </button>

        {/* Mobile dark mode menu — floating */}
        {darkMenuOpen && (
          <div className="darkmode-mobile-menu" ref={darkMobileMenuRef}>
            <div className="darkmode-dropdown-header">Theme</div>
            <button
              className={`darkmode-dropdown-item ${mode === 'light' ? 'active' : ''}`}
              onClick={(e) => handleDarkModeSelect('light', e)}
            >
              <FaSun /> Light
            </button>
            <button
              className={`darkmode-dropdown-item ${mode === 'dark' ? 'active' : ''}`}
              onClick={(e) => handleDarkModeSelect('dark', e)}
            >
              <FaMoon /> Dark
            </button>
            <button
              className={`darkmode-dropdown-item ${mode === 'auto' ? 'active' : ''}`}
              onClick={(e) => handleDarkModeSelect('auto', e)}
            >
              <FaMagic /> Auto
              <span className="darkmode-dropdown-hint">Follows sunset</span>
            </button>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
